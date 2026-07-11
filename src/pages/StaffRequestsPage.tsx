/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { API_BASE } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  MessageCircle,
  FileText,
  Calendar,
  Wallet,
  Settings,
  Briefcase,
  Plus,
  AlertCircle,
  Clock,
  ChevronRight,
  Wrench,
  BookOpen,
  Package,
  Mic,
  UserCircle2,
  ArrowRightLeft,
  Inbox,
  Heart,
  ShoppingBag,
  Layers,
  Phone,
  Hash,
  Send,
  CheckCircle2,
  PauseCircle,
  XCircle,
} from "lucide-react";
import { useStaffInboxLanes, resolveStaffInboxLaneId, type StaffInboxLane } from "@/hooks/use-staff-inbox-lanes";
import { EscalateStaffRequestModal } from "@/components/staff/EscalateStaffRequestModal";
import { AttachmentList } from "@/components/ui/attachment-preview";
import { api, BACKEND_URL } from "@/lib/api";
import type { DashboardTaskDemandItem, Invoice } from "@/lib/types";
import { toast } from "sonner";

type StaffRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "ESCALATED" | "CLOSED" | "WAITING_ON";

type StaffRequestComment = {
  id: string;
  kind: string;
  body: string;
  created_at: string;
  author_details?: { first_name?: string; last_name?: string; email?: string } | null;
};

type AssigneeSummary = {
  id: string;
  name: string;
  email: string;
  role?: string;
};

type StaffRequest = {
  id: string;
  staff_name?: string;
  staff_display_name?: string;
  staff_phone?: string;
  category: string;
  priority: string;
  status: StaffRequestStatus;
  subject?: string;
  description?: string;
  source?: string;
  external_id?: string;
  created_at: string;
  updated_at: string;
  comments?: StaffRequestComment[];
  assignee?: string | null;
  assignee_summary?: AssigneeSummary | null;
  assignee_details?: { id: string; first_name?: string; last_name?: string; email?: string; role?: string } | null;
  voice_audio_url?: string;
  transcription?: string;
  transcription_language?: string;
};

const STATUSES: { key: StaffRequestStatus; label: string }[] = [
  { key: "PENDING", label: "Pending" },
  // APPROVED in the inbox means "manager acknowledged — being worked on",
  // which the dashboard widgets surface as "In progress".
  { key: "APPROVED", label: "In progress" },
  // "Waiting on" parks an acknowledged request that is blocked by an
  // external dependency (supplier reply, contractor visit, document
  // arriving). Pairs with `follow_up_date` so the SLA sweeper re-pings
  // the manager on/after that date instead of bouncing it back to
  // "Escalated".
  { key: "WAITING_ON", label: "Waiting on" },
  { key: "REJECTED", label: "Rejected" },
  { key: "ESCALATED", label: "Escalated" },
  { key: "CLOSED", label: "Closed" },
];

function getLaneIcon(lane: Pick<StaffInboxLane, "icon" | "categories">) {
  switch (lane.icon) {
    case "calendar":
      return <Calendar className="w-3.5 h-3.5" />;
    case "heart":
      return <Heart className="w-3.5 h-3.5" />;
    case "wallet":
      return <Wallet className="w-3.5 h-3.5" />;
    case "wrench":
      return <Wrench className="w-3.5 h-3.5" />;
    case "book-open":
      return <BookOpen className="w-3.5 h-3.5" />;
    case "package":
      return <Package className="w-3.5 h-3.5" />;
    case "shopping-bag":
      return <ShoppingBag className="w-3.5 h-3.5" />;
    case "layers":
      return <Layers className="w-3.5 h-3.5" />;
    case "briefcase":
    default:
      return <Briefcase className="w-3.5 h-3.5" />;
  }
}

function getAuthToken() {
  return localStorage.getItem("access_token") || localStorage.getItem("accessToken") || "";
}

function priorityBadge(priority?: string) {
  const p = String(priority || "").toUpperCase();
  if (p === "URGENT") return "bg-red-600 text-white border-red-600";
  if (p === "HIGH") return "bg-amber-500 text-white border-amber-500";
  if (p === "LOW") return "bg-slate-200 text-slate-900 border-slate-200";
  return "bg-blue-600 text-white border-blue-600";
}

function statusBadge(status?: string) {
  const s = String(status || "").toUpperCase();
  if (s === "PENDING") return "bg-yellow-50 text-yellow-700 border-yellow-200 ring-1 ring-yellow-200";
  if (s === "APPROVED") return "bg-sky-50 text-sky-700 border-sky-200 ring-1 ring-sky-200";
  if (s === "REJECTED") return "bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-200";
  if (s === "ESCALATED") return "bg-violet-50 text-violet-700 border-violet-200 ring-1 ring-violet-200";
  if (s === "WAITING_ON") return "bg-sky-50 text-sky-700 border-sky-200 ring-1 ring-sky-200";
  return "bg-slate-50 text-slate-700 border-slate-200 ring-1 ring-slate-200";
}

/** Human label aligned with dashboard widget pill vocabulary. */
function staffRequestStatusLabel(status?: string) {
  const s = String(status || "").toUpperCase();
  if (s === "APPROVED") return "In progress";
  if (s === "WAITING_ON") return "Waiting on";
  if (s === "ESCALATED") return "Escalated";
  if (s === "REJECTED") return "Rejected";
  if (s === "CLOSED") return "Closed";
  return "Pending";
}

function getSourceIcon(source?: string) {
  const s = String(source || "").toLowerCase();
  if (s === "whatsapp") return <MessageCircle className="w-3 h-3 text-green-600" />;
  return <Plus className="w-3 h-3 text-blue-600" />;
}

function getCategoryIcon(category?: string) {
  const c = String(category || "").toUpperCase();
  if (c === "DOCUMENT") return <FileText className="w-3.5 h-3.5" />;
  if (c === "SCHEDULING") return <Calendar className="w-3.5 h-3.5" />;
  if (c === "MEDICAL") return <Heart className="w-3.5 h-3.5" />;
  if (c === "PAYROLL") return <Wallet className="w-3.5 h-3.5" />;
  if (c === "FINANCE") return <Wallet className="w-3.5 h-3.5" />;
  if (c === "OPERATIONS") return <Briefcase className="w-3.5 h-3.5" />;
  if (c === "HR") return <Settings className="w-3.5 h-3.5" />;
  if (c === "MAINTENANCE") return <Wrench className="w-3.5 h-3.5" />;
  if (c === "RESERVATIONS") return <BookOpen className="w-3.5 h-3.5" />;
  if (c === "INVENTORY") return <Package className="w-3.5 h-3.5" />;
  return <Plus className="w-3.5 h-3.5" />;
}

