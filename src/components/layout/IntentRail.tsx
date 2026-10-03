import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronRight, Menu } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { AuthContextType } from "@/contexts/AuthContext.types";
import { useLanguage } from "@/hooks/use-language";
import { usePermissions } from "@/hooks/use-permissions";
import { UserAvatarMenu } from "@/components/layout/UserAvatarMenu";
import { cn } from "@/lib/utils";
import { OPERATIONAL_COMMAND_ROLES } from "@/lib/operationalCommandRoles";
import {
  IconAttention,
  IconCommand,
  IconCustomers,
  IconPeople,
  IconProducts,
  IconSettings,
  IconSuppliers,
  IconWork,
} from "@/components/layout/mizan-nav-icons";
import {
  DOMAIN_SECTIONS,
  SETTINGS_SECTIONS,
  type DomainId,
  type DomainNavLeaf,
} from "@/lib/mizan-domains";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useNavAttentionBadges } from "@/hooks/use-nav-attention-badges";

type NavLeaf = DomainNavLeaf;
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

function domainLeaves(id: DomainId): NavLeaf[] {
  return DOMAIN_SECTIONS[id];
}

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
    labelKey: "nav.widget",
    icon: IconAttention,
    href: "/dashboard/attention",
    roles: [...OPERATIONAL_COMMAND_ROLES],
  },
  {
    id: "operations",
    labelKey: "nav.operations",
    icon: IconWork,
    href: "/dashboard/operations/live",
    roles: [...OPERATIONAL_COMMAND_ROLES],
    children: domainLeaves("operations"),
  },
  {
    id: "employees",
    labelKey: "nav.employees",
    icon: IconPeople,
    href: "/dashboard/employees/people",
    roles: [...OPERATIONAL_COMMAND_ROLES],
    children: domainLeaves("employees"),
  },
  {
    id: "products",
    labelKey: "nav.sales",
    icon: IconProducts,
    href: "/dashboard/products/sales",
    roles: [...OPERATIONAL_COMMAND_ROLES],
  },
  {
    id: "procurements",
    labelKey: "nav.procurements",
    icon: IconSuppliers,
    href: "/dashboard/suppliers/procurement",
    roles: ["SUPER_ADMIN", "ADMIN", "OWNER", "MANAGER"],
  },
  {
    id: "reservations_orders",
    labelKey: "nav.customers.reservations_orders",
    icon: IconCustomers,
    href: "/dashboard/customers/reservations-orders",
    roles: [...OPERATIONAL_COMMAND_ROLES],
  },
  {
    id: "settings",
    labelKey: "nav.settings",
    icon: IconSettings,
    href: "/dashboard/settings",
    appId: "settings",
    roles: ["SUPER_ADMIN", "ADMIN", "OWNER"],
    children: SETTINGS_SECTIONS,
  },
];

function pathMatches(pathname: string, href: string, exact?: boolean) {
  const base = href.split("#")[0].split("?")[0];
  if (exact || base === "/dashboard") return pathname === base;
  return pathname === base || pathname.startsWith(base + "/");
}

function groupOwnsPath(group: NavGroup, pathname: string, search: string) {
  if ((group.children || []).some((c) => leafMatches(pathname, search, c))) return true;
  if (group.href) return pathMatches(pathname, group.href, group.href === "/dashboard");
  return false;
}

/**
 * Active check that understands query-scoped destinations such as
 * `/dashboard/settings?tab=billing`, which all share one pathname.
 */
function leafMatches(pathname: string, search: string, leaf: NavLeaf) {
  const [routePart, queryPart] = leaf.href.split("#")[0].split("?");
  if (!queryPart) return pathMatches(pathname, routePart, leaf.exact);
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
          "bg-primary/[0.11] font-semibold text-foreground ring-1 ring-inset ring-primary/20",
          "[&>svg:first-of-type]:text-primary",
          "before:absolute before:inset-inline-start-0 before:top-1/2 before:h-6 before:w-[3px]",
          "before:-translate-y-1/2 before:rounded-e-full before:bg-primary before:content-['']",
        ]
      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground",
  );
}

function navChildItemClass(active: boolean) {
  return cn(
    "relative flex min-h-10 w-full items-center gap-2 rounded-md px-2.5 py-2 text-start text-body transition-all duration-os",
    active
      ? [
          "bg-primary/[0.11] font-semibold text-foreground ring-1 ring-inset ring-primary/20",
          "before:absolute before:inset-inline-start-0 before:top-1/2 before:h-5 before:w-[3px]",
          "before:-translate-y-1/2 before:rounded-e-full before:bg-primary before:content-['']",
        ]
      : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
  );
}

function NavAttentionBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  const label = count > 99 ? "99+" : `+${count}`;
  return (
    <span
      className={cn(
        "shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold tabular-nums leading-none text-primary-foreground",
        className,
      )}
      aria-label={`${count} need attention`}
    >
      {label}
    </span>
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
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setRailWidthVar(collapsed);
  }, [collapsed]);

  // Reveal the section you are actually in rather than making people hunt for it.
  useEffect(() => {
    const owning = GROUPS.find(
      (g) => g.children?.length && groupOwnsPath(g, location.pathname, location.search),
    );
    if (!owning) return;
    setOpenGroups((state) => (state[owning.id] ? state : { [owning.id]: true }));
  }, [location.pathname, location.search]);

  const toggleGroup = (group: NavGroup, expanded: boolean) => {
    if (collapsed) {
      navigate(group.href || group.children?.[0]?.href || "/dashboard");
      return;
    }
    const nextOpen = !expanded;
    setOpenGroups(nextOpen ? { [group.id]: true } : {});
    if (nextOpen && group.href && !groupOwnsPath(group, location.pathname, location.search)) {
      navigate(group.href);
    }
  };

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

  const navHrefs = useMemo(
    () =>
      visible.flatMap((g) => [
        ...(g.href ? [g.href] : []),
        ...((g.children || []).map((c) => c.href)),
      ]),
    [visible],
  );
  const { badgeForHref } = useNavAttentionBadges(navHrefs);

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
          const active = groupOwnsPath(group, location.pathname, location.search);
          const expanded = openGroups[group.id] ?? false;

          if (!group.children?.length) {
            const leafBadge = badgeForHref(group.href || "/dashboard", active);
            return (
              <NavLink
                key={group.id}
                to={group.href || "/dashboard"}
                end={group.href === "/dashboard"}
                title={label}
                className={navItemClass(active, collapsed)}
                aria-current={active ? "page" : undefined}
              >
                <Icon className={ICON} />
                {!collapsed ? (
                  <>
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    <NavAttentionBadge count={leafBadge} />
                  </>
                ) : (
                  <>
                    <span className="sr-only">{label}</span>
                    {leafBadge > 0 ? (
                      <span className="absolute end-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-bold text-primary-foreground">
                        {leafBadge > 9 ? "9+" : leafBadge}
                      </span>
                    ) : null}
                  </>
                )}
              </NavLink>
            );
          }

          const groupBadge = (group.children || []).reduce((sum, child) => {
            const childActive = leafMatches(location.pathname, location.search, child);
            return sum + badgeForHref(child.href, childActive);
          }, 0);

          return (
            <div key={group.id}>
              <button
                type="button"
                onClick={() => toggleGroup(group, expanded)}
                className={cn(navItemClass(active, collapsed), "w-full")}
                title={label}
                aria-expanded={expanded}
                aria-controls={`nav-group-${group.id}`}
              >
                <Icon className={ICON} />
                {!collapsed ? (
                  <>
                    <span className="flex-1 text-start truncate">{label}</span>
                    {!expanded ? <NavAttentionBadge count={groupBadge} /> : null}
                    {expanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
                    ) : isRTL ? (
                      <ChevronLeft className="h-4 w-4 shrink-0 opacity-60" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 opacity-60" />
                    )}
                  </>
                ) : (
                  <>
                    <span className="sr-only">{label}</span>
                    {groupBadge > 0 ? (
                      <span className="absolute end-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-bold text-primary-foreground">
                        {groupBadge > 9 ? "9+" : groupBadge}
                      </span>
                    ) : null}
                  </>
                )}
              </button>
              {!collapsed && expanded ? (
                <div
                  id={`nav-group-${group.id}`}
                  className="ms-4 mt-0.5 space-y-0.5 border-s border-sidebar-border ps-3"
                >
                  {(group.children || []).map((child) => {
                    const childActive = leafMatches(location.pathname, location.search, child);
                    const childLabel = t(child.labelKey);
                    const childBadge = badgeForHref(child.href, childActive);
                    return (
                      <button
                        key={child.href + child.labelKey}
                        type="button"
                        onClick={() => navigate(child.href)}
                        className={navChildItemClass(childActive)}
                        aria-current={childActive ? "page" : undefined}
                      >
                        <span className="min-w-0 flex-1 truncate">{childLabel}</span>
                        <NavAttentionBadge count={childBadge} />
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
  const { t, isRTL } = useLanguage();
  const { hasRole } = useAuth() as AuthContextType;
  const { canApp } = usePermissions();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const items = useMemo(() => {
    const candidates = [
      { labelKey: "nav.command", href: "/dashboard", icon: IconCommand, roles: [...OPERATIONAL_COMMAND_ROLES] },
      { labelKey: "nav.employees", href: "/dashboard/employees", icon: IconPeople, roles: [...OPERATIONAL_COMMAND_ROLES] },
      { labelKey: "nav.sales", href: "/dashboard/products/sales", icon: IconProducts, roles: [...OPERATIONAL_COMMAND_ROLES] },
      { labelKey: "nav.operations", href: "/dashboard/operations/live", icon: IconWork, roles: [...OPERATIONAL_COMMAND_ROLES] },
    ];
    return candidates.filter((c) => !c.roles || hasRole(c.roles));
  }, [hasRole]);

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

  const mobileNavHrefs = useMemo(
    () =>
      visible.flatMap((g) => [
        ...(g.href ? [g.href] : []),
        ...((g.children || []).map((c) => c.href)),
      ]),
    [visible],
  );
  const { badgeForHref: mobileBadgeForHref } = useNavAttentionBadges(mobileNavHrefs);

  useEffect(() => {
    const owning = GROUPS.find(
      (g) => g.children?.length && groupOwnsPath(g, location.pathname, location.search),
    );
    if (!owning) return;
    setOpenGroups({ [owning.id]: true });
  }, [location.pathname, location.search]);

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
        aria-label={t("nav.mobile")}
      >
        <div className="flex items-stretch justify-around px-1 py-1.5">
          {items.map((item) => {
            const Icon = item.icon;
            const group = GROUPS.find((g) => g.href === item.href || g.id === item.labelKey.replace("nav.", ""));
            const active = group
              ? groupOwnsPath(group, location.pathname, location.search)
              : pathMatches(location.pathname, item.href);
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
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-control px-1 py-1.5 text-muted-foreground"
          >
            <Menu className="h-6 w-6" />
            <span className="truncate text-caption font-medium">{t("nav.more")}</span>
          </button>
        </div>
      </nav>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side={isRTL ? "right" : "left"} className="flex flex-col overflow-y-auto p-4">
          <SheetHeader className="mb-3 text-start">
            <SheetTitle>{t("nav.primary")}</SheetTitle>
          </SheetHeader>
          <nav className="space-y-0.5">
            {visible.map((group) => {
              const Icon = group.icon;
              const label = t(group.labelKey);
              const active = groupOwnsPath(group, location.pathname, location.search);
              const expanded = openGroups[group.id] ?? false;
              if (!group.children?.length) {
                const leafBadge = mobileBadgeForHref(group.href || "/dashboard", active);
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => {
                      navigate(group.href || "/dashboard");
                      setMenuOpen(false);
                    }}
                    className={cn(navItemClass(active, false), "w-full")}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className={ICON} />
                    <span className="min-w-0 flex-1 truncate text-start">{label}</span>
                    <NavAttentionBadge count={leafBadge} />
                  </button>
                );
              }
              const groupBadge = (group.children || []).reduce((sum, child) => {
                const childActive = leafMatches(location.pathname, location.search, child);
                return sum + mobileBadgeForHref(child.href, childActive);
              }, 0);
              return (
                <div key={group.id}>
                  <button
                    type="button"
                    onClick={() => setOpenGroups(expanded ? {} : { [group.id]: true })}
                    className={cn(navItemClass(active, false), "w-full")}
                    aria-expanded={expanded}
                  >
                    <Icon className={ICON} />
                    <span className="flex-1 text-start truncate">{label}</span>
                    {!expanded ? <NavAttentionBadge count={groupBadge} /> : null}
                    {expanded ? <ChevronDown className="h-4 w-4 opacity-60" /> : <ChevronRight className="h-4 w-4 opacity-60" />}
                  </button>
                  {expanded ? (
                    <div className="ms-4 mt-0.5 space-y-0.5 border-s border-sidebar-border ps-3">
                      {(group.children || []).map((child) => {
                        const childActive = leafMatches(location.pathname, location.search, child);
                        const childBadge = mobileBadgeForHref(child.href, childActive);
                        return (
                          <button
                            key={child.href + child.labelKey}
                            type="button"
                            onClick={() => {
                              navigate(child.href);
                              setMenuOpen(false);
                            }}
                            className={navChildItemClass(childActive)}
                            aria-current={childActive ? "page" : undefined}
                          >
                            <span className="min-w-0 flex-1 truncate">{t(child.labelKey)}</span>
                            <NavAttentionBadge count={childBadge} />
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default IntentRail;
