import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
 
import { ClipboardList, Loader2, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueries } from "@tanstack/react-query";
import { logError, logInfo } from "@/lib/logging";
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

interface ShiftTemplate {
  id: string;
  name: string;
  description?: string;
  template_type?: string;
  shift_id: string;
  shift_date: string;
  shift_role: string;
  checklist_template_id?: string;
  execution_id?: string;
  execution_status?: string;
  execution_progress?: number;
}

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
  const [errorDismissed, setErrorDismissed] = useState(false);

  const { data: myChecklistsData, isFetching: loadingChecklists, error: myChecklistsError } = useQuery<ChecklistExecutionItem[], Error>({
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
        logInfo({ feature: "staff-profiles", action: "fetch" }, "profiles unavailable");
        return [] as StaffProfileItem[];
      }
    },
    staleTime: 5 * 60 * 1000,
  });
  const staffProfiles = staffProfilesQuery.data;

  // Use the authenticated user id for shift-task assignment filtering
  const assignedUserId = useMemo(() => {
    return userId ? String(userId) : "";
  }, [userId]);



  // Fetch task templates assigned to user's shifts
  console.log('[MyChecklistsPage] Query setup - token:', !!token, 'user:', !!user, 'enabled:', Boolean(token && user));

  const { data: shiftTemplates, isFetching: loadingShiftTemplates, error: shiftTemplatesError, refetch: refetchTemplates } = useQuery<ShiftTemplate[], Error>({
    enabled: Boolean(token && user),
    queryKey: ["my-shift-templates"],
    queryFn: async () => {
      try {
        const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:8000/api';
        console.log('[MyChecklistsPage] Fetching shift templates from:', `${API_BASE}/scheduling/assigned-shifts-v2/my_shift_templates/`);
        const response = await fetch(`${API_BASE}/scheduling/assigned-shifts-v2/my_shift_templates/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          console.error('[MyChecklistsPage] Failed to fetch shift templates:', response.status, response.statusText);
          throw new Error('Failed to fetch shift templates');
        }
        const data = await response.json();
        console.log('[MyChecklistsPage] Shift templates received:', data);
        console.log('[MyChecklistsPage] Number of templates:', Array.isArray(data) ? data.length : 0);
        return data;
      } catch (e) {
        console.error('[MyChecklistsPage] Error fetching shift templates:', e);
        logError({ feature: "shift-templates", action: "fetch" }, e);
        throw e as Error;
      }
    },
    refetchInterval: 5000, // Refetch every 5 seconds
    staleTime: 0, // Always consider data stale
  });

  console.log('[MyChecklistsPage] Query state - data:', shiftTemplates, 'loading:', loadingShiftTemplates, 'error:', shiftTemplatesError);

  // Debug: Log when shiftTemplates changes
  useEffect(() => {
    console.log('[MyChecklistsPage] shiftTemplates changed:', shiftTemplates);
    if (shiftTemplates) {
      console.log('[MyChecklistsPage] Templates count:', shiftTemplates.length);
      shiftTemplates.forEach((t, i) => {
        console.log(`  [${i}] ${t.name} - checklist_template_id: ${t.checklist_template_id}`);
      });
    }
  }, [shiftTemplates]);

  // Fetch clock-in status
  const { data: sessionData, isFetching: loadingSession } = useQuery({
    queryKey: ["current-session"],
    queryFn: () => api.getCurrentSession(),
    refetchInterval: 30000,
    enabled: Boolean(token && user),
  });

  const handleShiftTemplateClick = async (template: ShiftTemplate) => {
    console.log('[MyChecklistsPage] Template clicked:', template);
    console.log('[MyChecklistsPage] execution_id:', template.execution_id);
    console.log('[MyChecklistsPage] checklist_template_id:', template.checklist_template_id);
    console.log('[MyChecklistsPage] shift_id:', template.shift_id);

    if (template.execution_id) {
      navigate(`/staff-dashboard/run-checklist/${template.execution_id}`);
    } else if (template.checklist_template_id) {
      try {
        console.log('[MyChecklistsPage] Creating execution for template:', template.checklist_template_id, 'shift:', template.shift_id);
        const newExec = await api.createChecklistExecution(template.checklist_template_id, template.shift_id);
        console.log('[MyChecklistsPage] Execution created:', newExec);
        navigate(`/staff-dashboard/run-checklist/${newExec.id}`);
      } catch (e) {
        console.error('[MyChecklistsPage] Failed to create execution:', e);
        console.error('[MyChecklistsPage] Error details:', e instanceof Error ? e.message : String(e));
        toast({ title: "Error", description: "Failed to start checklist", variant: "destructive" });
      }
    } else {
      console.error('[MyChecklistsPage] No checklist_template_id found for template:', template);
      toast({ title: "Error", description: "No checklist template found for this task", variant: "destructive" });
    }
  };

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

  // Notification for new assignments
  // Merge and de-duplicate by execution id, then filter
  const mergedItems = useMemo(() => {
    const baseItems: ChecklistExecutionItem[] = Array.isArray(myChecklistsData) ? (myChecklistsData as ChecklistExecutionItem[]) : [];
    const mergedMap = new Map<string, ChecklistExecutionItem>();
    baseItems.forEach((it) => {
      if (it?.id) mergedMap.set(String(it.id), it);
    });
    return Array.from(mergedMap.values());
  }, [myChecklistsData]);

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
    } catch {/* ignore */ }
  };

  const toggleTaskCompletion = (executionId: string, taskId: string, next: boolean) => {
    const keyMatch = (e: HistoryEntry) => e.executionId === executionId && e.taskId === taskId;
    const exists = history.some(keyMatch);
    if (next && exists) return; // prevent duplicate entries
    if (!next && !exists) return; // nothing to remove
    const updated = next
      ? [...history, { executionId: executionId, taskId: taskId, completedAt: new Date().toISOString() }]
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

  const detailQueries = useQueries({
    queries: (mergedItems || []).map((it) => ({
      queryKey: ["checklist-exec", it.id, "details"],
      queryFn: async () => api.getChecklistExecution(String(it.id)) as Promise<ExecutionDetails>,
      staleTime: 60 * 1000,
      refetchInterval: 60 * 1000,
      enabled: !!it?.id,
    })),
  });

  const detailsById: Record<string, ExecutionDetails | undefined> = useMemo(() => {
    const map: Record<string, ExecutionDetails | undefined> = {};
    const queriesArr = detailQueries as unknown as Array<{ data?: ExecutionDetails }>; // typed narrowing for useQueries
    queriesArr.forEach((q, idx) => {
      const id = mergedItems[idx]?.id;
      if (!id) return;
      map[String(id)] = q?.data;
    });
    return map;
  }, [detailQueries, mergedItems]);

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
      {(() => {
        const err = myChecklistsError || shiftTemplatesError || staffProfilesQuery.error || null;
        if (!err || errorDismissed) return null;
        const src = myChecklistsError ? "checklists" : shiftTemplatesError ? "templates" : staffProfilesQuery.error ? "profiles" : "";
        const raw = String(err.message || "An error occurred while loading data");
        const cleaned = raw.replace(/\s*\(\d{3}\)\s*$/, "");
        const msg = src === "profiles"
          ? "Unable to load staff information right now. You can continue using checklists."
          : src === "templates"
            ? "Unable to load assigned checklists. Please refresh or try again later."
            : cleaned || "Something went wrong. Please try again.";
        return (
          <div className="mb-3 p-3 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm flex items-center justify-between" role="alert" aria-live="polite">
            <span>{msg}</span>
            <button className="ml-3 px-2 py-1 rounded border border-red-300 text-red-700 hover:bg-red-100" onClick={() => setErrorDismissed(true)} aria-label="Dismiss error">Dismiss</button>
          </div>
        );
      })()}
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

      <div className="space-y-4">
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

          {/* NEW: Shift-Assigned Task Templates Section */}
          {(() => {
            const templateCount = Array.isArray(shiftTemplates) ? shiftTemplates.length : 0;
            const isClockedIn = sessionData?.is_clocked_in;
            const showDisabled = !loadingSession && !isClockedIn;

            console.log('[MyChecklistsPage] Rendering templates section:');
            console.log('  - shiftTemplates:', shiftTemplates);
            console.log('  - templateCount:', templateCount);
            console.log('  - loadingShiftTemplates:', loadingShiftTemplates);
            console.log('  - isClockedIn:', isClockedIn);
            console.log('  - showDisabled:', showDisabled);

            return (
              <div className="space-y-2" aria-label="Assigned Checklists from Shifts">
                {showDisabled && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-center text-yellow-800 text-sm">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>You must be clocked in to access your checklists.</span>
                  </div>
                )}

                <div className={showDisabled ? "opacity-50 pointer-events-none grayscale transition-all duration-200" : ""}>
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">Assigned Checklists</h3>
                    <Badge variant="secondary" className="rounded-full">{templateCount}</Badge>
                  </div>

                  {loadingShiftTemplates ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading shift templates…
                    </div>
                  ) : templateCount === 0 ? (
                    <Card className="shadow-sm">
                      <CardContent className="py-8 text-center text-muted-foreground">
                        No checklist assigned yet
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {shiftTemplates?.map((template) => {
                        const statusColor = template.execution_status === "COMPLETED" ? "bg-green-100 text-green-700" :
                          template.execution_status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" : "bg-secondary text-secondary-foreground";
                        const statusLabel = template.execution_status ? template.execution_status.replace(/_/g, ' ') : "Not Started";

                        return (
                          <Card key={`${template.id}-${template.shift_id}`} className="shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleShiftTemplateClick(template)}>
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-base">{template.name}</CardTitle>
                                {template.execution_status && <Badge className={`rounded-full ${statusColor}`}>{statusLabel}</Badge>}
                              </div>
                              {template.description && (
                                <CardDescription className="text-sm line-clamp-2">{template.description}</CardDescription>
                              )}
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-1 text-xs text-muted-foreground">
                                {template.shift_date && (
                                  <div>Shift: {new Date(template.shift_date).toLocaleDateString()}</div>
                                )}
                                {template.shift_role && (
                                  <div>Role: {template.shift_role}</div>
                                )}
                                {template.template_type && (
                                  <Badge variant="outline" className="text-xs">{template.template_type}</Badge>
                                )}
                                {template.execution_progress !== undefined && template.execution_progress > 0 && (
                                  <div className="mt-2">Progress: {template.execution_progress}%</div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
      </div>
    </div >
  );
};

export default MyChecklistsPage;