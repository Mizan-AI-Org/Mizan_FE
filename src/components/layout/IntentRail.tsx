import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { AuthContextType } from "@/contexts/AuthContext.types";
import { useLanguage } from "@/hooks/use-language";
import { usePermissions } from "@/hooks/use-permissions";
import { UserAvatarMenu } from "@/components/layout/UserAvatarMenu";
import { cn } from "@/lib/utils";
import { OPERATIONAL_COMMAND_ROLES } from "@/lib/operationalCommandRoles";
import {
  IconAttention,
  IconAutomation,
  IconBusiness,
  IconCommand,
  IconKnowledge,
  IconPeople,
  IconSettings,
  IconWork,
} from "@/components/layout/mizan-nav-icons";

type NavLeaf = {
  labelKey: string;
  href: string;
  appId?: string;
  roles?: string[];
  /** Treat as active when the route carries no query of its own (default tab). */
  matchesBareRoute?: boolean;
};
type NavGroup = {
  id: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  appId?: string;
  roles?: string[];
  children?: NavLeaf[];
};

const RAIL_EXPANDED = 232;
const RAIL_COLLAPSED = 72;
const ICON = "h-[22px] w-[22px]";

const GROUPS: NavGroup[] = [
  {
    id: "command",
    labelKey: "nav.command",
    icon: IconCommand,
    href: "/dashboard",
    roles: [...OPERATIONAL_COMMAND_ROLES],
  },
  {
    id: "attention",
    labelKey: "nav.attention",
    icon: IconAttention,
    href: "/dashboard/attention",
    roles: [...OPERATIONAL_COMMAND_ROLES],
  },
  {
    id: "work",
    labelKey: "nav.work",
    icon: IconWork,
    href: "/dashboard/work",
    roles: [...OPERATIONAL_COMMAND_ROLES],
    children: [
      { labelKey: "nav.overview", href: "/dashboard/work" },
      { labelKey: "nav.work.live_operations", href: "/dashboard/operations-live", appId: "operations_live" },
      { labelKey: "nav.work.tasks", href: "/dashboard/processes-tasks-app", appId: "tasks" },
      { labelKey: "nav.work.incidents", href: "/dashboard/analytics?tab=incidents", appId: "checklists" },
      { labelKey: "nav.work.requests", href: "/dashboard/staff-requests", appId: "staff_requests" },
    ],
  },
  {
    id: "people",
    labelKey: "nav.people",
    icon: IconPeople,
    href: "/dashboard/people",
    roles: [...OPERATIONAL_COMMAND_ROLES],
    children: [
      { labelKey: "nav.overview", href: "/dashboard/people" },
      { labelKey: "nav.people.staff", href: "/dashboard/staff-app", appId: "staff" },
      { labelKey: "nav.people.scheduling", href: "/dashboard/scheduling", appId: "scheduling" },
    ],
  },
  {
    id: "business",
    labelKey: "nav.business",
    icon: IconBusiness,
    href: "/dashboard/business",
    roles: ["SUPER_ADMIN", "ADMIN", "OWNER", "MANAGER"],
    children: [
      { labelKey: "nav.overview", href: "/dashboard/business" },
      { labelKey: "nav.business.analytics", href: "/dashboard/reports", appId: "reports" },
      { labelKey: "nav.business.locations", href: "/dashboard/locations-overview", appId: "locations_overview" },
      { labelKey: "nav.business.approvals", href: "/dashboard/staff-requests?list=finance&filter=pending_approval", appId: "staff_requests" },
    ],
  },
  {
    id: "automation",
    labelKey: "nav.automation",
    icon: IconAutomation,
    href: "/dashboard/automation",
    appId: "automations",
    roles: ["SUPER_ADMIN", "ADMIN", "OWNER", "MANAGER"],
  },
  {
    id: "knowledge",
    labelKey: "nav.knowledge",
    icon: IconKnowledge,
    href: "/dashboard/knowledge",
    roles: ["SUPER_ADMIN", "ADMIN", "OWNER", "MANAGER"],
  },
  {
    id: "settings",
    labelKey: "nav.settings",
    icon: IconSettings,
    href: "/dashboard/settings",
    appId: "settings",
    roles: ["SUPER_ADMIN", "ADMIN", "OWNER"],
    children: [
      { labelKey: "settings.tabs.profile", href: "/dashboard/settings?tab=profile", matchesBareRoute: true },
      { labelKey: "settings.tabs.general", href: "/dashboard/settings?tab=general" },
      { labelKey: "settings.tabs.geolocation", href: "/dashboard/settings?tab=location" },
      { labelKey: "settings.tabs.integrations", href: "/dashboard/settings?tab=integrations" },
      { labelKey: "settings.tabs.billing", href: "/dashboard/settings?tab=billing" },
      { labelKey: "settings.tabs.compliance", href: "/dashboard/settings?tab=compliance" },
      { labelKey: "settings.tabs.payguard", href: "/dashboard/settings?tab=payguard" },
      { labelKey: "nav.settings.role_permissions", href: "/dashboard/settings/permissions" },
    ],
  },
];

