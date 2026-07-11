import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { api, API_BASE, toAbsoluteUrl } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useNotifications } from "@/hooks/useNotifications";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { logError, logInfo } from "@/lib/logging";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, TrendingUp, Users, ClipboardCheck, AlertTriangle, MapPin, User, Calendar, ShieldAlert } from "lucide-react";
import { TableSkeleton } from "@/components/skeletons";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type SubmittedChecklist = {
  id: string;
  source_type?: 'execution' | 'shift_progress';
  template?: { id: string; name?: string; description?: string; category?: string } | null;
  submitted_by?: { id?: string; name?: string } | null;
  submitted_at?: string | null;
  status?: string | null;
  notes?: string | null;
  compiled_summary?: {
    total_steps?: number;
    completed_steps?: number;
    skipped_steps?: number;
    failed_steps?: number;
    required_missing?: number;
    completion_rate?: number;
    duration_minutes?: number | null;
    evidence_items?: number;
    notes_items?: number;
    signature_items?: number;
    out_of_range_measurements?: number;
    actions_open?: number;
    actions_resolved?: number;
  } | null;
};

type ExecutionAnomaly = {
  step_title?: string;
  value?: string | number;
  issue?: string;
  threshold?: string | number;
};

type ExecutionEvidence = {
  id?: string | number;
  evidence_type?: string;
  filename?: string;
  file_path?: string;
  url?: string;
  caption?: string;
};

type ExecutionStepResponse = {
  id?: string | number;
  step?: { title?: string; description?: string; measurement_unit?: string };
  status?: string;
  is_completed?: boolean;
  text_response?: string;
  measurement_value?: string | number | null;
  boolean_response?: boolean;
  signature_data?: unknown;
  response?: unknown;
  notes?: string | null;
  evidence?: ExecutionEvidence[];
};

type ExecutionAction = {
  id?: string | number;
  title?: string;
  status?: string;
  description?: string;
  priority?: string;
  assigned_to?: { first_name?: string; last_name?: string } | null;
};

type ChecklistExecutionDetail = {
  analysis_results?: {
    summary?: string;
    highlights?: string[];
    anomalies?: ExecutionAnomaly[];
  };
  assigned_shift_info?: {
    shift_date?: string;
    start_time?: string;
    end_time?: string;
    role?: string;
    department?: string;
  } | null;
  step_responses?: ExecutionStepResponse[];
  actions?: ExecutionAction[];
};

const ManagerReviewDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [filterSubmitter, setFilterSubmitter] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterType, setFilterType] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailSourceType, setDetailSourceType] = useState<'execution' | 'shift_progress'>('execution');
  const [reviewComment, setReviewComment] = useState<string>("");

  // Pagination state for Submitted Checklists
  const [checklistPage, setChecklistPage] = useState(1);
  const checklistPageSize = 10;

  // Top-level tab — deep-linkable via ?tab=submitted|incidents so that the
  // dashboard's "Reported Incidents" widget can land directly on the right
  // tab. We keep the URL in sync when the user switches tabs manually so
  // copy-pasting the address bar reproduces what they're looking at.
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = (searchParams.get("tab") || "").toLowerCase();
  const initialTab = tabFromUrl === "incidents" ? "incidents" : "submitted";
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  useEffect(() => {
    const desired = activeTab === "incidents" ? "incidents" : "submitted";
    if (tabFromUrl !== desired) {
      const next = new URLSearchParams(searchParams);
      if (desired === "submitted") next.delete("tab");
      else next.set("tab", desired);
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);
  useEffect(() => {
    const t = (searchParams.get("tab") || "").toLowerCase();
    const desired = t === "incidents" ? "incidents" : "submitted";
    if (desired !== activeTab) setActiveTab(desired);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Incident management state
  const [incidentFilters, setIncidentFilters] = useState({ status: 'open', severity: '', search: '' });
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [assignTo, setAssignTo] = useState<string>('');

  // Pagination state for Incidents
  const [incidentPage, setIncidentPage] = useState(1);
  const incidentPageSize = 10;

  const { data: submitted, isLoading } = useQuery<SubmittedChecklist[]>({
    queryKey: ["manager-submitted-checklists", filterDate, filterSubmitter, filterType],
    queryFn: async () => {
      const url = toAbsoluteUrl(`${API_BASE}/checklists/executions/submitted/`);
      url.searchParams.set("page_size", "200");
      if (filterDate) url.searchParams.set("date", filterDate);
      if (filterSubmitter) url.searchParams.set("submitted_by", filterSubmitter);
      if (filterType) url.searchParams.set("type", filterType);
      const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` }, credentials: "include" });
      if (!res.ok) {
        logInfo({ feature: "manager-review", action: "fetch-submitted" }, `HTTP ${res.status}; using fallback`, { url: url.toString() });
        const my = await api.getMyChecklists({ status: "COMPLETED", page_size: 100 });
        const arr = Array.isArray(my) ? my : (my.results || []);
        const mapped = arr.map((e: { id: string | number; template?: unknown; completed_at?: string | null; updated_at?: string | null; assigned_to?: { id: string | number; first_name?: string; last_name?: string } | null; completion_notes?: string | null }) => {
          const tmplRec = (e.template && typeof e.template === "object") ? (e.template as Record<string, unknown>) : null;
          const template = tmplRec && ("id" in tmplRec)
            ? { id: String(tmplRec.id ?? ""), name: typeof tmplRec.name === "string" ? tmplRec.name : undefined, description: typeof tmplRec.description === "string" ? tmplRec.description : undefined }
            : null;
          return ({
            id: String(e.id),
            template,
            submitted_at: e.completed_at || e.updated_at || null,
            status: "COMPLETED",
            submitted_by: e.assigned_to
              ? { id: String(e.assigned_to.id), name: `${e.assigned_to.first_name || ''} ${e.assigned_to.last_name || ''}`.trim() }
              : null,
            notes: e.completion_notes || null
          });
        });
        logInfo({ feature: "manager-review", action: "fallback-my-checklists" }, `Using ${mapped.length} completed entries`);
        return mapped;
      }
      const data = await res.json();
      try { logInfo({ feature: 'manager-review', action: 'fetch-submitted-ok' }, `Loaded ${(Array.isArray(data) ? data.length : (data?.results?.length || 0))} rows`); } catch { /* ignore */ }
      const isRec = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
      let arr: unknown[] = Array.isArray(data) ? data : (isRec(data) && Array.isArray((data as { results?: unknown }).results) ? ((data as { results: unknown[] }).results) : []);
      if (!arr || arr.length === 0) {
        const fb = toAbsoluteUrl(`${API_BASE}/checklists/executions/`);
        fb.searchParams.set("status", "COMPLETED");
        fb.searchParams.set("page_size", "100");
        const alt = await fetch(fb.toString(), { headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` }, credentials: "include" });
        if (alt.ok) {
          const altJson = await alt.json();
          arr = Array.isArray(altJson) ? altJson : (isRec(altJson) && Array.isArray((altJson as { results?: unknown }).results) ? ((altJson as { results: unknown[] }).results) : []);
          logInfo({ feature: "manager-review", action: "fallback-completed-list" }, `Fetched ${arr.length} entries from completed list`);
        }
      }
      return arr.map((d: unknown) => {
        const itm = (isRec(d) ? d : {}) as Record<string, unknown>;
        const submitterRaw = (itm.submitted_by || itm.assigned_to || itm.assigned_to_info || null) as unknown;
        const submitterRec = isRec(submitterRaw) ? submitterRaw : null;
        const submitterName = submitterRaw
          ? ((submitterRec && typeof submitterRec.name === "string" && submitterRec.name)
            || (submitterRec ? [submitterRec.first_name, submitterRec.last_name].filter(Boolean).join(" ") : "")
            || (submitterRec && typeof submitterRec.username === "string" ? submitterRec.username : "")
            || undefined)
          : undefined;
        const review = (typeof itm.review_status === 'string') ? String(itm.review_status).toUpperCase() : null;
        const approved = typeof itm.supervisor_approved === 'boolean' ? itm.supervisor_approved : null;
        const rawStatus = typeof itm.status === "string" ? itm.status : (typeof itm.completion_status === "string" ? itm.completion_status : null);
        const displayStatus = review || (approved === true ? 'APPROVED' : approved === false ? 'PENDING' : rawStatus);
        const tmplRaw = (itm.template || itm.template_info || null) as unknown;
        const tmplRec = isRec(tmplRaw) ? tmplRaw : null;
        const template = tmplRec && ("id" in tmplRec) ? { id: String(tmplRec.id ?? ""), name: typeof tmplRec.name === "string" ? tmplRec.name : undefined, description: typeof tmplRec.description === "string" ? tmplRec.description : undefined, category: typeof (tmplRec as Record<string, unknown>).category === "string" ? (tmplRec as Record<string, unknown>).category as string : undefined } : null;
        const sourceType = (typeof itm.source_type === "string" && (itm.source_type === "execution" || itm.source_type === "shift_progress")) ? itm.source_type : "execution";
        return {
          id: String(itm.id ?? ""),
          source_type: sourceType,
          template,
          submitted_at: (typeof itm.submitted_at === "string" ? itm.submitted_at : (typeof itm.completed_at === "string" ? itm.completed_at : (typeof itm.updated_at === "string" ? itm.updated_at : null))),
          status: displayStatus,
          submitted_by: submitterRec
            ? {
              id: ("id" in submitterRec) ? String((submitterRec as Record<string, unknown>).id ?? "") : String(itm.assigned_to_id ?? ""),
              name: submitterName,
            }
            : null,
          notes: (typeof itm.notes === "string" ? itm.notes : (typeof itm.completion_notes === "string" ? itm.completion_notes : null)),
          compiled_summary: (itm.compiled_summary || itm.compiled_summary_info || itm.summary || null) as SubmittedChecklist["compiled_summary"],
        } as SubmittedChecklist;
      });
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const { notifications } = useNotifications();

  const managerReviewMutation = useMutation({
    mutationFn: async (vars: { id: string; decision: 'APPROVED' | 'REJECTED'; reason?: string; source_type?: string }) => {
      const isShift = vars.source_type === 'shift_progress';
      const url = isShift
        ? `${API_BASE}/checklists/shift-progress/${vars.id}/manager_review/`
        : `${API_BASE}/checklists/executions/${vars.id}/manager_review/`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("access_token")}` },
        body: JSON.stringify({ decision: vars.decision, reason: vars.reason || "", notes: vars.reason || "" }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { detail?: string; error?: string; message?: string };
        throw new Error(err?.detail || err?.error || err?.message || `Failed to ${vars.decision.toLowerCase()} submission`);
      }
      return res.json();
    },
    onSuccess: async (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["manager-submitted-checklists"] });
      queryClient.invalidateQueries({ queryKey: ["manager-review-detail"] });
      toast.success(variables.decision === 'APPROVED' ? t("toasts.submission_approved") : t("toasts.submission_rejected"));
      try { await api.logAdminAction(String(variables.id), { action: 'MANAGER_REVIEW_DECISION', message: variables.decision }); } catch { /* ignore */ }
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Review failed"),
  });
  const approveMutation = { mutate: (v: { id: string; reason?: string; source_type?: string }) => managerReviewMutation.mutate({ ...v, decision: 'APPROVED' }), isPending: managerReviewMutation.isPending };
  const rejectMutation = { mutate: (v: { id: string; reason?: string; source_type?: string }) => managerReviewMutation.mutate({ ...v, decision: 'REJECTED' }), isPending: managerReviewMutation.isPending };

  const detailQuery = useQuery({
    queryKey: ["manager-review-detail", detailId, detailSourceType],
    enabled: !!detailId,
    queryFn: async () => {
      const id = String(detailId);
      if (detailSourceType === 'shift_progress') {
        const res = await fetch(`${API_BASE}/checklists/shift-progress/${id}/`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to load shift checklist detail");
        return res.json();
      }
      return api.getChecklistExecution(id);
    },
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    const arr = Array.isArray(submitted) ? submitted : [];
    const term = search.trim().toLowerCase();
    return arr.filter(s => {
      const name = String(s.template?.name || "").toLowerCase();
      const submitter = String(s.submitted_by?.name || "").toLowerCase();
      return (!term || name.includes(term) || submitter.includes(term));
    });
  }, [submitted, search]);

  const total = filtered.length;
  const isCompletedLike = useCallback((st: string | null | undefined) => {
    const s = String(st || '').toUpperCase();
    return s === 'COMPLETED' || s === 'APPROVED';
  }, []);
  const completed = filtered.filter(s => isCompletedLike(s.status)).length;
  const completionPct = total ? Math.round((completed / total) * 100) : 0;
  const recentActivity = notifications.filter(n => ['document signed', 'field edited', 'auto save', 'checklist submitted'].includes((n.verb || '').toLowerCase())).slice(0, 8);

  const toYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };

  const [sortBy, setSortBy] = useState<'date' | 'staff' | 'checklist'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [staffFilter, setStaffFilter] = useState('');
  const [trendDays, setTrendDays] = useState<7 | 14 | 30>(14);

  const trendRange = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(end.getDate() - (trendDays - 1));
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }, [trendDays]);

  const trendDaily = useMemo(() => {
    const map = new Map<string, number>();
    const days: string[] = [];
    const cursor = new Date(trendRange.start);
    while (cursor.getTime() <= trendRange.end.getTime()) {
      const key = toYMD(cursor);
      days.push(key);
      map.set(key, 0);
      cursor.setDate(cursor.getDate() + 1);
    }
    filtered.forEach((s) => {
      if (!s.submitted_at) return;
      const d = new Date(s.submitted_at);
      if (Number.isNaN(d.getTime())) return;
      if (d.getTime() < trendRange.start.getTime() || d.getTime() > trendRange.end.getTime()) return;
      const key = toYMD(d);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return days.map((date) => ({ date, count: map.get(date) || 0 }));
  }, [filtered, trendRange]);

  const trendKpis = useMemo(() => {
    const inRange = filtered.filter((s) => {
      if (!s.submitted_at) return false;
      const d = new Date(s.submitted_at);
      if (Number.isNaN(d.getTime())) return false;
      return d.getTime() >= trendRange.start.getTime() && d.getTime() <= trendRange.end.getTime();
    });
    const totalInRange = inRange.length;
    const completedInRange = inRange.filter((s) => isCompletedLike(s.status)).length;
    const uniqueStaff = new Set(inRange.map((s) => String(s.submitted_by?.name || '')).filter(Boolean)).size;
    const avgCompletion = (() => {
      const vals = inRange
        .map((s) => s.compiled_summary?.completion_rate)
        .filter((x): x is number => typeof x === "number" && !Number.isNaN(x));
      if (!vals.length) return null;
      return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    })();
    const issueRate = (() => {
      const withAny = inRange.filter((s) => !!s.compiled_summary);
      if (!withAny.length) return null;
      const withIssues = withAny.filter((s) => {
        const cs = s.compiled_summary || {};
        return (cs.failed_steps || 0) > 0
          || (cs.required_missing || 0) > 0
          || (cs.out_of_range_measurements || 0) > 0
          || (cs.actions_open || 0) > 0;
      }).length;
      return Math.round((withIssues / withAny.length) * 100);
    })();
    return {
      totalInRange,
      completedInRange,
      completionPctInRange: totalInRange ? Math.round((completedInRange / totalInRange) * 100) : 0,
      uniqueStaff,
      avgCompletion,
      issueRate,
    };
  }, [filtered, isCompletedLike, trendRange]);

  const topTemplates = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((s) => {
      const name = String(s.template?.name || '').trim() || '—';
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count }));
  }, [filtered]);

  const topStaff = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((s) => {
      const name = String(s.submitted_by?.name || '').trim() || '—';
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries())
      .filter(([name]) => name !== '—')
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count }));
  }, [filtered]);

  // Fetch incidents
  const { data: incidents, isLoading: incidentsLoading } = useQuery({
    queryKey: ['safety-incidents'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/staff/safety-concerns/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` }
      });
      if (!res.ok) throw new Error('Failed to fetch incidents');
      return res.json();
    },
    refetchInterval: 60_000,
  });

  // Fetch selected incident details
  const { data: incidentDetail, isLoading: incidentDetailLoading } = useQuery({
    queryKey: ['safety-incident-detail', selectedIncident],
    enabled: !!selectedIncident,
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/staff/safety-concerns/${selectedIncident}/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` }
      });
      if (!res.ok) throw new Error('Failed to fetch incident details');
      return res.json();
    },
  });

  type SafetyIncident = {
    id: string;
    title?: string | null;
    location?: string | null;
    severity?: string | null;
    status?: string | null;
    is_anonymous?: boolean | null;
    reporter_details?: { first_name?: string | null; last_name?: string | null } | null;
    assigned_to_details?: { first_name?: string | null; last_name?: string | null } | null;
    created_at?: string | null;
    resolution_notes?: string | null;
    incident_type?: string | null;
    description?: string | null;
  };

  const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

  const incidentList = useMemo<SafetyIncident[]>(() => {
    const raw: unknown = incidents;
    const listUnknown: unknown =
      Array.isArray(raw) ? raw : (isRecord(raw) && Array.isArray((raw as { results?: unknown }).results) ? (raw as { results: unknown[] }).results : []);
    const arr = Array.isArray(listUnknown) ? listUnknown : [];
    return arr
      .map((x) => (isRecord(x) ? x : ({} as Record<string, unknown>)))
      .map((x) => ({
        id: String(x.id ?? ""),
        title: typeof x.title === "string" ? x.title : null,
        location: typeof x.location === "string" ? x.location : null,
        severity: typeof x.severity === "string" ? x.severity : null,
        status: typeof x.status === "string" ? x.status : null,
        is_anonymous: typeof x.is_anonymous === "boolean" ? x.is_anonymous : null,
        incident_type: typeof x.incident_type === "string" ? x.incident_type : null,
        description: typeof x.description === "string" ? x.description : null,
        reporter_details: isRecord(x.reporter_details) ? {
          first_name: typeof x.reporter_details.first_name === "string" ? x.reporter_details.first_name : null,
          last_name: typeof x.reporter_details.last_name === "string" ? x.reporter_details.last_name : null,
        } : null,
        assigned_to_details: isRecord(x.assigned_to_details) ? {
          first_name: typeof x.assigned_to_details.first_name === "string" ? x.assigned_to_details.first_name : null,
          last_name: typeof x.assigned_to_details.last_name === "string" ? x.assigned_to_details.last_name : null,
        } : null,
        created_at: typeof x.created_at === "string" ? x.created_at : null,
      }));
  }, [incidents]);

  const incidentKpis = useMemo(() => {
    const open = incidentList.filter((i) => String(i.status || "").toLowerCase() === "open");
    const critical = open.filter((i) => ["critical", "high"].includes(String(i.severity || "").toLowerCase()));
    const unassigned = open.filter((i) => !i.assigned_to_details);
    const resolved7 = incidentList.filter((i) => {
      if (String(i.status || "").toLowerCase() !== "resolved") return false;
      if (!i.created_at) return false;
      const age = Date.now() - new Date(i.created_at).getTime();
      return age <= 7 * 86400000;
    });
    return {
      open: open.length,
      critical: critical.length,
      unassigned: unassigned.length,
      resolved7: resolved7.length,
      total: incidentList.length,
    };
  }, [incidentList]);

  const filteredIncidents = useMemo(() => {
    const OPEN_STATUSES = ['open'];
    return incidentList.filter((inc) => {
      const statusLower = String(inc.status || '').toLowerCase();
      const matchesStatus =
        incidentFilters.status === ''
          ? true
          : incidentFilters.status === 'open'
            ? OPEN_STATUSES.includes(statusLower)
            : statusLower === incidentFilters.status.toLowerCase();
      const matchesSeverity = !incidentFilters.severity || String(inc.severity || '').toLowerCase() === incidentFilters.severity.toLowerCase();
      const q = incidentFilters.search.trim().toLowerCase();
      const matchesSearch = !q
        || String(inc.title || '').toLowerCase().includes(q)
        || String(inc.location || '').toLowerCase().includes(q);
      return matchesStatus && matchesSeverity && matchesSearch;
    });
  }, [incidentList, incidentFilters]);

  const totalIncidentItems = filteredIncidents.length;
  const totalIncidentPages = totalIncidentItems ? Math.ceil(totalIncidentItems / incidentPageSize) : 1;
  const incidentStartIndex = (incidentPage - 1) * incidentPageSize;
  const incidentEndIndex = incidentStartIndex + incidentPageSize;
  const paginatedIncidents = filteredIncidents.slice(incidentStartIndex, incidentEndIndex);

  const getSeverityColor = (severity: string) => {
    const sev = (severity || '').toLowerCase();
    switch (sev) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/40 dark:text-gray-300 dark:border-gray-700';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/40 dark:text-gray-300 dark:border-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    const st = (status || '').toLowerCase();
    switch (st) {
      case 'open':
        return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
      case 'dismissed':
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/40 dark:text-gray-300 dark:border-gray-700';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/40 dark:text-gray-300 dark:border-gray-700';
    }
  };

  const formatStatus = (status: string) => {
    return (status || '').replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (data: { id: string; status: string; resolution_notes: string }) => {
      const res = await fetch(`${API_BASE}/staff/safety-concerns/${data.id}/update_status/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem("access_token")}`
        },
        body: JSON.stringify({ status: data.status, resolution_notes: data.resolution_notes })
      });
      if (!res.ok) throw new Error('Failed to update status');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety-incidents'] });
      queryClient.invalidateQueries({ queryKey: ['safety-incident-detail'] });
      setSelectedIncident(null);
      setUpdateStatus('');
      setResolutionNotes('');
      toast.success('Incident status updated');
    },
    onError: () => toast.error('Failed to update incident status'),
  });

  const { data: staffList } = useQuery({
    queryKey: ['staff-members-for-assign'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/staff/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : data?.results || [];
    },
    enabled: !!selectedIncident,
  });

  const assignMutation = useMutation({
    mutationFn: async (data: { id: string; assigned_to: string | null }) => {
      const res = await fetch(`${API_BASE}/staff/safety-concerns/${data.id}/assign/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem("access_token")}`
        },
        body: JSON.stringify({ assigned_to: data.assigned_to })
      });
      if (!res.ok) throw new Error('Failed to assign incident');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety-incidents'] });
      queryClient.invalidateQueries({ queryKey: ['safety-incident-detail'] });
      toast.success('Incident assigned successfully');
    },
    onError: () => toast.error('Failed to assign incident'),
  });

  // Live checklist progress (WhatsApp step-by-step) for managers
  const { data: liveProgress, isLoading: liveProgressLoading } = useQuery({
    queryKey: ["live-checklist-progress"],
    queryFn: () => api.getLiveChecklistProgress(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const liveItems = liveProgress?.items ?? [];

  const sortedTable = useMemo(() => {
    const inRange = filtered.filter(s => {
      const ts = s.submitted_at ? new Date(s.submitted_at).getTime() : 0;
      const fromOk = !dateFrom || ts >= new Date(dateFrom).getTime();
      const toOk = !dateTo || ts <= new Date(dateTo).getTime() + 86400000 - 1;
      const staffOk = !staffFilter || String(s.submitted_by?.name || '').toLowerCase().includes(staffFilter.trim().toLowerCase());
      return fromOk && toOk && staffOk;
    });
    const arr = [...inRange];
    arr.sort((a, b) => {
      const cmp = (valA: string, valB: string) => valA.localeCompare(valB);
      if (sortBy === 'date') {
        const ta = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
        const tb = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
        return sortDir === 'asc' ? ta - tb : tb - ta;
      }
      if (sortBy === 'staff') {
        const sa = String(a.submitted_by?.name || '');
        const sb = String(b.submitted_by?.name || '');
        const r = cmp(sa, sb);
        return sortDir === 'asc' ? r : -r;
      }
      const ca = String(a.template?.name || '');
      const cb = String(b.template?.name || '');
      const r = cmp(ca, cb);
      return sortDir === 'asc' ? r : -r;
    });
    return arr;
  }, [filtered, sortBy, sortDir, dateFrom, dateTo, staffFilter]);

  // Pagination calculations for checklists
  const totalChecklistItems = sortedTable.length;
  const totalChecklistPages = totalChecklistItems ? Math.ceil(totalChecklistItems / checklistPageSize) : 1;
  const checklistStartIndex = (checklistPage - 1) * checklistPageSize;
  const checklistEndIndex = checklistStartIndex + checklistPageSize;
  const paginatedChecklists = sortedTable.slice(checklistStartIndex, checklistEndIndex);

  const exportCsv = () => {
    const headers = ['Staff', 'Submitted At', 'Checklist', 'Status', 'Notes'];
    const rows = sortedTable.map(s => [
      String(s.submitted_by?.name || ''),
      s.submitted_at ? new Date(s.submitted_at).toISOString() : '',
      String(s.template?.name || ''),
      String(s.status || ''),
      String(s.notes || '')
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'checklist_submissions.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1400px] mx-auto">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ops review</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Checklist submissions and safety incidents — review, assign, resolve.
          </p>
        </div>
        <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 p-1 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("submitted")}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition",
              activeTab === "submitted"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800",
            )}
          >
            <ClipboardCheck className="h-4 w-4" />
            Checklists
            <span className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
              activeTab === "submitted" ? "bg-white/20" : "bg-slate-200 dark:bg-slate-700",
            )}>
              {trendKpis.totalInRange}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("incidents")}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition",
              activeTab === "incidents"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800",
            )}
          >
            <ShieldAlert className="h-4 w-4" />
            Incidents
            <span className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
              activeTab === "incidents" ? "bg-white/20" : incidentKpis.open > 0 ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" : "bg-slate-200 dark:bg-slate-700",
            )}>
              {incidentKpis.open}
            </span>
          </button>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="hidden">
          <TabsTrigger value="submitted">submitted</TabsTrigger>
          <TabsTrigger value="incidents">incidents</TabsTrigger>
        </TabsList>

        <TabsContent value="submitted" className="mt-0 space-y-4">
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    {t("analytics.submissions_trend")}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {t("analytics.daily_submitted")} • {t("analytics.last_days", { count: trendDays })}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {[7, 14, 30].map((d) => (
                    <Button
                      key={d}
                      size="sm"
                      variant={trendDays === d ? "default" : "outline"}
                      onClick={() => setTrendDays(d as 7 | 14 | 30)}
                      className={trendDays === d ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                    >
                      {d}d
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
                  <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">{t("analytics.kpi_submissions")}</div>
                  <div className="text-2xl font-bold mt-1 tabular-nums">{trendKpis.totalInRange}</div>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
                  <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">{t("analytics.kpi_completion")}</div>
                  <div className="text-2xl font-bold mt-1 tabular-nums">{trendKpis.completionPctInRange}%</div>
                  <div className="text-[11px] text-muted-foreground mt-1">{t("analytics.completed_count", { completed: trendKpis.completedInRange, total: trendKpis.totalInRange })}</div>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
                  <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">{t("analytics.kpi_submitters")}</div>
                  <div className="text-2xl font-bold mt-1 tabular-nums">{trendKpis.uniqueStaff}</div>
                  <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {t("analytics.unique_staff")}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
                  <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">{t("common.avg_score")}</div>
                  <div className="text-2xl font-bold mt-1 tabular-nums">{trendKpis.avgCompletion ?? "—"}{typeof trendKpis.avgCompletion === 'number' ? "%" : ""}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">{t("analytics.from_checklist_summaries")}</div>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 md:col-span-2">
                  <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-amber-600" />
                    {t("analytics.issue_rate")}
                  </div>
                  <div className="text-2xl font-bold mt-1 tabular-nums">{trendKpis.issueRate ?? "—"}{typeof trendKpis.issueRate === 'number' ? "%" : ""}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">{t("analytics.issue_rate_desc")}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
                  <div className="h-64">
                    {trendDaily.reduce((a, b) => a + b.count, 0) === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                        <ClipboardCheck className="h-10 w-10 opacity-30 mb-3" />
                        <div className="font-medium">{t("analytics.no_submissions_in_range", { count: trendDays })}</div>
                        <div className="text-sm mt-1">{t("analytics.try_widening_range")}</div>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendDaily} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                          <defs>
                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#16a34a" stopOpacity={0.75} />
                              <stop offset="95%" stopColor="#16a34a" stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                          <XAxis
                            dataKey="date"
                            tick={{ fill: 'currentColor', className: 'text-slate-500 dark:text-slate-400 text-xs' }}
                            tickFormatter={(v) => {
                              try { return new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" }); } catch { return v; }
                            }}
                          />
                          <YAxis allowDecimals={false} tick={{ fill: 'currentColor', className: 'text-slate-500 dark:text-slate-400 text-xs' }} />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'var(--color-background, #fff)', border: '1px solid var(--color-border, #e2e8f0)', borderRadius: '0.5rem', color: 'var(--color-foreground, #0f172a)' }}
                            formatter={(val: number | string) => [val, "Submissions"]}
                            labelFormatter={(label: string) => {
                              try { return new Date(label).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }); } catch { return String(label); }
                            }}
                          />
                          <Area type="monotone" dataKey="count" stroke="#16a34a" strokeWidth={2} fill="url(#colorCount)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 space-y-3">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("common.top_checklists")}</div>
                  {topTemplates.length === 0 ? (
                    <div className="text-sm text-muted-foreground">—</div>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topTemplates} layout="vertical" margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#16a34a" radius={[6, 6, 6, 6]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>

              {topStaff.length > 0 ? (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Top submitters</div>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topStaff} layout="vertical" margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#0ea5e9" radius={[6, 6, 6, 6]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base">Submitted checklists</CardTitle>
                  <CardDescription>
                    {totalChecklistItems} matching · review completions and issues
                  </CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={exportCsv}>
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  placeholder="Search name or checklist…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setChecklistPage(1); }}
                  className="w-56"
                />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setChecklistPage(1); }}
                  className="w-40"
                  aria-label="From date"
                />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setChecklistPage(1); }}
                  className="w-40"
                  aria-label="To date"
                />
                <Input
                  placeholder="Filter by staff"
                  value={staffFilter}
                  onChange={(e) => { setStaffFilter(e.target.value); setChecklistPage(1); }}
                  className="w-44"
                />
              </div>

              {isLoading ? (
                <TableSkeleton rowCount={8} colCount={6} />
              ) : sortedTable.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 px-4 py-12 text-center">
                  <ClipboardCheck className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
                  <div className="font-medium text-sm">{t("analytics.no_submissions")}</div>
                  <div className="text-xs text-muted-foreground mt-1">Try widening the date range or clearing filters.</div>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <button className="text-left w-full font-medium" onClick={() => { setSortBy('checklist'); setSortDir(sortBy === 'checklist' && sortDir === 'asc' ? 'desc' : 'asc'); }}>
                            Checklist
                          </button>
                        </TableHead>
                        <TableHead>
                          <button className="text-left w-full font-medium" onClick={() => { setSortBy('staff'); setSortDir(sortBy === 'staff' && sortDir === 'asc' ? 'desc' : 'asc'); }}>
                            Staff
                          </button>
                        </TableHead>
                        <TableHead>
                          <button className="text-left w-full font-medium" onClick={() => { setSortBy('date'); setSortDir(sortBy === 'date' && sortDir === 'asc' ? 'desc' : 'asc'); }}>
                            Submitted
                          </button>
                        </TableHead>
                        <TableHead>Health</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[90px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedChecklists.map((s) => {
                        const issues =
                          (s.compiled_summary?.failed_steps || 0) +
                          (s.compiled_summary?.required_missing || 0) +
                          (s.compiled_summary?.out_of_range_measurements || 0) +
                          (s.compiled_summary?.actions_open || 0);
                        const rate = s.compiled_summary?.completion_rate;
                        return (
                          <TableRow
                            key={s.id}
                            className={cn(!isCompletedLike(s.status) && "bg-amber-50/60 dark:bg-amber-950/20")}
                          >
                            <TableCell>
                              <div className="font-medium text-sm">{s.template?.name || "—"}</div>
                              {s.source_type === "shift_progress" ? (
                                <Badge variant="outline" className="mt-0.5 text-[10px]">WhatsApp</Badge>
                              ) : null}
                              {s.notes ? (
                                <div className="text-[11px] text-muted-foreground truncate max-w-[220px] mt-0.5" title={s.notes}>
                                  {s.notes}
                                </div>
                              ) : null}
                            </TableCell>
                            <TableCell className="text-sm">{s.submitted_by?.name || "—"}</TableCell>
                            <TableCell className="text-sm whitespace-nowrap">
                              {s.submitted_at
                                ? new Date(s.submitted_at).toLocaleString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "—"}
                            </TableCell>
                            <TableCell>
                              <div className="min-w-[120px] space-y-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="tabular-nums">
                                    {s.compiled_summary?.completed_steps ?? "—"}/{s.compiled_summary?.total_steps ?? "—"}
                                    {typeof rate === "number" ? ` · ${rate}%` : ""}
                                  </span>
                                  {typeof s.compiled_summary?.duration_minutes === "number" ? (
                                    <span className="text-muted-foreground">{s.compiled_summary.duration_minutes}m</span>
                                  ) : null}
                                </div>
                                <Progress value={typeof rate === "number" ? rate : 0} className="h-1.5" />
                                {issues > 0 ? (
                                  <div className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400">
                                    <AlertTriangle className="h-3 w-3" />
                                    {issues} issue{issues === 1 ? "" : "s"}
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-muted-foreground">No issues</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={isCompletedLike(s.status) ? "secondary" : "outline"}
                                className="text-[10px]"
                              >
                                {s.status || "—"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  setDetailId(s.id);
                                  setDetailSourceType(s.source_type || "execution");
                                  setReviewComment(s.notes || "");
                                  try {
                                    await api.logAdminAction(String(s.id), {
                                      action: "VIEW_SUBMISSION",
                                      message: "Opened submission details",
                                    });
                                  } catch { /* ignore */ }
                                }}
                              >
                                Review
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {sortedTable.length > 0 && (
                <div className="flex items-center justify-between pt-2">
                  <div className="text-sm text-muted-foreground">
                    Showing {checklistStartIndex + 1}–{Math.min(checklistEndIndex, totalChecklistItems)} of {totalChecklistItems}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={checklistPage <= 1}
                      onClick={() => setChecklistPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {checklistPage} / {totalChecklistPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={checklistPage >= totalChecklistPages}
                      onClick={() => setChecklistPage((p) => Math.min(totalChecklistPages, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {(liveItems.length > 0 || recentActivity.length > 0) && (
            <div className="grid gap-4 lg:grid-cols-2">
              {liveItems.length > 0 ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <RefreshCw className={cn("h-4 w-4 text-emerald-600", liveProgressLoading && "animate-spin")} />
                      Live checklist progress
                    </CardTitle>
                    <CardDescription>In-progress WhatsApp checklists</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {liveItems.slice(0, 8).map((item) => (
                      <div key={item.id} className="rounded-lg border border-slate-100 dark:border-slate-800 px-3 py-2 text-sm">
                        <div className="flex justify-between gap-2">
                          <span className="font-medium truncate">{item.staff_name || "Staff"}</span>
                          <span className="text-xs tabular-nums text-muted-foreground">{item.progress_percentage ?? 0}%</span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {item.completed_tasks}/{item.total_tasks} steps
                          {item.channel ? ` · ${item.channel}` : ""}
                        </div>
                        <Progress value={item.progress_percentage ?? 0} className="h-1 mt-1.5" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : null}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t("analytics.live_activity")}</CardTitle>
                  <CardDescription>{t("analytics.live_activity_desc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentActivity.length === 0 ? (
                    <div className="text-sm text-muted-foreground">{t("analytics.no_recent_activity")}</div>
                  ) : (
                    <div className="space-y-2">
                      {recentActivity.slice(0, 8).map((n) => (
                        <div key={n.id} className="flex items-start justify-between gap-3 text-xs border-b border-slate-100 dark:border-slate-800 pb-2 last:border-0">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{n.title || n.verb}</div>
                            <div className="text-muted-foreground line-clamp-2">{n.description}</div>
                          </div>
                          <div className="shrink-0 text-muted-foreground whitespace-nowrap">
                            {new Date(n.timestamp).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="incidents" className="mt-0 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Open</div>
                <div className={cn("mt-1 text-2xl font-semibold tabular-nums", incidentKpis.open > 0 && "text-amber-600")}>
                  {incidentKpis.open}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">Needs attention</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Critical / high</div>
                <div className={cn("mt-1 text-2xl font-semibold tabular-nums", incidentKpis.critical > 0 && "text-red-600")}>
                  {incidentKpis.critical}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">Among open</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Unassigned</div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">{incidentKpis.unassigned}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Open with no owner</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Resolved (7d)</div>
                <div className="mt-1 text-2xl font-semibold tabular-nums text-emerald-600">{incidentKpis.resolved7}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{incidentKpis.total} total filed</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Reported incidents</CardTitle>
              <CardDescription>
                Safety and service reports from staff — assign and close them here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Input
                  placeholder="Search title or location…"
                  value={incidentFilters.search}
                  onChange={(e) => {
                    setIncidentFilters({ ...incidentFilters, search: e.target.value });
                    setIncidentPage(1);
                  }}
                  className="w-56"
                />
                <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 gap-0.5">
                  {[
                    { value: "open", label: "Open" },
                    { value: "", label: "All" },
                    { value: "resolved", label: "Resolved" },
                    { value: "dismissed", label: "Dismissed" },
                  ].map((opt) => (
                    <button
                      key={opt.value || "all"}
                      type="button"
                      onClick={() => {
                        setIncidentFilters({ ...incidentFilters, status: opt.value });
                        setIncidentPage(1);
                      }}
                      className={cn(
                        "rounded-md px-2.5 py-1.5 text-xs font-medium transition",
                        incidentFilters.status === opt.value
                          ? "bg-emerald-600 text-white"
                          : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <select
                  value={incidentFilters.severity}
                  onChange={(e) => {
                    setIncidentFilters({ ...incidentFilters, severity: e.target.value });
                    setIncidentPage(1);
                  }}
                  className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">All severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {incidentsLoading ? (
                <TableSkeleton rowCount={6} colCount={6} />
              ) : filteredIncidents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 px-4 py-12 text-center">
                  <AlertTriangle className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
                  <div className="font-medium text-sm">{t("analytics.no_incidents_found")}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {incidentFilters.search || incidentFilters.severity || incidentFilters.status
                      ? t("analytics.try_adjusting_filters_incidents")
                      : t("analytics.all_incidents_here")}
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Incident</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Reported</TableHead>
                        <TableHead className="w-[90px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedIncidents.map((incident: SafetyIncident) => (
                        <TableRow
                          key={incident.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedIncident(incident.id)}
                        >
                          <TableCell>
                            <div className="font-medium text-sm">{incident.title || "Untitled"}</div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground mt-0.5">
                              {incident.incident_type ? <span className="capitalize">{incident.incident_type}</span> : null}
                              {incident.location ? (
                                <span className="inline-flex items-center gap-0.5">
                                  <MapPin className="h-3 w-3" />
                                  {incident.location}
                                </span>
                              ) : null}
                            </div>
                            {incident.description ? (
                              <div className="text-[11px] text-muted-foreground line-clamp-1 max-w-md mt-0.5">
                                {incident.description}
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getSeverityColor(String(incident.severity || ""))}>
                              {formatStatus(String(incident.severity || "—"))}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getStatusColor(String(incident.status || ""))}>
                              {formatStatus(String(incident.status || "—"))}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {incident.assigned_to_details
                              ? `${incident.assigned_to_details.first_name ?? ""} ${incident.assigned_to_details.last_name ?? ""}`.trim()
                              : (
                                <span className="text-amber-700 dark:text-amber-400 text-xs font-medium">
                                  Unassigned
                                </span>
                              )}
                            <div className="text-[11px] text-muted-foreground">
                              {incident.is_anonymous
                                ? "Anonymous reporter"
                                : incident.reporter_details
                                  ? `by ${incident.reporter_details.first_name} ${incident.reporter_details.last_name}`
                                  : ""}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {incident.created_at
                              ? new Date(incident.created_at).toLocaleString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "—"}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" variant="outline" onClick={() => setSelectedIncident(incident.id)}>
                              Open
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {filteredIncidents.length > 0 && (
                <div className="flex items-center justify-between pt-1">
                  <div className="text-sm text-muted-foreground">
                    Showing {incidentStartIndex + 1}–{Math.min(incidentEndIndex, totalIncidentItems)} of {totalIncidentItems}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={incidentPage <= 1}
                      onClick={() => setIncidentPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {incidentPage} / {totalIncidentPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={incidentPage >= totalIncidentPages}
                      onClick={() => setIncidentPage((p) => Math.min(totalIncidentPages, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog
            open={!!selectedIncident}
            onOpenChange={(open) => {
              if (!open) {
                setSelectedIncident(null);
                setUpdateStatus("");
                setResolutionNotes("");
                setAssignTo("");
              }
            }}
          >
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 pr-6">
                  <ShieldAlert className="h-5 w-5 text-emerald-600 shrink-0" />
                  <span className="truncate">
                    {incidentDetail?.title || "Incident details"}
                  </span>
                </DialogTitle>
              </DialogHeader>

              {incidentDetailLoading && !incidentDetail ? (
                <div className="space-y-3 py-2">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : incidentDetail ? (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={getSeverityColor(incidentDetail.severity)}>
                      {formatStatus(incidentDetail.severity || "—")}
                    </Badge>
                    <Badge variant="outline" className={getStatusColor(incidentDetail.status)}>
                      {formatStatus(incidentDetail.status || "—")}
                    </Badge>
                    {incidentDetail.incident_type ? (
                      <Badge variant="secondary" className="capitalize text-[10px]">
                        {incidentDetail.incident_type}
                      </Badge>
                    ) : null}
                    <span className="text-[11px] text-muted-foreground font-mono ml-auto">
                      #{String(incidentDetail.id || "").slice(0, 8)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 p-3 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" /> Location
                      </div>
                      <div className="font-medium">{incidentDetail.location || "Not specified"}</div>
                    </div>
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 p-3 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="h-3.5 w-3.5" /> Reporter
                      </div>
                      <div className="font-medium">
                        {incidentDetail.is_anonymous
                          ? "Anonymous"
                          : incidentDetail.reporter_details
                            ? `${incidentDetail.reporter_details.first_name} ${incidentDetail.reporter_details.last_name}`
                            : "—"}
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 p-3 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" /> Reported
                      </div>
                      <div className="font-medium">
                        {incidentDetail.created_at
                          ? new Date(incidentDetail.created_at).toLocaleString()
                          : "—"}
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 p-3 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" /> Occurred
                      </div>
                      <div className="font-medium">
                        {incidentDetail.occurred_at
                          ? new Date(incidentDetail.occurred_at).toLocaleString()
                          : "—"}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Description
                    </div>
                    <div className="rounded-lg border border-slate-100 dark:border-slate-800 p-3 text-sm whitespace-pre-wrap leading-relaxed">
                      {incidentDetail.description || "No description provided."}
                    </div>
                  </div>

                  {incidentDetail.photo ? (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                        Photo evidence
                      </div>
                      <img
                        src={
                          typeof incidentDetail.photo === "string" && incidentDetail.photo.startsWith("/")
                            ? `${(import.meta.env.VITE_BACKEND_URL || "")}${incidentDetail.photo}`
                            : incidentDetail.photo
                        }
                        alt="Incident evidence"
                        className="max-h-80 w-full rounded-lg border object-contain bg-slate-50 dark:bg-slate-900"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  ) : null}

                  {Array.isArray(incidentDetail.audio_evidence) && incidentDetail.audio_evidence.length > 0 ? (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                        Audio evidence
                      </div>
                      <ul className="space-y-2">
                        {incidentDetail.audio_evidence.map((url: string, i: number) => (
                          <li key={i}>
                            <audio controls className="w-full" src={url.startsWith("/") ? `${(import.meta.env.VITE_BACKEND_URL || "")}${url}` : url} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                    <div className="text-sm font-semibold">Assign owner</div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        value={assignTo || incidentDetail.assigned_to || ""}
                        onChange={(e) => setAssignTo(e.target.value)}
                        className="flex-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md px-3 py-2 text-sm"
                      >
                        <option value="">Unassigned</option>
                        {(staffList || []).map((s: { id: string; first_name?: string; last_name?: string; role?: string }) => (
                          <option key={s.id} value={s.id}>
                            {s.first_name} {s.last_name}{s.role ? ` (${s.role})` : ""}
                          </option>
                        ))}
                      </select>
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={assignMutation.isPending}
                        onClick={() => {
                          const val = assignTo || incidentDetail.assigned_to || "";
                          assignMutation.mutate({
                            id: incidentDetail.id,
                            assigned_to: val || null,
                          });
                        }}
                      >
                        {assignMutation.isPending ? "Assigning…" : "Assign"}
                      </Button>
                    </div>
                    {incidentDetail.assigned_to_details ? (
                      <div className="text-xs text-muted-foreground">
                        Currently: {incidentDetail.assigned_to_details.first_name}{" "}
                        {incidentDetail.assigned_to_details.last_name}
                      </div>
                    ) : null}
                  </div>

                  {incidentDetail.resolution_notes ? (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                        Existing resolution notes
                      </div>
                      <div className="rounded-lg border p-3 text-sm whitespace-pre-wrap bg-muted/30">
                        {incidentDetail.resolution_notes}
                      </div>
                    </div>
                  ) : null}

                  {incidentDetail.resolved_by_details ? (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">Resolved by</div>
                        <div className="font-medium">
                          {incidentDetail.resolved_by_details.first_name}{" "}
                          {incidentDetail.resolved_by_details.last_name}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Resolved at</div>
                        <div className="font-medium">
                          {incidentDetail.resolved_at
                            ? new Date(incidentDetail.resolved_at).toLocaleString()
                            : "—"}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                    <div className="text-sm font-semibold">Update status</div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">New status</label>
                        <select
                          value={updateStatus || incidentDetail.status}
                          onChange={(e) => setUpdateStatus(e.target.value)}
                          className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md px-3 py-2 text-sm"
                        >
                          <option value="OPEN">Open</option>
                          <option value="RESOLVED">Resolved</option>
                          <option value="DISMISSED">Dismissed</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Resolution notes</label>
                      <Textarea
                        value={resolutionNotes || incidentDetail.resolution_notes || ""}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="What happened and how it was handled…"
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedIncident(null);
                          setUpdateStatus("");
                          setResolutionNotes("");
                          setAssignTo("");
                        }}
                      >
                        Close
                      </Button>
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() =>
                          updateStatusMutation.mutate({
                            id: incidentDetail.id,
                            status: updateStatus || incidentDetail.status,
                            resolution_notes:
                              resolutionNotes || incidentDetail.resolution_notes || "",
                          })
                        }
                        disabled={updateStatusMutation.isPending}
                      >
                        {updateStatusMutation.isPending ? "Saving…" : "Save status"}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground py-6 text-center">
                  Couldn&apos;t load this incident.
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>

      <Dialog open={detailId !== null} onOpenChange={(o) => { if (!o) { setDetailId(null); setReviewComment(""); } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-emerald-600" />
              Submission review
            </DialogTitle>
          </DialogHeader>
          {(() => {
            const summary = sortedTable.find(x => x.id === detailId) || filtered.find(x => x.id === detailId);
            const exec = (detailQuery.data as unknown as ChecklistExecutionDetail | null) || null;
            if (!summary) return (<div className="text-sm text-muted-foreground">No data</div>);
            return (
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold">{summary.template?.name || "Checklist"}</div>
                    <div className="text-sm text-muted-foreground mt-0.5">
                      {summary.submitted_by?.name || "—"}
                      {summary.submitted_at
                        ? ` · ${new Date(summary.submitted_at).toLocaleString()}`
                        : ""}
                      {summary.source_type === "shift_progress" ? " · WhatsApp" : ""}
                    </div>
                  </div>
                  <Badge variant={isCompletedLike(summary.status) ? "secondary" : "outline"}>
                    {summary.status || "—"}
                  </Badge>
                </div>

                {summary.notes ? (
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 p-3 text-sm">
                    <div className="text-xs text-muted-foreground mb-1">Notes</div>
                    {summary.notes}
                  </div>
                ) : null}

                {summary.compiled_summary ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="border rounded-md p-3">
                      <div className="text-muted-foreground">Completion</div>
                      <div className="font-semibold">
                        {summary.compiled_summary.completed_steps ?? 0}/{summary.compiled_summary.total_steps ?? 0} ({summary.compiled_summary.completion_rate ?? 0}%)
                      </div>
                    </div>
                    <div className="border rounded-md p-3">
                      <div className="text-muted-foreground">Duration</div>
                      <div className="font-semibold">{typeof summary.compiled_summary.duration_minutes === 'number' ? `${summary.compiled_summary.duration_minutes} min` : '—'}</div>
                    </div>
                    <div className="border rounded-md p-3">
                      <div className="text-muted-foreground">Evidence</div>
                      <div className="font-semibold">{summary.compiled_summary.evidence_items ?? 0} item(s)</div>
                    </div>
                    <div className="border rounded-md p-3">
                      <div className="text-muted-foreground">{t("common.open_actions")}</div>
                      <div className="font-semibold">{summary.compiled_summary.actions_open ?? 0}</div>
                    </div>
                  </div>
                ) : null}

                {exec?.analysis_results && (
                  <div className="bg-muted/30 border rounded-md p-4 space-y-3">
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      <div className="w-1.5 h-4 bg-primary rounded-full" />
                      Automated Insights
                    </div>

                    {exec.analysis_results.summary && (
                      <div className="text-sm font-medium">{exec.analysis_results.summary}</div>
                    )}

                    {exec.analysis_results.highlights?.length > 0 && (
                      <ul className="list-disc pl-5 space-y-1">
                        {exec.analysis_results.highlights.map((h: string, i: number) => (
                          <li key={i} className="text-xs text-muted-foreground">{h}</li>
                        ))}
                      </ul>
                    )}

                    {exec.analysis_results.anomalies?.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <div className="text-xs font-semibold text-destructive uppercase tracking-wider">Detected Anomalies</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {exec.analysis_results.anomalies.map((a: ExecutionAnomaly, i: number) => (
                            <div key={i} className="border border-destructive/20 bg-destructive/5 rounded p-2 text-xs">
                              <div className="font-medium">{a.step_title}</div>
                              <div className="flex justify-between mt-1">
                                <span>Value: <span className="font-semibold">{a.value}</span></span>
                                <span>{a.issue} (<span className="opacity-70">{a.threshold}</span>)</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="border rounded-md">
                  <ScrollArea className="h-72 p-3">
                    {detailQuery.isLoading ? (
                      <div className="text-sm text-muted-foreground">Loading full details…</div>
                    ) : exec ? (
                      <div className="space-y-3 text-sm">
                        <div className="space-y-1">
                          <div className="font-medium">{t("common.checklist_report")}</div>
                          {(exec as any).shift ? (
                            <div className="text-xs text-muted-foreground">
                              Shift: {(exec as any).shift.shift_date || '—'}{' '}
                              {(exec as any).shift.start_time ? `(${new Date((exec as any).shift.start_time).toLocaleTimeString()}` : ''}
                              {(exec as any).shift.end_time ? ` – ${new Date((exec as any).shift.end_time).toLocaleTimeString()})` : (exec as any).shift.start_time ? ')' : ''}
                              {(exec as any).shift.role ? ` • Role: ${(exec as any).shift.role}` : ''}
                              {(exec as any).channel ? ` • Channel: ${(exec as any).channel}` : ''}
                            </div>
                          ) : exec.assigned_shift_info ? (
                            <div className="text-xs text-muted-foreground">
                              Shift: {exec.assigned_shift_info.shift_date || '—'}{' '}
                              {exec.assigned_shift_info.start_time ? `(${new Date(exec.assigned_shift_info.start_time).toLocaleTimeString()}` : ''}
                              {exec.assigned_shift_info.end_time ? ` – ${new Date(exec.assigned_shift_info.end_time).toLocaleTimeString()})` : exec.assigned_shift_info.start_time ? ')' : ''}
                              {exec.assigned_shift_info.role ? ` • Role: ${exec.assigned_shift_info.role}` : ''}
                              {exec.assigned_shift_info.department ? ` • Dept: ${exec.assigned_shift_info.department}` : ''}
                            </div>
                          ) : null}
                          {(exec as any).manager_notes ? (
                            <div className="text-xs mt-1 p-2 bg-muted/50 rounded">Manager notes: {(exec as any).manager_notes}</div>
                          ) : null}
                        </div>

                        <div className="font-medium">Steps</div>
                        {(exec.step_responses || []).map((sr: ExecutionStepResponse & { title?: string; response?: string }, idx: number) => (
                          <div key={(sr as any).id || idx} className="border rounded-md p-3">
                            <div className="font-medium">{(sr as any).title || sr.step?.title || `Step ${idx + 1}`}</div>
                            <div className="text-xs text-muted-foreground">{(sr as any).description || sr.step?.description || ''}</div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                              <Badge variant="outline">Status: {(sr as any).status || sr.status || (sr.is_completed ? 'COMPLETED' : 'PENDING')}</Badge>
                              {(sr as any).response ? (<Badge variant="outline">Response: {(sr as any).response}</Badge>) : null}
                              {sr.text_response ? (<Badge variant="outline">Response: {sr.text_response}</Badge>) : null}
                              {sr.measurement_value != null ? (<Badge variant="outline">Measure: {String(sr.measurement_value)}{sr.step?.measurement_unit ? ` ${sr.step.measurement_unit}` : ''}</Badge>) : null}
                              {typeof sr.boolean_response === 'boolean' ? (<Badge variant="outline">Answer: {sr.boolean_response ? 'Yes' : 'No'}</Badge>) : null}
                              {sr.signature_data ? (<Badge variant="outline">Signature</Badge>) : null}
                            </div>
                            {sr.notes ? (<div className="mt-2 text-xs">Notes: {sr.notes}</div>) : null}
                            {Array.isArray(sr.evidence) && sr.evidence.length > 0 ? (
                              <div className="mt-2 text-xs space-y-1">
                                <div>Evidence:</div>
                                <ul className="list-disc pl-4">
                                  {sr.evidence.map((ev: ExecutionEvidence, eidx: number) => (
                                    <li key={ev.id || eidx} className="break-all">
                                      {ev.evidence_type || 'FILE'} — {ev.filename || ev.file_path || '—'}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                          </div>
                        ))}

                        {Array.isArray(exec.actions) && exec.actions.length > 0 ? (
                          <div className="space-y-2">
                            <div className="font-medium">{t("common.actions_created")}</div>
                            <div className="space-y-2">
                              {exec.actions.map((a: ExecutionAction) => (
                                <div key={a.id} className="border rounded-md p-3 text-xs">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="font-semibold">{a.title}</div>
                                    <Badge variant="outline">{a.status}</Badge>
                                  </div>
                                  {a.description ? <div className="mt-1 text-muted-foreground">{a.description}</div> : null}
                                  <div className="mt-2 text-muted-foreground">
                                    Assigned to: {a.assigned_to ? `${a.assigned_to.first_name || ''} ${a.assigned_to.last_name || ''}`.trim() : '—'} • Priority: {a.priority || '—'}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No detailed data</div>
                    )}
                  </ScrollArea>
                </div>
                <div className="space-y-2">
                  <Textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder={t("analytics.add_review_comments")} />
                  <div className="flex items-center gap-2 justify-end">
                    <Button variant="outline" onClick={() => setDetailId(null)}>Close</Button>
                    <Button onClick={() => approveMutation.mutate({ id: String(summary.id), reason: reviewComment, source_type: (summary as SubmittedChecklist).source_type })} disabled={approveMutation.isPending}>Approve</Button>
                    <Button variant="destructive" onClick={() => rejectMutation.mutate({ id: String(summary.id), reason: reviewComment, source_type: (summary as SubmittedChecklist).source_type })} disabled={rejectMutation.isPending}>Reject</Button>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManagerReviewDashboard;