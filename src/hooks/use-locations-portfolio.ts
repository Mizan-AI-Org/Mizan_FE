import { useQuery } from "@tanstack/react-query";
import { API_BASE } from "@/lib/api";

export type LocationMetrics = {
  staff_count: number;
  clocked_in_now: number;
  scheduled_today: number;
  coverage_pct: number | null;
  no_shows_today: number;
  potential_no_shows: number;
  location_mismatches_today: number;
  shift_gaps_today: number;
  open_cash_sessions: number;
  flagged_cash_sessions: number;
  cash_variance_today: number;
  pending_swap_requests: number;
  checklist_completion_pct: number | null;
  checklists_completed: number;
  checklists_total: number;
  labor_cost_today: number;
};

export type LocationStatus = "green" | "amber" | "red";

export type LocationPortfolioRow = {
  id: string;
  name: string;
  is_primary: boolean;
  is_active: boolean;
  status: LocationStatus;
  top_concern: string | null;
  metrics: LocationMetrics;
};

export type PortfolioSummary = {
  generated_at: string;
  today: string;
  tenant: { id: string | number; name: string };
  totals: LocationMetrics;
  locations: LocationPortfolioRow[];
  /** Set when the backend couldn't compute live metrics but still returned the
   * branch list. The UI should show the locations with a soft warning banner
   * instead of treating the whole response as a failure. */
  degraded?: boolean;
  error?: string;
};

function getAuthToken() {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("accessToken") ||
    ""
  );
}

/**
 * Fetches the multi-location portfolio summary — per-branch rollups plus
 * tenant-wide totals — for the Locations Overview page. The backend caches
 * for 60s; we refetch every 60s so an owner watching the page sees fresh
 * numbers without hammering the DB.
 */
export function useLocationsPortfolio() {
  return useQuery({
    queryKey: ["dashboard", "portfolio"],
    queryFn: async (): Promise<PortfolioSummary> => {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/dashboard/portfolio/`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: "include",
      });
      if (!res.ok) {
        // Preserve the backend's human-readable reason (permissions, missing
        // workspace, server error…) so the UI can show something actionable
        // instead of a generic "Couldn't load portfolio data".
        let detail = "";
        try {
          const body = await res.json();
          detail =
            body?.error || body?.detail || body?.message || JSON.stringify(body);
        } catch {
          try {
            detail = await res.text();
          } catch {
            detail = "";
          }
        }
        throw new Error(
          detail || `Failed to load portfolio summary (HTTP ${res.status})`
        );
      }
      return (await res.json()) as PortfolioSummary;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}
