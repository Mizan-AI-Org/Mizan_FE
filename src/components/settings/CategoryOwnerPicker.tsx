import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  className?: string;
};

export function CategoryOwnerPicker({
  selectedIds,
  onChange,
  disabled = false,
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
    queryKey: ["staff-picker-resolve", selectedIds.slice().sort().join(",")],
    queryFn: () => searchStaffPicker({ ids: selectedIds, pageSize: Math.max(selectedIds.length, 1) }),
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
    const map = new Map<string, StaffPickerRow>();
    for (const row of resolveQuery.data?.results ?? []) {
      map.set(row.id, row);
    }
    for (const row of searchQuery.data?.results ?? []) {
      map.set(row.id, row);
    }
    return map;
  }, [resolveQuery.data?.results, searchQuery.data?.results]);

  const toggle = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    onChange(next);
  };

  const remove = (id: string) => {
    onChange(selectedIds.filter((x) => x !== id));
  };

  const rosterTotal = searchQuery.data?.count ?? resolveQuery.data?.count;
  const searchResults = searchQuery.data?.results ?? [];
  const isLoading = searchQuery.isLoading || searchQuery.isFetching;

  return (
    <div className={cn("space-y-2", className)}>
      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedIds.map((id) => {
            const row = nameById.get(id);
            const label = row ? staffPickerDisplayName(row) : t("onboarding.owners.loading_name", "…");
            return (
              <Badge
                key={id}
                variant="secondary"
                className="gap-1 pl-2.5 pr-1 py-1 text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800"
              >
                <span className="max-w-[180px] truncate">{label}</span>
                {!disabled ? (
                  <button
                    type="button"
                    onClick={() => remove(id)}
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-emerald-200/80 dark:hover:bg-emerald-900/60"
                    aria-label={t("onboarding.owners.remove_person", "Remove")}
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : null}
              </Badge>
            );
          })}
        </div>
      ) : null}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            className="h-8 rounded-lg text-xs font-medium"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            {selectedIds.length === 0
              ? t("onboarding.owners.pick_placeholder", "Pick people")
              : t("onboarding.owners.add_people", "Add people")}
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
                        onSelect={() => toggle(row.id)}
                        className="flex items-center gap-2 py-2"
                      >
                        <div
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                            picked
                              ? "border-emerald-600 bg-emerald-600 text-white"
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
