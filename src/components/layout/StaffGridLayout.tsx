import React, { useMemo, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { ChefHat, Bell, LogOut, Search, User as UserIcon, SunMoon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SafetyNotifications from "@/components/safety/SafetyNotifications";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ThemeToggle";
import BackLink from "@/components/BackLink";
import BrandLogo from "@/components/BrandLogo";

// Grid-based staff layout using a top navbar and main content area.
// Mirrors admin layout spacing and components, while switching to grid navigation.
const StaffGridLayout: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [query, setQuery] = useState("");

  const userInitials = useMemo(() => {
    const f = user?.first_name?.[0] ?? "U";
    const l = user?.last_name?.[0] ?? "";
    return `${f}${l}`;
  }, [user]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Branding */}
            <div className="flex items-center gap-3">
              <BrandLogo size="sm" />
              <div className="flex flex-col">
                <h1 className="text-2xl font-bold leading-tight select-none cursor-default">Mizan</h1>
              </div>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-md hidden md:flex items-center gap-2">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search apps"
                  aria-label="Search applications"
                  className="pl-9"
                />
              </div>
            </div>

            {/* Notifications and Profile */}
            <div className="flex items-center gap-3 text-sm">
              <SafetyNotifications />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-10 w-10 rounded-full p-0" aria-label="User profile menu">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-white">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 text-sm">
                  <div className="px-4 py-2">
                    <p className="text-sm font-medium">
                      {user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : "User"}
                    </p>
                    <p className="text-xs text-muted-foreground">{user?.email ?? ""}</p>
                    <p className="text-xs text-muted-foreground capitalize">{user?.role ? user.role.toLowerCase().replace(/_/g, " ") : ""}</p>
                  </div>
                  {/* Design guideline: avoid dropdowns with <=2 items. Include appearance toggle here. */}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><SunMoon className="h-4 w-4" /> Appearance</span>
                    <ThemeToggle />
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/dashboard/settings')} aria-label="Profile settings">
                    <UserIcon className="mr-2 h-4 w-4" /> Profile Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout} className="text-destructive" aria-label="Sign out">
                    <LogOut className="mr-2 h-4 w-4" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        {/* Page-level back navigation */}
        {/* Show when not on staff dashboard */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3">
          {window.location.pathname !== '/staff-dashboard' && (
            <BackLink fallbackPath="/staff-dashboard">Back to Dashboard</BackLink>
          )}
        </div>
        <Outlet context={{ query }} />
      </main>
    </div>
  );
};

export default StaffGridLayout;
