/** Shared with the agent parity gate. Do not rename without updating operations-page-tools.ts. */
export const OPERATIONS_CATEGORIES = [
  "tasks",
  "processes",
  "checklists",
  "staff_requests",
  "incidents",
  "agency",
] as const;

export const OPERATIONS_SUMMARY = [
  "open",
  "overdue",
  "need_help",
  "unassigned",
  "awaiting_approval",
] as const;

export const OPERATIONS_ACTIONS = ["got_it", "need_help", "done"] as const;

export type OperationsCategory = (typeof OPERATIONS_CATEGORIES)[number] | "all";
export type OperationsFocus = (typeof OPERATIONS_SUMMARY)[number] | "";

/** Deep links from the old board, incidents, and notifications. */
export function selectedOperationsId(params: URLSearchParams): string {
  return params.get("item") || params.get("task") || params.get("incident") || "";
}

export type OperationsPerson = { id: string; name: string } | null;

export type OperationsItem = {
  id: string;
  kind: string;
  category: string;
  title: string;
  status: string;
  priority: string;
  assignee: OperationsPerson;
  executor: OperationsPerson;
  readOnly: OperationsPerson[];
  dueAt: string | null;
  overdue: boolean;
  needsHelp: boolean;
  awaitingApproval: boolean;
  unassigned: boolean;
  progress: number | null;
  source: string;
  closed: boolean;
  createdAt: string | null;
};

export type OperationsOverview = {
  summary: Record<(typeof OPERATIONS_SUMMARY)[number], number>;
  counts: Record<string, number>;
  items: OperationsItem[];
  compliance: {
    expired: number;
    expiring: number;
    total: number;
    expiredItems: { id: string; title: string; expiresAt: string | null; type: string }[];
    expiringItems: { id: string; title: string; expiresAt: string | null; type: string }[];
  };
  page: number;
  page_size: number;
  total: number;
};
