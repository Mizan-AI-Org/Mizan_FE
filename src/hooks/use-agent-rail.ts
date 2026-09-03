import { useAgentPanelOptional } from "@/context/AgentPanelContext";
import { useMediaQuery } from "@/hooks/use-media-query";

/** Desktop agent rail width reserved on the main canvas (tab vs open panel). */
export function useAgentRailGutter() {
  const panel = useAgentPanelOptional();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const open = panel?.open ?? false;

  const gutter = isDesktop
    ? open
      ? "var(--mizan-agent-width)"
      : "var(--mizan-agent-tab-width)"
    : "0px";

  return {
    isDesktop,
    open: isDesktop && open,
    gutter,
  };
}
