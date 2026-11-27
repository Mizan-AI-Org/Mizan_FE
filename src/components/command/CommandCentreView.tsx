import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CommandCentreSkeleton } from "@/components/command/CommandCentreSkeleton";
import FirstRunChecklist from "@/components/command/FirstRunChecklist";
import { buildPriorityQueue, cockpitCounts } from "@/components/command/priorityQueue";
import { useBranchScope } from "@/contexts/BranchScopeContext";
import { useCommandCentre } from "@/hooks/use-command-centre";
import { useLanguage } from "@/hooks/use-language";
import type { Language } from "@/contexts/LanguageContext.types";
import { formatClockTime, formatDate } from "@/lib/localeTag";
import { api } from "@/lib/api";
import {
  COMMAND_ROUTES,
  localizedCommandGreeting,
  localizedOpsHealth,
  type CommandDaySheet,
  type CommandSignal,
} from "@/lib/commandCentre";
import type { DashboardTaskDemandItem, MeetingReminderItem } from "@/lib/types";
import { MIZAN_ELEVATED_CARD } from "@/lib/mizan-ui";
import { cn } from "@/lib/utils";
import { DashboardWidgetById, type DashboardWidgetBundleProps } from "@/pages/dashboard/DashboardWidgets";

const ALL_OPERATIONS = "/dashboard/operations/live";
const COMMAND_MEETINGS_HREF = "/dashboard#command-meetings";
const COMMAND_WIDGETS = ["meetings_reminders", "staff_daily_progress", "urgent_top"] as const;

type UpcomingCalendar = NonNullable<CommandDaySheet["calendar"]["upcoming"]>;

/** Calendar tile only surfaces what's starting in the next 30 minutes. */
const CALENDAR_IMMINENT_MS = 30 * 60_000;

function nextMeetingFromWidget(items: MeetingReminderItem[] | undefined): UpcomingCalendar | null {
  if (!items?.length) return null;
  const now = Date.now();
  const latest = now + CALENDAR_IMMINENT_MS;
  let best: { ms: number; title: string } | null = null;
  for (const item of items) {
    const title = (item.title || "").trim();
    if (!title) continue;
    const ms = Date.parse(item.start);
    if (Number.isNaN(ms) || ms < now - 30_000 || ms > latest) continue;
    if (best === null || ms < best.ms) best = { ms, title };
  }
  if (!best) return null;
  return {
    title: best.title,
    minutes: Math.max(0, Math.floor((best.ms - now) / 60_000)),
    starts_at: new Date(best.ms).toISOString(),
  };
}

function soonerUpcoming(a: UpcomingCalendar | null | undefined, b: UpcomingCalendar | null | undefined): UpcomingCalendar | null {
  if (!a) return b ?? null;
  if (!b) return a;
  const aMs = a.starts_at ? Date.parse(a.starts_at) : NaN;
  const bMs = b.starts_at ? Date.parse(b.starts_at) : NaN;
  if (!Number.isNaN(aMs) && !Number.isNaN(bMs)) return aMs <= bMs ? a : b;
  if (!Number.isNaN(aMs)) return a;
  if (!Number.isNaN(bMs)) return b;
  return a.minutes <= b.minutes ? a : b;
}

function imminentCalendarUpcoming(upcoming: UpcomingCalendar | null | undefined): UpcomingCalendar | null {
  if (!upcoming) return null;
  const now = Date.now();
  if (upcoming.starts_at) {
    const ms = Date.parse(upcoming.starts_at);
    if (Number.isNaN(ms) || ms < now - 30_000 || ms > now + CALENDAR_IMMINENT_MS) return null;
    return {
      title: upcoming.title,
      starts_at: upcoming.starts_at,
      minutes: Math.max(0, Math.floor((ms - now) / 60_000)),
    };
  }
  if (upcoming.minutes > 30) return null;
  return upcoming;
}

function formatImminentCalendarValue(
  upcoming: UpcomingCalendar,
  t: (key: string, opts?: Record<string, string | number>) => string,
): string {
  const title = upcoming.title;
  if (upcoming.minutes <= 0) {
    return t("command.day.upcoming_now", { title });
  }
  return t("command.day.upcoming_min", { title, minutes: upcoming.minutes });
}

function whenLabel(iso: string | undefined, language: Language): { weekday: string; time: string } {
  if (!iso) return { weekday: "", time: "" };
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { weekday: "", time: "" };
  return {
    weekday: formatDate(date, language, { weekday: "long" }),
    time: formatClockTime(date, language),
  };
}

