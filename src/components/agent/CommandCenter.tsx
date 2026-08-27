import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  CircleDot,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { AuthContextType } from "@/contexts/AuthContext.types";
import { useLanguage } from "@/hooks/use-language";
import { askAgent, focusEntityForAgent } from "@/lib/agentPageContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ProactiveInsights, type ProactiveInsight } from "@/components/agent/ProactiveInsights";
import { AgentActivityTimeline, type AgentActivityItem } from "@/components/agent/AgentActivityTimeline";
import { agentPrompts } from "@/components/agent/AskAgentButton";
import { AttentionPriorityCard } from "@/components/agent/AttentionPriorityCard";
import { AttentionClusterCard } from "@/components/agent/AttentionClusterCard";
import type {
  AttentionBoard,
  AttentionBoardItem,
  AttentionLane,
} from "@/components/agent/attentionBoardTypes";
import { CommandCenterSkeleton } from "@/components/agent/CommandCenterSkeleton";
import {
  EmptyOpsState,
  OpsStateBanner,
  SectionHeader,
  SeverityBadge,
  CommandCollapsibleSection,
} from "@/components/os";

type CommandCenterPayload = {
  generated_at?: string;
  period?: string;
  briefing?: {
    greeting?: string;
    summary?: string;
    body?: string;
    attention_count?: number;
    handled_count?: number;
    cta_label?: string;
  };
  attention?: AttentionBoardItem[];
  attention_board?: AttentionBoard;
  proactive_insights?: ProactiveInsight[];
  live_operations?: {
    people_working?: number;
    active_processes?: number;
    open_incidents?: number;
    unresolved_requests?: number;
    operational_health?: string;
  };
  agent_activity?: AgentActivityItem[];
  business_signals?: Array<{
    id: string;
    category: string;
    title: string;
    detail?: string;
    severity?: string;
  }>;
};

type FilterId = AttentionLane | "all";

const COMMAND_CENTER_ROLES = new Set(["ADMIN", "SUPER_ADMIN", "MANAGER", "OWNER"]);

function healthClass(health: string | undefined) {
  const h = (health || "healthy").toLowerCase();
  if (h === "strained") return "text-critical";
  if (h === "watch") return "text-high";
  return "text-primary";
}

function healthPill(health: string | undefined) {
  const h = (health || "healthy").toLowerCase();
  if (h === "strained") {
    return { wrap: "border-critical-border bg-critical-muted text-critical", dot: "bg-critical" };
  }
  if (h === "watch") {
    return { wrap: "border-high-border bg-high-muted text-high-foreground", dot: "bg-high" };
  }
  return { wrap: "border-primary/25 bg-primary/10 text-primary", dot: "bg-primary" };
}

type TileTone = "neutral" | "primary" | "critical" | "approval";

const TILE_TONE: Record<TileTone, { wrap: string; value: string }> = {
  neutral: { wrap: "bg-muted text-muted-foreground", value: "text-foreground" },
  primary: { wrap: "bg-primary/10 text-primary", value: "text-foreground" },
  critical: { wrap: "bg-critical-muted text-critical", value: "text-critical" },
  approval: { wrap: "bg-approval-muted text-approval", value: "text-foreground" },
};

function fallbackBoard(attention: AttentionBoardItem[], insights: ProactiveInsight[]): AttentionBoard {
  const needs = attention.filter((a) => {
    const sev = String(a.severity || "").toUpperCase();
    return sev === "CRITICAL" || a.category === "pending_approvals" || a.category === "payment_issues";
  });
  const waiting = attention.filter((a) => a.category === "blocked_tasks");
  const today = attention.filter((a) => !needs.includes(a) && !waiting.includes(a));
  const watchTitles = new Set(attention.map((a) => (a.title || "").toLowerCase().slice(0, 48)));
  const watching = insights
    .filter((i) => !watchTitles.has((i.what || "").toLowerCase().slice(0, 48)))
    .slice(0, 6)
    .map((i) => {
      const askFromAction =
        (i.actions || []).find((a) => a.ask_agent_prompt)?.ask_agent_prompt ||
        (i.actions || []).find((a) => a.kind === "ask_agent")?.ask_agent_prompt;
      return {
        id: `watch:${i.id || i.what}`,
        category: String(i.domain || "ops"),
        severity: String(i.level || "WATCH"),
        title: i.what || "",
        why_it_matters: i.why,
        lane: "watching" as const,
        entity_type: i.entity_type,
        entity_ids: i.entity_ids,
        recommended_action: { label: i.recommendation || "Review", href: "/dashboard" },
        ask_agent_prompt: askFromAction || undefined,
      };
    });
  return {
    summary: {
      signals_detected: attention.length + watching.length,
      needs_me: needs.length,
      today: today.length,
      handling: 0,
      waiting: waiting.length,
      watching: watching.length,
      clear: needs.length === 0,
    },
    next_actions: needs.slice(0, 3),
    needs_me: needs.slice(0, 10),
    today: today.slice(0, 10),
    handling: [],
    waiting: waiting.slice(0, 8),
    watching,
    clusters: [],
    scale: attention.length <= 3 ? "few" : attention.length <= 10 ? "moderate" : "busy",
  };
}

