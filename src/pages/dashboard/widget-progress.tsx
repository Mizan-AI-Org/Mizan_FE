import type { DashboardTaskDemandItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export type WorkCounts = {
  open?: number;
  pending?: number;
  in_progress?: number;
  completed?: number;
};

/** Completed share of all counted work. Null when the widget has no work yet. */
export function percentDone(counts: WorkCounts): number | null {
  const open = counts.open ?? counts.pending ?? 0;
  const inProgress = counts.in_progress ?? 0;
  const completed = counts.completed ?? 0;
  const total = open + inProgress + completed;
  if (total <= 0) return null;
  return Math.round((completed / total) * 100);
}

export function attentionRank(item: DashboardTaskDemandItem): number {
  const priority = String(item.priority || "").toUpperCase();
  const pill = String(item.pill_status || item.raw_status || "").toUpperCase();
  const overdueByDate =
    !!item.due_date && !Number.isNaN(Date.parse(item.due_date)) && Date.parse(item.due_date) < Date.now();
  if (
    priority === "URGENT" ||
    pill.includes("OVERDUE") ||
    pill.includes("ESCALAT") ||
    overdueByDate
  ) {
    return 0;
  }
  if (priority === "HIGH" || pill.includes("DUE_SOON")) return 1;
  if (priority === "MEDIUM") return 2;
  return 3;
}

export function sortByAttention<T extends DashboardTaskDemandItem>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const rank = attentionRank(a) - attentionRank(b);
    if (rank !== 0) return rank;
    return String(a.title).localeCompare(String(b.title));
  });
}

export function topAttentionItem(
  items: DashboardTaskDemandItem[] | undefined,
): DashboardTaskDemandItem | null {
  if (!items?.length) return null;
  return sortByAttention(items)[0] ?? null;
}

function percentToneClass(pct: number): string {
  if (pct >= 80) {
    return "text-emerald-600 dark:text-emerald-400";
  }
  if (pct >= 40) {
    return "text-sky-600 dark:text-sky-400";
  }
  return "text-amber-600 dark:text-amber-400";
}

/** Completion share — prominent headline figure for widget card headers. */
export function WidgetPercentChip({
  pct,
  prominent = true,
}: {
  pct: number | null;
  /** When false, renders the legacy compact chip (e.g. dense toolbars). */
  prominent?: boolean;
}) {
  if (pct == null) return null;
  if (!prominent) {
    return (
      <span
        className={cn(
          "inline-flex h-5 items-center rounded-full border px-2 text-[10px] font-semibold tabular-nums",
          pct >= 80
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
            : pct >= 40
              ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300"
              : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300",
        )}
        title={`${pct}% done`}
      >
        {pct}%
      </span>
    );
  }
  return (
    <span
      className={cn(
        "shrink-0 text-right text-2xl font-black tabular-nums leading-none tracking-tight",
        percentToneClass(pct),
      )}
      title={`${pct}% done`}
      aria-label={`${pct}% done`}
    >
      {pct}
      <span className="ms-px text-sm font-bold">%</span>
    </span>
  );
}

export function ManagerAttentionCallout({
  item,
  label,
}: {
  item: DashboardTaskDemandItem | null;
  label: string;
}) {
  if (!item) return null;
  return (
    <p className="mb-2 rounded-lg border border-amber-200/80 bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium leading-snug text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
      <span className="font-semibold">{label}</span>
      <span className="ms-1 line-clamp-1">{item.title}</span>
    </p>
  );
}
