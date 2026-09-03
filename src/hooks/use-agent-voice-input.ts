import { useCallback, useEffect, useRef, useState } from "react";
import { isAgentVoiceEnabled, transcribeAgentVoice } from "@/lib/mastraApi";
import i18n from "@/i18n";

export type AgentVoiceState = "idle" | "recording" | "transcribing";

type UseAgentVoiceInputOptions = {
  onTranscript?: (text: string) => void;
  onError?: (message: string) => void;
};

function pickRecorderMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  return candidates.find((mime) => MediaRecorder.isTypeSupported(mime));
}

export function useAgentVoiceInput(options: UseAgentVoiceInputOptions = {}) {
  const [state, setState] = useState<AgentVoiceState>("idle");
  const [supported, setSupported] = useState(false);
  const stateRef = useRef<AgentVoiceState>("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const holdActiveRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const deliveringRef = useRef(false);
  const onTranscriptRef = useRef(options.onTranscript);
  const onErrorRef = useRef(options.onError);

  onTranscriptRef.current = options.onTranscript;
  onErrorRef.current = options.onError;

  const setVoiceState = useCallback((next: AgentVoiceState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  useEffect(() => {
    const ok =
      isAgentVoiceEnabled() &&
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== "undefined";
    setSupported(ok);
  }, []);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const finishRecordingInternal = useCallback(async (): Promise<string | null> => {
    const recorder = recorderRef.current;
    if (!recorder || stateRef.current !== "recording") return null;

    setVoiceState("transcribing");

    const blob = await new Promise<Blob | null>((resolve) => {
      recorder.onstop = () => {
        const type = recorder.mimeType || pickRecorderMime() || "audio/webm";
        const parts = chunksRef.current;
        resolve(parts.length ? new Blob(parts, { type }) : null);
      };
      if (recorder.state !== "inactive") recorder.stop();
      else resolve(null);
    });

    cleanupStream();

    if (!blob || blob.size === 0) {
      setVoiceState("idle");
      return null;
    }

    const result = await transcribeAgentVoice(blob);
    setVoiceState("idle");
    if (!result.success || !result.text?.trim()) {
      throw new Error(result.message || i18n.t("ai.voice_transcribe_failed"));
    }
    return result.text.trim();
  }, [cleanupStream, setVoiceState]);

  const cancelRecording = useCallback(() => {
    stopRequestedRef.current = false;
    holdActiveRef.current = false;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    cleanupStream();
    setVoiceState("idle");
  }, [cleanupStream, setVoiceState]);

  const deliverTranscript = useCallback(async () => {
    if (deliveringRef.current || stateRef.current !== "recording") return;
    deliveringRef.current = true;
    try {
      const text = await finishRecordingInternal();
      if (text) onTranscriptRef.current?.(text);
    } catch (err) {
      cancelRecording();
      const message =
        err instanceof Error ? err.message : i18n.t("ai.voice_transcribe_failed");
      onErrorRef.current?.(message);
    } finally {
      deliveringRef.current = false;
    }
  }, [cancelRecording, finishRecordingInternal]);

  const releaseHold = useCallback(async () => {
    holdActiveRef.current = false;
    if (stateRef.current === "recording") {
      await deliverTranscript();
      return;
    }
    stopRequestedRef.current = true;
  }, [deliverTranscript]);

  const pressHold = useCallback(async () => {
    if (!supported || stateRef.current !== "idle") return;
    holdActiveRef.current = true;
    stopRequestedRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!holdActiveRef.current && stopRequestedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        stopRequestedRef.current = false;
        return;
      }
      streamRef.current = stream;
      const mimeType = pickRecorderMime();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.start(250);
      recorderRef.current = recorder;
      setVoiceState("recording");
      if (!holdActiveRef.current || stopRequestedRef.current) {
        stopRequestedRef.current = false;
        await deliverTranscript();
      }
    } catch {
      cleanupStream();
      holdActiveRef.current = false;
      stopRequestedRef.current = false;
      setVoiceState("idle");
      onErrorRef.current?.(i18n.t("ai.voice_transcribe_failed"));
    }
  }, [cleanupStream, deliverTranscript, setVoiceState, supported]);

  useEffect(() => {
    if (state !== "recording") return;
    const onRelease = () => {
      void releaseHold();
    };
    window.addEventListener("pointerup", onRelease);
    window.addEventListener("pointercancel", onRelease);
    return () => {
      window.removeEventListener("pointerup", onRelease);
      window.removeEventListener("pointercancel", onRelease);
    };
  }, [releaseHold, state]);

  useEffect(() => {
    return () => {
      cancelRecording();
    };
  }, [cancelRecording]);

  return {
    voiceState: state,
    voiceSupported: supported,
    pressHold,
    releaseHold,
    cancelRecording,
  };
}
