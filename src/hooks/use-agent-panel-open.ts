import { useEffect, useState } from "react";

/** Tracks whether the docked Agent panel is open (via agent:panel-state events). */
export function useAgentPanelOpen(): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onPanel = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail;
      setOpen(Boolean(detail?.open));
    };
    window.addEventListener("agent:panel-state", onPanel);
    return () => window.removeEventListener("agent:panel-state", onPanel);
  }, []);

  return open;
}
