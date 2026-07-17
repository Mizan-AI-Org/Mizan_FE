import React from "react";
import { NavLink, Outlet, useNavigate, useOutletContext } from "react-router-dom";
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
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
              <UserAvatarMenu variant="icon" />
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside className="w-56 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
          <nav className="flex-1 p-3 space-y-1 overflow-auto">
            {NAV.map(({ to, end, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                    isActive
                      ? "bg-[#00E676]/15 text-[#007A3D] dark:text-[#00E676] ring-1 ring-[#00E676]/20"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100",
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </NavLink>
            ))}
          </nav>
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
