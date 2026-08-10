import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { api } from "@/lib/api";
import type { DashboardTaskDemandItem } from "@/lib/types";
import { useLanguage } from "@/hooks/use-language";
import { DashboardTaskDetailContent } from "@/components/dashboard/DashboardTaskDetailContent";
import { toast } from "sonner";

function tasksDemandsDetailHref(taskId: string): string {
  return `/dashboard/staff-requests?list=dashboard&task=${taskId}`;
}

export function DashboardTaskDetailSheet({
  taskId,
  open,
  onOpenChange,
  widgetTitle,
  queryKeysToInvalidate = [],
}: {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widgetTitle?: string;
  queryKeysToInvalidate?: readonly (readonly unknown[])[];
}) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const taskQuery = useQuery({
    queryKey: ["dashboard-task-demand", taskId],
    queryFn: async (): Promise<DashboardTaskDemandItem | null> => {
      if (!taskId) return null;
      return api.getDashboardTaskDemand(taskId);
    },
    enabled: open && !!taskId,
    staleTime: 10_000,
  });

  const invalidateTaskQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: ["dashboard-task-demand", taskId] });
    for (const key of queryKeysToInvalidate) {
      await queryClient.invalidateQueries({ queryKey: key });
    }
    await queryClient.invalidateQueries({ queryKey: ["dashboard", "tasks-demands"] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard", "operations-live"] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard", "custom-widget-tasks"] });
    await queryClient.invalidateQueries({
      predicate: (q) =>
        Array.isArray(q.queryKey) &&
        q.queryKey[0] === "dashboard" &&
        q.queryKey[1] === "category-tasks",
    });
    await queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
  };

  const statusMutation = useMutation({
    mutationFn: (nextStatus: DashboardTaskDemandItem["status"]) => {
      if (!taskId) throw new Error("No task selected");
      return api.updateDashboardTaskStatus(taskId, nextStatus);
    },
    onSuccess: async () => {
      await invalidateTaskQueries();
      toast.success(t("dashboard.task_detail.updated", { defaultValue: "Task updated" }));
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : t("dashboard.task_detail.update_failed", { defaultValue: "Could not update task" }));
    },
  });

  const saveAssigneesMutation = useMutation({
    mutationFn: (assigneeIds: string[]) => {
      if (!taskId) throw new Error("No task selected");
      return api.updateDashboardTaskAssignees(taskId, assigneeIds);
    },
    onSuccess: async (updated) => {
      queryClient.setQueryData(["dashboard-task-demand", taskId], updated);
      await invalidateTaskQueries();
      toast.success(
        t("dashboard.task_detail.assignees_saved", {
          defaultValue: "Assignees saved - staff notified on WhatsApp.",
        }),
      );
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error
          ? err.message
          : t("dashboard.task_detail.update_failed", { defaultValue: "Could not update task" }),
      );
    },
  });

  const task = taskQuery.data;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader className="shrink-0 space-y-1 pr-8 text-left">
          <SheetTitle className="text-base font-semibold">
            {t("dashboard.task_detail.title", { defaultValue: "Task" })}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {task?.title || t("dashboard.task_detail.title", { defaultValue: "Task" })}
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col pt-2">
          {taskQuery.isLoading ? (
            <div className="space-y-3 py-2">
              <div className="h-6 w-24 rounded-full bg-muted animate-pulse" />
              <div className="h-8 w-4/5 rounded-lg bg-muted animate-pulse" />
              <div className="h-20 rounded-xl bg-muted/70 animate-pulse" />
            </div>
          ) : taskQuery.isError || !task ? (
            <p className="py-6 text-sm text-destructive">
              {t("staff.requests.task_load_failed")}
            </p>
          ) : (
            <DashboardTaskDetailContent
              task={task}
              widgetTitle={widgetTitle}
              onStatusChange={(nextStatus) => statusMutation.mutate(nextStatus)}
              onSaveAssignees={
                task.kind === "dashboard" || task.kind === undefined
                  ? (ids) => saveAssigneesMutation.mutate(ids)
                  : undefined
              }
              isUpdating={statusMutation.isPending}
              isSaving={saveAssigneesMutation.isPending}
              t={t}
              onOpenInbox={() => {
                onOpenChange(false);
                navigate(tasksDemandsDetailHref(task.id));
              }}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
