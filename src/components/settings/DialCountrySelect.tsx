import { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLanguage } from "@/hooks/use-language";
import {
  buildDialCountries,
  filterDialCountries,
  type DialCountry,
} from "@/lib/dialCountries";
import { cn } from "@/lib/utils";

type DialCountrySelectProps = {
  value: string;
  onChange: (countryCode: string) => void;
  className?: string;
  disabled?: boolean;
  /** Trigger shows +dial only (more room for the national number). */
  compact?: boolean;
  /** Accessible label for the trigger (country code picker). */
  "aria-label"?: string;
};

export function DialCountrySelect({
  value,
  onChange,
  className,
  disabled,
  compact = false,
  "aria-label": ariaLabel,
}: DialCountrySelectProps) {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const countries = useMemo(() => buildDialCountries(language), [language]);
  const selected = useMemo(() => countries.find((c) => c.code === value), [countries, value]);
  const visible = useMemo(() => filterDialCountries(countries, search), [countries, search]);

  const pick = (c: DialCountry) => {
    onChange(c.code);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(
            "h-10 font-normal",
            compact
              ? "w-[4.75rem] min-w-[4.75rem] max-w-[4.75rem] justify-between gap-0 px-1.5"
              : "min-w-[10.5rem] justify-between gap-1",
            className,
          )}
        >
          <span className={cn("truncate text-sm tabular-nums", compact && "text-xs")}>
            {compact && selected ? `+${selected.dial}` : selected?.label ?? value}
          </span>
          <ChevronDown className={cn("shrink-0 opacity-60", compact ? "h-3 w-3" : "h-4 w-4")} aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(320px,calc(100vw-2rem))] p-0" align="start">
        <Command shouldFilter={false} className="rounded-lg border-none">
          <div className="border-b px-3 py-2">
            <DialCountrySearchField
              placeholder={t("account.whatsapp.country_search")}
              value={search}
              onValueChange={setSearch}
              t={t}
            />
          </div>
          <CommandList className="max-h-64">
            <CommandEmpty>{t("account.whatsapp.country_empty")}</CommandEmpty>
            <CommandGroup>
              {visible.map((c) => (
                <CommandItem key={c.code} value={c.code} onSelect={() => pick(c)} className="gap-2">
                  <Check className={cn("h-4 w-4", value === c.code ? "opacity-100" : "opacity-0")} aria-hidden />
                  <span className="flex-1 truncate">{c.label}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{c.code}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function DialCountrySearchField({
  placeholder,
  value,
  onValueChange,
  t,
}: {
  placeholder: string;
  value: string;
  onValueChange: (v: string) => void;
  t: (key: string) => string;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        aria-label={t("auth.signup.whatsapp_country")}
        className="h-10 w-full rounded-md border border-input bg-background ps-9 pe-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        autoComplete="off"
      />
    </div>
  );
}