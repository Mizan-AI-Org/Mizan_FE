import { Navigate, useLocation, useParams } from "react-router-dom";

/** Operations tasks and staff requests live on Live Operations (`/dashboard/operations/live`). */
export default function RedirectToOperationsLive() {
  const { id } = useParams();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const isRequestsRoute = location.pathname.includes("/requests");
  if (isRequestsRoute) {
    params.set("view", "requests");
    if (id) {
      params.set("request", id);
      params.delete("task");
    }
  } else if (id) {
    params.set("task", id);
  }
  params.delete("list");
  params.delete("kind");
  const qs = params.toString();
  return (
    <Navigate
      to={`/dashboard/operations/live${qs ? `?${qs}` : ""}`}
      replace
    />
  );
}