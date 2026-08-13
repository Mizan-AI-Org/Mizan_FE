import React from "react";
import { PAGE_SHELL_PADDED } from "@/lib/page-shell";
import { SectionHeader } from "@/components/os";
import { DashboardWidgetGridSection } from "@/components/dashboard/DashboardWidgetGridSection";
import { useLanguage } from "@/hooks/use-language";

export default function AttentionPage() {
  const { t } = useLanguage();
  return (
    <div className={PAGE_SHELL_PADDED}>
      <div className="space-y-section">
        <SectionHeader
          as="h1"
          title={t("widgets.page.title")}
          description={t("widgets.page.desc")}
          titleClassName="text-page-title"
        />

        <DashboardWidgetGridSection />
      </div>
    </div>
  );
}
