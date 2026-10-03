export type DomainId =
  | "operations"
  | "employees"
  | "products"
  | "customers";

export type DomainSection = {
  labelKey: string;
  href: string;
  exact?: boolean;
};

export type DomainNavLeaf = DomainSection & {
  appId?: string;
  roles?: string[];
  matchesBareRoute?: boolean;
};

export const DOMAIN_SECTIONS: Record<DomainId, DomainSection[]> = {
  operations: [
    { labelKey: "nav.work.live_operations", href: "/dashboard/operations/live" },
    { labelKey: "nav.work.approvals", href: "/dashboard/operations/approvals" },
    { labelKey: "nav.work.incidents", href: "/dashboard/operations/incidents" },
    { labelKey: "nav.work.staff_checklists", href: "/dashboard/operations/checklists" },
  ],
  employees: [
    { labelKey: "nav.employees.people", href: "/dashboard/employees/people" },
    { labelKey: "nav.employees.shifts", href: "/dashboard/employees/shifts" },
    { labelKey: "nav.employees.tasks", href: "/dashboard/employees/tasks" },
    { labelKey: "nav.employees.attendance", href: "/dashboard/employees/attendance" },
    { labelKey: "nav.employees.performance", href: "/dashboard/employees/performance" },
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
