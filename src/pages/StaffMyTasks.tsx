import React, { useMemo, useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { api, API_BASE } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ListChecks, Clock, CalendarDays, ChevronRight, Check, X, FileText, Paperclip } from "lucide-react";
import ChecklistExecutor from "@/components/checklist/ChecklistExecutor";
import { toast } from "sonner";
import type { TemplateDefinition, StepDefinition } from "@/types/checklist";

type ChecklistExecutionItem = {
  id: string;
  status?: string;
  started_at?: string | null;
  completed_at?: string | null;
  due_date?: string | null;
  priority?: string | null;
  template?: { id: string; name: string; description?: string } | null;
};

type TemplateStep = {
  id?: string;
  title?: string;
  name?: string;
  estimatedSeconds?: number;
};

type ExecutionDetails = {
  id: string;
  template?: { name?: string; description?: string; steps?: TemplateStep[]; estimated_duration?: number };
  progress_percentage?: number;
  status?: string;
};

type TaskTemplateApi = {
  id: string;
  name: string;
  description?: string;
  template_type?: string;
  frequency?: string;
  tasks?: Array<{ title: string; description?: string; priority?: string; estimated_duration?: number }>;
};

type SuggestedTemplate = {
  id: string;
  name: string;
  description?: string;
  template_type?: string;
  source: "CHECKLIST" | "TASK";
  tasks?: TaskTemplateApi["tasks"];
};

