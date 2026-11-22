import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import type { OperationsItem } from "@/pages/operations/contract";
import { cn } from "@/lib/utils";

const LANES = [
  { id: "pending", label: "To do" },
  { id: "in_progress", label: "In progress" },
  { id: "completed", label: "Done" },
] as const;

function laneOf(item: OperationsItem): (typeof LANES)[number]["id"] {
  if (item.closed) return "completed";
  const status = item.status.toLowerCase();
  if (status.includes("progress") || status === "acknowledged" || status === "assigned" || status === "on_site") {
    return "in_progress";
  }
  return "pending";
}

export function OperationsWorkList({
  items,
  view,
  onOpen,
}: {
  items: OperationsItem[];
  view: string;
  onOpen: (item: OperationsItem) => void;
}) {
  if (view === "board") return <Board items={items} onOpen={onOpen} />;
  return (
    <ul className="divide-y divide-border/80 overflow-hidden rounded-xl border border-border/80 bg-card">
      {items.length === 0 ? <li className="p-6 text-sm text-muted-foreground">Nothing in this view.</li> : null}
      {items.map((item) => (
        <li key={`${item.kind}-${item.id}`}>
          <button type="button" onClick={() => onOpen(item)} className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-muted/40">
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{item.title}</div>
              <div className="text-xs text-muted-foreground">
                {item.category.replace(/_/g, " ")} · {item.status}
                {item.assignee ? ` · ${item.assignee.name}` : " · Unassigned"}
              </div>
            </div>
            {item.overdue ? <span className="text-xs font-medium text-destructive">Overdue</span> : null}
            {item.needsHelp ? <span className="text-xs font-medium text-amber-700">Need help</span> : null}
            {typeof item.progress === "number" ? (
              <div className="hidden w-24 sm:block">
                <Progress value={item.progress} />
              </div>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}

function Board({ items, onOpen }: { items: OperationsItem[]; onOpen: (item: OperationsItem) => void }) {
  const queryClient = useQueryClient();
  const move = useMutation({
    mutationFn: (input: { item: OperationsItem; lane: (typeof LANES)[number]["id"] }) => {
      if (input.item.kind !== "task") return Promise.resolve(null);
      const status = input.lane === "completed" ? "COMPLETED" : input.lane === "in_progress" ? "IN_PROGRESS" : "PENDING";
      return api.updateDashboardTaskStatus(input.item.id, status);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["operations-overview"] }),
  });
  const grouped = useMemo(() => {
    const lanes: Record<string, OperationsItem[]> = { pending: [], in_progress: [], completed: [] };
    for (const item of items) lanes[laneOf(item)].push(item);
    return lanes;
  }, [items]);
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {LANES.map((lane) => (
        <section
          key={lane.id}
          className="rounded-xl border border-border/80 bg-muted/20 p-3"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const id = event.dataTransfer.getData("text/plain");
            const item = items.find((row) => row.id === id);
            if (!item || laneOf(item) === lane.id) return;
            move.mutate({ item, lane: lane.id });
          }}
        >
          <h3 className="mb-2 text-sm font-semibold">
            {lane.label} <span className="text-muted-foreground">{grouped[lane.id].length}</span>
          </h3>
          <div className="space-y-2">
            {grouped[lane.id].map((item) => (
              <button
                key={`${item.kind}-${item.id}`}
                type="button"
                draggable={item.kind === "task"}
                onDragStart={(event) => event.dataTransfer.setData("text/plain", item.id)}
                onClick={() => onOpen(item)}
                className={cn("w-full rounded-lg border border-border/80 bg-card p-3 text-left shadow-sm", item.kind === "task" && "cursor-grab")}
              >
                <div className="font-medium">{item.title}</div>
                <div className="text-xs text-muted-foreground">{item.assignee?.name || "Unassigned"}</div>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
