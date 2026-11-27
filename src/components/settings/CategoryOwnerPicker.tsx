import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Loader2, UserPlus, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  staffDirectory?: Record<string, StaffPickerRow>;
  multiple?: boolean;
  emptyLabel?: string;
};

function initialsFor(row: StaffPickerRow): string {
  const first = (row.first_name || "").trim();
  const last = (row.last_name || "").trim();
  if (first || last) {
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || first.charAt(0).toUpperCase();
  }
  const email = (row.email || "").trim();
  if (email) return email.charAt(0).toUpperCase();
  return "?";
}

function formatRole(role?: string): string | null {
  const raw = (role || "").trim();
  if (!raw) return null;
  if (raw.includes("_")) {
    return raw
      .split("_")
      .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
      .join(" ");
  }
  return raw.charAt(0) + raw.slice(1).toLowerCase();
}

function StaffAvatar({
  row,
  size = "sm",
  className,
}: {
  row?: StaffPickerRow | null;
  size?: "sm" | "md";
  className?: string;
}) {
  const dim = size === "md" ? "h-8 w-8 text-xs" : "h-7 w-7 text-[10px]";
  return (
    <Avatar className={cn(dim, className)}>
      <AvatarFallback
        className={cn(
          "font-semibold",
          size === "md"
            ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
        )}
      >
        {row ? initialsFor(row) : "?"}
      </AvatarFallback>
    </Avatar>
  );
}

function personSubtitle(row: StaffPickerRow, displayName: string): string | null {
  const email = (row.email || "").trim();
  if (email && email.toLowerCase() !== displayName.toLowerCase()) return email;
  return formatRole(row.role);
}

