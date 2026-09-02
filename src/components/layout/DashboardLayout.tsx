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
import { LuaPopAgentWidget } from "@/components/LuaPopAgentWidget";
import ImpersonationBanner from "@/components/platform-admin/ImpersonationBanner";
import { LiveDateTime } from "@/components/LiveDateTime";
import { AgentCommandBar } from "@/components/agent/AgentCommandBar";
import { DashboardTaskDetailSheet } from "@/components/dashboard/DashboardTaskDetailSheet";
import { closeDashboardTaskSheet } from "@/lib/dashboard-task-sheet";
import { clearAgentPageContext, focusEntityForAgent, setAgentPageContext } from "@/lib/agentPageContext";
import { IntentRail, MobileIntentDock } from "@/components/layout/IntentRail";
import { cn } from "@/lib/utils";
import { isImpersonating } from "@/lib/impersonation";

function agentPageContextFromLocation(pathname: string, search: string): {
  route: string;
  tab?: string;
  entity_type?: string;
} {
  const route = pathname + (search || "");
  const p = pathname.toLowerCase();
  if (p.includes("operations-live")) return { route, tab: "operations", entity_type: "operations" };
  if (p.includes("staff-scheduling") || p.includes("/scheduling")) {
    return { route, tab: "schedule", entity_type: "schedule" };
  }
  if (p.includes("staff-request") || p.includes("invoice") || p.includes("finance") || p.includes("payguard")) {
    return { route, tab: "approvals", entity_type: "approval" };
  }
  if (p.includes("guest-request")) return { route, entity_type: "guest_request" };
  if (p.includes("safety") || p.includes("incident")) return { route, tab: "incidents", entity_type: "incident" };
  if (p.includes("workflow") || p.includes("automation")) return { route, entity_type: "workflow" };
  if (p.includes("time-clock") || p.includes("attendance")) return { route, entity_type: "attendance" };
  if (p.includes("checklist")) return { route, entity_type: "checklist" };
  if (p.includes("people") || p.includes("staff-app")) return { route, tab: "people", entity_type: "staff" };
  return { route };
}

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
  const unreadCount = notifications.filter(n => !n.read).length;
  const [shouldShake, setShouldShake] = useState(false);
  const prevUnreadRef = useRef<number>(unreadCount);

  useEffect(() => {
    if (taskSheetId) {
      focusEntityForAgent({
        entity_type: "task",
        entity_id: taskSheetId,
        entity_label: taskWidgetTitle,
        route: location.pathname + location.search,
      });
      return;
    }
    if (incidentFocusId) {
      focusEntityForAgent({
        entity_type: "incident",
        entity_id: incidentFocusId,
        route: location.pathname + location.search,
        tab: "incidents",
      });
      return;
    }
    setAgentPageContext(agentPageContextFromLocation(location.pathname, location.search));
  }, [location.pathname, location.search, taskSheetId, taskWidgetTitle, incidentFocusId]);

  useEffect(() => {
    return () => clearAgentPageContext();
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
    <div className={cn("mizan-app-shell flex min-h-screen flex-col", viewingAsTenant && "pt-10")}>
      <a
        href="#mizan-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[3000] focus:rounded-control focus:bg-card focus:px-3 focus:py-2 focus:text-body focus:shadow-strong"
      >
        {t("common.skip_to_content")}
      </a>
      <ImpersonationBanner />
      <header className="mizan-app-header app-header-surface sticky top-0 z-[2000] border-b border-border/80 backdrop-blur-md">
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
            <AgentCommandBar />
          </div>

          <div className="mizan-app-header-actions flex shrink-0 items-center gap-1 pr-1 sm:gap-2 sm:pr-4 text-foreground">
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

            <div className="lg:hidden">
              <UserAvatarMenu variant="icon" />
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="relative flex min-h-0 flex-1">
            <IntentRail />
            <main
              id="mizan-main"
              className={cn(
                "mizan-app-main flex-1 min-w-0",
                "lg:ps-[var(--mizan-rail-width,232px)]",
                "pb-20 lg:pb-6",
              )}
            >
              <Outlet />
            </main>
          </div>

          <MobileIntentDock />
        </div>

        <LuaPopAgentWidget />
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
  );
};

export default DashboardLayout;
