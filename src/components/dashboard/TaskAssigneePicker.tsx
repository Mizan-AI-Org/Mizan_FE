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
  assigneeId: string | null;
  assigneeName?: string | null;
  onChange: (assigneeId: string | null) => void;
  disabled?: boolean;
  isUpdating?: boolean;
  className?: string;
};

export function TaskAssigneePicker({
  assigneeId,
  assigneeName,
  onChange,
  disabled = false,
  isUpdating = false,
  className,
}: Props) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

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
    queryKey: ["staff-picker-resolve", assigneeId],
    queryFn: () =>
      searchStaffPicker({
        ids: assigneeId ? [assigneeId] : [],
        pageSize: 1,
      }),
    enabled: !!assigneeId && !assigneeName,
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

  const resolvedName = useMemo(() => {
    if (assigneeName) return assigneeName;
    const row = resolveQuery.data?.results?.[0];
    return row ? staffPickerDisplayName(row) : null;
  }, [assigneeName, resolveQuery.data?.results]);

  const rosterTotal = searchQuery.data?.count;
  const searchResults = searchQuery.data?.results ?? [];
  const isLoading = searchQuery.isLoading || searchQuery.isFetching;

  const pick = (row: StaffPickerRow) => {
    if (disabled || isUpdating) return;
    onChange(row.id);
    setOpen(false);
  };

  const unassign = () => {
    if (disabled || isUpdating) return;
    onChange(null);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {assigneeId ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant="secondary"
            className="gap-1.5 pl-2 pr-1 py-1 text-xs font-medium bg-background border border-border/70"
          >
            <UserCircle2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="max-w-[180px] truncate">
              {resolvedName || t("onboarding.owners.loading_name", "…")}
            </span>
            {!disabled ? (
              <button
                type="button"
                onClick={unassign}
                disabled={isUpdating}
                className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-muted disabled:opacity-50"
                aria-label={t("dashboard.task_detail.unassign", { defaultValue: "Unassign" })}
              >
                <X className="h-3 w-3" />
              </button>
            ) : null}
          </Badge>
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
            {assigneeId
              ? t("dashboard.task_detail.change_assignee", { defaultValue: "Change assignee" })
              : t("dashboard.task_detail.assign", { defaultValue: "Assign someone" })}
            <ChevronDown className="ml-1.5 h-3.5 w-3.5 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(320px,calc(100vw-2rem))] p-0" align="start">
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
                      defaultValue: "{{total}} people on roster — type to narrow",
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
                    const picked = assigneeId === row.id;
                    return (
                      <CommandItem
                        key={row.id}
                        value={row.id}
                        onSelect={() => pick(row)}
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
