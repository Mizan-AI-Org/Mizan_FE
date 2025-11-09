import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Clock,
  DollarSign,
  Users,
  CheckCircle2,
  AlertTriangle,
  Info,
  ArrowRight,
  Phone,
  UserPlus,
  Loader2,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";
import type {
  DailyKPI,
  Task,
  Alert,
  StaffProfileItem,
} from "../lib/types";

type KpiItem = {
  label: string;
  value: string | number;
  icon: React.ReactNode;
};

const formatCurrency = (amount?: number) =>
  typeof amount === "number"
    ? new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(amount)
    : "—";

const formatCount = (n?: number) => (typeof n === "number" ? n : "—");

const priorityColor = (p?: Task["priority"]) => {
  switch (p) {
    case "high":
      return "destructive";
    case "medium":
      return "default";
    case "low":
      return "secondary";
    default:
      return "outline";
  }
};

export default function AdminAnalytics() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  // KPIs
  const {
    data: kpis,
    isLoading: kpisLoading,
    isError: kpisError,
  } = useQuery<DailyKPI[]>({
    queryKey: ["dailyKpis"],
    queryFn: () => api.getDailyKpis(token!),
    enabled: !!token,
    refetchInterval: 30_000,
  });

  const kpiItems: KpiItem[] = useMemo(() => {
    const today = kpis?.[0];
    return [
      {
        label: "Revenue Today",
        value: formatCurrency(today?.revenue_today ?? today?.revenue),
        icon: <DollarSign className="h-5 w-5 text-green-600" />,
      },
      {
        label: "Orders",
        value: formatCount(today?.orders_count),
        icon: <Activity className="h-5 w-5 text-blue-600" />,
      },
      {
        label: "Staff Online Now",
        value: formatCount(today?.staff_online_count),
        icon: <Users className="h-5 w-5 text-purple-600" />,
      },
      {
        label: "Avg. Prep Time",
        value:
          typeof today?.avg_prep_time_minutes === "number"
            ? `${today?.avg_prep_time_minutes}m`
            : "—",
        icon: <Clock className="h-5 w-5 text-orange-600" />,
      },
    ];
  }, [kpis]);

  // Tasks
  const {
    data: tasks,
    isLoading: tasksLoading,
    isError: tasksError,
  } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: () => api.getTasks(token!),
    enabled: !!token,
    refetchInterval: 45_000,
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: (vars: { id: string; status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" }) =>
      api.updateTaskStatus(token!, vars.id, vars.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const [reassignTargetId, setReassignTargetId] = useState<number | null>(null);
  const [reassignToStaffId, setReassignToStaffId] = useState<number | null>(null);

  const reassignMutation = useMutation({
    mutationFn: async (vars: { taskId: number; staffId: number }) => {
      // Fallback: use reassignTask if available; otherwise a POST to the API directly.
      if (typeof (api as any).reassignTask === "function") {
        return (api as any).reassignTask(token!, vars.taskId, vars.staffId);
      }
      const resp = await fetch(`/api/tasks/${vars.taskId}/reassign/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ staff_id: vars.staffId }),
      });
      if (!resp.ok) throw new Error("Failed to reassign task");
      return resp.json();
    },
    onSuccess: () => {
      setReassignTargetId(null);
      setReassignToStaffId(null);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  // Alerts
  const {
    data: alerts,
    isLoading: alertsLoading,
    isError: alertsError,
  } = useQuery<Alert[]>({
    queryKey: ["alerts"],
    queryFn: () => api.getAlerts(token!),
    enabled: !!token,
    refetchInterval: 60_000,
  });

  const updateAlertStatusMutation = useMutation({
    mutationFn: (vars: { id: string; is_resolved: boolean }) =>
      api.updateAlertStatus(token!, vars.id, vars.is_resolved),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  // Emergency staff availability
  const [searchTerm, setSearchTerm] = useState("");
  const [hoursWindow, setHoursWindow] = useState<number>(4);

  const {
    data: staffProfiles,
    isLoading: staffLoading,
    isError: staffError,
  } = useQuery<StaffProfileItem[]>({
    queryKey: ["staffProfiles"],
    queryFn: () => api.getStaffProfiles(token!),
    enabled: !!token,
    refetchInterval: 120_000,
  });

  const assignNowMutation = useMutation({
    mutationFn: async (vars: { staffId: number; reason: string }) => {
      // Send an urgent announcement to the selected staff
      return api.createAnnouncement(token!, {
        title: "Urgent Assistance Needed",
        message: vars.reason,
        audience: "specific",
        target_user_ids: [vars.staffId],
        priority: "high",
      });
    },
  });

  const filteredStaff = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!staffProfiles) return [];
    return staffProfiles.filter((s) => {
      const fullName = `${s.user_details?.first_name ?? ""} ${s.user_details?.last_name ?? ""}`.toLowerCase();
      const position = (s.position ?? "").toLowerCase();
      const skillsStr = (s.skills ?? []).join(" ").toLowerCase();
      return (
        fullName.includes(term) || position.includes(term) || skillsStr.includes(term)
      );
    });
  }, [staffProfiles, searchTerm]);

  return (
    <div className="space-y-6">
      {/* AI Insights Banner */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Analytics & Operations Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              AI-generated insights and live operational metrics.
            </p>
            <span className="text-xs text-muted-foreground">
              Last updated: {kpis?.[0]?.updated_at ? new Date(kpis[0].updated_at).toLocaleString() : "—"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpisLoading && (
          <Card className="md:col-span-2 lg:col-span-4">
            <CardContent className="p-6 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading KPIs…</span>
            </CardContent>
          </Card>
        )}
        {kpisError && (
          <Card className="md:col-span-2 lg:col-span-4">
            <CardContent className="p-6 text-destructive">Failed to load KPIs.</CardContent>
          </Card>
        )}
        {!kpisLoading && !kpisError && kpiItems.map((k, idx) => (
          <Card key={idx}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{k.label}</CardTitle>
              {k.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                {k.value}
                {k.label === "Staff Online Now" && (
                  <span className="inline-flex items-center text-xs text-green-600">
                    <span className="h-2 w-2 rounded-full bg-green-600 mr-1 animate-pulse" />
                    Live
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Priority Tasks */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Today's Priority Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tasksLoading && (
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading tasks…
              </div>
            )}
            {tasksError && (
              <div className="text-sm text-destructive">Failed to load tasks.</div>
            )}
            {!tasksLoading && !tasksError && (!tasks || tasks.length === 0) && (
              <div className="text-sm text-muted-foreground">No priority tasks for today.</div>
            )}
            {!tasksLoading && !tasksError && tasks && tasks.length > 0 && (
              <div className="space-y-3">
                {tasks.map((t) => (
                  <div key={t.id} className="flex items-start justify-between rounded-md border p-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={priorityColor(t.priority)}>
                          {t.priority?.toUpperCase() ?? "PRIORITY"}
                        </Badge>
                        <span className="font-medium">{t.title ?? t.name ?? `Task #${t.id}`}</span>
                      </div>
                      {t.due_time && (
                        <div className="text-xs text-muted-foreground">Due: {new Date(t.due_time).toLocaleString()}</div>
                      )}
                      {t.assigned_to_name && (
                        <div className="text-xs text-muted-foreground">Assigned to: {t.assigned_to_name}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => updateTaskStatusMutation.mutate({ id: String(t.id!), status: "COMPLETED" })}
                        disabled={updateTaskStatusMutation.isPending}
                      >
                        Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => updateTaskStatusMutation.mutate({ id: String(t.id!), status: "PENDING" })}
                        disabled={updateTaskStatusMutation.isPending}
                      >
                        Defer
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReassignTargetId((prev) => (prev === t.id ? null : t.id!))}
                      >
                        Reassign
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Inline reassign panel */}
            {reassignTargetId && (
              <div className="rounded-md border p-3 space-y-2">
                <div className="text-sm font-medium">Select staff to reassign</div>
                <div className="flex items-center gap-2">
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={reassignToStaffId ?? ""}
                    onChange={(e) => setReassignToStaffId(Number(e.target.value))}
                  >
                    <option value="">Choose staff…</option>
                    {staffProfiles?.map((s) => (
                      <option key={s.user_details?.id} value={s.user_details?.id ?? 0}>
                        {s.user_details?.first_name} {s.user_details?.last_name} ({s.position ?? "Staff"})
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    onClick={() =>
                      reassignToStaffId &&
                      reassignMutation.mutate({ taskId: reassignTargetId, staffId: reassignToStaffId })
                    }
                    disabled={reassignMutation.isPending || !reassignToStaffId}
                  >
                    Confirm
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setReassignTargetId(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              System Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {alertsLoading && (
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading alerts…
              </div>
            )}
            {alertsError && (
              <div className="text-sm text-destructive">Failed to load alerts.</div>
            )}
            {!alertsLoading && !alertsError && (!alerts || alerts.length === 0) && (
              <div className="text-sm text-muted-foreground">No active alerts.</div>
            )}
            {!alertsLoading && !alertsError && alerts && alerts.length > 0 && (
              <div className="space-y-3">
                {alerts.map((a) => (
                  <div key={a.id} className="flex items-start justify-between rounded-md border p-3">
                    <div className="flex items-start gap-2">
                      {a.severity === "high" ? (
                        <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                      ) : a.severity === "medium" ? (
                        <Info className="h-5 w-5 text-orange-600 mt-0.5" />
                      ) : (
                        <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
                      )}
                      <div>
                        <div className="font-medium">{a.title ?? a.message ?? `Alert #${a.id}`}</div>
                        {a.created_at && (
                          <div className="text-xs text-muted-foreground">
                            {new Date(a.created_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => updateAlertStatusMutation.mutate({ id: String(a.id!), is_resolved: true })}
                        disabled={updateAlertStatusMutation.isPending}
                      >
                        Resolve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Emergency Staff Availability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Emergency Staff Availability
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <input
              className="border rounded px-3 py-2 text-sm flex-1"
              placeholder="Search by name, position, or skill…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="border rounded px-3 py-2 text-sm"
              value={hoursWindow}
              onChange={(e) => setHoursWindow(Number(e.target.value))}
            >
              <option value={2}>Next 2 hours</option>
              <option value={4}>Next 4 hours</option>
              <option value={6}>Next 6 hours</option>
            </select>
          </div>

          {staffLoading && (
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading staff…
            </div>
          )}
          {staffError && (
            <div className="text-sm text-destructive">Failed to load staff profiles.</div>
          )}
          {!staffLoading && !staffError && filteredStaff.length === 0 && (
            <div className="text-sm text-muted-foreground">No matching staff found.</div>
          )}

          {!staffLoading && !staffError && filteredStaff.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredStaff.slice(0, 12).map((s) => (
                <div key={s.user_details?.id} className="rounded-md border p-3 space-y-2">
                  <div className="font-medium">
                    {s.user_details?.first_name} {s.user_details?.last_name}
                  </div>
                  <div className="text-xs text-muted-foreground">{s.position ?? "Staff"}</div>
                  {s.user_details?.phone && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {s.user_details?.phone}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        assignNowMutation.mutate({
                          staffId: s.user_details?.id ?? 0,
                          reason: `Urgent help requested in next ${hoursWindow}h`,
                        })
                      }
                      disabled={assignNowMutation.isPending}
                    >
                      Assign Now
                    </Button>
                    <Button size="sm" variant="outline">
                      Contact
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}