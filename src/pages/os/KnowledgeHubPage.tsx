import React from "react";
import { BookOpen, FileText, Settings } from "lucide-react";
import { OsHubPage } from "@/pages/os/OsHubPage";
import { miyaPrompts } from "@/components/miya/AskMiyaButton";
import { useLanguage } from "@/hooks/use-language";

export default function KnowledgeHubPage() {
  const { t } = useLanguage();
  return (
    <OsHubPage
      eyebrow={t("hub.knowledge.eyebrow")}
      title={t("hub.knowledge.title")}
      description={t("hub.knowledge.desc")}
      askPrompt={t("hub.knowledge.ask")}
      workspaceModule="settings"
      links={[
        {
          label: t("hub.knowledge.policies"),
          description: t("hub.knowledge.policies_desc"),
          href: "/dashboard/settings?tab=general",
          icon: Settings,
          askPrompt: t("hub.knowledge.policies_ask"),
        },
        {
          label: t("hub.knowledge.compliance"),
          description: t("hub.knowledge.compliance_desc"),
          href: "/dashboard/settings?tab=compliance",
          icon: FileText,
          askPrompt: miyaPrompts.compliance(t),
        },
        {
          label: t("hub.knowledge.ask_miya"),
          description: t("hub.knowledge.ask_miya_desc"),
          icon: BookOpen,
          opensMiya: true,
          askPrompt: t("hub.knowledge.ask_miya_prompt"),
        },
      ]}
    />
  );
}
