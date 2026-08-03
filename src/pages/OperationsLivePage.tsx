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
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { AuthContextType } from "@/contexts/AuthContext.types";
import { api, BACKEND_URL } from "@/lib/api";
import type { OperationsLiveItem } from "@/lib/types";
import { openDashboardTaskSheet } from "@/lib/dashboard-task-sheet";
import {
  dashboardTaskPrimaryAction,
  dashboardTaskSecondaryStatuses,
  dashboardTaskStatusLabel,
  resolveStoredMediaUrl,
} from "@/components/dashboard/dashboard-task-detail-utils";
import { toast } from "sonner";

type SearchBy = "staff" | "task" | "category";
type LaneKey = "pending" | "in_progress" | "completed";

const QUERY_KEY = ["dashboard", "operations-live"] as const;

const LANE_STATUS: Record<LaneKey, OperationsLiveItem["status"]> = {
  pending: "PENDING",
  in_progress: "IN_PROGRESS",
  completed: "COMPLETED",
};

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

function formatPerson(
  person?: { name?: string; role?: string | null } | null,
): string {
  if (!person?.name) return "-";
  if (person.name === "Me" || !person.role) return person.name;
  return `${person.name} (${String(person.role).toLowerCase()})`;
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
      <td className="px-4 py-3.5 text-[13px] text-foreground whitespace-nowrap">
        {formatPerson(item.from)}
      </td>
      <td className="px-4 py-3.5 text-[13px] text-foreground whitespace-nowrap">
        {item.to?.name || "-"}
      </td>
      <td className="px-4 py-3.5 whitespace-nowrap">
        <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-[12px] text-muted-foreground">
          {categoryLabel(item, t)}
        </span>
      </td>
      <td
        className="px-4 py-3.5 text-[13px] text-foreground max-w-[280px]"
        title={item.operation || item.title}
      >
        <span className="line-clamp-2">{item.operation || item.title}</span>
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
        {item.age_label || "-"}
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
            {formatPerson(escalated)}
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
  t,
  onOpenRow,
  onStatusChange,
  updatingId,
}: {
  title: string;
  count: number;
  items: OperationsLiveItem[];
  lane: LaneKey;
  t: (key: string, options?: Record<string, unknown>) => string;
  onOpenRow: (id: string) => void;
  onStatusChange: (id: string, status: OperationsLiveItem["status"]) => void;
  updatingId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `lane:${lane}` });

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
                <th className="px-4 py-2.5 font-semibold">{t("operations_live.col.from")}</th>
                <th className="px-4 py-2.5 font-semibold">{t("operations_live.col.to")}</th>
                <th className="px-4 py-2.5 font-semibold">{t("operations_live.col.category")}</th>
                <th className="px-4 py-2.5 font-semibold min-w-[220px]">
                  {t("operations_live.col.operation")}
                </th>
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
      </div>
    </section>
  );
}

export default function OperationsLivePage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth() as AuthContextType;

  const [search, setSearch] = useState("");
  const [searchBy, setSearchBy] = useState<SearchBy>("staff");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeDrag, setActiveDrag] = useState<OperationsLiveItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: [...QUERY_KEY, debouncedSearch, searchBy],
    queryFn: () =>
      api.getOperationsLive({
        limit: 50,
        q: debouncedSearch || undefined,
        searchBy,
      }),
    // WebSocket tasks_invalidate is primary; poll is a safety net.
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

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("operations_live.search_placeholder")}
              className="h-11 rounded-full border-border bg-card pl-10 pr-4 text-sm shadow-sm placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {t("operations_live.search_by")}
            </span>
            {(["staff", "task", "category"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={cn(
                  "h-9 rounded-full px-4 text-sm font-medium transition-colors border",
                  searchBy === mode
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card text-foreground border-border hover:bg-muted",
                )}
                onClick={() => setSearchBy(mode)}
              >
                {t(`operations_live.search_mode.${mode}`)}
              </button>
            ))}
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full bg-card"
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
                count={data?.counts.pending ?? data?.pending.length ?? 0}
                items={data?.pending ?? []}
                lane="pending"
                t={t}
                onOpenRow={openRow}
                onStatusChange={(id, status) =>
                  statusMutation.mutate({ taskId: id, status })
                }
                updatingId={updatingId}
              />
              <OperationsLiveTable
                title={t("operations_live.section.in_progress")}
                count={data?.counts.in_progress ?? data?.in_progress.length ?? 0}
                items={data?.in_progress ?? []}
                lane="in_progress"
                t={t}
                onOpenRow={openRow}
                onStatusChange={(id, status) =>
                  statusMutation.mutate({ taskId: id, status })
                }
                updatingId={updatingId}
              />
              <OperationsLiveTable
                title={t("operations_live.section.completed")}
                count={data?.counts.completed ?? data?.completed.length ?? 0}
                items={data?.completed ?? []}
                lane="completed"
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
                  {activeDrag.operation || activeDrag.title}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}
