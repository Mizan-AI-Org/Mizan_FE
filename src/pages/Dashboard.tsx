import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { 
  BarChart3, 
  CreditCard, 
  UtensilsCrossed, 
  BookOpen, 
  LayoutGrid,
  Package,
  Calendar,
  MessageSquare,
  Settings,
  LogOut,
  User,
  ChefHat,
  Shield
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

type AppRole = 'owner' | 'manager' | 'server' | 'chef' | 'cleaner';

interface AppDefinition {
  name: string;
  href: string;
  icon: any;
  gradient: string;
  description: string;
  roles: readonly AppRole[];
}

const apps: AppDefinition[] = [
  { 
    name: "Dashboards", 
    href: "/dashboard/analytics", 
    icon: BarChart3, 
    gradient: "bg-gradient-to-br from-blue-500 to-cyan-500", 
    description: "View analytics and insights",
    roles: ['owner', 'manager'] as const
  },
  { 
    name: "Point of Sale", 
    href: "/dashboard/pos", 
    icon: CreditCard, 
    gradient: "bg-gradient-to-br from-pink-500 to-rose-500", 
    description: "Process orders and payments",
    roles: ['owner', 'manager', 'server'] as const
  },
  { 
    name: "Kitchen Display", 
    href: "/dashboard/kitchen", 
    icon: UtensilsCrossed, 
    gradient: "bg-gradient-to-br from-purple-500 to-pink-500", 
    description: "Manage kitchen orders",
    roles: ['owner', 'manager', 'chef'] as const
  },
  { 
    name: "Inventory", 
    href: "/dashboard/inventory", 
    icon: Package, 
    gradient: "bg-gradient-to-br from-orange-500 to-amber-500", 
    description: "Track stock levels",
    roles: ['owner', 'manager'] as const
  },
  { 
    name: "Menu", 
    href: "/dashboard/menu", 
    icon: BookOpen, 
    gradient: "bg-gradient-to-br from-green-500 to-emerald-500", 
    description: "Update menu items",
    roles: ['owner', 'manager'] as const
  },
  { 
    name: "Tables", 
    href: "/dashboard/floors", 
    icon: LayoutGrid, 
    gradient: "bg-gradient-to-br from-indigo-500 to-blue-500", 
    description: "Manage floor layouts",
    roles: ['owner', 'manager'] as const
  },
  { 
    name: "Staff Scheduling", 
    href: "/dashboard/staff", 
    icon: Calendar, 
    gradient: "bg-gradient-to-br from-violet-500 to-purple-500", 
    description: "Schedule and manage staff",
    roles: ['owner', 'manager'] as const
  },
  { 
    name: "Staff Management", 
    href: "/dashboard/staff-management", 
    icon: Shield, 
    gradient: "bg-gradient-to-br from-indigo-600 to-violet-600", 
    description: "Create accounts and assign roles",
    roles: ['owner', 'manager'] as const
  },
  { 
    name: "AI Assistant", 
    href: "/dashboard/assistant", 
    icon: MessageSquare, 
    gradient: "bg-gradient-to-br from-cyan-500 to-blue-500", 
    description: "Get intelligent assistance",
    roles: ['owner', 'manager'] as const
  },
  { 
    name: "Settings", 
    href: "/dashboard/settings", 
    icon: Settings, 
    gradient: "bg-gradient-to-br from-amber-500 to-orange-500", 
    description: "Configure your system",
    roles: ['owner', 'manager', 'server', 'chef', 'cleaner'] as const
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile, userRoles, signOut } = useAuth();

  const filteredApps = apps.filter(app => 
    userRoles.some(ur => app.roles.includes(ur.role as AppRole))
  );

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
                <h1 className="text-2xl font-bold">Mizan Restaurant OS</h1>
                <p className="text-sm text-muted-foreground">
                  {profile?.restaurant_name || 'Welcome back'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-10 w-10 rounded-full p-0">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-white">
                        {profile?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{profile?.full_name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{profile?.restaurant_name || 'Restaurant'}</p>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {userRoles.map((ur, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs capitalize">
                          {ur.role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/dashboard/settings')}>
                    <User className="mr-2 h-4 w-4" />
                    Profile Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive">
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
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Restaurant Operations</h2>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground">Select an application to get started</p>
            {userRoles.length > 0 && (
              <span className="text-sm text-muted-foreground">•</span>
            )}
            <div className="flex gap-1">
              {userRoles.map((ur, idx) => (
                <Badge key={idx} variant="outline" className="capitalize text-xs">
                  {ur.role}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredApps.map((app) => (
            <Card
              key={app.name}
              onClick={() => navigate(app.href)}
              className="group relative overflow-hidden border-border/50 hover:border-primary/50 shadow-soft hover:shadow-elegant transition-all duration-300 hover:scale-[1.02] cursor-pointer bg-card/50 backdrop-blur-sm"
            >
              <CardContent className="p-6">
                <div className="relative z-10">
                  <div className={`w-16 h-16 rounded-2xl ${app.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
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

        {filteredApps.length === 0 && (
          <div className="text-center py-12">
            <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No Applications Available</h3>
            <p className="text-muted-foreground">
              Please contact your restaurant owner to assign you roles and permissions.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