export function CommandCenter({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, accessToken } = useAuth() as AuthContextType;
  const [filter, setFilter] = useState<FilterId>("all");

  const canLoadBriefing = Boolean(
    accessToken && user?.role && COMMAND_CENTER_ROLES.has(user.role),
  );

  const query = useQuery({
    queryKey: ["agent", "command-center"],
    queryFn: () => api.getAgentCommandCenter() as Promise<CommandCenterPayload>,
    enabled: canLoadBriefing,
    refetchInterval: 60_000,
    staleTime: 20_000,
    retry: 2,
  });

  const data = query.data;
  const attention = useMemo(() => data?.attention || [], [data?.attention]);
  const insights = useMemo(() => data?.proactive_insights || [], [data?.proactive_insights]);
  const activity = data?.agent_activity || [];
  const signals = data?.business_signals || [];
  const live = data?.live_operations || {};
  const briefing = data?.briefing || {};

  const board = useMemo(
    () => data?.attention_board || fallbackBoard(attention, insights),
    [data?.attention_board, attention, insights],
  );
  const summary = board.summary;
  const scale = board.scale || "few";
  const showClusters = scale === "moderate" || scale === "busy" || scale === "heavy" || scale === "extreme";
  const showBucketsExpanded = scale === "few" || scale === "moderate" || filter !== "all";
  const showGlance = scale !== "extreme";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const scrollIfNeeded = () => {
      const id = window.location.hash.replace(/^#/, "");
      if (!id) return;
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    const timer = window.setTimeout(scrollIfNeeded, 120);
    window.addEventListener("hashchange", scrollIfNeeded);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("hashchange", scrollIfNeeded);
    };
  }, [query.dataUpdatedAt]);

  const openItem = (item: AttentionBoardItem) => {
    const entityId = item.entity_id || item.entity_ids?.[0];
    if (item.entity_type && entityId) {
      focusEntityForAgent({
        entity_type: item.entity_type,
        entity_id: String(entityId),
        entity_label: item.title,
        route: item.recommended_action?.href,
        tab: item.category === "open_incidents" ? "incidents" : undefined,
      });
    }
    const href = item.recommended_action?.href;
    if (href) navigate(href);
  };

  const askAbout = (item: AttentionBoardItem) => {
    const raw = item.ask_agent_prompt || "";
    const prompt =
      raw && !/^help me with this:/i.test(raw)
        ? raw
        : agentPrompts.attention(item.title, t);
    askAgent({
      prompt,
      pageContext: {
        entity_type: item.entity_type,
        entity_id: item.entity_id || item.entity_ids?.[0] || undefined,
        entity_label: item.title,
        route: item.recommended_action?.href,
      },
    });
  };

  const briefMe = () => {
    askAgent({
      prompt: t("attention.brief_prompt"),
      pageContext: { route: "/dashboard" },
    });
  };

  const glance: Array<{
    label: string;
    value: string | number;
    icon: typeof Users;
    href: string;
    tone: TileTone;
    valueClass?: string;
  }> = [
    {
      label: t("command.tile.people_working"),
      value: live.people_working ?? 0,
      icon: Users,
      href: "/dashboard/staff-app",
      tone: (live.people_working ?? 0) > 0 ? "primary" : "neutral",
    },
    {
      label: t("command.tile.active_work"),
      value: live.active_processes ?? 0,
      icon: Activity,
      href: "/dashboard/work",
      tone: (live.active_processes ?? 0) > 0 ? "primary" : "neutral",
    },
    {
      label: t("command.tile.open_incidents"),
      value: live.open_incidents ?? 0,
      icon: AlertTriangle,
      href: "/dashboard/analytics?tab=incidents",
      tone: (live.open_incidents ?? 0) > 0 ? "critical" : "neutral",
    },
    {
      label: t("command.tile.pending_approvals"),
      value: live.unresolved_requests ?? 0,
      icon: CircleDot,
      href: "/dashboard/staff-requests?list=finance",
      tone: (live.unresolved_requests ?? 0) > 0 ? "approval" : "neutral",
    },
    {
      label: t("command.tile.ops_health"),
      value: t(`health.${(live.operational_health || "healthy").toLowerCase()}`),
      icon: CheckCircle2,
      href: "#attention",
      tone: "neutral",
      valueClass: cn("text-[1.25rem]", healthClass(live.operational_health)),
    },
  ];

  const health = healthPill(live.operational_health);
  const latestActivity = activity[0];
  const latestActivityPreview =
    latestActivity?.action || latestActivity?.summary || undefined;
  const showClearEmptyState =
    summary.clear &&
    filter === "all" &&
    board.handling.length === 0 &&
    board.watching.length === 0;

  const filters: Array<{ id: FilterId; label: string; count: number }> = [
    { id: "all", label: t("attention.filter.all"), count: summary.signals_detected },
    { id: "needs_me", label: t("attention.filter.needs_me"), count: summary.needs_me },
    { id: "today", label: t("attention.filter.today"), count: summary.today },
    { id: "handling", label: t("attention.filter.handling"), count: summary.handling },
    { id: "waiting", label: t("attention.filter.waiting"), count: summary.waiting },
    { id: "watching", label: t("attention.filter.watching"), count: summary.watching },
  ];

  const renderItemList = (items: AttentionBoardItem[], opts?: { quiet?: boolean; cap?: number }) => {
    const capped = items.slice(0, opts?.cap ?? items.length);
    if (capped.length === 0) return null;
    return (
      <ul className="space-y-2">
        {capped.map((item) => (
          <li key={item.id}>
            <AttentionPriorityCard
              item={item}
              quiet={opts?.quiet}
              onReview={() => openItem(item)}
              onAskAgent={() => askAbout(item)}
            />
          </li>
        ))}
      </ul>
    );
  };

  if (query.isLoading && !data) {
    return <CommandCenterSkeleton message={t("command.preparing")} className={className} />;
  }

  if (query.isError) {
    return (
      <OpsStateBanner
        variant="error"
        title={t("command.load_error")}
        description={t("command.load_error_detail")}
        actionLabel={t("common.retry")}
        onAction={() => void query.refetch()}
        className={className}
      />
    );
  }

  return (
    <div className={cn("space-y-section", className)}>
      {/* Header + operational summary */}
      <section
        aria-label={t("attention.aria.header")}
        className="relative overflow-hidden rounded-panel border border-border/70 bg-card px-5 py-5 shadow-xs sm:px-6 sm:py-6"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-28 -top-32 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-caption-label">{t("command.eyebrow")}</p>
            <h1 className="mt-1.5 text-display">{briefing.greeting || t("command.hello")}</h1>

            {summary.clear ? (
              <div className="mt-4 max-w-xl space-y-1">
                <p className="flex items-center gap-2 text-section-title text-primary">
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                  {t("attention.clear.title")}
                </p>
                <p className="text-body text-muted-foreground">{t("attention.clear.desc")}</p>
                {summary.signals_detected > 0 ? (
                  <p className="text-body text-muted-foreground">
                    {t("attention.clear.monitoring", { count: summary.signals_detected })}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <p className="text-body text-muted-foreground">
                  {t("attention.signals_detected", { count: summary.signals_detected })}
                </p>
                <div className="flex flex-wrap gap-2">
                  <SummaryChip tone="critical" label={t("attention.chip.now")} count={summary.needs_me} />
                  <SummaryChip tone="high" label={t("attention.chip.today")} count={summary.today} />
                  <SummaryChip tone="primary" label={t("attention.chip.handled")} count={summary.handling} />
                  <SummaryChip tone="muted" label={t("attention.chip.waiting")} count={summary.waiting} />
                </div>
              </div>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="ai" className="gap-1.5" onClick={briefMe}>
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {t("attention.brief_me")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
              aria-label={t("command.refresh_aria")}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", query.isFetching && "animate-spin")} />
              {t("common.refresh")}
            </Button>
          </div>
        </div>

        {!summary.clear ? (
          <div className="relative mt-4 flex items-center gap-2">
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1",
                "text-caption font-medium capitalize",
                health.wrap,
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", health.dot)} aria-hidden />
              {t(`health.${(live.operational_health || "healthy").toLowerCase()}`)}
            </span>
          </div>
        ) : null}
      </section>

      {/* Glance KPIs — operational snapshot up front */}
      {filter === "all" && showGlance ? (
        <section aria-label={t("command.glance")} className="os-section">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            {glance.map((row) => {
              const Icon = row.icon;
              const tone = TILE_TONE[row.tone];
              return (
                <button
                  key={row.label}
                  type="button"
                  onClick={() => {
                    if (row.href.startsWith("#")) {
                      document.getElementById(row.href.slice(1))?.scrollIntoView({ behavior: "smooth" });
                    } else {
                      navigate(row.href);
                    }
                  }}
                  className={cn(
                    "group rounded-panel border border-border/70 bg-card p-3 text-left",
                    "transition-all duration-os hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-soft",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                        tone.wrap,
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <ArrowUpRight
                      className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity duration-os group-hover:opacity-100"
                      aria-hidden
                    />
                  </div>
                  <p
                    className={cn(
                      "mt-2.5 text-[1.375rem] font-semibold capitalize leading-none tabular-nums",
                      tone.value,
                      row.valueClass,
                    )}
                  >
                    {row.value}
                  </p>
                  <p className="mt-1 text-caption text-muted-foreground">{row.label}</p>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Compact filter bar */}
      <nav
        aria-label={t("attention.aria.filters")}
        className="flex flex-wrap gap-1.5 rounded-panel border border-border/60 bg-card/80 p-2 shadow-xs"
      >
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-caption font-medium transition-colors",
              filter === f.id
                ? "border-primary/50 bg-primary text-primary-foreground shadow-xs"
                : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {f.label}
            <span className="tabular-nums opacity-70">{f.count}</span>
          </button>
        ))}
      </nav>

      {/* Agent is handling — collapsed by default; expands when filter is active */}
      {(filter === "all" || filter === "handling") && board.handling.length > 0 ? (
        <CommandCollapsibleSection
          key={filter === "handling" ? "handling-open" : "handling-collapsed"}
          id="agent-handling"
          title={t("attention.lane.handling")}
          description={t("attention.lane.handling_desc")}
          count={board.handling.length}
          defaultOpen={filter === "handling"}
          preview={board.handling[0]?.title}
        >
          {renderItemList(board.handling, { quiet: true, cap: 8 })}
        </CommandCollapsibleSection>
      ) : null}

      {filter === "handling" && board.handling.length === 0 ? (
        <EmptyOpsState title={t("attention.empty.handling")} />
      ) : null}

      {/* Your next 5 minutes */}
      {(filter === "all" || filter === "needs_me") && board.next_actions.length > 0 ? (
        <section id="attention" aria-label={t("attention.next5.title")} className="scroll-mt-24 os-section">
          <SectionHeader
            title={t("attention.next5.title")}
            description={t("attention.next5.desc")}
          />
          {renderItemList(board.next_actions, { cap: 3 })}
        </section>
      ) : null}

      {/* Clear state when nothing needs the manager and no background work to show */}
      {showClearEmptyState ? (
        <section aria-label={t("attention.clear.title")} className="os-section">
          <EmptyOpsState
            title={t("attention.clear.title")}
            description={t("attention.clear.empty_desc")}
            action={
              <Button
                type="button"
                size="sm"
                variant="ai"
                onClick={() =>
                  askAgent({
                    prompt: t("attention.clear.ask"),
                    pageContext: { route: "/dashboard" },
                  })
                }
              >
                {t("attention.clear.ask")}
              </Button>
            }
          />
        </section>
      ) : null}

      {/* Operational clusters for scale */}
      {(filter === "all" || filter === "needs_me" || filter === "today") &&
      showClusters &&
      board.clusters.length > 0 ? (
        <section aria-label={t("attention.clusters.title")} className="os-section">
          <SectionHeader
            title={t("attention.clusters.title")}
            description={t("attention.clusters.desc")}
          />
          <ul className="grid gap-2 sm:grid-cols-2">
            {board.clusters.map((cluster) => (
              <li key={cluster.id}>
                <AttentionClusterCard
                  cluster={cluster}
                  onReview={() => {
                    if (cluster.href) navigate(cluster.href);
                  }}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Needs me (beyond next 5) */}
      {(filter === "all" || filter === "needs_me") &&
      showBucketsExpanded &&
      board.needs_me.length > board.next_actions.length ? (
        <section aria-label={t("attention.lane.needs_me")} className="os-section">
          <SectionHeader
            title={t("attention.lane.needs_me")}
            description={t("attention.lane.needs_me_desc")}
          />
          {renderItemList(board.needs_me.slice(board.next_actions.length), {
            cap: scale === "busy" || scale === "heavy" || scale === "extreme" ? 3 : 8,
          })}
        </section>
      ) : null}

      {filter === "needs_me" && board.needs_me.length === 0 ? (
        <EmptyOpsState title={t("attention.empty.needs_me")} description={t("attention.clear.desc")} />
      ) : null}

      {/* Today */}
      {(filter === "all" || filter === "today") &&
      showBucketsExpanded &&
      board.today.length > 0 &&
      scale !== "extreme" ? (
        <section aria-label={t("attention.lane.today")} className="os-section">
          <SectionHeader
            title={t("attention.lane.today")}
            description={t("attention.lane.today_desc")}
          />
          {renderItemList(board.today, {
            cap: scale === "busy" || scale === "heavy" ? 4 : 8,
          })}
        </section>
      ) : null}

      {filter === "today" && board.today.length === 0 ? (
        <EmptyOpsState title={t("attention.empty.today")} />
      ) : null}

      {/* Waiting */}
      {(filter === "all" || filter === "waiting") && board.waiting.length > 0 ? (
        <section aria-label={t("attention.lane.waiting")} className="os-section">
          <SectionHeader
            title={t("attention.lane.waiting")}
            description={
              board.waiting_breakdown
                ? t("attention.waiting.breakdown", {
                    staff: board.waiting_breakdown.staff ?? 0,
                    suppliers: board.waiting_breakdown.suppliers ?? 0,
                    hr: board.waiting_breakdown.hr ?? 0,
                  })
                : t("attention.lane.waiting_desc")
            }
          />
          {renderItemList(board.waiting, { quiet: true, cap: 8 })}
        </section>
      ) : null}

      {filter === "waiting" && board.waiting.length === 0 ? (
        <EmptyOpsState title={t("attention.empty.waiting")} />
      ) : null}

      {/* Watching */}
      {(filter === "all" || filter === "watching") && board.watching.length > 0 && scale !== "extreme" ? (
        <section aria-label={t("attention.lane.watching")} className="os-section">
          <SectionHeader
            title={t("attention.lane.watching")}
            description={t("attention.lane.watching_desc")}
          />
          {renderItemList(board.watching, { quiet: true, cap: 6 })}
        </section>
      ) : null}

      {filter === "watching" && board.watching.length === 0 ? (
        <EmptyOpsState title={t("attention.empty.watching")} />
      ) : null}

      {/* Verified Agent activity (audit) — always collapsed */}
      {filter === "all" && activity.length > 0 && scale !== "extreme" ? (
        <CommandCollapsibleSection
          id="agent-activity"
          title={t("activity.title")}
          description={
            briefing.handled_count != null
              ? t("command.handled_count", { count: briefing.handled_count })
              : t("command.handled_default")
          }
          count={activity.length}
          defaultOpen={false}
          preview={latestActivityPreview}
        >
          <AgentActivityTimeline
            items={activity}
            compact
            embedded
            queryKey={["agent", "command-center"]}
          />
        </CommandCollapsibleSection>
      ) : null}

      {filter === "all" && signals.length > 0 && (scale === "few" || scale === "moderate") ? (
        <section aria-label={t("command.business_signals")} className="os-section">
          <SectionHeader title={t("command.business_signals")} />
          <ul className="divide-y divide-border/70">
            {signals.map((sig) => (
              <li key={sig.id} className="flex items-start gap-3 py-3">
                <SeverityBadge level={sig.severity} />
                <div className="min-w-0">
                  <p className="text-card-title">{sig.title}</p>
                  {sig.detail ? <p className="mt-0.5 type-secondary">{sig.detail}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Keep proactive insights available when board watching is empty but insights exist */}
      {filter === "all" && board.watching.length === 0 && insights.length > 0 && scale === "few" ? (
        <section aria-label={t("command.watch")} className="os-section">
          <SectionHeader title={t("command.watch")} description={t("command.watch_desc")} />
          <ProactiveInsights insights={insights.slice(0, 2)} compact queryKey={["agent", "command-center"]} />
        </section>
      ) : null}
    </div>
  );
}

function SummaryChip({
  tone,
  label,
  count,
}: {
  tone: "critical" | "high" | "primary" | "muted";
  label: string;
  count: number;
}) {
  const toneClass =
    tone === "critical"
      ? "border-critical-border bg-critical-muted text-critical"
      : tone === "high"
        ? "border-high-border bg-high-muted text-high-foreground"
        : tone === "primary"
          ? "border-primary/25 bg-primary/10 text-primary"
          : "border-border bg-muted text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-caption font-medium",
        toneClass,
      )}
    >
      <span className="tabular-nums font-semibold">{count}</span>
      {label}
    </span>
  );
}

export default CommandCenter;
