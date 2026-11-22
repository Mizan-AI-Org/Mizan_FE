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
};

export const DOMAIN_SECTIONS: Record<DomainId, DomainNavLeaf[]> = {
  operations: [
    // One Operations page (Cursor's unified list); Accountability, Progress and Compliance are its sub-views.
    {
      labelKey: "cursorUi.ops.nav.overview",
      href: "/dashboard/operations",
      exact: true,
      exactInactiveIfSearchHas: ["view"],
    },
    { labelKey: "nav.work.live_operations", href: "/dashboard/operations/live" },
    { labelKey: "nav.work.accountability", href: "/dashboard/operations?view=accountability", moduleId: "accountability" },
    { labelKey: "nav.work.progress", href: "/dashboard/operations?view=progress" },
    { labelKey: "cursorUi.ops.tab.compliance", href: "/dashboard/operations?view=compliance" },
    { labelKey: "nav.work.approvals", href: "/dashboard/operations/approvals" },
    { labelKey: "nav.work.incidents", href: "/dashboard/operations/incidents", moduleId: "incidents" },
    { labelKey: "nav.work.staff_checklists", href: "/dashboard/operations/checklists", moduleId: "checklists" },
    { labelKey: "nav.work.agency_jobs", href: "/dashboard/operations/agency-jobs", moduleId: "agency" },
  ],
  employees: [
    { labelKey: "nav.employees.people", href: "/dashboard/employees/people" },
    { labelKey: "nav.employees.staff_requests", href: "/dashboard/staff-requests" },
    { labelKey: "nav.employees.shifts", href: "/dashboard/employees/shifts", moduleId: "scheduling" },
    { labelKey: "nav.employees.tasks", href: "/dashboard/employees/tasks", moduleId: "checklists" },
    { labelKey: "nav.employees.attendance", href: "/dashboard/employees/attendance", moduleId: "attendance" },
    { labelKey: "nav.employees.performance", href: "/dashboard/employees/performance", moduleId: "scheduling" },
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
    labelKey: "settings.tabs.compliance_approvals",
    href: "/dashboard/settings?tab=compliance-approvals",
  },
  { labelKey: "nav.settings.role_permissions", href: "/dashboard/settings/permissions" },
];

export function domainFromPath(pathname: string): DomainId | null {
  const keys: DomainId[] = ["operations", "employees", "products", "customers"];
  return keys.find((id) => pathname === `/dashboard/${id}` || pathname.startsWith(`/dashboard/${id}/`)) || null;
}
