import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  Building2,
  ClipboardCheck,
  Clock,
  DollarSign,
  ExternalLink,
  MapPinOff,
  RefreshCw,
  Users,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useLocationDetail } from "@/hooks/use-location-detail";
import type {
  CashSessionToday,
  ClockEventToday,
  ShiftToday,
} from "@/hooks/use-location-detail";
import type {
  LocationMetrics,
  LocationStatus,
} from "@/hooks/use-locations-portfolio";

/**
 * Per-branch deep-dive opened from a card on Locations Overview.
 *
 * Layout:
 *   - Header with status, top concern, refresh + back to overview
 *   - KPI strip with the same 6 metrics as the overview totals row
 *   - Today's shifts, clock events (mismatches highlighted), cash sessions
 *   - Quick links to scoped reports (labor, payroll, timesheet) so an
 *     owner can pivot from "what's happening at this branch right now"
 *     to "show me the historical numbers for this branch".
 */
export default function BranchDetailPage() {
  const { locationId } = useParams<{ locationId: string }>();
  const { data, isLoading, isError, refetch, isFetching } =
    useLocationDetail(locationId);

  const reportLinks = useMemo(() => {
    if (!locationId) return [];
    const q = `?location=${encodeURIComponent(locationId)}`;
    return [
      {
        label: "Labor & attendance report",
        href: `/dashboard/reports/labor-attendance${q}`,
      },
      {
        label: "Timesheet history",
        href: `/dashboard/timesheets${q}`,
      },
    ];
  }, [locationId]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      {isLoading ? (
        <BranchSkeleton />
      ) : isError || !data ? (
        <Card>
          <CardContent className="flex items-center gap-3 p-4 text-sm text-red-600">
            <AlertTriangle className="h-4 w-4" />
            Couldn't load this branch. Try refreshing.
          </CardContent>
        </Card>
      ) : (
        <>
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <StatusDot status={data.location.status} />
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <h1 className="text-2xl font-semibold tracking-tight">
                    {data.location.name}
                  </h1>
                  {data.location.is_primary && (
                    <Badge variant="outline">Primary</Badge>
                  )}
                  {!data.location.is_active && (
                    <Badge variant="destructive">Inactive</Badge>
                  )}
                </div>
                <p
                  className={cn(
                    "mt-1 text-sm",
                    data.location.status === "red" && "text-red-600",
                    data.location.status === "amber" && "text-amber-600",
                    data.location.status === "green" && "text-muted-foreground",
                  )}
                >
                  {data.location.top_concern || "All systems go"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                Updated {new Date(data.generated_at).toLocaleTimeString()}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw
                  className={cn(
                    "mr-2 h-3.5 w-3.5",
                    isFetching && "animate-spin",
                  )}
                />
                Refresh
              </Button>
            </div>
          </header>

          <KpiStrip metrics={data.location.metrics} />

          <div className="grid gap-4 lg:grid-cols-2">
            <ShiftsCard shifts={data.shifts_today} />
            <ClockEventsCard events={data.clock_events_today} />
          </div>

          <CashSessionsCard sessions={data.cash_sessions_today} />

          <ReportLinksCard links={reportLinks} />
        </>
      )}
    </div>
  );
}

/* ----------------------------- KPI strip ------------------------------ */

function KpiStrip({ metrics }: { metrics: LocationMetrics }) {
  const coverageLabel =
    metrics.coverage_pct === null
      ? `${metrics.clocked_in_now} in`
      : `${metrics.clocked_in_now}/${metrics.scheduled_today} · ${metrics.coverage_pct}%`;

  const noShowSubtitle =
    metrics.potential_no_shows > 0
      ? `${metrics.no_shows_today} (+${metrics.potential_no_shows} pending)`
      : `${metrics.no_shows_today} confirmed`;

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
      <Tile
        icon={<Users className="h-4 w-4" />}
        label="Coverage"
        value={coverageLabel}
        tone={
          metrics.coverage_pct !== null && metrics.coverage_pct < 50
            ? "red"
            : metrics.coverage_pct !== null && metrics.coverage_pct < 80
              ? "amber"
              : "neutral"
        }
      />
      <Tile
        icon={<DollarSign className="h-4 w-4" />}
        label="Labor cost today"
        value={formatMoney(metrics.labor_cost_today)}
        subtitle="Based on clock-in hours"
      />
      <Tile
        icon={<Clock className="h-4 w-4" />}
        label="No-shows"
        value={String(
          metrics.no_shows_today + metrics.potential_no_shows,
        )}
        subtitle={noShowSubtitle}
        tone={
          metrics.no_shows_today > 0
            ? "red"
            : metrics.potential_no_shows > 0
              ? "amber"
              : "neutral"
        }
      />
      <Tile
        icon={<MapPinOff className="h-4 w-4" />}
        label="Mismatches"
        value={String(metrics.location_mismatches_today)}
        subtitle="Clocked in at wrong branch"
        tone={metrics.location_mismatches_today > 0 ? "red" : "neutral"}
      />
      <Tile
        icon={<Wallet className="h-4 w-4" />}
        label="Cash sessions"
        value={String(
          metrics.open_cash_sessions + metrics.flagged_cash_sessions,
        )}
        subtitle={
          metrics.flagged_cash_sessions > 0
            ? `${metrics.flagged_cash_sessions} flagged · ${formatMoney(metrics.cash_variance_today)}`
            : metrics.cash_variance_today !== 0
              ? formatMoney(metrics.cash_variance_today)
              : "No variance"
        }
        tone={metrics.flagged_cash_sessions > 0 ? "red" : "neutral"}
      />
      <Tile
        icon={<ClipboardCheck className="h-4 w-4" />}
        label="Checklists"
        value={
          metrics.checklist_completion_pct === null
            ? "—"
            : `${metrics.checklist_completion_pct}%`
        }
        subtitle={
          metrics.checklists_total > 0
            ? `${metrics.checklists_completed}/${metrics.checklists_total} done`
            : "No checklists scheduled"
        }
        tone={
          metrics.checklist_completion_pct !== null &&
          metrics.checklist_completion_pct < 60
            ? "amber"
            : "neutral"
        }
      />
    </div>
  );
}

