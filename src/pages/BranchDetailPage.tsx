import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRightLeft,
  Building2,
  ClipboardCheck,
  Clock,
  DollarSign,
  ExternalLink,
  MapPin,
  MapPinOff,
  RefreshCw,
  Users,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PAGE_SHELL_PADDED } from "@/lib/page-shell";
import { cn } from "@/lib/utils";
import MoveStaffBranchDialog from "@/components/staff/MoveStaffBranchDialog";
import { useBusinessLocations } from "@/hooks/use-business-locations";
import { useLocationDetail } from "@/hooks/use-location-detail";
import type {
  BranchStaffMember,
  CashSessionToday,
  ClockEventToday,
  ShiftToday,
} from "@/hooks/use-location-detail";
import type {
  LocationMetrics,
  LocationStatus,
} from "@/hooks/use-locations-portfolio";

/**
 * Full branch hub — opened from Locations Overview.
 * Tabs: Today · Staff · Performance · More
 */
export default function BranchDetailPage() {
  const { locationId } = useParams<{ locationId: string }>();
  const { data, isLoading, isError, refetch, isFetching } =
    useLocationDetail(locationId);
  const { data: tenantLocations = [] } = useBusinessLocations();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedById, setSelectedById] = useState<
    Record<string, BranchStaffMember>
  >({});
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTargets, setMoveTargets] = useState<BranchStaffMember[]>([]);

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
      {
        label: "Staff directory",
        href: `/dashboard/staff-app`,
      },
      {
        label: "Schedule",
        href: `/dashboard/scheduling${q}`,
      },
    ];
  }, [locationId]);

  const clearSelection = () => {
    setSelectedIds([]);
    setSelectedById({});
  };

  const toggleStaff = (member: BranchStaffMember) => {
    setSelectedIds((prev) => {
      if (prev.includes(member.id)) {
        setSelectedById((map) => {
          const next = { ...map };
          delete next[member.id];
          return next;
        });
        return prev.filter((id) => id !== member.id);
      }
      setSelectedById((map) => ({ ...map, [member.id]: member }));
      return [...prev, member.id];
    });
  };

  const openMove = (members: BranchStaffMember[]) => {
    if (!members.length) return;
    setMoveTargets(
      members.map((m) => ({
        ...m,
        primary_location: locationId,
        primary_location_data: data
          ? { id: data.location.id, name: data.location.name }
          : undefined,
      })),
    );
    setMoveOpen(true);
  };

  return (
    <div className={`${PAGE_SHELL_PADDED} space-y-6`}>
      {isLoading ? (
        <BranchSkeleton />
      ) : isError || !data ? (
        <Card>
          <CardContent className="flex items-center gap-3 p-4 text-sm text-red-600">
            <AlertTriangle className="h-4 w-4" />
            Couldn&apos;t load this branch. Try refreshing.
          </CardContent>
        </Card>
      ) : (
        <>
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <StatusDot status={data.location.status} />
              <div>
                <div className="flex flex-wrap items-center gap-2">
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
                {data.location.address ? (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {data.location.address}
                  </p>
                ) : null}
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

          <KpiStrip
            metrics={data.location.metrics}
            staffTotal={data.staff_summary?.total ?? 0}
          />

          <Tabs defaultValue="today" className="space-y-4">
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/60 p-1">
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="staff">
                Staff
                {data.staff_summary?.total ? (
                  <span className="ml-1.5 text-muted-foreground">
                    ({data.staff_summary.total})
                  </span>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="more">Branch info</TabsTrigger>
            </TabsList>

            <TabsContent value="today" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <ShiftsCard shifts={data.shifts_today} />
                <ClockEventsCard events={data.clock_events_today} />
              </div>
              <CashSessionsCard sessions={data.cash_sessions_today} />
            </TabsContent>

            <TabsContent value="staff" className="space-y-4">
              {selectedIds.length > 0 ? (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/30">
                  <span className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                    {selectedIds.length} selected
                  </span>
                  <Button
                    size="sm"
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() =>
                      openMove(
                        selectedIds
                          .map((id) => selectedById[id])
                          .filter(Boolean) as BranchStaffMember[],
                      )
                    }
                  >
                    <ArrowRightLeft className="mr-1.5 h-4 w-4" />
                    Move to branch
                  </Button>
                  <Button size="sm" variant="ghost" onClick={clearSelection}>
                    Clear
                  </Button>
                </div>
              ) : null}

              <StaffRosterCard
                staff={data.staff || []}
                summary={data.staff_summary}
                selectedIds={selectedIds}
                onToggle={toggleStaff}
                onMoveOne={(m) => openMove([m])}
                onSelectAll={(list) => {
                  setSelectedIds(list.map((s) => s.id));
                  setSelectedById(
                    Object.fromEntries(list.map((s) => [s.id, s])),
                  );
                }}
              />
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <PerformanceSection performance={data.performance} />
            </TabsContent>

            <TabsContent value="more" className="space-y-4">
              <BranchProfileCard location={data.location} />
              <ReportLinksCard links={reportLinks} />
            </TabsContent>
          </Tabs>

          <MoveStaffBranchDialog
            open={moveOpen}
            onOpenChange={(open) => {
              setMoveOpen(open);
              if (!open) setMoveTargets([]);
            }}
            staff={moveTargets}
            locations={tenantLocations}
            onMoved={() => {
              clearSelection();
              refetch();
            }}
          />
        </>
      )}
    </div>
  );
}

