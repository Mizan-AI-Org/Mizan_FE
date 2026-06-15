import { useQuery } from "@tanstack/react-query";
import { API_BASE } from "@/lib/api";

export type StaffInboxLane = {
  lane_id: string;
  widget_id: string;
  label: string;
  page_title: string;
  page_subtitle: string;
  categories: string[];
  icon: string;
};

function getAuthToken() {
  return localStorage.getItem("access_token") || localStorage.getItem("accessToken") || "";
}

async function fetchStaffInboxLanes(): Promise<StaffInboxLane[]> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}/staff/requests/inbox-lanes/`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to load inbox lanes");
  const data = await res.json();
  return Array.isArray(data?.lanes) ? data.lanes : [];
}

/** Tabs on All Requests — one per dashboard command-centre widget on the user's layout. */
export function useStaffInboxLanes() {
  return useQuery({
    queryKey: ["staff-inbox-lanes"],
    queryFn: fetchStaffInboxLanes,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function resolveStaffInboxLaneId(
  lanes: StaffInboxLane[],
  params: { lane?: string | null; category?: string | null },
): string | null {
  const laneParam = (params.lane || "").trim();
  if (laneParam) {
    return lanes.some((l) => l.lane_id === laneParam) ? laneParam : null;
  }
  const raw = (params.category || "").trim();
  if (!raw) return null;
  const parts = raw
    .split(",")
    .map((p) => p.trim().toUpperCase())
    .filter(Boolean);
  if (parts.length === 0) return null;
  const sorted = [...parts].sort().join(",");
  for (const lane of lanes) {
    const laneSorted = [...lane.categories].map((c) => c.toUpperCase()).sort().join(",");
    if (laneSorted === sorted) return lane.lane_id;
  }
  if (parts.length === 1) {
    const hit = lanes.find((l) => l.categories.map((c) => c.toUpperCase()).includes(parts[0]));
    return hit?.lane_id ?? null;
  }
  return null;
}
