import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  CalendarClock,
  Command,
  Loader2,
  MessageSquare,
  Sparkles,
  UserPlus,
  ClipboardPlus,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { AuthContextType } from "@/contexts/AuthContext.types";
import { useLanguage } from "@/hooks/use-language";
import { API_BASE } from "@/lib/api";
import { getMiyaPageContext, askMiya, subscribeMiyaPageContext } from "@/lib/miyaPageContext";
import { cn } from "@/lib/utils";
import { ActionPreview, type ActionPreviewModel } from "@/components/miya/ActionPreview";
import { commandKindLabel } from "@/components/miya/commandBarUtils";

const RECENT_KEY = "mizan_miya_command_recent_v1";
const MIYA_LOCATION_KEY = "mizan_miya_location_id";
const MIYA_LOCATION_NAME_KEY = "mizan_miya_location_name";

type ChatTurn = { role: "user" | "assistant"; content: string };

type CommandResult = {
  reply?: string;
  tool_trace?: unknown[];
  needs_confirmation?: boolean;
  needs_clarification?: boolean;
  command_kind?: string;
  action_preview?: ActionPreviewModel;
  pending_confirmation?: Record<string, unknown>;
  session_context?: Record<string, unknown>;
  verified?: boolean;
  success?: boolean;
};

type Suggestion = { id: string; label: string; prompt: string };

function readEstablishment(): { location_id?: string; location_name?: string } {
  try {
    const location_id = localStorage.getItem(MIYA_LOCATION_KEY) || undefined;
    const location_name = localStorage.getItem(MIYA_LOCATION_NAME_KEY) || undefined;
    if (!location_id) return {};
    return { location_id, location_name: location_name || undefined };
  } catch {
    return {};
  }
}

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string").slice(0, 8) : [];
  } catch {
    return [];
  }
}

