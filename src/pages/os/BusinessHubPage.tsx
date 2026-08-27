import React from "react";
import { BarChart3, Building2, ClipboardCheck, Wallet } from "lucide-react";
import { OsHubPage } from "@/pages/os/OsHubPage";
import { useLanguage } from "@/hooks/use-language";

export default function BusinessHubPage() {
  const { t } = useLanguage();
  return (
    <OsHubPage
      eyebrow={t("hub.business.eyebrow")}
      title={t("hub.business.title")}
      description={t("hub.business.desc")}
      links={[
        {
          label: t("hub.business.analytics"),
          description: t("hub.business.analytics_desc"),
          href: "/dashboard/reports",
          icon: BarChart3,
        },
        {
          label: t("hub.business.locations"),
          description: t("hub.business.locations_desc"),
          href: "/dashboard/locations-overview",
          icon: Building2,
        },
        {
          label: t("hub.business.checklists"),
          description: t("hub.business.checklists_desc"),
          href: "/dashboard/analytics?tab=submitted",
          icon: ClipboardCheck,
        },
        {
          label: t("hub.business.approvals"),
          description: t("hub.business.approvals_desc"),
          href: "/dashboard/staff-requests?list=finance",
          icon: Wallet,
        },
      ]}
    />
  );
}
