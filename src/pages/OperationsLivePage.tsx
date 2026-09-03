import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  GripVertical,
  Image as ImageIcon,
  Loader2,
  Mic,
  MoreHorizontal,
  RefreshCw,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { AuthContextType } from "@/contexts/AuthContext.types";
import { api, BACKEND_URL } from "@/lib/api";
import type { OperationsLiveItem, OperationsLiveLanePagination } from "@/lib/types";
import { openDashboardTaskSheet } from "@/lib/dashboard-task-sheet";
import {
  dashboardTaskPrimaryAction,
  dashboardTaskSecondaryStatuses,
  dashboardTaskStatusLabel,
  resolveStoredMediaUrl,
} from "@/components/dashboard/dashboard-task-detail-utils";
import { toast } from "sonner";

type LaneKey = "pending" | "in_progress" | "completed";

const QUERY_KEY = ["dashboard", "operations-live"] as const;
export const OPERATIONS_LIVE_PAGE_SIZE = 15;

const DEFAULT_LANE_PAGINATION: OperationsLiveLanePagination = {
  page: 1,
  page_size: OPERATIONS_LIVE_PAGE_SIZE,
  total: 0,
  total_pages: 1,
};

const LANE_STATUS: Record<LaneKey, OperationsLiveItem["status"]> = {
  pending: "PENDING",
  in_progress: "IN_PROGRESS",
  completed: "COMPLETED",
};

const ROLE_I18N: Record<string, string> = {
  "super admin": "operations_live.role.super_admin",
  admin: "operations_live.role.admin",
  owner: "operations_live.role.owner",
  manager: "operations_live.role.manager",
  supervisor: "operations_live.role.supervisor",
  chef: "operations_live.role.chef",
  waiter: "operations_live.role.waiter",
  cashier: "operations_live.role.cashier",
  kitchen: "operations_live.role.kitchen",
  cleaner: "operations_live.role.cleaner",
  delivery: "operations_live.role.delivery",
  staff: "operations_live.role.staff",
  receptionist: "operations_live.role.receptionist",
};

function localizeAgeLabel(
  label: string | undefined,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  const raw = (label || "").trim();
  if (!raw || raw === "-") return "-";
  const lower = raw.toLowerCase();
  if (lower === "just now") return t("operations_live.rel.just_now");
  if (lower === "yesterday") return t("operations_live.rel.yesterday");
  let m = lower.match(/^(\d+)\s*m\s*ago$/);
  if (m) return t("operations_live.rel.minutes", { count: Number(m[1]) });
  m = lower.match(/^(\d+)\s*h\s*ago$/);
  if (m) return t("operations_live.rel.hours", { count: Number(m[1]) });
  m = lower.match(/^(\d+)\s*d\s*ago$/);
  if (m) return t("operations_live.rel.days", { count: Number(m[1]) });
  m = lower.match(/^(\d+)\s*w\s*ago$/);
  if (m) return t("operations_live.rel.weeks", { count: Number(m[1]) });
  m = lower.match(/^(\d+)\s*mo\s*ago$/);
  if (m) return t("operations_live.rel.months", { count: Number(m[1]) });
  m = lower.match(/^(\d+)\s*y\s*ago$/);
  if (m) return t("operations_live.rel.years", { count: Number(m[1]) });
  return raw;
}

function localizeRole(
  role: string | null | undefined,
  t: (key: string, options?: Record<string, unknown>) => string,
): string | null {
  if (!role) return null;
  const key = ROLE_I18N[String(role).trim().toLowerCase()];
  if (key) return t(key);
  return String(role).toLowerCase();
}

function formatPerson(
  person: { name?: string; role?: string | null } | null | undefined,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (!person?.name) return "-";
  const name =
    person.name === "Me" || person.name === "Staff"
      ? t(person.name === "Me" ? "operations_live.person.me" : "operations_live.person.staff")
      : person.name;
  const role = localizeRole(person.role, t);
  if (!role || person.name === "Me") return name;
  return `${name} (${role})`;
}

function laneForStatus(status: string | undefined): LaneKey {
  const s = String(status || "").toUpperCase();
  if (s === "IN_PROGRESS" || s === "UNABLE_TO_COMPLETE" || s === "ACCEPTED") {
    return s === "ACCEPTED" ? "pending" : "in_progress";
  }
  if (s === "COMPLETED" || s === "CANCELLED") return "completed";
  return "pending";
}

