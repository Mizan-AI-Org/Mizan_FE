import { OPERATIONS_SUMMARY, type OperationsFocus } from "@/pages/operations/contract";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

export function OperationsSummaryStrip({
  summary,
  focus,
  onFocus,
}: {
  summary?: Partial<Record<string, number>>;
  focus: string;
  onFocus: (focus: OperationsFocus) => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {OPERATIONS_SUMMARY.map((key) => {
        const active = focus === key;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            onClick={() => onFocus(active ? "" : key)}
            className={cn(
              "rounded-xl border bg-card px-4 py-3 text-start shadow-sm transition-colors",
              active ? "border-primary bg-primary/5" : "border-border/80 hover:border-primary/40",
            )}
          >
            <div className="text-2xl font-semibold tabular-nums">{summary?.[key] ?? 0}</div>
            <div className="text-sm text-muted-foreground">{t(`cursorUi.ops.summary.${key}`)}</div>
          </button>
        );
      })}
    </div>
  );
}
