import React from "react";
import { CalendarDays, Users } from "lucide-react";
import { OsHubPage } from "@/pages/os/OsHubPage";
import { miyaPrompts } from "@/components/miya/AskMiyaButton";

export default function PeopleHubPage() {
  return (
    <OsHubPage
      eyebrow="People"
      title="Workforce in context"
      description="Not a directory - who is working, who is overloaded, and what Miya sees."
      askPrompt={miyaPrompts.staff()}
      workspaceModule="staff"
      links={[
        {
          label: "Staff",
          description: "Operational load, assignments, and people status.",
          href: "/dashboard/staff-app",
          icon: Users,
          askPrompt: miyaPrompts.staff(),
        },
        {
          label: "Scheduling",
          description: "Coverage, shifts, and tomorrow's staffing risk.",
          href: "/dashboard/scheduling",
          icon: CalendarDays,
          askPrompt: miyaPrompts.schedule(),
        },
      ]}
    />
  );
}
