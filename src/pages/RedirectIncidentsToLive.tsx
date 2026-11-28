import { Navigate, useLocation } from "react-router-dom";
import { useModules } from "@/hooks/use-modules";

/** Incident queue lives on Live Operations (`?view=incidents`) while the incidents module is on. */
export default function RedirectIncidentsToLive() {
  const location = useLocation();
  const { isEnabled } = useModules();
  const params = new URLSearchParams(location.search);
  if (isEnabled("incidents")) params.set("view", "incidents");
  else if (params.get("view") === "incidents") params.delete("view");
  const qs = params.toString();
  return <Navigate to={`/dashboard/operations/live${qs ? `?${qs}` : ""}`} replace />;
}
