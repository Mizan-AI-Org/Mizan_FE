import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgentAvatar } from "@/components/agent/AgentAvatar";
import { CommandCentreSkeleton } from "@/components/command/CommandCentreSkeleton";
import { CommandOperationsOverview } from "@/components/command/CommandOperationsOverview";
import { AttentionCard } from "@/components/os/AttentionCard";
import { CommandCollapsibleSection } from "@/components/os/CommandCollapsibleSection";
import { SeverityBadge, severityPanelClass } from "@/components/os/SeverityBadge";
import { useAgentPanel } from "@/context/AgentPanelContext";
import { useCommandCentre } from "@/hooks/use-command-centre";
import { useLanguage } from "@/hooks/use-language";
import {
  type CommandCluster,
  type CommandFilterKey,
  type CommandSignal,
  localizedCommandGreeting,
  localizedOpsHealth,
  severityToBadgeLevel,
  resolveCommandReviewRoute,
  signalsForFilter,
} from "@/lib/commandCentre";
import { cn } from "@/lib/utils";
import { getActionRoute } from "@/pages/dashboard/DashboardWidgets";

function categoryLabel(category: string | undefined, t: (k: string, o?: Record<string, string>) => string) {
  if (!category) return "";
  return t(`category.${category}`, { defaultValue: category.replace(/_/g, " ") });
}

function buildAskPrompt(signal: CommandSignal, t: (k: string, o?: Record<string, string>) => string) {
  const isWatching = signal.lane === "watching" || signal.kind === "agent_watch";
  if (signal.category === "incidents") {
    return t("ai.prompt.incident_named", { label: signal.title });
  }
  if (signal.category === "compliance") {
    return t("ai.prompt.compliance");
  }
  const parts = [t("ai.prompt.attention_named", { title: signal.title })];
  if (signal.category) {
    parts.push(t("command.ask_prompt.category", { category: signal.category }));
  }
  if (signal.detail) {
    parts.push(t("command.ask_prompt.context", { detail: signal.detail }));
  }
  if (signal.recommendation) {
    parts.push(t("command.ask_prompt.recommendation", { recommendation: signal.recommendation }));
  }
  if (signal.why && signal.why !== signal.recommendation) {
    parts.push(t("command.ask_prompt.why", { why: signal.why }));
  }
  parts.push(
    isWatching ? t("command.ask_prompt.watching_tail") : t("command.ask_prompt.action_tail"),
  );
  return parts.join(" ");
}

function AskAgentButton({
  signal,
  className,
  variant = "outline",
}: {
  signal: CommandSignal;
  className?: string;
  variant?: "outline" | "ghost";
}) {
  const { t } = useLanguage();
  const { askAgent } = useAgentPanel();
  const prompt = useMemo(() => buildAskPrompt(signal, t), [signal, t]);

  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      className={cn("justify-center gap-1.5", className)}
      onClick={() => askAgent(prompt)}
    >
      <AgentAvatar size="xs" className="h-5 w-5" />
      {t("nav.ask_agent")}
    </Button>
  );
}

function reviewLabelForSignal(signal: CommandSignal, t: (k: string, o?: Record<string, string>) => string) {
  if (signal.category === "incidents") {
    return t("attention.review_incidents", { defaultValue: "Review incidents" });
  }
  if (signal.category === "compliance") {
    return t("attention.review_compliance", { defaultValue: "Review compliance" });
  }
  if (signal.kind === "invoice" || signal.category === "finance") {
    return t("attention.review_payments", { defaultValue: "Review payments" });
  }
  if (signal.category === "tasks" || signal.category === "workload") {
    return t("attention.review_overdue", { defaultValue: "Review overdue work" });
  }
  if (signal.category === "attendance") {
    return t("attention.review_attendance", { defaultValue: "Review attendance" });
  }
  if (signal.recommendation?.toLowerCase().includes("inspection")) {
    return t("attention.plan_inspection", { defaultValue: "Plan inspection" });
  }
  if (signal.recommendation?.toLowerCase().includes("reminder")) {
    return t("attention.create_reminder", { defaultValue: "Create reminder" });
  }
  return t("os.attention.review");
}

