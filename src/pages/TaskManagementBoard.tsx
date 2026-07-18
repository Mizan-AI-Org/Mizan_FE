import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/use-language';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { API_BASE } from "@/lib/api";
import {
  Clock,
  User,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  PlayCircle,
  CalendarClock,
  ListChecks,
  UserCircle,
  Camera,
  Layers,
  CalendarDays,
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AssignedStaff {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string;
}

interface ScheduledTask {
  id: string;
  title: string;
  description: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: string;
  due_date: string | null;
  assigned_to: string[];
  assigned_to_details?: AssignedStaff[];
  assigned_shift?: string | null;
  category?: string | null;
  category_details?: { id: string; name: string; color?: string } | null;
  completed_at?: string | null;
  updated_at?: string;
}

type TaskScopeFilter = "all" | "shift" | "standalone";
type TaskStatusFilter = "all" | "open" | "completed";

interface StaffMetric {
  staff_id: string;
  name: string;
  role: string;
  shift_status: 'ON_SHIFT' | 'BREAK' | 'OFF_SHIFT';
  current_process: {
    name: string;
    progress: number;
  };
  tasks: {
    completed: number;
    total: number;
    overdue: number;
    is_completed: boolean;
    tasks_marked_no?: number;
    follow_up_needed?: boolean;
    photo_evidence_count?: number;
  };
  pace: {
    elapsed_minutes: number;
    avg_minutes: number;
    status: 'GREEN' | 'YELLOW' | 'RED';
  };
  attention: {
    needed: boolean;
    reason: string;
  };
}

function MetricSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="h-7 w-14 rounded bg-slate-200 dark:bg-slate-700" />
    </div>
  );
}

function StaffRowSkeleton() {
  return (
    <div className="p-4 flex flex-col md:flex-row items-center gap-4 md:gap-8 animate-pulse">
      <div className="flex items-center gap-3 w-full md:w-48">
        <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="space-y-2 flex-1">
          <div className="h-3.5 w-28 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
      <div className="flex-1 w-full space-y-2">
        <div className="h-3 w-40 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-2 w-full rounded bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-700" />
    </div>
  );
}

