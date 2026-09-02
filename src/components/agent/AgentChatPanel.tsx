import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Loader2, Mic, Paperclip, Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import {
  isMastraChatEnabled,
  mastraConversationStorageKey,
  runMastraChat,
  type MastraChatMessage,
} from "@/lib/mastraApi";

function newMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatTime(): string {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date());
}

function ChatMessages({
  messages,
  loading,
  userName,
  scrollRef,
  showWelcome,
}: {
  messages: MastraChatMessage[];
  loading: boolean;
  userName: string;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  showWelcome?: boolean;
}) {
  const { t } = useLanguage();
  const welcomeTime = useMemo(() => formatTime(), []);

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
      {showWelcome && messages.length === 0 ? (
        <div className="flex gap-2.5">
          <AgentAvatar size="sm" className="mt-0.5" />
          <div className="min-w-0 space-y-1">
            <div className="max-w-[92%] rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2.5 text-sm text-foreground">
              {t("ai.chat_welcome", { name: userName })}
            </div>
            <p className="ps-1 text-caption text-muted-foreground">{welcomeTime}</p>
          </div>
        </div>
      ) : null}
      {messages.map((msg) =>
        msg.role === "user" ? (
          <div
            key={msg.id}
            className="ms-auto max-w-[92%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2.5 text-sm text-primary-foreground"
          >
            {msg.content}
          </div>
        ) : (
          <div key={msg.id} className="flex gap-2.5">
            <AgentAvatar size="sm" className="mt-0.5 shrink-0" />
            <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2.5 text-sm text-foreground">
              {msg.content}
            </div>
          </div>
        ),
      )}
      {loading ? (
        <div className="flex items-center gap-2.5 ps-1 text-sm text-muted-foreground">
          <AgentAvatar size="sm" />
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {t("ai.chat_thinking")}
        </div>
      ) : null}
    </div>
  );
}

