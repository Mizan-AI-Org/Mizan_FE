import { useQuery } from "@tanstack/react-query";
import { API_BASE } from "@/lib/api";
import type {
  LocationPortfolioRow,
  PortfolioSummary,
} from "@/hooks/use-locations-portfolio";

export type ShiftToday = {
  id: string;
  staff_name: string;
  role: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
};

export type ClockEventToday = {
  id: string;
  staff_name: string;
  event_type: string;
  timestamp: string;
  location_mismatch: boolean;
};

export type CashSessionToday = {
  id: string;
  staff_name: string;
  status: string;
  variance: number | null;
  opening_float: number | null;
  counted_cash: number | null;
  expected_cash: number | null;
};

export type BranchStaffMember = {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  role_display: string;
  phone: string;
  email: string;
  is_home: boolean;
  clocked_in: boolean;
  hourly_rate: number | null;
  primary_location?: string | null;
  primary_location_data?: { id: string; name: string } | null;
};

export type PerformanceDay = {
  date: string;
  scheduled: number;
  completed: number;
  no_shows: number;
  mismatches: number;
  hours_worked: number;
  labor_cost: number;
};

export type PerformanceWindow = {
  scheduled_shifts: number;
  completed_shifts: number;
  no_shows: number;
  attendance_pct: number | null;
  mismatches: number;
  hours_worked: number;
  labor_cost: number;
};

export type BranchPerformance = {
  window_days: number;
  summary: PerformanceWindow;
  last_7_days: PerformanceWindow;
  daily: PerformanceDay[];
};

export type LocationDetailRow = LocationPortfolioRow & {
  address?: string;
  timezone?: string;
  geofence_enabled?: boolean;
  radius_m?: number | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type LocationDetail = Pick<
  PortfolioSummary,
  "generated_at" | "today" | "tenant"
> & {
  location: LocationDetailRow;
  shifts_today: ShiftToday[];
  clock_events_today: ClockEventToday[];
  cash_sessions_today: CashSessionToday[];
  staff: BranchStaffMember[];
  staff_summary: {
    total: number;
    home: number;
    clocked_in_now: number;
  };
  performance: BranchPerformance;
};

function getAuthToken() {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("accessToken") ||
    ""
  );
}

/**
 * Fetches the per-branch deep-dive used by the Locations Overview drill-in.
 * Reuses the same compute as the portfolio endpoint so the per-branch
 * metrics match exactly what the overview page shows.
 */
export function useLocationDetail(locationId: string | undefined) {
  return useQuery({
    queryKey: ["dashboard", "portfolio", "location", locationId],
    enabled: !!locationId,
    queryFn: async (): Promise<LocationDetail> => {
      const token = getAuthToken();
      const res = await fetch(
        `${API_BASE}/dashboard/portfolio/locations/${locationId}/`,
        {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          credentials: "include",
        },
      );
      if (!res.ok) {
        throw new Error(`Failed to load branch detail (HTTP ${res.status})`);
      }
      return (await res.json()) as LocationDetail;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}
