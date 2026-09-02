import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgentAvatar } from "@/components/agent/AgentAvatar";
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
  severityToBadgeLevel,
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
  if (signal.category) parts.push(`Category: ${signal.category}.`);
  if (signal.detail) parts.push(`Context: ${signal.detail}.`);
  if (signal.recommendation) parts.push(`Mizan recommendation: ${signal.recommendation}.`);
  if (signal.why && signal.why !== signal.recommendation) {
    parts.push(`Why it matters: ${signal.why}.`);
  }
  parts.push(
    isWatching
      ? "This is an Agent watching signal. Verify live Mizan data, explain what it means, then recommend one action you can take for me."
      : "Use Mizan tools to verify live data first, then give one specific next action you can take for me.",
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

function AgentRecommendation({
  text,
  compact,
}: {
  text: string;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  if (!text.trim()) return null;
  return (
    <div
      className={cn(
        "flex gap-2.5 rounded-control border border-ai-border bg-ai/60 px-3 py-2.5",
        compact && "py-2",
      )}
    >
      <AgentAvatar size="xs" className="mt-0.5 h-6 w-6" />
      <p className="text-body text-foreground/95">
        <span className="font-medium text-ai-foreground">{t("command.agent_suggests")} </span>
        {text}
      </p>
    </div>
  );
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
  const meta = cat
    ? `${cat} · ${t("attention.needs_decision", { defaultValue: "Needs your decision" })}`
    : t("attention.needs_decision", { defaultValue: "Needs your decision" });

  return (
    <article className={cn("rounded-panel px-4 py-4 shadow-xs", severityPanelClass(level))}>
      <div className="flex flex-wrap items-start justify-between gap-x-5 gap-y-4">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge level={level} />
            <span className="text-caption text-muted-foreground">{meta}</span>
          </div>
          <h3 className="text-section-title leading-snug">{signal.title}</h3>
          {signal.why ? <p className="text-body text-muted-foreground">{signal.why}</p> : null}
          <AgentRecommendation text={signal.recommendation || ""} />
        </div>
        <div className="flex w-full shrink-0 flex-col items-stretch gap-2 sm:w-auto sm:min-w-[10rem]">
          <Button type="button" size="sm" className="gap-1" onClick={onReview}>
            {reviewLabelForSignal(signal, t)}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Button>
          <AskAgentButton signal={signal} />
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
    <article className="rounded-panel border border-border/80 bg-card px-4 py-4 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-x-5 gap-y-4">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge level={badgeLevel} />
            {cat ? (
              <span className="text-caption capitalize text-muted-foreground">{cat}</span>
            ) : null}
            <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2 py-0.5 text-caption text-muted-foreground">
              {t("attention.no_decision_yet", { defaultValue: "No decision required yet" })}
            </span>
          </div>
          <h3 className="text-section-title leading-snug">{signal.title}</h3>
          {contextLine ? <p className="text-body text-muted-foreground">{contextLine}</p> : null}
          <AgentRecommendation text={signal.recommendation || ""} compact />
        </div>
        <div className="flex w-full shrink-0 flex-col items-stretch gap-2 sm:w-auto sm:min-w-[10rem]">
          <Button type="button" size="sm" className="gap-1" onClick={onReview}>
            {reviewLabelForSignal(signal, t)}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Button>
          <AskAgentButton signal={signal} />
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
  icon,
}: {
  label: string;
  value: string | number;
  tone?: "default" | "critical" | "warning";
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-panel border border-border/60 bg-card px-4 py-3.5 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <p className="text-caption text-muted-foreground">{label}</p>
        {icon}
      </div>
      <p
        className={cn(
          "mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-foreground",
          tone === "critical" && "text-critical",
          tone === "warning" && "text-high-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function SectionHeader({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      {icon ? <div className="mt-0.5 text-primary">{icon}</div> : null}
      <div>
        <h2 className="text-section-title">{title}</h2>
        <p className="text-body text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

const FILTERS: CommandFilterKey[] = [
  "all",
  "needs_me",
  "today",
  "handling",
  "waiting",
  "watching",
];

export function CommandCentreView({ className }: { className?: string }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { askAgent } = useAgentPanel();
  const { data, isLoading, isError, refetch, isFetching } = useCommandCentre();
  const [filter, setFilter] = useState<CommandFilterKey>("all");

  const filtered = useMemo(() => signalsForFilter(data, filter), [data, filter]);

  const reviewSignal = (signal: CommandSignal) => {
    const route = getActionRoute(signal.action_url);
    if (route) navigate(route);
  };

  const opsHealthLabel =
    data?.ops_health === "strained"
      ? t("severity.STRAINED", { defaultValue: "Strained" })
      : data?.ops_health === "healthy"
        ? t("severity.HEALTHY", { defaultValue: "Healthy" })
        : t("severity.STABLE", { defaultValue: "Stable" });

  if (isLoading) {
    return (
      <div className={cn("flex min-h-[40vh] items-center justify-center", className)}>
        <div className="flex items-center gap-3 text-muted-foreground">
          <AgentAvatar size="md" />
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          {t("command.preparing")}
        </div>
      </div>
    );
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

  const watchingCount = data.filter_counts.watching;
  const handlingCount = data.filter_counts.handling;
  const decideCount = data.filter_counts.needs_me;

  return (
    <div className={cn("min-w-0 space-y-6 px-4 py-6 md:px-6 lg:px-8 lg:py-8", className)}>
      {/* Miya co-pilot strip */}
      <section
        aria-label={t("command.agent_strip_aria")}
        className="flex flex-wrap items-center gap-4 rounded-panel border border-ai-border bg-gradient-to-br from-ai via-ai/40 to-card px-4 py-4 shadow-xs"
      >
        <AgentAvatar size="xl" ring />
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-body font-semibold text-foreground">{t("command.agent_strip_title")}</p>
          <p className="text-body text-muted-foreground">{t("command.agent_strip_desc")}</p>
          <div className="flex flex-wrap gap-2 pt-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-caption font-medium text-primary">
              <Eye className="h-3 w-3" aria-hidden />
              {t("command.agent_watching_count", { count: watchingCount })}
            </span>
            {handlingCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-0.5 text-caption font-medium text-muted-foreground ring-1 ring-border/80">
                {t("command.agent_handling_count", { count: handlingCount })}
              </span>
            ) : null}
            {decideCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-critical-muted px-2 py-0.5 text-caption font-medium text-critical">
                {t("command.agent_decide_count", { count: decideCount })}
              </span>
            ) : null}
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          className="gap-1.5 shrink-0"
          onClick={() => askAgent(t("attention.brief_prompt"))}
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          {t("attention.brief_me")}
        </Button>
      </section>

      {/* Header */}
      <header aria-label={t("attention.aria.header")} className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-caption font-semibold uppercase tracking-wider text-primary">
              {t("command.eyebrow")}
            </p>
            <h1 className="text-page-title">{data.greeting}</h1>
            <p className="text-body text-muted-foreground">
              {t("command.subtitle", { count: data.signals_total })}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 border-border bg-card"
            onClick={() => void refetch()}
            disabled={isFetching}
            aria-label={t("command.refresh_aria")}
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} aria-hidden />
            {t("common.refresh", { defaultValue: "Refresh" })}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {data.chips.now > 0 ? (
            <span className="inline-flex items-center rounded-full bg-critical px-2.5 py-0.5 text-caption font-semibold text-critical-foreground">
              {data.chips.now} {t("attention.chip.now")}
            </span>
          ) : null}
          {data.chips.today > 0 ? (
            <span className="inline-flex items-center rounded-full bg-high px-2.5 py-0.5 text-caption font-semibold text-high-foreground">
              {data.chips.today} {t("attention.chip.today")}
            </span>
          ) : null}
          {data.chips.handled > 0 ? (
            <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-caption font-semibold text-primary-foreground">
              {data.chips.handled} {t("attention.chip.handled")}
            </span>
          ) : null}
          {data.ops_health === "strained" ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-critical-border bg-critical-muted px-2.5 py-0.5 text-caption font-semibold text-critical">
              <span className="h-1.5 w-1.5 rounded-full bg-critical" aria-hidden />
              {opsHealthLabel}
            </span>
          ) : null}
        </div>
      </header>

      {/* Metrics */}
      <section aria-label={t("command.glance")} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricTile
          label={t("command.tile.people_working")}
          value={data.metrics.people_working}
          icon={<Users className="h-4 w-4 text-muted-foreground" aria-hidden />}
        />
        <MetricTile
          label={t("command.tile.active_work")}
          value={data.metrics.active_work}
          icon={<Activity className="h-4 w-4 text-muted-foreground" aria-hidden />}
        />
        <MetricTile
          label={t("command.tile.open_incidents")}
          value={data.metrics.open_incidents}
          tone={data.metrics.open_incidents > 0 ? "critical" : "default"}
          icon={
            data.metrics.open_incidents > 0 ? (
              <AlertTriangle className="h-4 w-4 text-critical" aria-hidden />
            ) : undefined
          }
        />
        <MetricTile
          label={t("command.tile.pending_approvals")}
          value={data.metrics.pending_approvals}
          tone={data.metrics.pending_approvals > 0 ? "warning" : "default"}
          icon={
            data.metrics.pending_approvals > 0 ? (
              <Target className="h-4 w-4 text-approval" aria-hidden />
            ) : (
              <Clock className="h-4 w-4 text-muted-foreground" aria-hidden />
            )
          }
        />
        <MetricTile
          label={t("command.tile.ops_health")}
          value={opsHealthLabel}
          tone={data.ops_health === "strained" ? "critical" : "default"}
          icon={
            data.ops_health === "strained" ? (
              <CheckCircle2 className="h-4 w-4 text-critical" aria-hidden />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
            )
          }
        />
      </section>

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
            <SectionHeader
              title={t("attention.next5.title")}
              description={t("attention.next5.desc")}
            />
            {data.next_five.length > 0 ? (
              data.next_five.map((signal) => (
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
              defaultOpen
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
              <SectionHeader
                title={t("attention.clusters.title")}
                description={t("attention.clusters.desc")}
              />
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

          {/* Agent watching — always visible */}
          <section className="space-y-3" aria-labelledby="command-watching-heading">
            <SectionHeader
              title={t("attention.lane.watching")}
              description={t("attention.lane.watching_desc")}
              icon={<AgentAvatar size="sm" className="h-7 w-7" />}
            />
            {data.lanes.watching.length > 0 ? (
              data.lanes.watching.map((signal) => (
                <WatchingSignalCard
                  key={signal.id}
                  signal={signal}
                  onReview={() => reviewSignal(signal)}
                />
              ))
            ) : (
              <div className="rounded-panel border border-ai-border/80 bg-ai/30 px-4 py-5">
                <div className="flex gap-3">
                  <AgentAvatar size="md" />
                  <div className="space-y-1">
                    <p className="text-body font-medium text-foreground">{t("command.watching_scan_title")}</p>
                    <p className="text-body text-muted-foreground">{t("command.watching_scan_desc")}</p>
                  </div>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default CommandCentreView;
