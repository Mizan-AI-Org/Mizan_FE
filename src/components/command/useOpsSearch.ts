import { useEffect, useRef, useState } from "react";
import { api, TENANT_SEARCH_GROUPS, type TenantSearchGroup, type TenantSearchHit } from "@/lib/api";

/** One row of the command search. Group order and names are main's tenant search groups. */
export type OpsSearchHit = TenantSearchHit & { group: TenantSearchGroup; key: string };
export type OpsSearchGroup = TenantSearchGroup;

export const OPS_SEARCH_MIN_CHARS = 2;
const DEBOUNCE_MS = 250;

/** Pure: flatten the tenant search payload into ordered rows (staff, tasks, requests, ... as the API groups them). */
export function toHits(raw: Partial<Record<TenantSearchGroup, TenantSearchHit[]>> | null | undefined): OpsSearchHit[] {
  if (!raw) return [];
  return TENANT_SEARCH_GROUPS.flatMap((group) =>
    (raw[group] ?? []).map((hit) => ({ ...hit, group, key: `${group}:${hit.id}` })),
  );
}

/** Debounced tenant-wide search through `api.searchTenant` (BE `search_tenant`, branch- and role-scoped). */
export function useOpsSearch(query: string): { hits: OpsSearchHit[]; loading: boolean; active: boolean } {
  const [hits, setHits] = useState<OpsSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const latest = useRef("");
  const q = query.trim();
  const active = q.length >= OPS_SEARCH_MIN_CHARS;

  useEffect(() => {
    latest.current = q;
    if (!active) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = window.setTimeout(() => {
      api
        .searchTenant(q)
        .then((data) => {
          if (latest.current === q) setHits(toHits(data));
        })
        .catch(() => {
          if (latest.current === q) setHits([]);
        })
        .finally(() => {
          if (latest.current === q) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [q, active]);

  return { hits, loading, active };
}
