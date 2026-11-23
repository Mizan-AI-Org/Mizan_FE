import type { StaffPickerOption } from "@/lib/staffPicker";

/** Accent-insensitive, case-insensitive match for roster search in pickers. */
export function normalizeStaffSearchText(value: string): string {
  return (value || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

export function staffOptionMatchesQuery(option: StaffPickerOption, query: string): boolean {
  const q = normalizeStaffSearchText(query);
  if (!q) return true;
  const hay = normalizeStaffSearchText(
    [option.name, option.role, option.department, option.id].filter(Boolean).join(" "),
  );
  return hay.includes(q) || q.split(/\s+/).every((token) => token.length >= 2 && hay.includes(token));
}

export function filterStaffPickerOptions(
  options: StaffPickerOption[],
  query: string,
): StaffPickerOption[] {
  const q = (query || "").trim();
  if (!q) return options;
  return options.filter((row) => staffOptionMatchesQuery(row, q));
}

export const STAFF_PICKER_UNASSIGNED_LABEL = "—";
const UNASSIGNED_BUCKET = "__unassigned__";

export function groupStaffPickerByDepartment(
  options: StaffPickerOption[],
): [string, StaffPickerOption[]][] {
  const map = new Map<string, StaffPickerOption[]>();
  for (const row of options) {
    const dept = (row.department || "").trim();
    const key = dept || UNASSIGNED_BUCKET;
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }
  const entries = Array.from(map.entries()).sort(([a], [b]) => {
    if (a === UNASSIGNED_BUCKET) return 1;
    if (b === UNASSIGNED_BUCKET) return -1;
    return a.localeCompare(b);
  });
  return entries.map(([key, rows]) => [
    key === UNASSIGNED_BUCKET ? STAFF_PICKER_UNASSIGNED_LABEL : key,
    rows.sort((a, b) => a.name.localeCompare(b.name)),
  ]);
}
