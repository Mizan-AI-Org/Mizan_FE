import { useMemo, useState, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { CategoryOwnerPicker } from "@/components/settings/CategoryOwnerPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { systemGroupKey, systemLabelKey } from "@/lib/categoryOwners";
import type { ResponsibilityAreaNode } from "@/lib/api";
import type { StaffPickerRow } from "@/lib/staffPicker";
import { cn } from "@/lib/utils";
import { MIZAN_ELEVATED_INSET } from "@/lib/mizan-ui";

type TFn = (key: string, options?: string | Record<string, string | number>) => string;

type Props = {
  areas: ResponsibilityAreaNode[];
  staffDirectory: Record<string, StaffPickerRow>;
  t: TFn;
  disabled?: boolean;
  currentUserId?: string;
  renderExtra?: (slug: string) => ReactNode;
  onMembers: (areaId: string, primaryId: string | null, informedIds: string[]) => void;
  onUpdate: (areaId: string, patch: { title?: string; description?: string; routing_hints?: string }) => void;
  onCreate: (payload: { title: string; description?: string; parent_id?: string | null }) => void;
  onDelete: (areaId: string) => void;
};

const GROUP_ORDER = ["incidents", "requests", "departments", "custom"] as const;

/** Raised off the settings surface. Nested areas stay the quieter inset. */
const AREA_CARD_ELEVATED =
  "rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_12px_28px_-14px_rgba(15,23,42,0.2),0_4px_10px_-6px_rgba(15,23,42,0.1)] dark:border-border/70 dark:bg-card dark:shadow-[0_14px_28px_-14px_rgba(0,0,0,0.55)]";

const GROUP_I18N: Record<string, string> = {
  incidents: "onboarding.owners.groups.incidents",
  requests: "onboarding.owners.groups.requests",
  departments: "onboarding.owners.groups.departments",
  custom: "onboarding.owners.groups.custom",
};

function groupOf(node: ResponsibilityAreaNode): string {
  if (node.group) return node.group;
  const fromSlug = systemGroupKey(node.slug);
  if (fromSlug?.includes("incidents")) return "incidents";
  if (fromSlug?.includes("requests")) return "requests";
  if (fromSlug?.includes("departments")) return "departments";
  return "custom";
}

function titleOf(node: ResponsibilityAreaNode, t: TFn): string {
  const key = systemLabelKey(node.slug);
  return key ? t(key, node.title) : node.title;
}

export function ResponsibilityTreeEditor({
  areas,
  staffDirectory,
  t,
  disabled = false,
  currentUserId,
  renderExtra,
  onMembers,
  onUpdate,
  onCreate,
  onDelete,
}: Props) {
  const [customTitle, setCustomTitle] = useState("");
  const grouped = useMemo(() => {
    const buckets: Record<string, ResponsibilityAreaNode[]> = {
      incidents: [],
      requests: [],
      departments: [],
      custom: [],
    };
    for (const node of areas) {
      const key = groupOf(node);
      (buckets[key] || buckets.custom).push(node);
    }
    return buckets;
  }, [areas]);

  return (
    <div className="space-y-6">
      {GROUP_ORDER.map((group) => {
        const rows = grouped[group] || [];
        if (group !== "custom" && rows.length === 0) return null;
        return (
          <div key={group} className="space-y-3 border-t border-slate-200/80 pt-6 first:border-t-0 first:pt-0 dark:border-slate-800">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t(GROUP_I18N[group], group)}
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {rows.map((node) => (
                <AreaCard
                  key={node.id}
                  node={node}
                  t={t}
                  disabled={disabled}
                  staffDirectory={staffDirectory}
                  renderExtra={renderExtra}
                  onMembers={onMembers}
                  onUpdate={onUpdate}
                  onCreate={onCreate}
                  onDelete={onDelete}
                />
              ))}
            </div>
            {group === "custom" && !disabled ? (
              <form
                className="flex flex-wrap items-end gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const title = customTitle.trim();
                  if (!title) return;
                  onCreate({ title });
                  setCustomTitle("");
                }}
              >
                <div className="min-w-[12rem] flex-1 space-y-1">
                  <Label className="text-[11px] text-muted-foreground">{t("cursorUi.resp.add_category", "New category")}</Label>
                  <Input
                    value={customTitle}
                    onChange={(event) => setCustomTitle(event.target.value)}
                    placeholder={t("cursorUi.resp.category_name", "Name")}
                    data-testid="resp-new-category"
                  />
                </div>
                <Button type="submit" size="sm" variant="outline" className="gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  {t("cursorUi.resp.add", "Add")}
                </Button>
              </form>
            ) : null}
          </div>
        );
      })}
      {currentUserId && !disabled ? (
        <p className="text-[11px] text-muted-foreground">{t("cursorUi.resp.defaults_hint")}</p>
      ) : null}
    </div>
  );
}

