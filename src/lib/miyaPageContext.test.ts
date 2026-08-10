import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  askMiya,
  clearMiyaPageContext,
  focusEntityForMiya,
  getMiyaPageContext,
  setMiyaPageContext,
} from "@/lib/miyaPageContext";

describe("miyaPageContext", () => {
  beforeEach(() => {
    clearMiyaPageContext();
  });

  it("stores focused entity", () => {
    focusEntityForMiya({
      entity_type: "incident",
      entity_id: "inc-1",
      entity_label: "POS down",
      route: "/dashboard/analytics",
    });
    expect(getMiyaPageContext()).toMatchObject({
      entity_type: "incident",
      entity_id: "inc-1",
      entity_label: "POS down",
    });
  });

  it("askMiya dispatches open event with prompt", () => {
    const spy = vi.fn();
    window.addEventListener("miya:open", spy as EventListener);
    askMiya({
      prompt: "Has this happened before?",
      pageContext: {
        entity_type: "incident",
        entity_id: "inc-2",
      },
    });
    expect(getMiyaPageContext()?.entity_id).toBe("inc-2");
    expect(spy).toHaveBeenCalled();
    const detail = (spy.mock.calls[0][0] as CustomEvent).detail;
    expect(detail.prompt).toContain("happened before");
    window.removeEventListener("miya:open", spy as EventListener);
  });

  it("clears empty context", () => {
    setMiyaPageContext({ entity_type: "task", entity_id: "t1" });
    setMiyaPageContext(null);
    expect(getMiyaPageContext()).toBeNull();
  });
});
