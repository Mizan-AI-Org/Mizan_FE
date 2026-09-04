import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Loader2, Mic, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AgentAvatar } from "@/components/agent/AgentAvatar";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useCommandCentre } from "@/hooks/use-command-centre";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useAgentPanelOptional } from "@/context/AgentPanelContext";
import { cn } from "@/lib/utils";
import { useAgentVoiceInput } from "@/hooks/use-agent-voice-input";
import {
  isMastraChatEnabled,
  fetchMastraTranscript,
  loadMastraMessages,
  loadPendingConfirmation,
  mastraConversationStorageKey,
  runMastraChat,
  saveMastraMessages,
  savePendingConfirmation,
  type MastraChatMessage,
} from "@/lib/mastraApi";

function newMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatMessageTime(epochMs?: number): string {
  const date = epochMs ? new Date(epochMs) : new Date();
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(date);
}

function formatDateLabel(epochMs: number, t: (key: string, fallback?: string) => string): string {
  const date = new Date(epochMs);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(date, today)) return t("ai.chat_today", "Today");
  if (sameDay(date, yesterday)) return t("ai.chat_yesterday", "Yesterday");
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(date);
}

function shouldShowDateDivider(messages: MastraChatMessage[], index: number): boolean {
  if (index === 0) return true;
  const prev = messages[index - 1]?.createdAt;
  const curr = messages[index]?.createdAt;
  if (!prev || !curr) return index === 0;
  const prevDay = new Date(prev);
  const currDay = new Date(curr);
  return (
    prevDay.getFullYear() !== currDay.getFullYear() ||
    prevDay.getMonth() !== currDay.getMonth() ||
    prevDay.getDate() !== currDay.getDate()
  );
}

function TypingIndicator() {
  const { t } = useLanguage();
  return (
    <div className="flex items-end gap-2">
      <AgentAvatar size="sm" className="mb-0.5 shrink-0" />
      <div className="mizan-chat-bubble-in flex items-center gap-1 rounded-2xl rounded-bl-md px-4 py-3">
        <span className="mizan-chat-typing-dot h-2 w-2 rounded-full bg-muted-foreground/50" />
        <span className="mizan-chat-typing-dot mizan-chat-typing-dot-2 h-2 w-2 rounded-full bg-muted-foreground/50" />
        <span className="mizan-chat-typing-dot mizan-chat-typing-dot-3 h-2 w-2 rounded-full bg-muted-foreground/50" />
        <span className="sr-only">{t("ai.chat_thinking")}</span>
      </div>
    </div>
  );
}

