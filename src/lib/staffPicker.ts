import { API_BASE } from "@/lib/api";
import { unwrapEnvelope } from "@/lib/envelope";

export type StaffPickerRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role?: string;
};

/** Normalised row for assignee pickers (process templates, checklists, …). */
export type StaffPickerOption = {
  id: string;
  name: string;
  role?: string;
  department?: string;
};

function getAuthToken() {
  return localStorage.getItem("access_token") || localStorage.getItem("accessToken") || "";
}

async function fetchStaffList(params: URLSearchParams): Promise<unknown | null> {
  const token = getAuthToken();
  try {
    const res = await fetch(`${API_BASE}/staff/?${params.toString()}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Human-readable label for a staff row in pickers. */
export function staffPickerDisplayName(row: StaffPickerRow): string {
  const name = [row.first_name, row.last_name].filter(Boolean).join(" ").trim();
  return name || row.email || row.id;
}

function staffListPayload(data: unknown): unknown {
  if (data && typeof data === "object" && "success" in data && "data" in data) {
    return unwrapEnvelope<unknown>(data);
  }
  return data;
}

/** Normalise GET /api/staff/ payloads (api_envelope, array, or paginated results). */
export function normalizeStaffPickerRows(data: unknown): StaffPickerRow[] {
  const body = staffListPayload(data);
  const arr: unknown[] = Array.isArray(body)
    ? body
    : body && typeof body === "object" && "results" in (body as object)
      ? ((body as { results?: unknown[] }).results ?? [])
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

function departmentFromStaffRow(r: Record<string, unknown>): string | undefined {
  const profile = r.profile as Record<string, unknown> | undefined;
  const dept = String(profile?.department ?? r.department ?? "").trim();
  return dept || undefined;
}

/** Full roster for pickers - includes all branches and top-level CustomUser ids. */
export async function loadStaffPickerOptions(
  opts: { pageSize?: number } = {},
): Promise<StaffPickerOption[]> {
  const params = new URLSearchParams({
    page_size: String(opts.pageSize ?? 500),
    all_branches: "1",
  });
  const data = await fetchStaffList(params);
  if (data == null) return [];
  const payload = staffListPayload(data);
  const rows = normalizeStaffPickerRows(data);
  const arr: unknown[] = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && "results" in (payload as object)
      ? ((payload as { results?: unknown[] }).results ?? [])
      : [];

  const deptById = new Map<string, string | undefined>();
  for (const row of arr) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id : undefined;
    if (id) {
      deptById.set(id, departmentFromStaffRow(r));
    }
  }

  return rows.map((s) => ({
    id: s.id,
    name: staffPickerDisplayName(s),
    role: s.role || undefined,
    department: deptById.get(s.id),
  }));
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

  const data = await fetchStaffList(params);
  if (data == null) return { results: [], count: 0 };
  const payload = staffListPayload(data);
  const results = normalizeStaffPickerRows(data);
  const metaCount =
    data && typeof data === "object" && "metadata" in (data as object)
      ? Number((data as { metadata?: { count?: number } }).metadata?.count)
      : NaN;
  const count =
    Number.isFinite(metaCount) && metaCount >= 0
      ? metaCount
      : payload && typeof payload === "object" && "count" in (payload as object)
        ? Number((payload as { count?: number }).count ?? results.length)
        : results.length;
  return { results, count };
}

/** Lightweight roster check - avoids loading the full staff list. */
export async function fetchStaffRosterCount(): Promise<number> {
  const { count } = await searchStaffPicker({ pageSize: 1 });
  return count;
}
