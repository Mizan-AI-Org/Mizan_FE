import React from "react";
import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import { localIsoDate, localIsoDateDaysAgo } from "@/lib/opsDateRange";
import { opsBtnGhost, opsInput, opsMuted } from "@/components/platform-admin/opsStyles";

type Props = {
  dateFrom: string;
  dateTo: string;
  onChange: (next: { dateFrom: string; dateTo: string }) => void;
  className?: string;
};

const PRESETS = [
  { id: "7", label: "Last 7 days", days: 7 },
  { id: "30", label: "Last 30 days", days: 30 },
  { id: "90", label: "Last 90 days", days: 90 },
] as const;

/** From / to date inputs with quick range presets for platform admin lists. */
export default function OpsDateRangeFilter({ dateFrom, dateTo, onChange, className }: Props) {
  const today = localIsoDate();

  return (
    <div className={cn("flex flex-wrap items-end gap-2", className)}>
      <div className="flex items-center gap-2">
        <CalendarRange className="hidden h-4 w-4 text-slate-400 sm:block" aria-hidden />
        <label className="sr-only" htmlFor="ops-date-from">
          From date
        </label>
        <input
          id="ops-date-from"
          type="date"
          value={dateFrom}
          max={dateTo || today}
          onChange={(event) => onChange({ dateFrom: event.target.value, dateTo })}
          className={`${opsInput} w-[10.5rem]`}
          aria-label="From date"
        />
        <span className={opsMuted}>to</span>
        <label className="sr-only" htmlFor="ops-date-to">
          To date
        </label>
        <input
          id="ops-date-to"
          type="date"
          value={dateTo}
          min={dateFrom || undefined}
          max={today}
          onChange={(event) => onChange({ dateFrom, dateTo: event.target.value })}
          className={`${opsInput} w-[10.5rem]`}
          aria-label="To date"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={opsBtnGhost}
            onClick={() =>
              onChange({
                dateFrom: localIsoDateDaysAgo(preset.days - 1),
                dateTo: today,
              })
            }
          >
            {preset.label}
          </button>
        ))}
        {(dateFrom || dateTo) && (
          <button
            type="button"
            className={opsBtnGhost}
            onClick={() => onChange({ dateFrom: "", dateTo: "" })}
          >
            Clear dates
          </button>
        )}
      </div>
    </div>
  );
}
