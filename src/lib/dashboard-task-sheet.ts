import type { Location, NavigateFunction } from "react-router-dom";

/** Open dashboard task detail in the layout right pane (?task=). */
export function openDashboardTaskSheet(
  navigate: NavigateFunction,
  location: Location,
  taskId: string,
  opts?: { widget?: string; keepPath?: boolean },
) {
  const params = new URLSearchParams(location.search);
  params.set("task", taskId);
  params.delete("id");
  params.delete("kind");
  if (opts?.widget) params.set("widget", opts.widget);
  else params.delete("widget");

  const pathname = opts?.keepPath !== false ? location.pathname : "/dashboard";
  navigate({ pathname, search: params.toString() });
}

export function closeDashboardTaskSheet(
  navigate: NavigateFunction,
  location: Location,
) {
  const params = new URLSearchParams(location.search);
  params.delete("task");
  params.delete("widget");
  const qs = params.toString();
  navigate({ pathname: location.pathname, search: qs ? `?${qs}` : "" }, { replace: true });
}
