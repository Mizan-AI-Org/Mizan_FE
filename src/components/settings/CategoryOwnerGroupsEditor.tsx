import type { Dispatch, SetStateAction } from "react";
import { Label } from "@/components/ui/label";
import { CategoryOwnerPicker } from "@/components/settings/CategoryOwnerPicker";
import { SettingsSubsection } from "@/components/settings/SettingsSection";
import { CATEGORY_OWNER_GROUPS, type CategoryOwnerGroup } from "@/lib/categoryOwners";
import type { StaffPickerRow } from "@/lib/staffPicker";
import { cn } from "@/lib/utils";

type Props = {
  categoryOwners: Record<string, string[]>;
  setCategoryOwners: Dispatch<SetStateAction<Record<string, string[]>>>;
  staffDirectory: Record<string, StaffPickerRow>;
  t: (key: string) => string;
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
  staffDirectory,
  t,
}: Props) {
  return (
    <div className="space-y-6">
      {CATEGORY_OWNER_GROUPS.map((group, index) => (
        <div key={group.groupKey} className={index > 0 ? "pt-6 border-t border-slate-200/80 dark:border-slate-800" : undefined}>
          <SettingsSubsection
            title={
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t(group.groupKey)}
              </span>
            }
          >
            <div className={cn(gridClassForGroup(group))}>
              {group.items.map((cat) => (
                <div key={cat.key} className={categoryCardClassName}>
                  <Label className="text-sm font-medium leading-tight text-slate-900 dark:text-slate-50">
                    {t(cat.labelKey)}
                  </Label>
                  <CategoryOwnerPicker
                    selectedIds={categoryOwners[cat.key] || []}
                    staffDirectory={staffDirectory}
                    onChange={(ids) => {
                      setCategoryOwners((prev) => {
                        if (ids.length === 0) {
                          const { [cat.key]: _, ...rest } = prev;
                          return rest;
                        }
                        return { ...prev, [cat.key]: ids };
                      });
                    }}
                  />
                </div>
              ))}
            </div>
          </SettingsSubsection>
        </div>
      ))}
    </div>
  );
}