function ChatComposer({
  input,
  setInput,
  loading,
  onSend,
}: {
  input: string;
  setInput: (v: string) => void;
  loading: boolean;
  onSend: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="shrink-0 border-t border-border/80 bg-card p-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
      >
        <div className="rounded-panel border border-border/80 bg-muted/20 px-3 py-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("ai.chat_placeholder")}
            rows={2}
            className="min-h-[44px] resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-0.5">
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" disabled aria-label={t("ai.attach", { defaultValue: "Attach" })}>
                <Paperclip className="h-4 w-4" aria-hidden />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" disabled aria-label={t("ai.voice", { defaultValue: "Voice" })}>
                <Mic className="h-4 w-4" aria-hidden />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" disabled aria-label={t("ai.speak", { defaultValue: "Read aloud" })}>
                <Volume2 className="h-4 w-4" aria-hidden />
              </Button>
            </div>
            <Button
              type="submit"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full"
              disabled={loading || !input.trim()}
              aria-label={t("ai.send_message")}
            >
              <ArrowUp className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function PanelHeader({ onClose, signalBadge }: { onClose?: () => void; signalBadge?: number }) {
  const { t } = useLanguage();
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-border/80 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="relative">
          <AgentAvatar size="md" ring />
          {signalBadge != null && signalBadge > 0 ? (
            <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-high px-1 text-[10px] font-bold text-high-foreground">
              {signalBadge > 9 ? "9+" : signalBadge}
            </span>
          ) : null}
        </div>
        <div>
          <p className="text-sm font-semibold">{t("ai.agent_name", { defaultValue: "Miya" })}</p>
          <p className="flex items-center gap-1.5 text-caption text-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" aria-hidden />
            {t("ai.chat_online")}
          </p>
        </div>
      </div>
      {onClose ? (
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label={t("common.close", { defaultValue: "Close" })}>
          <X className="h-4 w-4" aria-hidden />
        </Button>
      ) : null}
    </header>
  );
}

function AgentPanelBody({
  messages,
  loading,
  userName,
  scrollRef,
  input,
  setInput,
  onSend,
  onClose,
  signalBadge,
}: {
  messages: MastraChatMessage[];
  loading: boolean;
  userName: string;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  onClose: () => void;
  signalBadge: number;
}) {
  return (
    <>
      <PanelHeader onClose={onClose} signalBadge={signalBadge} />
      <ChatMessages
        messages={messages}
        loading={loading}
        userName={userName}
        scrollRef={scrollRef}
        showWelcome
      />
      <ChatComposer input={input} setInput={setInput} loading={loading} onSend={onSend} />
    </>
  );
}

export const AgentChatPanel: React.FC = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const panel = useAgentPanelOptional();
  const { data: commandData } = useCommandCentre();
  const [localOpen, setLocalOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<MastraChatMessage[]>([]);
  const [conversationId, setConversationId] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!user?.id) return;
    const key = mastraConversationStorageKey(String(user.id));
    try {
      const stored = window.localStorage.getItem(key);
      if (stored) setConversationId(stored);
    } catch {
      // ignore
    }
  }, [user?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (panel?.prefill) {
      setInput(panel.prefill);
      panel.clearPrefill();
    }
  }, [panel?.prefill, panel]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: MastraChatMessage = { id: newMessageId(), role: "user", content: text };
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

      if (!conversationId && user?.id) {
        setConversationId(convId);
        try {
          window.localStorage.setItem(mastraConversationStorageKey(String(user.id)), convId);
        } catch {
          // ignore
        }
      }

      const reply =
        result.success && result.text
          ? result.text
          : result.code === "mastra_not_configured"
            ? t("ai.chat_unavailable", "Agent is not available right now. Try again later.")
            : result.message || t("ai.chat_error");

      setMessages((prev) => [
        ...prev,
        { id: newMessageId(), role: "assistant", content: reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: newMessageId(), role: "assistant", content: t("ai.chat_error") },
      ]);
    } finally {
      setLoading(false);
    }
  }, [conversationId, input, language, loading, t, user?.id]);

  if (!isMastraChatEnabled()) return null;

  const handleClose = () => setOpen(false);
  const handleSend = () => void sendMessage();

  const panelBodyProps = {
    messages,
    loading,
    userName,
    scrollRef,
    input,
    setInput,
    onSend: handleSend,
    onClose: handleClose,
    signalBadge,
  };

  return (
    <>
      {/* Desktop: in-flow panel when open (shrinks main content) */}
      {open ? (
        <aside
          className={cn(
            "hidden min-h-0 w-[var(--mizan-agent-width,24rem)] max-w-[var(--mizan-agent-width,24rem)] shrink-0 flex-col overflow-hidden",
            "border-s border-border/80 bg-card lg:flex",
          )}
          aria-label={t("ai.chat_title")}
        >
          <AgentPanelBody {...panelBodyProps} />
        </aside>
      ) : null}

      {/* Collapsed trigger — desktop edge tab */}
      {!open ? (
        <button
          type="button"
          className={cn(
            "fixed end-0 top-1/2 z-[2500] hidden -translate-y-1/2 flex-col items-center gap-1 lg:flex",
            "rounded-s-panel border border-e-0 border-border/80 bg-card py-2 ps-1.5 pe-1 shadow-soft",
          )}
          aria-label={t("ai.chat_button")}
          onClick={() => setOpen(true)}
        >
          <div className="relative">
            <AgentAvatar size="lg" ring />
            {signalBadge > 0 ? (
              <span className="absolute -end-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-high text-[10px] font-semibold text-high-foreground">
                {signalBadge > 9 ? "9+" : signalBadge}
              </span>
            ) : null}
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
            {t("ai.chat_title")}
          </span>
        </button>
      ) : null}

      {/* Mobile: FAB + sheet */}
      <Button
        type="button"
        size="lg"
        className={cn(
          "fixed bottom-20 end-4 z-[2500] h-14 w-14 overflow-hidden rounded-full p-0 shadow-lg lg:hidden",
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
