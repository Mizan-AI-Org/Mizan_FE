import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { AssignResponsibilitiesDialog } from "@/components/responsibilities/AssignResponsibilitiesDialog";
import { useLanguage } from "@/hooks/use-language";

/** Shown on Operations when gaps exist; Command Centre uses the setup banner instead. */
export function ResponsibilityGapCard() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ["responsibility-gaps"],
    queryFn: () => api.getResponsibilityGaps(),
    staleTime: 30_000,
  });
  const gaps = query.data?.gaps ?? [];
  if (!gaps.length) return null;
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/30">
      <p className="font-medium">{t("responsibilities.gaps_intro")}</p>
      <ul className="mt-2 list-disc ps-5 text-muted-foreground">
        {gaps.slice(0, 6).map((gap) => (
          <li key={gap.item_id}>
            {t("firstrun.gap_line", { area: gap.area, label: gap.label })}
          </li>
        ))}
      </ul>
      <Button type="button" size="sm" className="mt-3" onClick={() => setOpen(true)}>
        {t("firstrun.responsibility_cta")}
      </Button>
      <AssignResponsibilitiesDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}