import React, { useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from '../../hooks/useNotifications';
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { NotificationDropdownContent } from "@/components/layout/NotificationDropdownContent";
import { ThemeToggle } from "@/components/ThemeToggle";
import BrandLogo from "@/components/BrandLogo";
import { useLanguage } from "@/hooks/use-language";
import ImpersonationBanner from "@/components/platform-admin/ImpersonationBanner";
import { LiveDateTime } from "@/components/LiveDateTime";
import { DashboardTaskDetailSheet } from "@/components/dashboard/DashboardTaskDetailSheet";
import { closeDashboardTaskSheet } from "@/lib/dashboard-task-sheet";
import { IntentRail, MobileIntentDock } from "@/components/layout/IntentRail";
import { AgentChatPanel } from "@/components/agent/AgentChatPanel";
import { CommandSearchBar } from "@/components/command/CommandSearchBar";
import { AgentPanelProvider } from "@/context/AgentPanelContext";
import { cn } from "@/lib/utils";
import { isImpersonating } from "@/lib/impersonation";

const DashboardLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const taskSheetId = (searchParams.get("task") || "").trim() || null;
  const taskWidgetTitle = (searchParams.get("widget") || "").trim() || undefined;
  const { notifications, markAllAsRead, markAsRead } = useNotifications();
  const { t } = useLanguage();
  const viewingAsTenant = isImpersonating();
  const unreadCount = notifications.filter(n => !n.read).length;
  const [shouldShake, setShouldShake] = useState(false);
  const prevUnreadRef = useRef<number>(unreadCount);

  useEffect(() => {
    if (unreadCount > (prevUnreadRef.current || 0)) {
      setShouldShake(true);
      const timer = setTimeout(() => setShouldShake(false), 900);
      prevUnreadRef.current = unreadCount;
      return () => clearTimeout(timer);
    }
    if ((prevUnreadRef.current === 0 || prevUnreadRef.current === undefined) && unreadCount > 0) {
      setShouldShake(true);
      const timer = setTimeout(() => setShouldShake(false), 900);
      prevUnreadRef.current = unreadCount;
      return () => clearTimeout(timer);
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  return (
    <AgentPanelProvider>
    <div className={cn("mizan-app-shell flex h-dvh flex-col overflow-hidden", viewingAsTenant && "pt-10")}>
      <a
        href="#mizan-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[3000] focus:rounded-control focus:bg-card focus:px-3 focus:py-2 focus:text-body focus:shadow-strong"
      >
        {t("common.skip_to_content")}
      </a>
      <ImpersonationBanner />
      <header className="mizan-app-header app-header-surface sticky top-0 z-[2000] w-full shrink-0 border-b border-border/80 backdrop-blur-md">
        <div className="flex h-[var(--mizan-header-height,3.5625rem)] w-full items-center gap-3 px-3 sm:px-4 lg:pe-4">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className={cn(
              "flex h-11 shrink-0 items-center gap-2.5 rounded-control px-2 transition-opacity hover:opacity-90",
              "focus-visible:ring-2 focus-visible:ring-ring",
              "lg:min-w-[var(--mizan-rail-width,232px)] lg:px-4",
            )}
            aria-label={t("common.brand")}
          >
            <BrandLogo size="md" withWordmark />
          </button>

          <CommandSearchBar className="min-w-0 max-w-2xl flex-1" />

          <div className="flex-1 lg:hidden" />

          <div className="mizan-app-header-actions ms-auto flex shrink-0 items-center gap-1 sm:gap-2 text-foreground">
            <div className="hidden sm:block">
              <LiveDateTime showTime={false} />
            </div>
            <ThemeToggle />

            <div className="relative">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`relative text-foreground hover:bg-muted hover:text-foreground ${shouldShake ? "bell-shake" : ""}`}
                    aria-label={`${t("common.notifications.title")}`}
                  >
                    <Bell className="h-5 w-5 text-foreground" aria-hidden />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-critical text-[10px] text-critical-foreground">
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
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <IntentRail />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:ps-[var(--mizan-rail-width,232px)]">
          <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
            <main
              id="mizan-main"
              className="mizan-app-main min-h-0 min-w-0 flex-1 overflow-y-auto pb-20 lg:pb-6"
            >
              <Outlet />
            </main>
            <AgentChatPanel />
          </div>
          <MobileIntentDock />
        </div>
      </div>

      <DashboardTaskDetailSheet
        taskId={taskSheetId}
        open={!!taskSheetId}
        onOpenChange={(open) => {
          if (!open) closeDashboardTaskSheet(navigate, location);
        }}
        widgetTitle={taskWidgetTitle}
      />
    </div>
    </AgentPanelProvider>
  );
};

export default DashboardLayout;
