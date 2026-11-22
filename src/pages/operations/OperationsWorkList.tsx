import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { useLanguage } from "@/hooks/use-language";
import { laneOf, type OperationsItem, type OperationsLane } from "@/pages/operations/contract";
import { OPERATIONS_OVERVIEW_KEY } from "@/pages/operations/useOperationsOverview";
import { cn } from "@/lib/utils";

const LANES: OperationsLane[] = ["pending", "in_progress", "completed"];

export function OperationsWorkList({
  items,
  view,
  onOpen,
  total,
}: {
  items: OperationsItem[];
  view: string;
  onOpen: (item: OperationsItem) => void;
  total?: number;
}) {
  const { t } = useLanguage();
  if (view === "board") return <Board items={items} onOpen={onOpen} />;
  return (
    <div className="space-y-2">
      <ul className="divide-y divide-border/80 overflow-hidden rounded-xl border border-border/80 bg-card">
        {items.length === 0 ? <li className="p-6 text-sm text-muted-foreground">{t("cursorUi.ops.empty")}</li> : null}
        {items.map((item) => (
          <li key={`${item.kind}-${item.id}`}>
            <button type="button" onClick={() => onOpen(item)} className="flex w-full items-center gap-4 px-4 py-3 text-start hover:bg-muted/40">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{item.title}</div>
                <div className="text-xs text-muted-foreground">
                  {t(`cursorUi.ops.category.${item.category}`)} · {t(`cursorUi.ops.lane.${laneOf(item)}`)} ·{" "}
                  {item.assignee ? item.assignee.name : t("cursorUi.ops.unassigned")}
                </div>
              </div>
              {item.claim?.claimable ? (
                <span className="text-xs font-medium text-primary">{t("cursorUi.ops.claim_badge")}</span>
              ) : item.claim?.open ? (
                <span className="text-xs font-medium text-muted-foreground">{t("cursorUi.ops.claim_waiting")}</span>
              ) : null}
              {item.awaitingApproval ? (
                <span className="text-xs font-medium text-sky-700 dark:text-sky-300">{t("cursorUi.ops.badge_validate")}</span>
              ) : null}
              {item.overdue ? <span className="text-xs font-medium text-destructive">{t("cursorUi.ops.badge_overdue")}</span> : null}
              {item.needsHelp ? <span className="text-xs font-medium text-amber-700">{t("cursorUi.ops.badge_need_help")}</span> : null}
              {typeof item.progress === "number" ? (
                <div className="hidden w-24 sm:block">
                  <Progress value={item.progress} />
                </div>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
      {typeof total === "number" && total > items.length ? (
        <p className="text-xs text-muted-foreground">{t("cursorUi.ops.showing", { shown: items.length, total })}</p>
      ) : null}
    </div>
  );
}

function Board({ items, onOpen }: { items: OperationsItem[]; onOpen: (item: OperationsItem) => void }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const move = useMutation({
    mutationFn: (input: { item: OperationsItem; lane: OperationsLane }) => {
      if (input.item.kind !== "task") return Promise.resolve(null);
      const status = input.lane === "completed" ? "COMPLETED" : input.lane === "in_progress" ? "IN_PROGRESS" : "PENDING";
      return api.updateDashboardTaskStatus(input.item.id, status);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [OPERATIONS_OVERVIEW_KEY] }),
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : t("cursorUi.ops.action_failed")),
  });
  const grouped = useMemo(() => {
    const lanes: Record<OperationsLane, OperationsItem[]> = { pending: [], in_progress: [], completed: [] };
    for (const item of items) lanes[laneOf(item)].push(item);
    return lanes;
  }, [items]);
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {LANES.map((lane) => (
        <section
          key={lane}
          className="rounded-xl border border-border/80 bg-muted/20 p-3"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const id = event.dataTransfer.getData("text/plain");
            const item = items.find((row) => row.id === id);
            if (!item || laneOf(item) === lane) return;
            move.mutate({ item, lane });
          }}
        >
          <h3 className="mb-2 text-sm font-semibold">
            {t(`cursorUi.ops.lane.${lane}`)} <span className="text-muted-foreground">{grouped[lane].length}</span>
          </h3>
          <div className="space-y-2">
            {grouped[lane].map((item) => (
              <button
                key={`${item.kind}-${item.id}`}
                type="button"
                draggable={item.kind === "task"}
                onDragStart={(event) => event.dataTransfer.setData("text/plain", item.id)}
                onClick={() => onOpen(item)}
                className={cn("w-full rounded-lg border border-border/80 bg-card p-3 text-start shadow-sm", item.kind === "task" && "cursor-grab")}
              >
                <div className="font-medium">{item.title}</div>
                <div className="text-xs text-muted-foreground">{item.assignee?.name || t("cursorUi.ops.unassigned")}</div>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
