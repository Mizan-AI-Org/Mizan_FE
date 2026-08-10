import React from "react";
import { BarChart3, Building2, ClipboardCheck, Wallet } from "lucide-react";
import { OsHubPage } from "@/pages/os/OsHubPage";
import { miyaPrompts } from "@/components/miya/AskMiyaButton";

export default function BusinessHubPage() {
  return (
    <OsHubPage
      eyebrow="Business"
      title="How the business is performing"
      description="Insights first - operations, finance, staffing, compliance, and risk."
      askPrompt="What's my biggest operational risk right now?"
      workspaceModule="analytics"
      links={[
        {
          label: "Analytics",
          description: "Operational performance and trends worth acting on.",
          href: "/dashboard/reports",
          icon: BarChart3,
          askPrompt: "Summarize business performance for me.",
        },
        {
          label: "Locations",
          description: "Multi-branch health and exceptions.",
          href: "/dashboard/locations-overview",
          icon: Building2,
          askPrompt: "Which locations need attention?",
        },
        {
          label: "Checklists & quality",
          description: "Execution quality and recurring misses.",
          href: "/dashboard/analytics?tab=submitted",
          icon: ClipboardCheck,
          askPrompt: "Which checklists are failing or overdue?",
        },
        {
          label: "Approvals & finance",
          description: "Invoices and decisions waiting on you.",
          href: "/dashboard/staff-requests?lane=finance",
          icon: Wallet,
          askPrompt: miyaPrompts.invoice(),
        },
      ]}
    />
  );
}
