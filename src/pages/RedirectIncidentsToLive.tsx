import { Navigate, useLocation } from "react-router-dom";

/** Incident queue lives on Live Operations (`?view=incidents`). */
export default function RedirectIncidentsToLive() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  params.set("view", "incidents");
  const qs = params.toString();
  return <Navigate to={`/dashboard/operations/live?${qs}`} replace />;
}