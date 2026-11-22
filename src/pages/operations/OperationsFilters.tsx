import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/use-language";

const PRIORITIES = ["normal", "medium", "urgent", "critical"] as const;

/** Text boxes type freely and update the URL after a short pause, so each keystroke is not a request. */
function useDebouncedField(value: string, commit: (next: string) => void) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  useEffect(() => {
    if (local === value) return;
    const timer = window.setTimeout(() => commit(local), 300);
    return () => window.clearTimeout(timer);
  }, [local, value, commit]);
  return [local, setLocal] as const;
}

export function OperationsFilters({
  staff,
  priority,
  q,
  dateFrom,
  dateTo,
  onChange,
}: {
  staff: string;
  priority: string;
  q: string;
  dateFrom: string;
  dateTo: string;
  onChange: (patch: Record<string, string>) => void;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(Boolean(staff || priority || q || dateFrom || dateTo));
  const [qLocal, setQLocal] = useDebouncedField(q, (next) => onChange({ q: next }));
  const [staffLocal, setStaffLocal] = useDebouncedField(staff, (next) => onChange({ staff: next }));
  return (
    <div className="space-y-3">
      <Button type="button" variant="outline" size="sm" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {t("cursorUi.ops.filters")}
      </Button>
      {open ? (
        <div className="grid gap-3 rounded-xl border border-border/80 bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
          <Input placeholder={t("cursorUi.ops.search")} value={qLocal} onChange={(event) => setQLocal(event.target.value)} />
          <Input placeholder={t("cursorUi.ops.staff")} value={staffLocal} onChange={(event) => setStaffLocal(event.target.value)} />
          <select
            value={priority}
            onChange={(event) => onChange({ priority: event.target.value })}
            aria-label={t("cursorUi.ops.priority")}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">{t("cursorUi.ops.priority_any")}</option>
            {PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {t(`cursorUi.ops.priority_${value}`)}
              </option>
            ))}
          </select>
          <Input type="date" value={dateFrom} onChange={(event) => onChange({ dateFrom: event.target.value })} aria-label={t("cursorUi.ops.date_from")} />
          <Input type="date" value={dateTo} onChange={(event) => onChange({ dateTo: event.target.value })} aria-label={t("cursorUi.ops.date_to")} />
        </div>
      ) : null}
    </div>
  );
}