function PrioritySignalCard({
  signal,
  onReview,
}: {
  signal: CommandSignal;
  onReview: () => void;
}) {
  const { t } = useLanguage();
  const level = severityToBadgeLevel(signal.severity);
  const cat = categoryLabel(signal.category, t);
  const detail = signal.detail || signal.why || "";

  return (
    <article className={cn("rounded-panel px-4 py-3.5 shadow-xs", severityPanelClass(level))}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge level={level} />
            {cat ? <span className="text-caption text-muted-foreground">{cat}</span> : null}
          </div>
          <h3 className="text-base font-semibold leading-snug">{signal.title}</h3>
          {detail ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">{detail}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <AskAgentButton signal={signal} variant="ghost" className="hidden sm:inline-flex" />
          <Button type="button" size="sm" className="gap-1" onClick={onReview}>
            {reviewLabelForSignal(signal, t)}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      </div>
    </article>
  );
}

function WatchingSignalCard({
  signal,
  onReview,
}: {
  signal: CommandSignal;
  onReview: () => void;
}) {
  const { t } = useLanguage();
  const isUrgent =
    signal.signal_type === "urgent_action" ||
    signal.severity === "critical" ||
    signal.severity === "high";
  const badgeLevel = isUrgent ? "URGENT_ACTION" : "RECOMMENDATION";
  const cat = categoryLabel(signal.category, t);
  const contextLine = signal.why || "";

  return (
    <article className="rounded-panel border border-border/80 bg-card px-4 py-3.5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge level={badgeLevel} />
            {cat ? (
              <span className="text-caption capitalize text-muted-foreground">{cat}</span>
            ) : null}
          </div>
          <h3 className="text-base font-semibold leading-snug">{signal.title}</h3>
          {contextLine ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">{contextLine}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" size="sm" variant="outline" className="gap-1" onClick={onReview}>
            {reviewLabelForSignal(signal, t)}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      </div>
    </article>
  );
}

function clusterSummaryLine(cluster: CommandCluster): string {
  const n = cluster.issue_count;
  const cat = (cluster.category || "").toLowerCase();
  if (cat.includes("task") || cat.includes("work")) return `${n} overdue tasks`;
  if (cat === "compliance") {
    const extra = n > 1 ? ` (+${n - 1} more)` : "";
    return `${n} documents need attention${extra}`;
  }
  if (cat === "incidents") return `${n} unresolved incidents`;
  return `${n} related items`;
}

function MetricTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "default" | "critical" | "warning";
}) {
  return (
    <div className="command-metric-tile rounded-xl border border-border/60 bg-card px-3 py-2.5 shadow-sm">
      <p className="text-caption text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-base font-semibold leading-snug text-foreground sm:text-lg",
          typeof value === "number" && "tabular-nums text-xl sm:text-2xl",
          tone === "critical" && "text-critical",
          tone === "warning" && "text-high-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

const FILTERS: CommandFilterKey[] = ["needs_me", "today", "all"];

export function CommandCentreView({ className }: { className?: string }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { askAgent } = useAgentPanel();
  const { data, isLoading, isError, refetch, isFetching } = useCommandCentre();
  const [filter, setFilter] = useState<CommandFilterKey>("needs_me");

  const filtered = useMemo(() => signalsForFilter(data, filter), [data, filter]);
  const decideNow = useMemo(
    () =>
      data && data.next_five.length > 0
        ? data.next_five
        : (data?.lanes.needs_me.slice(0, 5) ?? []),
    [data],
  );

  const greetingLine = useMemo(
    () => (data ? localizedCommandGreeting(data, t) : t("command.preparing")),
    [data, t],
  );

  const reviewSignal = (signal: CommandSignal) => {
    navigate(resolveCommandReviewRoute(signal));
  };

  const opsHealthLabel = localizedOpsHealth(data?.ops_health, t);

  const decideCount = data?.filter_counts.needs_me ?? 0;
  const briefing = data?.briefing;

  if (isLoading) {
    return <CommandCentreSkeleton className={className} />;
  }

  if (isError || !data?.success) {
    return (
      <div className={cn("mx-auto max-w-lg space-y-3 px-4 py-12 text-center", className)}>
        <h2 className="text-section-title">{t("command.load_error")}</h2>
        <p className="type-secondary">{t("command.load_error_detail")}</p>
        <Button type="button" onClick={() => void refetch()}>
          {t("common.retry", { defaultValue: "Retry" })}
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "command-centre-page min-w-0 space-y-5 px-4 py-5 md:px-6 lg:px-8 lg:py-6",
        className,
      )}
    >
      <header aria-label={t("attention.aria.header")} className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{greetingLine}</h1>
          <p className="text-sm text-muted-foreground">
            {briefing?.restaurantName ? (
              <span className="text-foreground/90">{briefing.restaurantName}</span>
            ) : null}
            {briefing?.restaurantName ? " · " : null}
            {decideCount > 0 ? (
              <>
                {t("command.subtitle_decisions", {
                  count: decideCount,
                  defaultValue: `${decideCount} need your decision`,
                })}
                {data.filter_counts.today > 0 ? (
                  <>
                    {" · "}
                    {t("command.subtitle_today_watch", {
                      today: data.filter_counts.today,
                      defaultValue: `${data.filter_counts.today} on today's watchlist`,
                    })}
                  </>
                ) : null}
              </>
            ) : (
              t("command.subtitle_clear_owner", {
                defaultValue: "No urgent decisions — see operations overview below.",
              })
            )}
            {data.ops_health === "strained" ? (
              <span className="ms-2 inline-flex items-center rounded-full bg-critical-muted px-2 py-0.5 text-caption font-medium text-critical">
                {opsHealthLabel}
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() => askAgent(t("attention.brief_prompt"))}
          >
            {t("attention.brief_me")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => void refetch()}
            disabled={isFetching}
            aria-label={t("command.refresh_aria")}
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} aria-hidden />
            {t("common.refresh", { defaultValue: "Refresh" })}
          </Button>
        </div>
      </header>

      <section
        aria-label={t("command.glance")}
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
      >
        <MetricTile
          label={t("command.tile.people_working")}
          value={data.metrics.people_working}
        />
        <MetricTile
          label={t("command.tile.active_work")}
          value={data.metrics.active_work}
        />
        <MetricTile
          label={t("command.tile.open_incidents")}
          value={data.metrics.open_incidents}
          tone={data.metrics.open_incidents > 0 ? "critical" : "default"}
        />
        <MetricTile
          label={t("command.tile.pending_approvals")}
          value={data.metrics.pending_approvals}
          tone={data.metrics.pending_approvals > 0 ? "warning" : "default"}
        />
        <MetricTile
          label={t("command.tile.ops_health")}
          value={opsHealthLabel}
          tone={data.ops_health === "strained" ? "critical" : "default"}
        />
      </section>

      <CommandOperationsOverview data={data} />

      <h2 className="text-sm font-semibold text-foreground">
        {t("command.priority_queue", { defaultValue: "Priority queue" })}
      </h2>

      {/* Filters */}
      <nav aria-label={t("attention.aria.filters")} className="flex flex-wrap gap-2">
        {FILTERS.map((key) => {
          const count = data.filter_counts[key];
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-caption font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/50",
              )}
            >
              {t(`attention.filter.${key}`)}
              {count > 0 ? ` ${count}` : ""}
            </button>
          );
        })}
      </nav>

      {filter !== "all" ? (
        <section className="space-y-3">
          {filtered.length === 0 ? (
            <p className="rounded-panel border border-dashed border-border px-4 py-8 text-center text-muted-foreground">
              {t(`attention.empty.${filter}`)}
            </p>
          ) : (
            filtered.map((signal) =>
              filter === "watching" ? (
                <WatchingSignalCard
                  key={signal.id}
                  signal={signal}
                  onReview={() => reviewSignal(signal)}
                />
              ) : (
                <PrioritySignalCard
                  key={signal.id}
                  signal={signal}
                  onReview={() => reviewSignal(signal)}
                />
              ),
            )
          )}
        </section>
      ) : (
        <>
          {/* Decide now */}
          <section className="space-y-3" aria-labelledby="command-decide-heading">
            {decideNow.length > 0 ? (
              decideNow.map((signal) => (
                <PrioritySignalCard
                  key={signal.id}
                  signal={signal}
                  onReview={() => reviewSignal(signal)}
                />
              ))
            ) : (
              <div className="flex items-center gap-3 rounded-panel border border-dashed border-border/80 bg-muted/20 px-4 py-6">
                <AgentAvatar size="sm" />
                <p className="text-body text-muted-foreground">{t("command.decide_clear")}</p>
              </div>
            )}
          </section>

          {/* Agent handling */}
          {data.lanes.handling.length > 0 ? (
            <CommandCollapsibleSection
              id="lane-handling"
              variant="agent"
              title={t("attention.lane.handling")}
              description={t("attention.lane.handling_desc")}
              count={data.lanes.handling.length}
              defaultOpen={false}
              preview={data.lanes.handling[0]?.title}
            >
              <div className="space-y-3">
                {data.lanes.handling.map((signal) => (
                  <AttentionCard
                    key={signal.id}
                    compact
                    item={{
                      id: signal.id,
                      severity: severityToBadgeLevel(signal.severity),
                      category: signal.category,
                      title: signal.title,
                      detail: signal.detail,
                      recommendation: signal.recommendation,
                    }}
                    onReview={() => reviewSignal(signal)}
                  />
                ))}
              </div>
            </CommandCollapsibleSection>
          ) : null}

          {/* Clusters */}
          {data.clusters.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">{t("attention.clusters.title")}</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {data.clusters.map((cluster) => (
                  <article
                    key={cluster.id}
                    className={cn(
                      "rounded-panel px-4 py-4 shadow-xs",
                      severityPanelClass(severityToBadgeLevel(cluster.severity)),
                    )}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1 space-y-2">
                        <SeverityBadge level={severityToBadgeLevel(cluster.severity)} />
                        <h3 className="text-section-title uppercase tracking-wide">
                          {cluster.title}
                        </h3>
                        <p className="text-caption text-muted-foreground">
                          {t("attention.cluster.meta", {
                            issues: cluster.issue_count,
                            entities: cluster.entity_count,
                          })}
                        </p>
                        <p className="text-body text-foreground">{clusterSummaryLine(cluster)}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="shrink-0 gap-1 self-start"
                        onClick={() => navigate(getActionRoute(cluster.action_url))}
                      >
                        {t("attention.cluster.review_named", {
                          title: cluster.title,
                          defaultValue: `Review ${cluster.title}`,
                        })}
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {data.lanes.watching.length > 0 ? (
            <CommandCollapsibleSection
              id="lane-watching"
              variant="agent"
              title={t("attention.lane.watching")}
              description={t("attention.lane.watching_desc")}
              count={data.lanes.watching.length}
              defaultOpen={false}
              preview={data.lanes.watching[0]?.title}
            >
              <div className="space-y-3">
                {data.lanes.watching.map((signal) => (
                  <WatchingSignalCard
                    key={signal.id}
                    signal={signal}
                    onReview={() => reviewSignal(signal)}
                  />
                ))}
              </div>
            </CommandCollapsibleSection>
          ) : null}
        </>
      )}
    </div>
  );
}

export default CommandCentreView;
