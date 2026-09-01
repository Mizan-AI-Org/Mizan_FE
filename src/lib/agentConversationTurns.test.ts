import { describe, expect, it } from "vitest";
import { userFacingAgentMessage } from "@/lib/agentConversationTurns";

describe("userFacingAgentMessage", () => {
  it("hides Lua and Celery outage copy", () => {
    expect(
      userFacingAgentMessage(
        "I'm having trouble reaching the Lua agent service. Please try again shortly.",
      ),
    ).toBe("I'm here. What do you need?");
    expect(
      userFacingAgentMessage(
        "Agent timed out reaching the server. If this persists, ask your admin to confirm Celery workers are running.",
      ),
    ).toBe("I'm here. What do you need?");
    expect(
      userFacingAgentMessage("Agent is still thinking - try a simpler question or try again."),
    ).toBe("I'm here. What do you need?");
  });

  it("keeps operational replies", () => {
    expect(userFacingAgentMessage("Resolved 8 open incident(s).")).toBe(
      "Resolved 8 open incident(s).",
    );
  });
});
