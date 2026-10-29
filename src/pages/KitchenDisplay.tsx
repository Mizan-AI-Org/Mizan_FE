import { Navigate } from "react-router-dom";

/** Kitchen display is not in this release. Send people to the live orders surface. */
export default function KitchenDisplay() {
  return <Navigate to="/dashboard/operations/live" replace />;
}
