import { describe, expect, it } from "vitest";
import { conversationTurnBlocks } from "@/lib/miyaConversationTurns";

describe("conversationTurnBlocks", () => {
  it("shows user then Miya for exchange turns", () => {
    expect(
      conversationTurnBlocks({
        direction: "exchange",
        user_message: "Hey Miya did my manager approve my request",
        miya_reply: "Your advance payment request is pending.",
      }),
    ).toEqual([
      { speaker: "user", text: "Hey Miya did my manager approve my request" },
      { speaker: "miya", text: "Your advance payment request is pending." },
    ]);
  });

  it("keeps session-only assistant history as Miya", () => {
    expect(
      conversationTurnBlocks({
        role: "assistant",
        user_message: "",
        miya_reply: "Your leave request is pending.",
      }),
    ).toEqual([{ speaker: "miya", text: "Your leave request is pending." }]);
  });

  it("labels proactive turns as Miya", () => {
    expect(
      conversationTurnBlocks({
        is_proactive: true,
        miya_reply: "Morning briefing is ready.",
      }),
    ).toEqual([{ speaker: "miya", text: "Morning briefing is ready." }]);
  });
});
