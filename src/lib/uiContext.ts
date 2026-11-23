/**
 * What the manager is looking at (page, tab, filters, selected item), sent with every Miya chat turn so
 * "this task" / "ces demandes" / "what's on this page" mean what is on screen. Django re-validates it
 * (apps/companion/ui_context.py); the agent turns it into one prompt line.
 */
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

type Stored = Partial<UiContext> & { path?: string };

function readStored(): Stored {
  try {
    const raw = sessionStorage.getItem(UI_CONTEXT_KEY);
    return raw ? (JSON.parse(raw) as Stored) : {};
  } catch {
    return {};
  }
}

/** A page says what it shows right now. Replaces what was published before for the same page. */
export function publishUiContext(partial: Omit<UiContext, "route"> & { route?: string }) {
  try {
    const path = typeof window === "undefined" ? "" : window.location.pathname;
    const current = readStored();
    const base = current.path === path ? current : {};
    sessionStorage.setItem(UI_CONTEXT_KEY, JSON.stringify({ ...base, ...partial, path }));
  } catch {
    /* private mode */
  }
}

export function clearUiContext() {
  try {
    sessionStorage.removeItem(UI_CONTEXT_KEY);
  } catch {
    /* private mode */
  }
}

/** Pure: the URL (its own tab/category/item params win) plus what the page published for this same path. */
export function buildUiContext(pathname: string, search: string, stored: Stored = {}): UiContext {
  const params = new URLSearchParams(search);
  const fresh = stored.path === pathname ? stored : {};
  const out: UiContext = {
    route: `${pathname}${search}`,
    tab: params.get("tab") || fresh.tab,
    category: params.get("category") || fresh.category,
    view: params.get("view") || fresh.view,
    focus: params.get("focus") || fresh.focus,
    selectedItemId: params.get("item") || params.get("task") || params.get("incident") || fresh.selectedItemId,
    filters: fresh.filters,
    counts: fresh.counts,
  };
  (Object.keys(out) as (keyof UiContext)[]).forEach((key) => {
    if (out[key] === undefined || out[key] === "") delete out[key];
  });
  return out;
}

export function currentUiContext(): UiContext {
  if (typeof window === "undefined") return { route: "" };
  return buildUiContext(window.location.pathname, window.location.search, readStored());
}