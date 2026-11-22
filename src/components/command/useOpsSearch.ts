import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export type OpsSearchHit = { id: string; label: string; hint: string; href: string; group: OpsSearchGroup };
export type OpsSearchGroup = "staff" | "tasks" | "requests" | "invoices" | "incidents" | "reminders" | "meetings";

type Raw = Awaited<ReturnType<typeof api.searchDashboardOps>>;

const MIN_CHARS = 2;
const DEBOUNCE_MS = 250;

export function toHits(raw: Raw): OpsSearchHit[] {
  const hit = (group: OpsSearchGroup, id: string | undefined, label: string, hint: string, href?: string | null) => ({
    group, id: `${group}:${id ?? label}`, label, hint, href: href || "/dashboard",
  });
  return [
    ...(raw.staff ?? []).map((s) => hit("staff", s.id, s.name, s.role, `/dashboard/staff?q=${encodeURIComponent(s.name)}`)),
    ...(raw.tasks ?? []).map((x) => hit("tasks", x.id, x.title, x.status, x.href)),
    ...(raw.staff_requests ?? []).map((x) => hit("requests", x.id, x.subject, `${x.category ?? ""} · ${x.status}`, x.href)),
    ...(raw.invoices ?? []).map((x) => hit("invoices", x.id, x.vendor_name, `${x.invoice_number ?? ""} ${x.amount} ${x.currency ?? ""}`.trim(), x.href)),
    ...(raw.incidents ?? []).map((x) => hit("incidents", x.id, x.title, x.status ?? "", x.href)),
    ...(raw.reminders ?? []).map((x) => hit("reminders", x.id, x.title, x.status ?? "", x.href)),
    ...(raw.meetings ?? []).map((x) => hit("meetings", x.id, x.title, x.start ?? "", x.href)),
  ];
}

/** Debounced tenant-wide search (staff, tasks, requests, invoices, incidents, reminders, meetings). */
export function useOpsSearch(query: string): { hits: OpsSearchHit[]; loading: boolean } {
  const [hits, setHits] = useState<OpsSearchHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_CHARS) {
      setHits([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(() => {
      api
        .searchDashboardOps(q)
        .then((raw) => !cancelled && setHits(toHits(raw)))
        .catch(() => !cancelled && setHits([]))
        .finally(() => !cancelled && setLoading(false));
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  return { hits, loading };
}
