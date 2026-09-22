import { Navigate, useLocation } from "react-router-dom";

/** Kitchen display is not in this release. Send people to the live orders surface. */
export default function KitchenDisplay() {
  const { pathname } = useLocation();
  const to = pathname.startsWith("/staff-dashboard")
    ? "/staff-dashboard/take-orders"
    : "/dashboard/operations/live";
  return <Navigate to={to} replace />;
}
