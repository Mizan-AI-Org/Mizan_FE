import React from 'react';
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { ChefHat, ArrowLeft, Home, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from '../../hooks/use-auth';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AuthContextType } from "@/contexts/AuthContext.types";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Profile", href: "/dashboard/settings", icon: User },
];

const DashboardLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth() as AuthContextType;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden">
                    <Home className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-elegant">
                      <ChefHat className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="text-xl font-bold">Mizan</h1>
                  </div>
                  <nav className="space-y-1">
                    {navItems.map((item) => (
                      <Button
                        key={item.name}
                        variant={location.pathname === item.href ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => navigate(item.href)}
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.name}
                      </Button>
                    ))}
                    <DropdownMenuItem
                      onClick={logout}
                      className="w-full justify-start text-destructive cursor-pointer"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </nav>
                </SheetContent>
              </Sheet>
              <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-elegant hidden lg:flex">
                <ChefHat className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold hidden lg:block">Mizan</h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden lg:flex items-center gap-2">
                {navItems.map((item) => (
                  <Button
                    key={item.name}
                    variant={location.pathname === item.href ? "secondary" : "ghost"}
                    onClick={() => navigate(item.href)}
                  >
                    {item.name}
                  </Button>
                ))}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-10 w-10 rounded-full p-0">
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
                  <div className="px-4 py-2">
                    <p className="text-sm font-medium">
                      {user?.first_name && user?.last_name
                        ? `${user.first_name} ${user.last_name}`
                        : "User"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user?.email || ""}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {user?.role ? user.role.toLowerCase().replace(/_/g, ' ') : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user?.restaurant?.name || "Restaurant"}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/dashboard/settings")}>
                    <User className="mr-2 h-4 w-4" />
                    Profile Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
