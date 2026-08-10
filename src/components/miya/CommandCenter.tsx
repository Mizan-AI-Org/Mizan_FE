import React, { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  CircleDot,
  RefreshCw,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { useLanguage } from "@/hooks/use-language";
import { askMiya, focusEntityForMiya } from "@/lib/miyaPageContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ProactiveInsights, type ProactiveInsight } from "@/components/miya/ProactiveInsights";
import { MiyaActivityTimeline, type MiyaActivityItem } from "@/components/miya/MiyaActivityTimeline";
import { miyaPrompts } from "@/components/miya/AskMiyaButton";
import {
  AttentionCard,
  EmptyOpsState,
  MiyaLoadingState,
  OpsStateBanner,
  SectionHeader,
  SeverityBadge,
} from "@/components/os";

type AttentionItem = {
  id: string;
  category: string;
  severity: string;
  title: string;
  detail?: string;
  why_it_matters?: string;
  count?: number;
  entity_type?: string;
  entity_id?: string | null;
  entity_ids?: string[];
  owner?: string | null;
  recommended_action?: {
    label?: string;
    href?: string;
    tool_hint?: string;
    handle_hint?: string;
  };
  ask_miya_prompt?: string;
};

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
  attention?: AttentionItem[];
  proactive_insights?: ProactiveInsight[];
  live_operations?: {
    people_working?: number;
    active_processes?: number;
    open_incidents?: number;
    unresolved_requests?: number;
    operational_health?: string;
  };
  miya_activity?: MiyaActivityItem[];
  business_signals?: Array<{
    id: string;
    category: string;
    title: string;
    detail?: string;
    severity?: string;
  }>;
};

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

