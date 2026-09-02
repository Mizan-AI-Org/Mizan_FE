import { API_BASE } from "./api";

export type MastraRunResponse = {
  success: boolean;
  text?: string;
  correlationId?: string;
  finishReason?: string;
  mode?: string;
  code?: string;
  message?: string;
};

export type MastraChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  try {
    const token =
      typeof window !== "undefined" ? window.localStorage.getItem("access_token") : null;
    if (token) headers.Authorization = `Bearer ${token}`;
    const lang =
      (typeof window !== "undefined" && window.localStorage.getItem("language")) ||
      (typeof document !== "undefined" && document.documentElement.lang) ||
      "en";
    headers["Accept-Language"] = lang;
  } catch {
    // ignore storage errors
  }
  return headers;
}

export function isMastraChatEnabled(): boolean {
  const flag = import.meta.env.VITE_MASTRA_CHAT_ENABLED;
  if (flag === undefined || flag === "") return true;
  return String(flag).toLowerCase() !== "false";
}

export async function runMastraChat(body: {
  message: string;
  conversationId?: string;
  channel?: "web";
  locale?: string;
  locationId?: string;
}): Promise<MastraRunResponse> {
  const response = await fetch(`${API_BASE}/mastra/run/`, {
    method: "POST",
    headers: authHeaders(),
    credentials: "include",
    body: JSON.stringify({
      message: body.message,
      conversationId: body.conversationId,
      channel: body.channel ?? "web",
      locale: body.locale,
      locationId: body.locationId,
    }),
  });

  const data = (await response.json().catch(() => ({}))) as MastraRunResponse;
  if (!response.ok) {
    return {
      success: false,
      code: data.code || `http_${response.status}`,
      message: data.message || "Agent request failed.",
    };
  }
  return data;
}

export function mastraConversationStorageKey(userId: string): string {
  return `mizan_mastra_conversation_${userId}`;
}
