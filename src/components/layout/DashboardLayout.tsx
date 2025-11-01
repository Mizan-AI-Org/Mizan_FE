import React from 'react';
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { LogOut, User, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNotifications } from '../../hooks/useNotifications';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// Removed mobile sidebar Sheet components per design update
import { AuthContextType } from "@/contexts/AuthContext.types";
import { ThemeToggle } from "@/components/ThemeToggle";
import BackLink from "@/components/BackLink";
import BrandLogo from "@/components/BrandLogo";

const DashboardLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth() as AuthContextType;
  const { notifications, isConnected, markAllAsRead, markAsRead } = useNotifications();

  // Derive a safe restaurant label from various possible user shapes without using `any`
  const restaurantLabel: string = (() => {
    const dataName = user?.restaurant_data?.name;
    if (typeof dataName === "string" && dataName.length > 0) return dataName;
    const restaurantRaw = user?.restaurant;
    if (typeof restaurantRaw === "string" && restaurantRaw.length > 0) return restaurantRaw;
    if (typeof restaurantRaw === "object" && restaurantRaw !== null) {
      const name = (restaurantRaw as { name?: unknown }).name;
      if (typeof name === "string" && (name as string).length > 0) return name as string;
    }
    return "Restaurant";
  })();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Removed mobile sidebar trigger per design */}
              <BrandLogo size="sm" />
              <h1 className="text-2xl font-bold select-none cursor-default">Mizan</h1>
            </div>
            <div className="flex items-center gap-4">
              {/* Theme Toggle */}
              <ThemeToggle />

              <div className="hidden lg:flex items-center gap-2">
              </div>

              <div className="relative">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative" aria-label={`View ${notifications.filter(n => !n.is_read).length} notifications`}>
                      <Bell className="h-5 w-5" />
                      {notifications.filter(n => !n.is_read).length > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center rounded-full bg-red-500 text-white text-xs">
                          {notifications.filter(n => !n.is_read).length}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80">
                    <div className="px-4 py-2 font-medium">Notifications</div>
                    <DropdownMenuSeparator />
                    {notifications.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground py-4">No new notifications</p>
                    ) : (
                      notifications.map((notification) => (
                        <DropdownMenuItem key={notification.id} className="flex flex-col items-start space-y-1 p-2">
                          <p className="text-sm font-medium capitalize">{notification.verb.replace(/_/g, ' ')}</p>
                          {notification.description && (
                            <p className="text-xs text-muted-foreground">{notification.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground">{new Date(notification.timestamp).toLocaleString()}</p>
                          {!notification.read && (
                            <Button variant="link" size="sm" onClick={() => markAsRead(notification.id)} className="self-end h-auto p-0 text-xs text-blue-600">
                              Mark as Read
                            </Button>
                          )}
                        </DropdownMenuItem>
                      ))
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={markAllAsRead}>
                      Mark all as read
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-10 w-10 rounded-full p-0" aria-label="User profile menu">
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
                    <p className="text-xs text-muted-foreground">{restaurantLabel}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive" aria-label="Sign out">
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
        {location.pathname !== '/dashboard' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-3 mb-2 border-b">
            <BackLink fallbackPath="/dashboard">Back to Dashboard</BackLink>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
