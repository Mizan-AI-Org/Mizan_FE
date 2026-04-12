/**
 * Staff invite roles grouped by business vertical.
 * Role `value` must match backend `STAFF_ROLES_CHOICES` / `CustomUser.role`.
 */
export type BusinessVertical =
  | "RESTAURANT"
  | "RETAIL"
  | "MANUFACTURING"
  | "CONSTRUCTION"
  | "HEALTHCARE"
  | "HOSPITALITY"
  | "SERVICES"
  | "OTHER";

export const DEFAULT_BUSINESS_VERTICAL: BusinessVertical = "RESTAURANT";

/** All sectors (order = signup / settings display order). */
export const ALL_BUSINESS_VERTICALS: BusinessVertical[] = [
  "RESTAURANT",
  "RETAIL",
  "MANUFACTURING",
  "CONSTRUCTION",
  "HEALTHCARE",
  "HOSPITALITY",
  "SERVICES",
  "OTHER",
];

/** Signup & marketing: emoji + i18n keys */
export const SIGNUP_SECTOR_OPTIONS: {
  value: BusinessVertical;
  emoji: string;
  nameKey: string;
  taglineKey: string;
}[] = [
  {
    value: "RESTAURANT",
    emoji: "🍽️",
    nameKey: "auth.signup.sector.restaurant",
    taglineKey: "auth.signup.sector.restaurant_tagline",
  },
  {
    value: "RETAIL",
    emoji: "🛍️",
    nameKey: "auth.signup.sector.retail",
    taglineKey: "auth.signup.sector.retail_tagline",
  },
  {
    value: "MANUFACTURING",
    emoji: "⚙️",
    nameKey: "auth.signup.sector.manufacturing",
    taglineKey: "auth.signup.sector.manufacturing_tagline",
  },
  {
    value: "CONSTRUCTION",
    emoji: "🏗️",
    nameKey: "auth.signup.sector.construction",
    taglineKey: "auth.signup.sector.construction_tagline",
  },
  {
    value: "HEALTHCARE",
    emoji: "🩺",
    nameKey: "auth.signup.sector.healthcare",
    taglineKey: "auth.signup.sector.healthcare_tagline",
  },
  {
    value: "HOSPITALITY",
    emoji: "🏨",
    nameKey: "auth.signup.sector.hospitality",
    taglineKey: "auth.signup.sector.hospitality_tagline",
  },
  {
    value: "SERVICES",
    emoji: "💼",
    nameKey: "auth.signup.sector.services",
    taglineKey: "auth.signup.sector.services_tagline",
  },
  {
    value: "OTHER",
    emoji: "✨",
    nameKey: "auth.signup.sector.other",
    taglineKey: "auth.signup.sector.other_tagline",
  },
];

export type StaffInviteRoleRow = {
  value: string;
  /** i18n key under public locales */
  labelKey: string;
};

export type StaffInviteRoleGroup = {
  groupLabelKey: string;
  roles: StaffInviteRoleRow[];
};

const RESTAURANT_GROUPS: StaffInviteRoleGroup[] = [
  {
    groupLabelKey: "staff.invite.management",
    roles: [
      { value: "SUPER_ADMIN", labelKey: "staff.roles.super_admin" },
      { value: "ADMIN", labelKey: "staff.roles.admin" },
      { value: "MANAGER", labelKey: "staff.roles.manager" },
    ],
  },
  {
    groupLabelKey: "staff.invite.kitchen",
    roles: [
      { value: "CHEF", labelKey: "staff.roles.chef" },
      { value: "KITCHEN_HELP", labelKey: "staff.roles.kitchen_help" },
      { value: "BARTENDER", labelKey: "staff.roles.bartender" },
    ],
  },
  {
    groupLabelKey: "staff.invite.front_of_house",
    roles: [
      { value: "WAITER", labelKey: "staff.roles.waiter" },
      { value: "RECEPTIONIST", labelKey: "staff.roles.receptionist" },
      { value: "CASHIER", labelKey: "staff.roles.cashier" },
    ],
  },
  {
    groupLabelKey: "staff.invite.operations_security",
    roles: [
      { value: "CLEANER", labelKey: "staff.roles.cleaner" },
      { value: "SECURITY", labelKey: "staff.roles.security" },
    ],
  },
];

