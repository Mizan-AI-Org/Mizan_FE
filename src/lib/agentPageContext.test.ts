import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  askAgent,
  clearAgentPageContext,
  focusEntityForAgent,
  getAgentPageContext,
  setAgentPageContext,
} from "@/lib/agentPageContext";

describe("agentPageContext", () => {
  beforeEach(() => {
    clearAgentPageContext();
  });

  it("stores focused entity", () => {
    focusEntityForAgent({
      entity_type: "incident",
      entity_id: "inc-1",
      entity_label: "POS down",
      route: "/dashboard/analytics",
    });
    expect(getAgentPageContext()).toMatchObject({
      entity_type: "incident",
      entity_id: "inc-1",
      entity_label: "POS down",
    });
  });

  it("askAgent dispatches open event with prompt", () => {
    const spy = vi.fn();
    window.addEventListener("agent:open", spy as EventListener);
    askAgent({
      prompt: "Has this happened before?",
      pageContext: {
        entity_type: "incident",
        entity_id: "inc-2",
      },
    });
    expect(getAgentPageContext()?.entity_id).toBe("inc-2");
    expect(spy).toHaveBeenCalled();
    const detail = (spy.mock.calls[0][0] as CustomEvent).detail;
    expect(detail.prompt).toContain("happened before");
    window.removeEventListener("agent:open", spy as EventListener);
  });

  it("clears empty context", () => {
    setAgentPageContext({ entity_type: "task", entity_id: "t1" });
    setAgentPageContext(null);
    expect(getAgentPageContext()).toBeNull();
  });
});
