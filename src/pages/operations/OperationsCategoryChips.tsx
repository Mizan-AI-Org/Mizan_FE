import { useModules } from "@/hooks/use-modules";
import { useLanguage } from "@/hooks/use-language";
import type { ModuleKey } from "@/lib/types";
import { OPERATIONS_CATEGORIES } from "@/pages/operations/contract";
import { cn } from "@/lib/utils";

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
  const { t } = useLanguage();
  const chips = ["all", ...OPERATIONS_CATEGORIES].filter((key) => isEnabled(MODULES[key]));
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((key) => {
        const active = (category || "all") === key;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            onClick={() => onCategory(key === "all" ? "" : key)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm",
              active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground",
            )}
          >
            {t(`cursorUi.ops.category.${key}`)}
            <span className="ms-1 tabular-nums">{counts?.[key] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}
