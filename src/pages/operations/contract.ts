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

/** Sub-views of the Operations page (`?view=`). Progress keeps its own `?tab=staff|categories`. */
export const OPERATIONS_VIEWS = ["work", "compliance", "accountability", "progress"] as const;
export type OperationsView = (typeof OPERATIONS_VIEWS)[number];

export type OperationsCategory = (typeof OPERATIONS_CATEGORIES)[number] | "all";
export type OperationsFocus = (typeof OPERATIONS_SUMMARY)[number] | "";
export type OperationsLane = "pending" | "in_progress" | "completed";
/** What the backend says the viewer can do with a row (the sheet shows buttons from this, never guesses). */
export type OperationsAction = "open" | "claim" | "assign" | "got_it" | "need_help" | "done" | "validate" | "send_back";

/** Which sub-view the URL asks for. Old `?tab=compliance` links keep working. */
export function operationsViewFromParams(params: URLSearchParams): OperationsView {
  const view = params.get("view") || "";
  if ((OPERATIONS_VIEWS as readonly string[]).includes(view)) return view as OperationsView;
  return params.get("tab") === "compliance" ? "compliance" : "work";
}

/** Deep links from the old board, incidents, and notifications. */
export function selectedOperationsId(params: URLSearchParams): string {
  return params.get("item") || params.get("task") || params.get("incident") || "";
}

export type OperationsPerson = { id: string; name: string } | null;

export type OperationsClaim = {
  open: boolean;
  claimable: boolean;
  claimedBy: OperationsPerson;
  candidates: number;
};

export type OperationsItem = {
  id: string;
  kind: string;
  category: string;
  title: string;
  status: string;
  lane?: OperationsLane;
  priority: string;
  assignee: OperationsPerson;
  executor: OperationsPerson;
  readOnly: OperationsPerson[];
  assigneeIds?: string[];
  dueAt: string | null;
  overdue: boolean;
  needsHelp: boolean;
  awaitingApproval: boolean;
  unassigned: boolean;
  progress: number | null;
  source: string;
  closed: boolean;
  createdAt: string | null;
  claim?: OperationsClaim;
  actions?: OperationsAction[];
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
  branch?: string;
};

/** Board lane of a row: the backend's own lane, else derived from its flags. */
export function laneOf(item: OperationsItem): OperationsLane {
  if (item.lane) return item.lane;
  if (item.closed) return "completed";
  return (item.progress ?? 0) > 0 ? "in_progress" : "pending";
}

/** Where the full screen for a row lives (the sheet is the quick view; these keep every deep feature). */
export function operationsDetailHref(item: Pick<OperationsItem, "kind" | "id">): string | null {
  switch (item.kind) {
    case "staff_request":
      return `/dashboard/staff-requests/${item.id}`;
    case "incident":
      return `/dashboard/operations/live?view=incidents&incident=${encodeURIComponent(item.id)}`;
    case "checklist":
      return "/dashboard/operations/checklists";
    case "process":
      return "/dashboard/employees/tasks";
    case "agency":
      return "/dashboard/operations/agency-jobs";
    default:
      return null; // tasks open the layout's own task sheet (?task=)
  }
}
