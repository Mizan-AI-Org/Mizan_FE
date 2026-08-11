import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Loader2, UserCircle2, X } from "lucide-react";
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
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import {
  searchStaffPicker,
  staffPickerDisplayName,
  type StaffPickerRow,
} from "@/lib/staffPicker";

type Props = {
  /** Single-assignee mode (legacy). */
  assigneeId?: string | null;
  assigneeName?: string | null;
  onChange?: (assigneeId: string | null) => void;
  /** Multi-assignee mode - preferred for task detail. */
  assigneeIds?: string[];
  assigneeNames?: Record<string, string>;
  onAssigneesChange?: (assigneeIds: string[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  isUpdating?: boolean;
  className?: string;
};

export function TaskAssigneePicker({
  assigneeId = null,
  assigneeName,
  onChange,
  assigneeIds,
  assigneeNames,
  onAssigneesChange,
  multiple = false,
  disabled = false,
  isUpdating = false,
  className,
}: Props) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const isMulti = multiple || !!onAssigneesChange;
  const selectedIds = useMemo(() => {
    if (isMulti) return assigneeIds ?? [];
    return assigneeId ? [assigneeId] : [];
  }, [isMulti, assigneeIds, assigneeId]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setDebouncedSearch("");
    }
  }, [open]);

  const resolveQuery = useQuery({
    queryKey: ["staff-picker-resolve", selectedIds.join(",")],
    queryFn: () =>
      searchStaffPicker({
        ids: selectedIds,
        pageSize: Math.max(selectedIds.length, 1),
      }),
    enabled: selectedIds.length > 0,
    staleTime: 120_000,
  });

  const searchQuery = useQuery({
    queryKey: ["staff-picker-search", debouncedSearch, open],
    queryFn: () =>
      searchStaffPicker({
        search: debouncedSearch || undefined,
        pageSize: debouncedSearch ? 50 : 30,
      }),
    enabled: open,
    staleTime: 30_000,
  });

  const nameById = useMemo(() => {
    const map: Record<string, string> = { ...(assigneeNames || {}) };
    if (!isMulti && assigneeName && assigneeId) {
      map[assigneeId] = assigneeName;
    }
    for (const row of resolveQuery.data?.results ?? []) {
      map[row.id] = staffPickerDisplayName(row);
    }
    return map;
  }, [assigneeNames, assigneeName, assigneeId, isMulti, resolveQuery.data?.results]);

  const rosterTotal = searchQuery.data?.count;
  const searchResults = searchQuery.data?.results ?? [];
  const isLoading = searchQuery.isLoading || searchQuery.isFetching;

  const toggle = (row: StaffPickerRow) => {
    if (disabled || isUpdating) return;
    const id = row.id;
    if (isMulti) {
      const next = selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id];
      onAssigneesChange?.(next);
      return;
    }
    onChange?.(id);
    setOpen(false);
  };

  const removeId = (id: string) => {
    if (disabled || isUpdating) return;
    if (isMulti) {
      onAssigneesChange?.(selectedIds.filter((x) => x !== id));
      return;
    }
    onChange?.(null);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {selectedIds.map((id) => (
            <Badge
              key={id}
              variant="secondary"
              className="gap-1.5 pl-2 pr-1 py-1 text-xs font-medium bg-background border border-border/70"
            >
              <UserCircle2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="max-w-[180px] truncate">
                {nameById[id] || t("onboarding.owners.loading_name", "…")}
              </span>
              {!disabled ? (
                <button
                  type="button"
                  onClick={() => removeId(id)}
                  disabled={isUpdating}
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-muted disabled:opacity-50"
                  aria-label={t("dashboard.task_detail.unassign", { defaultValue: "Remove" })}
                >
                  <X className="h-3 w-3" />
                </button>
              ) : null}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t("staff.requests.unassigned")}
        </p>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || isUpdating}
            className="h-8 rounded-lg text-xs font-medium"
          >
            {isUpdating ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <UserCircle2 className="h-3.5 w-3.5 mr-1.5" />
            )}
            {selectedIds.length > 0
              ? isMulti
                ? t("dashboard.task_detail.add_assignee", { defaultValue: "Add staff" })
                : t("dashboard.task_detail.change_assignee", { defaultValue: "Change assignee" })
              : t("dashboard.task_detail.assign", { defaultValue: "Assign someone" })}
            <ChevronDown className="ml-1.5 h-3.5 w-3.5 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(320px,calc(100vw-2rem))] p-0 z-[4000]" align="start">
          <Command shouldFilter={false} className="rounded-lg border-none">
            <CommandInput
              placeholder={t("common.search_staff", "Search staff...")}
              value={search}
              onValueChange={setSearch}
              className="h-10"
            />
            {typeof rosterTotal === "number" ? (
              <p className="px-3 pb-1 text-[11px] text-muted-foreground">
                {debouncedSearch
                  ? t("onboarding.owners.search_count", {
                      defaultValue: "{{shown}} of {{total}} matches",
                      shown: searchResults.length,
                      total: rosterTotal,
                    })
                  : t("onboarding.owners.roster_total", {
                      defaultValue: "{{total}} people on roster - type to narrow",
                      total: rosterTotal,
                    })}
              </p>
            ) : null}
            <CommandList className="max-h-[240px]">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("onboarding.owners.searching", "Searching…")}
                </div>
              ) : searchResults.length === 0 ? (
                <CommandEmpty>
                  {debouncedSearch
                    ? t("onboarding.owners.no_match", "No staff match your search.")
                    : t("onboarding.owners.type_to_search", "Type a name or email to search.")}
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {searchResults.map((row) => {
                    const picked = selectedIds.includes(row.id);
                    return (
                      <CommandItem
                        key={row.id}
                        value={row.id}
                        onSelect={() => toggle(row)}
                        className="flex items-center gap-2 py-2"
                      >
                        <div
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                            picked
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-slate-300 dark:border-slate-600",
                          )}
                        >
                          {picked ? <Check className="h-3 w-3" /> : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">
                            {staffPickerDisplayName(row)}
                          </div>
                          {row.email ? (
                            <div className="truncate text-xs text-muted-foreground">{row.email}</div>
                          ) : null}
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
