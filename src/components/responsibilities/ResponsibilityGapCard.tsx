import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { AssignResponsibilitiesDialog } from "@/components/responsibilities/AssignResponsibilitiesDialog";
import { useLanguage } from "@/hooks/use-language";
import { CATEGORY_OWNER_GROUPS } from "@/lib/categoryOwners";
import { normalizeOwners } from "@/components/responsibilities/types";

/** Areas with nobody in charge (their work goes to the managers). Shown on Operations; the Command Centre has its own checklist. */
export function ResponsibilityGapCard() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ["category-owners"],
    queryFn: () => api.getCategoryOwners(),
    staleTime: 30_000,
  });
  if (!query.data) return null;
  const owners = normalizeOwners(query.data.owners);
  const gaps = CATEGORY_OWNER_GROUPS.flatMap((g) => g.items).filter((cat) => !(owners[cat.key]?.length));
  if (!gaps.length) return null;
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/30" data-testid="responsibility-gap-card">
      <p className="font-medium">{t("cursorUi.resp.gaps_intro")}</p>
      <ul className="mt-2 list-disc ps-5 text-muted-foreground">
        {gaps.slice(0, 6).map((cat) => (
          <li key={cat.key}>{t(cat.labelKey)}</li>
        ))}
      </ul>
      {gaps.length > 6 ? (
        <p className="mt-1 text-xs text-muted-foreground">{t("cursorUi.resp.gaps_more", { count: gaps.length - 6 })}</p>
      ) : null}
      <Button type="button" size="sm" className="mt-3" onClick={() => setOpen(true)}>
        {t("cursorUi.resp.assign_cta")}
      </Button>
      <AssignResponsibilitiesDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
