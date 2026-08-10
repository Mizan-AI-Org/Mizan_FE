import ManagerReviewDashboard from "@/pages/ManagerReviewDashboard";
import { useSearchParams } from "react-router-dom";
import { AiNativeWorkspace, type WorkspaceModule } from "@/components/miya/AiNativeWorkspace";
import { PAGE_SHELL } from "@/lib/page-shell";

/**
 * Admin analytics: intelligence layer + ManagerReviewDashboard (checklists/incidents).
 * "Ask the business" - not vanity dashboard analytics.
 */
export default function AdminAnalytics() {
  const [params] = useSearchParams();
  const tab = (params.get("tab") || "").toLowerCase();
  const module: WorkspaceModule =
    tab === "incidents" ? "incidents" : tab === "submitted" || tab === "checklists" ? "checklists" : "analytics";

  return (
    <div className="space-y-4">
      <div className={`${PAGE_SHELL} pt-4`}>
        <AiNativeWorkspace module={module} />
      </div>
      <div className="mt-2">
        <ManagerReviewDashboard />
      </div>
    </div>
  );
}
