import React from "react";
import { Workflow } from "lucide-react";
import { OsHubPage } from "@/pages/os/OsHubPage";
import { useLanguage } from "@/hooks/use-language";

export default function AutomationHubPage() {
  const { t } = useLanguage();
  return (
    <OsHubPage
      eyebrow={t("hub.automation.eyebrow")}
      title={t("hub.automation.title")}
      description={t("hub.automation.desc")}
      links={[
        {
          label: t("hub.automation.workflows"),
          description: t("hub.automation.workflows_desc"),
          href: "/dashboard/automations",
          icon: Workflow,
        },
      ]}
    />
  );
}