function formatRelativeTime(iso: string): string {
  try {
    const then = new Date(iso).getTime();
    const diff = Date.now() - then;
    if (diff < 0) return "just now";
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    if (days < 45) return `${Math.floor(days / 7)}w ago`;
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatAbsoluteDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function getAssigneeName(r: Pick<StaffRequest, "assignee_summary" | "assignee_details">): string {
  if (r.assignee_summary?.name) return r.assignee_summary.name;
  const d = r.assignee_details;
  if (d) {
    const n = [d.first_name || "", d.last_name || ""].join(" ").trim();
    if (n) return n;
    if (d.email) return d.email;
  }
  return "";
}

async function apiGet<T>(path: string): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    credentials: "include",
  });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

async function apiPost<T>(path: string, body?: any): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body || {}),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

type DetailKind = "staff_request" | "dashboard" | "scheduling" | "invoice";
type TasksDemandsTab = "pending" | "in_progress" | "completed";

type StaffRequestsDeepLink = {
  lane: string | null;
  category: string | null;
  status: string | null;
  kind: string | null;
  list: string | null;
  priority: string | null;
};

function captureStaffRequestsDeepLink(
  searchParams: URLSearchParams,
): StaffRequestsDeepLink {
  return {
    lane: searchParams.get("lane"),
    category: searchParams.get("category"),
    status: searchParams.get("status"),
    kind: searchParams.get("kind"),
    list: searchParams.get("list"),
    priority: searchParams.get("priority"),
  };
}

function stripStaffRequestsDeepLink(
  searchParams: URLSearchParams,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  next.delete("category");
  next.delete("lane");
  next.delete("priority");
  next.delete("status");
  next.delete("kind");
  next.delete("list");
  return next;
}

function tasksDemandsDetailKind(row: Pick<DashboardTaskDemandItem, "kind">): DetailKind {
  return row.kind === "scheduling" ? "scheduling" : "dashboard";
}

function tasksDemandsDetailHref(row: DashboardTaskDemandItem): string {
  const kind = tasksDemandsDetailKind(row);
  return `/dashboard/staff-requests/${row.id}?kind=${kind}`;
}

function dashboardTaskStatusLabel(status?: string) {
  const s = String(status || "").toUpperCase();
  if (s === "IN_PROGRESS") return "In progress";
  if (s === "COMPLETED") return "Completed";
  if (s === "CANCELLED") return "Cancelled";
  return "Pending";
}

function dashboardTaskStatusBadge(status?: string) {
  const s = String(status || "").toUpperCase();
  if (s === "IN_PROGRESS") return "bg-sky-50 text-sky-700 border-sky-200 ring-1 ring-sky-200";
  if (s === "COMPLETED") return "bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-200";
  if (s === "CANCELLED") return "bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-200";
  return "bg-yellow-50 text-yellow-700 border-yellow-200 ring-1 ring-yellow-200";
}

