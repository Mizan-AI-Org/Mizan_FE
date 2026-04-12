import ManagerReviewDashboard from "@/pages/ManagerReviewDashboard";

/**
 * Admin analytics: only loads ManagerReviewDashboard (its own data hooks).
 * Removed unused polling queries (daily KPIs / tasks) to cut API load on EC2/RDS.
 */
export default function AdminAnalytics() {
  return (
    <div className="space-y-6">
      <div className="mt-8">
        <ManagerReviewDashboard />
      </div>
    </div>
  );
}
