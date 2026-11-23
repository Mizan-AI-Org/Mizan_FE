import { useModules } from "@/hooks/use-modules";
import type { ModuleKey } from "@/lib/types";
import { OPERATIONS_CATEGORIES } from "@/pages/operations/contract";
import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  all: "All",
  tasks: "Tasks",
  processes: "Processes",
  checklists: "Checklists",
  staff_requests: "Staff requests",
  incidents: "Incidents",
  agency: "Agency",
};

const MODULES: Partial<Record<string, ModuleKey>> = {
  checklists: "checklists",
  incidents: "incidents",
  agency: "agency",
};

export function OperationsCategoryChips({
  counts,
  category,
  onCategory,
}: {
  counts?: Record<string, number>;
  category: string;
  onCategory: (category: string) => void;
}) {
  const { isEnabled } = useModules();
  const chips = ["all", ...OPERATIONS_CATEGORIES].filter((key) => isEnabled(MODULES[key]));
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((key) => {
        const active = (category || "all") === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onCategory(key === "all" ? "" : key)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm",
              active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground",
            )}
          >
            {LABELS[key]}
            <span className="ms-1 tabular-nums">{counts?.[key] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}
