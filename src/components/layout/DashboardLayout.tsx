import React from 'react';
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { ChefHat, ArrowLeft, Home, LogOut, User, Bell, Users, CalendarDays, Utensils, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from '../../hooks/use-auth';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNotifications } from '../../hooks/useNotifications';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AuthContextType } from "@/contexts/AuthContext.types";

const DashboardLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth() as AuthContextType;
  const { notifications, isConnected, markAllAsRead, markAsRead } = useNotifications();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open sidebar navigation">
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
                    {user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' ? (
                      <DropdownMenuItem
                        onClick={() => navigate("/dashboard/staff-management")}
                        className="w-full justify-start cursor-pointer"
                        aria-label="Staff Management"
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Staff Management
                      </DropdownMenuItem>
                    ) : null}
                    {user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' ? (
                      <DropdownMenuItem
                        onClick={() => navigate("/dashboard/schedule-management")}
                        className="w-full justify-start cursor-pointer"
                        aria-label="Schedule Management"
                      >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        Schedule Management
                      </DropdownMenuItem>
                    ) : null}
                    {user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' ? (
                      <DropdownMenuItem
                        onClick={() => navigate("/dashboard/table-management")}
                        className="w-full justify-start cursor-pointer"
                        aria-label="Table Management"
                      >
                        <Utensils className="mr-2 h-4 w-4" />
                        Table Management
                      </DropdownMenuItem>
                    ) : null}
                    {user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGER' ? (
                      <DropdownMenuItem
                        onClick={() => navigate("/dashboard/reports")}
                        className="w-full justify-start cursor-pointer"
                        aria-label="Reports and Analytics"
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Reports & Analytics
                      </DropdownMenuItem>
                    ) : null}
                    {user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' ? (
                      <DropdownMenuItem
                        onClick={() => navigate("/dashboard/categories")}
                        className="w-full justify-start cursor-pointer"
                        aria-label="Category Management"
                      >
                        <Utensils className="mr-2 h-4 w-4" /> {/* Using Utensils icon for categories, can be changed */}
                        Category Management
                      </DropdownMenuItem>
                    ) : null}
                    {user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' ? (
                      <DropdownMenuItem
                        onClick={() => navigate("/dashboard/products")}
                        className="w-full justify-start cursor-pointer"
                        aria-label="Product Management"
                      >
                        <Utensils className="mr-2 h-4 w-4" /> {/* Using Utensils icon for products, can be changed */}
                        Product Management
                      </DropdownMenuItem>
                    ) : null}
                    {user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'CHEF' ? (
                      <DropdownMenuItem
                        onClick={() => navigate("/staff-dashboard/kitchen")}
                        className="w-full justify-start cursor-pointer"
                        aria-label="Kitchen Display"
                      >
                        <ChefHat className="mr-2 h-4 w-4" />
                        Kitchen Display
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuItem
                      onClick={logout}
                      className="w-full justify-start text-destructive cursor-pointer"
                      aria-label="Sign Out"
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
                    <p className="text-xs text-muted-foreground">
                      {user?.restaurant?.name || "Restaurant"}
                    </p>
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
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
