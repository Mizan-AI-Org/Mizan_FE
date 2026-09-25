/** Incident assignee / reporter ids as they arrive from Django (string, object, or UUID variants). */

export function personId(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "null" || trimmed === "undefined" || trimmed.toLowerCase() === "unassigned") {
      return "";
    }
    return trimmed;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (value && typeof value === "object") {
    const rec = value as Record<string, unknown>;
    return personId(rec.id ?? rec.user_id ?? rec.pk);
  }
  return "";
}

export function sameUserId(left: string, right: string): boolean {
  const norm = (value: string) => value.trim().toLowerCase().replace(/-/g, "");
  return !!left && !!right && norm(left) === norm(right);
}

export function incidentAssigneeId(detail: unknown): string {
  if (!detail || typeof detail !== "object") return "";
  const rec = detail as Record<string, unknown>;
  return (
    personId(rec.assigned_to) ||
    personId(rec.assignedTo) ||
    personId(rec.assigned_to_details) ||
    personId(rec.assignedToDetails) ||
    ""
  );
}

export type AssigneeOption = {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  role?: string;
};

export function matchingStaffOptionId(staffRows: Array<{ id?: string }>, assigneeId: string): string {
  if (!assigneeId) return "";
  const match = staffRows.find((row) => sameUserId(String(row.id || ""), assigneeId));
  return match?.id ? String(match.id) : assigneeId;
}

export function staffOptionsWithCurrentAssignee(
  staffRows: AssigneeOption[],
  detail: unknown,
  selectedId = "",
): AssigneeOption[] {
  const rows = Array.isArray(staffRows) ? [...staffRows] : [];
  const currentId = selectedId || incidentAssigneeId(detail);
  if (!currentId) return rows;
  if (rows.some((row) => sameUserId(String(row.id), currentId))) return rows;
  const rec = detail && typeof detail === "object" ? (detail as Record<string, unknown>) : {};
  const details = (rec.assigned_to_details || rec.assignedToDetails || {}) as Record<string, unknown>;
  const firstName = String(details.first_name ?? "");
  const lastName = String(details.last_name ?? "");
  rows.unshift({
    id: currentId,
    first_name: firstName,
    last_name: lastName,
    name: [firstName, lastName].filter(Boolean).join(" ").trim() || "Current assignee",
    role: "Current",
  });
  return rows;
}
