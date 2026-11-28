import { useLocation, useNavigate } from "react-router-dom";
import { BarChart3, UserCheck } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/hooks/use-language";
import { HUB_TABS_TRIGGER } from "@/lib/mizan-ui";
import { PAGE_SHELL_PADDED } from "@/lib/page-shell";
import { cn } from "@/lib/utils";
import ManagerAttendancePage from "@/pages/ManagerAttendancePage";
import SchedulingAnalytics from "@/pages/SchedulingAnalytics";

const ATTENDANCE_PATH = "/dashboard/employees/attendance";
const PERFORMANCE_PATH = "/dashboard/employees/performance";

const tabTriggerClass = cn(
  HUB_TABS_TRIGGER,
  "w-full justify-center gap-2 py-3 text-sm font-semibold sm:text-[15px]",
);

/** Attendance and performance share one Team page, with the same full-width tabs as Shifts. */
export default function AttendancePerformanceHub() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const tab = pathname.includes("/performance") ? "performance" : "attendance";

  return (
    <div className={`${PAGE_SHELL_PADDED} min-w-0 space-y-4`}>
      <Tabs
        value={tab}
        onValueChange={(value) => navigate(value === "performance" ? PERFORMANCE_PATH : ATTENDANCE_PATH)}
        className="w-full"
      >
        <TabsList className="grid h-auto w-full grid-cols-1 gap-1.5 rounded-xl border border-border/60 bg-muted/40 p-1.5 sm:grid-cols-2 sm:gap-2">
          <TabsTrigger value="attendance" className={tabTriggerClass}>
            <UserCheck className="h-4 w-4 shrink-0" aria-hidden />
            {t("nav.employees.attendance")}
          </TabsTrigger>
          <TabsTrigger value="performance" className={tabTriggerClass}>
            <BarChart3 className="h-4 w-4 shrink-0" aria-hidden />
            {t("nav.employees.performance")}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === "attendance" ? <ManagerAttendancePage embedded /> : <SchedulingAnalytics embedded />}
    </div>
  );
}
