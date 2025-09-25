import { useState } from "react";
import { Outlet } from "react-router-dom";
import { 
  BarChart3, 
  Calendar, 
  MessageSquare, 
  Package, 
  Settings,
  ChefHat,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Overview", href: "/", icon: BarChart3 },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Staff", href: "/staff", icon: Calendar },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "AI Assistant", href: "/assistant", icon: MessageSquare },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const currentPath = window.location.pathname;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 bg-card border-r shadow-soft transition-all duration-300",
        sidebarOpen ? "w-64" : "w-16"
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <ChefHat className="w-4 h-4 text-white" />
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Mizan
                </h1>
                <p className="text-xs text-muted-foreground">Restaurant OS</p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-8 h-8 p-0"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="mt-4 px-2 space-y-1">
          {navigation.map((item) => {
            const isActive = currentPath === item.href;
            return (
              <a
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                  isActive
                    ? "bg-gradient-primary text-white shadow-soft"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                  !sidebarOpen && "justify-center"
                )}
              >
                <item.icon className={cn("w-5 h-5", sidebarOpen && "mr-3")} />
                {sidebarOpen && item.name}
              </a>
            );
          })}
        </nav>

        {/* User Profile */}
        {sidebarOpen && (
          <div className="absolute bottom-4 left-2 right-2 p-3 bg-secondary rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-white">JD</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">John Doe</p>
                <p className="text-xs text-muted-foreground">Restaurant Manager</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className={cn(
        "transition-all duration-300",
        sidebarOpen ? "ml-64" : "ml-16"
      )}>
        <header className="bg-card border-b shadow-soft">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Dashboard</h2>
                <p className="text-muted-foreground">Manage your restaurant operations</p>
              </div>
              <div className="flex items-center space-x-4">
                <Button variant="outline">Today's Report</Button>
                <Button className="bg-gradient-primary hover:bg-primary/90">
                  Generate Lists
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}