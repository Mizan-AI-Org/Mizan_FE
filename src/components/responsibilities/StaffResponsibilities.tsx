import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useLanguage } from "@/hooks/use-language";
import { CATEGORY_OWNER_GROUPS } from "@/lib/categoryOwners";
import { Checkbox } from "@/components/ui/checkbox";
import { CATEGORY_OWNERS_QUERY_KEY } from "@/components/responsibilities/ResponsibilitySettings";
import {
  isPrivateSlug,
  normalizeOwners,
  slugsOwnedBy,
  withOwner,
  type WatchOverviewRow,
} from "@/components/responsibilities/types";

/** Reverse assignment: tick the areas one person owns. Following is the person's own choice, so it is only shown here. */
export function StaffResponsibilities({ staffId }: { staffId: string }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: CATEGORY_OWNERS_QUERY_KEY,
    queryFn: () => api.getCategoryOwners(),
    enabled: Boolean(staffId),
  });
  const overview = useQuery({
    queryKey: ["watches-overview"],
    enabled: Boolean(staffId),
    retry: false,
    queryFn: async () => {
      try {
        return (await api.getWatchesOverview()).watches as WatchOverviewRow[];
      } catch {
        return [] as WatchOverviewRow[];
      }
    },
  });
  const save = useMutation({
    mutationFn: async (input: { slug: string; isOwner: boolean }) => {
      const fresh = normalizeOwners((await api.getCategoryOwners()).owners);
      return api.saveCategoryOwners(withOwner(fresh, input.slug, staffId, input.isOwner));
    },
    onError: () => toast.error(t("cursorUi.resp.save_failed")),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: CATEGORY_OWNERS_QUERY_KEY }),
  });

  const owners = useMemo(() => normalizeOwners(query.data?.owners), [query.data?.owners]);
  const owned = useMemo(() => new Set(slugsOwnedBy(owners, staffId)), [owners, staffId]);
  const followed = useMemo(
    () => new Set((overview.data || []).filter((w) => w.user_id === staffId && w.level === "critical").map((w) => w.slug)),
    [overview.data, staffId],
  );

  if (!query.data) return null;
  return (
    <div className="space-y-2 border-t pt-4" data-testid="staff-responsibilities">
      <h4 className="text-sm font-semibold">{t("cursorUi.resp.staff_title")}</h4>
      <p className="text-xs text-muted-foreground">{t("cursorUi.resp.staff_hint")}</p>
      {CATEGORY_OWNER_GROUPS.map((group) => (
        <div key={group.groupKey} className="space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t(group.groupKey)}</div>
          {group.items.map((cat) => (
            <label key={cat.key} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2">
                <Checkbox
                  checked={owned.has(cat.key)}
                  disabled={save.isPending}
                  onCheckedChange={(checked) => save.mutate({ slug: cat.key, isOwner: checked === true })}
                  aria-label={t(cat.labelKey)}
                />
                {t(cat.labelKey)}
              </span>
              {!isPrivateSlug(cat.key) && followed.has(cat.key) ? (
                <span className="text-[11px] text-muted-foreground">{t("cursorUi.resp.staff_follows")}</span>
              ) : null}
            </label>
          ))}
        </div>
      ))}
    </div>
  );
}
