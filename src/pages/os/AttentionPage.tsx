import React from "react";
import { MizanPageShell } from "@/components/os/MizanPageShell";
import { DashboardWidgetGridSection } from "@/components/dashboard/DashboardWidgetGridSection";
import { useLanguage } from "@/hooks/use-language";

export default function AttentionPage() {
  const { t } = useLanguage();
  return (
    <MizanPageShell title={t("widgets.page.title")} description={t("widgets.page.desc")} hero>
      <DashboardWidgetGridSection />
    </MizanPageShell>
  );
}
