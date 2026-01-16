import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/use-auth";
import { AuthContextType } from "../contexts/AuthContext.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3,
  Users,
  FileText,
  Settings,
  Sparkles,
  Calendar,
  ClipboardCheck,
  Heart,
  AlertCircle,
  Clock,
  TrendingUp,
  Package,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { Badge } from "@/components/ui/badge";

type AppItem = {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  gradient: string;
  description: string;
  roles?: string[];
  comingSoon?: boolean;
  nameKey?: string;
  descKey?: string;
};

const apps: AppItem[] = [
  {
    name: "PROCESSES & TASKS",
    href: "/dashboard/processes-tasks-app",
    icon: ClipboardCheck,
    gradient: "bg-teal-500",
    description: "Create and manage processes and tasks",
    nameKey: "app.tasks",
    descKey: "app.tasks.desc",
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    name: "STAFF",
    href: "/dashboard/staff-app",
    icon: Users,
    gradient: "bg-violet-500",
    description: "Add and manage staff",
    nameKey: "app.staff",
    descKey: "app.staff.desc",
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"],
  },
  {
    name: "CHECKLISTS & INCIDENCES",
    href: "/dashboard/analytics", // Keeping same href as "Dashboards" for now, or should it be different? Screenshot implies this replaces Dashboards entry visually
    icon: BarChart3,
    gradient: "bg-blue-500",
    description: "View checklists and incident reports",
    nameKey: "app.analytics",
    descKey: "app.analytics.desc",
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    name: "STAFF SCHEDULES",
    href: "/dashboard/shift-reviews",
    icon: FileText,
    gradient: "bg-emerald-500",
    description: "View and filter staff schedules",
    nameKey: "app.shift_reviews",
    descKey: "app.shift_reviews.desc",
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"],
  },
  {
    name: "SETTINGS",
    href: "/dashboard/settings",
    icon: Settings,
    gradient: "bg-amber-500",
    description: "Configure your system",
    nameKey: "app.settings",
    descKey: "app.settings.desc",
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth() as AuthContextType;
  const { t } = useLanguage();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f1419] p-4 md:p-6 lg:p-8 font-sans antialiased text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header Section */}
        <header className="mb-2">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {greeting}, {user?.first_name || ""}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1 italic">
            What needs your attention today?
          </p>
        </header>

        {/* Top Row: 3 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Staffing & Coverage */}
          <Card className="border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 hover:shadow-md transition-all duration-300 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 px-6 pt-6">
              <CardTitle className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Staffing & Coverage
              </CardTitle>
              <Users className="w-4 h-4 text-slate-300 dark:text-slate-600" />
            </CardHeader>
            <CardContent className="space-y-4 pt-2 pb-6 px-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  <span className="font-medium text-slate-800 dark:text-white">2 no-shows</span> for morning shift
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500 mt-0.5 shrink-0" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Evening shift gap: <span className="font-medium text-slate-800 dark:text-white">1.5 hrs</span> refilling
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Users className="w-4 h-4 text-slate-400 dark:text-slate-500 mt-0.5 shrink-0" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  OT Risk: <span className="font-medium text-slate-800 dark:text-white">{user?.first_name || ""}</span> (38/40h)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Operations & Forecast */}
          <Card className="border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 hover:shadow-md transition-all duration-300 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 px-6 pt-6">
              <CardTitle className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Operations & Forecast
              </CardTitle>
              <Calendar className="w-4 h-4 text-slate-300 dark:text-slate-600" />
            </CardHeader>
            <CardContent className="space-y-4 pt-2 pb-6 px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-emerald-500" />
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    <span className="font-medium text-slate-800 dark:text-white">2 negative reviews</span> today
                  </p>
                </div>
                <Badge variant="outline" className="text-slate-300 dark:text-slate-500 border-none text-[10px] font-medium h-4 px-0">2.5 AVG</Badge>
              </div>
              <div className="flex items-center gap-3">
                <TrendingUp className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Forecast: <span className="font-medium text-slate-800 dark:text-white">Traffic ↑ 40%</span> (Sat)
                </p>
              </div>
              <div className="flex items-center gap-3 font-medium">
                <Package className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Delivery: <span className="font-medium text-slate-800 dark:text-white">Sysco</span> (Tomorrow)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Staff Wellbeing */}
          <Card className="border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 hover:shadow-md transition-all duration-300 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 px-6 pt-6">
              <CardTitle className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Staff Wellbeing
              </CardTitle>
              <Heart className="w-4 h-4 text-slate-300 dark:text-slate-600" />
            </CardHeader>
            <CardContent className="space-y-4 pt-2 pb-6 px-6">
              <div className="bg-red-50 dark:bg-red-900/30 p-2.5 rounded-xl">
                <p className="text-sm text-red-600 dark:text-red-400 font-medium truncate">Ahmed: 6 shifts in 7 days (Risk)</p>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <p className="text-sm font-medium text-slate-800 dark:text-white">3 swap requests</p>
                </div>
                <span className="text-[10px] text-slate-300 dark:text-slate-500 tracking-widest uppercase">NEW</span>
              </div>
              <div className="flex items-center gap-3 font-medium">
                <Users className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  <span className="font-medium text-slate-800 dark:text-white">New hire: Sara</span> (Day 1)
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Second Row: 2 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* MIZAN AI INSIGHTS */}
          <Card className="border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 hover:shadow-md transition-all duration-300 rounded-2xl">
            <CardHeader className="pb-2 px-6 pt-6">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <CardTitle className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Mizan AI Insights
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 px-6 pb-6 pt-2">
              <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                <div className="w-2 h-2 rounded-full bg-red-400 shrink-0"></div>
                <span className="text-sm text-slate-800 dark:text-white leading-tight">Understaffing risk tonight: 7-9pm</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></div>
                <span className="text-sm text-slate-800 dark:text-white leading-tight">Reorder: Chicken Breast (Low stock)</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0"></div>
                <span className="text-sm text-slate-800 dark:text-white leading-tight">Staff morale drop detected (FOH)</span>
              </div>
            </CardContent>
          </Card>

          {/* Tasks Due Today */}
          <Card className="border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 hover:shadow-md transition-all duration-300 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-6 pt-6">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Tasks Due Today
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-red-500 border-none px-0 text-[10px] font-bold h-4">1 OVERDUE</Badge>
            </CardHeader>
            <CardContent className="space-y-4 px-6 pb-6 pt-2">
              {[
                { label: "Walk-in cooler maintenance", status: "OVERDUE", color: "text-red-500 font-bold" },
                { label: "Deep clean fryers", status: "BY 3PM", color: "text-slate-500 dark:text-slate-400 font-medium" },
                { label: "Inventory spot check", status: "BY 5PM", color: "text-slate-500 dark:text-slate-400 font-medium" },
              ].map((task, i) => (
                <div key={i} className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 p-1 -mx-1 rounded-lg transition-colors">
                  <span className="text-sm text-slate-700 dark:text-slate-300 truncate pr-4">{task.label}</span>
                  <span className={`text-[10px] whitespace-nowrap tracking-wider ${task.color}`}>{task.status}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Apps Gallery - Theme Responsive */}
        <section className="pt-4 md:pt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {apps
            .filter((app) => !app.roles || hasRole(app.roles))
            .map((app) => (
              <div
                key={app.name}
                onClick={() => navigate(app.href)}
                className="bg-white dark:bg-slate-900 px-5 py-4 rounded-[2rem] shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer group flex flex-col items-center text-center gap-4 relative overflow-hidden border border-slate-50 dark:border-slate-800"
              >
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-[0.05] transition-opacity ${app.gradient}`}></div>

                <div className={`w-14 h-14 rounded-[1.5rem] ${app.gradient} flex items-center justify-center shrink-0 group-hover:rotate-12 transition-transform duration-500 shadow-lg shadow-black/10`}>
                  <app.icon className="w-7 h-7 text-white" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex flex-col items-center">
                    <h3 className="text-sm md:text-base font-semibold text-slate-900 dark:text-slate-50 tracking-tight leading-snug">
                      {app.nameKey ? t(app.nameKey) : app.name}
                    </h3>
                    <p className="text-[11px] md:text-xs text-slate-600 dark:text-slate-400 font-medium mt-1 leading-snug">
                      {app.descKey ? t(app.descKey) : app.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
        </section>

      </div>
    </div>
  );
}
