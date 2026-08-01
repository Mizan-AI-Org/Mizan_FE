import React from "react";
import {
  Calendar,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { TaskAssigneePicker } from "@/components/dashboard/TaskAssigneePicker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { BACKEND_URL } from "@/lib/api";
import type { DashboardTaskDemandItem } from "@/lib/types";
import {
  dashboardTaskPrimaryAction,
  dashboardTaskPriorityBadge,
  dashboardTaskSecondaryStatuses,
  dashboardTaskStatusBadge,
  dashboardTaskStatusLabel,
  resolveStoredMediaUrl,
} from "@/components/dashboard/dashboard-task-detail-utils";

export function DashboardTaskDetailContent({
  task,
  widgetTitle,
  onStatusChange,
  onAssigneeChange,
  isUpdating,
  isAssigneeUpdating,
  t,
  onOpenInbox,
}: {
  task: DashboardTaskDemandItem;
  widgetTitle?: string;
  onStatusChange: (status: DashboardTaskDemandItem["status"]) => void;
  onAssigneeChange?: (assigneeId: string | null) => void;
  isUpdating: boolean;
  isAssigneeUpdating?: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
  onOpenInbox?: () => void;
}) {
  const primary = dashboardTaskPrimaryAction(task.status, t);
  const secondaryStatuses = dashboardTaskSecondaryStatuses(task.status, primary?.nextStatus);
  const dueLabel = task.due_date
    ? new Date(task.due_date).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-1 pb-4">
        {widgetTitle ? (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-200/80 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/40 dark:text-violet-300">
            <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
            {widgetTitle}
          </div>
        ) : null}

        <div>
          <h2 className="text-xl font-bold leading-tight tracking-tight text-foreground sm:text-2xl">
            {task.title}
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {[task.source_label || task.source, task.assignee?.name]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase",
              dashboardTaskStatusBadge(task.status),
            )}
          >
            {dashboardTaskStatusLabel(task.status, t)}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase",
              dashboardTaskPriorityBadge(task.priority),
            )}
          >
            {String(task.priority || "MEDIUM")}
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("dashboard.task_detail.assignee", { defaultValue: "Assignee" })}
            </div>
            <div className="mt-1.5">
              {onAssigneeChange && task.kind !== "invoice" ? (
                <TaskAssigneePicker
                  assigneeId={task.assignee?.id ?? null}
                  assigneeName={task.assignee?.name}
                  onChange={onAssigneeChange}
                  disabled={isUpdating}
                  isUpdating={isAssigneeUpdating}
                />
              ) : (
                <p className="text-sm font-medium truncate">
                  {task.assignee?.name || t("staff.requests.unassigned")}
                </p>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("dashboard.task_detail.due", { defaultValue: "Due" })}
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span>{dueLabel || t("dashboard.task_detail.no_due", { defaultValue: "No due date" })}</span>
            </div>
          </div>
        </div>

        {task.ai_summary ? (
          <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/70 px-3.5 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/30">
            <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-800/80 dark:text-emerald-300/80">
              {t("dashboard.tasks_demands.ai_prefix")}
            </div>
            <p className="mt-1 text-sm leading-relaxed text-emerald-950 dark:text-emerald-50">
              {task.ai_summary}
            </p>
          </div>
        ) : null}

        {(task.description || !task.ai_summary) && (
          <div className="rounded-xl border border-border/50 bg-muted/15 px-3.5 py-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("staff.requests.details")}
            </div>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {task.description || t("staff.requests.no_description")}
            </p>
          </div>
        )}

        {task.proof_media_url || task.has_photo_proof ? (
          <div className="rounded-xl border border-border/50 bg-background px-3.5 py-3 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("staff.requests.photo_proof", { defaultValue: "Photo proof" })}
            </div>
            {task.proof_media_url ? (
              <img
                src={resolveStoredMediaUrl(task.proof_media_url, BACKEND_URL) || task.proof_media_url}
                alt={task.proof_caption || "Task proof"}
                className="max-h-52 w-full rounded-lg border object-contain bg-muted/20"
              />
            ) : null}
            {task.proof_caption ? (
              <p className="text-sm whitespace-pre-wrap">{task.proof_caption}</p>
            ) : null}
          </div>
        ) : task.require_photo_proof ? (
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 px-3.5 py-2.5 text-sm text-amber-900">
            {t("staff.requests.photo_proof_needed", {
              defaultValue: "Photo proof required before completion.",
            })}
          </div>
        ) : null}
      </div>

      <div className="shrink-0 space-y-2 border-t border-border/60 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          {primary ? (
            <Button
              className="flex-1 sm:flex-none"
              disabled={isUpdating}
              onClick={() => onStatusChange(primary.nextStatus)}
            >
              {primary.label}
            </Button>
          ) : null}
          {secondaryStatuses.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={isUpdating} className="gap-1.5">
                  {t("dashboard.task_detail.more_actions", { defaultValue: "More actions" })}
                  <ChevronDown className="h-4 w-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {secondaryStatuses.map((nextStatus) => (
                  <DropdownMenuItem
                    key={nextStatus}
                    onClick={() => onStatusChange(nextStatus)}
                  >
                    {dashboardTaskStatusLabel(nextStatus, t)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
        {onOpenInbox ? (
          <button
            type="button"
            onClick={onOpenInbox}
            className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            {t("dashboard.task_detail.open_inbox", { defaultValue: "Open in staff inbox" })}
          </button>
        ) : null}
      </div>
    </div>
  );
}
