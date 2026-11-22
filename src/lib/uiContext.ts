const UI_CONTEXT_KEY = "mizan.uiContext";

export type UiContext = {
  route: string;
  tab?: string;
  category?: string;
  view?: string;
  focus?: string;
  selectedItemId?: string;
  filters?: Record<string, string>;
  counts?: Record<string, number>;
};

export function publishUiContext(partial: Omit<UiContext, "route"> & { route?: string }) {
  try {
    const current = readStored();
    const next = { ...current, ...partial };
    sessionStorage.setItem(UI_CONTEXT_KEY, JSON.stringify(next));
  } catch {
    /* private mode */
  }
}

function readStored(): Partial<UiContext> {
  try {
    const raw = sessionStorage.getItem(UI_CONTEXT_KEY);
    return raw ? (JSON.parse(raw) as Partial<UiContext>) : {};
  } catch {
    return {};
  }
}

/** What the manager is looking at, sent with every agent turn. */
export function currentUiContext(): UiContext {
  const stored = readStored();
  const route = typeof window === "undefined" ? "" : `${window.location.pathname}${window.location.search}`;
  const params = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
  return {
    route,
    tab: params.get("tab") || stored.tab,
    category: params.get("category") || stored.category,
    view: params.get("view") || stored.view,
    focus: params.get("focus") || stored.focus,
    selectedItemId: params.get("item") || params.get("task") || params.get("incident") || stored.selectedItemId,
    filters: stored.filters,
    counts: stored.counts,
  };
}
