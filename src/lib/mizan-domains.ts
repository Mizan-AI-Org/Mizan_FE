export type DomainId =
  | "operations"
  | "employees"
  | "products"
  | "customers"
  | "suppliers"
  | "financials"
  | "intelligence";

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
    { labelKey: "nav.overview", href: "/dashboard/operations", exact: true },
    { labelKey: "nav.work.live_operations", href: "/dashboard/operations/live" },
    { labelKey: "nav.work.approvals", href: "/dashboard/operations/approvals" },
    { labelKey: "nav.work.incidents", href: "/dashboard/operations/incidents" },
    { labelKey: "nav.work.requests", href: "/dashboard/staff-requests" },
  ],
  employees: [
    { labelKey: "nav.overview", href: "/dashboard/employees", exact: true },
    { labelKey: "nav.employees.people", href: "/dashboard/employees/people" },
    { labelKey: "nav.employees.shifts", href: "/dashboard/employees/shifts" },
    { labelKey: "nav.employees.tasks", href: "/dashboard/employees/tasks" },
    { labelKey: "nav.employees.attendance", href: "/dashboard/employees/attendance" },
    { labelKey: "nav.employees.performance", href: "/dashboard/employees/performance" },
  ],
  products: [
    { labelKey: "nav.overview", href: "/dashboard/products", exact: true },
    { labelKey: "nav.products.catalog", href: "/dashboard/products/catalog" },
    { labelKey: "nav.products.sales", href: "/dashboard/products/sales" },
    { labelKey: "nav.products.inventory", href: "/dashboard/products/inventory" },
    { labelKey: "nav.products.waste", href: "/dashboard/products/waste" },
  ],
  customers: [
    { labelKey: "nav.overview", href: "/dashboard/customers", exact: true },
    { labelKey: "nav.customers.list", href: "/dashboard/customers/list" },
    { labelKey: "nav.customers.reservations", href: "/dashboard/customers/reservations" },
    { labelKey: "nav.customers.orders", href: "/dashboard/customers/orders" },
    { labelKey: "nav.customers.insights", href: "/dashboard/customers/insights" },
  ],
  suppliers: [
    { labelKey: "nav.overview", href: "/dashboard/suppliers", exact: true },
    { labelKey: "nav.suppliers.directory", href: "/dashboard/suppliers/directory" },
    { labelKey: "nav.suppliers.prices", href: "/dashboard/suppliers/prices" },
    { labelKey: "nav.suppliers.purchasing", href: "/dashboard/suppliers/purchasing" },
    { labelKey: "nav.suppliers.deliveries", href: "/dashboard/suppliers/deliveries" },
  ],
  financials: [
    { labelKey: "nav.overview", href: "/dashboard/financials", exact: true },
    { labelKey: "nav.financials.revenue", href: "/dashboard/financials/revenue" },
    { labelKey: "nav.financials.costs", href: "/dashboard/financials/costs" },
    { labelKey: "nav.financials.margins", href: "/dashboard/financials/margins" },
    { labelKey: "nav.financials.pnl", href: "/dashboard/financials/pnl" },
  ],
  intelligence: [
    { labelKey: "nav.intelligence.insights", href: "/dashboard/intelligence/insights", exact: true },
    { labelKey: "nav.intelligence.forecasts", href: "/dashboard/intelligence/forecasts" },
    { labelKey: "nav.intelligence.recommendations", href: "/dashboard/intelligence/recommendations" },
    { labelKey: "nav.intelligence.reports", href: "/dashboard/intelligence/reports" },
  ],
};

export const AUTOMATION_SECTIONS: DomainNavLeaf[] = [
  { labelKey: "nav.overview", href: "/dashboard/automation", exact: true },
  { labelKey: "nav.automation.workflows", href: "/dashboard/automations" },
];

/** Social Media uses a single hub page — no sidebar sub-tabs (see SocialMediaHubPage). */
export const SOCIAL_MEDIA_SECTIONS: DomainNavLeaf[] = [];

/** Deep link: Integrations tab scrolled to POS connect (Square, Toast, Clover, …). */
export const POS_INTEGRATIONS_HREF = "/dashboard/settings?tab=integrations#pos-integration";

export const SETTINGS_SECTIONS: DomainNavLeaf[] = [
  { labelKey: "settings.tabs.profile", href: "/dashboard/settings?tab=profile", matchesBareRoute: true },
  { labelKey: "settings.tabs.general", href: "/dashboard/settings?tab=general" },
  { labelKey: "nav.business.locations", href: "/dashboard/settings?tab=location" },
  { labelKey: "settings.tabs.integrations", href: "/dashboard/settings?tab=integrations" },
  { labelKey: "settings.tabs.billing", href: "/dashboard/settings?tab=billing" },
  { labelKey: "settings.tabs.compliance", href: "/dashboard/settings?tab=compliance" },
  { labelKey: "settings.tabs.payguard", href: "/dashboard/settings?tab=approvals" },
  { labelKey: "nav.settings.role_permissions", href: "/dashboard/settings/permissions" },
];

export function domainFromPath(pathname: string): DomainId | null {
  const keys: DomainId[] = [
    "operations",
    "employees",
    "products",
    "customers",
    "suppliers",
    "financials",
    "intelligence",
  ];
  return keys.find((id) => pathname === `/dashboard/${id}` || pathname.startsWith(`/dashboard/${id}/`)) || null;
}
