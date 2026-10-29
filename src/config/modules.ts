import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  Fingerprint,
  Thermometer,
  FolderHeart,
  MapPin,
  Package,
  ShieldCheck,
  ShoppingCart,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { ModuleBundle, ModuleKey } from "@/lib/types";

export type ModuleMeta = {
  key: ModuleKey;
  icon: LucideIcon;
  bundle: ModuleBundle;
  /** i18n: modules.<key>.name / .desc */
  core?: boolean;
  /** Turning this on also turns these on (and turning them off turns this off). */
  requires?: ModuleKey[];
  /** Dashboard routes this module owns; when it is off they show the "turn it on" screen. */
  routes: string[];
};

/** Display order of the module picker (matches the backend catalog in apps/accounts/modules.py). */
export const MODULES: ModuleMeta[] = [
  { key: "operations", icon: Activity, bundle: "core", core: true, routes: [] },
  { key: "team", icon: Users, bundle: "core", core: true, routes: [] },
  { key: "geo_clock", icon: MapPin, bundle: "workforce", requires: ["attendance"], routes: [] },
  {
    key: "attendance",
    icon: Fingerprint,
    bundle: "workforce",
    routes: ["/dashboard/employees/attendance", "/dashboard/attendance", "/dashboard/timesheets"],
  },
  {
    key: "scheduling",
    icon: CalendarDays,
    bundle: "workforce",
    routes: [
      "/dashboard/employees/shifts",
      "/dashboard/employees/performance",
      "/dashboard/scheduling",
      "/dashboard/auto-schedule",
      "/dashboard/swap-requests",
      "/dashboard/emergency-availability",
    ],
  },
  { key: "hr", icon: FolderHeart, bundle: "workforce", routes: [] },
  {
    key: "checklists",
    icon: ClipboardCheck,
    bundle: "execution",
    routes: [
      "/dashboard/operations/checklists",
      "/dashboard/employees/tasks",
      "/dashboard/processes-tasks-app",
      "/dashboard/task-templates",
      "/dashboard/checklists",
      "/dashboard/reviews/checklists",
    ],
  },
  { key: "accountability", icon: ShieldCheck, bundle: "execution", routes: [] },
  {
    key: "incidents",
    icon: AlertTriangle,
    bundle: "execution",
    routes: ["/dashboard/operations/incidents", "/dashboard/operational-issues"],
  },
  { key: "food_safety", icon: Thermometer, bundle: "execution", routes: ["/dashboard/operations/food-safety"] },
  {
    key: "sales",
    icon: ShoppingCart,
    bundle: "business",
    routes: [
      "/dashboard/products",
      "/dashboard/sales-and-prep",
      "/dashboard/menu",
      "/dashboard/categories",
    ],
  },
  {
    key: "reservations",
    icon: CalendarClock,
    bundle: "business",
    routes: [
      "/dashboard/customers",
      "/dashboard/reservations",
      "/dashboard/take-orders",
      "/dashboard/kitchen",
      "/dashboard/floors",
      "/dashboard/table-management",
      "/dashboard/guest-requests",
    ],
  },
  {
    key: "inventory",
    icon: Package,
    bundle: "business",
    routes: ["/dashboard/suppliers", "/dashboard/inventory", "/dashboard/purchasing"],
  },
  { key: "finance", icon: Wallet, bundle: "business", routes: ["/dashboard/financials"] },
];

export const BUNDLES: ModuleBundle[] = ["core", "workforce", "execution", "business"];
export const CORE_MODULES: ModuleKey[] = MODULES.filter((m) => m.core).map((m) => m.key);
export const ALL_MODULES: ModuleKey[] = MODULES.map((m) => m.key);

/** Offline fallback for the signup picker; the backend catalog is the source of truth. */
const EXECUTION: ModuleKey[] = ["checklists", "accountability", "incidents"];
const WORKFORCE: ModuleKey[] = ["geo_clock", "attendance", "scheduling", "hr"];
const OPTIONAL_BY_SECTOR: Record<string, ModuleKey[]> = {
  RESTAURANT: MODULES.filter((m) => !m.core).map((m) => m.key),
  HOSPITALITY: MODULES.filter((m) => !m.core).map((m) => m.key),
  RETAIL: [...WORKFORCE, ...EXECUTION, "sales", "inventory", "finance"],
  MANUFACTURING: [...WORKFORCE, ...EXECUTION, "inventory", "finance"],
  CONSTRUCTION: [...WORKFORCE, ...EXECUTION, "inventory", "finance"],
  HEALTHCARE: [...WORKFORCE, ...EXECUTION, "finance"],
  SERVICES: [...WORKFORCE, ...EXECUTION, "reservations", "finance"],
  OTHER: ["geo_clock", "attendance", "scheduling", ...EXECUTION],
};

export function recommendedModules(sector: string): ModuleKey[] {
  return [...CORE_MODULES, ...(OPTIONAL_BY_SECTOR[sector.toUpperCase()] || OPTIONAL_BY_SECTOR.OTHER)];
}

/** Keep the selection consistent: what a module needs comes with it; what needs a removed module goes too. */
export function withDependencies(next: ModuleKey[], toggled?: ModuleKey, turnedOn?: boolean): ModuleKey[] {
  const set = new Set<ModuleKey>([...CORE_MODULES, ...next]);
  if (toggled && turnedOn) {
    for (const need of MODULES.find((m) => m.key === toggled)?.requires || []) set.add(need);
  }
  if (toggled && turnedOn === false) {
    for (const m of MODULES) if (m.requires?.includes(toggled)) set.delete(m.key);
  }
  for (const m of MODULES) {
    if (set.has(m.key) && m.requires?.some((r) => !set.has(r))) set.delete(m.key);
  }
  return ALL_MODULES.filter((k) => set.has(k));
}

/** The module that owns a dashboard path, if any (longest matching prefix). */
export function moduleForPath(pathname: string): ModuleKey | null {
  let best: { key: ModuleKey; len: number } | null = null;
  for (const m of MODULES) {
    for (const route of m.routes) {
      if ((pathname === route || pathname.startsWith(`${route}/`)) && (!best || route.length > best.len)) {
        best = { key: m.key, len: route.length };
      }
    }
  }
  return best?.key ?? null;
}