function categoryLabel(
  item: OperationsLiveItem,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (item.process_label?.trim()) return item.process_label.trim();
  const c = String(item.category || "OTHER").toUpperCase();
  const key = `operations_live.category.${c.toLowerCase()}`;
  const mapped = t(key, { defaultValue: "" });
  if (mapped) return mapped;
  return c.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function displayStatusBadge(status: OperationsLiveItem["display_status"]) {
  switch (status) {
    case "critical":
      return "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800";
    case "in_progress":
      return "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800";
    case "completed":
      return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800";
    default:
      return "bg-orange-100 text-orange-900 border-orange-200 dark:bg-orange-950/40 dark:text-orange-200 dark:border-orange-800";
  }
}

function displayStatusLabel(
  status: OperationsLiveItem["display_status"],
  t: (key: string) => string,
): string {
  if (status === "critical") return t("operations_live.status.critical");
  if (status === "in_progress") return t("operations_live.status.in_progress");
  if (status === "completed") return t("operations_live.status.completed");
  return t("operations_live.status.pending");
}

function operationCell(
  item: OperationsLiveItem,
): { title: string; detail: string | null } {
  const title = (item.title || item.operation || "").trim();
  const rawDetail = (item.description || "").trim();
  const detail =
    rawDetail &&
    rawDetail !== title &&
    !rawDetail.toLowerCase().startsWith(title.toLowerCase())
      ? rawDetail.split("\n")[0].trim()
      : null;
  return { title: title || "—", detail };
}

function OperationDemandCell({ item }: { item: OperationsLiveItem }) {
  const { title, detail } = operationCell(item);
  return (
    <div className="min-w-0">
      <p className="font-medium text-foreground line-clamp-1">{title}</p>
      {detail ? (
        <p className="text-[12px] text-muted-foreground line-clamp-1 mt-0.5">{detail}</p>
      ) : null}
    </div>
  );
}

function attachmentCell(
  item: OperationsLiveItem,
  t: (key: string, options?: Record<string, unknown>) => string,
): React.ReactNode {
  const label = item.attachment_label;
  const url = item.attachment_url;
  if (!label) {
    return (
      <span className="text-muted-foreground">{t("operations_live.attachment.none")}</span>
    );
  }
  const text = t(`operations_live.attachment.${label}`, { defaultValue: label });
  if (!url) return <span className="text-foreground/80">{text}</span>;
  const href = resolveStoredMediaUrl(url, BACKEND_URL);
  const Icon =
    label === "picture" ? ImageIcon : label === "voice" ? Mic : FileText;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-foreground underline-offset-2 hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      {text}
    </a>
  );
}

