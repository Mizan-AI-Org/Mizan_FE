/** Keep dashboard shell padding in sync with the docked Agent panel. */
export const AGENT_PANEL_WIDTH_PX = 420;
export const AGENT_PANEL_WIDTH = `${AGENT_PANEL_WIDTH_PX}px`;
export const AGENT_EDGE_WIDTH = "56px";
export const APP_HEADER_HEIGHT = "57px";
export const MOBILE_BOTTOM_DOCK_HEIGHT = "56px";

export function syncAgentPanelLayout(open: boolean): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--mizan-agent-panel", open ? AGENT_PANEL_WIDTH : "0px");
  root.style.setProperty("--mizan-agent-edge", open ? "0px" : AGENT_EDGE_WIDTH);
  root.style.setProperty("--mizan-agent-inset", open ? AGENT_PANEL_WIDTH : AGENT_EDGE_WIDTH);
  root.style.setProperty("--mizan-app-header-h", APP_HEADER_HEIGHT);
  root.style.setProperty("--mizan-mobile-dock-h", MOBILE_BOTTOM_DOCK_HEIGHT);
  if (open) {
    root.dataset.agentPanelOpen = "true";
  } else {
    delete root.dataset.agentPanelOpen;
  }
}

export function readAgentPanelOpen(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.dataset.agentPanelOpen === "true";
}
