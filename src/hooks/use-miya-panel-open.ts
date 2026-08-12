import { useEffect, useState } from "react";

/** Tracks whether the docked Miya panel is open (via miya:panel-state events). */
export function useMiyaPanelOpen(): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onPanel = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail;
      setOpen(Boolean(detail?.open));
    };
    window.addEventListener("miya:panel-state", onPanel);
    return () => window.removeEventListener("miya:panel-state", onPanel);
  }, []);

  return open;
}
