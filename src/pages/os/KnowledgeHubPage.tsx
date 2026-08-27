import React from "react";
import { FileText, Settings } from "lucide-react";
import { OsHubPage } from "@/pages/os/OsHubPage";
import { useLanguage } from "@/hooks/use-language";

export default function KnowledgeHubPage() {
  const { t } = useLanguage();
  return (
    <OsHubPage
      eyebrow={t("hub.knowledge.eyebrow")}
      title={t("hub.knowledge.title")}
      description={t("hub.knowledge.desc")}
      links={[
        {
          label: t("hub.knowledge.policies"),
          description: t("hub.knowledge.policies_desc"),
          href: "/dashboard/settings?tab=general",
          icon: Settings,
        },
        {
          label: t("hub.knowledge.compliance"),
          description: t("hub.knowledge.compliance_desc"),
          href: "/dashboard/settings?tab=compliance",
          icon: FileText,
        },
      ]}
    />
  );
}
