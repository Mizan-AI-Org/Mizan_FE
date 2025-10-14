import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  User
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const apps = [
  { name: "Dashboards", href: "/dashboard/analytics", icon: BarChart3, gradient: "from-blue-500 to-cyan-500" },
  { name: "Point of Sale", href: "/dashboard/pos", icon: CreditCard, gradient: "from-pink-500 to-rose-500" },
  { name: "Kitchen Display", href: "/dashboard/kitchen", icon: UtensilsCrossed, gradient: "from-purple-500 to-pink-500" },
  { name: "Inventory", href: "/dashboard/inventory", icon: Package, gradient: "from-orange-500 to-amber-500" },
  { name: "Menu", href: "/dashboard/menu", icon: BookOpen, gradient: "from-green-500 to-emerald-500" },
  { name: "Tables", href: "/dashboard/floors", icon: LayoutGrid, gradient: "from-indigo-500 to-blue-500" },
  { name: "Staff", href: "/dashboard/staff", icon: Calendar, gradient: "from-violet-500 to-purple-500" },
  { name: "AI Assistant", href: "/dashboard/assistant", icon: MessageSquare, gradient: "from-cyan-500 to-blue-500" },
  { name: "Settings", href: "/dashboard/settings", icon: Settings, gradient: "from-amber-500 to-orange-500" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">Mizan</h1>
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
      </header>

      {/* App Grid */}
      <main className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
          {apps.map((app) => (
            <button
              key={app.name}
              onClick={() => navigate(app.href)}
              className="group flex flex-col items-center gap-4 p-6 rounded-2xl bg-slate-800/50 border border-white/10 hover:bg-slate-800/70 hover:border-white/20 transition-all duration-300 hover:scale-105"
            >
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${app.gradient} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300`}>
                <app.icon className="w-10 h-10 text-white" />
              </div>
              <span className="text-sm font-medium text-white text-center">
                {app.name}
              </span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