export default function TaskManagementBoard({
  onOpenTemplates,
}: {
  onOpenTemplates?: () => void;
}) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#staff-live-progress") return;
    const el = document.getElementById("staff-live-progress");
    if (!el) return;
    // Wait a tick so the board has painted after lazy route load.
    const id = window.setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(id);
  }, []);

  const [activeProcessesCount, setActiveProcessesCount] = useState(0);
  const [tasksToday, setTasksToday] = useState({ total: 0, completed: 0, ongoing: 0 });
  const [onTimeRate, setOnTimeRate] = useState(0);
  const [onTimeChange, setOnTimeChange] = useState(0);
  const [attentionNeeded, setAttentionNeeded] = useState(0);
  const [staffMetrics, setStaffMetrics] = useState<StaffMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [metricsLoaded, setMetricsLoaded] = useState(false);
  const [allTasks, setAllTasks] = useState<ScheduledTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [scope, setScope] = useState<TaskScopeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>("open");

  const loadLiveBoardMetrics = async () => {
    try {
      const response = await fetch(`${API_BASE}/dashboard/analytics/live_board_metrics/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setActiveProcessesCount(data.active_processes_count ?? 0);
        setTasksToday(data.tasks_today ?? { total: 0, completed: 0, ongoing: 0 });
        setOnTimeRate(data.on_time_rate ?? 0);
        setOnTimeChange(data.on_time_change ?? 0);
        setAttentionNeeded(data.attention_needed ?? 0);
      }
    } catch (error) {
      console.error('Failed to load metrics', error);
    } finally {
      setMetricsLoaded(true);
    }
  };

  const loadStaffMetrics = async () => {
    try {
      const response = await fetch(`${API_BASE}/dashboard/analytics/staff_live_metrics/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setStaffMetrics(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to load staff metrics', error);
    }
    setIsLoading(false);
  };

  const loadAllTasks = async () => {
    try {
      const response = await fetch(`${API_BASE}/scheduling/tasks/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        const list = Array.isArray(data) ? data : (data.results ?? []);
        setAllTasks(list as ScheduledTask[]);
      }
    } catch (error) {
      console.error('Failed to load tasks', error);
    } finally {
      setTasksLoading(false);
    }
  };

  useEffect(() => {
    loadLiveBoardMetrics();
    loadStaffMetrics();
    loadAllTasks();
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      loadLiveBoardMetrics();
      loadStaffMetrics();
      loadAllTasks();
    }, 90_000);
    return () => clearInterval(interval);
  }, []);

  const scopeCounts = useMemo(() => {
    const shift = allTasks.filter((t) => !!t.assigned_shift).length;
    const standalone = allTasks.length - shift;
    return { all: allTasks.length, shift, standalone };
  }, [allTasks]);

  const visibleTasks = useMemo(() => {
    return allTasks
      .filter((t) => {
        if (scope === "shift") return !!t.assigned_shift;
        if (scope === "standalone") return !t.assigned_shift;
        return true;
      })
      .filter((t) => {
        if (statusFilter === "open") return t.status !== "COMPLETED" && t.status !== "CANCELLED";
        if (statusFilter === "completed") return t.status === "COMPLETED";
        return true;
      })
      .sort((a, b) => {
        const rank: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        const pa = rank[a.priority] ?? 4;
        const pb = rank[b.priority] ?? 4;
        if (pa !== pb) return pa - pb;
        const da = a.due_date ? a.due_date : "9999-12-31";
        const db = b.due_date ? b.due_date : "9999-12-31";
        return da.localeCompare(db);
      });
  }, [allTasks, scope, statusFilter]);

  const priorityChip = (p: ScheduledTask["priority"]) => {
    switch (p) {
      case "URGENT":
        return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";
      case "HIGH":
        return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
      case "LOW":
        return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
      default:
        return "bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300";
    }
  };

  const statusChip = (s: string) => {
    const norm = (s || "").toUpperCase();
    if (norm === "COMPLETED")
      return { cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300", label: "Done" };
    if (norm === "IN_PROGRESS")
      return { cls: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300", label: "In progress" };
    if (norm === "CANCELLED")
      return { cls: "bg-slate-100 text-slate-500 line-through dark:bg-slate-800 dark:text-slate-400", label: "Cancelled" };
    return { cls: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300", label: "Not started" };
  };

  const formatAssignees = (task: ScheduledTask): string => {
    if (task.assigned_to_details && task.assigned_to_details.length > 0) {
      const names = task.assigned_to_details
        .map((s) => `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.email || "")
        .filter(Boolean);
      if (names.length === 1) return names[0];
      if (names.length > 1) return `${names[0]} +${names.length - 1}`;
    }
    return "Unassigned";
  };

  const formatDue = (iso: string | null): string => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return iso;
    }
  };

  const getPaceColor = (status: string) => {
    switch (status) {
      case 'GREEN': return 'text-emerald-500';
      case 'YELLOW': return 'text-amber-500';
      case 'RED': return 'text-rose-500';
      default: return 'text-slate-500';
    }
  };

  /** True when at least one staff row has live checklist/task progress — hides empty-state chrome. */
  const hasLiveProgress = useMemo(
    () =>
      staffMetrics.some(
        (s) =>
          (s.tasks?.total ?? 0) > 0 ||
          (s.current_process?.progress ?? 0) > 0 ||
          Boolean(s.current_process?.name && !/idle|waiting/i.test(s.current_process.name)),
      ) || staffMetrics.length > 0,
    [staffMetrics],
  );

  const metrics = [
    {
      key: "active",
      label: t("live_board.active_ongoing_processes"),
      value: String(activeProcessesCount),
      subtext: null as string | null,
      change: undefined as number | undefined,
      icon: PlayCircle,
      accent: "text-sky-600 dark:text-sky-400",
      iconBg: "bg-sky-50 dark:bg-sky-950/40",
      alert: false,
    },
    {
      key: "today",
      label: t("live_board.processes_tasks_today"),
      value: `${tasksToday.completed}/${tasksToday.total}`,
      subtext: `${tasksToday.ongoing} ${t("live_board.in_progress")}`,
      change: undefined as number | undefined,
      icon: CheckCircle,
      accent: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
      alert: false,
    },
    {
      key: "ontime",
      label: t("live_board.on_time_rate"),
      value: `${onTimeRate}%`,
      subtext: null as string | null,
      change: onTimeChange,
      icon: Clock,
      accent: "text-teal-700 dark:text-teal-400",
      iconBg: "bg-teal-50 dark:bg-teal-950/40",
      alert: false,
    },
    {
      key: "attention",
      label: t("live_board.attention_needed"),
      value: String(attentionNeeded),
      subtext:
        attentionNeeded === 0
          ? t("live_board.attention_clear")
          : t("live_board.attention_count", { count: attentionNeeded }),
      change: undefined as number | undefined,
      icon: AlertCircle,
      accent: attentionNeeded > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-slate-400",
      iconBg:
        attentionNeeded > 0
          ? "bg-rose-50 dark:bg-rose-950/40"
          : "bg-slate-100 dark:bg-slate-800",
      alert: attentionNeeded > 0,
    },
  ];

  return (
    <div className="h-full flex flex-col space-y-5 w-full">
      {/* Compact metrics strip — one composition, less empty card chrome */}
      <section
        aria-label={t("live_board.metrics_label")}
        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden"
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-slate-100 dark:divide-slate-800">
          {metrics.map((metric) => (
            <div
              key={metric.key}
              className={cn(
                "p-4 sm:p-5 flex items-start justify-between gap-3 min-h-[96px]",
                metric.alert && "bg-rose-50/40 dark:bg-rose-950/20",
              )}
            >
              {!metricsLoaded ? (
                <MetricSkeleton />
              ) : (
                <>
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {metric.label}
                    </p>
                    <div className="flex items-baseline gap-2 mt-1.5">
                      <p
                        className={cn(
                          "text-2xl font-bold tabular-nums text-slate-900 dark:text-white leading-none",
                          metric.alert && "text-rose-700 dark:text-rose-300",
                        )}
                      >
                        {metric.value}
                      </p>
                      {metric.change !== undefined && (
                        <span
                          className={cn(
                            "text-xs font-medium tabular-nums",
                            metric.change >= 0 ? "text-emerald-600" : "text-rose-600",
                          )}
                        >
                          {metric.change > 0 ? "+" : ""}
                          {metric.change}%
                        </span>
                      )}
                    </div>
                    {metric.subtext && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-snug">
                        {metric.subtext}
                      </p>
                    )}
                  </div>
                  <div className={cn("p-2 rounded-lg shrink-0", metric.iconBg)}>
                    <metric.icon className={cn("w-4 h-4", metric.accent)} />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Staff Live Progress — deep-linked from dashboard Staff progress widget */}
      <Card
        id="staff-live-progress"
        className="border border-slate-200 dark:border-slate-700 shadow-none dark:bg-slate-900 flex-1 scroll-mt-24"
      >
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 space-y-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="text-lg font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
                <User className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
                {t("live_board.staff_live_progress")}
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                {t("live_board.staff_live_progress_desc")}
              </p>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium shrink-0 self-start",
                hasLiveProgress
                  ? "border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-300"
                  : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  hasLiveProgress ? "bg-teal-500" : "bg-slate-400",
                )}
              />
              {t("live_board.active_staff", { count: staffMetrics.length })}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              <StaffRowSkeleton />
              <StaffRowSkeleton />
            </div>
          ) : hasLiveProgress ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {staffMetrics.map((staff) => (
                <div
                  key={staff.staff_id}
                  className="p-4 flex flex-col md:flex-row md:items-center gap-4 md:gap-6 hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3 w-full md:w-52 shrink-0">
                    <Avatar className="h-10 w-10 border border-slate-200 dark:border-slate-700">
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${staff.name}`} />
                      <AvatarFallback>{staff.name.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h4
                        className="font-semibold text-sm text-slate-900 dark:text-white truncate"
                        title={staff.name}
                      >
                        {staff.name}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="truncate">{staff.role}</span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full shrink-0" />
                        <span
                          className={cn(
                            "font-medium shrink-0",
                            staff.shift_status === 'ON_SHIFT' ? "text-emerald-600" : "text-amber-600",
                          )}
                        >
                          {staff.shift_status === 'ON_SHIFT' ? t("live_board.on_shift") : staff.shift_status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 w-full md:min-w-[180px]">
                    <div className="flex justify-between items-center mb-1.5 gap-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                        {staff.current_process.name}
                      </span>
                      <span className="text-xs font-semibold tabular-nums text-slate-500 shrink-0">
                        {staff.current_process.progress}%
                      </span>
                    </div>
                    <Progress value={staff.current_process.progress} className="h-1.5" />
                  </div>

                  <div className="w-full md:w-auto flex flex-wrap items-center gap-3 text-sm">
                    <div
                      className="flex items-center gap-2"
                      title={`${staff.tasks.completed} out of ${staff.tasks.total} tasks completed`}
                    >
                      {staff.tasks.is_completed ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <span className="text-slate-400 font-mono tracking-wider text-[10px]">
                          {t("live_board.tasks_label")}
                        </span>
                      )}
                      <span className="font-semibold tabular-nums">
                        {staff.tasks.completed}/{staff.tasks.total}
                      </span>
                    </div>
                    {staff.tasks.overdue > 0 && (
                      <div className="flex items-center gap-1.5 text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md dark:bg-rose-900/20">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span className="font-medium text-xs">{staff.tasks.overdue} overdue</span>
                      </div>
                    )}
                    {(staff.tasks.tasks_marked_no ?? 0) > 0 && (
                      <div
                        className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md dark:bg-amber-900/20"
                        title="Tasks marked No — follow-up"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span className="font-medium text-xs">{staff.tasks.tasks_marked_no} No</span>
                      </div>
                    )}
                    {(staff.tasks.photo_evidence_count ?? 0) > 0 && (
                      <div
                        className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300"
                        title={t("live_board.photo_evidence")}
                      >
                        <Camera className="w-3.5 h-3.5 text-teal-600" />
                        <span className="tabular-nums font-medium">{staff.tasks.photo_evidence_count}</span>
                      </div>
                    )}
                  </div>

                  <div className="w-full md:w-28 flex items-center gap-2 text-sm whitespace-nowrap">
                    <Clock className={cn("w-4 h-4", getPaceColor(staff.pace.status))} />
                    <div>
                      <span className="font-semibold tabular-nums">{staff.pace.elapsed_minutes} min</span>
                      <span className="text-xs text-slate-400 ml-1">
                        (avg {staff.pace.avg_minutes})
                      </span>
                    </div>
                  </div>

                  <div className="w-full md:w-36 flex md:justify-end">
                    {staff.attention.needed ? (
                      <div className="flex items-center gap-1.5 text-rose-600 text-sm font-medium">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span className="truncate">{staff.attention.reason || t("live_board.behind_schedule")}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium opacity-80">
                        <CheckCircle className="w-4 h-4" />
                        <span>{t("common.all_good")}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <div className="relative mb-5">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-teal-100/80 to-emerald-50/40 dark:from-teal-950/50 dark:to-slate-900 blur-xl" />
                <div className="relative w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm">
                  <User className="w-7 h-7 text-teal-600 dark:text-teal-400" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1.5">
                {t("live_board.no_active_shifts")}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
                {t("live_board.no_active_shifts_help")}
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                {onOpenTemplates && (
                  <Button
                    type="button"
                    className="premium-button"
                    onClick={onOpenTemplates}
                  >
                    <Layers className="w-4 h-4 mr-2" />
                    {t("live_board.cta_templates")}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/dashboard/scheduling")}
                >
                  <CalendarDays className="w-4 h-4 mr-2" />
                  {t("live_board.cta_scheduling")}
                </Button>
              </div>
              <ol className="mt-8 grid gap-3 sm:grid-cols-3 text-left w-full max-w-2xl">
                {[
                  t("live_board.howto_1"),
                  t("live_board.howto_2"),
                  t("live_board.howto_3"),
                ].map((step, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 px-3 py-3"
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-400">
                      {t("live_board.step_n", { n: i + 1 })}
                    </span>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-snug">
                      {step}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Tasks */}
      <Card className="border border-slate-200 dark:border-slate-700 shadow-none dark:bg-slate-900">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex flex-col gap-4">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
                <ListChecks className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                {t("live_board.all_tasks") ?? "All Tasks"}
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                {t("live_board.all_tasks_desc") ??
                  "Every task assigned to staff — both shift-attached and standalone."}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
              <div
                className="inline-flex flex-wrap items-center gap-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-0.5"
                role="group"
                aria-label={t("live_board.scope_all")}
              >
                {([
                  { key: "all" as const, label: t("live_board.scope_all") ?? "All", count: scopeCounts.all, icon: ListChecks },
                  { key: "shift" as const, label: t("live_board.scope_shift") ?? "Shift-attached", count: scopeCounts.shift, icon: CalendarClock },
                  { key: "standalone" as const, label: t("live_board.scope_standalone") ?? "Standalone", count: scopeCounts.standalone, icon: UserCircle },
                ]).map((opt) => {
                  const Icon = opt.icon;
                  const active = scope === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setScope(opt.key)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                        active
                          ? "bg-white text-teal-800 shadow-sm dark:bg-slate-900 dark:text-teal-300"
                          : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white",
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline sm:inline">{opt.label}</span>
                      <span
                        className={cn(
                          "tabular-nums text-[10px] font-semibold",
                          active ? "text-teal-700 dark:text-teal-400" : "text-slate-400",
                        )}
                      >
                        {opt.count}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div
                className="inline-flex flex-wrap items-center gap-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-0.5"
                role="group"
                aria-label={t("live_board.status_all")}
              >
                {([
                  { key: "open" as const, label: t("live_board.status_open") ?? "Open" },
                  { key: "completed" as const, label: t("live_board.status_completed") ?? "Completed" },
                  { key: "all" as const, label: t("live_board.status_all") ?? "All statuses" },
                ]).map((opt) => {
                  const active = statusFilter === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setStatusFilter(opt.key)}
                      className={cn(
                        "inline-flex items-center rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                        active
                          ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                          : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white",
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {tasksLoading ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              {t("live_board.loading_tasks") ?? "Loading tasks…"}
            </div>
          ) : visibleTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                <ListChecks className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                {t("live_board.no_tasks") ?? "No tasks to show"}
              </h3>
              <p className="text-sm text-slate-500 max-w-sm mb-4">
                {t("live_board.no_tasks_desc") ??
                  "Create a task from the Scheduling board or ask Miya to assign one."}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate("/dashboard/scheduling")}
              >
                <CalendarDays className="w-4 h-4 mr-2" />
                {t("live_board.cta_scheduling")}
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {visibleTasks.map((task) => {
                const stat = statusChip(task.status);
                const isShift = !!task.assigned_shift;
                const assigneeLabel = formatAssignees(task);
                const first = task.assigned_to_details?.[0];
                const initials = first
                  ? `${(first.first_name ?? "").charAt(0)}${(first.last_name ?? "").charAt(0)}`.toUpperCase() || "?"
                  : "?";
                return (
                  <li key={task.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/dashboard/scheduling?task=${task.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          navigate(`/dashboard/scheduling?task=${task.id}`);
                        }
                      }}
                      className="group flex items-center gap-3 sm:gap-4 px-4 py-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    >
                      <Avatar className="h-9 w-9 border border-slate-200 dark:border-slate-700 shrink-0">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(assigneeLabel)}`} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span
                            className="truncate text-sm font-semibold text-slate-900 dark:text-white max-w-full"
                            title={task.title}
                          >
                            {task.title}
                          </span>
                          <span
                            className={cn(
                              "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                              priorityChip(task.priority),
                            )}
                          >
                            {task.priority}
                          </span>
                          <span
                            className={cn(
                              "shrink-0 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                              isShift
                                ? "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                            )}
                          >
                            {isShift ? (
                              <>
                                <CalendarClock className="h-3 w-3" />
                                {t("live_board.badge_shift") ?? "Shift"}
                              </>
                            ) : (
                              <>
                                <UserCircle className="h-3 w-3" />
                                {t("live_board.badge_standalone") ?? "Standalone"}
                              </>
                            )}
                          </span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                          <span className="truncate" title={assigneeLabel}>{assigneeLabel}</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDue(task.due_date)}
                          </span>
                          {task.category_details?.name ? (
                            <span className="truncate">· {task.category_details.name}</span>
                          ) : null}
                        </div>
                      </div>

                      <span
                        className={cn(
                          "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
                          stat.cls,
                        )}
                      >
                        {stat.label}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
