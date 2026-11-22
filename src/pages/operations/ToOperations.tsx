import { Navigate, useLocation } from "react-router-dom";

/** Legacy Operations URLs (old task board, board link, approvals focus) -> the unified Operations page. */
export function ToOperations({
  category,
  layout,
  focus,
  view,
}: {
  category?: string;
  layout?: "board" | "list";
  focus?: string;
  /** Sub-view of the page: compliance, accountability or progress. */
  view?: string;
}) {
  const location = useLocation();
  const current = new URLSearchParams(location.search);
  if (category && !current.get("category")) current.set("category", category);
  if (focus && !current.get("focus")) current.set("focus", focus);
  if (layout === "board" && !current.get("layout")) current.set("layout", "board");
  if (view && !current.get("view")) current.set("view", view);
  // Old board links carried ?view=board; on this page the sub-view param is `view`, the board toggle is `layout`.
  if (current.get("view") === "board") {
    current.delete("view");
    current.set("layout", "board");
  }
  return <Navigate to={{ pathname: "/dashboard/operations", search: current.toString() }} replace />;
}
