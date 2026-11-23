import type { Dispatch, ReactNode, SetStateAction } from "react";
import { Label } from "@/components/ui/label";
import { CategoryOwnerPicker } from "@/components/settings/CategoryOwnerPicker";
import { CATEGORY_OWNER_GROUPS, type CategoryOwnerGroup } from "@/lib/categoryOwners";
import type { StaffPickerRow } from "@/lib/staffPicker";
import { cn } from "@/lib/utils";

type Props = {
  categoryOwners: Record<string, string[]>;
  /** Controlled mode (Settings form with its own Save). Omit when `onOwnersChange` handles saving. */
  setCategoryOwners?: Dispatch<SetStateAction<Record<string, string[]>>>;
  /** Called with the new owner list of one category (auto-save mode). */
  onOwnersChange?: (slug: string, ids: string[]) => void;
  staffDirectory: Record<string, StaffPickerRow>;
  t: (key: string, options?: string | Record<string, string | number>) => string;
  disabled?: boolean;
  /** Extra content under a category's picker (e.g. the follow control). */
  renderExtra?: (slug: string) => ReactNode;
};

function gridClassForGroup(group: CategoryOwnerGroup): string {
  if (group.items.length <= 4) {
    return "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4";
  }
  return "grid grid-cols-1 gap-3 md:grid-cols-2";
}

const categoryCardClassName =
  "flex min-h-[5.25rem] flex-col gap-2 rounded-xl border border-slate-200/80 bg-slate-50/50 px-3.5 py-3 dark:border-slate-700 dark:bg-slate-900/30";

export function CategoryOwnerGroupsEditor({
  categoryOwners,
  setCategoryOwners,
  onOwnersChange,
  staffDirectory,
  t,
  disabled = false,
  renderExtra,
}: Props) {
  const change = (slug: string, ids: string[]) => {
    if (onOwnersChange) {
      onOwnersChange(slug, ids);
      return;
    }
    setCategoryOwners?.((prev) => {
      if (ids.length === 0) {
        const { [slug]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [slug]: ids };
    });
  };

  return (
    <div className="space-y-6">
      {CATEGORY_OWNER_GROUPS.map((group, index) => (
        <div key={group.groupKey} className={index > 0 ? "pt-6 border-t border-slate-200/80 dark:border-slate-800" : undefined}>
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t(group.groupKey)}</div>
            <div className={cn(gridClassForGroup(group))}>
              {group.items.map((cat) => (
                <div key={cat.key} className={categoryCardClassName} data-testid={`owner-card-${cat.key}`}>
                  <Label className="text-sm font-medium leading-tight text-slate-900 dark:text-slate-50">
                    {t(cat.labelKey)}
                  </Label>
                  <CategoryOwnerPicker
                    selectedIds={categoryOwners[cat.key] || []}
                    staffDirectory={staffDirectory}
                    disabled={disabled}
                    onChange={(ids) => change(cat.key, ids)}
                  />
                  {renderExtra?.(cat.key)}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
