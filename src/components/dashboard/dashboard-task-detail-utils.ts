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

export function dashboardTaskPriorityBadge(priority?: string) {
  const p = String(priority || "").toUpperCase();
  if (p === "URGENT") return "bg-red-600 text-white border-red-600";
  if (p === "HIGH") return "bg-amber-500 text-white border-amber-500";
  if (p === "LOW") return "bg-slate-200 text-slate-900 border-slate-200";
  return "bg-blue-600 text-white border-blue-600";
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
      return {
        label: t("dashboard.task_detail.accept", { defaultValue: "Accept task" }),
        nextStatus: "ACCEPTED",
      };
    case "ACCEPTED":
      return {
        label: t("dashboard.task_detail.start", { defaultValue: "Start work" }),
        nextStatus: "IN_PROGRESS",
      };
    case "IN_PROGRESS":
      return {
        label: t("dashboard.task_detail.complete", { defaultValue: "Mark complete" }),
        nextStatus: "COMPLETED",
      };
    default:
      return null;
  }
}

export function dashboardTaskSecondaryStatuses(
  current: DashboardTaskStatus,
  primaryNext?: DashboardTaskStatus | null,
): DashboardTaskStatus[] {
  return ALL_STATUSES.filter((s) => s !== current && s !== primaryNext);
}

export function resolveStoredMediaUrl(path: string | null | undefined, backendUrl: string): string {
  const raw = (path || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${backendUrl}${raw.startsWith("/") ? raw : `/${raw}`}`;
}
