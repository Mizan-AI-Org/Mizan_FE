import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Lock } from "lucide-react";
import { toast } from "sonner";
import { ResponsibilityTreeEditor } from "@/components/responsibilities/ResponsibilityTreeEditor";
import { useLanguage } from "@/hooks/use-language";
import { api } from "@/lib/api";
import type { StaffPickerRow } from "@/lib/staffPicker";
import {
  isPrivateSlug,
  watchLevelFor,
  type WatchLevel,
  type WatchOverviewRow,
} from "@/components/responsibilities/types";

export const CATEGORY_OWNERS_QUERY_KEY = ["category-owners"] as const;
export const RESPONSIBILITY_TREE_QUERY_KEY = ["responsibility-tree"] as const;

export type ResponsibilitySettingsProps = {
  canEdit?: boolean;
  showWatching?: boolean;
  className?: string;
  onSaved?: () => void;
};

const selectClass =
  "h-8 rounded-lg border border-slate-200 bg-background px-2 text-xs dark:border-slate-700";

function invalidateOwners(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: RESPONSIBILITY_TREE_QUERY_KEY });
  void queryClient.invalidateQueries({ queryKey: CATEGORY_OWNERS_QUERY_KEY });
}

export function ResponsibilitySettings({ canEdit = true, showWatching = true, className, onSaved }: ResponsibilitySettingsProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const treeQuery = useQuery({ queryKey: RESPONSIBILITY_TREE_QUERY_KEY, queryFn: () => api.getResponsibilityTree() });
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

  const staffDirectory = useMemo(() => {
    const out: Record<string, StaffPickerRow> = {};
    for (const [id, row] of Object.entries(treeQuery.data?.staff_directory || {})) {
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
  }, [treeQuery.data?.staff_directory]);

  const members = useMutation({
    mutationFn: (input: { areaId: string; primaryId: string | null; informedIds: string[] }) =>
      api.setResponsibilityMembers(input.areaId, { primary_id: input.primaryId, informed_ids: input.informedIds }),
    onError: () => toast.error(t("cursorUi.resp.save_failed")),
    onSuccess: () => onSaved?.(),
    onSettled: () => invalidateOwners(queryClient),
  });
  const update = useMutation({
    mutationFn: (input: { areaId: string; patch: { title?: string; description?: string; routing_hints?: string } }) =>
      api.updateResponsibilityArea(input.areaId, input.patch),
    onError: () => toast.error(t("cursorUi.resp.save_failed")),
    onSettled: () => invalidateOwners(queryClient),
  });
  const create = useMutation({
    mutationFn: (payload: { title: string; description?: string; parent_id?: string | null }) =>
      api.createResponsibilityArea(payload),
    onError: () => toast.error(t("cursorUi.resp.save_failed")),
    onSettled: () => invalidateOwners(queryClient),
  });
  const remove = useMutation({
    mutationFn: (areaId: string) => api.deleteResponsibilityArea(areaId),
    onError: () => toast.error(t("cursorUi.resp.save_failed")),
    onSettled: () => invalidateOwners(queryClient),
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

  if (treeQuery.isLoading) return <p className="text-sm text-muted-foreground">{t("cursorUi.resp.loading")}</p>;
  if (treeQuery.isError) return <p className="text-sm text-destructive">{t("cursorUi.resp.load_error")}</p>;

  const followers = (slug: string) =>
    (overviewQuery.data || []).filter((w) => w.slug === slug && w.level === "critical");

  return (
    <div className={className} data-testid="responsibility-settings">
      <p className="mb-4 text-xs leading-relaxed text-muted-foreground">{t("cursorUi.resp.owners_hint")}</p>
      <ResponsibilityTreeEditor
        areas={treeQuery.data?.areas || []}
        staffDirectory={staffDirectory}
        t={t}
        disabled={!canEdit || members.isPending || update.isPending || create.isPending}
        onMembers={(areaId, primaryId, informedIds) => members.mutate({ areaId, primaryId, informedIds })}
        onUpdate={(areaId, patch) => update.mutate({ areaId, patch })}
        onCreate={(payload) => create.mutate(payload)}
        onDelete={(areaId) => remove.mutate(areaId)}
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
