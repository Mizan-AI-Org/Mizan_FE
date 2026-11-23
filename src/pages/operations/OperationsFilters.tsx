import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [open, setOpen] = useState(Boolean(staff || priority || q || dateFrom || dateTo));
  return (
    <div className="space-y-3">
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen((value) => !value)}>
        Filters
      </Button>
      {open ? (
        <div className="grid gap-3 rounded-xl border border-border/80 bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
          <Input placeholder="Search" value={q} onChange={(event) => onChange({ q: event.target.value })} />
          <Input placeholder="Staff" value={staff} onChange={(event) => onChange({ staff: event.target.value })} />
          <Input placeholder="Priority" value={priority} onChange={(event) => onChange({ priority: event.target.value })} />
          <Input type="date" value={dateFrom} onChange={(event) => onChange({ dateFrom: event.target.value })} aria-label="From" />
          <Input type="date" value={dateTo} onChange={(event) => onChange({ dateTo: event.target.value })} aria-label="To" />
        </div>
      ) : null}
    </div>
  );
}
