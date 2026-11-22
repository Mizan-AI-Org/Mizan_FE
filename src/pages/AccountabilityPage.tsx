import { Navigate } from "react-router-dom";

/** Legacy route: the accountability scorecard is a sub-view of the Operations page. */
export default function AccountabilityPage() {
  return <Navigate to="/dashboard/operations?view=accountability" replace />;
}
