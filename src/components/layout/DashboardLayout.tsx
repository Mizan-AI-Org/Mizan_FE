import React, { useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Bell, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from '../../hooks/useNotifications';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatarMenu } from "@/components/layout/UserAvatarMenu";
// Removed mobile sidebar Sheet components per design update
import { ThemeToggle } from "@/components/ThemeToggle";
import BrandLogo from "@/components/BrandLogo";
import { useLanguage } from "@/hooks/use-language";
import { LuaWidget } from "@/components/LuaWidget";
import { LiveDateTime } from "@/components/LiveDateTime";
import { cn } from "@/lib/utils";

const DashboardLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { notifications, markAllAsRead, markAsRead } = useNotifications();
  const isOnDashboardRoot = location.pathname === "/dashboard";
  const { t } = useLanguage();

  const unreadCount = notifications.filter(n => !n.read).length;
  const [shouldShake, setShouldShake] = useState(false);
  const prevUnreadRef = useRef<number>(unreadCount);

  useEffect(() => {
    // Shake when unread count increases (and also on initial load when unread > 0)
    if (unreadCount > (prevUnreadRef.current || 0)) {
      setShouldShake(true);
      const timer = setTimeout(() => setShouldShake(false), 900);
      prevUnreadRef.current = unreadCount;
      return () => clearTimeout(timer);
    }
    // initial load: if unread already present and prev wasn't set yet
    if ((prevUnreadRef.current === 0 || prevUnreadRef.current === undefined) && unreadCount > 0) {
      setShouldShake(true);
      const timer = setTimeout(() => setShouldShake(false), 900);
      prevUnreadRef.current = unreadCount;
      return () => clearTimeout(timer);
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-[2000] bg-card/95 backdrop-blur-sm border-b shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-3 rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label={t("common.back_to_dashboard")}
            >
              <BrandLogo size="sm" />
              <h1 className="text-2xl font-bold select-none">{t("common.brand")}</h1>
            </button>
            <div className="flex items-center gap-2 sm:gap-4 shrink-0 flex-wrap justify-end">
              <LiveDateTime showTime={false} />
              <ThemeToggle />

              <div className="relative">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className={`relative ${shouldShake ? 'bell-shake' : ''}`} aria-label={`${t("common.notifications.title")}`}>
                      <Bell className="h-5 w-5" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center rounded-full bg-red-500 text-white text-xs">
                          {unreadCount}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80">
                    <div className="px-4 py-2 font-medium">{t("common.notifications.title")}</div>
                    <DropdownMenuSeparator />
                    {notifications.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground py-4">{t("common.notifications.empty")}</p>
                    ) : (
                      notifications.map((notification) => (
                        <DropdownMenuItem
                          key={notification.id}
                          className="flex flex-col items-start space-y-1 p-2 cursor-pointer"
                          onClick={() => {
                            // Deep-link for staff requests (manager inbox)
                            const data = (notification as unknown as { data?: any }).data || {};
                            const route = data?.route as string | undefined;
                            const staffRequestId = data?.staff_request_id as string | undefined;
                            if (route) {
                              markAsRead(notification.id);
                              navigate(route);
                              return;
                            }
                            if (staffRequestId) {
                              markAsRead(notification.id);
                              navigate(`/dashboard/staff-requests/${staffRequestId}`);
                              return;
                            }
                          }}
                        >
                          <p className="text-sm font-medium capitalize">{notification.verb.replace(/_/g, ' ')}</p>
                          {notification.description && (
                            <p className="text-xs text-muted-foreground">{notification.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground">{new Date(notification.timestamp).toLocaleString()}</p>
                          {!notification.read && (
                            <Button variant="link" size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); markAsRead(notification.id); }} className="self-end h-auto p-0 text-xs text-blue-600">
                              {t("common.notifications.mark_as_read")}
                            </Button>
                          )}
                        </DropdownMenuItem>
                      ))
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => navigate("/dashboard/staff-requests")}
                      className="text-sm"
                    >
                      {t("staff.view_staff_requests")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={markAllAsRead}>
                      {t("common.notifications.mark_all_read")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Avatar lives in the Dashboard side pane on lg+ when on the dashboard root.
                  Show it here on every other page, and on mobile/tablet always. */}
              <div className={cn(isOnDashboardRoot && "lg:hidden")}>
                <UserAvatarMenu variant="icon" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {location.pathname !== '/dashboard' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-3">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-colors shadow-sm"
              aria-label={t("common.back_to_dashboard")}
            >
              <ArrowLeft className="h-4 w-4" />
              {t("common.back_to_dashboard")}
            </button>
          </div>
        )}
        <Outlet />
      </main>
      <LuaWidget />
    </div>
  );
};

export default DashboardLayout;
