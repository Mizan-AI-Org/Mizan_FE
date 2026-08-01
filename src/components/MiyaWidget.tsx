import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Mic, MicOff, Paperclip, Send, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { AuthContextType } from "@/contexts/AuthContext.types";
import { useLanguage } from "@/hooks/use-language";
import { API_BASE } from "@/lib/api";
import { logError } from "@/lib/logging";
import { cn } from "@/lib/utils";

type ChatTurn = { role: "user" | "assistant"; content: string };
type PendingAttachment = { id: string; title: string };

const ALLOWED_ROLES = [
  "ADMIN",
  "SUPER_ADMIN",
  "MANAGER",
  "OWNER",
  "WAITER",
  "CASHIER",
  "CHEF",
];

const VOICE_INPUT_ROLES = new Set(["ADMIN", "SUPER_ADMIN", "MANAGER", "OWNER"]);

function playBase64Audio(base64: string, mimeType: string) {
  const audio = new Audio(`data:${mimeType};base64,${base64}`);
  void audio.play();
}

function pickRecorderMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

export const MiyaWidget: React.FC = () => {
  const { user, accessToken } = useAuth() as AuthContextType;
  const { t, isRTL, language } = useLanguage();
  const location = useLocation();
  const hideOnPlatformAdmin = location.pathname.startsWith("/admin");

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [voiceInputEnabled, setVoiceInputEnabled] = useState(false);
  const [fishAudioConfigured, setFishAudioConfigured] = useState(false);
  const [attachmentsEnabled, setAttachmentsEnabled] = useState(true);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const historyRef = useRef<ChatTurn[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const launcherButtonRef = useRef<HTMLButtonElement>(null);

  const canUseVoiceInput = Boolean(user?.role && VOICE_INPUT_ROLES.has(user.role));

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading, open, voiceProcessing]);

  useEffect(() => {
    const openHandler = () => setOpen(true);
    window.addEventListener("miya:open", openHandler);
    return () => window.removeEventListener("miya:open", openHandler);
  }, []);

  // Basic dialog semantics: move focus in on open, back to the launcher on
  // close, and let Escape close it like any other modal.
  useEffect(() => {
    if (open) {
      const focusTimer = window.setTimeout(() => textInputRef.current?.focus(), 0);
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") setOpen(false);
      };
      document.addEventListener("keydown", onKeyDown);
      return () => {
        window.clearTimeout(focusTimer);
        document.removeEventListener("keydown", onKeyDown);
      };
    }
    launcherButtonRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!user || !accessToken || hideOnPlatformAdmin) return;
    fetch(`${API_BASE}/miya/config/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setEnabled(Boolean(data.enabled));
        setVoiceInputEnabled(Boolean(data.voice_input_enabled));
        setFishAudioConfigured(Boolean(data.fish_audio_configured));
        setAttachmentsEnabled(data.attachments_enabled !== false);
      })
      .catch(() => setEnabled(true));
  }, [user, accessToken, hideOnPlatformAdmin]);

  const stopMediaTracks = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }, []);

  useEffect(() => () => stopMediaTracks(), [stopMediaTracks]);

  const appendAssistantError = useCallback((content: string) => {
    setHistory((prev) => [...prev, { role: "assistant", content }]);
  }, []);

  const sendTextMessage = useCallback(
    async (text: string, attachmentIds: string[] = []) => {
      const ids =
        attachmentIds.length > 0
          ? attachmentIds
          : pendingAttachments.map((a) => a.id);
      if ((!text.trim() && ids.length === 0) || !accessToken || loading || voiceProcessing) return;

      const userMessage =
        text.trim() ||
        (ids.length
          ? `Please review the ${ids.length === 1 ? "document" : "documents"} I attached and remember the details.`
          : "");
      const attachmentNote =
        pendingAttachments.length > 0
          ? `\n📎 ${pendingAttachments.map((a) => a.title).join(", ")}`
          : "";

      setInput("");
      setPendingAttachments([]);
      setHistory((prev) => [...prev, { role: "user", content: userMessage + attachmentNote }]);
      setLoading(true);

      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      const applyChatPayload = (data: {
        reply?: string;
        audio?: { base64?: string; mime_type?: string };
      }) => {
        const reply = data.reply || "Done.";
        setHistory((prev) => [...prev, { role: "assistant", content: reply }]);
        if (fishAudioConfigured && data.audio?.base64) {
          playBase64Audio(data.audio.base64, data.audio.mime_type || "audio/mpeg");
        }
      };

      try {
        const resp = await fetch(`${API_BASE}/miya/chat/`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: userMessage,
            history: historyRef.current.slice(-8),
            voice: fishAudioConfigured,
            restaurant_id: user?.restaurant || user?.restaurant_data?.id || undefined,
            attachment_ids: ids,
          }),
        });

        if (resp.status === 202) {
          const queued = await resp.json();
          const taskId = queued.task_id as string | undefined;
          if (!taskId) {
            throw new Error("Miya did not return a task id");
          }

          for (let attempt = 0; attempt < 90; attempt += 1) {
            const delayMs = [400, 600, 800, 1000, 1200, 1500][Math.min(attempt, 5)];
            await sleep(delayMs);
            const statusResp = await fetch(
              `${API_BASE}/miya/chat/status/?task_id=${encodeURIComponent(taskId)}`,
              { headers: { Authorization: `Bearer ${accessToken}` } },
            );
            const statusData = await statusResp.json();
            if (statusData.status === "complete") {
              applyChatPayload(statusData);
              return;
            }
            if (statusData.status === "failed" || !statusResp.ok) {
              throw new Error(
                statusData.error || statusData.reply || `Miya chat failed (${statusResp.status})`,
              );
            }
          }
          throw new Error("Miya is still thinking — try a simpler question or try again.");
        }

        const data = await resp.json();
        if (!resp.ok) {
          throw new Error(data.error || data.detail || `Miya chat failed (${resp.status})`);
        }

        applyChatPayload(data);
      } catch (err) {
        logError({ feature: "miya-widget", action: "chat" }, err as Error);
        const detail =
          err instanceof Error && err.message
            ? err.message
            : "Something went wrong talking to Miya.";
        appendAssistantError(
          detail.includes("OPENAI") || detail.includes("503")
            ? "Miya is temporarily unavailable. Check that OPENAI_API_KEY is configured on the server."
            : detail.includes("Failed to fetch")
              ? "Miya timed out reaching the server. If this persists, ask your admin to confirm Celery workers are running."
              : detail.length < 200
                ? detail
                : "Sorry, I couldn't reach Mizan right now. Try again in a moment.",
        );
      } finally {
        setLoading(false);
      }
    },
    [accessToken, appendAssistantError, fishAudioConfigured, loading, pendingAttachments, user, voiceProcessing],
  );

  const uploadAttachment = useCallback(
    async (file: File) => {
      if (!accessToken || uploadingAttachment) return;
      setUploadingAttachment(true);
      try {
        const form = new FormData();
        form.append("file", file);
        const restaurantId = user?.restaurant || user?.restaurant_data?.id;
        if (restaurantId) form.append("restaurant_id", String(restaurantId));
        const resp = await fetch(`${API_BASE}/miya/attachments/`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: form,
        });
        const data = await resp.json();
        if (!resp.ok) {
          throw new Error(data.error || "Upload failed");
        }
        const doc = data.document as { id?: string; title?: string } | undefined;
        if (doc?.id) {
          setPendingAttachments((prev) => [
            ...prev,
            { id: doc.id, title: doc.title || file.name },
          ]);
        }
      } catch (err) {
        logError({ feature: "miya-widget", action: "attachment-upload" }, err as Error);
        appendAssistantError("Could not upload that file. Try a PDF or photo under 12 MB.");
      } finally {
        setUploadingAttachment(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [accessToken, appendAssistantError, uploadingAttachment, user],
  );

  const sendVoiceBlob = useCallback(
    async (blob: Blob, mimeType: string) => {
      if (!accessToken || loading || voiceProcessing) return;

      setVoiceProcessing(true);

      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      const applyVoicePayload = (data: {
        transcript?: string;
        reply?: string;
        audio?: { base64?: string; mime_type?: string };
      }) => {
        const transcript = (data.transcript || "").trim();
        const reply = data.reply || "Done.";
        if (transcript) {
          setHistory((prev) => [...prev, { role: "user", content: transcript }]);
        }
        setHistory((prev) => [...prev, { role: "assistant", content: reply }]);
        if (data.audio?.base64) {
          playBase64Audio(data.audio.base64, data.audio.mime_type || "audio/mpeg");
        }
      };

      try {
        const form = new FormData();
        form.append("audio", blob, `miya-voice.${mimeType.includes("ogg") ? "ogg" : "webm"}`);
        form.append("history", JSON.stringify(historyRef.current.slice(-8)));
        form.append("voice", "true");
        form.append("language", language || "en");
        const restaurantId = user?.restaurant || user?.restaurant_data?.id;
        if (restaurantId) {
          form.append("restaurant_id", String(restaurantId));
        }

        const resp = await fetch(`${API_BASE}/miya/voice-chat/`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: form,
        });

        if (resp.status === 202) {
          const queued = await resp.json();
          const taskId = queued.task_id as string | undefined;
          const earlyTranscript = (queued.transcript || "").trim();
          if (earlyTranscript) {
            setHistory((prev) => [...prev, { role: "user", content: earlyTranscript }]);
          }
          if (!taskId) {
            throw new Error("Miya did not return a task id");
          }

          for (let attempt = 0; attempt < 90; attempt += 1) {
            const delayMs = [400, 600, 800, 1000, 1200, 1500][Math.min(attempt, 5)];
            await sleep(delayMs);
            const statusResp = await fetch(
              `${API_BASE}/miya/chat/status/?task_id=${encodeURIComponent(taskId)}`,
              { headers: { Authorization: `Bearer ${accessToken}` } },
            );
            const statusData = await statusResp.json();
            if (statusData.status === "complete") {
              applyVoicePayload({
                transcript: earlyTranscript ? undefined : statusData.transcript,
                reply: statusData.reply,
                audio: statusData.audio,
              });
              return;
            }
            if (statusData.status === "failed" || !statusResp.ok) {
              throw new Error(
                statusData.error || statusData.reply || `Miya voice chat failed (${statusResp.status})`,
              );
            }
          }
          throw new Error("Miya is still thinking — try a simpler question or try again.");
        }

        const data = await resp.json();
        if (!resp.ok) {
          if (resp.status === 403) {
            appendAssistantError(t("ai.voice_manager_only"));
            return;
          }
          if (resp.status === 502) {
            appendAssistantError(t("ai.voice_transcribe_failed"));
            return;
          }
          throw new Error(data.error || data.detail || `Voice chat failed (${resp.status})`);
        }

        applyVoicePayload(data);
      } catch (err) {
        logError({ feature: "miya-widget", action: "voice-chat" }, err as Error);
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("task") || msg.includes("thinking") || msg.includes("503")) {
          appendAssistantError(msg || t("ai.chat_error"));
        } else {
          appendAssistantError(t("ai.voice_transcribe_failed"));
        }
      } finally {
        setVoiceProcessing(false);
      }
    },
    [
      accessToken,
      appendAssistantError,
      language,
      loading,
      t,
      user,
      voiceProcessing,
    ],
  );

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    setRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    if (!canUseVoiceInput) {
      appendAssistantError(t("ai.voice_manager_only"));
      return;
    }
    if (!voiceInputEnabled) {
      appendAssistantError(t("ai.voice_unavailable"));
      return;
    }
    if (recording || loading || voiceProcessing) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      appendAssistantError(t("ai.voice_unavailable"));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      chunksRef.current = [];

      const mimeType = pickRecorderMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stopMediaTracks();
        const blobType = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: blobType });
        chunksRef.current = [];
        mediaRecorderRef.current = null;

        if (blob.size > 0) {
          void sendVoiceBlob(blob, blobType);
        }
      };

      recorder.onerror = () => {
        setRecording(false);
        stopMediaTracks();
        appendAssistantError(t("ai.voice_transcribe_failed"));
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (err) {
      logError({ feature: "miya-widget", action: "record-start" }, err as Error);
      stopMediaTracks();
      appendAssistantError(t("ai.voice_unavailable"));
    }
  }, [
    appendAssistantError,
    canUseVoiceInput,
    loading,
    recording,
    sendVoiceBlob,
    stopMediaTracks,
    t,
    voiceInputEnabled,
    voiceProcessing,
  ]);

  if (!user || hideOnPlatformAdmin || !ALLOWED_ROLES.includes(user.role) || !enabled) {
    return null;
  }

  const busy = loading || voiceProcessing;

  return (
    <div className={cn("fixed z-[9999]", isRTL ? "left-5" : "right-5")} style={{ bottom: 72 }}>
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="miya-chat-title"
          className={cn(
            "mb-3 w-[min(100vw-2rem,360px)] rounded-2xl border border-emerald-100 bg-white shadow-2xl overflow-hidden flex flex-col dark:border-slate-700 dark:bg-slate-900",
            "animate-in slide-in-from-bottom-4 duration-300",
          )}
          style={{ height: "min(68vh, 480px)" }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 text-white"
            style={{ background: "linear-gradient(135deg, #00E676 0%, #00C853 100%)" }}
          >
            <div>
              <div id="miya-chat-title" className="font-bold text-lg">{t("ai.chat_title")}</div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 hover:bg-white/20"
              aria-label="Close Miya chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div
            className={cn(
              "flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-950/40",
              isRTL && "text-right",
            )}
          >
            {history.length === 0 && (
              <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
                {t("ai.chat_greeting")}
              </div>
            )}
            {history.map((turn, i) => (
              <div
                key={`${turn.role}-${i}`}
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                  turn.role === "user"
                    ? cn("ml-auto bg-emerald-500 text-white", isRTL && "mr-auto ml-0")
                    : "bg-white border border-slate-200 text-slate-800 shadow-sm dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100",
                )}
              >
                {turn.content}
              </div>
            ))}
            {busy && (
              <div className="text-xs text-slate-400 animate-pulse">
                {voiceProcessing ? t("ai.voice_processing") : t("ai.chat_thinking")}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-slate-100 p-3 bg-white dark:border-slate-800 dark:bg-slate-900">
            {pendingAttachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {pendingAttachments.map((att) => (
                  <span
                    key={att.id}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                  >
                    📎 {att.title}
                    <button
                      type="button"
                      className="hover:text-red-600"
                      onClick={() =>
                        setPendingAttachments((prev) => prev.filter((p) => p.id !== att.id))
                      }
                      aria-label={`Remove ${att.title}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendTextMessage(input);
              }}
              className="flex items-center gap-2"
            >
              {attachmentsEnabled && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadAttachment(file);
                    }}
                  />
                  <button
                    type="button"
                    disabled={busy || uploadingAttachment}
                    onClick={() => fileInputRef.current?.click()}
                    className="shrink-0 rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800 dark:hover:text-emerald-400 disabled:opacity-50"
                    aria-label="Attach document"
                    title="Attach document"
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>
                </>
              )}
              {canUseVoiceInput && voiceInputEnabled && (
                <button
                  type="button"
                  disabled={busy}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    void startRecording();
                  }}
                  onMouseUp={stopRecording}
                  onMouseLeave={() => {
                    if (recording) stopRecording();
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    void startRecording();
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    stopRecording();
                  }}
                  className={cn(
                    "shrink-0 rounded-xl p-2 transition-colors",
                    recording
                      ? "bg-red-100 text-red-600 animate-pulse dark:bg-red-950/40"
                      : "text-slate-500 hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800 dark:hover:text-emerald-400",
                    busy && "opacity-50 pointer-events-none",
                  )}
                  aria-label={recording ? t("ai.voice_recording") : t("ai.voice_hold")}
                  title={t("ai.voice_hold")}
                >
                  {recording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
              )}
              <label htmlFor="miya-chat-text-input" className="sr-only">
                {t("ai.chat_placeholder")}
              </label>
              <input
                id="miya-chat-text-input"
                ref={textInputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t("ai.chat_placeholder")}
                disabled={busy}
                className={cn(
                  "min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100",
                  isRTL && "text-right",
                )}
              />
              <button
                type="submit"
                disabled={busy || (!input.trim() && pendingAttachments.length === 0)}
                className="shrink-0 rounded-xl bg-emerald-500 p-2 text-white disabled:opacity-40 hover:bg-emerald-600"
                aria-label="Send message"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>
      )}

      <button
        ref={launcherButtonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "group flex flex-col items-center gap-1.5 focus:outline-none",
          "focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 rounded-2xl",
        )}
        aria-label={open ? t("ai.chat_close") : t("ai.chat_button")}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <div
          className={cn(
            "relative h-[88px] w-[88px] overflow-hidden rounded-full shadow-lg transition-transform duration-200",
            "ring-[3px] ring-emerald-500 ring-offset-2 ring-offset-transparent",
            "shadow-emerald-500/25 group-hover:scale-[1.04] group-active:scale-[0.98]",
            open && "ring-emerald-400",
          )}
        >
          <img src="/miya-avatar.webp" alt="" className="h-full w-full object-cover" aria-hidden />
          {open && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/35">
              <X className="h-7 w-7 text-white" strokeWidth={2.5} />
            </span>
          )}
        </div>
        {!open && (
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold text-white shadow-md transition-transform duration-200",
              "bg-gradient-to-br from-emerald-400 to-emerald-600",
              "ring-1 ring-white/30 dark:ring-emerald-300/25",
              "group-hover:scale-[1.03] group-active:scale-[0.98]",
            )}
          >
            {t("ai.chat_button")}
          </span>
        )}
      </button>
    </div>
  );
};

export default MiyaWidget;