const RETAIL_GROUPS: StaffInviteRoleGroup[] = [
  {
    groupLabelKey: "staff.invite.management",
    roles: [
      { value: "SUPER_ADMIN", labelKey: "staff.roles.super_admin" },
      { value: "ADMIN", labelKey: "staff.roles.admin" },
      { value: "MANAGER", labelKey: "staff.roles.retail_store_manager" },
    ],
  },
  {
    groupLabelKey: "staff.invite.retail_floor",
    roles: [
      { value: "WAITER", labelKey: "staff.roles.retail_sales_associate" },
      { value: "CASHIER", labelKey: "staff.roles.cashier" },
      { value: "RECEPTIONIST", labelKey: "staff.roles.customer_service" },
    ],
  },
  {
    groupLabelKey: "staff.invite.retail_back_of_house",
    roles: [
      { value: "KITCHEN_HELP", labelKey: "staff.roles.stock_associate" },
      { value: "CHEF", labelKey: "staff.roles.receiving_lead" },
      { value: "BARTENDER", labelKey: "staff.roles.specialist" },
    ],
  },
  {
    groupLabelKey: "staff.invite.operations_security",
    roles: [
      { value: "SECURITY", labelKey: "staff.roles.security" },
      { value: "CLEANER", labelKey: "staff.roles.cleaner" },
    ],
  },
];

const MANUFACTURING_GROUPS: StaffInviteRoleGroup[] = [
  {
    groupLabelKey: "staff.invite.management",
    roles: [
      { value: "SUPER_ADMIN", labelKey: "staff.roles.super_admin" },
      { value: "ADMIN", labelKey: "staff.roles.admin" },
      { value: "MANAGER", labelKey: "staff.roles.mfg_plant_manager" },
    ],
  },
  {
    groupLabelKey: "staff.invite.manufacturing_production",
    roles: [
      { value: "CHEF", labelKey: "staff.roles.mfg_line_lead" },
      { value: "WAITER", labelKey: "staff.roles.mfg_operator" },
      { value: "KITCHEN_HELP", labelKey: "staff.roles.mfg_material_handler" },
    ],
  },
  {
    groupLabelKey: "staff.invite.manufacturing_planner_qa",
    roles: [
      { value: "RECEPTIONIST", labelKey: "staff.roles.mfg_planner" },
      { value: "BARTENDER", labelKey: "staff.roles.mfg_quality" },
      { value: "CASHIER", labelKey: "staff.roles.mfg_inventory" },
    ],
  },
  {
    groupLabelKey: "staff.invite.operations_security",
    roles: [
      { value: "SECURITY", labelKey: "staff.roles.security" },
      { value: "CLEANER", labelKey: "staff.roles.cleaner" },
    ],
  },
];

const CONSTRUCTION_GROUPS: StaffInviteRoleGroup[] = [
  {
    groupLabelKey: "staff.invite.management",
    roles: [
      { value: "SUPER_ADMIN", labelKey: "staff.roles.super_admin" },
      { value: "ADMIN", labelKey: "staff.roles.admin" },
      { value: "MANAGER", labelKey: "staff.roles.const_project_manager" },
    ],
  },
  {
    groupLabelKey: "staff.invite.construction_site",
    roles: [
      { value: "CHEF", labelKey: "staff.roles.const_site_supervisor" },
      { value: "WAITER", labelKey: "staff.roles.const_skilled_trades" },
      { value: "KITCHEN_HELP", labelKey: "staff.roles.const_equipment_op" },
    ],
  },
  {
    groupLabelKey: "staff.invite.construction_office",
    roles: [
      { value: "RECEPTIONIST", labelKey: "staff.roles.const_coordinator" },
      { value: "CASHIER", labelKey: "staff.roles.const_admin" },
      { value: "BARTENDER", labelKey: "staff.roles.const_safety" },
    ],
  },
  {
    groupLabelKey: "staff.invite.operations_security",
    roles: [
      { value: "SECURITY", labelKey: "staff.roles.security" },
      { value: "CLEANER", labelKey: "staff.roles.cleaner" },
    ],
  },
];

const HEALTHCARE_GROUPS: StaffInviteRoleGroup[] = [
  {
    groupLabelKey: "staff.invite.management",
    roles: [
      { value: "SUPER_ADMIN", labelKey: "staff.roles.super_admin" },
      { value: "ADMIN", labelKey: "staff.roles.admin" },
      { value: "MANAGER", labelKey: "staff.roles.health_practice_manager" },
    ],
  },
  {
    groupLabelKey: "staff.invite.healthcare_clinical",
    roles: [
      { value: "CHEF", labelKey: "staff.roles.health_clinical" },
      { value: "WAITER", labelKey: "staff.roles.health_care_assistant" },
      { value: "KITCHEN_HELP", labelKey: "staff.roles.health_support" },
      { value: "BARTENDER", labelKey: "staff.roles.health_specialist" },
    ],
  },
  {
    groupLabelKey: "staff.invite.healthcare_front",
    roles: [
      { value: "RECEPTIONIST", labelKey: "staff.roles.receptionist" },
      { value: "CASHIER", labelKey: "staff.roles.health_billing" },
    ],
  },
  {
    groupLabelKey: "staff.invite.operations_security",
    roles: [
      { value: "SECURITY", labelKey: "staff.roles.security" },
      { value: "CLEANER", labelKey: "staff.roles.cleaner" },
    ],
  },
];

const HOSPITALITY_GROUPS: StaffInviteRoleGroup[] = [
  {
    groupLabelKey: "staff.invite.management",
    roles: [
      { value: "SUPER_ADMIN", labelKey: "staff.roles.super_admin" },
      { value: "ADMIN", labelKey: "staff.roles.admin" },
      { value: "MANAGER", labelKey: "staff.roles.hotel_gm" },
    ],
  },
  {
    groupLabelKey: "staff.invite.hospitality_guest",
    roles: [
      { value: "RECEPTIONIST", labelKey: "staff.roles.receptionist" },
      { value: "WAITER", labelKey: "staff.roles.hotel_concierge" },
      { value: "CASHIER", labelKey: "staff.roles.cashier" },
    ],
  },
  {
    groupLabelKey: "staff.invite.hospitality_house_fnb",
    roles: [
      { value: "CHEF", labelKey: "staff.roles.hotel_housekeeping_lead" },
      { value: "KITCHEN_HELP", labelKey: "staff.roles.hotel_room_attendant" },
      { value: "BARTENDER", labelKey: "staff.roles.hotel_fnb" },
    ],
  },
  {
    groupLabelKey: "staff.invite.operations_security",
    roles: [
      { value: "SECURITY", labelKey: "staff.roles.security" },
      { value: "CLEANER", labelKey: "staff.roles.cleaner" },
    ],
  },
];

const SERVICES_GROUPS: StaffInviteRoleGroup[] = [
  {
    groupLabelKey: "staff.invite.management",
    roles: [
      { value: "SUPER_ADMIN", labelKey: "staff.roles.super_admin" },
      { value: "ADMIN", labelKey: "staff.roles.admin" },
      { value: "MANAGER", labelKey: "staff.roles.svc_ops_lead" },
    ],
  },
  {
    groupLabelKey: "staff.invite.services_delivery",
    roles: [
      { value: "CHEF", labelKey: "staff.roles.svc_engagement_lead" },
      { value: "WAITER", labelKey: "staff.roles.svc_consultant" },
      { value: "KITCHEN_HELP", labelKey: "staff.roles.svc_associate" },
      { value: "BARTENDER", labelKey: "staff.roles.svc_subject_expert" },
    ],
  },
  {
    groupLabelKey: "staff.invite.services_client_ops",
    roles: [
      { value: "RECEPTIONIST", labelKey: "staff.roles.customer_service" },
      { value: "CASHIER", labelKey: "staff.roles.cashier" },
    ],
  },
  {
    groupLabelKey: "staff.invite.operations_security",
    roles: [
      { value: "SECURITY", labelKey: "staff.roles.security" },
      { value: "CLEANER", labelKey: "staff.roles.cleaner" },
    ],
  },
];

const OTHER_GROUPS: StaffInviteRoleGroup[] = [
  {
    groupLabelKey: "staff.invite.management",
    roles: [
      { value: "SUPER_ADMIN", labelKey: "staff.roles.super_admin" },
      { value: "ADMIN", labelKey: "staff.roles.admin" },
      { value: "MANAGER", labelKey: "staff.roles.manager" },
    ],
  },
  {
    groupLabelKey: "staff.invite.team_roles",
    roles: [
      { value: "CHEF", labelKey: "staff.roles.chef" },
      { value: "WAITER", labelKey: "staff.roles.waiter" },
      { value: "KITCHEN_HELP", labelKey: "staff.roles.kitchen_help" },
      { value: "BARTENDER", labelKey: "staff.roles.bartender" },
      { value: "RECEPTIONIST", labelKey: "staff.roles.receptionist" },
      { value: "CASHIER", labelKey: "staff.roles.cashier" },
      { value: "CLEANER", labelKey: "staff.roles.cleaner" },
      { value: "SECURITY", labelKey: "staff.roles.security" },
    ],
  },
];

export function getStaffInviteRoleGroups(
  vertical: BusinessVertical | string | undefined | null
): StaffInviteRoleGroup[] {
  const v = (vertical || DEFAULT_BUSINESS_VERTICAL).toUpperCase();
  switch (v) {
    case "RETAIL":
      return RETAIL_GROUPS;
    case "MANUFACTURING":
      return MANUFACTURING_GROUPS;
    case "CONSTRUCTION":
      return CONSTRUCTION_GROUPS;
    case "HEALTHCARE":
      return HEALTHCARE_GROUPS;
    case "HOSPITALITY":
      return HOSPITALITY_GROUPS;
    case "SERVICES":
      return SERVICES_GROUPS;
    case "OTHER":
      return OTHER_GROUPS;
    default:
      return RESTAURANT_GROUPS;
  }
}

export function allRoleCodesForVertical(
  vertical: BusinessVertical | string | undefined | null
): string[] {
  const seen = new Set<string>();
  for (const g of getStaffInviteRoleGroups(vertical)) {
    for (const r of g.roles) seen.add(r.value);
  }
  seen.add("CUSTOM");
  return [...seen];
}

export function isRoleAllowedForVertical(
  role: string,
  vertical: BusinessVertical | string | undefined | null
): boolean {
  if (role.startsWith("CUSTOM:") && role.length > "CUSTOM:".length) {
    return true;
  }
  return allRoleCodesForVertical(vertical).includes(role);
}

export function defaultRoleForVertical(
  vertical: BusinessVertical | string | undefined | null
): string {
  const codes = allRoleCodesForVertical(vertical);
  if (codes.includes("MANAGER")) return "MANAGER";
  return codes[0] || "MANAGER";
}

export function parseBusinessVertical(raw: unknown): BusinessVertical {
  const v = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  if (ALL_BUSINESS_VERTICALS.includes(v as BusinessVertical)) {
    return v as BusinessVertical;
  }
  return DEFAULT_BUSINESS_VERTICAL;
}
