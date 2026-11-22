import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Lock } from "lucide-react";
import { toast } from "sonner";
import { CategoryOwnerGroupsEditor } from "@/components/settings/CategoryOwnerGroupsEditor";
import { useLanguage } from "@/hooks/use-language";
import { api } from "@/lib/api";
import type { StaffPickerRow } from "@/lib/staffPicker";
import {
  isPrivateSlug,
  normalizeOwners,
  watchLevelFor,
  withOwners,
  type OwnersMap,
  type WatchLevel,
  type WatchOverviewRow,
} from "@/components/responsibilities/types";

export const CATEGORY_OWNERS_QUERY_KEY = ["category-owners"] as const;

export type ResponsibilitySettingsProps = {
  /** Managers edit owners; everyone else sees the list read-only. Default true. */
  canEdit?: boolean;
  /** Show the follow (watch) control and who follows each area. Default true. */
  showWatching?: boolean;
  className?: string;
  /** Called after an owner change has been saved. */
  onSaved?: () => void;
};

const selectClass =
  "h-8 rounded-lg border border-slate-200 bg-background px-2 text-xs dark:border-slate-700";

/**
 * Who owns what, on main's model: several owners per category (first to claim wins), plus opt-in followers.
 * Owners are the only people notified of new work; followers get a single FYI for urgent incidents if they chose it.
 * Mount in Settings (workstream B's slot) or inside AssignResponsibilitiesDialog. Saves each change as it is made.
 */
export function ResponsibilitySettings({ canEdit = true, showWatching = true, className, onSaved }: ResponsibilitySettingsProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const ownersQuery = useQuery({ queryKey: CATEGORY_OWNERS_QUERY_KEY, queryFn: () => api.getCategoryOwners() });
  const mineQuery = useQuery({ queryKey: ["my-watches"], queryFn: () => api.getMyWatches(), enabled: showWatching });
  const overviewQuery = useQuery({
    queryKey: ["watches-overview"],
    enabled: showWatching && canEdit,
    retry: false,
    queryFn: async () => {
      try {
        return (await api.getWatchesOverview()).watches as WatchOverviewRow[];
      } catch {
        return [] as WatchOverviewRow[];
      }
    },
  });

  const owners = useMemo(() => normalizeOwners(ownersQuery.data?.owners), [ownersQuery.data?.owners]);
  const staffDirectory = useMemo(() => {
    const out: Record<string, StaffPickerRow> = {};
    for (const [id, row] of Object.entries(ownersQuery.data?.staff_directory || {})) {
      if (!row) continue;
      out[id] = {
        id: String(row.id || id),
        first_name: String(row.first_name || ""),
        last_name: String(row.last_name || ""),
        email: String(row.email || ""),
        role: row.role ? String(row.role) : undefined,
      };
    }
    return out;
  }, [ownersQuery.data?.staff_directory]);

  const saveOwners = useMutation({
    mutationFn: async (input: { slug: string; ids: string[] }) => {
      // The server replaces the whole map, so re-read it first: another manager may have changed a different area.
      const fresh = normalizeOwners((await api.getCategoryOwners()).owners);
      return api.saveCategoryOwners(withOwners(fresh, input.slug, input.ids));
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: CATEGORY_OWNERS_QUERY_KEY });
      const previous = queryClient.getQueryData(CATEGORY_OWNERS_QUERY_KEY);
      queryClient.setQueryData(CATEGORY_OWNERS_QUERY_KEY, (old: typeof ownersQuery.data) =>
        old ? { ...old, owners: withOwners(normalizeOwners(old.owners), input.slug, input.ids) } : old,
      );
      return { previous };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(CATEGORY_OWNERS_QUERY_KEY, ctx.previous);
      toast.error(t("cursorUi.resp.save_failed"));
    },
    onSuccess: () => onSaved?.(),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: CATEGORY_OWNERS_QUERY_KEY }),
  });

  const saveWatch = useMutation({
    mutationFn: async (input: { slug: string; level: WatchLevel }) =>
      input.level === "none" ? api.removeMyWatch(input.slug) : api.setMyWatch(input.slug, input.level),
    onError: () => toast.error(t("cursorUi.resp.save_failed")),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-watches"] });
      void queryClient.invalidateQueries({ queryKey: ["watches-overview"] });
    },
  });

  if (ownersQuery.isLoading) return <p className="text-sm text-muted-foreground">{t("cursorUi.resp.loading")}</p>;
  if (ownersQuery.isError) return <p className="text-sm text-destructive">{t("cursorUi.resp.load_error")}</p>;

  const followers = (slug: string) =>
    (overviewQuery.data || []).filter((w) => w.slug === slug && w.level === "critical");

  return (
    <div className={className} data-testid="responsibility-settings">
      <p className="mb-4 text-xs leading-relaxed text-muted-foreground">{t("cursorUi.resp.owners_hint")}</p>
      <CategoryOwnerGroupsEditor
        categoryOwners={owners as OwnersMap}
        staffDirectory={staffDirectory}
        t={t}
        disabled={!canEdit}
        onOwnersChange={(slug, ids) => saveOwners.mutate({ slug, ids })}
        renderExtra={
          showWatching
            ? (slug) => {
                if (isPrivateSlug(slug)) {
                  return (
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Lock className="h-3 w-3" aria-hidden /> {t("cursorUi.resp.watch_private")}
                    </p>
                  );
                }
                const names = followers(slug).map((w) => w.user_name).filter(Boolean);
                return (
                  <div className="mt-1 space-y-1 border-t border-slate-200/70 pt-2 dark:border-slate-700">
                    <label className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" aria-hidden /> {t("cursorUi.resp.watch_me")}
                      </span>
                      <select
                        className={selectClass}
                        aria-label={`${t("cursorUi.resp.watch_me")} (${slug})`}
                        value={watchLevelFor(mineQuery.data?.watches, slug)}
                        disabled={saveWatch.isPending}
                        onChange={(event) => saveWatch.mutate({ slug, level: event.target.value as WatchLevel })}
                      >
                        <option value="none">{t("cursorUi.resp.watch_level_none")}</option>
                        <option value="critical">{t("cursorUi.resp.watch_level_critical")}</option>
                      </select>
                    </label>
                    {names.length ? (
                      <p className="text-[11px] text-muted-foreground">
                        {t("cursorUi.resp.watched_by", { names: names.join(", ") })}
                      </p>
                    ) : null}
                  </div>
                );
              }
            : undefined
        }
      />
      {showWatching ? <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">{t("cursorUi.resp.watch_hint")}</p> : null}
    </div>
  );
}
