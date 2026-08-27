import React from "react";
import { CalendarDays, Users } from "lucide-react";
import { OsHubPage } from "@/pages/os/OsHubPage";
import { useLanguage } from "@/hooks/use-language";

export default function PeopleHubPage() {
  const { t } = useLanguage();
  return (
    <OsHubPage
      eyebrow={t("hub.people.eyebrow")}
      title={t("hub.people.title")}
      description={t("hub.people.desc")}
      links={[
        {
          label: t("hub.people.staff"),
          description: t("hub.people.staff_desc"),
          href: "/dashboard/staff-app",
          icon: Users,
        },
        {
          label: t("hub.people.scheduling"),
          description: t("hub.people.scheduling_desc"),
          href: "/dashboard/scheduling",
          icon: CalendarDays,
        },
      ]}
    />
  );
}
