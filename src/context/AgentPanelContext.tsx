import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type AgentPanelContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  prefill: string;
  askAgent: (prompt: string, options?: { open?: boolean }) => void;
  clearPrefill: () => void;
};

const AgentPanelContext = createContext<AgentPanelContextValue | null>(null);

export function AgentPanelProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState("");

  const askAgent = useCallback((prompt: string, options?: { open?: boolean }) => {
    setPrefill(prompt);
    if (options?.open !== false) {
      setOpen(true);
    }
  }, []);

  const clearPrefill = useCallback(() => setPrefill(""), []);

  const value = useMemo(
    () => ({
      open,
      setOpen,
      prefill,
      askAgent,
      clearPrefill,
    }),
    [open, prefill, askAgent, clearPrefill],
  );

  return <AgentPanelContext.Provider value={value}>{children}</AgentPanelContext.Provider>;
}

export function useAgentPanel(): AgentPanelContextValue {
  const ctx = useContext(AgentPanelContext);
  if (!ctx) {
    throw new Error("useAgentPanel must be used within AgentPanelProvider");
  }
  return ctx;
}

export function useAgentPanelOptional(): AgentPanelContextValue | null {
  return useContext(AgentPanelContext);
}
