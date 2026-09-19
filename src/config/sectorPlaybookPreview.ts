/**
 * Client-side mirror of Django `core.workflow_playbooks` packs.
 * Used on signup (unauthenticated) and as a live preview while the
 * owner switches sectors in the onboarding wizard before save.
 */
import type { BusinessVertical } from "./staffInviteRolesByVertical";

export type PlaybookPreview = {
  seed_id: string;
  name: string;
};

const CHECKLIST: PlaybookPreview = {
  seed_id: "checklist_failure",
  name: "Checklist Failure",
};
const INSURANCE: PlaybookPreview = {
  seed_id: "expiring_insurance",
  name: "Expiring Insurance",
};
const HYGIENE: PlaybookPreview = {
  seed_id: "expiring_hygiene",
  name: "Expiring Hygiene Certificate",
};
const HEALTH: PlaybookPreview = {
  seed_id: "expiring_health_permit",
  name: "Expiring Health Permit",
};
const LIQUOR: PlaybookPreview = {
  seed_id: "expiring_liquor_license",
  name: "Expiring Liquor License",
};
const FIRE: PlaybookPreview = {
  seed_id: "expiring_fire_extinguisher",
  name: "Expiring Fire Extinguisher Inspection",
};
const REGISTRATION: PlaybookPreview = {
  seed_id: "expiring_business_registration",
  name: "Expiring Business Registration",
};
const EQUIPMENT: PlaybookPreview = {
  seed_id: "expiring_equipment_inspection",
  name: "Expiring Equipment Inspection",
};

const SHARED = [CHECKLIST, INSURANCE];

export const SECTOR_PACK_PREVIEW: Record<BusinessVertical, PlaybookPreview[]> = {
  RESTAURANT: [...SHARED, HYGIENE, HEALTH, LIQUOR],
  HOSPITALITY: [...SHARED, HYGIENE, HEALTH, FIRE],
  RETAIL: [...SHARED, FIRE, REGISTRATION],
  MANUFACTURING: [...SHARED, EQUIPMENT, HYGIENE, FIRE],
  CONSTRUCTION: [...SHARED, EQUIPMENT, REGISTRATION],
  HEALTHCARE: [...SHARED, HEALTH, EQUIPMENT],
  SERVICES: [...SHARED, REGISTRATION],
  OTHER: [...SHARED, REGISTRATION],
};

export const SECTOR_WIDGET_HINTS: Record<BusinessVertical, string[]> = {
  RESTAURANT: ["take_orders", "reservations", "incidents", "staff_messages"],
  HOSPITALITY: ["reservations", "incidents", "staff_messages", "maintenance"],
  RETAIL: ["retail_store_ops", "inventory_delivery", "incidents", "staff_messages"],
  MANUFACTURING: ["ops_reports", "inventory_delivery", "incidents", "staff_messages"],
  CONSTRUCTION: ["jobsite_crew", "compliance_risk", "incidents", "staff_messages"],
  HEALTHCARE: ["human_resources", "compliance_risk", "incidents", "staff_messages"],
  SERVICES: ["human_resources", "incidents", "staff_messages"],
  OTHER: ["incidents", "staff_messages"],
};

export function playbooksForVertical(
  vertical: BusinessVertical | string | undefined | null,
): PlaybookPreview[] {
  const key = String(vertical || "RESTAURANT").toUpperCase() as BusinessVertical;
  return SECTOR_PACK_PREVIEW[key] ?? SECTOR_PACK_PREVIEW.OTHER;
}
