import { useQuery } from "@tanstack/react-query";
import { API_BASE } from "@/lib/api";

export type BusinessLocationBrief = {
  id: string;
  name: string;
  address?: string;
  is_primary: boolean;
  is_active: boolean;
};

function getAuthToken() {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("accessToken") ||
    ""
  );
}

/**
 * Minimal list of business locations for the current tenant, suitable for
 * populating branch pickers across the app. Only active locations are
 * returned; callers that need inactive branches (e.g. the location manager
 * settings page) should fetch `/locations/` directly.
 */
export function useBusinessLocations() {
  return useQuery({
    queryKey: ["business-locations", "active"],
    queryFn: async (): Promise<BusinessLocationBrief[]> => {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/locations/`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load locations");
      const data = await res.json();
      const rows: unknown[] = Array.isArray(data) ? data : data?.results || [];
      const out: BusinessLocationBrief[] = [];
      for (const item of rows) {
        if (!item || typeof item !== "object") continue;
        const row = item as {
          id?: string;
          name?: string;
          address?: string;
          is_primary?: boolean;
          is_active?: boolean;
        };
        if (!row.id || !row.name) continue;
        if (row.is_active === false) continue;
        out.push({
          id: String(row.id),
          name: String(row.name),
          address: row.address ? String(row.address) : "",
          is_primary: Boolean(row.is_primary),
          is_active: row.is_active !== false,
        });
      }
      // Primary first, then alphabetical.
      out.sort((a, b) => {
        if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      return out;
    },
    staleTime: 5 * 60 * 1000,
  });
}
