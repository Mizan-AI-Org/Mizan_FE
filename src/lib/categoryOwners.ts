/** Categories for incident / request / task ownership routing. Keys match backend slugs. */
export type CategoryOwnerGroup = {
  groupKey: string;
  items: { key: string; labelKey: string }[];
};

export const CATEGORY_OWNER_GROUPS: CategoryOwnerGroup[] = [
  {
    groupKey: "onboarding.owners.groups.incidents",
    items: [
      { key: "incident.safety", labelKey: "onboarding.owners.cats.incident_safety" },
      { key: "incident.equipment", labelKey: "onboarding.owners.cats.incident_equipment" },
      { key: "incident.hr", labelKey: "onboarding.owners.cats.incident_hr" },
      { key: "incident.quality", labelKey: "onboarding.owners.cats.incident_quality" },
      { key: "incident.customer", labelKey: "onboarding.owners.cats.incident_customer" },
      { key: "incident.security", labelKey: "onboarding.owners.cats.incident_security" },
      { key: "incident.other", labelKey: "onboarding.owners.cats.incident_other" },
    ],
  },
  {
    groupKey: "onboarding.owners.groups.requests",
    items: [
      { key: "request.payroll", labelKey: "onboarding.owners.cats.request_payroll" },
      { key: "request.scheduling", labelKey: "onboarding.owners.cats.request_scheduling" },
      { key: "request.hr", labelKey: "onboarding.owners.cats.request_hr" },
      { key: "request.document", labelKey: "onboarding.owners.cats.request_document" },
      { key: "request.maintenance", labelKey: "onboarding.owners.cats.request_maintenance" },
      { key: "request.reservations", labelKey: "onboarding.owners.cats.request_reservations" },
      { key: "request.inventory", labelKey: "onboarding.owners.cats.request_inventory" },
    ],
  },
  {
    groupKey: "onboarding.owners.groups.departments",
    items: [
      { key: "task.foh", labelKey: "onboarding.owners.cats.task_foh" },
      { key: "task.boh", labelKey: "onboarding.owners.cats.task_boh" },
      { key: "task.bar", labelKey: "onboarding.owners.cats.task_bar" },
      { key: "task.finance", labelKey: "onboarding.owners.cats.task_finance" },
    ],
  },
];

/** Legacy General Settings incident dropdown labels → category_owners slug. */
export const LEGACY_INCIDENT_LABEL_TO_SLUG: Record<string, string> = {
  Safety: "incident.safety",
  Maintenance: "incident.equipment",
  HR: "incident.hr",
  "Food Safety": "incident.quality",
  "Customer Issue": "incident.customer",
  General: "incident.other",
};

export function mergeLegacyIncidentAssignees(
  owners: Record<string, string[]>,
  legacy: Record<string, string>,
): Record<string, string[]> {
  const next = { ...owners };
  for (const [label, uid] of Object.entries(legacy)) {
    const slug = LEGACY_INCIDENT_LABEL_TO_SLUG[label];
    if (!slug || !uid) continue;
    const existing = next[slug] || [];
    if (!existing.includes(uid)) {
      next[slug] = [...existing, uid];
    }
  }
  return next;
}
