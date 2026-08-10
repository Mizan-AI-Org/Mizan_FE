import React, { useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from '../../hooks/useNotifications';
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { NotificationDropdownContent } from "@/components/layout/NotificationDropdownContent";
import { UserAvatarMenu } from "@/components/layout/UserAvatarMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import BrandLogo from "@/components/BrandLogo";
import { useLanguage } from "@/hooks/use-language";
import { MiyaWidget } from "@/components/MiyaWidget";
import ImpersonationBanner from "@/components/platform-admin/ImpersonationBanner";
import { LiveDateTime } from "@/components/LiveDateTime";
import { MiyaCommandBar } from "@/components/miya/MiyaCommandBar";
import { DashboardTaskDetailSheet } from "@/components/dashboard/DashboardTaskDetailSheet";
import { closeDashboardTaskSheet } from "@/lib/dashboard-task-sheet";
import { clearMiyaPageContext, focusEntityForMiya, setMiyaPageContext } from "@/lib/miyaPageContext";
import { IntentRail, MobileIntentDock } from "@/components/layout/IntentRail";
import { cn } from "@/lib/utils";
import { isImpersonating } from "@/lib/impersonation";

const DashboardLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const taskSheetId = (searchParams.get("task") || "").trim() || null;
  const taskWidgetTitle = (searchParams.get("widget") || "").trim() || undefined;
  const incidentFocusId = (searchParams.get("incident") || "").trim() || null;
  const { notifications, markAllAsRead, markAsRead } = useNotifications();
  const { t } = useLanguage();
  const viewingAsTenant = isImpersonating();
  const [miyaPanelOpen, setMiyaPanelOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;
  const [shouldShake, setShouldShake] = useState(false);
  const prevUnreadRef = useRef<number>(unreadCount);

  useEffect(() => {
    if (taskSheetId) {
      focusEntityForMiya({
        entity_type: "task",
        entity_id: taskSheetId,
        entity_label: taskWidgetTitle,
        route: location.pathname + location.search,
      });
      return;
    }
    if (incidentFocusId) {
      focusEntityForMiya({
        entity_type: "incident",
        entity_id: incidentFocusId,
        route: location.pathname + location.search,
        tab: "incidents",
      });
      return;
    }
    setMiyaPageContext({
      route: location.pathname + (location.search || ""),
    });
  }, [location.pathname, location.search, taskSheetId, taskWidgetTitle, incidentFocusId]);

  useEffect(() => {
    return () => clearMiyaPageContext();
  }, []);

  useEffect(() => {
    const onPanel = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail;
      setMiyaPanelOpen(Boolean(detail?.open));
    };
    window.addEventListener("miya:panel-state", onPanel);
    return () => window.removeEventListener("miya:panel-state", onPanel);
  }, []);

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
    <div className={cn("flex min-h-screen flex-col", viewingAsTenant && "pt-10")}>
      <a
        href="#mizan-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[3000] focus:rounded-control focus:bg-card focus:px-3 focus:py-2 focus:text-body focus:shadow-strong"
      >
        Skip to main content
      </a>
      <ImpersonationBanner />
      <header className="app-header-surface sticky top-0 z-[2000] border-b border-border/80 backdrop-blur-md">
        <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4 lg:px-0">
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

          <div className="mx-auto min-w-0 max-w-2xl flex-1 lg:pr-4">
            <MiyaCommandBar />
          </div>

          <div className="flex shrink-0 items-center gap-1 pr-1 sm:gap-2 sm:pr-4">
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
                    className={`relative ${shouldShake ? "bell-shake" : ""}`}
                    aria-label={`${t("common.notifications.title")}`}
                  >
                    <Bell className="h-5 w-5" />
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

            <div className="lg:hidden">
              <UserAvatarMenu variant="icon" />
            </div>
          </div>
        </div>
      </header>

      <IntentRail />
      <MobileIntentDock />

      <main
        id="mizan-main"
        className={cn(
          "flex-1 min-w-0 transition-[padding] duration-os",
          "lg:pl-[var(--mizan-rail-width,232px)]",
          miyaPanelOpen && "lg:pr-[min(100vw-2rem,420px)]",
          "pb-20 lg:pb-6",
        )}
      >
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
