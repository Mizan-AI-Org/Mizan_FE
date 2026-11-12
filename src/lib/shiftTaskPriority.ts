import type { TaskPriority } from "@/types/schedule";

type TranslateFn = (key: string, defaultValue?: string) => string;

export function shiftTaskPriorityLabel(priority: TaskPriority | undefined, t: TranslateFn): string {
  switch (priority) {
    case "LOW":
      return t("schedule.priority_low", "Low");
    case "HIGH":
      return t("schedule.priority_high", "High");
    case "URGENT":
      return t("operations_live.priority.urgent", "Urgent");
    case "MEDIUM":
    default:
      return t("operations_live.priority.medium", "Medium");
  }
}

export function shiftTaskPriorityStyles(priority: TaskPriority | undefined) {
  switch (priority) {
    case "LOW":
      return {
        row: "border-slate-200 dark:border-slate-600",
        accent: "border-l-slate-400",
        badge:
          "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600",
      };
    case "HIGH":
      return {
        row: "border-amber-200 dark:border-amber-900/50",
        accent: "border-l-amber-500",
        badge:
          "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800",
      };
    case "URGENT":
      return {
        row: "border-red-200 dark:border-red-900/50",
        accent: "border-l-red-500",
        badge:
          "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-800",
      };
    case "MEDIUM":
    default:
      return {
        row: "border-blue-100 dark:border-blue-900/40",
        accent: "border-l-blue-500",
        badge:
          "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800",
      };
  }
}
