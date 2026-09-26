import type { DashboardTaskDemandItem } from "@/lib/types";

export function dashboardTaskStatusLabel(
  status: string | undefined,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  const s = String(status || "").toUpperCase();
  if (s === "ACCEPTED") return t("staff.requests.status_accepted", { defaultValue: "Accepted" });
  if (s === "IN_PROGRESS") return t("staff.requests.status_in_progress");
  if (s === "COMPLETED") return t("staff.requests.status_completed");
  if (s === "UNABLE_TO_COMPLETE")
    return t("staff.requests.status_unable", { defaultValue: "Unable to complete" });
  if (s === "CANCELLED") return t("staff.requests.status_cancelled");
  return t("staff.requests.status_pending");
}

export function dashboardTaskStatusBadge(status?: string) {
  const s = String(status || "").toUpperCase();
  if (s === "ACCEPTED") return "bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-200";
  if (s === "IN_PROGRESS") return "bg-sky-50 text-sky-700 border-sky-200 ring-1 ring-sky-200";
  if (s === "COMPLETED") return "bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-200";
  if (s === "UNABLE_TO_COMPLETE")
    return "bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-200";
  if (s === "CANCELLED") return "bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-200";
  return "bg-yellow-50 text-yellow-700 border-yellow-200 ring-1 ring-yellow-200";
}

/** Wire values the Live Ops / task-demand PATCH accepts. */
export const LIVE_OPS_PRIORITIES = ["NORMAL", "MEDIUM", "URGENT"] as const;
export type LiveOpsPriority = (typeof LIVE_OPS_PRIORITIES)[number];

export const INCIDENT_PRIORITIES = LIVE_OPS_PRIORITIES;
export type IncidentPriority = LiveOpsPriority;

export function normalizeOpsPriority(priority?: string): LiveOpsPriority {
  const p = String(priority || "NORMAL").toUpperCase();
  if (p === "URGENT" || p === "CRITICAL" || p === "HIGH") return "URGENT";
  if (p === "MEDIUM" || p === "LOW") return p === "LOW" ? "NORMAL" : "MEDIUM";
  if (p === "NORMAL") return "NORMAL";
  return "NORMAL";
}

export function dashboardTaskPriorityBadge(priority?: string) {
  const p = normalizeOpsPriority(priority);
  if (p === "URGENT") return "bg-red-600 text-white border-red-600";
  if (p === "MEDIUM") return "bg-blue-600 text-white border-blue-600";
  return "bg-slate-400 text-white border-slate-400 dark:bg-slate-600 dark:border-slate-600";
}

export function dashboardTaskPriorityLabel(
  priority: string | undefined,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  const p = normalizeOpsPriority(priority);
  if (p === "URGENT") {
    return t("operations_live.priority.urgent", { defaultValue: "Urgent" });
  }
  if (p === "MEDIUM") {
    return t("operations_live.priority.medium", { defaultValue: "Medium" });
  }
  return t("operations_live.priority.normal", { defaultValue: "Normal" });
}

export function toLiveOpsPriority(priority?: string): LiveOpsPriority {
  return normalizeOpsPriority(priority);
}

export function incidentPriorityBadge(priority?: string) {
  return dashboardTaskPriorityBadge(priority);
}

export function incidentPriorityLabel(
  priority: string | undefined,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  return dashboardTaskPriorityLabel(priority, t);
}

export type DashboardTaskStatus = DashboardTaskDemandItem["status"];

const ALL_STATUSES: DashboardTaskStatus[] = [
  "PENDING",
  "ACCEPTED",
  "IN_PROGRESS",
  "COMPLETED",
  "UNABLE_TO_COMPLETE",
  "CANCELLED",
];

export function dashboardTaskPrimaryAction(
  status: DashboardTaskStatus,
  t: (key: string, options?: Record<string, unknown>) => string,
): { label: string; nextStatus: DashboardTaskStatus } | null {
  switch (status) {
    case "PENDING":
      return { label: t("staff.requests.action_start", { defaultValue: "Start" }), nextStatus: "IN_PROGRESS" };
    case "IN_PROGRESS":
      return { label: t("staff.requests.action_complete", { defaultValue: "Complete" }), nextStatus: "COMPLETED" };
    default:
      return null;
  }
}

export function dashboardTaskSecondaryStatuses(
  status: DashboardTaskStatus,
  exclude?: DashboardTaskStatus,
): DashboardTaskStatus[] {
  return ALL_STATUSES.filter((s) => s !== status && s !== exclude);
}

export function resolveStoredMediaUrl(
  path: string | null | undefined,
  backendUrl: string,
): string {
  const raw = (path || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${backendUrl}${raw.startsWith("/") ? raw : `/${raw}`}`;
}