export function CommandCenter({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const query = useQuery({
    queryKey: ["miya", "command-center"],
    queryFn: () => api.getMiyaCommandCenter() as Promise<CommandCenterPayload>,
    refetchInterval: 60_000,
    staleTime: 20_000,
  });

  const data = query.data;
  const attention = useMemo(() => data?.attention || [], [data?.attention]);
  const insights = useMemo(() => data?.proactive_insights || [], [data?.proactive_insights]);
  const activity = data?.miya_activity || [];
  const signals = data?.business_signals || [];
  const live = data?.live_operations || {};
  const briefing = data?.briefing || {};

  useEffect(() => {
    if (typeof window === "undefined") return;
    const scrollIfNeeded = () => {
      const id = window.location.hash.replace(/^#/, "");
      if (!id) return;
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    const t = window.setTimeout(scrollIfNeeded, 120);
    window.addEventListener("hashchange", scrollIfNeeded);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("hashchange", scrollIfNeeded);
    };
  }, [query.dataUpdatedAt]);

  const statusLine = useMemo(() => {
    if (attention.length > 0) {
      return attention.length === 1
        ? t("command.status_need_you", { count: attention.length })
        : t("command.status_need_you_plural", { count: attention.length });
    }
    const health = (live.operational_health || "healthy").replace(/_/g, " ");
    if (health.toLowerCase() === "healthy") return t("command.status_stable");
    return t("command.status_health", { health });
  }, [attention.length, live.operational_health, t]);

  /** Deduplicate insights that already appear as attention items. */
  const watchInsights = useMemo(() => {
    const titles = new Set(attention.map((a) => (a.title || "").toLowerCase().slice(0, 48)));
    return insights.filter((i) => !titles.has((i.what || "").toLowerCase().slice(0, 48))).slice(0, 2);
  }, [attention, insights]);

  const openAttentionItem = (item: AttentionItem) => {
    const entityId = item.entity_id || item.entity_ids?.[0];
    if (item.entity_type && entityId) {
      focusEntityForMiya({
        entity_type: item.entity_type,
        entity_id: String(entityId),
        entity_label: item.title,
        route: item.recommended_action?.href,
        tab: item.category === "open_incidents" ? "incidents" : undefined,
      });
    }
    const href = item.recommended_action?.href;
    if (href) navigate(href);
    else navigate("/dashboard/attention");
  };

  const askAbout = (item: AttentionItem) => {
    askMiya({
      prompt: item.ask_miya_prompt || miyaPrompts.attention(item.title, t),
      pageContext: {
        entity_type: item.entity_type,
        entity_id: item.entity_id || item.entity_ids?.[0] || undefined,
        entity_label: item.title,
        route: item.recommended_action?.href,
      },
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
      href: "/dashboard/staff-requests?lane=finance",
      tone: (live.unresolved_requests ?? 0) > 0 ? "approval" : "neutral",
    },
    {
      label: t("command.tile.ops_health"),
      value: (live.operational_health || "healthy").replace(/_/g, " "),
      icon: CheckCircle2,
      href: "/dashboard/attention",
      tone: "neutral",
      valueClass: cn("text-[1.25rem]", healthClass(live.operational_health)),
    },
  ];

  const health = healthPill(live.operational_health);

  if (query.isLoading && !data) {
    return <MiyaLoadingState message={t("command.preparing")} className={className} />;
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
      <section
        aria-label="Operational status"
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
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1",
                  "text-caption font-medium capitalize",
                  health.wrap,
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", health.dot)} aria-hidden />
                {(live.operational_health || "healthy").replace(/_/g, " ")}
              </span>
              <p className="max-w-2xl text-body text-muted-foreground">{statusLine}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 gap-1.5 self-start"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
            aria-label={t("command.refresh_aria")}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", query.isFetching && "animate-spin")} />
            {t("common.refresh")}
          </Button>
        </div>
      </section>

      <section
        id="attention"
        aria-label={t("command.needs_you")}
        className="scroll-mt-24 os-section"
      >
        <SectionHeader
          title={t("command.needs_you")}
          description={t("command.needs_you_desc")}
          action={
            <Button type="button" size="sm" variant="ghost" onClick={() => navigate("/dashboard/attention")}>
              {t("command.all_attention")}
              <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
            </Button>
          }
        />

        {attention.length === 0 ? (
          <EmptyOpsState
            title={t("command.empty_title")}
            description={t("command.empty_desc")}
            askPrompt={t("command.empty_ask")}
          />
        ) : (
          <ul className="space-y-3">
            {attention.slice(0, 5).map((item) => (
              <li key={item.id}>
                <AttentionCard
                  item={{
                    id: item.id,
                    severity: item.severity,
                    category: item.category,
                    title: item.title,
                    detail: item.detail,
                    why: item.why_it_matters,
                    recommendation: item.recommended_action?.label
                      ? item.recommended_action.label
                      : undefined,
                    owner: item.owner,
                    reviewLabel: item.recommended_action?.label || "Review",
                    askPrompt: item.ask_miya_prompt,
                  }}
                  onReview={() => openAttentionItem(item)}
                  onAskMiya={() => askAbout(item)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label={t("command.glance")} className="os-section">
        <SectionHeader title={t("command.glance")} description={t("command.glance_desc")} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {glance.map((row) => {
            const Icon = row.icon;
            const tone = TILE_TONE[row.tone];
            return (
              <button
                key={row.label}
                type="button"
                onClick={() => navigate(row.href)}
                className={cn(
                  "group rounded-panel border border-border/70 bg-card p-3.5 text-left",
                  "transition-all duration-os hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-soft",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                      tone.wrap,
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <ArrowUpRight
                    className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity duration-os group-hover:opacity-100"
                    aria-hidden
                  />
                </div>
                <p
                  className={cn(
                    "mt-3 text-[1.625rem] font-semibold capitalize leading-none tabular-nums",
                    tone.value,
                    row.valueClass,
                  )}
                >
                  {row.value}
                </p>
                <p className="mt-1.5 text-caption text-muted-foreground">{row.label}</p>
              </button>
            );
          })}
        </div>
      </section>

      {watchInsights.length > 0 ? (
        <section aria-label={t("command.watch")} className="os-section">
          <SectionHeader title={t("command.watch")} description={t("command.watch_desc")} />
          <ProactiveInsights insights={watchInsights} compact queryKey={["miya", "command-center"]} />
        </section>
      ) : null}

      {activity.length > 0 ? (
        <section id="miya-activity" aria-label={t("command.handled")} className="scroll-mt-24 os-section">
          <SectionHeader
            title={t("command.handled")}
            description={
              briefing.handled_count != null
                ? t("command.handled_count", { count: briefing.handled_count })
                : t("command.handled_default")
            }
          />
          <MiyaActivityTimeline items={activity} compact queryKey={["miya", "command-center"]} />
        </section>
      ) : null}

      {signals.length > 0 ? (
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
    </div>
  );
}

export default CommandCenter;
