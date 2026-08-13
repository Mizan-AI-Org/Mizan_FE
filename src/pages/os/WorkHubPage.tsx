import React from "react";
import { AlertTriangle, Briefcase, ClipboardList, Radio } from "lucide-react";
import { OsHubPage } from "@/pages/os/OsHubPage";
import { miyaPrompts } from "@/components/miya/AskMiyaButton";
import { useLanguage } from "@/hooks/use-language";

export default function WorkHubPage() {
  const { t } = useLanguage();
  return (
    <OsHubPage
      eyebrow={t("hub.work.eyebrow")}
      title={t("hub.work.title")}
      description={t("hub.work.desc")}
      askPrompt={t("hub.work.ask")}
      workspaceModule="operations"
      links={[
        {
          label: t("hub.work.live_ops"),
          description: t("hub.work.live_ops_desc"),
          href: "/dashboard/operations-live",
          icon: Radio,
          askPrompt: t("hub.work.live_ops_ask"),
        },
        {
          label: t("hub.work.tasks"),
          description: t("hub.work.tasks_desc"),
          href: "/dashboard/processes-tasks-app",
          icon: ClipboardList,
          askPrompt: miyaPrompts.task(undefined, t),
        },
        {
          label: t("hub.work.incidents"),
          description: t("hub.work.incidents_desc"),
          href: "/dashboard/analytics?tab=incidents",
          icon: AlertTriangle,
          askPrompt: miyaPrompts.incident(undefined, t),
        },
        {
          label: t("hub.work.requests"),
          description: t("hub.work.requests_desc"),
          href: "/dashboard/staff-requests",
          icon: Briefcase,
          askPrompt: t("hub.work.requests_ask"),
        },
      ]}
    />
  );
}
