import { API_BASE } from "./api";

export type MastraRunResponse = {
  success: boolean;
  text?: string;
  correlationId?: string;
  finishReason?: string;
  mode?: string;
  code?: string;
  message?: string;
  pendingConfirmation?: {
    tool: string;
    arguments?: Record<string, unknown>;
    message?: string;
  };
  requires_confirmation?: boolean;
  verified?: boolean;
};

export type MastraChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Epoch ms — used for timestamps and date dividers */
  createdAt?: number;
  /** User spoke via mic — enables voice reply playback */
  fromVoice?: boolean;
};

const MAX_STORED_MESSAGES = 200;

function isValidStoredMessage(value: unknown): value is MastraChatMessage {
  if (!value || typeof value !== "object") return false;
  const row = value as MastraChatMessage;
  return (
    typeof row.id === "string" &&
    (row.role === "user" || row.role === "assistant") &&
    typeof row.content === "string"
  );
}

export function mastraMessagesStorageKey(userId: string): string {
  return `mizan_mastra_messages_${userId}`;
}

export function loadMastraMessages(userId: string): MastraChatMessage[] {
  try {
    const raw =
      typeof window !== "undefined"
        ? window.localStorage.getItem(mastraMessagesStorageKey(userId))
        : null;
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidStoredMessage).map((msg) => ({
      ...msg,
      createdAt: typeof msg.createdAt === "number" ? msg.createdAt : undefined,
    }));
  } catch {
    return [];
  }
}

export function saveMastraMessages(userId: string, messages: MastraChatMessage[]): void {
  try {
    if (typeof window === "undefined") return;
    const trimmed = messages.slice(-MAX_STORED_MESSAGES);
    window.localStorage.setItem(mastraMessagesStorageKey(userId), JSON.stringify(trimmed));
  } catch {
    // ignore quota / private mode
  }
}

function authHeadersJson(): Record<string, string> {
  return authHeaders();
}

function authHeadersMultipart(): Record<string, string> {
  const headers: Record<string, string> = {
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
    // ignore
  }
  return headers;
}

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

export function isAgentVoiceEnabled(): boolean {
  const flag = import.meta.env.VITE_AGENT_VOICE_ENABLED;
  if (flag === undefined || flag === "") return true;
  return String(flag).toLowerCase() !== "false";
}

export async function transcribeAgentVoice(
  blob: Blob,
  locale?: string,
): Promise<{ success: boolean; text?: string; message?: string; code?: string }> {
  const form = new FormData();
  form.append("audio", blob, blob.type.includes("ogg") ? "voice.ogg" : "voice.webm");
  if (locale) form.append("locale", locale);

  const response = await fetch(`${API_BASE}/mastra/voice/transcribe/`, {
    method: "POST",
    headers: authHeadersMultipart(),
    credentials: "include",
    body: form,
  });

  const data = (await response.json().catch(() => ({}))) as {
    success?: boolean;
    text?: string;
    message?: string;
    code?: string;
  };

  if (!response.ok) {
    return {
      success: false,
      code: data.code || `http_${response.status}`,
      message: data.message || "Could not transcribe voice.",
    };
  }
  return { success: true, text: data.text };
}

export async function synthesizeAgentVoice(
  text: string,
): Promise<{ success: boolean; audioBase64?: string; mimeType?: string; message?: string }> {
  const response = await fetch(`${API_BASE}/mastra/voice/synthesize/`, {
    method: "POST",
    headers: authHeadersJson(),
    credentials: "include",
    body: JSON.stringify({ text }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    success?: boolean;
    audioBase64?: string;
    mimeType?: string;
    message?: string;
  };

  if (!response.ok) {
    return { success: false, message: data.message || "Voice reply failed." };
  }
  return {
    success: true,
    audioBase64: data.audioBase64,
    mimeType: data.mimeType || "audio/mpeg",
  };
}

export async function playAgentVoiceReply(text: string): Promise<void> {
  const result = await synthesizeAgentVoice(text);
  if (!result.success || !result.audioBase64) {
    throw new Error(result.message || "Voice reply failed.");
  }
  const binary = atob(result.audioBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: result.mimeType || "audio/mpeg" });
  const url = URL.createObjectURL(blob);
  try {
    const audio = new Audio(url);
    audio.setAttribute("playsinline", "true");
    await audio.play();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}

export function loadVoiceRepliesEnabled(): boolean {
  try {
    const raw = window.localStorage.getItem("mizan_agent_voice_replies");
    if (raw === "0") return false;
    if (raw === "1") return true;
  } catch {
    // ignore
  }
  return true;
}

export function saveVoiceRepliesEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem("mizan_agent_voice_replies", enabled ? "1" : "0");
  } catch {
    // ignore
  }
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

export function mastraPendingStorageKey(userId: string, conversationId: string): string {
  return `mizan_mastra_pending_${userId}_${conversationId}`;
}

export function loadPendingConfirmation(
  userId: string,
  conversationId: string,
): MastraRunResponse["pendingConfirmation"] | null {
  try {
    const raw = window.localStorage.getItem(mastraPendingStorageKey(userId, conversationId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MastraRunResponse["pendingConfirmation"];
    return parsed?.tool ? parsed : null;
  } catch {
    return null;
  }
}

export function savePendingConfirmation(
  userId: string,
  conversationId: string,
  pending: MastraRunResponse["pendingConfirmation"] | null | undefined,
): void {
  try {
    const key = mastraPendingStorageKey(userId, conversationId);
    if (!pending?.tool) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(pending));
  } catch {
    // ignore
  }
}

export async function fetchMastraTranscript(
  conversationId: string,
): Promise<MastraChatMessage[]> {
  const response = await fetch(
    `${API_BASE}/mastra/transcript/?conversationId=${encodeURIComponent(conversationId)}`,
    { headers: authHeaders(), credentials: "include" },
  );
  const data = (await response.json().catch(() => ({}))) as {
    success?: boolean;
    messages?: Array<{ role?: string; content?: string }>;
  };
  if (!response.ok || !data.success || !Array.isArray(data.messages)) {
    return [];
  }
  const now = Date.now();
  return data.messages
    .filter((row) => row.role === "user" || row.role === "assistant")
    .map((row, index) => ({
      id: `srv-${index}-${now}`,
      role: row.role as "user" | "assistant",
      content: String(row.content || ""),
      createdAt: now,
    }));
}
