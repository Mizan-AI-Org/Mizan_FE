import { Navigate, useLocation, useParams } from "react-router-dom";

/** Canonical staff inbox is `/dashboard/staff-requests`. Domain aliases redirect here. */
export default function RedirectToStaffRequests() {
  const { id } = useParams();
  const location = useLocation();
  const base = id ? `/dashboard/staff-requests/${id}` : "/dashboard/staff-requests";
  return <Navigate to={`${base}${location.search}${location.hash}`} replace />;
}
