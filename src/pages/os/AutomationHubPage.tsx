import React from "react";
import { Workflow, Zap } from "lucide-react";
import { OsHubPage } from "@/pages/os/OsHubPage";
import { useLanguage } from "@/hooks/use-language";

export default function AutomationHubPage() {
  const { t } = useLanguage();
  return (
    <OsHubPage
      eyebrow={t("hub.automation.eyebrow")}
      title={t("hub.automation.title")}
      description={t("hub.automation.desc")}
      askPrompt={t("hub.automation.ask")}
      workspaceModule="automations"
      links={[
        {
          label: t("hub.automation.workflows"),
          description: t("hub.automation.workflows_desc"),
          href: "/dashboard/automations",
          icon: Workflow,
          askPrompt: t("hub.automation.workflows_ask"),
        },
        {
          label: t("hub.automation.activity"),
          description: t("hub.automation.activity_desc"),
          href: "/dashboard#miya-activity",
          icon: Zap,
          askPrompt: t("hub.automation.activity_ask"),
        },
      ]}
    />
  );
}
