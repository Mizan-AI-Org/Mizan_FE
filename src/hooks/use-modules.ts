import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ALL_MODULES } from "@/config/modules";
import type { ModuleKey } from "@/lib/types";

export const TENANT_MODULES_QUERY_KEY = ["tenant-modules"] as const;

/** Modules this tenant turned on. Until the answer arrives (or if it fails) everything counts as on,
 * so a slow request never hides the navigation. */
export function useModules() {
  const query = useQuery({
    queryKey: TENANT_MODULES_QUERY_KEY,
    queryFn: () => api.getTenantModules(),
    staleTime: 5 * 60_000,
    enabled: !!localStorage.getItem("access_token"),
  });
  const enabled: ModuleKey[] = query.data?.enabled ?? ALL_MODULES;
  const isEnabled = useCallback((key?: ModuleKey | null) => !key || enabled.includes(key), [enabled]);
  /** For data fetches: true once we know the modules (fetch module data only when `ready && isEnabled(key)`). */
  const ready = query.isSuccess || query.isError;
  return {
    enabled,
    isEnabled,
    ready,
    /** What the tenant chose (and pays for); differs from `enabled` while paid modules are paused for an overdue bill. */
    selected: query.data?.selected ?? enabled,
    suspended: !!query.data?.suspended,
    canEdit: !!query.data?.canEdit,
    isLoading: query.isLoading,
  };
}
