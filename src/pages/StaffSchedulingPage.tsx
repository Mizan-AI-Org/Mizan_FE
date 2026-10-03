import React from "react";
import EnhancedScheduleView from "@/components/schedule/EnhancedScheduleView";
import { MizanPageShell } from "@/components/os/MizanPageShell";
import { MIZAN_SURFACE_CARD } from "@/lib/mizan-ui";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";

const StaffSchedulingPage: React.FC = () => {
  const { t } = useLanguage();
  return (
    <MizanPageShell title={t("schedule.staff_scheduling")} showHeader={false}>
      <div className={cn(MIZAN_SURFACE_CARD, "overflow-hidden p-0")}>
        <EnhancedScheduleView />
      </div>
    </MizanPageShell>
  );
};

export default StaffSchedulingPage;
