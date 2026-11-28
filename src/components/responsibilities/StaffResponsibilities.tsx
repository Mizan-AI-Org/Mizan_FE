import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { api, type ResponsibilityAreaNode } from "@/lib/api";
import { useLanguage } from "@/hooks/use-language";
import { systemLabelKey } from "@/lib/categoryOwners";
import { CATEGORY_OWNERS_QUERY_KEY, RESPONSIBILITY_TREE_QUERY_KEY } from "@/components/responsibilities/ResponsibilitySettings";
import { isPrivateSlug, type WatchOverviewRow } from "@/components/responsibilities/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

function flatten(nodes: ResponsibilityAreaNode[], acc: ResponsibilityAreaNode[] = []): ResponsibilityAreaNode[] {
  for (const node of nodes) {
    acc.push(node);
    flatten(node.children || [], acc);
  }
  return acc;
}

function roleForArea(area: ResponsibilityAreaNode, staffId: string): "primary" | "informed" | "none" {
  if (area.primary?.id === staffId) return "primary";
  if ((area.informed || []).some((row) => row.id === staffId)) return "informed";
  return "none";
}

export function StaffResponsibilities({
  staffId,
  defaultCollapsed = false,
}: {
  staffId: string;
  defaultCollapsed?: boolean;
}) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(!defaultCollapsed);
  const [replaceTarget, setReplaceTarget] = useState<ResponsibilityAreaNode | null>(null);
  const query = useQuery({
    queryKey: RESPONSIBILITY_TREE_QUERY_KEY,
    queryFn: () => api.getResponsibilityTree(),
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
    mutationFn: async (input: { areaId: string; role: "primary" | "informed" | "none" }) => {
      // Re-read the area right before writing: the cached tree can be stale, and the write replaces
      // the whole member list, so a teammate added meanwhile would otherwise be dropped.
      const fresh = await api.getResponsibilityTree();
      const area = flatten(fresh.areas || []).find((row) => row.id === input.areaId);
      if (!area) throw new Error("area_missing");
      const informed = (area.informed || []).map((row) => row.id).filter((id) => id !== staffId);
      let primary = area.primary?.id || null;
      if (input.role === "primary") {
        // A previous Primary is replaced by the confirmed choice; they stay Informed (never silently dropped).
        if (primary && primary !== staffId && !informed.includes(primary)) informed.push(primary);
        primary = staffId;
      } else if (primary === staffId) {
        primary = null;
      }
      if (input.role === "informed" && !informed.includes(staffId)) informed.push(staffId);
      return api.setResponsibilityMembers(area.id, { primary_id: primary, informed_ids: informed });
    },
    onError: () => toast.error(t("cursorUi.resp.save_failed")),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: RESPONSIBILITY_TREE_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: CATEGORY_OWNERS_QUERY_KEY });
    },
  });

  const areas = useMemo(() => flatten(query.data?.areas || []), [query.data?.areas]);
  const followed = useMemo(
    () => new Set((overview.data || []).filter((w) => w.user_id === staffId && w.level === "critical").map((w) => w.slug)),
    [overview.data, staffId],
  );

  const assignmentCounts = useMemo(() => {
    let primary = 0;
    let informed = 0;
    for (const area of areas) {
      const role = roleForArea(area, staffId);
      if (role === "primary") primary += 1;
      else if (role === "informed") informed += 1;
    }
    return { primary, informed, assigned: primary + informed };
  }, [areas, staffId]);

  if (!query.data) return null;
  return (
    <>
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-xl border border-slate-200/80 bg-slate-50/50 dark:border-slate-700/80 dark:bg-slate-900/30"
      data-testid="staff-responsibilities"
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors",
            "hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          )}
          aria-expanded={open}
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {t("cursorUi.resp.staff_title")}
              </span>
              {assignmentCounts.assigned > 0 ? (
                <span className="inline-flex items-center rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-primary">
                  {assignmentCounts.assigned}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("cursorUi.resp.staff_hint")}</p>
            {!open ? (
              <p className="mt-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                {assignmentCounts.assigned === 0
                  ? t("cursorUi.resp.staff_collapsed_none", "No areas assigned — tap to set Primary or Informed")
                  : t("cursorUi.resp.staff_collapsed_summary", {
                      primary: assignmentCounts.primary,
                      informed: assignmentCounts.informed,
                      defaultValue: "{{primary}} Primary · {{informed}} Informed — tap to edit",
                    })}
              </p>
            ) : null}
          </div>
          <ChevronDown
            className={cn(
              "h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 dark:text-slate-400",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="max-h-[min(18rem,40vh)] overflow-y-auto border-t border-border/60 px-3 pb-2 pt-1">
          <div className="divide-y divide-border/70">
            {areas.map((area) => {
              const role = roleForArea(area, staffId);
              const label = systemLabelKey(area.slug) ? t(systemLabelKey(area.slug) as string, area.title) : area.title;
              return (
                <label key={area.id} className="flex min-h-10 items-center justify-between gap-3 py-1.5 text-sm">
                  <span className="min-w-0 truncate">{label}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    {!isPrivateSlug(area.slug) && followed.has(area.slug) ? (
                      <span className="text-[11px] text-muted-foreground">{t("cursorUi.resp.staff_follows")}</span>
                    ) : null}
                    <select
                      className="h-9 w-40 rounded-lg border border-slate-300 bg-white px-2.5 text-sm font-medium shadow-sm dark:border-slate-600 dark:bg-slate-900"
                      value={role}
                      disabled={save.isPending}
                      aria-label={label}
                      onChange={(event) => {
                        const next = event.target.value as "primary" | "informed" | "none";
                        if (next === "primary" && area.primary?.id && area.primary.id !== staffId) {
                          setReplaceTarget(area);
                          return;
                        }
                        save.mutate({ areaId: area.id, role: next });
                      }}
                    >
                      <option value="none">{t("cursorUi.resp.role_none", "None")}</option>
                      <option value="primary">{t("cursorUi.resp.primary", "Primary")}</option>
                      <option value="informed">{t("cursorUi.resp.informed", "Informed")}</option>
                    </select>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
      <AlertDialog open={replaceTarget !== null} onOpenChange={(next) => { if (!next) setReplaceTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("cursorUi.resp.replace_primary_title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("cursorUi.resp.replace_primary")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (replaceTarget) save.mutate({ areaId: replaceTarget.id, role: "primary" });
                setReplaceTarget(null);
              }}
            >
              {t("cursorUi.resp.replace_primary_action")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
