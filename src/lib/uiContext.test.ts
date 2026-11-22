import { afterEach, describe, expect, it } from "vitest";

import { buildUiContext, clearUiContext, currentUiContext, publishUiContext } from "./uiContext";

describe("uiContext", () => {
  afterEach(() => {
    clearUiContext();
    window.history.pushState({}, "", "/");
  });

  it("reads tab, category and the selected item from the URL", () => {
    const ui = buildUiContext("/dashboard/operations/live", "?tab=approvals&category=incidents&task=t-1");
    expect(ui).toEqual({
      route: "/dashboard/operations/live?tab=approvals&category=incidents&task=t-1",
      tab: "approvals",
      category: "incidents",
      selectedItemId: "t-1",
    });
  });

  it("merges what the page published, for that page only", () => {
    const stored = { path: "/dashboard/operations/live", tab: "in_progress", filters: { staff: "Omar" } };
    expect(buildUiContext("/dashboard/operations/live", "", stored)).toMatchObject({
      tab: "in_progress",
      filters: { staff: "Omar" },
    });
    // another page never inherits it
    const other = buildUiContext("/dashboard/inventory", "", stored);
    expect(other).toEqual({ route: "/dashboard/inventory" });
  });

  it("the URL wins over a published tab", () => {
    const stored = { path: "/x", tab: "pending" };
    expect(buildUiContext("/x", "?tab=completed", stored).tab).toBe("completed");
  });

  it("publish then read through sessionStorage for the current path", () => {
    window.history.pushState({}, "", "/dashboard/operations/live?view=x");
    publishUiContext({ tab: "completed", filters: { q: "fryer" } });
    expect(currentUiContext()).toMatchObject({
      route: "/dashboard/operations/live?view=x",
      tab: "completed",
      view: "x",
      filters: { q: "fryer" },
    });
    window.history.pushState({}, "", "/dashboard/staff");
    expect(currentUiContext().tab).toBeUndefined();
  });
});