export function CommandCentreView({ className }: { className?: string }) {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [showAllInsights, setShowAllInsights] = useState(false);
  const { selected } = useBranchScope();
  const { data, isLoading, isError, refetch } = useCommandCentre();
  const overview = useQuery({
    queryKey: ["operations-overview", "cockpit", selected],
    queryFn: () => api.getOperationsOverview({ pageSize: 40 }),
    staleTime: 30_000,
  });
  const approvals = useQuery({
    queryKey: ["approvals", "command-centre", selected],
    queryFn: () => api.listApprovals("pending"),
    staleTime: 30_000,
    retry: false,
  });
  const demands = useQuery({
    queryKey: ["tasks-demands", "command-centre", selected],
    queryFn: () => api.getDashboardTasksDemands(8),
    staleTime: 30_000,
  });

  const greetingLine = useMemo(
    () => (data ? localizedCommandGreeting(data, t) : t("command.preparing")),
    [data, t],
  );
  const counts = cockpitCounts({
    peopleWorking: data?.metrics.people_working ?? 0,
    coverageGaps: data?.metrics.coverage_gaps ?? 0,
    tasksOpen: overview.data?.summary?.open ?? data?.metrics.active_work ?? 0,
    tasksOverdue: overview.data?.summary?.overdue ?? 0,
    incidents: overview.data?.counts?.incidents ?? data?.metrics.open_incidents ?? 0,
    pendingApprovals: data?.metrics.pending_approvals ?? 0,
    awaitingApproval: overview.data?.summary?.awaiting_approval ?? 0,
  });

  if (isLoading) {
    return (
      <div className={className}>
        <FirstRunChecklist />
        <CommandCentreSkeleton />
      </div>
    );
  }

  if (isError || !data?.success) {
    return (
      <div className={className}>
        <FirstRunChecklist />
        <div className="mx-auto max-w-lg space-y-3 px-4 py-12 text-center">
          <h2 className="text-section-title">{t("command.load_error")}</h2>
          <p className="type-secondary">{t("command.load_error_detail")}</p>
          <Button type="button" onClick={() => void refetch()}>
            {t("common.retry", { defaultValue: "Retry" })}
          </Button>
        </div>
      </div>
    );
  }

  const briefing = data.briefing;
  const { weekday } = whenLabel(data.generated_at || briefing?.asOf, language);
  const opsHealthLabel = localizedOpsHealth(data.ops_health, t);
  const healthTone =
    data.ops_health === "strained"
      ? "bg-critical-muted text-critical"
      : data.ops_health === "healthy"
        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
        : "bg-muted text-muted-foreground";

  return (
    <div
      className={cn(
        "command-centre-page min-w-0 space-y-5 px-4 pb-5 pt-2 md:px-6 lg:px-8 lg:pb-6 lg:pt-3",
        className,
      )}
    >
      <FirstRunChecklist />
      <header aria-label={t("attention.aria.header")} className="min-w-0 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{greetingLine}</h1>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          {briefing?.restaurantName ? (
            <span className="text-foreground/90">{briefing.restaurantName}</span>
          ) : null}
          {briefing?.restaurantName && weekday ? <span aria-hidden>·</span> : null}
          {weekday ? <span>{t("command.weekday_ops", { weekday })}</span> : null}
          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-caption font-medium", healthTone)}>
            {opsHealthLabel}
          </span>
        </p>
      </header>

      {data.day_sheet ? <DaySheet sheet={data.day_sheet} /> : null}

      <section
        className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5"
        aria-label={t("command.ops_overview")}
      >
        <Kpi
          tone="staff"
          href={counts.coverageGaps > 0 ? "/dashboard/employees/shifts" : "/dashboard/employees/attendance"}
          label={t("command.kpi.on_duty")}
          value={String(counts.onDuty)}
          detail={counts.coverageGaps > 0 ? t("command.kpi.coverage_gaps", { count: counts.coverageGaps }) : undefined}
        />
        <Kpi
          tone="tasks"
          href="/dashboard/operations/live"
          label={t("command.kpi.tasks")}
          value={String(counts.tasksOpen)}
          detail={
            counts.tasksOverdue > 0
              ? t("command.kpi.tasks_overdue", { count: counts.tasksOverdue })
              : t("command.kpi.tasks_open", { open: counts.tasksOpen })
          }
        />
        <Kpi
          tone="incidents"
          href={COMMAND_ROUTES.incidents}
          label={t("command.kpi.incidents")}
          value={String(counts.incidents)}
        />
        <Kpi
          tone="pending"
          href="/dashboard/operations/approvals"
          label={t("command.kpi.pending")}
          value={String(counts.pending)}
          detail={
            counts.pendingApprovals > 0 && counts.awaitingApproval > 0
              ? t("command.kpi.pending_detail", {
                  approvals: counts.pendingApprovals,
                  awaiting: counts.awaitingApproval,
                })
              : undefined
          }
        />
      </section>

      <FocusLists
        decide={buildPriorityQueue({
          needsMe: data.lanes?.needs_me,
          overviewItems: overview.data?.items,
          approvals: approvals.data?.approvals,
          validations: [],
          hidden: [],
          fallbackTitle: t("command.decide_now"),
          cap: 50,
        })}
        work={workInMotion(data.lanes?.today, demands.data?.pending, demands.data?.in_progress)}
        missing={(briefing?.live?.missingClockIns ?? []).filter((row) => row?.name && !row.isViewerSelf)}
        coverageGaps={counts.coverageGaps}
        t={t}
        widgets={
          <CommandWidgets
            t={t}
            navigate={navigate}
            showAllInsights={showAllInsights}
            setShowAllInsights={setShowAllInsights}
          />
        }
      />
    </div>
  );
}

