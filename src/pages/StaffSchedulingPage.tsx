import React from "react";
import EnhancedScheduleView from "@/components/schedule/EnhancedScheduleView";
import { MizanPageShell } from "@/components/os/MizanPageShell";
import { useLanguage } from "@/hooks/use-language";

const StaffSchedulingPage: React.FC = () => {
  const { t } = useLanguage();
  return (
    <MizanPageShell title={t("schedule.staff_scheduling")} showHeader={false}>
      <EnhancedScheduleView />
    </MizanPageShell>
  );
};

export default StaffSchedulingPage;
