/**
 * Canonical staff-tag vocabulary (mirrors ``accounts.staff_tags`` on
 * the backend). Each tag describes the operational *context* a person
 * works in — KITCHEN / SERVICE / FRONT_OFFICE / … — and complements
 * ``CustomUser.role`` (the formal job title).
 *
 * Why duplicate the list on the frontend?
 * - We want zero-network rendering of tag chips on first paint.
 * - The list is tiny, slow-moving, and the source of truth for both
 *   the backend serializer validator AND the FE pickers — keeping
 *   them in sync via a single static const is far simpler than
 *   threading a dynamic catalog API everywhere.
 *
 * If the backend ever exposes per-tenant custom tags, the runtime
 * call to ``/api/staff/tags/`` (already implemented) is the place to
 * merge that extra vocabulary in.
 */

export const STAFF_TAGS = [
    "KITCHEN",
    "SERVICE",
    "FRONT_OFFICE",
    "BACK_OFFICE",
    "PURCHASES",
    "CONTROL",
    "ADMINISTRATION",
    "MANAGEMENT",
    "HOUSEKEEPING",
    "MARKETING",
] as const;

export type StaffTag = (typeof STAFF_TAGS)[number];

export const STAFF_TAG_SET: ReadonlySet<string> = new Set(STAFF_TAGS);

/**
 * Backend ``StaffRequest.category`` → ordered list of candidate
 * staff tags. Used by smart filters in the escalate modal: when a
 * manager is escalating a PURCHASE_ORDER, we can pre-filter the
 * picker to people tagged PURCHASES so the buyer is one click away.
 */
export const CATEGORY_TO_TAGS: Record<string, readonly StaffTag[]> = {
    DOCUMENT: ["ADMINISTRATION", "MANAGEMENT"],
    HR: ["ADMINISTRATION", "MANAGEMENT"],
    PAYROLL: ["ADMINISTRATION", "CONTROL", "MANAGEMENT"],
    SCHEDULING: ["MANAGEMENT", "ADMINISTRATION"],
    FINANCE: ["CONTROL", "ADMINISTRATION", "MANAGEMENT"],
    PURCHASE_ORDER: ["PURCHASES", "CONTROL", "MANAGEMENT"],
    INVENTORY: ["PURCHASES", "KITCHEN", "BACK_OFFICE"],
    MAINTENANCE: ["BACK_OFFICE", "MANAGEMENT"],
    RESERVATIONS: ["FRONT_OFFICE", "SERVICE", "MANAGEMENT"],
    OPERATIONS: ["SERVICE", "MANAGEMENT", "BACK_OFFICE"],
    MEETING: ["MANAGEMENT", "ADMINISTRATION"],
};

/**
 * Folds free-text into the canonical UPPER_SNAKE form so we can
 * accept slightly sloppier input (a copy-pasted ``"Front Office"`` or
 * ``"back-office"``) and still hit the same key. Returns ``null`` for
 * empties.
 */
export function normalizeStaffTag(value: unknown): string | null {
    if (value == null) return null;
    const text = String(value).trim();
    if (!text) return null;
    return text.toUpperCase().replace(/[\s-]+/g, "_").replace(/_{2,}/g, "_");
}

export function isCanonicalStaffTag(value: unknown): value is StaffTag {
    const tag = normalizeStaffTag(value);
    return tag !== null && STAFF_TAG_SET.has(tag);
}

export function normalizeStaffTags(values: unknown): StaffTag[] {
    if (!Array.isArray(values)) return [];
    const seen = new Set<string>();
    const out: StaffTag[] = [];
    for (const raw of values) {
        const tag = normalizeStaffTag(raw);
        if (!tag || seen.has(tag) || !STAFF_TAG_SET.has(tag)) continue;
        seen.add(tag);
        out.push(tag as StaffTag);
    }
    return out;
}

/**
 * Tone classes for the tag chip — keeps the colours in one place so
 * lists, the picker, and the staff-profile screen all render
 * consistently. Mid-saturation pastels so a row with 3 tags doesn't
 * compete with the staff member's name. Dark-mode tones are tuned
 * down a notch so chips don't glow on pure black.
 */
export const STAFF_TAG_TONE: Record<StaffTag, string> = {
    KITCHEN:
        "bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300",
    SERVICE:
        "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300",
    FRONT_OFFICE:
        "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
    BACK_OFFICE:
        "bg-zinc-200 text-zinc-800 dark:bg-zinc-800/70 dark:text-zinc-200",
    PURCHASES:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
    CONTROL:
        "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
    ADMINISTRATION:
        "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300",
    MANAGEMENT:
        "bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300",
    HOUSEKEEPING:
        "bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300",
    MARKETING:
        "bg-pink-100 text-pink-800 dark:bg-pink-950/50 dark:text-pink-300",
};

/**
 * Translation key for a tag's display label. Translations live in
 * ``public/locales/{en,fr,ar}.json`` under the ``staff.tags.*``
 * namespace so RTL Arabic gets a proper localised label.
 */
export function staffTagI18nKey(tag: StaffTag | string): string {
    return `staff.tags.${tag}`;
}