const StaffMyTasks: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const token = localStorage.getItem("access_token") || "";

  const pageSize = 50;

  type MyChecklistsResp = ChecklistExecutionItem[] | { results: ChecklistExecutionItem[] };
  const { data: myChecklists } = useQuery<MyChecklistsResp>({
    enabled: Boolean(token),
    queryKey: ["staff-my-checklists"],
    queryFn: async () => {
      return await api.getMyChecklists({ page: 1, page_size: pageSize });
    },
    refetchInterval: 15000,
    staleTime: 60 * 1000,
  });

  const userRaw = localStorage.getItem("user");
  const user = userRaw ? JSON.parse(userRaw) as { id?: string } : null;
  const assignedUserId = user?.id ? String(user.id) : "";

  const { data: tasksAsChecklists } = useQuery<ChecklistExecutionItem[]>({
    enabled: Boolean(token && assignedUserId),
    queryKey: ["staff-assigned-tasks-as-checklists", assignedUserId],
    queryFn: async () => {
      const rows = await api.getAssignedTasksAsChecklists(String(token), String(assignedUserId));
      return rows.map((t) => ({
        id: t.execution_id,
        status: t.status,
        due_date: t.due_date || null,
        priority: t.priority || null,
        template: t.template || { id: t.task_id, name: t.title, description: t.description },
      })) as ChecklistExecutionItem[];
    },
    refetchInterval: 15000,
    staleTime: 60 * 1000,
  });

  const hasResults = (obj: unknown): obj is { results: ChecklistExecutionItem[] } => {
    return typeof obj === "object" && obj !== null && "results" in (obj as Record<string, unknown>);
  };

  const merged: ChecklistExecutionItem[] = useMemo(() => {
    const base = Array.isArray(myChecklists)
      ? myChecklists
      : hasResults(myChecklists)
        ? myChecklists.results
        : [];
    const extras = Array.isArray(tasksAsChecklists) ? tasksAsChecklists : [];
    const map = new Map<string, ChecklistExecutionItem>();
    [...base, ...extras].forEach((it) => {
      if (it?.id) map.set(String(it.id), it);
    });
    return Array.from(map.values());
  }, [myChecklists, tasksAsChecklists]);

  const detailQueries = useQueries({
    queries: (merged || []).map((it) => ({
      queryKey: ["staff-checklist-exec", it.id, "details"],
      queryFn: async () => api.getChecklistExecution(String(it.id)) as Promise<ExecutionDetails>,
      staleTime: 60 * 1000,
      refetchInterval: 60 * 1000,
      enabled: !!it?.id,
    })),
  });

  type ChecklistTemplate = { id: string; name: string; description?: string; template_type?: string };
  const { data: activeTemplates } = useQuery<ChecklistTemplate[]>({
    enabled: Boolean(token),
    queryKey: ["active-checklist-templates"],
    queryFn: async () => {
      return await api.getChecklistTemplates(String(token), { is_active: true });
    },
    staleTime: 30 * 1000,
    refetchInterval: 15000,
  });

  const { data: taskTemplates } = useQuery<TaskTemplateApi[]>({
    enabled: Boolean(token),
    queryKey: ["active-task-templates"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/scheduling/task-templates/`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        try {
          const err = await response.json();
          throw new Error(String(err?.detail || err?.message || "Failed to load task templates"));
        } catch {
          throw new Error("Failed to load task templates");
        }
      }
      const data = await response.json();
      return Array.isArray(data) ? data : (data?.results || []);
    },
    staleTime: 30 * 1000,
    refetchInterval: 15000,
  });

  const detailsById: Record<string, ExecutionDetails | undefined> = useMemo(() => {
    const map: Record<string, ExecutionDetails | undefined> = {};
    const queriesArr = detailQueries as unknown as Array<{ data?: ExecutionDetails }>;
    queriesArr.forEach((q, idx) => {
      const id = merged[idx]?.id;
      if (!id) return;
      map[String(id)] = q?.data;
    });
    return map;
  }, [detailQueries, merged]);

  const computeStats = (execId: string) => {
    const details = detailsById[execId];
    const steps: TemplateStep[] = Array.isArray(details?.template?.steps) ? (details?.template?.steps as TemplateStep[]) : [];
    const count = steps.length;
    const totalSeconds = steps.reduce((acc, s) => acc + (typeof s.estimatedSeconds === "number" ? s.estimatedSeconds : 0), 0);
    const tmplMinutes = typeof details?.template?.estimated_duration === "number" ? Math.round(details.template.estimated_duration as number) : undefined;
    const minutes = Math.max(1, typeof tmplMinutes === "number" ? tmplMinutes : Math.round(totalSeconds / 60));
    const progress = typeof details?.progress_percentage === "number" ? Math.round(details.progress_percentage) : 0;
    const status = String(details?.status || "");
    return { count, minutes, progress, status };
  };

  const suggestedTemplates = useMemo<SuggestedTemplate[]>(() => {
    const roleRawObj = userRaw ? (JSON.parse(userRaw) as Record<string, unknown>) : {};
    const role = String((roleRawObj?.role as string) || (roleRawObj?.position as string) || "").toUpperCase();
    const cl: ChecklistTemplate[] = Array.isArray(activeTemplates) ? activeTemplates : [];
    const tl: TaskTemplateApi[] = Array.isArray(taskTemplates) ? taskTemplates : [];
    const normalized: SuggestedTemplate[] = [
      ...cl.map((t) => ({ id: String(t.id), name: t.name, description: t.description, template_type: String(t.template_type || "SOP").toUpperCase(), source: "CHECKLIST" })),
      ...tl.map((t) => ({ id: String(t.id), name: t.name, description: t.description || "", template_type: String(t.template_type || "SOP").toUpperCase(), source: "TASK", tasks: t.tasks || [] })),
    ];
    const byType = (t: SuggestedTemplate, types: string[]) => types.includes(String(t?.template_type || "").toUpperCase());
    const byName = (t: SuggestedTemplate, keywords: string[]) => {
      const name = String(t?.name || "").toUpperCase();
      return keywords.some((k) => name.includes(k));
    };
    if (role.includes("CHEF") || role.includes("KITCHEN")) {
      return normalized.filter((t) => byType(t, ["OPENING", "CLOSING", "SOP", "HEALTH", "MAINTENANCE"]) || byName(t, ["KITCHEN", "BACK OF HOUSE", "PREP"]));
    }
    if (role.includes("BAR")) {
      return normalized.filter((t) => byType(t, ["OPENING", "CLOSING", "SOP"]) || byName(t, ["BAR"]));
    }
    if (role.includes("WAITER") || role.includes("FRONT")) {
      return normalized.filter((t) => byType(t, ["OPENING", "CLOSING", "SOP", "CLEANING"]) || byName(t, ["FRONT OF HOUSE", "DINING"]));
    }
    if (role.includes("CLEANER")) {
      return normalized.filter((t) => byType(t, ["CLOSING", "CLEANING", "SAFETY"]) || byName(t, ["CLEAN"]));
    }
    if (role.includes("CASHIER") || role.includes("POS")) {
      return normalized.filter((t) => byType(t, ["OPENING", "CLOSING", "SOP", "COMPLIANCE"]) || byName(t, ["POS", "CASH"]));
    }
    return normalized;
  }, [activeTemplates, taskTemplates, userRaw]);

  const assignTemplateToMe = async (tplId: string, source?: "CHECKLIST" | "TASK", tasks?: TaskTemplateApi["tasks"]) => {
    if (!token || !assignedUserId) return;
    try {
      if (source === "TASK") {
        const steps = Array.isArray(tasks) ? tasks.map((t, idx) => ({ title: String(t.title || "Task"), description: t.description || "", order: idx + 1, is_required: true })) : [];
        const created = await api.createChecklistTemplate(String(token), {
          name: `Checklist · ${tplId}`,
          description: "Converted from task template",
          category: "CHECKLIST",
          steps,
        });
        const newTplId = String(created?.id || created?.template?.id || created?.template_id);
        if (newTplId) {
          const exec = await api.assignChecklistTemplate(String(token), String(newTplId), String(assignedUserId));
          const execId = String(exec?.id || exec?.execution?.id || exec?.execution_id || "");
          if (execId) {
            navigate(`/staff-dashboard/run-checklist/${execId}`);
            return;
          }
        }
      } else {
        const exec = await api.assignChecklistTemplate(String(token), String(tplId), String(assignedUserId));
        const execId = String(exec?.id || exec?.execution?.id || exec?.execution_id || "");
        if (execId) {
          navigate(`/staff-dashboard/run-checklist/${execId}`);
          return;
        }
      }
      queryClient.invalidateQueries({ queryKey: ["staff-my-checklists"] });
      queryClient.invalidateQueries({ queryKey: ["staff-assigned-tasks-as-checklists", assignedUserId] });
      navigate(`/staff-dashboard/my-checklists`);
    } catch (e) {
      return;
    }
  };

  const [autoOpened, setAutoOpened] = useState(false);
  useEffect(() => {
    if (autoOpened) return;
    const params = new URLSearchParams(location.search);
    const auto = String(params.get("auto_open") || "").toLowerCase() === "true";
    const highlightId = params.get("highlight_execution") || "";
    if (!auto) return;
    const found = (merged || []).find((m) => String(m.id) === String(highlightId));
    if (found && String(found.id)) {
      setAutoOpened(true);
      navigate(`/staff-dashboard/run-checklist/${String(found.id)}`);
    }
  }, [location.search, merged, autoOpened, navigate]);

  // Inline checklist expansion state and local persistence
  const [expandedExecId, setExpandedExecId] = useState<string | null>(null);
  const [expandedSuggestedId, setExpandedSuggestedId] = useState<string | null>(null);
  const storageKeyForExec = (id: string) => `inline-checklist:${id}`;
  const storageKeyForTpl = (id: string) => `inline-checklist-tpl:${id}`;

  type LocalStepState = { response?: 'YES' | 'NO' | 'NA'; note?: string; attachments?: Array<{ id: string; type: 'photo' | 'note'; url?: string; note?: string }>; };
  const getLocalExecState = (id: string): Record<string, LocalStepState> => {
    try {
      const raw = localStorage.getItem(storageKeyForExec(id));
      return raw ? (JSON.parse(raw) as Record<string, LocalStepState>) : {};
    } catch (_err) {
      void _err; return {};
    }
  };
  const setLocalExecState = (id: string, next: Record<string, LocalStepState>) => {
    try { localStorage.setItem(storageKeyForExec(id), JSON.stringify(next)); } catch (_err) { void _err; }
  };
  const getLocalTplState = (id: string): Record<string, LocalStepState> => {
    try {
      const raw = localStorage.getItem(storageKeyForTpl(id));
      return raw ? (JSON.parse(raw) as Record<string, LocalStepState>) : {};
    } catch (_err) {
      void _err; return {};
    }
  };
  const setLocalTplState = (id: string, next: Record<string, LocalStepState>) => {
    try { localStorage.setItem(storageKeyForTpl(id), JSON.stringify(next)); } catch (_err) { void _err; }
  };

  const renderInlineSteps = (execId: string) => {
    const details = detailsById[execId];
    type InlineBackendStep = { id?: string | number; title?: string; name?: string; description?: string };
    const rawSteps: InlineBackendStep[] = Array.isArray(details?.template?.steps) ? (details?.template?.steps as InlineBackendStep[]) : [];
    const local = getLocalExecState(execId);
    const total = rawSteps.length;
    const completed = rawSteps.filter(s => (local[String(s.id)]?.response === 'YES' || local[String(s.id)]?.response === 'NA')).length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return (
      <div className="mt-3 border rounded-md overflow-hidden" aria-live="polite">
        <div className="px-3 py-2 bg-muted text-xs flex items-center justify-between">
          <div>Overall Progress</div>
          <div className="text-green-700">{progress}%</div>
        </div>
        <div className="px-3 py-2">
          <Progress value={progress} />
          <div className="text-xs text-muted-foreground mt-1">{completed} of {total} tasks completed</div>
        </div>
        <div className="space-y-2 p-3">
          <div className="text-xs text-muted-foreground">Step preview unavailable</div>
        </div>
      </div>
    );
  };

  // Template preview renderer (lightweight, avoids inline edit actions)
  const renderInlineTemplatePreview = (tpl: { id: string; tasks?: { title?: string; description?: string }[] }) => {
    const sid = String(tpl.id);
    const local = getLocalTplState(sid);
    const items = Array.isArray(tpl.tasks) ? tpl.tasks : [];
    const total = items.length;
    const completed = items.filter((_t, i) => {
      const st = (local[String(i + 1)] || {}) as { response?: 'YES' | 'NO' | 'NA' };
      return st.response === 'YES' || st.response === 'NA';
    }).length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return (
      <div className="mt-3 border rounded-md overflow-hidden">
        <div className="px-3 py-2 bg-muted text-xs flex items-center justify-between"><div>Overall Progress</div><div className="text-green-700">{progress}%</div></div>
        <div className="px-3 py-2"><Progress value={progress} /><div className="text-xs text-muted-foreground mt-1">{completed} of {total} tasks completed</div></div>
      </div>
    );
  };





















  const [isFullScreen, setIsFullScreen] = useState(false);
  const [fullIndex, setFullIndex] = useState<number>(0);
  const [fullTemplate, setFullTemplate] = useState<TemplateDefinition | null>(null);
  const [fullMode, setFullMode] = useState<"exec" | "template">("exec");
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const [fullTemplateId, setFullTemplateId] = useState<string | null>(null);
  const execList: ChecklistExecutionItem[] = useMemo(() => merged || [], [merged]);

  interface BackendStep {
    id?: string | number;
    title?: string;
    description?: string | null;
    order?: number | null;
    measurement_type?: string | null;
    measurement_unit?: string | null;
    min_value?: number | null;
    max_value?: number | null;
    requires_photo?: boolean | null;
    requires_signature?: boolean | null;
  }

  const mapExecutionToTemplate = React.useCallback((data: unknown): TemplateDefinition | null => {
    const t = (data as { template?: { id: string; name: string; description?: string | null; template_type?: string | null; steps?: BackendStep[] } })?.template;
    if (!t) return null;
    const stepsSource: BackendStep[] = Array.isArray(t.steps) ? t.steps : [];
    const steps: StepDefinition[] = stepsSource
      .sort((a, b) => ((a.order ?? 0) - (b.order ?? 0)))
      .map((s, idx) => {
        let measurements: StepDefinition["measurements"] | undefined;
        if (s.measurement_type) {
          let thresholdType: "min" | "max" | "range" | undefined;
          const min = s.min_value ?? undefined;
          const max = s.max_value ?? undefined;
          if (min != null && max != null) thresholdType = "range";
          else if (min != null) thresholdType = "min";
          else if (max != null) thresholdType = "max";
          measurements = [{ label: s.measurement_type || "", unit: s.measurement_unit || undefined, min, max, thresholdType }];
        }
        return {
          id: String(s.id || idx + 1),
          title: s.title || `Step ${idx + 1}`,
          instruction: s.description ?? undefined,
          requiresPhoto: !!s.requires_photo,
          requiresSignature: !!s.requires_signature,
          measurements,
          estimatedSeconds: undefined,
        } as StepDefinition;
      });
    return { id: t.id, name: t.name, description: t.description ?? undefined, steps, category: t.template_type || undefined };
  }, []);

  const openFullScreenByExec = async (execId: string) => {
    setFullMode("exec");
    setIsFullScreen(true);
    const idx = execList.findIndex((e) => String(e.id) === String(execId));
    setFullIndex(idx >= 0 ? idx : 0);
    try {
      const data = await api.getChecklistExecution(String(execId));
      const templ = mapExecutionToTemplate(data);
      setFullTemplate(templ);
    } catch {
      setFullTemplate(null);
    }
  };

  const openFullScreenBySuggested = (tpl: SuggestedTemplate) => {
    setFullMode("template");
    setIsFullScreen(true);
    setFullTemplateId(String(tpl.id));
    setFullTemplate(null);
  };

  type TaskTemplateTaskDetail = {
    title?: string;
    description?: string;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    estimated_duration?: number;
    requires_photo?: boolean;
    requires_signature?: boolean;
    instructions?: string;
    process_name?: string;
  };
  type TaskTemplateDetail = {
    id: string;
    name: string;
    description?: string;
    template_type?: string;
    frequency?: string;
    priority_level?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    is_active?: boolean;
    is_critical?: boolean;
    tasks?: TaskTemplateTaskDetail[];
    processes?: Array<{ name?: string; tasks?: TaskTemplateTaskDetail[] }>;
  };

  const mapTaskTemplateToDefinition = React.useCallback((tpl: TaskTemplateDetail): TemplateDefinition => {
    const flatFromProcesses: TaskTemplateTaskDetail[] = Array.isArray(tpl.processes)
      ? tpl.processes.flatMap((p) => (Array.isArray(p.tasks) ? p.tasks.map((t) => ({ ...t, process_name: p.name || undefined })) : []))
      : [];
    const sourceTasks: TaskTemplateTaskDetail[] = flatFromProcesses.length > 0 ? flatFromProcesses : (Array.isArray(tpl.tasks) ? tpl.tasks : []);
    const steps: StepDefinition[] = sourceTasks.map((t, idx) => ({
      id: String(idx + 1),
      title: String(t.title || `Step ${idx + 1}`),
      instruction: t.instructions || t.description || undefined,
      requiresPhoto: !!t.requires_photo,
      requiresSignature: !!t.requires_signature,
      estimatedSeconds: typeof t.estimated_duration === "number" ? Math.round(t.estimated_duration * 60) : undefined,
      measurements: undefined,
    }));
    return { id: tpl.id, name: tpl.name, description: tpl.description || undefined, steps, category: tpl.template_type || undefined };
  }, []);

  const { data: fullTplDetail, isFetching: fullTplFetching, error: fullTplError } = useQuery<TaskTemplateDetail>({
    enabled: isFullScreen && fullMode === "template" && Boolean(fullTemplateId) && Boolean(token),
    queryKey: ["task-template-detail", fullTemplateId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/scheduling/task-templates/${String(fullTemplateId)}/`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(String((data as Record<string, unknown>)?.detail || (data as Record<string, unknown>)?.message || "Failed to load template"));
      }
      return await response.json();
    },
    refetchInterval: 10000,
    staleTime: 0,
  });

  useEffect(() => {
    if (fullTplDetail && fullMode === "template") {
      const def = mapTaskTemplateToDefinition(fullTplDetail);
      setFullTemplate(def);
    }
  }, [fullTplDetail, fullMode, mapTaskTemplateToDefinition]);

  const navigateFull = React.useCallback(async (direction: -1 | 1) => {
    const next = Math.max(0, Math.min(execList.length - 1, fullIndex + direction));
    setFullIndex(next);
    const target = execList[next]?.id ? String(execList[next].id) : "";
    if (!target) return;
    try {
      const data = await api.getChecklistExecution(target);
      const templ = mapExecutionToTemplate(data);
      setFullTemplate(templ);
    } catch {
      setFullTemplate(null);
    }
  }, [execList, fullIndex, mapExecutionToTemplate]);

  // Keyboard and touch navigation for full-screen
  useEffect(() => {
    if (!isFullScreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsFullScreen(false); return; }
      if (e.key === 'ArrowLeft') navigateFull(-1);
      if (e.key === 'ArrowRight') navigateFull(1);
    };
    window.addEventListener('keydown', handler);
    closeBtnRef.current?.focus();
    return () => window.removeEventListener('keydown', handler);
  }, [isFullScreen, fullIndex, navigateFull]);

  useEffect(() => {
    const onPop = () => setIsFullScreen(false);
    if (isFullScreen) {
      window.history.pushState({ fullscreen: true }, '', location.pathname + location.search);
      window.addEventListener('popstate', onPop);
      return () => window.removeEventListener('popstate', onPop);
    }
  }, [isFullScreen, location.pathname, location.search]);

  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { setTouchStartX(e.touches[0]?.clientX || null); };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX == null) return;
    const dx = (e.changedTouches[0]?.clientX || touchStartX) - touchStartX;
    if (Math.abs(dx) > 40) navigateFull(dx > 0 ? -1 : 1);
    setTouchStartX(null);
  };

  const inProgress = merged.filter((m) => String(m.status || "").toUpperCase() === "IN_PROGRESS");
  const assigned = merged.filter((m) => {
    const s = String(m.status || "").toUpperCase();
    return s === "PENDING" || s === "NOT_STARTED" || s === "TODO" || s === "";
  });

  const goRun = (id: string) => navigate(`/staff-dashboard/run-checklist/${id}`);

  const badgeForStatus = (s?: string) => {
    const val = String(s || "").toUpperCase();
    const label = val === "IN_PROGRESS" ? "In Progress" : val === "COMPLETED" ? "Completed" : "Not Started";
    const variant = val === "IN_PROGRESS" ? "secondary" : val === "COMPLETED" ? "default" : "outline";
    return <Badge variant={variant} className="text-xs">{label}</Badge>;
  };

  const formatDue = (iso?: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const date = d.toLocaleDateString();
    return isToday ? `Due: Today, ${time}` : `Due: ${date}, ${time}`;
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-50">
          <ListChecks className="w-5 h-5 text-blue-600" />
        </div>
        <h2 className="text-lg font-semibold">My Checklist</h2>
      </div>

      {inProgress.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">In Progress</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {inProgress.map((it) => {
              const stats = computeStats(String(it.id));
              return (
                <Card
                  key={it.id}
                  className="hover:shadow-md transition cursor-pointer active:scale-[.99] relative z-0"
                  onClick={() => openFullScreenByExec(String(it.id))}
                  aria-expanded={expandedExecId === String(it.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{it.template?.name || "Checklist"}</CardTitle>
                        <CardDescription className="text-sm">{it.template?.description || ""}</CardDescription>
                      </div>
                      {badgeForStatus(it.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1 text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span>{stats.progress}%</span>
                      </div>
                      <Progress value={stats.progress} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><ListChecks className="w-3 h-3" /> {stats.count} tasks</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {stats.minutes} min</span>
                      {stats.status === "NOT_STARTED" && (
                        <div className="ml-auto flex items-center justify-end">
                          <button
                            className="text-xs px-2 py-1 rounded border"
                            onClick={(e) => { e.stopPropagation(); api.startChecklistExecution(String(it.id)).then(() => navigate(`/staff-dashboard/run-checklist/${String(it.id)}`)); }}
                          >Start</button>
                        </div>
                      )}
                    </div>
                    {expandedExecId === String(it.id) && (
                      <div className="transition-all duration-300 ease-in-out">
                        {renderInlineSteps(String(it.id))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Assigned to You</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(Array.isArray(suggestedTemplates) ? suggestedTemplates : []).slice(0, 6).map((tpl: SuggestedTemplate) => (
            <Card
              key={tpl.id}
              className="hover:shadow-md transition cursor-pointer active:scale-[.99] relative z-0"
              onClick={() => openFullScreenBySuggested(tpl)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFullScreenBySuggested(tpl); } }}
              role="button"
              tabIndex={0}
              aria-haspopup="dialog"
              aria-controls="fullscreen-card-view"
              aria-expanded={isFullScreen && fullMode === 'template' && fullTemplate?.id === tpl.id}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{tpl.name || "Checklist"}</CardTitle>
                    <CardDescription className="text-sm">{tpl.description || ""}</CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs">{String(tpl.template_type || "SOP")}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xs text-muted-foreground">Tap to preview; use Assign to add</div>
                {expandedSuggestedId === String(tpl.id) && tpl.source === 'TASK' && (
                  <div className="transition-all duration-300 ease-in-out">
                    {renderInlineTemplatePreview(tpl)}
                    <div className="mt-3 flex items-center justify-end">
                      <button
                        className="text-xs px-2 py-1 rounded border"
                        onClick={(e) => { e.stopPropagation(); assignTemplateToMe(String(tpl.id), tpl.source, tpl.tasks); }}
                        aria-label="Assign to me"
                      >Add to My Checklists</button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {Array.isArray(suggestedTemplates) && suggestedTemplates.length === 0 && (
            <Card><CardContent className="py-6 text-sm text-muted-foreground">No suggestions for your role.</CardContent></Card>
          )}
        </div>
      </div>

      {isFullScreen && (
        <div
          id="fullscreen-card-view"
          role="dialog"
          aria-modal="true"
          aria-labelledby="fullscreen-title"
          className="fixed inset-0 z-50 bg-background w-screen h-screen flex flex-col animate-in fade-in zoom-in-95"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className=" top-16 z-10 flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="space-y-0.5">
              {fullMode === 'exec' && (
                <div className="text-sm text-muted-foreground">Checklist {fullIndex + 1} of {execList.length}</div>
              )}
              <div id="fullscreen-title" className="text-base font-semibold">{fullTemplate?.name || 'Checklist'}</div>
              {fullTemplate?.description && (
                <div className="text-xs text-muted-foreground">{fullTemplate.description}</div>
              )}
              {fullMode === 'template' && fullTplFetching && (
                <div className="text-xs text-muted-foreground">Loading latest template…</div>
              )}
              {fullMode === 'template' && fullTplError && (
                <div className="text-xs text-red-600">Failed to load template</div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {fullMode === 'exec' ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => navigateFull(-1)} aria-label="Previous checklist">Prev</Button>
                  <Button variant="outline" size="sm" onClick={() => navigateFull(1)} aria-label="Next checklist">Next</Button>
                </>
              ) : null}
              <Button variant="outline" size="sm" onClick={() => setIsFullScreen(false)} aria-label="Back">Back</Button>
              <Button ref={closeBtnRef} size="sm" onClick={() => setIsFullScreen(false)} aria-label="Close full screen">Close</Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pt-4">
            <div className="max-w-5xl mx-auto p-4 sm:p-6">
              {fullTemplate ? (
                <ChecklistExecutor
                  template={fullTemplate}
                  onSubmit={async (record) => {
                    try {
                      const execId = fullMode === 'exec' ? String(execList[fullIndex]?.id || '') : '';
                      if (!execId) {
                        const msg = 'Cannot submit preview. Please assign this checklist first.';
                        await api.logChecklistSubmissionAttempt(fullTemplate.id, { status: 'FAILED', message: msg, submitter_id: assignedUserId || undefined });
                        toast.error(msg);
                        return;
                      }
                      const validIds = new Set((fullTemplate.steps || []).map((s) => String(s.id)));
                      const badId = record.stepResponses.some((sr) => !sr.stepId || !validIds.has(String(sr.stepId)));
                      if (badId) {
                        const msg = 'Sync failed: invalid step identifiers. Please reload the checklist.';
                        await api.logChecklistSubmissionAttempt(execId, { status: 'FAILED', message: msg, submitter_id: assignedUserId || undefined });
                        toast.error(msg);
                        return;
                      }
                      await api.logChecklistSubmissionAttempt(execId || fullTemplate.id, { status: 'STARTED', message: 'User initiated submission', submitter_id: assignedUserId || undefined });
                      const token = localStorage.getItem('access_token');
                      const step_responses = record.stepResponses.map((sr) => ({
                        step_id: sr.stepId,
                        response: sr.response || undefined,
                        status: sr.response ? 'COMPLETED' : 'PENDING',
                        responded_at: sr.respondedAt || undefined,
                        notes: (sr.evidence || []).find((e) => e.type === 'note')?.note || undefined,
                        measurement_value: sr.measurements && sr.measurements[0] ? sr.measurements[0].value : undefined,
                        measurements: (sr.measurements || []).map(m => ({ label: m.label, unit: m.unit, value: m.value, min: m.min, max: m.max })),
                        evidence: (sr.evidence || []).map(ev => ({ type: ev.type, url: ev.url, note: ev.note })),
                        attachments: (sr.evidence || []).map(ev => ({ type: ev.type, url: ev.url, note: ev.note })),
                      }));
                      const syncRes = await fetch(`${API_BASE}/checklists/executions/${execId}/sync/`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ execution_id: execId, step_responses }),
                      });
                      if (!syncRes.ok) {
                        const err = await syncRes.json().catch(() => ({} as { detail?: string; message?: string }));
                        const msg = err.detail || err.message || 'Sync failed';
                        throw new Error(String(msg));
                      }
                      await api.startChecklistExecution(execId);
                      const total = fullTemplate.steps.length;
                      const completed = record.stepResponses.filter((r) => !!r.response).length;
                      if (completed >= total) {
                        await api.completeChecklistExecution(execId, 'Submitted via My Checklists');
                        await api.notifyChecklistSubmission(execId, { title: `Checklist Submitted: ${fullTemplate.name}`, message: 'Checklist submitted', submitter_id: assignedUserId || undefined });
                        await api.logChecklistSubmissionAttempt(execId, { status: 'COMPLETED', message: 'Submission completed', submitter_id: assignedUserId || undefined });
                      }
                      toast.success('Checklist submitted');
                      setIsFullScreen(false);
                    } catch (_err) {
                      const msg = _err instanceof Error ? _err.message : 'Failed to submit checklist';
                      await api.logChecklistSubmissionAttempt(fullTemplate.id, { status: 'FAILED', message: msg, submitter_id: assignedUserId || undefined });
                      toast.error(msg);
                    }
                  }}
                />
              ) : (
                <div className="text-sm text-muted-foreground">Loading template…</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffMyTasks;