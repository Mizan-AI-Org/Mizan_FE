import type { ModuleKey } from "@/lib/types";

export type DomainId =
  | "operations"
  | "employees"
  | "products"
  | "customers";

export type DomainSection = {
  labelKey: string;
  href: string;
  exact?: boolean;
  /** Hidden when the tenant turned this module off (Settings > Modules). */
  moduleId?: ModuleKey;
};

export type DomainNavLeaf = DomainSection & {
  appId?: string;
  roles?: string[];
  matchesBareRoute?: boolean;
  /** Exact leaf is inactive when the URL search contains any of these keys (sub-views share one pathname). */
  exactInactiveIfSearchHas?: string[];
  /** Other pathnames that should highlight this leaf (shared page, separate routes). */
  alsoMatch?: string[];
  /** Keep the sidebar label on one line. */
  singleLine?: boolean;
};

export const DOMAIN_SECTIONS: Record<DomainId, DomainNavLeaf[]> = {
  operations: [
    {
      labelKey: "nav.work.live_operations",
      href: "/dashboard/operations/live",
      exact: true,
      exactInactiveIfSearchHas: ["view"],
    },
    { labelKey: "nav.work.approvals", href: "/dashboard/operations/approvals" },
    {
      labelKey: "nav.employees.tasks",
      href: "/dashboard/employees/tasks",
      moduleId: "checklists",
    },
    { labelKey: "nav.work.staff_checklists", href: "/dashboard/operations/checklists", moduleId: "checklists" },
    // Agency tenants only: restaurants never see this leaf.
    { labelKey: "nav.work.agency_jobs", href: "/dashboard/operations/agency-jobs", moduleId: "agency" },
  ],
  employees: [
    { labelKey: "nav.employees.people", href: "/dashboard/employees/people" },
    { labelKey: "nav.employees.shifts", href: "/dashboard/employees/shifts", moduleId: "scheduling" },
    {
      labelKey: "nav.employees.attendance_performance",
      href: "/dashboard/employees/attendance",
      alsoMatch: ["/dashboard/employees/performance"],
      moduleId: "scheduling",
      singleLine: true,
    },
  ],
  products: [{ labelKey: "nav.sales", href: "/dashboard/products/sales" }],
  customers: [
    {
      labelKey: "nav.customers.reservations_orders",
      href: "/dashboard/customers/reservations-orders",
    },
  ],
};

export const AUTOMATION_SECTIONS: DomainNavLeaf[] = [
  { labelKey: "nav.automation.workflows", href: "/dashboard/automations" },
];

/** Deep link: Integrations tab scrolled to POS connect (Square, Toast, Clover, …). */
export const POS_INTEGRATIONS_HREF =
  "/dashboard/settings?tab=integrations&section=pos#pos-integration";

export const SETTINGS_SECTIONS: DomainNavLeaf[] = [
  {
    labelKey: "settings.tabs.general_settings",
    href: "/dashboard/settings?tab=general-settings",
    matchesBareRoute: true,
  },
  { labelKey: "settings.tabs.integrations", href: "/dashboard/settings?tab=integrations" },
  { labelKey: "settings.tabs.billing", href: "/dashboard/settings?tab=billing" },
  {
    labelKey: "settings.tabs.approval_rules",
    href: "/dashboard/settings?tab=compliance-approvals&section=approvals",
  },
  { labelKey: "nav.settings.role_permissions", href: "/dashboard/settings/permissions" },
];

export function domainFromPath(pathname: string): DomainId | null {
  const keys: DomainId[] = ["operations", "employees", "products", "customers"];
  return keys.find((id) => pathname === `/dashboard/${id}` || pathname.startsWith(`/dashboard/${id}/`)) || null;
}
