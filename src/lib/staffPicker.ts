import { API_BASE } from "@/lib/api";

export type StaffPickerRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role?: string;
};

function getAuthToken() {
  return localStorage.getItem("access_token") || localStorage.getItem("accessToken") || "";
}

/** Human-readable label for a staff row in pickers. */
export function staffPickerDisplayName(row: StaffPickerRow): string {
  const name = [row.first_name, row.last_name].filter(Boolean).join(" ").trim();
  return name || row.email || row.id;
}

/** Normalise GET /api/staff/ payloads (array or paginated envelope). */
export function normalizeStaffPickerRows(data: unknown): StaffPickerRow[] {
  const arr: unknown[] = Array.isArray(data)
    ? data
    : data && typeof data === "object" && "results" in (data as object)
      ? ((data as { results?: unknown[] }).results ?? [])
      : [];

  const out: StaffPickerRow[] = [];
  for (const row of arr) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const nested = r.user as Record<string, unknown> | undefined;
    if (nested && typeof nested.id === "string") {
      out.push({
        id: nested.id,
        email: String(nested.email ?? ""),
        first_name: String(nested.first_name ?? ""),
        last_name: String(nested.last_name ?? ""),
        role: String(nested.role ?? ""),
      });
      continue;
    }
    if (typeof r.id === "string") {
      out.push({
        id: r.id,
        email: String(r.email ?? ""),
        first_name: String(r.first_name ?? ""),
        last_name: String(r.last_name ?? ""),
        role: String(r.role ?? ""),
      });
    }
  }
  return out;
}

export type StaffPickerSearchResult = {
  results: StaffPickerRow[];
  count: number;
};

type SearchOpts = {
  search?: string;
  pageSize?: number;
  ids?: string[];
};

/** Server-side staff search for large rosters (1000+). */
export async function searchStaffPicker(opts: SearchOpts = {}): Promise<StaffPickerSearchResult> {
  const params = new URLSearchParams({
    page_size: String(opts.pageSize ?? 40),
    all_branches: "1",
  });
  const q = (opts.search || "").trim();
  if (q) params.set("search", q);
  if (opts.ids?.length) params.set("ids", opts.ids.join(","));

  const token = getAuthToken();
  const res = await fetch(`${API_BASE}/staff/?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Failed to load staff");
  }
  const data = await res.json();
  const results = normalizeStaffPickerRows(data);
  const count =
    data && typeof data === "object" && "count" in (data as object)
      ? Number((data as { count?: number }).count ?? results.length)
      : results.length;
  return { results, count };
}

/** Lightweight roster check — avoids loading the full staff list. */
export async function fetchStaffRosterCount(): Promise<number> {
  const { count } = await searchStaffPicker({ pageSize: 1 });
  return count;
}
