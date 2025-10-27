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
  Clock,
  Zap,
} from "lucide-react";

const apps = [
  {
    name: "Dashboards",
    href: "/dashboard/analytics",
    icon: BarChart3,
    gradient: "bg-gradient-to-br from-blue-500 to-cyan-500",
    description: "View analytics and insights",
  },
  {
    name: "Staff",
    href: "/dashboard/staff",
    icon: Users,
    gradient: "bg-gradient-to-br from-violet-500 to-purple-500",
    description: "Schedule and manage staff",
  },
  {
    name: "Tasks",
    href: "/dashboard/tasks",
    icon: Clock,
    gradient: "bg-gradient-to-br from-rose-500 to-pink-500",
    description: "Manage daily tasks",
  },
  {
    name: "Kitchen Display",
    href: "/dashboard/kitchen",
    icon: UtensilsCrossed,
    gradient: "bg-gradient-to-br from-purple-500 to-pink-500",
    description: "Manage kitchen orders",
  },
  {
    name: "Inventory",
    href: "/dashboard/inventory",
    icon: Package,
    gradient: "bg-gradient-to-br from-orange-500 to-amber-500",
    description: "Track stock levels",
  },
  {
    name: "Menu",
    href: "/dashboard/menu",
    icon: BookOpen,
    gradient: "bg-gradient-to-br from-green-500 to-emerald-500",
    description: "Update menu items",
  },
  {
    name: "Tables",
    href: "/dashboard/floors",
    icon: LayoutGrid,
    gradient: "bg-gradient-to-br from-indigo-500 to-blue-500",
    description: "Manage floor layouts",
  },
  {
    name: "AI Assistant",
    href: "/dashboard/assistant",
    icon: Brain,
    gradient: "bg-gradient-to-br from-cyan-500 to-blue-500",
    description: "Get intelligent assistance",
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    gradient: "bg-gradient-to-br from-amber-500 to-orange-500",
    description: "Configure your system",
  },
  {
    name: "Advanced Settings",
    href: "/dashboard/advanced-settings",
    icon: Zap,
    gradient: "bg-gradient-to-br from-teal-500 to-cyan-500",
    description: "Geolocation, POS & AI",
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth() as AuthContextType;

  console.log("Dashboard User:", user);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      {/* <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b shadow-soft">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-elegant">
                <ChefHat className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Mizan </h1>
                <p className="text-sm text-muted-foreground">
                  {user?.restaurant?.name || "Your"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-10 w-10 rounded-full p-0"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-white">
                        {user?.first_name && user?.last_name
                          ? `${user.first_name[0]}${user.last_name[0]}`
                          : "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">
                      {user?.first_name && user?.last_name
                        ? `${user.first_name} ${user.last_name}`
                        : "User"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user?.restaurant?.name || "Restaurant"}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => navigate("/dashboard/settings")}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Profile Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={logout}
                    className="text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header> */}

      {/* App Grid */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8"></div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {apps.map((app) => (
            <Card
              key={app.name}
              onClick={() => navigate(app.href)}
              className="group relative overflow-hidden border-border/50 hover:border-primary/50 shadow-soft hover:shadow-elegant transition-all duration-300 hover:scale-[1.02] cursor-pointer bg-card/50 backdrop-blur-sm"
            >
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
