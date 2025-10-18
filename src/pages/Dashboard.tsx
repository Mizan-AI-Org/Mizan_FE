import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
<<<<<<< HEAD
import {
  BarChart3,
  CreditCard,
  UtensilsCrossed,
  BookOpen,
=======
import { 
  BarChart3, 
  CreditCard, 
  UtensilsCrossed, 
  BookOpen, 
>>>>>>> refs/remotes/origin/main
  LayoutGrid,
  Package,
  Calendar,
  MessageSquare,
  Settings,
  LogOut,
  User,
<<<<<<< HEAD
  ChefHat,
  Users,
  Brain,
=======
  ChefHat
>>>>>>> refs/remotes/origin/main
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const apps = [
<<<<<<< HEAD
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
=======
  { name: "Dashboards", href: "/dashboard/analytics", icon: BarChart3, gradient: "bg-gradient-to-br from-blue-500 to-cyan-500", description: "View analytics and insights" },
  { name: "Point of Sale", href: "/dashboard/pos", icon: CreditCard, gradient: "bg-gradient-to-br from-pink-500 to-rose-500", description: "Process orders and payments" },
  { name: "Kitchen Display", href: "/dashboard/kitchen", icon: UtensilsCrossed, gradient: "bg-gradient-to-br from-purple-500 to-pink-500", description: "Manage kitchen orders" },
  { name: "Inventory", href: "/dashboard/inventory", icon: Package, gradient: "bg-gradient-to-br from-orange-500 to-amber-500", description: "Track stock levels" },
  { name: "Menu", href: "/dashboard/menu", icon: BookOpen, gradient: "bg-gradient-to-br from-green-500 to-emerald-500", description: "Update menu items" },
  { name: "Tables", href: "/dashboard/floors", icon: LayoutGrid, gradient: "bg-gradient-to-br from-indigo-500 to-blue-500", description: "Manage floor layouts" },
  { name: "Staff", href: "/dashboard/staff", icon: Calendar, gradient: "bg-gradient-to-br from-violet-500 to-purple-500", description: "Schedule and manage staff" },
  { name: "AI Assistant", href: "/dashboard/assistant", icon: MessageSquare, gradient: "bg-gradient-to-br from-cyan-500 to-blue-500", description: "Get intelligent assistance" },
  { name: "Settings", href: "/dashboard/settings", icon: Settings, gradient: "bg-gradient-to-br from-amber-500 to-orange-500", description: "Configure your system" },
>>>>>>> refs/remotes/origin/main
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b shadow-soft">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-elegant">
                <ChefHat className="w-5 h-5 text-white" />
              </div>
              <div>
<<<<<<< HEAD
                <h1 className="text-3xl font-bold">Mizan </h1>
                <p className="text-sm text-muted-foreground">
                  {profile?.restaurant_name || "Your"}
=======
                <h1 className="text-2xl font-bold">Mizan Restaurant OS</h1>
                <p className="text-sm text-muted-foreground">
                  {profile?.restaurant_name || 'Welcome back'}
>>>>>>> refs/remotes/origin/main
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
<<<<<<< HEAD

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-10 w-10 rounded-full p-0"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-white">
                        {profile?.full_name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("") || "U"}
=======
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-10 w-10 rounded-full p-0">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-white">
                        {profile?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
>>>>>>> refs/remotes/origin/main
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
<<<<<<< HEAD
                    <p className="text-sm font-medium">
                      {profile?.full_name || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {profile?.restaurant_name || "Restaurant"}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => navigate("/dashboard/settings")}
                  >
=======
                    <p className="text-sm font-medium">{profile?.full_name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{profile?.restaurant_name || 'Restaurant'}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/dashboard/settings')}>
>>>>>>> refs/remotes/origin/main
                    <User className="mr-2 h-4 w-4" />
                    Profile Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
<<<<<<< HEAD
                  <DropdownMenuItem
                    onClick={signOut}
                    className="text-destructive"
                  >
=======
                  <DropdownMenuItem onClick={signOut} className="text-destructive">
>>>>>>> refs/remotes/origin/main
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* App Grid */}
      <main className="max-w-7xl mx-auto px-6 py-12">
<<<<<<< HEAD
        <div className="mb-8"></div>

=======
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Restaurant Operations</h2>
          <p className="text-muted-foreground">Select an application to get started</p>
        </div>
        
>>>>>>> refs/remotes/origin/main
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {apps.map((app) => (
            <Card
              key={app.name}
              onClick={() => navigate(app.href)}
              className="group relative overflow-hidden border-border/50 hover:border-primary/50 shadow-soft hover:shadow-elegant transition-all duration-300 hover:scale-[1.02] cursor-pointer bg-card/50 backdrop-blur-sm"
            >
              <CardContent className="p-6">
                <div className="relative z-10">
<<<<<<< HEAD
                  <div
                    className={`w-16 h-16 rounded-2xl ${app.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                  >
=======
                  <div className={`w-16 h-16 rounded-2xl ${app.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
>>>>>>> refs/remotes/origin/main
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
