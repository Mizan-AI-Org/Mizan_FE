/**
 * Agent page/object focus - sent with every chat turn so Agent binds pronouns
 * and bare actions to the entity the user is looking at.
 */
export type AgentPageContext = {
  route?: string;
  tab?: string;
  entity_type?: string;
  entity_id?: string;
  entity_label?: string;
};

type Listener = (ctx: AgentPageContext | null) => void;

let current: AgentPageContext | null = null;
const listeners = new Set<Listener>();

export function getAgentPageContext(): AgentPageContext | null {
  return current;
}

export function setAgentPageContext(ctx: AgentPageContext | null): void {
  if (!ctx || (!ctx.entity_id && !ctx.route && !ctx.entity_type)) {
    current = null;
  } else {
    current = { ...ctx };
  }
  listeners.forEach((fn) => {
    try {
      fn(current);
    } catch {
      /* ignore */
    }
  });
  try {
    window.dispatchEvent(new CustomEvent("agent:page-context", { detail: current }));
  } catch {
    /* ignore */
  }
}

export function clearAgentPageContext(): void {
  setAgentPageContext(null);
}

export function subscribeAgentPageContext(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Open Agent chat, optionally with a starter prompt and page focus. */
export function askAgent(opts?: {
  prompt?: string;
  pageContext?: AgentPageContext | null;
}): void {
  if (opts?.pageContext !== undefined) {
    setAgentPageContext(opts.pageContext);
  }
  try {
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--mizan-agent-panel", "420px");
      document.documentElement.style.setProperty("--mizan-agent-edge", "0px");
      document.documentElement.style.setProperty("--mizan-agent-inset", "420px");
    }
    window.dispatchEvent(new CustomEvent("agent:panel-state", { detail: { open: true } }));
    window.dispatchEvent(
      new CustomEvent("agent:open", {
        detail: { prompt: opts?.prompt || "" },
      }),
    );
  } catch {
    /* ignore */
  }
}

export function focusEntityForAgent(args: {
  entity_type: string;
  entity_id: string;
  entity_label?: string;
  route?: string;
  tab?: string;
}): void {
  setAgentPageContext({
    route: args.route || (typeof window !== "undefined" ? window.location.pathname : undefined),
    tab: args.tab,
    entity_type: args.entity_type,
    entity_id: args.entity_id,
    entity_label: args.entity_label,
  });
}
