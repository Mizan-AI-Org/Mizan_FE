import React from "react";
import { Workflow, Zap } from "lucide-react";
import { OsHubPage } from "@/pages/os/OsHubPage";

export default function AutomationHubPage() {
  return (
    <OsHubPage
      eyebrow="Automation"
      title="What Miya automates"
      description="See enabled workflows and the operational work Miya handles without you."
      askPrompt="What has Miya automated in the last 7 days?"
      workspaceModule="automations"
      links={[
        {
          label: "Workflows",
          description: "Incident routing, reminders, escalations, and custom automations.",
          href: "/dashboard/automations",
          icon: Workflow,
          askPrompt: "List enabled automations and what they did recently.",
        },
        {
          label: "Miya activity",
          description: "Verified actions Miya performed today.",
          href: "/dashboard#miya-activity",
          icon: Zap,
          askPrompt: "Show me what Miya has done today.",
        },
      ]}
    />
  );
}
