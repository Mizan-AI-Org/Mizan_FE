import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { ClipboardList, Loader2, Clock, Users } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueries } from "@tanstack/react-query";
import { logError } from "@/lib/logging";
import { deriveSignatureMeta, SignatureMeta } from "@/lib/checklists/signature";
import { formatAssignees, detectNewAssignments } from "@/lib/tasks/assignees";
import type { AssignedShape } from "@/lib/tasks/assignees";
import type { StaffProfileItem } from "@/lib/types";

type ChecklistExecutionItem = {
  id: string;
  status?: string;
  started_at?: string | null;
  completed_at?: string | null;
  due_date?: string | null;
  priority?: string | null;
  template?: { id: string; name: string; description?: string };
  assigned_to?: string | { id?: string; name?: string } | Array<{ id?: string; name?: string }> | null;
};

type TemplateStep = {
  id?: string;
  title?: string;
  name?: string;
  estimatedSeconds?: number;
  dependsOn?: string[] | string | undefined;
  priority?: string | null;
  category?: { department?: string; project?: string; function?: string } | null;
};

type ExecutionDetails = {
  id: string;
  priority?: string | null;
  template?: {
    name?: string;
    description?: string;
    category?: { department?: string; project?: string; function?: string } | null;
    steps?: TemplateStep[];
  };
};

type TaskNode = {
  id: string;
  title: string;
  dependsOn: string[];
  estimatedSeconds?: number;
  priority?: string | null;
  categoryLabel?: string;
  completed: boolean;
};

const statusOptions = [
  { key: "", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "COMPLETED", label: "Completed" },
  { key: "OVERDUE", label: "Overdue" },
];

const MyChecklistsPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, accessToken } = useAuth();
  const [status, setStatus] = useState<string>("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState<number>(1);
  const [sortBy, setSortBy] = useState<"due" | "priority" | "status">("due");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [assignedFilter, setAssignedFilter] = useState<string>("");
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<Record<string, boolean>>({});
  const pageSize = 12;
  const token = accessToken || localStorage.getItem("access_token") || undefined;
  const userId = user?.id ? String(user?.id) : undefined;

  const { data: myChecklistsData, isFetching: loadingChecklists } = useQuery<ChecklistExecutionItem[], Error>({
    queryKey: ["my-checklists", { status, page, pageSize }],
    queryFn: async () => {
      try {
        const resp = await api.getMyChecklists({ status: status || undefined, page, page_size: pageSize });
        const raw = Array.isArray(resp) ? resp : (resp.results || []);
        return (raw as ChecklistExecutionItem[]) || [];
      } catch (e) {
        // Log and rethrow so the query reflects an error state without custom callbacks
        logError({ feature: "my-checklists", action: "fetch" }, e);
        throw e as Error;
      }
    },
    refetchInterval: 15000,
    staleTime: 60 * 1000,
  });

  // Fetch staff profiles early; we need them to resolve the correct assigned identifier
  const staffProfilesQuery = useQuery<StaffProfileItem[], Error>({
    enabled: Boolean(token),
    queryKey: ["staff-profiles"],
    queryFn: async () => {
      try {
        return await api.getStaffProfiles(String(token));
      } catch (e) {
        logError({ feature: "staff-profiles", action: "fetch" }, e);
        throw e as Error;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
  const staffProfiles = staffProfilesQuery.data;

  // Use the authenticated user id for shift-task assignment filtering
  const assignedUserId = useMemo(() => {
    return userId ? String(userId) : "";
  }, [userId]);

  const { data: tasksAsChecklistsData, isFetching: loadingTasksAsChecklists, error: tasksError } = useQuery<ChecklistExecutionItem[], Error>({
    enabled: Boolean(token && assignedUserId),
    queryKey: ["assigned-tasks-as-checklists", { assignedUserId, status }],
    queryFn: async () => {
      try {
        const tasksAsChecklists = await api.getAssignedTasksAsChecklists(String(token), String(assignedUserId), status || undefined);
        const enriched = tasksAsChecklists.map((t) => ({
          id: t.execution_id,
          status: t.status,
          started_at: undefined,
          completed_at: undefined,
          due_date: t.due_date || undefined,
          priority: t.priority || null,
          template: t.template || { id: t.task_id, name: t.title, description: t.description },
          assigned_to: (t.assigned_to ?? null) as AssignedShape,
        })) as ChecklistExecutionItem[];
        return enriched;
      } catch (e) {
        logError({ feature: "assigned-tasks", action: "fetch-as-checklists" }, e);
        throw e as Error;
      }
    },
    refetchInterval: 15000,
    staleTime: 60 * 1000,
  });

  const staffNameById: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    const list = Array.isArray(staffProfiles) ? staffProfiles : [];
    for (const p of list) {
      const ud = p?.user_details;
      const first = (ud?.first_name || "").trim();
      const last = (ud?.last_name || "").trim();
      const email = (ud?.email || "").trim();
      const name = (first || last) ? `${first} ${last}`.trim() : (email || "Unknown");

      const userId = String(ud?.id || "").trim();
      const profileId = String(p?.id || "").trim();

      if (userId && name) map[userId] = name;
      if (profileId && name) map[profileId] = name;
    }
    return map;
  }, [staffProfiles]);

  // Merge and de-duplicate by execution id, then filter
  const mergedItems = useMemo(() => {
    const baseItems: ChecklistExecutionItem[] = Array.isArray(myChecklistsData) ? (myChecklistsData as ChecklistExecutionItem[]) : [];
    const enriched: ChecklistExecutionItem[] = Array.isArray(tasksAsChecklistsData) ? (tasksAsChecklistsData as ChecklistExecutionItem[]) : [];
    const mergedMap = new Map<string, ChecklistExecutionItem>();
    [...baseItems, ...enriched].forEach((it) => {
      if (it?.id) mergedMap.set(String(it.id), it);
    });
    return Array.from(mergedMap.values());
  }, [myChecklistsData, tasksAsChecklistsData]);

  // Notification for new assignments
  useEffect(() => {
    try {
      const ASSIGNED_SEEN_KEY = "checklist_assigned_seen_v1";
      const raw = localStorage.getItem(ASSIGNED_SEEN_KEY);
      const seen = new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
      const currentIds = (Array.isArray(tasksAsChecklistsData) ? tasksAsChecklistsData : []).map((i) => String(i.id));
      const unseen = detectNewAssignments(seen, currentIds);
      if (unseen.length > 0) {
        toast({
          title: "New assignments",
          description: `${unseen.length} new task${unseen.length > 1 ? "s" : ""} assigned to you`,
        });
        const updated = Array.from(new Set([...Array.from(seen.values()), ...currentIds]));
        localStorage.setItem(ASSIGNED_SEEN_KEY, JSON.stringify(updated));
      }
    } catch {/* ignore */}
  }, [tasksAsChecklistsData, toast]);

  // Fetch per-execution details to derive signature meta
  const executionDetailQueries = useQueries({
    queries: (mergedItems || []).map((it) => ({
      queryKey: ["checklist-execution", it.id, "signature-meta"],
      queryFn: async () => {
        const exec = await api.getChecklistExecution(String(it.id));
        return deriveSignatureMeta(exec);
      },
      staleTime: 60 * 1000,
      refetchInterval: 30000,
      enabled: !!it?.id,
    })),
  });

  const signatureMetaById: Record<string, SignatureMeta> = useMemo(() => {
    const map: Record<string, SignatureMeta> = {};
    const queriesArr = (executionDetailQueries as unknown as Array<{ data?: SignatureMeta }>);
    queriesArr.forEach((q, idx) => {
      const id = mergedItems[idx]?.id;
      if (!id) return;
      const meta: SignatureMeta = q?.data || { isSigned: false, requiresSignature: false };
      map[String(id)] = meta;
    });
    return map;
  }, [executionDetailQueries, mergedItems]);

  // Fetch full execution details for hierarchical tasks
  const executionDetailsQueries = useQueries({
    queries: (mergedItems || []).map((it) => ({
      queryKey: ["checklist-execution", it.id, "details"],
      queryFn: async () => {
        const exec = await api.getChecklistExecution(String(it.id));
        return exec as ExecutionDetails;
      },
      staleTime: 60 * 1000,
      refetchInterval: 60 * 1000,
      enabled: !!it?.id,
    })),
  });

  // History persistence helpers
  const HISTORY_KEY = "checklist_history_v1";
  type HistoryEntry = { executionId: string; taskId: string; completedAt: string };
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
    } catch {
      return [];
    }
  });

  const saveHistory = (entries: HistoryEntry[]) => {
    setHistory(entries);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
    } catch {/* ignore */}
  };

  const toggleTaskCompletion = (executionId: string, taskId: string, next: boolean) => {
    const keyMatch = (e: HistoryEntry) => e.executionId === executionId && e.taskId === taskId;
    const exists = history.some(keyMatch);
    if (next && exists) return; // prevent duplicate entries
    if (!next && !exists) return; // nothing to remove
    const updated = next
      ? [...history, { executionId, taskId, completedAt: new Date().toISOString() }]
      : history.filter((e) => !keyMatch(e));
    saveHistory(updated);
  };

  const getCompletedTaskIds = (executionId: string) =>
    history.filter((e) => e.executionId === executionId).map((e) => e.taskId);

  // Build hierarchical tasks per execution
  const tasksByExecutionId: Record<string, TaskNode[]> = useMemo(() => {
    const map: Record<string, TaskNode[]> = {};
    const queriesArr = executionDetailsQueries as unknown as Array<{ data?: ExecutionDetails }>;
    queriesArr.forEach((q, idx) => {
      const exec = q?.data;
      const id = mergedItems[idx]?.id ? String(mergedItems[idx]?.id) : undefined;
      if (!exec || !id) return;
      const rawSteps: TemplateStep[] = Array.isArray(exec?.template?.steps) ? (exec?.template?.steps as TemplateStep[]) : [];
      const completedSet = new Set(getCompletedTaskIds(id));
      const categoryBase = exec?.template?.category;
      const nodes: TaskNode[] = rawSteps.map((s, i) => {
        const stepId = String(s?.id || `${id}-step-${i + 1}`);
        const depends = Array.isArray(s?.dependsOn)
          ? (s?.dependsOn as string[]).map(String)
          : s?.dependsOn ? [String(s.dependsOn)] : [];
        const catLabel = categoryBase?.department || categoryBase?.project || categoryBase?.function || (s?.category?.department || s?.category?.project || s?.category?.function) || "General";
        return {
          id: stepId,
          title: String(s?.title || s?.name || `Task ${i + 1}`),
          dependsOn: depends,
          estimatedSeconds: typeof s?.estimatedSeconds === "number" ? s?.estimatedSeconds : undefined,
          priority: s?.priority || exec?.priority || null,
          categoryLabel: catLabel ? String(catLabel) : "General",
          completed: completedSet.has(stepId),
        } as TaskNode;
      });
      map[id] = nodes;
    });
    return map;
  }, [executionDetailsQueries, mergedItems, history]);

  // Derive category options
  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    Object.values(tasksByExecutionId).forEach((tasks) => tasks.forEach((t) => set.add(t.categoryLabel || "General")));
    return ["", ...Array.from(set.values())];
  }, [tasksByExecutionId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = mergedItems.filter((it) => {
      const name = it.template?.name?.toLowerCase() || "";
      const desc = it.template?.description?.toLowerCase() || "";
      const matchesQuery = !q || name.includes(q) || desc.includes(q);
      const matchesPriority = !priorityFilter || String(it.priority || "").toUpperCase() === String(priorityFilter).toUpperCase();
      const tasks = tasksByExecutionId[String(it.id)] || [];
      const matchesCategory = !categoryFilter || tasks.some((t) => String(t.categoryLabel).toLowerCase() === String(categoryFilter).toLowerCase());
      const assignees = formatAssignees(it.assigned_to, staffNameById);
      const matchesAssigned = !assignedFilter || assignees.some((n) => String(n).toLowerCase() === String(assignedFilter).toLowerCase());
      return matchesQuery && matchesPriority && matchesCategory && matchesAssigned;
    });
    const toPriorityRank = (p?: string | null) => {
      const v = String(p || "").toUpperCase();
      return v === "URGENT" ? 3 : v === "HIGH" ? 2 : v === "MEDIUM" ? 1 : 0;
    };
    items.sort((a, b) => {
      if (sortBy === "due") {
        const ad = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        const bd = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        return ad - bd;
      }
      if (sortBy === "priority") {
        return toPriorityRank(b.priority) - toPriorityRank(a.priority);
      }
      const sa = String(a.status || "");
      const sb = String(b.status || "");
      return sa.localeCompare(sb);
    });
    return items;
  }, [mergedItems, query, sortBy, priorityFilter, categoryFilter, tasksByExecutionId]);

  const goRun = (id: string) => navigate(`/staff-dashboard/run-checklist/${id}`);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-50">
            <ClipboardList className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">My Checklists</h2>
          </div>
        </div>
      </div>

      {/* Filters and search removed per simplified staff checklist app */}

      {/* Progress summary header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(() => {
          const counts = filtered.reduce((acc, it) => {
            const s = String(it.status || "PENDING");
            acc.total += 1;
            if (s === "COMPLETED") acc.completed += 1;
            else if (s === "IN_PROGRESS") acc.inprogress += 1;
            else if (s === "OVERDUE") acc.overdue += 1;
            else acc.pending += 1;
            return acc;
          }, { total: 0, pending: 0, inprogress: 0, completed: 0, overdue: 0 });
          const pct = counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0;
          return (
            <>
              <Card className="shadow-sm"><CardContent className="py-3"><div className="text-sm">Total <span className="font-semibold">{counts.total}</span></div></CardContent></Card>
              <Card className="shadow-sm"><CardContent className="py-3"><div className="text-sm">In Progress <span className="font-semibold">{counts.inprogress}</span></div></CardContent></Card>
              <Card className="shadow-sm"><CardContent className="py-3"><div className="text-sm">Completed <span className="font-semibold">{counts.completed}</span></div></CardContent></Card>
              <Card className="shadow-sm"><CardContent className="py-3"><div className="text-sm">Overall Progress <span className="font-semibold">{pct}%</span></div></CardContent></Card>
            </>
          );
        })()}
      </div>

      {/* Dedicated section: Assigned Processes & Tasks (always rendered) */}
      {(() => {
        const count = Array.isArray(tasksAsChecklistsData) ? tasksAsChecklistsData.length : 0;
        return (
          <div className="space-y-2" aria-label="Assigned Processes & Tasks">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Assigned Processes & Tasks</h3>
              <Badge variant="secondary" className="rounded-full">{count}</Badge>
            </div>

            {tasksError ? (
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Failed to load assigned tasks</CardTitle>
                  <CardDescription className="text-sm">{String(tasksError.message || 'Unexpected error')}</CardDescription>
                </CardHeader>
              </Card>
            ) : loadingTasksAsChecklists ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading assigned tasks…
              </div>
            ) : count === 0 ? (
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">No tasks assigned</CardTitle>
                  <CardDescription className="text-sm">You currently have no assigned processes or tasks.</CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(tasksAsChecklistsData || []).map((it) => {
                  const statusLabel = it.status || "PENDING";
                  const name = it.template?.name || "Checklist";
                  const desc = it.template?.description || "";
                  const due = it.due_date ? new Date(it.due_date).toLocaleString() : undefined;
                  const statusColor =
                    statusLabel === "COMPLETED" ? "bg-green-100 text-green-700" :
                    statusLabel === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
                    statusLabel === "OVERDUE" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700";
                  const assignees = formatAssignees(it.assigned_to, staffNameById);
                  return (
                    <Card key={`assigned-${it.id}`} className="shadow-sm">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base truncate">{name}</CardTitle>
                          <Badge className={`rounded-full ${statusColor}`}>{statusLabel.replace(/_/g, ' ')}</Badge>
                        </div>
                        {desc && <CardDescription className="text-xs truncate">{desc}</CardDescription>}
                        <div className="flex flex-wrap items-center gap-2 text-xs mt-1">
                          {it.priority && (<Badge variant="outline" className="rounded-full">{String(it.priority).toUpperCase()}</Badge>)}
                          {due && (
                            <div className="flex items-center gap-1 text-muted-foreground"><Clock className="w-3 h-3" /> {due}</div>
                          )}
                          {assignees.length > 0 && (
                            <div className="flex items-center gap-1"><Users className="w-3 h-3 text-muted-foreground" />
                              <span className="text-muted-foreground">{assignees.join(', ')}</span>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between">
                          <Button variant="secondary" size="sm" onClick={() => goRun(String(it.id))}>Open</Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {loadingChecklists || loadingTasksAsChecklists ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading your checklists…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((it) => {
            const statusLabel = it.status || "PENDING";
            const name = it.template?.name || "Checklist";
            const desc = it.template?.description || "";
            const due = it.due_date ? new Date(it.due_date).toLocaleString() : undefined;
            const started = it.started_at ? new Date(it.started_at).toLocaleString() : undefined;
            const completed = it.completed_at ? new Date(it.completed_at).toLocaleString() : undefined;
            const sigMeta = signatureMetaById[String(it.id)] || { isSigned: false, requiresSignature: false };
            const statusColor =
              statusLabel === "COMPLETED" ? "bg-green-100 text-green-700" :
              statusLabel === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
              statusLabel === "OVERDUE" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700";
            const tasks = tasksByExecutionId[String(it.id)] || [];
            const totalTasks = tasks.length;
            const completedTasks = tasks.filter((t) => t.completed).length;
            const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            const dueSoon = it.due_date ? (new Date(it.due_date).getTime() - Date.now()) < 24 * 60 * 60 * 1000 : false;
            return (
              <Card key={it.id} className="shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base truncate">{name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className={`rounded-full ${statusColor}`}>{statusLabel.replace(/_/g, ' ')}</Badge>
                      {sigMeta.isSigned ? (
                        <Badge className="rounded-full bg-green-100 text-green-700">Signed</Badge>
                      ) : sigMeta.requiresSignature ? (
                        <Badge className="rounded-full bg-amber-100 text-amber-700">Signature Required</Badge>
                      ) : null}
                      {dueSoon && (
                        <Badge className="rounded-full bg-amber-100 text-amber-700">Due Soon</Badge>
                      )}
                    </div>
                  </div>
                  {desc && <CardDescription className="text-xs truncate">{desc}</CardDescription>}
                  {it.priority && (
                    <div className="mt-1">
                      <Badge variant="outline" className="text-[10px]">Priority: {String(it.priority).toUpperCase()}</Badge>
                    </div>
                  )}
                  {(() => {
                    const assignees = formatAssignees(it.assigned_to, staffNameById);
                    return assignees.length > 0 ? (
                      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" /> Assigned: {assignees.join(', ')}
                      </div>
                    ) : null;
                  })()}
                </CardHeader>
                <CardContent className="pt-0" />
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination removed in simplified view */}
    </div>
  );
};

export default MyChecklistsPage;