import React from "react";
import { BookOpen, FileText, Settings } from "lucide-react";
import { OsHubPage } from "@/pages/os/OsHubPage";
import { miyaPrompts } from "@/components/miya/AskMiyaButton";

export default function KnowledgeHubPage() {
  return (
    <OsHubPage
      eyebrow="Knowledge"
      title="Business memory"
      description="Policies, SOPs, and documents that improve Miya's decisions."
      askPrompt="What knowledge should I update so Miya decides better?"
      workspaceModule="settings"
      links={[
        {
          label: "Policies & configuration",
          description: "Business rules Miya uses for routing and approvals.",
          href: "/dashboard/settings?tab=general",
          icon: Settings,
          askPrompt: "Summarize my routing and approval policies.",
        },
        {
          label: "Compliance documents",
          description: "Licenses, insurance, and documents that expire.",
          href: "/dashboard/settings?tab=compliance",
          icon: FileText,
          askPrompt: miyaPrompts.compliance(),
        },
        {
          label: "Ask Miya about knowledge",
          description: "Query SOPs and stored business context in natural language.",
          icon: BookOpen,
          opensMiya: true,
          askPrompt: "What business knowledge do you have about this restaurant?",
        },
      ]}
    />
  );
}