type WorkRow = { id: string; title: string; owner: string; status: string; href: string };

function demandTime(row: DashboardTaskDemandItem): number {
  const raw = row.updated_at || row.created_at;
  const parsed = Date.parse(raw || "");
  return Number.isNaN(parsed) ? 0 : parsed;
}

function workInMotion(
  today: CommandSignal[] | undefined,
  pending: DashboardTaskDemandItem[] | undefined,
  inProgress: DashboardTaskDemandItem[] | undefined,
): WorkRow[] {
  const rows: WorkRow[] = [];
  const seen = new Set<string>();
  for (const signal of today ?? []) {
    if (signal.kind !== "task" || !signal.id || !signal.title) continue;
    const id = String(signal.id);
    if (seen.has(id)) continue;
    seen.add(id);
    rows.push({
      id,
      title: signal.title,
      owner: signal.owner || "",
      status: signal.severity === "critical" || signal.severity === "high" ? signal.severity : "high",
      href: signal.action_url || ALL_OPERATIONS,
    });
  }
  const demands = [...(pending ?? []), ...(inProgress ?? [])].sort((a, b) => demandTime(b) - demandTime(a));
  for (const row of demands) {
    if (!row?.id || !row.title || seen.has(row.id)) continue;
    if (row.status !== "PENDING" && row.status !== "IN_PROGRESS") continue;
    seen.add(row.id);
    rows.push({
      id: row.id,
      title: row.title,
      owner: row.assignee?.name || "",
      status: row.status,
      href: `/dashboard/operations/live?task=${encodeURIComponent(row.id)}`,
    });
  }
  return rows;
}

function FocusLists({
  decide,
  work,
  missing,
  coverageGaps,
  t,
  widgets,
}: {
  decide: ReturnType<typeof buildPriorityQueue>;
  work: WorkRow[];
  missing: Array<{ id?: string; name?: string }>;
  coverageGaps: number;
  t: (key: string, opts?: Record<string, string | number>) => string;
  widgets: React.ReactNode;
}) {
  const decideShown = decide.slice(0, 5);
  const workShown = work.slice(0, 5);
  const namesShown = missing.slice(0, 5);
  const showTeam = namesShown.length > 0 || coverageGaps > 0;
  const listsEmpty = decideShown.length === 0 && workShown.length === 0 && !showTeam;
  const teamMore = missing.length > 5 || (coverageGaps > 0 && missing.length >= 5);
  return (
    <div className="space-y-5">
      {listsEmpty ? <p className="text-sm text-muted-foreground">{t("command.nothing_now")}</p> : null}
      {listsEmpty ? null : (
        <div className="grid gap-3 lg:grid-cols-3">
          {decideShown.length > 0 ? (
            <ListCard title={t("command.decide_now")} more={decide.length > 5} moreLabel={t("command.see_more")}>
              {decideShown.map((row) => (
                <RowLink key={row.key} href={row.href} title={row.title} meta={row.owner || row.area} />
              ))}
            </ListCard>
          ) : null}
          {workShown.length > 0 ? (
            <ListCard title={t("command.work_in_motion")} more={work.length > 5} moreLabel={t("command.see_more")}>
              {workShown.map((row) => (
                <RowLink
                  key={row.id}
                  href={row.href}
                  title={row.title}
                  meta={[row.owner || t("command.unassigned"), t(`command.demand_status.${row.status}`, { defaultValue: row.status })].join(" · ")}
                />
              ))}
            </ListCard>
          ) : null}
          {showTeam ? (
            <ListCard title={t("command.team_now")} more={teamMore} moreLabel={t("command.see_more")}>
              {coverageGaps > 0 ? (
                <RowLink href="/dashboard/employees/shifts" title={t("command.coverage_line", { count: coverageGaps })} />
              ) : null}
              {namesShown.map((person) => (
                <RowLink
                  key={person.id || person.name}
                  href="/dashboard/employees/attendance"
                  title={person.name || ""}
                />
              ))}
            </ListCard>
          ) : null}
        </div>
      )}
      {widgets}
    </div>
  );
}