/* ----------------------------- KPI strip ------------------------------ */

function KpiStrip({
  metrics,
  staffTotal,
}: {
  metrics: LocationMetrics;
  staffTotal: number;
}) {
  const coverageLabel =
    metrics.coverage_pct === null
      ? `${metrics.clocked_in_now} in`
      : `${metrics.clocked_in_now}/${metrics.scheduled_today} · ${metrics.coverage_pct}%`;

  const noShowSubtitle =
    metrics.potential_no_shows > 0
      ? `${metrics.no_shows_today} (+${metrics.potential_no_shows} pending)`
      : `${metrics.no_shows_today} confirmed`;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
      <Tile
        icon={<Users className="h-4 w-4" />}
        label="Team at branch"
        value={String(staffTotal)}
        subtitle={`${metrics.clocked_in_now} clocked in now`}
      />
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
        label="Labor today"
        value={formatMoney(metrics.labor_cost_today)}
      />
      <Tile
        icon={<Clock className="h-4 w-4" />}
        label="No-shows"
        value={String(metrics.no_shows_today + metrics.potential_no_shows)}
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
        tone={metrics.location_mismatches_today > 0 ? "red" : "neutral"}
      />
      <Tile
        icon={<Wallet className="h-4 w-4" />}
        label="Cash"
        value={String(
          metrics.open_cash_sessions + metrics.flagged_cash_sessions,
        )}
        subtitle={
          metrics.flagged_cash_sessions > 0
            ? `${metrics.flagged_cash_sessions} flagged`
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
            : "None scheduled"
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

/* ------------------------------ Staff tab ----------------------------- */

function StaffRosterCard({
  staff,
  summary,
  selectedIds,
  onToggle,
  onMoveOne,
  onSelectAll,
}: {
  staff: BranchStaffMember[];
  summary?: { total: number; home: number; clocked_in_now: number };
  selectedIds: string[];
  onToggle: (m: BranchStaffMember) => void;
  onMoveOne: (m: BranchStaffMember) => void;
  onSelectAll: (list: BranchStaffMember[]) => void;
}) {
  const allSelected =
    staff.length > 0 && staff.every((s) => selectedIds.includes(s.id));

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold tracking-tight">
              Branch team
            </div>
            <div className="text-xs text-muted-foreground">
              {summary
                ? `${summary.home} home · ${summary.total - summary.home} also allowed · ${summary.clocked_in_now} in now`
                : `${staff.length} people`}
            </div>
          </div>
          {staff.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (allSelected) {
                  onSelectAll([]);
                } else {
                  onSelectAll(staff);
                }
              }}
            >
              {allSelected ? "Deselect all" : "Select all"}
            </Button>
          ) : null}
        </div>

        {staff.length === 0 ? (
          <EmptyRow text="No staff assigned to this branch yet." />
        ) : (
          <ul className="divide-y divide-border">
            {staff.map((m) => {
              const selected = selectedIds.includes(m.id);
              return (
                <li
                  key={m.id}
                  className={cn(
                    "flex items-center gap-3 py-3",
                    selected && "bg-emerald-50/50 dark:bg-emerald-950/20",
                  )}
                >
                  <Checkbox
                    checked={selected}
                    onCheckedChange={() => onToggle(m)}
                    aria-label={`Select ${m.first_name}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium text-sm">
                        {m.first_name} {m.last_name}
                      </span>
                      {m.clocked_in ? (
                        <Badge className="bg-emerald-100 text-[10px] text-emerald-700 hover:bg-emerald-100">
                          In now
                        </Badge>
                      ) : null}
                      {!m.is_home ? (
                        <Badge variant="outline" className="text-[10px]">
                          Guest access
                        </Badge>
                      ) : null}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {m.role_display || m.role}
                      {m.phone ? ` · ${m.phone}` : m.email ? ` · ${m.email}` : ""}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() => onMoveOne(m)}
                    title="Move to another branch"
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* --------------------------- Performance tab -------------------------- */

function PerformanceSection({
  performance,
}: {
  performance: LocationDetail["performance"] | undefined;
}) {
  if (!performance) {
    return <EmptyRow text="Performance data unavailable." />;
  }

  const s30 = performance.summary;
  const s7 = performance.last_7_days;
  const chartData = (performance.daily || []).map((d) => ({
    ...d,
    label: d.date.slice(5), // MM-DD
  }));

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Tile
          icon={<ClipboardCheck className="h-4 w-4" />}
          label="Attendance (30d)"
          value={
            s30.attendance_pct === null ? "—" : `${s30.attendance_pct}%`
          }
          subtitle={`${s30.completed_shifts}/${s30.scheduled_shifts} shifts`}
        />
        <Tile
          icon={<Clock className="h-4 w-4" />}
          label="No-shows (30d)"
          value={String(s30.no_shows)}
          tone={s30.no_shows > 0 ? "red" : "neutral"}
          subtitle={`Last 7 days: ${s7.no_shows}`}
        />
        <Tile
          icon={<DollarSign className="h-4 w-4" />}
          label="Labor cost (30d)"
          value={formatMoney(s30.labor_cost)}
          subtitle={`${s30.hours_worked}h worked`}
        />
        <Tile
          icon={<MapPinOff className="h-4 w-4" />}
          label="Mismatches (30d)"
          value={String(s30.mismatches)}
          tone={s30.mismatches > 0 ? "red" : "neutral"}
          subtitle={`Last 7 days: ${s7.mismatches}`}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Tile
          icon={<ClipboardCheck className="h-4 w-4" />}
          label="Attendance (7d)"
          value={s7.attendance_pct === null ? "—" : `${s7.attendance_pct}%`}
          subtitle={`${s7.completed_shifts}/${s7.scheduled_shifts} shifts`}
        />
        <Tile
          icon={<DollarSign className="h-4 w-4" />}
          label="Labor (7d)"
          value={formatMoney(s7.labor_cost)}
          subtitle={`${s7.hours_worked}h`}
        />
        <Tile
          icon={<Users className="h-4 w-4" />}
          label="Shifts scheduled (7d)"
          value={String(s7.scheduled_shifts)}
        />
      </div>

      <Card>
        <CardContent className="p-4">
          <SectionHeader
            title="Daily activity"
            subtitle="Last 30 days · labor cost"
          />
          {chartData.length === 0 ? (
            <EmptyRow text="No activity in this window." />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                    minTickGap={24}
                  />
                  <YAxis tick={{ fontSize: 10 }} width={40} />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === "labor_cost") return [formatMoney(value), "Labor"];
                      if (name === "no_shows") return [value, "No-shows"];
                      if (name === "scheduled") return [value, "Scheduled"];
                      return [value, name];
                    }}
                    labelFormatter={(label) => `Day ${label}`}
                  />
                  <Bar dataKey="labor_cost" fill="#10b981" radius={[3, 3, 0, 0]} name="labor_cost" />
                  <Bar dataKey="no_shows" fill="#ef4444" radius={[3, 3, 0, 0]} name="no_shows" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// Local alias so PerformanceSection can reference LocationDetail without circular import issues
type LocationDetail = NonNullable<
  ReturnType<typeof useLocationDetail>["data"]
>;

/* --------------------------- Branch info tab -------------------------- */

function BranchProfileCard({
  location,
}: {
  location: NonNullable<LocationDetail>["location"];
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <SectionHeader title="Branch profile" />
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <InfoRow label="Name" value={location.name} />
          <InfoRow
            label="Status"
            value={location.is_active ? "Active" : "Inactive"}
          />
          <InfoRow
            label="Address"
            value={location.address || "Not set"}
          />
          <InfoRow
            label="Timezone"
            value={location.timezone || "Workspace default"}
          />
          <InfoRow
            label="Geofence"
            value={
              location.geofence_enabled
                ? `On · ${location.radius_m ?? "—"}m radius`
                : "Off"
            }
          />
          <InfoRow
            label="Coordinates"
            value={
              location.latitude != null && location.longitude != null
                ? `${location.latitude}, ${location.longitude}`
                : "Not set"
            }
          />
        </dl>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
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
                  ev.location_mismatch && "rounded-md bg-red-50 px-2 dark:bg-red-950/30",
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
          title="Open related pages"
          subtitle="Filtered to this branch where supported"
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
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-6 w-20" />
              <Skeleton className="mt-2 h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-10 w-80" />
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