function pathMatches(pathname: string, href: string) {
  const base = href.split("#")[0].split("?")[0];
  if (base === "/dashboard") return pathname === "/dashboard";
  return pathname === base || pathname.startsWith(base + "/");
}

/**
 * Active check that understands query-scoped destinations such as
 * `/dashboard/settings?tab=billing`, which all share one pathname.
 */
function leafMatches(pathname: string, search: string, leaf: NavLeaf) {
  const [routePart, queryPart] = leaf.href.split("#")[0].split("?");
  if (!queryPart) return pathMatches(pathname, routePart);
  if (pathname !== routePart) return false;

  const current = new URLSearchParams(search);
  const target = new URLSearchParams(queryPart);
  let sawAny = false;
  for (const [key, value] of target.entries()) {
    sawAny = true;
    const actual = current.get(key);
    if (actual == null) return Boolean(leaf.matchesBareRoute);
    if (actual.toLowerCase() !== value.toLowerCase()) return false;
  }
  return sawAny;
}

function setRailWidthVar(collapsed: boolean) {
  try {
    document.documentElement.style.setProperty(
      "--mizan-rail-width",
      `${collapsed ? RAIL_COLLAPSED : RAIL_EXPANDED}px`,
    );
  } catch {
    /* ignore */
  }
}

function navItemClass(active: boolean, collapsed: boolean) {
  return cn(
    "group relative flex min-h-11 items-center gap-3 rounded-md px-2.5 py-2.5 text-body transition-all duration-os",
    collapsed && "justify-center px-0",
    active
      ? [
          "bg-primary/[0.09] font-medium text-foreground ring-1 ring-inset ring-primary/15",
          "[&>svg:first-of-type]:text-primary",
          "before:absolute before:inset-inline-start-0 before:top-1/2 before:h-5 before:w-[3px]",
          "before:-translate-y-1/2 before:rounded-e-full before:bg-primary before:content-['']",
        ]
      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground",
  );
}

