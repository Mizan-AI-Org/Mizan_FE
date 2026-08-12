import React from "react";
import { PAGE_SHELL_PADDED } from "@/lib/page-shell";
import { SectionHeader } from "@/components/os";
import { DashboardWidgetGridSection } from "@/components/dashboard/DashboardWidgetGridSection";

export default function AttentionPage() {
  return (
    <div className={PAGE_SHELL_PADDED}>
      <div className="space-y-section">
        <SectionHeader
          as="h1"
          title="Widgets"
          description="Your operational dashboards and everyday business views."
          titleClassName="text-page-title"
        />

        <DashboardWidgetGridSection />
      </div>
    </div>
  );
}
