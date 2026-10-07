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

export function groupStaffPickerByDepartment(
  options: StaffPickerOption[],
): [string, StaffPickerOption[]][] {
  const map = new Map<string, StaffPickerOption[]>();
  for (const row of options) {
    const key = (row.department || row.role || "General").trim() || "General";
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}
