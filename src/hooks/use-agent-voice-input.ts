import { useCallback, useEffect, useRef, useState } from "react";
import { isAgentVoiceEnabled, transcribeAgentVoice } from "@/lib/mastraApi";
import i18n from "@/i18n";

export type AgentVoiceState = "idle" | "recording" | "transcribing";

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

export function useAgentVoiceInput(locale: string) {
  const [state, setState] = useState<AgentVoiceState>("idle");
  const [supported, setSupported] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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

  const startRecording = useCallback(async () => {
    if (!supported || state !== "idle") return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
      setState("recording");
      return true;
    } catch {
      cleanupStream();
      return false;
    }
  }, [cleanupStream, state, supported]);

  const cancelRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    cleanupStream();
    setState("idle");
  }, [cleanupStream]);

  const finishRecording = useCallback(async (): Promise<string | null> => {
    const recorder = recorderRef.current;
    if (!recorder || state !== "recording") return null;

    setState("transcribing");

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
      setState("idle");
      return null;
    }

    const result = await transcribeAgentVoice(blob, locale);
    setState("idle");
    if (!result.success || !result.text?.trim()) {
      throw new Error(result.message || i18n.t("ai.voice_transcribe_failed"));
    }
    return result.text.trim();
  }, [cleanupStream, locale, state]);

  return {
    voiceState: state,
    voiceSupported: supported,
    startRecording,
    cancelRecording,
    finishRecording,
  };
}
