import React from "react";
import { IntelligenceShell } from "@/pages/intelligence/IntelligenceShell";
import { ReportsWorkspace } from "@/pages/ReportsPage";
import { useLanguage } from "@/hooks/use-language";

export default function IntelligenceReportsPage() {
  const { t } = useLanguage();
  return (
    <IntelligenceShell
      title={t("nav.intelligence.reports")}
      description={t("intelligence.reports.description")}
      askPrompt={t("intelligence.reports.ask")}
    >
      <ReportsWorkspace variant="intelligence" />
    </IntelligenceShell>
  );
}
