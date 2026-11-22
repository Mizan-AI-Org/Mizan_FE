import { Navigate, useLocation, useParams } from "react-router-dom";

/** Legacy Operations URLs → Live Operations board. */
export function ToOperations({
  category,
  view,
  focus,
}: {
  category?: string;
  view?: string;
  tab?: string;
  focus?: string;
}) {
  const location = useLocation();

  if (focus === "awaiting_approval") {
    const qs = location.search;
    return <Navigate to={`/dashboard/operations/approvals${qs}`} replace />;
  }

  const current = new URLSearchParams(location.search);
  if (category === "staff_requests") {
    current.set("view", "requests");
    current.delete("category");
  } else if (category && !current.get("category")) {
    current.set("category", category);
  }
  if (current.get("view") === "staff_requests") current.set("view", "requests");
  if (
    current.get("view") !== "compliance" &&
    current.get("view") !== "requests" &&
    current.get("view")
  ) {
    current.delete("view");
  }
  if (current.get("tab") === "staff" || current.get("tab") === "categories") {
    current.delete("tab");
  }
  if (focus && !current.get("focus")) current.set("focus", focus);

  return <Navigate to={{ pathname: "/dashboard/operations/live", search: current.toString() }} replace />;
}

export function StaffRequestToOperations() {
  const { id } = useParams();
  const location = useLocation();
  const current = new URLSearchParams(location.search);
  current.set("view", "requests");
  current.delete("category");
  if (id) current.set("request", id);
  return <Navigate to={{ pathname: "/dashboard/operations/live", search: current.toString() }} replace />;
}