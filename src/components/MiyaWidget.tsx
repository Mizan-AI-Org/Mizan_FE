import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Mic, MicOff, Paperclip, Send, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { AuthContextType } from "@/contexts/AuthContext.types";
import { useLanguage } from "@/hooks/use-language";
import { API_BASE, api } from "@/lib/api";
import { clearMiyaPageContext, getMiyaPageContext, subscribeMiyaPageContext } from "@/lib/miyaPageContext";
import { logError } from "@/lib/logging";
import { cn } from "@/lib/utils";
import { MiyaContextChip } from "@/components/os";

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

/** Roles allowed to read the command-center briefing the launcher badge is derived from. */
const ATTENTION_ROLES = new Set(["ADMIN", "SUPER_ADMIN", "MANAGER", "OWNER"]);

const MIYA_LOCATION_KEY = "mizan_miya_location_id";
const MIYA_LOCATION_NAME_KEY = "mizan_miya_location_name";

function readMiyaEstablishmentContext(): { location_id?: string; location_name?: string } {
  try {
    const location_id = localStorage.getItem(MIYA_LOCATION_KEY) || undefined;
    const location_name = localStorage.getItem(MIYA_LOCATION_NAME_KEY) || undefined;
    if (!location_id) return {};
    return { location_id, location_name: location_name || undefined };
  } catch {
    return {};
  }
}

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
  const [pageContext, setPageContext] = useState(() => getMiyaPageContext());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const historyRef = useRef<ChatTurn[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const launcherButtonRef = useRef<HTMLButtonElement>(null);

  const canUseVoiceInput = Boolean(user?.role && VOICE_INPUT_ROLES.has(user.role));

  // Shares its cache key with CommandCenter, so the dashboard pays no extra request.
  const attentionQuery = useQuery({
    queryKey: ["miya", "command-center"],
    queryFn: () =>
      api.getMiyaCommandCenter() as Promise<{ attention?: Array<{ id: string }> }>,
    enabled: Boolean(user?.role && ATTENTION_ROLES.has(user.role)) && !hideOnPlatformAdmin,
    staleTime: 20_000,
    refetchInterval: 60_000,
    retry: false,
  });
  const attentionCount = attentionQuery.data?.attention?.length ?? 0;
  const hasAttention = attentionCount > 0;

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => subscribeMiyaPageContext(setPageContext), []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading, open, voiceProcessing]);

  // Grow the composer with the draft so long prompts stay readable in full.
  useEffect(() => {
    const el = textInputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [input, open]);

  useEffect(() => {
    const openHandler = (event: Event) => {
      setOpen(true);
      const detail = (event as CustomEvent<{ prompt?: string }>).detail;
      const prompt = (detail?.prompt || "").trim();
      if (prompt) {
        setInput(prompt);
        window.setTimeout(() => textInputRef.current?.focus(), 0);
      }
    };
    window.addEventListener("miya:open", openHandler);
    return () => window.removeEventListener("miya:open", openHandler);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("miya:panel-state", { detail: { open } }));
    try {
      document.documentElement.style.setProperty("--mizan-miya-panel", open ? "420px" : "0px");
    } catch {
      /* ignore */
    }
  }, [open]);

  // Focus into the docked panel; Escape closes. No modal trap - this is an OS layer.
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
        session_context?: { location_id?: string; location_name?: string };
      }) => {
        const reply = data.reply || "Done.";
        setHistory((prev) => [...prev, { role: "assistant", content: reply }]);
        if (fishAudioConfigured && data.audio?.base64) {
          playBase64Audio(data.audio.base64, data.audio.mime_type || "audio/mpeg");
        }
        const locId = data.session_context?.location_id;
        const locName = data.session_context?.location_name;
        if (locId) {
          try {
            localStorage.setItem(MIYA_LOCATION_KEY, locId);
            if (locName) localStorage.setItem(MIYA_LOCATION_NAME_KEY, locName);
          } catch {
            /* ignore */
          }
        }
      };

      try {
        const establishment = readMiyaEstablishmentContext();
        const pageContext = getMiyaPageContext();
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
            ...establishment,
            ...(pageContext ? { page_context: pageContext } : {}),
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
          throw new Error("Miya is still thinking - try a simpler question or try again.");
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
        const establishment = readMiyaEstablishmentContext();
        if (establishment.location_id) form.append("location_id", establishment.location_id);
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
        const establishment = readMiyaEstablishmentContext();
        if (establishment.location_id) {
          form.append("location_id", establishment.location_id);
        }
        if (establishment.location_name) {
          form.append("location_name", establishment.location_name);
        }
        const pageContext = getMiyaPageContext();
        if (pageContext) {
          form.append("page_context", JSON.stringify(pageContext));
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
          throw new Error("Miya is still thinking - try a simpler question or try again.");
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
    <>
      {/* Edge affordance when panel is closed - not a floating chatbot FAB */}
      {!open ? (
        <button
          ref={launcherButtonRef}
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "fixed z-[9998] bottom-24 hidden lg:flex",
            "flex-col items-center gap-1.5 rounded-l-lg border border-r-0",
            "bg-background/90 px-1.5 py-3 shadow-soft backdrop-blur-md",
            "text-[10px] font-semibold uppercase tracking-[0.12em]",
            "transition-all duration-os hover:bg-muted hover:text-foreground",
            hasAttention
              ? "miya-launcher-attention border-primary/45 text-foreground"
              : "border-border/70 text-muted-foreground opacity-70 hover:opacity-100",
            isRTL ? "left-0 rounded-l-none rounded-r-lg border-l-0 border-r" : "right-0",
          )}
          aria-label={
            hasAttention
              ? `${t("ai.chat_button")} - ${attentionCount} ${attentionCount === 1 ? "item needs" : "items need"} attention`
              : t("ai.chat_button")
          }
          aria-expanded={false}
        >
          <span className="relative inline-flex">
            <img
              src="/miya-avatar.webp"
              alt=""
              className={cn(
                "h-6 w-6 rounded-full object-cover",
                hasAttention && "ring-2 ring-primary/60",
              )}
              aria-hidden
            />
            {hasAttention ? (
              <>
                <span
                  className="miya-ping absolute -right-1 -top-1 h-4 w-4 rounded-full bg-primary"
                  aria-hidden
                />
                <span
                  className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold leading-none text-primary-foreground ring-2 ring-background"
                  aria-hidden
                >
                  {attentionCount > 9 ? "9+" : attentionCount}
                </span>
              </>
            ) : null}
          </span>
          <span className="[writing-mode:vertical-rl] rotate-180">Miya</span>
        </button>
      ) : null}

      {/* Docked OS panel */}
      <div
        ref={panelRef}
        role="complementary"
        aria-labelledby="miya-chat-title"
        aria-hidden={!open}
        className={cn(
          "fixed z-[9999] top-[57px] bottom-0 flex flex-col border-border/80 bg-background shadow-strong",
          "transition-transform duration-300 ease-out",
          isRTL ? "left-0 border-r" : "right-0 border-l",
          "w-[min(100vw,420px)]",
          open ? "translate-x-0" : isRTL ? "-translate-x-full" : "translate-x-full",
          "max-lg:bottom-[56px]",
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 bg-ai/40">
          <div className="flex min-w-0 items-center gap-2.5">
            <img src="/miya-avatar.webp" alt="" className="h-8 w-8 rounded-full object-cover" aria-hidden />
            <div id="miya-chat-title" className="min-w-0 truncate text-body font-semibold">
              {t("ai.chat_title")}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close Miya"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          className={cn(
            "flex-1 space-y-3 overflow-y-auto bg-surface-sunken/50 p-4",
            isRTL && "text-right",
          )}
        >
          {(pageContext?.entity_label || pageContext?.entity_type) && (
            <MiyaContextChip
              entityType={pageContext.entity_type}
              entityLabel={pageContext.entity_label || pageContext.entity_type}
              onClear={() => clearMiyaPageContext()}
            />
          )}
          {history.length === 0 && (
            <div className="space-y-3 py-6 type-secondary">
              <p className="text-center text-body text-muted-foreground">{t("ai.chat_greeting")}</p>
              <div className="flex flex-wrap justify-center gap-2">
                {["What needs attention?", "Who is overloaded?", "Give me an ops update"].map((q) => (
                  <button
                    key={q}
                    type="button"
                    className="rounded-control border border-border bg-card px-2.5 py-2 text-caption text-foreground hover:bg-muted"
                    onClick={() => {
                      setInput(q);
                      window.setTimeout(() => textInputRef.current?.focus(), 0);
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {history.map((turn, i) => (
            <div
              key={`${turn.role}-${i}`}
              className={cn(
                "max-w-[90%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap",
                turn.role === "user"
                  ? cn("ml-auto bg-primary text-primary-foreground", isRTL && "mr-auto ml-0")
                  : "bg-card border border-border text-foreground shadow-sm",
              )}
            >
              {turn.content}
            </div>
          ))}
          {busy && (
            <div className="text-xs text-muted-foreground animate-pulse">
              {voiceProcessing ? t("ai.voice_processing") : t("ai.chat_thinking")}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-border/70 p-3 bg-background">
          {pendingAttachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {pendingAttachments.map((att) => (
                <span
                  key={att.id}
                  className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary"
                >
                  {att.title}
                  <button
                    type="button"
                    className="hover:text-destructive"
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
            className="flex items-end gap-2"
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
                  className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-primary disabled:opacity-50"
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
                  "shrink-0 rounded-lg p-2 transition-colors",
                  recording
                    ? "bg-red-100 text-red-600 animate-pulse dark:bg-red-950/40"
                    : "text-muted-foreground hover:bg-muted hover:text-primary",
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
            <textarea
              id="miya-chat-text-input"
              ref={textInputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter" || e.shiftKey) return;
                e.preventDefault();
                if (busy || (!input.trim() && pendingAttachments.length === 0)) return;
                void sendTextMessage(input);
              }}
              placeholder={t("ai.chat_placeholder")}
              disabled={busy}
              className={cn(
                "min-w-0 flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm",
                "max-h-40 overflow-y-auto leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30",
                isRTL && "text-right",
              )}
            />
            <button
              type="submit"
              disabled={busy || (!input.trim() && pendingAttachments.length === 0)}
              className="shrink-0 rounded-lg bg-primary p-2 text-primary-foreground disabled:opacity-40 hover:opacity-95"
              aria-label="Send message"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default MiyaWidget;