function pushRecent(prompt: string) {
  const next = [prompt, ...loadRecent().filter((x) => x !== prompt)].slice(0, 8);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

type Props = {
  className?: string;
  inputClassName?: string;
};

export function MiyaCommandBar({ className = "", inputClassName = "" }: Props) {
  const { user, accessToken } = useAuth() as AuthContextType;
  const { t } = useLanguage();
  const location = useLocation();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<string[]>(() => loadRecent());
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [result, setResult] = useState<CommandResult | null>(null);
  const [pending, setPending] = useState<Record<string, unknown> | null>(null);
  const historyRef = useRef<ChatTurn[]>([]);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  const [pageContext, setPageContext] = useState(() => getMiyaPageContext());

  useEffect(() => subscribeMiyaPageContext(setPageContext), []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        if (!busy) setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [busy]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
        inputRef.current?.focus();
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pageContextLive = pageContext;
  const contextSuggestion = useMemo((): Suggestion | null => {
    if (pageContextLive?.entity_type && pageContextLive?.entity_id) {
      const label = pageContextLive.entity_label || pageContextLive.entity_type;
      return {
        id: "ctx",
        label: `Ask about this ${pageContextLive.entity_type}`,
        prompt: `Tell me about this ${pageContextLive.entity_type}: ${label}`,
      };
    }
    if (location.pathname.includes("incident") || location.search.includes("incident=")) {
      return {
        id: "ctx-inc",
        label: "Ask about this incident",
        prompt: "What's the status of this incident?",
      };
    }
    return null;
  }, [pageContextLive, location.pathname, location.search]);

  const suggested: Suggestion[] = useMemo(() => {
    const path = location.pathname;
    const fromState: Suggestion[] = [
      { id: "s1", label: "What needs my attention?", prompt: "What needs my attention right now?" },
      { id: "s2", label: "Are we understaffed tomorrow?", prompt: "Are we understaffed tomorrow?" },
      { id: "s3", label: "Show unresolved incidents", prompt: "Show me unresolved incidents." },
      { id: "s4", label: "What is overdue?", prompt: "What is overdue today?" },
      { id: "s5", label: "Prepare today's briefing", prompt: "Give me today's operational briefing." },
    ];
    if (path.includes("staff-requests") || path.includes("finance")) {
      fromState.unshift({
        id: "s-appr",
        label: "Which invoices need approval?",
        prompt: "Which invoices need my approval and which are safe?",
      });
    }
    if (path.includes("scheduling")) {
      fromState.unshift({
        id: "s-sched",
        label: "Coverage gaps tomorrow",
        prompt: "Are we understaffed tomorrow? Show gaps and recommendations.",
      });
    }
    if (path.includes("staff-app") || path.includes("people")) {
      fromState.unshift({
        id: "s-staff",
        label: "Who is overloaded?",
        prompt: "Who is overloaded right now?",
      });
    }
    return fromState.slice(0, 6);
  }, [location.pathname]);

  const quickActions: Suggestion[] = useMemo(
    () => [
      { id: "q-assign", label: "Assign", prompt: "Assign this to " },
      { id: "q-notify", label: "Notify", prompt: "Tell the team " },
      { id: "q-schedule", label: "Schedule", prompt: "Schedule " },
      { id: "q-task", label: "Create task", prompt: "Create a task to " },
    ],
    [],
  );

  const runCommand = useCallback(
    async (raw: string, opts?: { pending?: Record<string, unknown> | null }) => {
      const message = raw.trim();
      if (!message || !accessToken || busy) return;

      setBusy(true);
      setOpen(true);
      setResult(null);
      setRecent(pushRecent(message));
      setHistory((prev) => [...prev, { role: "user", content: message }]);

      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      const establishment = readEstablishment();
      const pageCtx = getMiyaPageContext();
      const pendingPayload = opts?.pending ?? pending;

      try {
        const resp = await fetch(`${API_BASE}/miya/chat/`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message,
            history: historyRef.current.slice(-8),
            voice: false,
            channel: "dashboard",
            restaurant_id: user?.restaurant || user?.restaurant_data?.id || undefined,
            ...establishment,
            ...(pageCtx ? { page_context: pageCtx } : {}),
            ...(pendingPayload ? { pending_confirmation: pendingPayload } : {}),
          }),
        });

        let data: CommandResult = {};
        if (resp.status === 202) {
          const queued = await resp.json();
          const taskId = queued.task_id as string | undefined;
          if (!taskId) throw new Error("Miya did not return a task id");
          for (let attempt = 0; attempt < 90; attempt += 1) {
            await sleep([400, 600, 800, 1000, 1200, 1500][Math.min(attempt, 5)]);
            const statusResp = await fetch(
              `${API_BASE}/miya/chat/status/?task_id=${encodeURIComponent(taskId)}`,
              { headers: { Authorization: `Bearer ${accessToken}` } },
            );
            const statusData = await statusResp.json();
            if (statusData.status === "complete") {
              data = statusData;
              break;
            }
            if (statusData.status === "failed" || !statusResp.ok) {
              throw new Error(statusData.error || statusData.reply || "Miya failed");
            }
          }
          if (!data.reply && !data.action_preview) {
            throw new Error("Miya is still thinking - try again.");
          }
        } else {
          data = await resp.json();
          if (!resp.ok) {
            throw new Error((data as { error?: string }).error || `Miya failed (${resp.status})`);
          }
        }

        setResult(data);
        if (data.pending_confirmation) {
          setPending(data.pending_confirmation);
        } else if (!data.needs_confirmation) {
          setPending(null);
        }
        const reply = (data.reply || "").trim();
        if (reply) {
          setHistory((prev) => [...prev, { role: "assistant", content: reply }]);
        }
        setQuery("");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Something went wrong talking to Miya.";
        setResult({ reply: msg, command_kind: "question" });
        setHistory((prev) => [...prev, { role: "assistant", content: msg }]);
      } finally {
        setBusy(false);
      }
    },
    [accessToken, busy, pending, user],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runCommand(query);
  };

  const showSurface = open;

  return (
    <div className={cn("relative", className)} ref={rootRef}>
      <form onSubmit={onSubmit} className="relative">
        <Sparkles
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary"
          aria-hidden
        />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={t("ai.chat_placeholder")}
          className={cn(
            "h-11 w-full rounded-panel border border-border bg-card pl-9 pr-16 text-body shadow-soft outline-none",
            "placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20",
            inputClassName,
          )}
          aria-label={t("ai.chat_placeholder")}
          aria-haspopup="dialog"
          autoComplete="off"
        />
        <div className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 text-meta">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden /> : (
            <>
              <Command className="h-3 w-3" aria-hidden />
              <span>K</span>
            </>
          )}
        </div>
      </form>

      {showSurface ? (
        <div
          className="absolute left-0 right-0 z-[60] mt-2 max-h-[min(75vh,560px)] overflow-y-auto rounded-panel border border-border bg-popover text-popover-foreground shadow-strong"
          role="dialog"
          aria-label="Miya command results"
        >
          {result ? (
            <div className="space-y-3 p-3">
              {busy ? (
                <p className="type-secondary px-1">Working on that…</p>
              ) : null}
              {result.command_kind ? (
                <p className="text-caption px-1">
                  {commandKindLabel(result.command_kind)}
                </p>
              ) : null}
              {result.action_preview ? (
                <ActionPreview
                  preview={result.action_preview}
                  busy={busy}
                  onConfirm={(message, p) => void runCommand(message, { pending: p || pending })}
                  onCancel={() => {
                    setResult(null);
                    setPending(null);
                  }}
                />
              ) : null}
              {result.reply ? (
                <div className="rounded-panel bg-ai-surface px-3 py-3 text-body leading-relaxed text-foreground whitespace-pre-wrap">
                  {result.reply}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-control px-2 py-1.5 text-meta text-muted-foreground hover:bg-muted"
                  onClick={() => {
                    setResult(null);
                    inputRef.current?.focus();
                  }}
                >
                  New command
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-control px-2 py-1.5 text-meta text-muted-foreground hover:bg-muted"
                  onClick={() => askMiya({ prompt: query || result.reply || "" })}
                >
                  <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                  Open Miya workspace
                </button>
              </div>
            </div>
          ) : (
            <div className="py-2">
              {recent.length > 0 ? (
                <SuggestionGroup title="Recent">
                  {recent.slice(0, 4).map((r) => (
                    <SuggestionRow
                      key={r}
                      label={r}
                      onClick={() => {
                        setQuery(r);
                        void runCommand(r);
                      }}
                    />
                  ))}
                </SuggestionGroup>
              ) : null}

              <SuggestionGroup title="Suggested">
                {suggested.map((s) => (
                  <SuggestionRow
                    key={s.id}
                    label={s.label}
                    onClick={() => {
                      setQuery(s.prompt);
                      void runCommand(s.prompt);
                    }}
                  />
                ))}
              </SuggestionGroup>

              {contextSuggestion ? (
                <SuggestionGroup title="Current context">
                  <SuggestionRow
                    label={contextSuggestion.label}
                    onClick={() => {
                      setQuery(contextSuggestion.prompt);
                      void runCommand(contextSuggestion.prompt);
                    }}
                  />
                </SuggestionGroup>
              ) : null}

              <SuggestionGroup title="Quick actions">
                <div className="flex flex-wrap gap-2 px-3 pb-2">
                  {quickActions.map((q) => {
                    const Icon =
                      q.id === "q-assign"
                        ? UserPlus
                        : q.id === "q-notify"
                          ? Bell
                          : q.id === "q-schedule"
                            ? CalendarClock
                            : ClipboardPlus;
                    return (
                      <button
                        key={q.id}
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-control border border-border px-2.5 py-1.5 text-meta font-medium text-foreground hover:border-primary/40 hover:bg-ai-surface"
                        onClick={() => {
                          setQuery(q.prompt);
                          setOpen(true);
                          inputRef.current?.focus();
                        }}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {q.label}
                      </button>
                    );
                  })}
                </div>
              </SuggestionGroup>

              {query.trim().length >= 2 ? (
                <div className="border-t border-border/80 px-3 py-2">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-control px-2 py-2 text-left text-body hover:bg-muted"
                    onClick={() => void runCommand(query)}
                  >
                    <ArrowRight className="h-4 w-4 text-primary" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">
                      Ask Miya: <span className="font-medium">{query.trim()}</span>
                    </span>
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function SuggestionGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-1.5 pb-1">
      <div className="px-2 py-1.5 text-caption text-muted-foreground">{title}</div>
      <ul>{children}</ul>
    </div>
  );
}

function SuggestionRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-control px-2 py-2 text-left text-body text-foreground hover:bg-muted"
        onClick={onClick}
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
        <span className="min-w-0 flex-1 truncate">{label}</span>
      </button>
    </li>
  );
}

export default MiyaCommandBar;
