/**
 * Miya page/object focus - sent with every chat turn so Miya binds pronouns
 * and bare actions to the entity the user is looking at.
 */
export type MiyaPageContext = {
  route?: string;
  tab?: string;
  entity_type?: string;
  entity_id?: string;
  entity_label?: string;
};

type Listener = (ctx: MiyaPageContext | null) => void;

let current: MiyaPageContext | null = null;
const listeners = new Set<Listener>();

export function getMiyaPageContext(): MiyaPageContext | null {
  return current;
}

export function setMiyaPageContext(ctx: MiyaPageContext | null): void {
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
    window.dispatchEvent(new CustomEvent("miya:page-context", { detail: current }));
  } catch {
    /* ignore */
  }
}

export function clearMiyaPageContext(): void {
  setMiyaPageContext(null);
}

export function subscribeMiyaPageContext(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Open Miya chat, optionally with a starter prompt and page focus. */
export function askMiya(opts?: {
  prompt?: string;
  pageContext?: MiyaPageContext | null;
}): void {
  if (opts?.pageContext !== undefined) {
    setMiyaPageContext(opts.pageContext);
  }
  try {
    window.dispatchEvent(
      new CustomEvent("miya:open", {
        detail: { prompt: opts?.prompt || "" },
      }),
    );
  } catch {
    /* ignore */
  }
}

export function focusEntityForMiya(args: {
  entity_type: string;
  entity_id: string;
  entity_label?: string;
  route?: string;
  tab?: string;
}): void {
  setMiyaPageContext({
    route: args.route || (typeof window !== "undefined" ? window.location.pathname : undefined),
    tab: args.tab,
    entity_type: args.entity_type,
    entity_id: args.entity_id,
    entity_label: args.entity_label,
  });
}
