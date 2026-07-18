import React, { useCallback } from "react";
import { NavLink, Outlet, useNavigate, useOutletContext } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  HeartPulse,
  ScrollText,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlatformMe } from "@/lib/platformApi";
import BrandLogo from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LiveDateTime } from "@/components/LiveDateTime";
import { UserAvatarMenu } from "@/components/layout/UserAvatarMenu";

const NAV = [
  { to: "/admin", end: true, label: "Overview", icon: LayoutDashboard },
  { to: "/admin/tenants", label: "Tenants", icon: Building2 },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/operators", label: "Operators", icon: Shield },
  { to: "/admin/billing", label: "Billing", icon: CreditCard },
  { to: "/admin/health", label: "Health", icon: HeartPulse },
  { to: "/admin/audit", label: "Audit", icon: ScrollText },
];

export default function PlatformAdminLayout() {
  const { me } = useOutletContext<{ me: PlatformMe }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleOpsLogout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    queryClient.removeQueries({ queryKey: ["platform-me"] });
    window.location.assign("/admin");
  }, [queryClient]);

  const roleSubtitle = me?.is_superuser
    ? "Platform superuser"
    : "Platform operator";

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/80 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-[2000] bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => navigate("/admin")}
              className="flex items-center gap-3 rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#00E676]/30"
              aria-label="Mizan Ops home"
            >
              <BrandLogo size="sm" />
              <div className="text-left leading-tight">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#00C853]">
                  Mizan Ops
                </p>
                <h1 className="text-lg sm:text-xl font-bold select-none text-slate-900 dark:text-white">
                  Platform Admin
                </h1>
              </div>
            </button>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <LiveDateTime showTime={false} />
              <ThemeToggle />
              <UserAvatarMenu
                variant="icon"
                userOverride={me}
                subtitle={roleSubtitle}
                onLogout={handleOpsLogout}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside className="w-[15.5rem] shrink-0 flex flex-col border-r border-slate-200 bg-white text-slate-900 shadow-[4px_0_24px_-12px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-gradient-to-b dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100 dark:shadow-[4px_0_24px_-12px_rgba(15,23,42,0.45)]">
          <nav className="flex-1 p-3 pt-4 space-y-1.5 overflow-auto">
            {NAV.map(({ to, end, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "group flex items-center gap-3 rounded-xl px-3.5 py-3 text-[14px] font-semibold transition-all",
                    isActive
                      ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25 [&_span]:bg-slate-950/15 [&_span]:text-slate-950"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 [&_span]:bg-slate-100 [&_span]:text-slate-500 hover:[&_span]:bg-emerald-50 hover:[&_span]:text-emerald-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white dark:[&_span]:bg-white/5 dark:[&_span]:text-slate-400 dark:hover:[&_span]:bg-white/10 dark:hover:[&_span]:text-emerald-300",
                  )
                }
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors">
                  <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2.25} />
                </span>
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto border-t border-slate-200 p-4 dark:border-white/10">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              Signed in
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900 truncate dark:text-white">
              {[me?.first_name, me?.last_name].filter(Boolean).join(" ") ||
                me?.email?.split("@")[0] ||
                "Operator"}
            </p>
            <p className="text-xs text-slate-500 truncate dark:text-slate-400">{me?.email}</p>
          </div>
        </aside>

        <main className="flex-1 min-w-0 overflow-auto relative">
          <div
            className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-40"
            style={{
              background:
                "radial-gradient(ellipse 800px 400px at 10% -10%, rgba(0,230,118,0.08), transparent 60%)",
            }}
          />
          <div className="relative">
            <Outlet context={{ me }} />
          </div>
        </main>
      </div>
    </div>
  );
}
