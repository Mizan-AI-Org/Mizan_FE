import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Check, Loader2, Search, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  filterStaffPickerOptions,
  groupStaffPickerByDepartment,
} from "@/lib/staffPickerFilter";
import {
  searchStaffPicker,
  staffPickerDisplayName,
  type StaffPickerOption,
} from "@/lib/staffPicker";

type Props = {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  staffOptions: StaffPickerOption[];
  /** Shown on the trigger when nobody is selected */
  emptyTriggerLabel?: string;
  /** Shown on the trigger when people are selected */
  selectedTriggerLabel?: (count: number) => string;
  /** Hint under the search field inside the popover */
  popoverHint?: string;
  triggerClassName?: string;
  contentClassName?: string;
  disabled?: boolean;
  /** Show department quick-select pills above the trigger */
  showDepartmentPills?: boolean;
};

function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

export function ProcessAssigneeMultiSelect({
  selectedIds,
  onChange,
  staffOptions,
  emptyTriggerLabel,
  selectedTriggerLabel,
  popoverHint,
  triggerClassName,
  contentClassName,
  disabled = false,
  showDepartmentPills = true,
}: Props) {
  const { t } = useTranslation();
  const resolvedEmpty =
    emptyTriggerLabel ?? t("process.assignee.empty_trigger");
  const resolvedHint =
    popoverHint ?? t("process.assignee.popover_hint");
  const resolvedSelected =
    selectedTriggerLabel ??
    ((n: number) => t("process.assignee.selected_trigger", { count: n }));
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 200);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setDebouncedSearch("");
    }
  }, [open]);

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of staffOptions) {
      map.set(row.id, row.name);
    }
    return map;
  }, [staffOptions]);

  const departmentGroups = useMemo(
    () => groupStaffPickerByDepartment(staffOptions),
    [staffOptions],
  );

  const localFiltered = useMemo(
    () => filterStaffPickerOptions(staffOptions, debouncedSearch),
    [staffOptions, debouncedSearch],
  );

  const useServerSearch =
    debouncedSearch.length >= 2 && staffOptions.length >= 120;

  const serverQuery = useQuery({
    queryKey: ["process-assignee-search", debouncedSearch],
    queryFn: () =>
      searchStaffPicker({
        search: debouncedSearch,
        pageSize: 50,
      }),
    enabled: open && useServerSearch,
    staleTime: 30_000,
  });

  const serverOptions: StaffPickerOption[] = useMemo(() => {
    if (!useServerSearch || !serverQuery.data?.results) return [];
    return serverQuery.data.results.map((row) => ({
      id: row.id,
      name: staffPickerDisplayName(row),
      role: row.role,
    }));
  }, [useServerSearch, serverQuery.data?.results]);

  const browseGroups = useMemo(() => {
    if (debouncedSearch) {
      const list = useServerSearch && serverOptions.length > 0 ? serverOptions : localFiltered;
      return groupStaffPickerByDepartment(list);
    }
    return departmentGroups;
  }, [debouncedSearch, departmentGroups, localFiltered, serverOptions, useServerSearch]);

  const visibleCount = browseGroups.reduce((sum, [, rows]) => sum + rows.length, 0);
  const isLoading = useServerSearch && (serverQuery.isLoading || serverQuery.isFetching);

  const toggleDepartment = (department: string) => {
    const members = departmentGroups.find(([d]) => d === department)?.[1] ?? [];
    const ids = members.map((m) => m.id);
    const allOn = ids.length > 0 && ids.every((id) => selectedIds.includes(id));
    if (allOn) {
      onChange(selectedIds.filter((id) => !ids.includes(id)));
      return;
    }
    const next = new Set(selectedIds);
    ids.forEach((id) => next.add(id));
    onChange(Array.from(next));
  };

  const selectAllVisible = () => {
    const ids = browseGroups.flatMap(([, rows]) => rows.map((r) => r.id));
    const next = new Set(selectedIds);
    ids.forEach((id) => next.add(id));
    onChange(Array.from(next));
  };

  const clearSelection = () => onChange([]);

  const renderRow = (row: StaffPickerOption) => {
    const picked = selectedIds.includes(row.id);
    return (
      <CommandItem
        key={row.id}
        value={`${row.id}-${row.name}`}
        onSelect={() => onChange(toggleId(selectedIds, row.id))}
        className="flex items-center gap-2.5 py-2.5 px-2 cursor-pointer"
      >
        <div
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
            picked
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-muted-foreground/40",
          )}
          aria-hidden
        >
          {picked ? <Check className="h-3 w-3" /> : null}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className="truncate text-sm font-medium leading-tight">{row.name}</div>
          <div className="truncate text-xs text-muted-foreground">
            {[row.department || row.role, row.role && row.department ? row.role : null]
              .filter(Boolean)
              .join(" · ") || t("process.assignee.team_member")}
          </div>
        </div>
      </CommandItem>
    );
  };

  return (
    <div className="space-y-3">
      {showDepartmentPills && departmentGroups.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {departmentGroups.map(([dept, members]) => {
            const ids = members.map((m) => m.id);
            const allOn = ids.length > 0 && ids.every((id) => selectedIds.includes(id));
            const someOn = ids.some((id) => selectedIds.includes(id));
            return (
              <Button
                key={dept}
                type="button"
                variant={allOn ? "secondary" : "outline"}
                size="sm"
                className={cn(
                  "h-8 text-xs",
                  someOn && !allOn && "border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/30",
                )}
                disabled={disabled}
                onClick={() => toggleDepartment(dept)}
              >
                {dept} ({members.length})
              </Button>
            );
          })}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              className={cn("h-9 gap-1.5 border-dashed", triggerClassName)}
            >
              <Users className="h-3.5 w-3.5" />
              {selectedIds.length > 0
                ? resolvedSelected(selectedIds.length)
                : resolvedEmpty}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className={cn("w-[min(340px,calc(100vw-2rem))] p-0 z-[3100]", contentClassName)}
            align="start"
          >
            <Command shouldFilter={false} className="rounded-lg border-none">
              <div className="border-b px-3 pt-3 pb-2 space-y-2">
                <p className="text-xs text-muted-foreground leading-snug">{resolvedHint}</p>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <CommandInput
                    placeholder={t("process.assignee.search_placeholder")}
                    value={search}
                    onValueChange={setSearch}
                    className="h-10 pl-9"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                  <span>
                    {debouncedSearch
                      ? visibleCount === 1
                        ? t("process.assignee.match_count", { count: visibleCount })
                        : t("process.assignee.match_count_plural", { count: visibleCount })
                      : t("process.assignee.people_count", { count: staffOptions.length })}
                    {selectedIds.length > 0
                      ? ` · ${t("process.assignee.selected_count", { count: selectedIds.length })}`
                      : ""}
                  </span>
                  {selectedIds.length > 0 ? (
                    <button
                      type="button"
                      className="font-medium text-foreground hover:underline"
                      onClick={clearSelection}
                    >
                      {t("process.assignee.clear_all")}
                    </button>
                  ) : visibleCount > 0 && debouncedSearch ? (
                    <button
                      type="button"
                      className="font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                      onClick={selectAllVisible}
                    >
                      {t("process.assignee.select_matches")}
                    </button>
                  ) : null}
                </div>
              </div>
              <CommandList className="max-h-[min(280px,50vh)]">
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("process.assignee.searching")}
                  </div>
                ) : staffOptions.length === 0 ? (
                  <CommandEmpty>{t("process.assignee.no_roster")}</CommandEmpty>
                ) : visibleCount === 0 ? (
                  <CommandEmpty>
                    {t("process.assignee.no_match", { query: debouncedSearch })}
                  </CommandEmpty>
                ) : debouncedSearch ? (
                  <CommandGroup>{browseGroups.flatMap(([, rows]) => rows.map(renderRow))}</CommandGroup>
                ) : (
                  browseGroups.map(([dept, rows]) => (
                    <CommandGroup
                      key={dept}
                      heading={
                        <span className="flex items-center justify-between gap-2">
                          <span>{dept}</span>
                          <button
                            type="button"
                            className="normal-case font-normal text-emerald-700 dark:text-emerald-400 hover:underline"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleDepartment(dept);
                            }}
                          >
                            {rows.every((r) => selectedIds.includes(r.id))
                              ? t("process.assignee.remove_team")
                              : t("process.assignee.add_team")}
                          </button>
                        </span>
                      }
                    >
                      {rows.map(renderRow)}
                    </CommandGroup>
                  ))
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {selectedIds.map((id) => (
          <Badge
            key={id}
            variant="secondary"
            className="gap-1 pl-2 pr-1 py-0.5 text-xs font-medium max-w-[200px]"
          >
            <span className="truncate">{nameById.get(id) || t("process.assignee.staff_fallback")}</span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(toggleId(selectedIds, id))}
              className="rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5 shrink-0"
              aria-label={t("process.assignee.remove_person", {
                name: nameById.get(id) || t("process.assignee.staff_fallback"),
              })}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}

/** Compact picker for per-task branch alerts (same search UX, no department pills). */
export function BranchAlertAssigneeSelect({
  selectedIds,
  onChange,
  staffOptions,
  popoverHint,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  staffOptions: StaffPickerOption[];
  popoverHint?: string;
}) {
  const { t } = useTranslation();
  return (
    <ProcessAssigneeMultiSelect
      selectedIds={selectedIds}
      onChange={onChange}
      staffOptions={staffOptions}
      emptyTriggerLabel={t("process.assignee.branch_empty")}
      selectedTriggerLabel={(n) => t("process.assignee.branch_selected", { count: n })}
      popoverHint={popoverHint ?? t("process.assignee.branch_hint")}
      showDepartmentPills={false}
      triggerClassName="h-8"
    />
  );
}
