import { useTranslation } from "react-i18next";

import { AccountabilityPanel } from "@/components/operations/AccountabilityPanel";

/** The accountability scorecard as its own page: on-time rate, overdue, blocked, waiting validation, per person. */
export default function AccountabilityPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("accountability.page_title")}</h1>
        <p className="text-sm text-muted-foreground">{t("accountability.page_subtitle")}</p>
      </div>
      <AccountabilityPanel />
    </div>
  );
}