export function IntentRail({ className }: { className?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, isRTL } = useLanguage();
  const { hasRole } = useAuth() as AuthContextType;
  const { canApp } = usePermissions();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("mizan-intent-rail-collapsed") === "1";
    } catch {
      return false;
    }
  });
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    work: true,
    people: false,
    business: false,
  });

  useEffect(() => {
    setRailWidthVar(collapsed);
  }, [collapsed]);

  // Reveal the section you are actually in rather than making people hunt for it.
  useEffect(() => {
    const owning = GROUPS.find(
      (g) => g.children?.length && g.href && pathMatches(location.pathname, g.href),
    );
    if (!owning) return;
    setOpenGroups((state) => (state[owning.id] ? state : { ...state, [owning.id]: true }));
  }, [location.pathname]);

  const visible = useMemo(() => {
    return GROUPS.filter((g) => {
      if (g.roles && !hasRole(g.roles)) return false;
      if (g.appId && !canApp(g.appId)) return false;
      return true;
    }).map((g) => ({
      ...g,
      children: g.children?.filter((c) => {
        if (c.roles && !hasRole(c.roles)) return false;
        if (c.appId && !canApp(c.appId)) return false;
        return true;
      }),
    }));
  }, [hasRole, canApp]);

  return (
    <aside
      className={cn(
        "fixed inset-inline-start-0 top-[var(--mizan-header-height,3.5625rem)] bottom-0 z-40 hidden lg:flex flex-col border-e border-sidebar-border",
        "app-rail-surface backdrop-blur-md transition-[width] duration-os",
        collapsed ? "w-[72px]" : "w-[232px]",
        className,
      )}
      aria-label={t("nav.primary")}
    >
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3 pt-3">
        {visible.map((group) => {
          const Icon = group.icon;
          const label = t(group.labelKey);
          const active = group.href
            ? pathMatches(location.pathname, group.href)
            : (group.children || []).some((c) =>
                leafMatches(location.pathname, location.search, c),
              );
          const expanded = openGroups[group.id] ?? false;

          if (!group.children?.length) {
            return (
              <NavLink
                key={group.id}
                to={group.href || "/dashboard"}
                end={group.href === "/dashboard"}
                title={label}
                className={navItemClass(active, collapsed)}
              >
                <Icon className={ICON} />
                {!collapsed ? <span>{label}</span> : <span className="sr-only">{label}</span>}
              </NavLink>
            );
          }

          return (
            <div key={group.id}>
              <button
                type="button"
                onClick={() => {
                  if (collapsed) {
                    navigate(group.href || group.children?.[0]?.href || "/dashboard");
                    return;
                  }
                  if (group.href && !expanded) navigate(group.href);
                  setOpenGroups((s) => ({ ...s, [group.id]: !expanded }));
                }}
                className={cn(navItemClass(active, collapsed), "w-full")}
                title={label}
              >
                <Icon className={ICON} />
                {!collapsed ? (
                  <>
                    <span className="flex-1 text-start">{label}</span>
                    {expanded ? (
                      <ChevronDown className="h-4 w-4 opacity-60" />
                    ) : isRTL ? (
                      <ChevronLeft className="h-4 w-4 opacity-60" />
                    ) : (
                      <ChevronRight className="h-4 w-4 opacity-60" />
                    )}
                  </>
                ) : (
                  <span className="sr-only">{label}</span>
                )}
              </button>
              {!collapsed && expanded ? (
                <div className="ms-4 mt-0.5 space-y-0.5 border-s border-sidebar-border ps-3">
                  {(group.children || []).map((child) => {
                    const childActive = leafMatches(location.pathname, location.search, child);
                    const childLabel = t(child.labelKey);
                    return (
                      <button
                        key={child.href + child.labelKey}
                        type="button"
                        onClick={() => navigate(child.href)}
                        className={cn(
                          "flex min-h-10 w-full items-center gap-2 rounded-md px-2 py-2",
                          "text-start text-body transition-all duration-os",
                          childActive
                            ? "bg-primary/[0.08] font-medium text-foreground"
                            : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-os",
                            childActive ? "bg-primary" : "bg-transparent",
                          )}
                          aria-hidden
                        />
                        <span className="min-w-0 truncate">{childLabel}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div
        className={cn(
          "mt-auto space-y-1 border-t border-sidebar-border p-2",
          collapsed && "flex flex-col items-center",
        )}
      >
        <button
          type="button"
          onClick={() => {
            setCollapsed((v) => {
              const next = !v;
              try {
                localStorage.setItem("mizan-intent-rail-collapsed", next ? "1" : "0");
              } catch {
                /* ignore */
              }
              return next;
            });
          }}
          className={cn(
            "flex min-h-10 items-center gap-3 rounded-control px-2.5 text-caption text-muted-foreground",
            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            collapsed ? "w-10 justify-center px-0" : "w-full",
          )}
          aria-label={collapsed ? t("nav.expand") : t("nav.collapse")}
        >
          {collapsed ? (
            isRTL ? (
              <ChevronLeft className="h-4 w-4" aria-hidden />
            ) : (
              <ChevronRight className="h-4 w-4" aria-hidden />
            )
          ) : isRTL ? (
            <ChevronRight className="h-4 w-4" aria-hidden />
          ) : (
            <ChevronLeft className="h-4 w-4" aria-hidden />
          )}
          {!collapsed ? <span>{t("nav.collapse")}</span> : null}
        </button>
        <UserAvatarMenu
          variant={collapsed ? "icon" : "row"}
          align="start"
          side={isRTL ? "left" : "right"}
          className={collapsed ? "" : "w-full"}
        />
      </div>
    </aside>
  );
}

export function MobileIntentDock() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { hasRole } = useAuth() as AuthContextType;

  const items = useMemo(() => {
    const candidates = [
      { labelKey: "nav.command", href: "/dashboard", icon: IconCommand, roles: [...OPERATIONAL_COMMAND_ROLES] },
      { labelKey: "nav.attention", href: "/dashboard/attention", icon: IconAttention, roles: [...OPERATIONAL_COMMAND_ROLES] },
      { labelKey: "nav.work", href: "/dashboard/work", icon: IconWork, roles: [...OPERATIONAL_COMMAND_ROLES] },
      { labelKey: "nav.people", href: "/dashboard/people", icon: IconPeople, roles: [...OPERATIONAL_COMMAND_ROLES] },
      { labelKey: "nav.business", href: "/dashboard/business", icon: IconBusiness, roles: ["SUPER_ADMIN", "ADMIN", "OWNER", "MANAGER"] },
    ];
    return candidates.filter((c) => !c.roles || hasRole(c.roles));
  }, [hasRole]);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      aria-label={t("nav.mobile")}
    >
      <div className="flex items-stretch justify-around px-1 py-1.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathMatches(location.pathname, item.href);
          return (
            <button
              key={item.href}
              type="button"
              onClick={() => navigate(item.href)}
              className={cn(
                "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-control px-1 py-1.5",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="truncate text-caption font-medium">{t(item.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default IntentRail;
