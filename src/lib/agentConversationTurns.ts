export type ConversationTurnSpeaker = "user" | "miya";

export type ConversationTurnLike = {
  is_proactive?: boolean;
  direction?: string;
  role?: string;
  user_message?: string;
  miya_reply?: string;
  content?: string;
};

export type ConversationTurnBlock = {
  speaker: ConversationTurnSpeaker;
  text: string;
};

export function conversationTurnBlocks(turn: ConversationTurnLike): ConversationTurnBlock[] {
  if (turn.is_proactive) {
    const text = (turn.miya_reply || turn.content || "").trim();
    return text ? [{ speaker: "miya", text }] : [];
  }
  const userText = (turn.user_message || "").trim();
  const miyaText = (turn.miya_reply || "").trim();
  if (userText && miyaText) {
    return [
      { speaker: "user", text: userText },
      { speaker: "miya", text: miyaText },
    ];
  }
  if (userText) return [{ speaker: "user", text: userText }];
  if (miyaText) return [{ speaker: "miya", text: miyaText }];
  const fallback = (turn.content || "").trim();
  if (!fallback) return [];
  if (turn.role === "assistant" || turn.direction === "outbound") {
    return [{ speaker: "miya", text: fallback }];
  }
  return [{ speaker: "user", text: fallback }];
}

export const AGENT_USER_FALLBACK = "I'm here. What do you need?";

export function userFacingAgentMessage(
  raw: unknown,
  fallback: string = AGENT_USER_FALLBACK,
): string {
  const text = String(raw ?? "").trim();
  const low = text.toLowerCase();
  if (
    !text ||
    low.includes("lua agent") ||
    low.includes("trouble reaching the lua") ||
    low.includes("celery workers") ||
    low.includes("agent timed out") ||
    low.includes("still thinking") ||
    low.includes("failed to fetch") ||
    low.includes("openai_api_key") ||
    (low.includes("heylua") && (low.includes("offline") || low.includes("trouble")))
  ) {
    return fallback;
  }
  return text;
}
