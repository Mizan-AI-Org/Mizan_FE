/** Unresolved incident statuses — same set as Django ACTIVE_INCIDENT_STATUSES. */
export const UNRESOLVED_INCIDENT_STATUSES = [
  "open",
  "acknowledged",
  "in_progress",
  "blocked",
  "waiting",
] as const;

const UNRESOLVED = new Set<string>(UNRESOLVED_INCIDENT_STATUSES);

export function isUnresolvedIncidentStatus(status: string | null | undefined): boolean {
  return UNRESOLVED.has(String(status || "").toLowerCase());
}

export const UNRESOLVED_INCIDENT_STATUS_QUERY = UNRESOLVED_INCIDENT_STATUSES
  .map((s) => s.toUpperCase())
  .join(",");