const COMMAND_LIST_CARD_HEADER =
  "flex flex-row items-center justify-between space-y-0 px-6 pb-2 pt-6";

function ListCard({
  title,
  more,
  moreLabel,
  children,
}: {
  title: string;
  more?: boolean;
  moreLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <Card
      className={cn(
        MIZAN_ELEVATED_CARD,
        "flex h-full min-h-0 flex-col transition-transform duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md",
      )}
    >
      <CardHeader className={COMMAND_LIST_CARD_HEADER}>
        <CardTitle className="text-sm font-bold tracking-tight text-slate-900 dark:text-white md:text-base">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col px-6 pb-5 pt-0">
        <ul className="divide-y divide-border/60">{children}</ul>
        {more ? (
          <Link to={ALL_OPERATIONS} className="pt-3 text-sm font-medium text-primary hover:underline">
            {moreLabel}
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CommandWidgets({
  t,
  navigate,
  showAllInsights,
  setShowAllInsights,
}: {
  t: DashboardWidgetBundleProps["t"];
  navigate: DashboardWidgetBundleProps["navigate"];
  showAllInsights: boolean;
  setShowAllInsights: DashboardWidgetBundleProps["setShowAllInsights"];
}) {
  const cardBase = cn(
    MIZAN_ELEVATED_CARD,
    "relative flex h-full min-h-[200px] flex-col transition-transform duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md",
  );
  const cardHeaderBase = "flex flex-row items-center justify-between pb-2 space-y-0 px-6 pt-6";
  const bundle: DashboardWidgetBundleProps = {
    t,
    navigate,
    cardBase,
    cardHeaderBase,
    summary: null,
    isLoading: false,
    showAllInsights,
    setShowAllInsights,
    criticalCount: 0,
    insights: [],
    insightsVisible: [],
    attentionNow: 0,
    noShowsCount: 0,
    noShowsLabelKey: "",
    noShowsDescKey: "",
    todaySales: undefined,
    salesLoading: false,
    hasRole: () => false,
    customWidgetsById: {},
  };
  return (
    <div className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-3">
      {COMMAND_WIDGETS.map((id) => (
        <div key={id} id={id === "meetings_reminders" ? "command-meetings" : undefined} className="min-w-0">
          <DashboardWidgetById id={id} props={bundle} />
        </div>
      ))}
    </div>
  );
}

function CalendarFact({ fallback }: { fallback: CommandDaySheet["calendar"] }) {
  const { t } = useLanguage();
  const { data } = useQuery({
    queryKey: ["dashboard", "meetings-reminders", "day-sheet"],
    queryFn: () => api.getDashboardMeetingsReminders(8),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const upcoming = imminentCalendarUpcoming(
    soonerUpcoming(nextMeetingFromWidget(data?.items), fallback.upcoming ?? null),
  );
  const value = upcoming
    ? formatImminentCalendarValue(upcoming, t)
    : t("command.day.calendar_clear_30", { defaultValue: "All clear for the next 30 min" });
  return <Fact href={COMMAND_MEETINGS_HREF} label={t("command.day.calendar")} value={value} />;
}

function DaySheet({ sheet }: { sheet: CommandDaySheet }) {
  const { t } = useLanguage();
  const presence =
    sheet.presence.expected > 0
      ? `${sheet.presence.in}/${sheet.presence.expected}`
      : String(sheet.presence.in);
  const facts: Array<{ key: string; href: string; label: string; value?: string; external?: boolean }> = [
    { key: "presence", href: "/dashboard/employees/attendance", label: t("command.day.presence"), value: presence },
    {
      key: "approvals",
      href: "/dashboard/operations/approvals",
      label: t("command.day.approvals", { count: sheet.approvals_pending }),
    },
    ...sheet.services.map((service) => ({
      key: service.label,
      href: "/dashboard/employees/shifts",
      label: t(`command.day.${service.label}`),
      value: `${service.start}–${service.end}`,
    })),
    {
      key: "incidents",
      href: COMMAND_ROUTES.incidents,
      label: t("command.day.incidents"),
      value: t("command.day.incidents_new", { count: sheet.incidents_new }),
    },
  ];
  return (
    <section aria-label={t("command.day.title")} className={cn(MIZAN_ELEVATED_CARD, "overflow-hidden")}>
      {sheet.lines.length > 0 ? (
        <ul className="space-y-1 border-b border-slate-200/70 px-4 py-3 dark:border-border">
          {sheet.lines.map((line, index) => (
            <li key={`${line.kind}-${index}`}>
              <Link to={line.href} className="block truncate text-sm font-medium hover:text-primary">
                {line.kind === "birthday" ? t("command.day.birthday", { name: line.text }) : line.text}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="grid w-full grid-cols-2 gap-px bg-slate-200/70 sm:grid-cols-none sm:auto-cols-fr sm:grid-flow-col dark:bg-border">
        {facts.map((fact) => (
          <Fact key={fact.key} href={fact.href} label={fact.label} value={fact.value} external={fact.external} />
        ))}
        <CalendarFact fallback={sheet.calendar} />
      </div>
    </section>
  );
}

function Fact({
  href,
  label,
  value,
  placeholder,
  external = false,
}: {
  href: string;
  label: string;
  value?: string;
  placeholder?: string;
  external?: boolean;
}) {
  const className =
    "flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 bg-white px-3 py-3 text-center transition-colors hover:bg-slate-50 dark:bg-card dark:hover:bg-white/5";
  const showValue = Boolean(value || placeholder);
  const body = (
    <>
      <span className={showValue ? "text-xs text-muted-foreground" : "text-sm font-medium text-foreground"}>
        {label}
      </span>
      {value ? (
        <span className="line-clamp-2 text-sm font-semibold text-foreground">{value}</span>
      ) : placeholder ? (
        <span className="line-clamp-2 text-xs font-medium text-muted-foreground">{placeholder}</span>
      ) : null}
    </>
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {body}
      </a>
    );
  }
  return (
    <Link to={href} className={className}>
      {body}
    </Link>
  );
}

function RowLink({ href, title, meta }: { href: string; title: string; meta?: string }) {
  return (
    <li>
      <Link to={href} className="block py-2 hover:text-primary">
        <div className="truncate text-sm font-medium">{title}</div>
        {meta ? <div className="truncate text-xs text-muted-foreground">{meta}</div> : null}
      </Link>
    </li>
  );
}

const KPI_TONE_STYLES = {
  staff:
    "border-emerald-200/70 bg-gradient-to-br from-emerald-50/95 via-white to-teal-100/50 hover:border-emerald-300/80 dark:border-emerald-900/50 dark:from-emerald-950/50 dark:via-slate-900 dark:to-teal-950/35",
  tasks:
    "border-sky-200/70 bg-gradient-to-br from-sky-50/95 via-white to-blue-100/45 hover:border-sky-300/80 dark:border-sky-900/50 dark:from-sky-950/45 dark:via-slate-900 dark:to-blue-950/35",
  incidents:
    "border-amber-200/70 bg-gradient-to-br from-amber-50/95 via-white to-orange-100/45 hover:border-amber-300/80 dark:border-amber-900/45 dark:from-amber-950/40 dark:via-slate-900 dark:to-orange-950/30",
  pending:
    "border-violet-200/70 bg-gradient-to-br from-violet-50/95 via-white to-fuchsia-100/40 hover:border-violet-300/80 dark:border-violet-900/45 dark:from-violet-950/40 dark:via-slate-900 dark:to-fuchsia-950/30",
} as const;

function Kpi({
  href,
  label,
  value,
  detail,
  tone,
}: {
  href: string;
  label: string;
  value: string;
  detail?: string;
  tone: keyof typeof KPI_TONE_STYLES;
}) {
  return (
    <Link
      to={href}
      className={cn(
        MIZAN_ELEVATED_CARD,
        "block px-3 py-2.5 sm:px-3.5 sm:py-3 transition-colors",
        KPI_TONE_STYLES[tone],
      )}
    >
      <div className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</div>
      <div className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-slate-50 sm:text-[1.65rem]">
        {value}
      </div>
      {detail ? <div className="mt-0.5 text-[11px] leading-snug text-slate-600/90 dark:text-slate-400">{detail}</div> : null}
    </Link>
  );
}

export default CommandCentreView;