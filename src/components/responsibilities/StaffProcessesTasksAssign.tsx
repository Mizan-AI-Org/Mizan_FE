import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";
import { api, unwrapDrfListResponse, type ProcessTemplateRow } from "@/lib/api";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const PANEL_SHELL =
  "rounded-xl border border-slate-200/80 bg-slate-50/50 dark:border-slate-700/80 dark:bg-slate-900/30";

function staffHasProcess(row: ProcessTemplateRow, staffId: string): boolean {
  return (row.standing_assignees || []).map(String).includes(staffId);
}

export function StaffProcessesTasksAssign({
  staffId,
  defaultCollapsed = false,
}: {
  staffId: string;
  defaultCollapsed?: boolean;
}) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(!defaultCollapsed);
  const [pendingProcessIds, setPendingProcessIds] = useState<Set<string>>(new Set());
  const [taskDraft, setTaskDraft] = useState("");

  const workQuery = useQuery({
    queryKey: ["staff-work", staffId],
    queryFn: () => api.getStaffWork(staffId),
    enabled: Boolean(staffId),
  });
  const templatesQuery = useQuery({
    queryKey: ["process-templates"],
    queryFn: async () => unwrapDrfListResponse<ProcessTemplateRow>(await api.listProcessTemplates()),
  });

  const templates = templatesQuery.data || [];
  const assignedProcessIds = useMemo(
    () => new Set(templates.filter((row) => staffHasProcess(row, staffId)).map((row) => row.id)),
    [templates, staffId],
  );

  const activeTaskCount = useMemo(() => {
    const work = workQuery.data;
    if (!work) return 0;
    return work.active.length + work.pending.length + work.overdue.length;
  }, [workQuery.data]);

  const invalidateWork = () => {
    void queryClient.invalidateQueries({ queryKey: ["staff-work", staffId] });
    void queryClient.invalidateQueries({ queryKey: ["process-templates"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const setProcessAssignment = useMutation({
    mutationFn: async (input: { id: string; assign: boolean }) => {
      const row = templates.find((item) => item.id === input.id);
      if (!row) throw new Error("missing");
      const ids = new Set((row.standing_assignees || []).map(String));
      if (input.assign) ids.add(staffId);
      else ids.delete(staffId);
      return api.patchProcessTemplate(input.id, { standing_assignees: [...ids] });
    },
    onSuccess: () => invalidateWork(),
    onError: () => toast.error(t("cursorUi.resp.save_failed")),
  });

  const assignManyProcesses = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(
        ids.map(async (id) => {
          const row = templates.find((item) => item.id === id);
          if (!row || staffHasProcess(row, staffId)) return;
          const assignees = new Set((row.standing_assignees || []).map(String));
          assignees.add(staffId);
          await api.patchProcessTemplate(id, { standing_assignees: [...assignees] });
        }),
      );
    },
    onSuccess: () => {
      setPendingProcessIds(new Set());
      invalidateWork();
      toast.success(t("cursorUi.resp.processes_assigned", "Processes assigned"));
    },
    onError: () => toast.error(t("cursorUi.resp.save_failed")),
  });

  const createManyTasks = useMutation({
    mutationFn: async (titles: string[]) => {
      await Promise.all(
        titles.map((title) =>
          api.createDashboardTask({
            title,
            assigned_to: staffId,
          }),
        ),
      );
    },
    onSuccess: (_data, titles) => {
      setTaskDraft("");
      invalidateWork();
      toast.success(
        titles.length > 1
          ? t("cursorUi.resp.tasks_created_many", { count: titles.length, defaultValue: "{{count}} tasks added" })
          : t("cursorUi.resp.tasks_created_one", "Task added"),
      );
    },
    onError: () => toast.error(t("cursorUi.resp.save_failed")),
  });

  const unassignedTemplates = useMemo(
    () => templates.filter((row) => !assignedProcessIds.has(row.id)),
    [templates, assignedProcessIds],
  );

  const taskLines = useMemo(
    () =>
      taskDraft
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    [taskDraft],
  );

  const togglePending = (id: string, checked: boolean) => {
    setPendingProcessIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  if (workQuery.isLoading || templatesQuery.isLoading) {
    return (
      <div className={cn(PANEL_SHELL, "px-3 py-3 text-sm text-muted-foreground")}>
        {t("cursorUi.resp.loading")}
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={PANEL_SHELL} data-testid="staff-processes-tasks-assign">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors",
            "hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          )}
          aria-expanded={open}
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {t("cursorUi.resp.processes_tasks_title", "Processes & tasks")}
              </span>
              {assignedProcessIds.size > 0 || activeTaskCount > 0 ? (
                <span className="inline-flex items-center rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-primary">
                  {assignedProcessIds.size + activeTaskCount}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t(
                "cursorUi.resp.processes_tasks_hint",
                "Assign recurring processes and one-off tasks. Select multiple, then confirm.",
              )}
            </p>
            {!open ? (
              <p className="mt-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                {assignedProcessIds.size === 0 && activeTaskCount === 0
                  ? t("cursorUi.resp.processes_tasks_collapsed_none", "Nothing assigned — tap to add")
                  : t("cursorUi.resp.processes_tasks_collapsed_summary", {
                      processes: assignedProcessIds.size,
                      tasks: activeTaskCount,
                      defaultValue: "{{processes}} processes · {{tasks}} open tasks",
                    })}
              </p>
            ) : null}
          </div>
          <ChevronDown
            className={cn(
              "h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 dark:text-slate-400",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="max-h-[min(22rem,45vh)] space-y-4 overflow-y-auto border-t border-border/60 px-3 pb-3 pt-2">
          <section className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("cursorUi.resp.work_processes", "Processes")}
            </p>
            {assignedProcessIds.size > 0 ? (
              <ul className="space-y-1.5 rounded-lg border border-border/60 bg-background/60 px-2 py-1.5">
                {templates
                  .filter((row) => assignedProcessIds.has(row.id))
                  .map((row) => (
                    <label key={row.id} className="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox
                        checked
                        disabled={setProcessAssignment.isPending}
                        onCheckedChange={(checked) => {
                          if (checked !== true) setProcessAssignment.mutate({ id: row.id, assign: false });
                        }}
                        aria-label={row.name}
                      />
                      <span className="min-w-0 truncate">
                        {row.name}
                        {row.frequency ? (
                          <span className="ml-1 text-[11px] text-muted-foreground">{row.frequency}</span>
                        ) : null}
                      </span>
                    </label>
                  ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">{t("cursorUi.resp.work_empty", "None")}</p>
            )}
            {unassignedTemplates.length > 0 ? (
              <div className="space-y-2 rounded-lg border border-dashed border-border/70 bg-muted/20 px-2 py-2">
                <p className="text-[11px] font-medium text-muted-foreground">
                  {t("cursorUi.resp.pick_processes", "Select processes to assign")}
                </p>
                <ul className="max-h-36 space-y-1.5 overflow-y-auto">
                  {unassignedTemplates.map((row) => (
                    <label key={row.id} className="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox
                        checked={pendingProcessIds.has(row.id)}
                        onCheckedChange={(checked) => togglePending(row.id, checked === true)}
                        aria-label={row.name}
                      />
                      <span className="min-w-0 truncate">{row.name}</span>
                    </label>
                  ))}
                </ul>
                <Button
                  type="button"
                  size="sm"
                  className="h-9 w-full"
                  disabled={pendingProcessIds.size === 0 || assignManyProcesses.isPending}
                  onClick={() => assignManyProcesses.mutate([...pendingProcessIds])}
                >
                  {t("cursorUi.resp.assign_selected", {
                    count: pendingProcessIds.size,
                    defaultValue: "Assign selected ({{count}})",
                  })}
                </Button>
              </div>
            ) : null}
          </section>
          <section className="space-y-2 border-t border-border/50 pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("cursorUi.resp.work_create", "Create tasks")}
            </p>
            <Textarea
              value={taskDraft}
              onChange={(event) => setTaskDraft(event.target.value)}
              placeholder={t("cursorUi.resp.task_lines_placeholder", "One task per line")}
              className="min-h-[5.5rem] resize-y text-sm"
              rows={4}
            />
            <Button
              type="button"
              size="sm"
              className="h-9 w-full"
              disabled={taskLines.length === 0 || createManyTasks.isPending}
              onClick={() => createManyTasks.mutate(taskLines)}
            >
              {taskLines.length > 1
                ? t("cursorUi.resp.add_tasks_many", { count: taskLines.length, defaultValue: "Add {{count}} tasks" })
                : t("cursorUi.resp.add", "Add")}
            </Button>
          </section>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}