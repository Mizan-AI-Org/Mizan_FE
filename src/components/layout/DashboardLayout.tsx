import React, { useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Bell, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from '../../hooks/useNotifications';
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { NotificationDropdownContent } from "@/components/layout/NotificationDropdownContent";
import { UserAvatarMenu } from "@/components/layout/UserAvatarMenu";
// Removed mobile sidebar Sheet components per design update
import { ThemeToggle } from "@/components/ThemeToggle";
import BrandLogo from "@/components/BrandLogo";
import { useLanguage } from "@/hooks/use-language";
import { MiyaWidget } from "@/components/MiyaWidget";
import ImpersonationBanner from "@/components/platform-admin/ImpersonationBanner";
import { LiveDateTime } from "@/components/LiveDateTime";
import { OpsSearchBar } from "@/components/OpsSearchBar";
import { DashboardTaskDetailSheet } from "@/components/dashboard/DashboardTaskDetailSheet";
import { closeDashboardTaskSheet } from "@/lib/dashboard-task-sheet";
import { cn } from "@/lib/utils";
import { PAGE_SHELL, SETTINGS_PAGE_SHELL } from "@/lib/page-shell";
import { isImpersonating } from "@/lib/impersonation";

const DashboardLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const taskSheetId = (searchParams.get("task") || "").trim() || null;
  const taskWidgetTitle = (searchParams.get("widget") || "").trim() || undefined;
  const { notifications, markAllAsRead, markAsRead } = useNotifications();
  const isSettingsPage = location.pathname === "/dashboard/settings" || location.pathname.startsWith("/dashboard/settings/");
  const pageShell = isSettingsPage ? SETTINGS_PAGE_SHELL : PAGE_SHELL;
  const isOnDashboardRoot = location.pathname === "/dashboard";
  const isAutomationBuilder = /^\/dashboard\/automations\/.+/.test(location.pathname);
  const { t } = useLanguage();
  const viewingAsTenant = isImpersonating();

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
    <div className={cn("min-h-screen flex flex-col", viewingAsTenant && "pt-10")}>
      <ImpersonationBanner />
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
            <div className="hidden md:block flex-1 max-w-md mx-4">
              <OpsSearchBar />
            </div>
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
                  <NotificationDropdownContent
                    notifications={notifications}
                    markAsRead={markAsRead}
                    markAllAsRead={markAllAsRead}
                    t={t}
                    staffRequestsLabel={t("staff.view_staff_requests")}
                  />
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
        {location.pathname !== "/dashboard" && !isAutomationBuilder && (
          <div className={`${pageShell} pt-4 pb-3`}>
            {location.pathname.startsWith("/dashboard/settings/") &&
            location.pathname !== "/dashboard/settings" ? (
              <button
                type="button"
                onClick={() => navigate("/dashboard/settings")}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-colors shadow-sm"
                aria-label={t("settings.back_to_settings")}
              >
                <ArrowLeft className="h-4 w-4" />
                {t("settings.back_to_settings")}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-colors shadow-sm"
                aria-label={t("common.back_to_dashboard")}
              >
                <ArrowLeft className="h-4 w-4" />
                {t("common.back_to_dashboard")}
              </button>
            )}
          </div>
        )}
        <Outlet />
      </main>
      <MiyaWidget />
      <DashboardTaskDetailSheet
        taskId={taskSheetId}
        open={!!taskSheetId}
        onOpenChange={(open) => {
          if (!open) closeDashboardTaskSheet(navigate, location);
        }}
        widgetTitle={taskWidgetTitle}
      />
    </div>
  );
};

export default DashboardLayout;