function OperationsLiveRow({
  item,
  lane,
  t,
  onOpen,
  onStatusChange,
  isUpdating,
}: {
  item: OperationsLiveItem;
  lane: LaneKey;
  t: (key: string, options?: Record<string, unknown>) => string;
  onOpen: () => void;
  onStatusChange: (status: OperationsLiveItem["status"]) => void;
  isUpdating: boolean;
}) {
  const primary = dashboardTaskPrimaryAction(item.status, t);
  const secondary = dashboardTaskSecondaryStatuses(
    item.status,
    primary?.nextStatus,
  ).filter((s) => s !== "CANCELLED");
  const isCritical = item.display_status === "critical" && lane === "pending";
  const escalated = item.escalated_to;
  const canCancel =
    item.can_cancel !== false &&
    !["COMPLETED", "CANCELLED"].includes(String(item.status || "").toUpperCase());
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `row:${item.id}`,
    data: { item, fromLane: lane },
  });

  const moveTargets = (["pending", "in_progress", "completed"] as LaneKey[]).filter(
    (k) => k !== lane,
  );

  return (
    <tr
      ref={setNodeRef}
      className={cn(
        "border-b border-border/70 last:border-0 cursor-pointer transition-colors",
        isCritical
          ? "bg-red-50/90 hover:bg-red-100/80 dark:bg-red-950/35 dark:hover:bg-red-950/50"
          : "bg-card hover:bg-muted/50",
        isDragging && "opacity-40",
      )}
      onClick={onOpen}
    >
      <td
        className="w-8 px-1 py-3.5 text-muted-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted cursor-grab active:cursor-grabbing"
          aria-label={t("operations_live.action.drag")}
          {...listeners}
          {...attributes}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </td>
      <td
        className="px-4 py-3.5 text-[13px] text-foreground max-w-[280px]"
        title={(() => {
          const { title, detail } = operationCell(item);
          return detail ? `${title} — ${detail}` : title;
        })()}
      >
        <OperationDemandCell item={item} />
      </td>
      <td className="px-4 py-3.5 text-[13px] text-foreground whitespace-nowrap">
        {formatPerson(item.from, t)}
      </td>
      <td className="px-4 py-3.5 text-[13px] text-foreground whitespace-nowrap">
        {item.to?.name
          ? formatPerson(
              {
                name: item.to.is_me ? "Me" : item.to.name,
                role: item.to.role,
              },
              t,
            )
          : "-"}
      </td>
      <td className="px-4 py-3.5 whitespace-nowrap">
        <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-[12px] text-muted-foreground">
          {categoryLabel(item, t)}
        </span>
      </td>
      <td className="px-4 py-3.5 whitespace-nowrap">
        <Badge
          variant="outline"
          className={cn(
            "rounded-md px-2.5 py-0.5 text-[12px] font-medium border",
            displayStatusBadge(item.display_status),
          )}
        >
          {displayStatusLabel(item.display_status, t)}
        </Badge>
      </td>
      <td className="px-4 py-3.5 text-[13px] text-muted-foreground whitespace-nowrap">
        {localizeAgeLabel(item.age_label, t)}
      </td>
      <td className="px-4 py-3.5 text-[13px] whitespace-nowrap">
        {escalated?.name ? (
          <span
            className={cn(
              isCritical || lane === "in_progress"
                ? "text-red-600 dark:text-red-400 font-medium"
                : "text-foreground/80",
            )}
          >
            {formatPerson(escalated, t)}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </td>
      <td className="px-4 py-3.5 text-[13px]">{attachmentCell(item, t)}</td>
      <td className="px-2 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MoreHorizontal className="h-4 w-4" />
              )}
              <span className="sr-only">{t("operations_live.actions")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={onOpen}>
              {t("operations_live.action.view")}
            </DropdownMenuItem>
            {moveTargets.map((target) => (
              <DropdownMenuItem
                key={target}
                onClick={() => onStatusChange(LANE_STATUS[target])}
              >
                {t(`operations_live.move_to.${target}`)}
              </DropdownMenuItem>
            ))}
            {primary ? (
              <DropdownMenuItem onClick={() => onStatusChange(primary.nextStatus)}>
                {primary.label}
              </DropdownMenuItem>
            ) : null}
            {secondary.map((s) => (
              <DropdownMenuItem key={s} onClick={() => onStatusChange(s)}>
                {dashboardTaskStatusLabel(s, t)}
              </DropdownMenuItem>
            ))}
            {canCancel ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                  onClick={() => onStatusChange("CANCELLED")}
                >
                  {t("operations_live.action.cancel")}
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

function OperationsLiveTable({
  title,
  count,
  items,
  lane,
  pagination,
  onPageChange,
  t,
  onOpenRow,
  onStatusChange,
  updatingId,
}: {
  title: string;
  count: number;
  items: OperationsLiveItem[];
  lane: LaneKey;
  pagination: OperationsLiveLanePagination;
  onPageChange: (page: number) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
  onOpenRow: (id: string) => void;
  onStatusChange: (id: string, status: OperationsLiveItem["status"]) => void;
  updatingId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `lane:${lane}` });
  const page = pagination.page;
  const totalPages = Math.max(1, pagination.total_pages);
  const total = pagination.total;

  const rangeStart = total === 0 ? 0 : (page - 1) * pagination.page_size + 1;
  const rangeEnd = Math.min(page * pagination.page_size, total);

  return (
    <section className="space-y-2.5">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {title} ({count})
      </h2>
      <div
        ref={setNodeRef}
        className={cn(
          "overflow-hidden rounded-md border border-border bg-card shadow-sm transition-colors",
          isOver && "ring-2 ring-primary/40 border-primary/40",
        )}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-left">
            <thead>
              <tr className="bg-muted/80 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                <th className="w-8 px-1 py-2.5" />
                <th className="px-4 py-2.5 font-semibold min-w-[220px]">
                  {t("operations_live.col.operation")}
                </th>
                <th className="px-4 py-2.5 font-semibold">{t("operations_live.col.from")}</th>
                <th className="px-4 py-2.5 font-semibold">{t("operations_live.col.to")}</th>
                <th className="px-4 py-2.5 font-semibold">{t("operations_live.col.category")}</th>
                <th className="px-4 py-2.5 font-semibold">{t("operations_live.col.status")}</th>
                <th className="px-4 py-2.5 font-semibold">{t("operations_live.col.time")}</th>
                <th className="px-4 py-2.5 font-semibold">{t("operations_live.col.escalated")}</th>
                <th className="px-4 py-2.5 font-semibold">{t("operations_live.col.attachment")}</th>
                <th className="w-12 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-10 text-center text-sm text-muted-foreground bg-card"
                  >
                    {t("operations_live.empty")}
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <OperationsLiveRow
                    key={item.id}
                    item={item}
                    lane={lane}
                    t={t}
                    onOpen={() => onOpenRow(item.id)}
                    onStatusChange={(status) => onStatusChange(item.id, status)}
                    isUpdating={updatingId === item.id}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
        {total > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/40 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">
              {t("operations_live.pagination.range", {
                start: rangeStart,
                end: rangeEnd,
                total,
              })}
            </p>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1 px-2.5"
                disabled={page <= 1}
                onClick={() => onPageChange(Math.max(1, page - 1))}
                aria-label={t("operations_live.pagination.prev")}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">{t("operations_live.pagination.prev")}</span>
              </Button>
              <span className="min-w-[5.5rem] text-center text-xs tabular-nums text-muted-foreground">
                {t("operations_live.pagination.page", { page, pages: totalPages })}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1 px-2.5"
                disabled={page >= totalPages}
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                aria-label={t("operations_live.pagination.next")}
              >
                <span className="hidden sm:inline">{t("operations_live.pagination.next")}</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function categoryFilterLabel(
  key: string,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (key.startsWith("process:")) return key.slice(8);
  const mapped = t(`operations_live.category.${key.toLowerCase()}`, { defaultValue: "" });
  if (mapped) return mapped;
  return key.replace(/_/g, " ");
}

export default function OperationsLivePage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth() as AuthContextType;

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [staffFilter, setStaffFilter] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [lanePages, setLanePages] = useState({
    pending: 1,
    in_progress: 1,
    completed: 1,
  });
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeDrag, setActiveDrag] = useState<OperationsLiveItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  React.useEffect(() => {
    setLanePages({ pending: 1, in_progress: 1, completed: 1 });
  }, [debouncedSearch, categoryFilter, staffFilter]);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: [
      ...QUERY_KEY,
      debouncedSearch,
      categoryFilter,
      staffFilter,
      lanePages.pending,
      lanePages.in_progress,
      lanePages.completed,
    ],
    queryFn: () =>
      api.getOperationsLive({
        pageSize: OPERATIONS_LIVE_PAGE_SIZE,
        pendingPage: lanePages.pending,
        inProgressPage: lanePages.in_progress,
        completedPage: lanePages.completed,
        category: categoryFilter || undefined,
        staff: staffFilter || undefined,
        q: debouncedSearch || undefined,
      }),
    refetchInterval: 60_000,
    placeholderData: (prev) => prev,
  });

  const statusMutation = useMutation({
    mutationFn: ({
      taskId,
      status,
    }: {
      taskId: string;
      status: OperationsLiveItem["status"];
    }) => api.updateDashboardTaskStatus(taskId, status),
    onMutate: ({ taskId }) => setUpdatingId(taskId),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "tasks-demands"] });
      if (vars.status === "CANCELLED") {
        toast.success(t("operations_live.cancelled"));
      } else {
        toast.success(t("operations_live.status_updated"));
      }
    },
    onError: () => toast.error(t("operations_live.status_error")),
    onSettled: () => setUpdatingId(null),
  });

  const restaurantLabel = useMemo(() => {
    const fromApi = data?.restaurant_name?.trim();
    if (fromApi) return fromApi;
    const fromUser = (user as { restaurant_name?: string } | null)?.restaurant_name;
    return fromUser || t("operations_live.default_restaurant");
  }, [data?.restaurant_name, user, t]);

  const categoryOptions = useMemo(() => {
    return data?.filter_options?.categories ?? [];
  }, [data?.filter_options?.categories]);

  const staffOptions = useMemo(() => {
    return data?.filter_options?.staff ?? [];
  }, [data?.filter_options?.staff]);

  const lanePagination = useMemo(
    () => ({
      pending: data?.pagination?.pending ?? {
        ...DEFAULT_LANE_PAGINATION,
        total: data?.counts.pending ?? 0,
      },
      in_progress: data?.pagination?.in_progress ?? {
        ...DEFAULT_LANE_PAGINATION,
        total: data?.counts.in_progress ?? 0,
      },
      completed: data?.pagination?.completed ?? {
        ...DEFAULT_LANE_PAGINATION,
        total: data?.counts.completed ?? 0,
      },
    }),
    [data],
  );

  const openRow = (taskId: string) => {
    openDashboardTaskSheet(navigate, location, taskId, { keepPath: true });
  };

  const onDragStart = (event: DragStartEvent) => {
    const item = (event.active.data.current as { item?: OperationsLiveItem } | undefined)
      ?.item;
    setActiveDrag(item || null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveDrag(null);
    const overId = String(event.over?.id || "");
    if (!overId.startsWith("lane:")) return;
    const targetLane = overId.replace("lane:", "") as LaneKey;
    if (!LANE_STATUS[targetLane]) return;
    const fromLane = (event.active.data.current as { fromLane?: LaneKey } | undefined)
      ?.fromLane;
    const item = (event.active.data.current as { item?: OperationsLiveItem } | undefined)
      ?.item;
    if (!item || fromLane === targetLane) return;
    if (laneForStatus(item.status) === targetLane) return;
    statusMutation.mutate({ taskId: item.id, status: LANE_STATUS[targetLane] });
  };

  return (
    <div className="min-h-[calc(100vh-5.5rem)] bg-background">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-5 pb-28 space-y-6">
        <header className="space-y-1">
          <h1 className="text-[2rem] font-bold tracking-tight text-foreground leading-tight">
            {t("operations_live.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("operations_live.subtitle", { restaurant: restaurantLabel })}
          </p>
        </header>

        <div
          className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"
          role="toolbar"
          aria-label={t("operations_live.filters_toolbar")}
        >
          {/* Search: 50% on desktop, full width on mobile */}
          <div className="relative w-full sm:w-1/2">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("operations_live.search_placeholder")}
              className="h-11 rounded-full border-border bg-card pl-10 pr-4 text-sm shadow-sm placeholder:text-muted-foreground"
            />
          </div>

          {/* Filters: 50% on desktop, full width on mobile */}
          <div className="flex w-full items-center gap-2 sm:w-1/2">
            <Select
              value={categoryFilter || "all"}
              onValueChange={(value) => setCategoryFilter(value === "all" ? "" : value)}
            >
              <SelectTrigger
                className="h-10 min-w-0 flex-1 rounded-full border-border bg-card text-sm shadow-sm"
                aria-label={t("operations_live.filter_category")}
              >
                <SelectValue placeholder={t("operations_live.filter_category_all")} />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="all">{t("operations_live.filter_category_all")}</SelectItem>
                {categoryOptions.map((key) => (
                  <SelectItem key={key} value={key}>
                    {categoryFilterLabel(key, t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={staffFilter || "all"}
              onValueChange={(value) => setStaffFilter(value === "all" ? "" : value)}
            >
              <SelectTrigger
                className="h-10 min-w-0 flex-1 rounded-full border-border bg-card text-sm shadow-sm"
                aria-label={t("operations_live.filter_staff")}
              >
                <SelectValue placeholder={t("operations_live.filter_staff_all")} />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="all">{t("operations_live.filter_staff_all")}</SelectItem>
                {staffOptions.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-full border-border bg-card shadow-sm"
              onClick={() => refetch()}
              disabled={isFetching}
              title={t("common.refresh")}
            >
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            {t("operations_live.loading")}
          </div>
        ) : isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error instanceof Error ? error.message : t("operations_live.error")}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragCancel={() => setActiveDrag(null)}
          >
            <div className="space-y-8">
              <OperationsLiveTable
                title={t("operations_live.section.new")}
                count={data?.counts.pending ?? 0}
                items={data?.pending ?? []}
                lane="pending"
                pagination={lanePagination.pending}
                onPageChange={(page) =>
                  setLanePages((prev) => ({ ...prev, pending: page }))
                }
                t={t}
                onOpenRow={openRow}
                onStatusChange={(id, status) =>
                  statusMutation.mutate({ taskId: id, status })
                }
                updatingId={updatingId}
              />
              <OperationsLiveTable
                title={t("operations_live.section.in_progress")}
                count={data?.counts.in_progress ?? 0}
                items={data?.in_progress ?? []}
                lane="in_progress"
                pagination={lanePagination.in_progress}
                onPageChange={(page) =>
                  setLanePages((prev) => ({ ...prev, in_progress: page }))
                }
                t={t}
                onOpenRow={openRow}
                onStatusChange={(id, status) =>
                  statusMutation.mutate({ taskId: id, status })
                }
                updatingId={updatingId}
              />
              <OperationsLiveTable
                title={t("operations_live.section.completed")}
                count={data?.counts.completed ?? 0}
                items={data?.completed ?? []}
                lane="completed"
                pagination={lanePagination.completed}
                onPageChange={(page) =>
                  setLanePages((prev) => ({ ...prev, completed: page }))
                }
                t={t}
                onOpenRow={openRow}
                onStatusChange={(id, status) =>
                  statusMutation.mutate({ taskId: id, status })
                }
                updatingId={updatingId}
              />
            </div>
            <DragOverlay>
              {activeDrag ? (
                <div className="rounded-md border border-border bg-card px-4 py-2 text-sm shadow-lg">
                  {operationCell(activeDrag).title}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}