export function CategoryOwnerPicker({
  selectedIds,
  onChange,
  disabled = false,
  className,
  staffDirectory = {},
  multiple = true,
  emptyLabel,
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
    queryFn: () =>
      searchStaffPicker({
        ids: selectedIds,
        pageSize: Math.max(selectedIds.length, 50),
      }),
    enabled: selectedIds.length > 0,
    staleTime: 120_000,
  });

  const searchQuery = useQuery({
    queryKey: ["staff-picker-search", debouncedSearch, open],
    queryFn: () =>
      searchStaffPicker({
        search: debouncedSearch || undefined,
        pageSize: debouncedSearch ? 50 : 40,
      }),
    enabled: open,
    staleTime: 30_000,
  });

  const nameById = useMemo(() => {
    const map = new Map<string, StaffPickerRow>();
    for (const row of Object.values(staffDirectory)) {
      if (row?.id) map.set(row.id, row);
    }
    for (const row of resolveQuery.data?.results ?? []) {
      map.set(row.id, row);
    }
    for (const row of searchQuery.data?.results ?? []) {
      map.set(row.id, row);
    }
    return map;
  }, [staffDirectory, resolveQuery.data?.results, searchQuery.data?.results]);

  const rowForId = (id: string) => nameById.get(id);

  const labelForId = (id: string) => {
    const row = rowForId(id);
    if (row) return staffPickerDisplayName(row);
    if (resolveQuery.isLoading || resolveQuery.isFetching) {
      return t("onboarding.owners.loading_name", "…");
    }
    return t("onboarding.owners.unknown_staff", "Team member");
  };

  const pickOne = (id: string) => {
    onChange([id]);
    setOpen(false);
  };

  const toggle = (id: string) => {
    if (!multiple) {
      if (selectedIds.includes(id)) {
        onChange([]);
      } else {
        pickOne(id);
      }
      return;
    }
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

  const emptyText =
    emptyLabel ||
    (multiple
      ? t("cursorUi.resp.pick_informed", "People who should know")
      : t("cursorUi.resp.pick_primary", "Pick who executes"));

  const primaryRow = !multiple && selectedIds[0] ? rowForId(selectedIds[0]) : undefined;

  return (
    <div className={cn("space-y-2", className)}>
      {multiple && selectedIds.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedIds.map((id) => {
            const row = rowForId(id);
            const label = labelForId(id);
            return (
              <Badge
                key={id}
                variant="secondary"
                className="h-auto shrink-0 gap-1.5 rounded-full border border-slate-200/90 bg-white py-1 pl-1 pr-1.5 text-xs font-medium shadow-sm dark:border-slate-700 dark:bg-slate-900 max-w-full"
              >
                <StaffAvatar row={row} />
                <span className="max-w-[140px] truncate leading-tight">{label}</span>
                {!disabled ? (
                  <button
                    type="button"
                    onClick={() => remove(id)}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-800"
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
            disabled={disabled}
            className={cn(
              "h-auto min-h-9 w-full justify-between gap-2 rounded-xl border-slate-200/90 bg-white px-2.5 py-2 text-left font-normal shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40",
              !multiple && selectedIds.length > 0 && "border-emerald-200/80 dark:border-emerald-900/50",
            )}
          >
            <span className="flex min-w-0 flex-1 items-center gap-2">
              {!multiple && primaryRow ? (
                <>
                  <StaffAvatar row={primaryRow} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-50">
                      {labelForId(selectedIds[0])}
                    </span>
                    {personSubtitle(primaryRow, staffPickerDisplayName(primaryRow)) ? (
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {personSubtitle(primaryRow, staffPickerDisplayName(primaryRow))}
                      </span>
                    ) : null}
                  </span>
                </>
              ) : (
                <>
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      multiple ? "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200" : "bg-slate-100 text-slate-500 dark:bg-slate-800",
                    )}
                  >
                    {multiple ? <Users className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-muted-foreground">{emptyText}</span>
                    {multiple && selectedIds.length > 0 ? (
                      <span className="block text-[11px] font-medium text-violet-700 dark:text-violet-300">
                        {t("cursorUi.resp.informed_count", {
                          defaultValue: "{{count}} selected",
                          count: selectedIds.length,
                        })}
                      </span>
                    ) : null}
                  </span>
                </>
              )}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[min(360px,calc(100vw-2rem))] p-0 z-[4000] shadow-lg"
          align="start"
          sideOffset={6}
        >
          <Command shouldFilter={false} className="rounded-xl border-none">
            <div className="border-b border-slate-100 px-3 pt-3 pb-2 dark:border-slate-800">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {multiple
                  ? t("cursorUi.resp.informed", "Informed")
                  : t("cursorUi.resp.primary", "Primary")}
              </p>
              <CommandInput
                placeholder={t("common.search_staff", "Search by name or email…")}
                value={search}
                onValueChange={setSearch}
                className="h-9 border-0 bg-slate-50/80 px-2 shadow-none focus-visible:ring-0 dark:bg-slate-900/60"
              />
              {typeof rosterTotal === "number" ? (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {debouncedSearch
                    ? t("onboarding.owners.search_count", {
                        defaultValue: "{{shown}} of {{total}} matches",
                        shown: searchResults.length,
                        total: rosterTotal,
                      })
                    : t("onboarding.owners.roster_total", {
                        defaultValue: "{{total}} on roster — type to narrow",
                        total: rosterTotal,
                      })}
                </p>
              ) : null}
            </div>
            <CommandList className="max-h-[min(280px,50vh)]">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("onboarding.owners.searching", "Searching…")}
                </div>
              ) : (
                <>
                  {!multiple ? (
                    <CommandGroup>
                      <CommandItem
                        value="__none__"
                        onSelect={() => {
                          onChange([]);
                          setOpen(false);
                        }}
                        className="mx-1 rounded-lg py-2.5 aria-selected:bg-slate-50 dark:aria-selected:bg-slate-900"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-slate-300 text-slate-400 dark:border-slate-600">
                          —
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {t("cursorUi.resp.role_none", "Nobody")}
                        </span>
                        {selectedIds.length === 0 ? (
                          <Check className="ml-auto h-4 w-4 text-emerald-600" />
                        ) : null}
                      </CommandItem>
                    </CommandGroup>
                  ) : null}
                  {searchResults.length === 0 ? (
                    <CommandEmpty className="py-8 text-sm">
                      {debouncedSearch
                        ? t("onboarding.owners.no_match", "No one matches that search.")
                        : t("onboarding.owners.type_to_search", "Type a name or email.")}
                    </CommandEmpty>
                  ) : (
                    <CommandGroup className="p-1">
                      {searchResults.map((row) => {
                        const picked = selectedIds.includes(row.id);
                        const displayName = staffPickerDisplayName(row);
                        const subtitle = personSubtitle(row, displayName);
                        return (
                          <CommandItem
                            key={row.id}
                            value={`${row.id}-${displayName}-${row.email}`}
                            onSelect={() => toggle(row.id)}
                            className={cn(
                              "flex items-center gap-2.5 rounded-lg py-2.5",
                              picked &&
                                (multiple
                                  ? "aria-selected:bg-violet-50 dark:aria-selected:bg-violet-950/40"
                                  : "aria-selected:bg-emerald-50 dark:aria-selected:bg-emerald-950/35"),
                            )}
                          >
                            <StaffAvatar row={row} />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium leading-tight">{displayName}</div>
                              {subtitle ? (
                                <div className="truncate text-[11px] text-muted-foreground">{subtitle}</div>
                              ) : null}
                            </div>
                            <span
                              className={cn(
                                "flex h-5 w-5 shrink-0 items-center justify-center",
                                multiple ? "rounded border" : "rounded-full border-2",
                                picked
                                  ? multiple
                                    ? "border-emerald-600 bg-emerald-600 text-white"
                                    : "border-emerald-600 bg-emerald-600 text-white"
                                  : "border-slate-300 bg-transparent dark:border-slate-600",
                              )}
                            >
                              {picked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                            </span>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  )}
                </>
              )}
            </CommandList>
            {multiple ? (
              <>
                <CommandSeparator />
                <div className="flex items-center justify-between gap-2 p-2">
                  <span className="px-1 text-[11px] text-muted-foreground">
                    {selectedIds.length
                      ? t("cursorUi.resp.informed_count", {
                          defaultValue: "{{count}} selected",
                          count: selectedIds.length,
                        })
                      : t("cursorUi.resp.informed_empty_hint", "Select everyone who should be notified")}
                  </span>
                  <Button type="button" size="sm" className="h-8 rounded-lg" onClick={() => setOpen(false)}>
                    {t("common.done", "Done")}
                  </Button>
                </div>
              </>
            ) : null}
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}