function ChatMessages({
  messages,
  loading,
  scrollRef,
}: {
  messages: MastraChatMessage[];
  loading: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { t } = useLanguage();

  return (
    <div
      ref={scrollRef}
      className="mizan-chat-thread min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-3"
    >
      {messages.map((msg, index) => {
        const showDate = shouldShowDateDivider(messages, index);
        const isUser = msg.role === "user";
        const prevSameRole = index > 0 && messages[index - 1]?.role === msg.role;
        const nextSameRole =
          index < messages.length - 1 && messages[index + 1]?.role === msg.role;

        return (
          <React.Fragment key={msg.id}>
            {showDate && msg.createdAt ? (
              <div className="flex justify-center py-2">
                <span className="rounded-full bg-background/80 px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm">
                  {formatDateLabel(msg.createdAt, t)}
                </span>
              </div>
            ) : null}
            {isUser ? (
              <div
                className={cn(
                  "flex justify-end",
                  prevSameRole ? "mt-0.5" : "mt-2",
                  nextSameRole ? "mb-0" : "mb-0.5",
                )}
              >
                <div
                  className={cn(
                    "mizan-chat-bubble-out relative max-w-[85%] whitespace-pre-wrap break-words px-3 py-1.5 text-[14px] leading-snug text-foreground",
                    nextSameRole ? "rounded-2xl rounded-br-md" : "rounded-2xl rounded-br-sm",
                    !prevSameRole && !nextSameRole && "rounded-2xl rounded-br-sm",
                  )}
                >
                  <span className="pe-14">{msg.content}</span>
                  <span className="absolute bottom-1 end-2 text-[10px] leading-none text-foreground/55">
                    {formatMessageTime(msg.createdAt)}
                  </span>
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  "flex items-end gap-2",
                  prevSameRole ? "mt-0.5" : "mt-2",
                  nextSameRole ? "mb-0" : "mb-0.5",
                )}
              >
                {!prevSameRole ? (
                  <AgentAvatar size="sm" className="mb-0.5 shrink-0" />
                ) : (
                  <div className="w-8 shrink-0" aria-hidden />
                )}
                <div
                  className={cn(
                    "mizan-chat-bubble-in relative max-w-[85%] whitespace-pre-wrap break-words px-3 py-1.5 text-[14px] leading-snug text-foreground",
                    nextSameRole ? "rounded-2xl rounded-bl-md" : "rounded-2xl rounded-bl-sm",
                    !prevSameRole && !nextSameRole && "rounded-2xl rounded-bl-sm",
                  )}
                >
                  <span className="pe-14">{msg.content}</span>
                  <span className="absolute bottom-1 end-2 text-[10px] leading-none text-muted-foreground">
                    {formatMessageTime(msg.createdAt)}
                  </span>
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}
      {loading ? <TypingIndicator /> : null}
    </div>
  );
}

function ChatComposer({
  input,
  setInput,
  loading,
  onSend,
  voiceSupported,
  voiceState,
  onVoiceHoldStart,
  onVoiceHoldEnd,
}: {
  input: string;
  setInput: (v: string) => void;
  loading: boolean;
  onSend: () => void;
  voiceSupported: boolean;
  voiceState: "idle" | "recording" | "transcribing";
  onVoiceHoldStart: () => void;
  onVoiceHoldEnd: () => void;
}) {
  const { t } = useLanguage();
  const micButtonRef = useRef<HTMLButtonElement>(null);
  const transcribing = voiceState === "transcribing";

  return (
    <div className="mizan-chat-composer-bar shrink-0 px-3 py-3">
      {voiceState === "recording" ? (
        <p className="mb-2 text-center text-xs font-medium text-primary animate-pulse">
          {t("ai.voice_recording")}
        </p>
      ) : null}
      {voiceState === "transcribing" ? (
        <p className="mb-2 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          {t("ai.voice_processing")}
        </p>
      ) : null}
      <form
        className="block"
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
      >
        <div
          className={cn(
            "flex min-h-[3rem] items-center gap-1 rounded-3xl border px-2 py-2 transition-colors",
            voiceState === "recording"
              ? "border-primary/50 bg-primary/10"
              : "border-border/60 bg-muted/30",
          )}
        >
          <div className="flex shrink-0 items-center">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-muted-foreground"
              disabled
              aria-label={t("ai.attach", { defaultValue: "Attach" })}
            >
              <Paperclip className="h-[18px] w-[18px]" aria-hidden />
            </Button>
            {voiceSupported ? (
              <Button
                ref={micButtonRef}
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "h-9 w-9 shrink-0 touch-none select-none",
                  voiceState === "recording"
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-primary",
                )}
                disabled={loading || transcribing}
                aria-pressed={voiceState === "recording"}
                aria-label={t("ai.voice_hold")}
                title={t("ai.voice_hold")}
                onPointerDown={(e) => {
                  if (loading || transcribing) return;
                  e.preventDefault();
                  onVoiceHoldStart();
                }}
                onPointerUp={(e) => {
                  e.preventDefault();
                  onVoiceHoldEnd();
                }}
                onPointerCancel={() => {
                  onVoiceHoldEnd();
                }}
              >
                <Mic className="h-[18px] w-[18px]" aria-hidden />
              </Button>
            ) : null}
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("ai.chat_placeholder")}
            rows={1}
            aria-label={t("ai.chat_placeholder")}
            className="mizan-chat-input max-h-28 min-h-[2.5rem] min-w-0 flex-1 resize-none border-0 bg-transparent px-1 py-2 text-[15px] leading-6 text-foreground shadow-none outline-none placeholder:text-muted-foreground focus-visible:ring-0"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full bg-primary hover:bg-primary/90"
            disabled={loading || transcribing || voiceState === "recording" || !input.trim()}
            aria-label={t("ai.send_message")}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <ArrowUp className="h-4 w-4" aria-hidden />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

function PanelHeader({ onClose, signalBadge }: { onClose?: () => void; signalBadge?: number }) {
  const { t } = useLanguage();
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-border/60 bg-primary px-4 py-2.5 text-primary-foreground">
      <div className="flex items-center gap-3">
        <div className="relative">
          <AgentAvatar size="md" ring className="ring-primary-foreground/30" />
          {signalBadge != null && signalBadge > 0 ? (
            <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-high px-1 text-[10px] font-bold text-high-foreground">
              {signalBadge > 9 ? "9+" : signalBadge}
            </span>
          ) : null}
        </div>
        <div>
          <p className="text-[15px] font-semibold leading-tight">
            {t("ai.agent_name", { defaultValue: "Agent" })}
          </p>
          <p className="text-xs text-primary-foreground/80">{t("ai.chat_online")}</p>
        </div>
      </div>
      {onClose ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/10"
          onClick={onClose}
          aria-label={t("common.close", { defaultValue: "Close" })}
        >
          <X className="h-5 w-5" aria-hidden />
        </Button>
      ) : null}
    </header>
  );
}

function AgentPanelBody({
  messages,
  loading,
  scrollRef,
  input,
  setInput,
  onSend,
  onClose,
  signalBadge,
  voiceSupported,
  voiceState,
  onVoiceHoldStart,
  onVoiceHoldEnd,
}: {
  messages: MastraChatMessage[];
  loading: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  onClose: () => void;
  signalBadge: number;
  voiceSupported: boolean;
  voiceState: "idle" | "recording" | "transcribing";
  onVoiceHoldStart: () => void;
  onVoiceHoldEnd: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <PanelHeader onClose={onClose} signalBadge={signalBadge} />
      <ChatMessages messages={messages} loading={loading} scrollRef={scrollRef} />
      <ChatComposer
        input={input}
        setInput={setInput}
        loading={loading}
        onSend={onSend}
        voiceSupported={voiceSupported}
        voiceState={voiceState}
        onVoiceHoldStart={onVoiceHoldStart}
        onVoiceHoldEnd={onVoiceHoldEnd}
      />
    </div>
  );
}

function AgentCollapsedRail({
  onOpen,
  signalBadge,
  agentLabel,
}: {
  onOpen: () => void;
  signalBadge: number;
  agentLabel: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "mizan-agent-rail-tab group relative flex h-full w-full flex-col items-center justify-center gap-4 px-1 py-8",
        "transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
      aria-label={agentLabel}
      onClick={onOpen}
    >
      <div className="relative z-10">
        <div className="mizan-agent-glow-ring relative rounded-full">
          <AgentAvatar size="lg" ring className="relative z-[1] ring-primary/40 ring-offset-2" />
        </div>
        {signalBadge > 0 ? (
          <span className="absolute -end-1 -top-1 z-[2] flex h-5 min-w-5 items-center justify-center rounded-full bg-high px-1 text-[10px] font-bold text-high-foreground shadow-md ring-2 ring-background">
            {signalBadge > 9 ? "9+" : signalBadge}
          </span>
        ) : (
          <span
            className="absolute bottom-0 end-0 z-[2] h-3 w-3 rounded-full border-2 border-background bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.8)]"
            aria-hidden
          />
        )}
      </div>
      <span className="mizan-agent-tab-label relative z-10 text-[10px] font-bold uppercase text-primary/90 group-hover:text-primary">
        {agentLabel}
      </span>
    </button>
  );
}

export const AgentChatPanel: React.FC = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const webAgentRoles = new Set(["MANAGER", "ADMIN", "OWNER", "SUPER_ADMIN", "SUPERVISOR"]);
  const canUseWebAgent = webAgentRoles.has((user?.role || "").toUpperCase());
  const panel = useAgentPanelOptional();
  const { data: commandData } = useCommandCentre();
  const [localOpen, setLocalOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<MastraChatMessage[]>([]);
  const [conversationId, setConversationId] = useState("");
  const [historyReady, setHistoryReady] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sendTextRef = useRef<(rawText: string, options?: { fromVoice?: boolean }) => void>(
    () => undefined,
  );

  const open = panel?.open ?? localOpen;
  const setOpen = panel?.setOpen ?? setLocalOpen;
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const signalBadge = useMemo(() => {
    if (!commandData?.success) return 0;
    return (commandData.filter_counts?.needs_me || 0) + (commandData.filter_counts?.watching || 0);
  }, [commandData]);

  const userName = useMemo(() => {
    const first = (user?.first_name || "").trim();
    const last = (user?.last_name || "").trim();
    const full = `${first} ${last}`.trim();
    if (full) return full;
    if (first) return first;
    return (user?.email || "").split("@")[0] || "there";
  }, [user]);

  const userId = user?.id ? String(user.id) : "";

  useEffect(() => {
    if (!userId) {
      setHistoryReady(false);
      return;
    }

    const key = mastraConversationStorageKey(userId);
    let storedConv = "";
    try {
      storedConv = window.localStorage.getItem(key) || "";
      if (storedConv) setConversationId(storedConv);
    } catch {
      // ignore
    }

    const storedMessages = loadMastraMessages(userId);
    if (storedMessages.length > 0) {
      setMessages(storedMessages);
    } else {
      const welcome: MastraChatMessage = {
        id: "welcome",
        role: "assistant",
        content: t("ai.chat_welcome", { name: userName }),
        createdAt: Date.now(),
      };
      setMessages([welcome]);
      saveMastraMessages(userId, [welcome]);
    }

    const convForSync = storedConv;
    if (convForSync) {
      void fetchMastraTranscript(convForSync).then((serverRows) => {
        if (serverRows.length === 0) return;
        setMessages((prev) => {
          const local = prev.filter((m) => m.id !== "welcome");
          if (local.length >= serverRows.length) return prev;
          return serverRows;
        });
      });
    }
    setHistoryReady(true);
  }, [userId, userName, t]);

  useEffect(() => {
    if (!userId || !historyReady || messages.length === 0) return;
    saveMastraMessages(userId, messages);
  }, [messages, userId, historyReady]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (panel?.prefill) {
      setInput(panel.prefill);
      panel.clearPrefill();
    }
  }, [panel?.prefill, panel]);

  const sendText = useCallback(
    async (rawText: string, options?: { fromVoice?: boolean }) => {
      const text = rawText.trim();
      if (!text || loading) return;

      const fromVoice = !!options?.fromVoice;
      const userMsg: MastraChatMessage = {
        id: newMessageId(),
        role: "user",
        content: text,
        createdAt: Date.now(),
        fromVoice,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        const convId =
          conversationId ||
          (typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : newMessageId());

        const result = await runMastraChat({
          message: text,
          conversationId: convId,
          channel: "web",
          locale: language,
        });

        if (!conversationId && userId) {
          setConversationId(convId);
          try {
            window.localStorage.setItem(mastraConversationStorageKey(userId), convId);
          } catch {
            // ignore
          }
        }

        if (result.pendingConfirmation?.tool && userId) {
          savePendingConfirmation(userId, convId, result.pendingConfirmation);
        } else if (userId) {
          savePendingConfirmation(userId, convId, null);
        }

        const reply = result.text?.trim()
          ? result.text
          : result.code === "mastra_not_configured"
            ? t("ai.chat_unavailable", "Agent is not available right now. Try again later.")
            : result.code === "mastra_unreachable" && import.meta.env.DEV
              ? t(
                  "ai.chat_agent_offline_dev",
                  "Agent service is offline. Start it with: cd agent && npm run dev (port 4111).",
                )
              : result.message || t("ai.chat_error", "I couldn't complete that just now. Try again in a moment.");

        setMessages((prev) => [
          ...prev,
          {
            id: newMessageId(),
            role: "assistant",
            content: reply,
            createdAt: Date.now(),
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: newMessageId(),
            role: "assistant",
            content: t("ai.chat_error", "I couldn't complete that just now. Try again in a moment."),
            createdAt: Date.now(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [conversationId, language, loading, t, userId],
  );

  sendTextRef.current = (rawText, options) => {
    void sendText(rawText, options);
  };

  const {
    voiceState,
    voiceSupported,
    pressHold,
    releaseHold,
  } = useAgentVoiceInput({
    onTranscript: (transcript) => sendTextRef.current(transcript, { fromVoice: true }),
    onError: (msg) => {
      setMessages((prev) => [
        ...prev,
        {
          id: newMessageId(),
          role: "assistant",
          content: msg,
          createdAt: Date.now(),
        },
      ]);
    },
  });

  const sendMessage = useCallback(() => {
    void sendText(input);
  }, [input, sendText]);

  const handleVoiceHoldStart = useCallback(() => {
    if (loading) return;
    void pressHold();
  }, [loading, pressHold]);

  const handleVoiceHoldEnd = useCallback(() => {
    void releaseHold();
  }, [releaseHold]);

  if (!isMastraChatEnabled()) return null;

  const handleClose = () => setOpen(false);
  const handleSend = () => void sendMessage();

  const panelBodyProps = {
    messages,
    loading,
    scrollRef,
    input,
    setInput,
    onSend: handleSend,
    onClose: handleClose,
    signalBadge,
    voiceSupported,
    voiceState,
    onVoiceHoldStart: () => void handleVoiceHoldStart(),
    onVoiceHoldEnd: () => void handleVoiceHoldEnd(),
  };

  if (!canUseWebAgent) {
    return null;
  }

  return (
    <>
      {isDesktop ? (
        <aside
          className={cn(
            "mizan-agent-rail fixed end-0 z-[1600] hidden flex-col overflow-hidden border-s border-border/80 bg-card lg:flex",
            open
              ? "mizan-agent-rail-open w-[var(--mizan-agent-width)]"
              : "mizan-agent-rail-tab w-[var(--mizan-agent-tab-width)]",
          )}
          aria-label={t("ai.chat_title")}
        >
          {open ? (
            <AgentPanelBody {...panelBodyProps} />
          ) : (
            <AgentCollapsedRail
              onOpen={() => setOpen(true)}
              signalBadge={signalBadge}
              agentLabel={t("ai.chat_title")}
            />
          )}
        </aside>
      ) : null}

      <Button
        type="button"
        size="lg"
        className={cn(
          "mizan-agent-fab-glow fixed bottom-20 end-4 z-[2500] h-14 w-14 overflow-hidden rounded-full border-2 border-primary/30 p-0 lg:hidden",
          open && "hidden",
        )}
        aria-label={t("ai.chat_button")}
        onClick={() => setOpen(true)}
      >
        <AgentAvatar size="xl" className="h-14 w-14" alt="" />
      </Button>

      <Sheet open={open && !isDesktop} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex h-full max-h-[100dvh] w-full flex-col p-0 sm:max-w-md">
          <SheetHeader className="sr-only">
            <SheetTitle>{t("ai.chat_title")}</SheetTitle>
          </SheetHeader>
          <AgentPanelBody {...panelBodyProps} />
        </SheetContent>
      </Sheet>
    </>
  );
};

export default AgentChatPanel;