function AreaCard({
  node,
  t,
  disabled,
  staffDirectory,
  renderExtra,
  onMembers,
  onUpdate,
  onCreate,
  onDelete,
  nested = false,
}: {
  node: ResponsibilityAreaNode;
  t: TFn;
  disabled: boolean;
  staffDirectory: Record<string, StaffPickerRow>;
  renderExtra?: (slug: string) => ReactNode;
  onMembers: Props["onMembers"];
  onUpdate: Props["onUpdate"];
  onCreate: Props["onCreate"];
  onDelete: Props["onDelete"];
  nested?: boolean;
}) {
  const [addingChild, setAddingChild] = useState("");
  const primaryId = node.primary?.id ? [node.primary.id] : [];
  const informedIds = (node.informed || []).map((row) => row.id).filter((id) => id !== node.primary?.id);

  return (
    <div
      className={cn(
        "flex flex-col gap-2 px-3.5 py-3",
        nested
          ? cn(MIZAN_ELEVATED_INSET, "ml-3 border-l-2 border-emerald-200/80 dark:border-emerald-900")
          : AREA_CARD_ELEVATED,
      )}
      data-testid={`owner-card-${node.slug}`}
    >
      <div className="flex items-start justify-between gap-2">
        <Label className="text-sm font-medium leading-tight text-slate-900 dark:text-slate-50">
          {titleOf(node, t)}
        </Label>
        {node.kind === "custom" && !disabled ? (
          <button
            type="button"
            className="text-muted-foreground hover:text-destructive"
            aria-label={t("cursorUi.resp.delete_area", "Delete")}
            onClick={() => {
              if (window.confirm(t("cursorUi.resp.delete_confirm", "Delete this area?"))) onDelete(node.id);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      <textarea
        className="min-h-[2.5rem] resize-y rounded-md border border-slate-200 bg-background px-2 py-1 text-xs dark:border-slate-700"
        defaultValue={node.description || ""}
        disabled={disabled}
        placeholder={t("cursorUi.resp.description", "Description")}
        onBlur={(event) => {
          const next = event.target.value.trim();
          if (next !== (node.description || "")) onUpdate(node.id, { description: next });
        }}
      />
      <textarea
        className="min-h-[2rem] resize-y rounded-md border border-slate-200 bg-background px-2 py-1 text-xs dark:border-slate-700"
        defaultValue={node.routing_hints || ""}
        disabled={disabled}
        placeholder={t("cursorUi.resp.routing_hints", "Keywords Miya uses (mineral water, drinks)")}
        onBlur={(event) => {
          const next = event.target.value.trim();
          if (next !== (node.routing_hints || "")) onUpdate(node.id, { routing_hints: next });
        }}
      />
      <div className="space-y-1">
        <p className="text-[11px] font-medium text-muted-foreground">{t("cursorUi.resp.primary", "Primary")}</p>
        <CategoryOwnerPicker
          selectedIds={primaryId}
          staffDirectory={staffDirectory}
          disabled={disabled}
          multiple={false}
          emptyLabel={t("cursorUi.resp.pick_primary", "Pick the person who executes")}
          onChange={(ids) => onMembers(node.id, ids[0] || null, informedIds.filter((id) => id !== ids[0]))}
        />
      </div>
      <div className="space-y-1">
        <p className="text-[11px] font-medium text-muted-foreground">{t("cursorUi.resp.informed", "Informed")}</p>
        <CategoryOwnerPicker
          selectedIds={informedIds}
          staffDirectory={staffDirectory}
          disabled={disabled}
          multiple
          emptyLabel={t("cursorUi.resp.pick_informed", "People who should know")}
          onChange={(ids) => onMembers(node.id, primaryId[0] || null, ids.filter((id) => id !== primaryId[0]))}
        />
      </div>
      {renderExtra?.(node.slug)}
      {(node.children || []).map((child) => (
        <AreaCard
          key={child.id}
          node={child}
          t={t}
          disabled={disabled}
          staffDirectory={staffDirectory}
          renderExtra={renderExtra}
          onMembers={onMembers}
          onUpdate={onUpdate}
          onCreate={onCreate}
          onDelete={onDelete}
          nested
        />
      ))}
      {!disabled && !nested ? (
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const title = addingChild.trim();
            if (!title) return;
            onCreate({ title, parent_id: node.id });
            setAddingChild("");
          }}
        >
          <Input
            value={addingChild}
            onChange={(event) => setAddingChild(event.target.value)}
            placeholder={t("cursorUi.resp.add_subcategory", "Add subcategory")}
            className="h-8 text-xs"
          />
          <Button type="submit" size="sm" variant="ghost" className="h-8 px-2">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </form>
      ) : null}
    </div>
  );
}
