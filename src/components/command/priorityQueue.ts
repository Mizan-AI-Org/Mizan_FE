import type { CommandSignal } from "@/lib/commandCentre";
import { normalizeOperationsDeepLink, resolveCommandReviewRoute } from "@/lib/commandCentre";
import { operationsDetailHref, type OperationsItem } from "@/pages/operations/contract";
import type { ApprovalRow, NeedsAttentionItem } from "@/lib/types";

/** Session hide list shared with the old approval popup. */
export const LATER_STORAGE = "mizan.approvalsLater";

export const PRIORITY_CAP = 5;

export type PriorityRow = {
  key: string;
  id: string;
  title: string;
  detail: string;
  severity: string;
  area: string;
  owner: string;
  actionKind: "open" | "approve";
  approveKind?: "approval" | "task";
  href: string;
  recommendation: string;
};

export type ChipId = "overdue" | "coverage" | "pending" | "incidents";

export type CockpitCounts = {
  onDuty: number;
  coverageGaps: number;
  tasksOpen: number;
  tasksOverdue: number;
  incidents: number;
  pendingApprovals: number;
  awaitingApproval: number;
  pending: number;
};

const severityOf = (priority: string | undefined, overdue: boolean): string => {
  const level = (priority || "").toLowerCase();
  if (level === "urgent" || level === "critical") return "critical";
  if (level === "high" || overdue) return "high";
  return "medium";
};

/** Numbers the cockpit may show. Each input is already scoped to the selected branch. */
export function cockpitCounts(input: {
  peopleWorking: number;
  coverageGaps: number;
  tasksOpen: number;
  tasksOverdue: number;
  incidents: number;
  pendingApprovals: number;
  awaitingApproval: number;
}): CockpitCounts {
  const pendingApprovals = Math.max(0, input.pendingApprovals || 0);
  const awaitingApproval = Math.max(0, input.awaitingApproval || 0);
  return {
    onDuty: Math.max(0, input.peopleWorking || 0),
    coverageGaps: Math.max(0, input.coverageGaps || 0),
    tasksOpen: Math.max(0, input.tasksOpen || 0),
    tasksOverdue: Math.max(0, input.tasksOverdue || 0),
    incidents: Math.max(0, input.incidents || 0),
    pendingApprovals,
    awaitingApproval,
    pending: pendingApprovals + awaitingApproval,
  };
}

/** At most three factual chips, exceptions only. */
export function briefingChips(counts: Pick<CockpitCounts, "tasksOverdue" | "coverageGaps" | "pending" | "incidents">): {
  id: ChipId;
  count: number;
}[] {
  const rows: { id: ChipId; count: number }[] = [
    { id: "overdue", count: counts.tasksOverdue },
    { id: "coverage", count: counts.coverageGaps },
    { id: "pending", count: counts.pending },
    { id: "incidents", count: counts.incidents },
  ];
  return rows.filter((row) => row.count > 0).slice(0, 3);
}

function signalRow(signal: CommandSignal): PriorityRow {
  return {
    key: `signal:${signal.id}`,
    id: String(signal.id),
    title: signal.title,
    detail: signal.detail || "",
    severity: signal.severity,
    area: signal.area || signal.category || "",
    owner: signal.owner || "",
    actionKind: signal.action_kind === "approve" ? "approve" : "open",
    href: normalizeOperationsDeepLink(resolveCommandReviewRoute(signal)),
    recommendation: signal.recommendation || signal.detail || signal.title,
  };
}

function overviewRow(item: OperationsItem): PriorityRow {
  const approve = Boolean(item.awaitingApproval && item.actions?.includes("validate"));
  return {
    key: approve ? `task:${item.id}` : `overview:${item.id}`,
    id: item.id,
    title: item.title,
    detail: "",
    severity: severityOf(item.priority, item.overdue),
    area: item.category || "",
    owner: item.assignee?.name || "",
    actionKind: approve ? "approve" : "open",
    approveKind: approve ? "task" : undefined,
    href: normalizeOperationsDeepLink(
      operationsDetailHref(item) ||
        (item.kind === "task"
          ? `/dashboard/operations?task=${encodeURIComponent(item.id)}`
          : "/dashboard/operations/live"),
    ),
    recommendation: item.title,
  };
}

/**
 * One queue: decisions already on the command payload, then overdue or unassigned work,
 * then approvals and task validations. Hidden rows drop out so the next item can take a slot.
 * Never more than `cap` (five unless the caller asks otherwise).
 */
export function buildPriorityQueue(input: {
  needsMe: CommandSignal[] | undefined;
  overviewItems: OperationsItem[] | undefined;
  approvals: ApprovalRow[] | undefined;
  validations: NeedsAttentionItem[] | undefined;
  hidden: string[];
  fallbackTitle: string;
  cap?: number;
}): PriorityRow[] {
  const hidden = new Set(input.hidden);
  const seen = new Set<string>();
  const rows: PriorityRow[] = [];

  for (const signal of input.needsMe ?? []) {
    if (!signal?.id || !signal.title) continue;
    const id = String(signal.id);
    if (seen.has(id)) continue;
    seen.add(id);
    rows.push(signalRow(signal));
  }

  for (const item of input.overviewItems ?? []) {
    if (!item?.id || item.closed) continue;
    if (!item.overdue && !item.unassigned) continue;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    rows.push(overviewRow(item));
  }

  for (const row of input.approvals ?? []) {
    if (!row?.id || seen.has(row.id)) continue;
    seen.add(row.id);
    rows.push({
      key: `approval:${row.id}`,
      id: row.id,
      title: row.title || row.notes || input.fallbackTitle,
      detail: row.kindLabel || "",
      severity: "high",
      area: row.kindLabel || "approval",
      owner: row.requestedBy || "",
      actionKind: "approve",
      approveKind: "approval",
      href: "/dashboard/operations/approvals",
      recommendation: row.title || row.notes || input.fallbackTitle,
    });
  }

  for (const item of input.validations ?? []) {
    if (item.kind !== "validate" || !item.taskId || seen.has(item.taskId)) continue;
    seen.add(item.taskId);
    rows.push({
      key: `task:${item.taskId}`,
      id: item.taskId,
      title: item.title || input.fallbackTitle,
      detail: "",
      severity: "high",
      area: "tasks",
      owner: item.who || "",
      actionKind: "approve",
      approveKind: "task",
      href: `/dashboard/operations?task=${encodeURIComponent(item.taskId)}`,
      recommendation: item.title || input.fallbackTitle,
    });
  }

  const cap = input.cap ?? PRIORITY_CAP;
  return rows.filter((row) => !hidden.has(row.key)).slice(0, Math.max(0, cap));
}

export function readLater(): string[] {
  try {
    const raw = JSON.parse(sessionStorage.getItem(LATER_STORAGE) || "[]") as unknown;
    return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function writeLater(ids: string[]): void {
  try {
    sessionStorage.setItem(LATER_STORAGE, JSON.stringify(ids));
  } catch {
    /* private mode: the row returns on reload */
  }
}
