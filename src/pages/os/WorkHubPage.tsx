import React from "react";
import { AlertTriangle, Briefcase, ClipboardList, Radio } from "lucide-react";
import { OsHubPage } from "@/pages/os/OsHubPage";
import { miyaPrompts } from "@/components/miya/AskMiyaButton";

export default function WorkHubPage() {
  return (
    <OsHubPage
      eyebrow="Work"
      title="What work is happening"
      description="Active operations across live ops, tasks, incidents, and requests - without hunting modules."
      askPrompt="What work is active, blocked, or overdue right now?"
      workspaceModule="operations"
      links={[
        {
          label: "Live operations",
          description: "Daily demands, incidents, and tasks in one live feed.",
          href: "/dashboard/operations-live",
          icon: Radio,
          askPrompt: "What's happening in live operations?",
        },
        {
          label: "Tasks",
          description: "Active, blocked, overdue, and upcoming work.",
          href: "/dashboard/processes-tasks-app",
          icon: ClipboardList,
          askPrompt: miyaPrompts.task(),
        },
        {
          label: "Incidents",
          description: "Open operational incidents with owners and impact.",
          href: "/dashboard/analytics?tab=incidents",
          icon: AlertTriangle,
          askPrompt: miyaPrompts.incident(),
        },
        {
          label: "Requests",
          description: "Staff and operational requests waiting on someone.",
          href: "/dashboard/staff-requests",
          icon: Briefcase,
          askPrompt: "Show unresolved requests and who owns them.",
        },
      ]}
    />
  );
}