function resolveStoredMediaUrl(path: string | null | undefined): string {
  const raw = (path || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${BACKEND_URL}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

function invoiceAttachmentItems(invoice: Invoice) {
  const url =
    invoice.attachment_url?.trim() ||
    resolveStoredMediaUrl(invoice.attachment) ||
    resolveStoredMediaUrl(invoice.photo) ||
    invoice.photo_url?.trim() ||
    "";
  if (!url) return [];
  const name =
    invoice.attachment_filename?.trim() ||
    `${invoice.vendor_name || "Invoice"}${invoice.invoice_number ? `-${invoice.invoice_number}` : ""}`;
  return [
    {
      url,
      name,
      content_type: invoice.attachment_content_type || undefined,
    },
  ];
}

function invoiceStatusLabel(status?: string) {
  const s = String(status || "").toUpperCase();
  if (s === "PAID") return "Paid";
  if (s === "VOIDED") return "Voided";
  if (s === "DRAFT") return "Draft";
  return "Open";
}

function invoiceStatusBadge(status?: string) {
  const s = String(status || "").toUpperCase();
  if (s === "PAID") return "bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-200";
  if (s === "VOIDED") return "bg-slate-50 text-slate-600 border-slate-200 ring-1 ring-slate-200";
  if (s === "DRAFT") return "bg-slate-50 text-slate-700 border-slate-200 ring-1 ring-slate-200";
  return "bg-yellow-50 text-yellow-700 border-yellow-200 ring-1 ring-yellow-200";
}

function InvoiceDetailPanel({
  invoice,
  onMarkPaid,
  isUpdating,
}: {
  invoice: Invoice;
  onMarkPaid: () => void;
  isUpdating: boolean;
}) {
  const attachments = invoiceAttachmentItems(invoice);
  const isOpen = String(invoice.status || "").toUpperCase() === "OPEN";

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
            Finance · Invoice
          </div>
          <h3 className="text-2xl font-bold tracking-tight truncate">{invoice.vendor_name}</h3>
          {invoice.invoice_number ? (
            <p className="text-sm text-muted-foreground mt-1">#{invoice.invoice_number}</p>
          ) : null}
        </div>
        <Badge variant="outline" className={cn("text-xs font-bold px-3 py-1 uppercase rounded-full", invoiceStatusBadge(invoice.status))}>
          {invoiceStatusLabel(invoice.status)}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Amount</div>
          <div className="text-lg font-bold tabular-nums mt-1">
            {invoice.amount} {invoice.currency}
          </div>
        </div>
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Due date</div>
          <div className="text-lg font-semibold mt-1">
            {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : "—"}
          </div>
        </div>
      </div>

      {invoice.notes ? (
        <div className="rounded-2xl border border-border/40 bg-muted/20 p-4">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Notes</div>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{invoice.notes}</p>
        </div>
      ) : null}

      <div className="rounded-2xl border border-border/40 bg-background p-4">
        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" />
          Invoice document
        </div>
        {attachments.length > 0 ? (
          <AttachmentList attachments={attachments} />
        ) : (
          <p className="text-sm text-muted-foreground">
            No document was attached to this invoice. Ask the sender to resend the photo or PDF on WhatsApp.
          </p>
        )}
      </div>

      {isOpen ? (
        <Button onClick={onMarkPaid} disabled={isUpdating} className="w-full sm:w-auto">
          {isUpdating ? "Updating…" : "Mark as paid"}
        </Button>
      ) : null}
    </div>
  );
}

function DashboardTaskDetailPanel({
  task,
  onStatusChange,
  isUpdating,
}: {
  task: DashboardTaskDemandItem;
  onStatusChange: (status: DashboardTaskDemandItem["status"]) => void;
  isUpdating: boolean;
}) {
  return (
    <div className="flex flex-col h-[72vh]">
      <div className="flex items-start justify-between p-6 pb-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
            {getCategoryIcon(task.category || undefined)}
            {task.category || "Task"}
          </div>
          <h3 className="text-2xl font-bold text-foreground tracking-tight leading-tight">{task.title}</h3>
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <span>{task.source_label || task.source}</span>
            <span>•</span>
            <span>{task.assignee?.name || "Unassigned"}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge
            variant="outline"
            className={cn("text-xs font-bold px-3 py-1 uppercase rounded-full", dashboardTaskStatusBadge(task.status))}
          >
            {dashboardTaskStatusLabel(task.status)}
          </Badge>
          <Badge variant="outline" className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", priorityBadge(task.priority))}>
            {String(task.priority || "MEDIUM").toUpperCase()}
          </Badge>
        </div>
      </div>

      <div className="px-6 py-4 space-y-3">
        {task.ai_summary ? (
          <div className="text-sm text-muted-foreground leading-relaxed">{task.ai_summary}</div>
        ) : null}
        <div className="bg-muted/30 rounded-2xl p-4 border border-border/40">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
            Details
          </div>
          <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {task.description || "No description provided."}
          </div>
        </div>
      </div>

      <div className="px-6 pb-6 flex flex-wrap gap-2 mt-auto">
        {(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const).map((nextStatus) => (
          <Button
            key={nextStatus}
            size="sm"
            variant={task.status === nextStatus ? "default" : "outline"}
            disabled={isUpdating || task.status === nextStatus}
            onClick={() => onStatusChange(nextStatus)}
          >
            {dashboardTaskStatusLabel(nextStatus)}
          </Button>
        ))}
      </div>
    </div>
  );
}

const StaffRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const selectedId = params.id || null;
  const inboxLanesQuery = useStaffInboxLanes();
  const inboxLanes = useMemo(() => inboxLanesQuery.data ?? [], [inboxLanesQuery.data]);

  const initialPriorityFilter = (() => {
    const raw = (searchParams.get("priority") || "").toUpperCase();
    return raw === "URGENT" ? "URGENT" : "";
  })();

  const initialStatusFromUrl = (() => {
    const raw = (searchParams.get("status") || "").toUpperCase();
    if (STATUSES.some((s) => s.key === raw)) return raw as StaffRequestStatus;
    return "PENDING";
  })();

  const initialDetailKind = ((): DetailKind => {
    const kind = searchParams.get("kind");
    if (kind === "dashboard" || kind === "scheduling") return kind;
    if (kind === "invoice") return "invoice";
    return "staff_request";
  })();

  const initialDashboardListMode = (() => {
    return searchParams.get("list") === "dashboard";
  })();

  const [activeStatus, setActiveStatus] = useState<StaffRequestStatus>(initialStatusFromUrl);
  /** null = All Requests; otherwise a dashboard widget lane id (e.g. team_medical_service). */
  const [activeLaneId, setActiveLaneId] = useState<string | null>(null);
  const [detailKind, setDetailKind] = useState<DetailKind>(initialDetailKind);
  const [dashboardListMode, setDashboardListMode] = useState(initialDashboardListMode);
  const [demandsTab, setDemandsTab] = useState<TasksDemandsTab>("pending");
  const [activePriority, setActivePriority] = useState<string>(initialPriorityFilter);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const deepLinkAppliedRef = useRef(false);
  const initialDeepLinkRef = useRef<StaffRequestsDeepLink>(
    captureStaffRequestsDeepLink(searchParams),
  );

  const activeLane = useMemo(
    () => inboxLanes.find((lane) => lane.lane_id === activeLaneId) ?? null,
    [inboxLanes, activeLaneId],
  );

  const filterCategories = activeLane?.categories ?? [];
  const isInvoiceDetail = detailKind === "invoice";
  const isDashboardDetail = detailKind === "dashboard" || detailKind === "scheduling";

  // Apply widget deep-links once lanes are loaded (?lane= or legacy ?category=).
  // Params are captured on first mount — a separate strip-on-mount effect used
  // to delete them before lanes finished loading, which dropped the Team Travel tab.
  useEffect(() => {
    if (deepLinkAppliedRef.current || inboxLanesQuery.isLoading) return;

    const dl = initialDeepLinkRef.current;
    const laneFromUrl = resolveStaffInboxLaneId(inboxLanes, {
      lane: dl.lane,
      category: dl.category,
    });
    if (laneFromUrl) {
      setActiveLaneId(laneFromUrl);
    }

    const statusFromUrl = (dl.status || "").toUpperCase();
    if (STATUSES.some((s) => s.key === statusFromUrl)) {
      setActiveStatus(statusFromUrl as StaffRequestStatus);
    }

    if (dl.kind === "dashboard" || dl.kind === "scheduling") {
      setDetailKind(dl.kind);
    }
    if (dl.kind === "invoice") {
      setDetailKind("invoice");
    }
    if (dl.list === "dashboard") {
      setDashboardListMode(true);
    }

    deepLinkAppliedRef.current = true;

    if (
      dl.category ||
      dl.lane ||
      dl.priority ||
      dl.status ||
      dl.kind ||
      dl.list
    ) {
      setSearchParams(stripStaffRequestsDeepLink(searchParams), { replace: true });
    }
  }, [inboxLanes, inboxLanesQuery.isLoading, searchParams, setSearchParams]);
  const [comment, setComment] = useState("");
  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  // "Assigned to me" toggle — scopes the inbox to rows this manager owns.
  const [assignedToMe, setAssignedToMe] = useState(false);

  // Debounce the search term so we don't hit the backend on every keystroke.
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(id);
  }, [search]);

  const listQuery = useQuery({
    queryKey: [
      "staff-requests",
      activeStatus,
      activeLaneId,
      filterCategories.join(","),
      activePriority,
      debouncedSearch,
      assignedToMe,
    ],
    queryFn: async (): Promise<StaffRequest[]> => {
      const qs = new URLSearchParams();
      qs.set("status", activeStatus);
      if (filterCategories.length > 0) {
        qs.set("category", filterCategories.join(","));
      }
      if (activePriority) qs.set("priority", activePriority);
      if (debouncedSearch) qs.set("search", debouncedSearch);
      if (assignedToMe) qs.set("assigned_to_me", "1");
      // Inbox list pulls a lean payload from the backend (no comments,
      // no nested staff profile); we can show 50 per page comfortably.
      qs.set("page_size", "50");
      const data = await apiGet<any>(`/staff/requests/?${qs.toString()}`);
      const rows: StaffRequest[] = Array.isArray(data)
        ? (data as StaffRequest[])
        : data && Array.isArray(data.results)
          ? (data.results as StaffRequest[])
          : data && Array.isArray(data.requests)
            ? (data.requests as StaffRequest[])
            : [];
      // The backend doesn't currently filter by priority server-side,
      // so we re-filter here to honour the deep-link from the dashboard
      // Urgent widget. Cheap because the inbox page caps at 50 rows.
      if (activePriority) {
        return rows.filter(
          (r) => String(r.priority || "").toUpperCase() === activePriority,
        );
      }
      return rows;
    },
    // Keep the previous results visible while revalidating so switching tabs /
    // typing in search doesn't flash "Loading…".
    placeholderData: keepPreviousData,
    // Rows don't change that often — treat them as fresh for 30s so flipping
    // between tabs/pages is instant from cache.
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const countsQuery = useQuery({
    queryKey: ["staff-requests-counts", assignedToMe],
    queryFn: async (): Promise<{ counts: Record<string, number>; assigned_to_me_open: number }> => {
      const data = await apiGet<any>(
        `/staff/requests/counts/${assignedToMe ? "?assigned_to_me=1" : ""}`,
      );
      return { counts: data?.counts || {}, assigned_to_me_open: data?.assigned_to_me_open || 0 };
    },
    refetchInterval: 60_000,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  // Per-lane open counts for widget-driven filter chips.
  const categoryCountsQuery = useQuery({
    queryKey: ["staff-requests-category-counts", activeStatus, assignedToMe, inboxLanes.map((l) => l.lane_id).join(",")],
    enabled: inboxLanes.length > 0,
    queryFn: async (): Promise<Record<string, number>> => {
      const tasks = inboxLanes.map(async (lane) => {
        const params = new URLSearchParams();
        params.set("category", lane.categories.join(","));
        if (assignedToMe) params.set("assigned_to_me", "1");
        const data = await apiGet<any>(`/staff/requests/counts/?${params.toString()}`);
        const n: number = data?.counts?.[activeStatus] || 0;
        return [lane.lane_id, n] as const;
      });
      const settled = await Promise.all(tasks);
      const out: Record<string, number> = {};
      for (const [laneId, n] of settled) {
        out[laneId] = n;
      }
      return out;
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

  // "Assigned to me (N)" pill count is NOT scoped to the current status tab —
  // it's the total open rows owned by the manager across any status (except
  // CLOSED/REJECTED). We need this independent of the main counts query.
  const myCountsQuery = useQuery({
    queryKey: ["staff-requests-my-count"],
    queryFn: async (): Promise<number> => {
      const data = await apiGet<any>("/staff/requests/counts/?assigned_to_me=1");
      return data?.assigned_to_me_open || 0;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const selectedQuery = useQuery({
    queryKey: ["staff-request", selectedId],
    queryFn: async (): Promise<StaffRequest | null> => {
      if (!selectedId) return null;
      return apiGet<StaffRequest>(`/staff/requests/${selectedId}/`);
    },
    enabled: !!selectedId && !isDashboardDetail && !isInvoiceDetail,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const invoiceQuery = useQuery({
    queryKey: ["finance-invoice", selectedId],
    queryFn: async (): Promise<Invoice | null> => {
      if (!selectedId) return null;
      return api.getInvoice(selectedId);
    },
    enabled: !!selectedId && isInvoiceDetail,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const dashboardTaskQuery = useQuery({
    queryKey: ["dashboard-task-demand", selectedId],
    queryFn: async (): Promise<DashboardTaskDemandItem | null> => {
      if (!selectedId) return null;
      return api.getDashboardTaskDemand(selectedId);
    },
    enabled:
      !!selectedId &&
      !isInvoiceDetail &&
      (isDashboardDetail ||
        (selectedQuery.isFetched && selectedQuery.isError && !selectedQuery.isFetching)),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  useEffect(() => {
    if (!selectedId || isDashboardDetail || isInvoiceDetail) return;
    if (selectedQuery.isError && dashboardTaskQuery.data) {
      setDetailKind(tasksDemandsDetailKind(dashboardTaskQuery.data));
    }
  }, [
    selectedId,
    isDashboardDetail,
    isInvoiceDetail,
    selectedQuery.isError,
    dashboardTaskQuery.data,
  ]);

  const invoiceMarkPaidMutation = useMutation({
    mutationFn: () => {
      if (!selectedId) throw new Error("No invoice selected");
      return api.markInvoicePaid(selectedId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["finance-invoice", selectedId] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard", "category-tasks"] });
      toast.success("Invoice marked as paid.");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Could not mark invoice as paid.");
    },
  });

  const dashboardStatusMutation = useMutation({
    mutationFn: (nextStatus: DashboardTaskDemandItem["status"]) => {
      if (!selectedId) throw new Error("No task selected");
      return api.updateDashboardTaskStatus(selectedId, nextStatus);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard-task-demand", selectedId] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard", "category-tasks"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard", "tasks-demands", 25] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard", "tasks-demands", 5] });
    },
  });

  const requests = useMemo(() => (Array.isArray(listQuery.data) ? listQuery.data : []), [listQuery.data]);
  const selected = selectedQuery.data || null;

  // Align the status tab with the open request when it loads or its status
  // changes (mutations / deep-links). Intentionally omit activeStatus from
  // deps so a manual tab click can clear the detail without fighting back.
  useEffect(() => {
    if (!selectedId || !selected || selected.id !== selectedId) return;
    if (!STATUSES.some((s) => s.key === selected.status)) return;
    setActiveStatus((prev) => (prev === selected.status ? prev : selected.status));
  }, [selectedId, selected]);

  const dashboardTask = dashboardTaskQuery.data || null;
  const showPinnedDashboardTask =
    isDashboardDetail &&
    !!dashboardTask &&
    selectedId === dashboardTask.id &&
    !requests.some((r) => r.id === dashboardTask.id);

  const tasksDemandsQuery = useQuery({
    queryKey: ["dashboard", "tasks-demands", 25],
    queryFn: () => api.getDashboardTasksDemands(25),
    enabled: dashboardListMode,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const demandCounts = tasksDemandsQuery.data?.counts ?? {
    pending: 0,
    in_progress: 0,
    completed: 0,
  };

  const demandRows = useMemo(() => {
    const data = tasksDemandsQuery.data;
    if (!data) return [];
    if (demandsTab === "pending") return data.pending;
    if (demandsTab === "in_progress") return data.in_progress;
    return data.completed;
  }, [tasksDemandsQuery.data, demandsTab]);

  const filteredDemandRows = useMemo(() => {
    if (!debouncedSearch) return demandRows;
    const q = debouncedSearch.toLowerCase();
    return demandRows.filter(
      (row) =>
        row.title.toLowerCase().includes(q) ||
        (row.description || "").toLowerCase().includes(q) ||
        (row.assignee?.name || "").toLowerCase().includes(q),
    );
  }, [demandRows, debouncedSearch]);

  const onSelectDashboardTask = (row: DashboardTaskDemandItem) => {
    const kind = tasksDemandsDetailKind(row);
    setDetailKind(kind);
    navigate(tasksDemandsDetailHref(row));
  };

  const mutateAction = useMutation({
    mutationFn: async ({ action, payload }: { action: string; payload?: any }) => {
      if (!selectedId) throw new Error("No request selected");
      return apiPost(`/staff/requests/${selectedId}/${action}/`, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["staff-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["staff-request"] });
      await queryClient.invalidateQueries({ queryKey: ["staff-requests-counts"] });
      await queryClient.invalidateQueries({ queryKey: ["staff-requests-my-count"] });
      await queryClient.invalidateQueries({ queryKey: ["staff-requests-category-counts"] });
    },
  });

  const onSelect = (id: string) => {
    setDetailKind("staff_request");
    setDashboardListMode(false);
    const params = new URLSearchParams();
    if (activeLaneId) params.set("lane", activeLaneId);
    params.set("status", activeStatus);
    const qs = params.toString();
    navigate(`/dashboard/staff-requests/${id}?${qs}`);
  };

  const onStatusTabChange = (next: StaffRequestStatus) => {
    setActiveStatus(next);
    // Leaving a status bucket clears the open detail so the list and
    // detail never show mismatched filters (e.g. Pending list + In progress pane).
    if (selected && selected.status !== next) {
      const params = new URLSearchParams();
      if (activeLaneId) params.set("lane", activeLaneId);
      params.set("status", next);
      const qs = params.toString();
      navigate(`/dashboard/staff-requests?${qs}`);
    }
  };

  const emptyState = (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/80 text-muted-foreground">
        <Inbox className="h-5 w-5" />
      </div>
      <div className="text-sm font-medium text-foreground">No requests here</div>
      <div className="mt-1 max-w-[220px] text-xs text-muted-foreground leading-relaxed">
        {activeLane
          ? `Nothing in ${activeLane.label} for ${staffRequestStatusLabel(activeStatus).toLowerCase()}.`
          : `Nothing marked ${staffRequestStatusLabel(activeStatus).toLowerCase()} right now.`}
      </div>
    </div>
  );

  const pageTitle = dashboardListMode
    ? "Tasks & Demands"
    : activeLane?.page_title ?? "All Requests";
  const pageSubtitle = dashboardListMode
    ? "Miya-created and ingested tasks — review, reassign, and close from here."
    : activeLane?.page_subtitle ?? null;

  if (isInvoiceDetail && selectedId) {
    const invoice = invoiceQuery.data;
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        <Card className="w-full">
          <CardContent className="pt-6">
            {invoiceQuery.isLoading ? (
              <div className="text-sm text-muted-foreground py-6">Loading…</div>
            ) : invoiceQuery.isError || !invoice ? (
              <div className="text-sm text-red-600 py-6">Failed to load invoice.</div>
            ) : (
              <InvoiceDetailPanel
                invoice={invoice}
                onMarkPaid={() => invoiceMarkPaidMutation.mutate()}
                isUpdating={invoiceMarkPaidMutation.isPending}
              />
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (dashboardListMode) {
    const demandTabs: { id: TasksDemandsTab; label: string; count: number }[] = [
      { id: "pending", label: "Pending", count: demandCounts.pending },
      { id: "in_progress", label: "In progress", count: demandCounts.in_progress },
      { id: "completed", label: "Completed", count: demandCounts.completed },
    ];

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold">{pageTitle}</h2>
            {pageSubtitle ? (
              <p className="text-sm text-muted-foreground mt-1">{pageSubtitle}</p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-0.5">
            {demandTabs.map((tb) => {
              const active = demandsTab === tb.id;
              return (
                <button
                  key={tb.id}
                  type="button"
                  onClick={() => setDemandsTab(tb.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>{tb.label}</span>
                  <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px] rounded-full">
                    {tb.count}
                  </Badge>
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 w-full md:w-[360px]">
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button variant="outline" onClick={() => setSearch("")}>
              Clear
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4 items-start">
          <Card className="h-[72vh]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Inbox · Tasks & Demands</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="h-[62vh] pr-3">
                {tasksDemandsQuery.isLoading ? (
                  <div className="text-sm text-muted-foreground py-6">Loading…</div>
                ) : tasksDemandsQuery.isError ? (
                  <div className="text-sm text-red-600 py-6">Failed to load tasks.</div>
                ) : filteredDemandRows.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-10 text-center">No tasks found.</div>
                ) : (
                  <div className="space-y-2">
                    {filteredDemandRows.map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => onSelectDashboardTask(row)}
                        className={cn(
                          "w-full text-left rounded-xl border p-4 transition-all duration-200 group relative overflow-hidden",
                          selectedId === row.id
                            ? "border-primary/50 bg-primary/5 shadow-sm ring-1 ring-primary/20"
                            : "border-border hover:border-border-hover hover:bg-muted/50",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                              {row.source_label || row.source}
                            </div>
                            <div className="font-semibold text-sm truncate">{row.title}</div>
                            {row.ai_summary || row.description ? (
                              <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 line-clamp-1">
                                {row.ai_summary || row.description}
                              </div>
                            ) : null}
                            <div className="text-xs text-muted-foreground mt-1 truncate">
                              {row.assignee?.name || "Unassigned"}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[9px] font-bold px-1.5 py-0 shrink-0",
                              dashboardTaskStatusBadge(row.status),
                            )}
                          >
                            {dashboardTaskStatusLabel(row.status)}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="h-[72vh]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Task details</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {!selectedId ? (
                <div className="text-sm text-muted-foreground py-10 text-center">
                  Select a task on the left.
                </div>
              ) : dashboardTaskQuery.isLoading ? (
                <div className="text-sm text-muted-foreground py-6">Loading…</div>
              ) : dashboardTaskQuery.isError || !dashboardTask ? (
                <div className="text-sm text-red-600 py-6">Failed to load task.</div>
              ) : (
                <DashboardTaskDetailPanel
                  task={dashboardTask}
                  onStatusChange={(nextStatus) => dashboardStatusMutation.mutate(nextStatus)}
                  isUpdating={dashboardStatusMutation.isPending}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-5">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1">
            Staff inbox
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{pageTitle}</h2>
          {pageSubtitle ? (
            <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl leading-relaxed">{pageSubtitle}</p>
          ) : (
            <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl leading-relaxed">
              Triage WhatsApp and portal requests — assign, reply, escalate, or close.
            </p>
          )}
        </div>
        <Button
          variant={assignedToMe ? "default" : "outline"}
          onClick={() => setAssignedToMe((v) => !v)}
          className="rounded-full shrink-0 h-10"
          title="Show only requests assigned to you"
        >
          <Inbox className="w-4 h-4 mr-2" />
          Assigned to me
          {typeof myCountsQuery.data === "number" && myCountsQuery.data > 0 && (
            <Badge
              variant="secondary"
              className="ml-2 h-5 min-w-5 px-1.5 text-[11px] rounded-full"
            >
              {myCountsQuery.data}
            </Badge>
          )}
        </Button>
      </div>

      <Tabs value={activeStatus} onValueChange={(v) => onStatusTabChange(v as StaffRequestStatus)}>
        <div className="rounded-2xl border border-border/60 bg-muted/30 p-3 sm:p-4 space-y-3">
          <div className="flex flex-col xl:flex-row xl:items-center gap-3">
            <TabsList className="w-full xl:w-auto h-auto flex flex-wrap justify-start gap-1 bg-background/80 p-1.5 rounded-xl border border-border/50 shadow-sm">
              {STATUSES.map((s) => {
                const count = countsQuery.data?.counts?.[s.key];
                return (
                  <TabsTrigger
                    key={s.key}
                    value={s.key}
                    className="relative rounded-lg px-3 py-2 text-xs sm:text-sm data-[state=active]:shadow-sm"
                  >
                    {s.label}
                    {count !== undefined && (
                      <Badge
                        variant="secondary"
                        className={cn(
                          "ml-1.5 h-5 min-w-5 px-1.5 text-[10px] rounded-full font-semibold",
                          activeStatus === s.key && "bg-primary/15 text-primary",
                        )}
                      >
                        {count}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            <div className="flex gap-2 w-full xl:max-w-md xl:ml-auto">
              <Input
                placeholder="Search subject, staff, message…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 rounded-xl bg-background"
              />
              {search ? (
                <Button variant="outline" className="h-10 rounded-xl shrink-0" onClick={() => setSearch("")}>
                  Clear
                </Button>
              ) : null}
            </div>
          </div>

          <div
            className="flex flex-wrap items-center gap-2"
            role="tablist"
            aria-label="Filter inbox by command centre lane"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeLaneId === null}
              onClick={() => setActiveLaneId(null)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                activeLaneId === null
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background text-muted-foreground border-border hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <span>All lanes</span>
            </button>
            {inboxLanes.map((lane) => {
              const count = categoryCountsQuery.data?.[lane.lane_id] ?? 0;
              const isActive = activeLaneId === lane.lane_id;
              return (
                <button
                  key={lane.lane_id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveLaneId(lane.lane_id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background text-muted-foreground border-border hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <span className="opacity-80">{getLaneIcon(lane)}</span>
                  <span>{lane.label}</span>
                  {count > 0 && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        "h-4 min-w-4 px-1 text-[10px] rounded-full",
                        isActive && "bg-primary-foreground/20 text-primary-foreground",
                      )}
                    >
                      {count}
                    </Badge>
                  )}
                </button>
              );
            })}
            {activePriority ? (
              <button
                type="button"
                role="tab"
                aria-selected="true"
                onClick={() => setActivePriority("")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  "bg-red-600 text-white border-red-600 shadow-sm hover:bg-red-700",
                )}
                title="Clear priority filter"
              >
                <span>Priority: {activePriority}</span>
                <span className="text-[14px] leading-none">×</span>
              </button>
            ) : null}
          </div>
        </div>

        <TabsContent value={activeStatus} className="mt-4 focus-visible:outline-none">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(340px,400px)_1fr] gap-4 items-stretch">
            <Card className="h-[min(78vh,860px)] flex flex-col overflow-hidden border-border/70 shadow-sm">
              <CardHeader className="pb-3 pt-4 px-4 border-b border-border/50 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm font-semibold tracking-tight">
                    Inbox
                    <span className="ml-2 font-normal text-muted-foreground">
                      {listQuery.isLoading ? "…" : `${requests.length + (showPinnedDashboardTask ? 1 : 0)}`}
                      {activeLane ? ` · ${activeLane.label}` : ""}
                    </span>
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wide">
                    {staffRequestStatusLabel(activeStatus)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 px-0 flex-1 min-h-0">
                <ScrollArea className="h-full px-3 py-3">
                  {listQuery.isLoading ? (
                    <div className="space-y-2 py-2">
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="h-[88px] rounded-xl bg-muted/50 animate-pulse" />
                      ))}
                    </div>
                  ) : listQuery.isError ? (
                    <div className="text-sm text-red-600 py-10 text-center px-4">Failed to load requests.</div>
                  ) : requests.length === 0 && !showPinnedDashboardTask ? (
                    emptyState
                  ) : (
                    <div className="space-y-2">
                      {showPinnedDashboardTask && dashboardTask ? (
                        <button
                          type="button"
                          className="w-full text-left rounded-xl border p-3.5 transition-all duration-200 border-primary/50 bg-primary/5 shadow-sm ring-1 ring-primary/20"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                                {dashboardTask.source_label || "Dashboard task"}
                              </div>
                              <div className="font-semibold text-sm truncate">{dashboardTask.title}</div>
                              <div className="text-xs text-muted-foreground mt-1 truncate">
                                {dashboardTask.assignee?.name || "Unassigned"}
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[9px] font-bold px-1.5 py-0 shrink-0",
                                dashboardTaskStatusBadge(dashboardTask.status),
                              )}
                            >
                              {dashboardTaskStatusLabel(dashboardTask.status)}
                            </Badge>
                          </div>
                        </button>
                      ) : null}
                      {requests.map((r) => {
                        const isNew = Date.now() - new Date(r.created_at).getTime() < 86400000;
                        const isUrgent = r.priority === "URGENT" || r.priority === "HIGH";
                        const isSelected = selectedId === r.id;

                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => onSelect(r.id)}
                            className={cn(
                              "w-full text-left rounded-xl border p-3.5 transition-all duration-200 group relative overflow-hidden",
                              isSelected
                                ? "border-primary/50 bg-primary/5 shadow-sm ring-1 ring-primary/20"
                                : "border-border/80 bg-background hover:border-border hover:bg-muted/40",
                            )}
                          >
                            {isUrgent && !isSelected && (
                              <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                            )}

                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 mb-1">
                                  {getSourceIcon(r.source)}
                                  <div className="font-semibold text-sm leading-snug line-clamp-2">
                                    {r.subject || "Staff request"}
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted-foreground">
                                  <span className="font-semibold text-foreground/80 truncate max-w-[120px]">
                                    {r.staff_display_name || r.staff_name || "Staff"}
                                  </span>
                                  <span className="text-border">·</span>
                                  <span className="inline-flex items-center gap-1 uppercase tracking-wide">
                                    {getCategoryIcon(r.category)}
                                    {r.category}
                                  </span>
                                  <span className="text-border">·</span>
                                  {getAssigneeName(r) ? (
                                    <span className="inline-flex items-center gap-1 truncate max-w-[100px]">
                                      <UserCircle2 className="w-3 h-3 shrink-0" />
                                      {getAssigneeName(r)}
                                    </span>
                                  ) : (
                                    <span className="italic text-muted-foreground/70">Unassigned</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                {isNew && (
                                  <Badge className="h-4 px-1.5 text-[9px] bg-blue-500 hover:bg-blue-600">NEW</Badge>
                                )}
                                {r.voice_audio_url ? (
                                  <span
                                    className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1 h-4 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300"
                                    title="Originally a WhatsApp voice note"
                                  >
                                    <Mic className="w-2.5 h-2.5" />
                                    VOICE
                                  </span>
                                ) : null}
                                <div
                                  className="text-[10px] text-muted-foreground flex items-center gap-1"
                                  title={formatAbsoluteDateTime(r.created_at)}
                                >
                                  <Clock className="w-3 h-3" />
                                  {formatRelativeTime(r.created_at)}
                                </div>
                              </div>
                            </div>

                            {r.description ? (
                              <div className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                                {r.description}
                              </div>
                            ) : null}

                            <div className="flex items-center justify-between mt-2.5">
                              <Badge
                                variant="outline"
                                className={cn("text-[9px] font-bold px-1.5 py-0", priorityBadge(r.priority))}
                              >
                                {String(r.priority || "MEDIUM").toUpperCase()}
                              </Badge>
                              <ChevronRight
                                className={cn(
                                  "w-3.5 h-3.5 text-muted-foreground/60 transition-transform",
                                  isSelected ? "translate-x-0.5 text-primary" : "group-hover:translate-x-0.5",
                                )}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="h-[min(78vh,860px)] flex flex-col overflow-hidden border-border/70 shadow-sm">
              {!selectedId ? (
                <CardContent className="flex-1 flex flex-col items-center justify-center text-center px-8 py-16">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div className="text-base font-semibold text-foreground">Select a request</div>
                  <p className="mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">
                    Pick an item from the inbox to see the full message, assignment, activity, and actions.
                  </p>
                </CardContent>
              ) : isDashboardDetail ? (
                <CardContent className="pt-6 flex-1 overflow-auto">
                  {dashboardTaskQuery.isLoading ? (
                    <div className="text-sm text-muted-foreground py-6">Loading…</div>
                  ) : dashboardTaskQuery.isError || !dashboardTask ? (
                    <div className="text-sm text-red-600 py-6">Failed to load task.</div>
                  ) : (
                    <DashboardTaskDetailPanel
                      task={dashboardTask}
                      onStatusChange={(nextStatus) => dashboardStatusMutation.mutate(nextStatus)}
                      isUpdating={dashboardStatusMutation.isPending}
                    />
                  )}
                </CardContent>
              ) : selectedQuery.isLoading ? (
                <CardContent className="pt-6 space-y-4">
                  <div className="h-8 w-2/3 rounded-lg bg-muted animate-pulse" />
                  <div className="h-24 rounded-xl bg-muted/70 animate-pulse" />
                  <div className="h-40 rounded-xl bg-muted/50 animate-pulse" />
                </CardContent>
              ) : selectedQuery.isError || !selected ? (
                <CardContent className="pt-6">
                  <div className="text-sm text-red-600 py-6">Failed to load request.</div>
                </CardContent>
              ) : (
                <div className="flex flex-col h-full min-h-0">
                  <div className="shrink-0 border-b border-border/60 bg-background/95 px-5 pt-5 pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                            {getCategoryIcon(selected.category)}
                            {selected.category}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", statusBadge(selected.status))}
                          >
                            {staffRequestStatusLabel(selected.status)}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", priorityBadge(selected.priority))}
                          >
                            {String(selected.priority || "MEDIUM").toUpperCase()}
                          </Badge>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-bold tracking-tight leading-snug text-foreground">
                          {selected.subject || "Staff request"}
                        </h3>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                            <UserCircle2 className="w-4 h-4 text-muted-foreground" />
                            {selected.staff_display_name || selected.staff_name || "Staff"}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5" />
                            {selected.staff_phone || "No phone"}
                          </span>
                          <span
                            className="inline-flex items-center gap-1.5"
                            title={formatAbsoluteDateTime(selected.created_at)}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            {formatRelativeTime(selected.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Source</div>
                        <div className="mt-1 text-xs font-semibold flex items-center gap-1.5 capitalize">
                          {getSourceIcon(selected.source)}
                          {selected.source || "web"}
                        </div>
                      </div>
                      <div className="rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Received</div>
                        <div className="mt-1 text-xs font-semibold">
                          {formatAbsoluteDateTime(selected.created_at)}
                        </div>
                      </div>
                      <div className="rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Updated</div>
                        <div className="mt-1 text-xs font-semibold">
                          {formatRelativeTime(selected.updated_at)}
                        </div>
                      </div>
                      <div className="rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reference</div>
                        <div className="mt-1 text-xs font-mono flex items-center gap-1 text-foreground/80">
                          <Hash className="w-3 h-3 text-muted-foreground" />
                          {selected.id.substring(0, 8)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <ScrollArea className="flex-1 min-h-0">
                    <div className="px-5 py-4 space-y-4">
                      <div className="rounded-2xl border border-border/50 bg-muted/20 p-4">
                        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2 flex items-center gap-1.5">
                          <MessageCircle className="w-3.5 h-3.5" />
                          Message from staff
                        </div>
                        <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                          {selected.description || "No description provided."}
                        </div>
                      </div>

                      {selected.voice_audio_url ? (
                        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4">
                          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-purple-700 dark:text-purple-300 mb-2 flex items-center gap-1.5">
                            <Mic className="w-3.5 h-3.5" />
                            Original voice note
                            {selected.transcription_language ? (
                              <Badge variant="secondary" className="ml-1 text-[9px] uppercase h-4 px-1">
                                {selected.transcription_language}
                              </Badge>
                            ) : null}
                          </div>
                          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                          <audio controls src={selected.voice_audio_url} className="w-full h-9" />
                          {selected.transcription ? (
                            <div className="mt-3 text-xs text-foreground/80 bg-background/70 rounded-lg p-3 border border-border/30 leading-relaxed">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">
                                Transcript
                              </span>
                              {selected.transcription}
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="rounded-2xl border border-border/50 bg-background p-4 flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted shrink-0">
                          <UserCircle2 className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                            Assigned to
                          </div>
                          {getAssigneeName(selected) ? (
                            <>
                              <div className="text-sm font-semibold truncate">{getAssigneeName(selected)}</div>
                              {selected.assignee_summary?.email || selected.assignee_details?.email ? (
                                <div className="text-xs text-muted-foreground truncate">
                                  {selected.assignee_summary?.email || selected.assignee_details?.email}
                                </div>
                              ) : null}
                            </>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              Unassigned — reassign or set a category owner in Settings.
                            </div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full shrink-0"
                          onClick={() => setReassignModalOpen(true)}
                          disabled={mutateAction.isPending}
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" />
                          Reassign
                        </Button>
                      </div>

                      <div>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            Activity
                          </div>
                          <Separator className="flex-1" />
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {(selected.comments || []).length}
                          </span>
                        </div>

                        {(selected.comments || []).length === 0 ? (
                          <div className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
                            No activity yet — replies and status changes appear here.
                          </div>
                        ) : (
                          <div className="relative space-y-0 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-border/60">
                            {[...(selected.comments || [])]
                              .slice()
                              .sort(
                                (a, b) =>
                                  new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
                              )
                              .map((c) => {
                                const author =
                                  c.author_details?.first_name || c.author_details?.last_name
                                    ? `${c.author_details?.first_name || ""} ${c.author_details?.last_name || ""}`.trim()
                                    : c.kind === "system"
                                      ? "Miya AI"
                                      : "Manager";
                                return (
                                  <div key={c.id} className="relative pl-7 pb-4 last:pb-0">
                                    <div
                                      className={cn(
                                        "absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-background ring-1",
                                        c.kind === "status_change"
                                          ? "bg-sky-500 ring-sky-200"
                                          : c.kind === "system"
                                            ? "bg-violet-500 ring-violet-200"
                                            : "bg-primary ring-primary/20",
                                      )}
                                    />
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground mb-1.5">
                                      <span className="font-semibold text-foreground/80">{author}</span>
                                      <span>·</span>
                                      <span title={formatAbsoluteDateTime(c.created_at)}>
                                        {formatRelativeTime(c.created_at)}
                                      </span>
                                      <Badge
                                        variant="secondary"
                                        className="text-[9px] px-1.5 h-4 uppercase font-bold tracking-tighter"
                                      >
                                        {c.kind}
                                      </Badge>
                                    </div>
                                    <div className="text-sm text-foreground/85 bg-muted/25 rounded-xl px-3.5 py-2.5 border border-border/40 leading-relaxed whitespace-pre-wrap">
                                      {c.body}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    </div>
                  </ScrollArea>

                  <div className="shrink-0 border-t border-border/60 bg-muted/40 backdrop-blur-sm px-5 pt-4 pb-5 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {selected.status === "PENDING" ? (
                        <Button
                          className="rounded-full"
                          onClick={() => mutateAction.mutate({ action: "approve" })}
                          disabled={mutateAction.isPending}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1.5" />
                          Start working
                        </Button>
                      ) : null}
                      {selected.status === "APPROVED" || selected.status === "ESCALATED" ? (
                        <Button
                          variant="outline"
                          className="rounded-full"
                          onClick={() =>
                            mutateAction.mutate({
                              action: "wait-on",
                              payload: { reason: "Waiting on external dependency" },
                            })
                          }
                          disabled={mutateAction.isPending}
                        >
                          <PauseCircle className="w-4 h-4 mr-1.5" />
                          Waiting on…
                        </Button>
                      ) : null}
                      {selected.status === "WAITING_ON" ? (
                        <Button
                          className="rounded-full"
                          onClick={() => mutateAction.mutate({ action: "approve" })}
                          disabled={mutateAction.isPending}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1.5" />
                          Resume
                        </Button>
                      ) : null}
                      {selected.status !== "CLOSED" && selected.status !== "REJECTED" ? (
                        <>
                          <Button
                            variant="outline"
                            className="rounded-full"
                            onClick={() => setEscalateModalOpen(true)}
                            disabled={mutateAction.isPending}
                          >
                            <AlertCircle className="w-4 h-4 mr-1.5" />
                            Escalate
                          </Button>
                          <Button
                            variant="ghost"
                            className="rounded-full text-muted-foreground"
                            onClick={() => mutateAction.mutate({ action: "close" })}
                            disabled={mutateAction.isPending}
                          >
                            <XCircle className="w-4 h-4 mr-1.5" />
                            Close
                          </Button>
                        </>
                      ) : null}
                    </div>

                    <div className="relative">
                      <Textarea
                        placeholder="Reply to staff or leave an internal note…"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="min-h-[76px] rounded-2xl border-border/70 bg-background pr-24 resize-none"
                        onKeyDown={(e) => {
                          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                            e.preventDefault();
                            const body = comment.trim();
                            if (!body || mutateAction.isPending) return;
                            mutateAction.mutate({ action: "comment", payload: { body } });
                            setComment("");
                          }
                        }}
                      />
                      <Button
                        className="absolute bottom-2.5 right-2.5 rounded-xl shadow-sm"
                        size="sm"
                        onClick={() => {
                          const body = comment.trim();
                          if (!body) return;
                          mutateAction.mutate({ action: "comment", payload: { body } });
                          setComment("");
                        }}
                        disabled={mutateAction.isPending || !comment.trim()}
                      >
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                        Send
                      </Button>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      ⌘/Ctrl + Enter to send · Replies notify staff on WhatsApp when linked
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <EscalateStaffRequestModal
        open={escalateModalOpen}
        onOpenChange={setEscalateModalOpen}
        isPending={mutateAction.isPending}
        category={selected?.category}
        onConfirm={(assigneeId) => {
          const note = comment.trim() || "Escalated";
          mutateAction.mutate(
            { action: "escalate", payload: { note, assignee_id: assigneeId } },
            {
              onSuccess: () => {
                setEscalateModalOpen(false);
              },
            }
          );
        }}
      />

      <EscalateStaffRequestModal
        mode="reassign"
        open={reassignModalOpen}
        onOpenChange={setReassignModalOpen}
        isPending={mutateAction.isPending}
        category={selected?.category}
        onConfirm={(assigneeId) => {
          const note = comment.trim();
          mutateAction.mutate(
            { action: "reassign", payload: { assignee_id: assigneeId, note } },
            {
              onSuccess: () => {
                setReassignModalOpen(false);
                setComment("");
              },
            }
          );
        }}
      />
    </div>
  );
};

export default StaffRequestsPage;

