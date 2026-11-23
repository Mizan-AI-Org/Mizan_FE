/**
 * Responsibilities on main's model: an "area" is a category slug (incident.safety, request.inventory, task.foh...)
 * stored in general_settings.category_owners as slug -> [user ids]. Several owners are allowed and the first one to
 * claim the work wins (server side). Watching is a separate, opt-in, self-service list (ResponsibilityWatch).
 */
export type WatchLevel = "none" | "critical";

export type MyWatch = { id: string; slug: string; level: WatchLevel; branch_id: string | null };

export type WatchOverviewRow = MyWatch & { user_id: string; user_name: string };

export type OwnersMap = Record<string, string[]>;

export function normalizeOwners(raw: Record<string, string | string[]> | undefined | null): OwnersMap {
  const out: OwnersMap = {};
  for (const [slug, value] of Object.entries(raw || {})) {
    const ids = (Array.isArray(value) ? value : value ? [value] : []).map((v) => String(v).trim()).filter(Boolean);
    const unique = Array.from(new Set(ids));
    if (unique.length) out[slug] = unique;
  }
  return out;
}

/** Replace the owners of one slug; an empty list removes the key. Pure. */
export function withOwners(map: OwnersMap, slug: string, ids: string[]): OwnersMap {
  const unique = Array.from(new Set(ids.map((v) => v.trim()).filter(Boolean)));
  if (!unique.length) {
    const { [slug]: _gone, ...rest } = map;
    return rest;
  }
  return { ...map, [slug]: unique };
}

/** Add or remove one person as owner of one slug, keeping the others in pick order. Pure. */
export function withOwner(map: OwnersMap, slug: string, userId: string, isOwner: boolean): OwnersMap {
  const current = map[slug] || [];
  const next = isOwner ? (current.includes(userId) ? current : [...current, userId]) : current.filter((id) => id !== userId);
  return withOwners(map, slug, next);
}

/** Slugs a person owns. */
export function slugsOwnedBy(map: OwnersMap, userId: string): string[] {
  return Object.entries(map)
    .filter(([, ids]) => ids.includes(userId))
    .map(([slug]) => slug);
}

const PRIVATE_SLUGS = new Set(["request.hr", "request.payroll", "incident.hr"]);
const PRIVATE_WORDS = ["payroll", "salary", "conflict", "personal", "harass", "hr"];

/** Mirrors the backend rule (apps/accounts/watches.py): HR, payroll, conflicts and personal areas can't be followed. */
export function isPrivateSlug(slug: string): boolean {
  const key = (slug || "").trim().toLowerCase();
  if (PRIVATE_SLUGS.has(key)) return true;
  const tail = key.split(".").pop() || "";
  return PRIVATE_WORDS.some((word) => word === tail || (word !== "hr" && tail.includes(word)));
}

export function watchLevelFor(watches: MyWatch[] | undefined, slug: string): WatchLevel {
  const row = (watches || []).find((w) => w.slug === slug && !w.branch_id);
  return row?.level === "critical" ? "critical" : "none";
}