function Tile({
  icon,
  label,
  value,
  subtitle,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  tone?: "neutral" | "amber" | "red";
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          <span
            className={cn(
              tone === "red" && "text-red-600",
              tone === "amber" && "text-amber-600",
            )}
          >
            {icon}
          </span>
        </div>
        <div
          className={cn(
            "mt-1 text-xl font-semibold tracking-tight",
            tone === "red" && "text-red-600",
            tone === "amber" && "text-amber-600",
          )}
        >
          {value}
        </div>
        {subtitle && (
          <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------- Today's shifts card ------------------------- */

function ShiftsCard({ shifts }: { shifts: ShiftToday[] }) {
  return (
    <Card>
      <CardContent className="p-4">
        <SectionHeader
          title="Today's shifts"
          subtitle={`${shifts.length} scheduled`}
        />
        {shifts.length === 0 ? (
          <EmptyRow text="No shifts scheduled at this branch today." />
        ) : (
          <ul className="divide-y divide-border">
            {shifts.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{s.staff_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.role || "—"}
                    {s.start_time && (
                      <>
                        {" · "}
                        {formatTime(s.start_time)}
                        {s.end_time && ` – ${formatTime(s.end_time)}`}
                      </>
                    )}
                  </div>
                </div>
                <ShiftStatusBadge status={s.status} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ShiftStatusBadge({ status }: { status: string }) {
  const variant =
    status === "NO_SHOW"
      ? "destructive"
      : status === "COMPLETED" || status === "IN_PROGRESS"
        ? "default"
        : "secondary";
  return (
    <Badge variant={variant} className="shrink-0 text-[10px]">
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

/* ------------------------ Today's clock events ------------------------- */

function ClockEventsCard({ events }: { events: ClockEventToday[] }) {
  const mismatchCount = events.filter((e) => e.location_mismatch).length;
  return (
    <Card>
      <CardContent className="p-4">
        <SectionHeader
          title="Today's clock activity"
          subtitle={
            mismatchCount > 0
              ? `${events.length} events · ${mismatchCount} mismatch`
              : `${events.length} events`
          }
          subtitleTone={mismatchCount > 0 ? "red" : "neutral"}
        />
        {events.length === 0 ? (
          <EmptyRow text="No clock-ins or clock-outs at this branch today." />
        ) : (
          <ul className="divide-y divide-border">
            {events.map((ev) => (
              <li
                key={ev.id}
                className={cn(
                  "flex items-center justify-between gap-3 py-2 text-sm",
                  ev.location_mismatch && "rounded-md bg-red-50 px-2",
                )}
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{ev.staff_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {(ev.event_type || "").toLowerCase()} ·{" "}
                    {formatTime(ev.timestamp)}
                  </div>
                </div>
                {ev.location_mismatch && (
                  <Badge variant="destructive" className="shrink-0 text-[10px]">
                    Wrong branch
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------ Today's cash sessions ------------------------ */

function CashSessionsCard({ sessions }: { sessions: CashSessionToday[] }) {
  if (sessions.length === 0) return null;
  return (
    <Card>
      <CardContent className="p-4">
        <SectionHeader
          title="Cash sessions"
          subtitle={`${sessions.length} today`}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-2 pr-4 font-medium">Staff</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Opening</th>
                <th className="py-2 pr-4 font-medium">Counted</th>
                <th className="py-2 pr-4 font-medium">Variance</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((cs) => (
                <tr key={cs.id} className="border-t border-border">
                  <td className="py-2 pr-4">{cs.staff_name}</td>
                  <td className="py-2 pr-4">
                    <Badge
                      variant={
                        cs.status === "FLAGGED" ? "destructive" : "secondary"
                      }
                      className="text-[10px]"
                    >
                      {cs.status}
                    </Badge>
                  </td>
                  <td className="py-2 pr-4">
                    {cs.opening_float !== null
                      ? formatMoney(cs.opening_float)
                      : "—"}
                  </td>
                  <td className="py-2 pr-4">
                    {cs.counted_cash !== null
                      ? formatMoney(cs.counted_cash)
                      : "—"}
                  </td>
                  <td
                    className={cn(
                      "py-2 pr-4 font-medium",
                      cs.variance !== null &&
                        cs.variance !== 0 &&
                        "text-red-600",
                    )}
                  >
                    {cs.variance !== null ? formatMoney(cs.variance) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/* --------------------------- Report deep links ------------------------- */

function ReportLinksCard({
  links,
}: {
  links: { label: string; href: string }[];
}) {
  if (links.length === 0) return null;
  return (
    <Card>
      <CardContent className="p-4">
        <SectionHeader
          title="Drill into reports"
          subtitle="Filtered to this branch"
        />
        <div className="grid gap-2 md:grid-cols-2">
          {links.map((l) => (
            <Button
              key={l.href}
              variant="outline"
              asChild
              className="justify-between"
            >
              <Link to={l.href}>
                <span>{l.label}</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------ Helpers ------------------------------- */

function SectionHeader({
  title,
  subtitle,
  subtitleTone = "neutral",
}: {
  title: string;
  subtitle?: string;
  subtitleTone?: "neutral" | "red";
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="text-sm font-semibold tracking-tight">{title}</div>
      {subtitle && (
        <div
          className={cn(
            "text-xs text-muted-foreground",
            subtitleTone === "red" && "text-red-600",
          )}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
      {text}
    </div>
  );
}

function StatusDot({ status }: { status: LocationStatus }) {
  const color =
    status === "red"
      ? "bg-red-500"
      : status === "amber"
        ? "bg-amber-500"
        : "bg-emerald-500";
  return (
    <span
      className={cn(
        "mt-2 h-3 w-3 shrink-0 rounded-full",
        color,
        status === "red" && "animate-pulse",
      )}
      aria-label={`status ${status}`}
    />
  );
}

function BranchSkeleton() {
  return (
    <>
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-6 w-20" />
              <Skeleton className="mt-2 h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((__, j) => (
                <Skeleton key={j} className="h-6 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

function formatMoney(amount: number): string {
  const abs = Math.abs(amount);
  const rounded = abs >= 100 ? Math.round(abs) : Math.round(abs * 100) / 100;
  const sign = amount < 0 ? "−" : "";
  return `${sign}${rounded.toLocaleString()} MAD`;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
