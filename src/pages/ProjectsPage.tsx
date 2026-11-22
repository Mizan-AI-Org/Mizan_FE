import { DashboardWidgetGridSection } from "@/components/dashboard/DashboardWidgetGridSection";
import { MizanPageShell } from "@/components/os/MizanPageShell";
import { useLanguage } from "@/hooks/use-language";

/** Projects and dashboard widgets share one grid (custom project cards are slots in the layout). */
export default function ProjectsPage() {
  const { t } = useLanguage();
  return (
    <MizanPageShell title={t("nav.widget")} showHeader={false}>
      <DashboardWidgetGridSection />
    </MizanPageShell>
  );
}