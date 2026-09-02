import React, { useCallback, useEffect, useRef, useState } from "react";
import { Calendar, FileText, Plus, Search, Sparkles } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useAgentPanel } from "@/context/AgentPanelContext";
import { cn } from "@/lib/utils";

const RECENT_KEY = "mizan.command.recent";
const MAX_RECENT = 4;

function loadRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string").slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function saveRecent(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return;
  const next = [trimmed, ...loadRecent().filter((q) => q !== trimmed)].slice(0, MAX_RECENT);
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

/** Global command bar — opens Agent with query; palette on focus (⌘K). */
export function CommandSearchBar({ className }: { className?: string }) {
  const { t } = useLanguage();
  const { askAgent } = useAgentPanel();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>(() => loadRecent());

  const suggested = [
    t("ai.suggest.attention"),
    t("ai.prompt.focus_today", { defaultValue: "What should I focus on today?" }),
    t("command.palette.suggest_incidents", { defaultValue: "Show unresolved incidents" }),
    t("command.palette.suggest_briefing", { defaultValue: "Prepare today's briefing" }),
  ];

  const quickActions = [
    {
      id: "assign",
      label: t("command.palette.assign", { defaultValue: "Assign" }),
      icon: Plus,
      prompt: t("command.palette.assign_prompt", { defaultValue: "Help me assign a task to the right person." }),
    },
    {
      id: "notify",
      label: t("command.palette.notify", { defaultValue: "Notify" }),
      icon: Sparkles,
      prompt: t("command.palette.notify_prompt", { defaultValue: "Send a notification to staff who need an update." }),
    },
    {
      id: "schedule",
      label: t("command.palette.schedule", { defaultValue: "Schedule" }),
      icon: Calendar,
      prompt: t("command.palette.schedule_prompt", { defaultValue: "Help me schedule or adjust a shift." }),
    },
    {
      id: "task",
      label: t("command.palette.create_task", { defaultValue: "Create task" }),
      icon: FileText,
      prompt: t("command.palette.create_task_prompt", { defaultValue: "Create a new operational task for the team." }),
    },
  ];

  const submit = useCallback(
    (value: string) => {
      const q = value.trim();
      if (!q) return;
      saveRecent(q);
      setRecent(loadRecent());
      setOpen(false);
      if (inputRef.current) inputRef.current.value = "";
      askAgent(q);
    },
    [askAgent],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <div ref={rootRef} className={cn("relative hidden max-w-xl flex-1 lg:block", className)}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(inputRef.current?.value || "");
        }}
      >
        <Search
          className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          ref={inputRef}
          type="search"
          name="agent-query"
          placeholder={t("ai.chat_placeholder")}
          className={cn(
            "h-10 w-full rounded-full border border-border/80 bg-muted/40 ps-9 pe-16 text-sm",
            "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            open && "ring-2 ring-ring",
          )}
          aria-label={t("ai.chat_placeholder")}
          aria-expanded={open}
          aria-haspopup="listbox"
          onFocus={() => setOpen(true)}
        />
        <kbd className="pointer-events-none absolute end-3 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-card px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
          ⌘ K
        </kbd>
      </form>

      {open ? (
        <div
          role="listbox"
          className="absolute start-0 end-0 top-[calc(100%+0.5rem)] z-[3000] overflow-hidden rounded-panel border border-border/80 bg-card shadow-strong"
        >
          {recent.length > 0 ? (
            <div className="border-b border-border/60 px-3 py-2">
              <p className="px-1 pb-1.5 text-caption font-medium uppercase tracking-wide text-muted-foreground">
                {t("command.palette.recent", { defaultValue: "Recent" })}
              </p>
              <ul className="space-y-0.5">
                {recent.map((q) => (
                  <li key={q}>
                    <button
                      type="button"
                      className="w-full rounded-control px-2 py-1.5 text-start text-sm hover:bg-muted/60"
                      onClick={() => submit(q)}
                    >
                      {q}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="border-b border-border/60 px-3 py-2">
            <p className="px-1 pb-1.5 text-caption font-medium uppercase tracking-wide text-muted-foreground">
              {t("command.palette.suggested", { defaultValue: "Suggested" })}
            </p>
            <ul className="space-y-0.5">
              {suggested.map((q) => (
                <li key={q}>
                  <button
                    type="button"
                    className="w-full rounded-control px-2 py-1.5 text-start text-sm hover:bg-muted/60"
                    onClick={() => submit(q)}
                  >
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="px-3 py-2.5">
            <p className="px-1 pb-2 text-caption font-medium uppercase tracking-wide text-muted-foreground">
              {t("command.palette.quick_actions", { defaultValue: "Quick actions" })}
            </p>
            <div className="flex flex-wrap gap-2">
              {quickActions.map(({ id, label, icon: Icon, prompt }) => (
                <button
                  key={id}
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-3 py-1.5 text-caption font-medium hover:bg-muted/60"
                  onClick={() => submit(prompt)}
                >
                  <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default CommandSearchBar;
