import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/use-auth";
import { AuthContextType } from "../contexts/AuthContext.types";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart3,
  UtensilsCrossed,
  BookOpen,
  LayoutGrid,
  Package,
  Settings,
  Users,
  Brain,
  FileText,
  Zap,
} from "lucide-react";

type AppItem = {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  gradient: string;
  description: string;
  roles?: string[];
  comingSoon?: boolean;
};

const apps: AppItem[] = [
  {
    name: "Dashboards",
    href: "/dashboard/analytics",
    icon: BarChart3,
    gradient: "bg-gradient-to-br from-blue-500 to-cyan-500",
    description: "View analytics and insights",
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    name: "Staff",
    href: "/dashboard/staff",
    icon: Users,
    gradient: "bg-gradient-to-br from-violet-500 to-purple-500",
    description: "Schedule and manage staff",
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"],
  },
  // {
  //   name: "Tasks",
  //   href: "/dashboard/tasks",
  //   icon: Clock,
  //   gradient: "bg-gradient-to-br from-rose-500 to-pink-500",
  //   description: "Manage daily tasks",
  // },
  {
    name: "Tasks",
    href: "/dashboard/task-templates",
    icon: FileText,
    gradient: "bg-gradient-to-br from-teal-500 to-cyan-500",
    description: "Create and manage tasks",
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    name: "Kitchen Display",
    href: "/dashboard/kitchen",
    icon: UtensilsCrossed,
    gradient: "bg-gradient-to-br from-purple-500 to-pink-500",
    description: "Manage kitchen orders",
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "CHEF"],
    comingSoon: true,
  },
  {
    name: "Inventory",
    href: "/dashboard/inventory",
    icon: Package,
    gradient: "bg-gradient-to-br from-orange-500 to-amber-500",
    description: "Track stock levels",
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"],
    comingSoon: true,
  },
  {
    name: "Menu",
    href: "/dashboard/menu",
    icon: BookOpen,
    gradient: "bg-gradient-to-br from-green-500 to-emerald-500",
    description: "Update menu items",
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"],
    comingSoon: true,
  },
  {
    name: "Tables",
    href: "/dashboard/floors",
    icon: LayoutGrid,
    gradient: "bg-gradient-to-br from-indigo-500 to-blue-500",
    description: "Manage floor layouts",
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "WAITER"],
    comingSoon: true,
  },
  {
    name: "AI Assistant",
    href: "/dashboard/assistant",
    icon: Brain,
    gradient: "bg-gradient-to-br from-cyan-500 to-blue-500",
    description: "Get intelligent assistance",
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    gradient: "bg-gradient-to-br from-amber-500 to-orange-500",
    description: "Configure your system",
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth() as AuthContextType;
  const { hasRole } = useAuth() as AuthContextType;

  console.log("Dashboard User:", user);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* App Grid */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8"></div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {apps
            .filter((app) => !app.roles || hasRole(app.roles))
            .map((app) => (
              <Card
                key={app.name}
                onClick={() => navigate(app.href)}
                className="group relative overflow-hidden border-border/50 hover:border-primary/50 shadow-soft hover:shadow-elegant transition-all duration-300 hover:scale-[1.02] cursor-pointer bg-card/50 backdrop-blur-sm"
              >
                {app.comingSoon && (
                  <div className="absolute -right-8 top-4 rotate-45 bg-gradient-to-r from-primary to-primary/80 px-10 py-1 text-xs font-bold text-primary-foreground shadow-lg z-20">
                    Coming Soon! ✨
                  </div>
                )}
                <CardContent className="p-6">
                  <div className="relative z-10">
                    <div
                      className={`w-16 h-16 rounded-2xl ${app.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                    >
                      <app.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                      {app.name}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {app.description}
                    </p>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </CardContent>
              </Card>
            ))}
        </div>
      </main>
    </div>
  );
}
