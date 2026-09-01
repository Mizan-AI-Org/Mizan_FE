/** Persist Agent widget chat per user + restaurant (survives page refresh). */

export type StoredChatTurn = {
  role: "user" | "assistant";
  content: string;
  at?: number;
};

const STORAGE_VERSION = "v1";
const MAX_TURNS = 48;

function storageKey(userId: string, restaurantId: string): string {
  return `mizan_agent_chat_${STORAGE_VERSION}_${userId}_${restaurantId}`;
}

function normalizeTurn(raw: unknown): StoredChatTurn | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const role = row.role === "assistant" ? "assistant" : row.role === "user" ? "user" : null;
  const content = String(row.content || "").trim();
  if (!role || !content) return null;
  const at = typeof row.at === "number" && Number.isFinite(row.at) ? row.at : undefined;
  return { role, content: content.slice(0, 4000), at };
}

export function loadAgentChatHistory(
  userId: string | undefined,
  restaurantId: string | undefined,
): StoredChatTurn[] {
  if (!userId || !restaurantId || typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(userId, restaurantId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeTurn).filter(Boolean) as StoredChatTurn[];
  } catch {
    return [];
  }
}

export function saveAgentChatHistory(
  userId: string | undefined,
  restaurantId: string | undefined,
  turns: StoredChatTurn[],
  threadId?: string,
): void {
  if (!userId || !restaurantId || typeof window === "undefined") return;
  try {
    const payload = turns.slice(-MAX_TURNS).map((t) => ({
      role: t.role,
      content: t.content.slice(0, 4000),
      ...(t.at ? { at: t.at } : {}),
    }));
    localStorage.setItem(storageKey(userId, restaurantId), JSON.stringify(payload));
    if (threadId) {
      localStorage.setItem(`${storageKey(userId, restaurantId)}_thread`, threadId);
    }
  } catch {
    /* quota / private mode */
  }
}

export function loadAgentThreadId(
  userId: string | undefined,
  restaurantId: string | undefined,
): string | undefined {
  if (!userId || !restaurantId || typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(`${storageKey(userId, restaurantId)}_thread`);
    return raw?.trim() || undefined;
  } catch {
    return undefined;
  }
}

export function saveAgentThreadId(
  userId: string | undefined,
  restaurantId: string | undefined,
  threadId: string | undefined,
): void {
  if (!userId || !restaurantId || !threadId || typeof window === "undefined") return;
  try {
    localStorage.setItem(`${storageKey(userId, restaurantId)}_thread`, threadId);
  } catch {
    /* ignore */
  }
}

export function clearAgentChatHistory(
  userId: string | undefined,
  restaurantId: string | undefined,
): void {
  if (!userId || !restaurantId || typeof window === "undefined") return;
  try {
    localStorage.removeItem(storageKey(userId, restaurantId));
  } catch {
    /* ignore */
  }
}

export function agentChatHistoryForApi(turns: StoredChatTurn[], limit = 8): Array<{ role: string; content: string }> {
  return turns
    .slice(-limit)
    .map((t) => ({ role: t.role, content: t.content }))
    .filter((t) => t.content.trim());
}
