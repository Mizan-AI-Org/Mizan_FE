// Offline queue with optional encryption using Web Crypto API (AES-GCM)

export interface OfflineClockPayload {
  type: "clock_in" | "clock_out";
  employeeId: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  timestampISO: string;
  date: string; // YYYY-MM-DD
  photo: string; // base64 data URL
}

const KEY = "timeclock_offline_queue_v1";
const KEY_SECURE = "timeclock_offline_queue_secure_v1";
const DEVICE_SECRET_KEY = "timeclock_device_secret_v1";

function getOrCreateDeviceSecret(): string {
  try {
    const existing = localStorage.getItem(DEVICE_SECRET_KEY);
    if (existing) return existing;
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    const secret = Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
    localStorage.setItem(DEVICE_SECRET_KEY, secret);
    return secret;
  } catch (_) {
    return "fallback-static-secret"; // fallback when storage unavailable
  }
}

async function deriveAesKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  const salt = enc.encode("timeclock-offline-salt");
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function abToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function base64ToAb(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function encryptJSON(data: unknown, secret: string): Promise<string> {
  const key = await deriveAesKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const plaintext = enc.encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  const payload = abToBase64(iv.buffer) + ":" + abToBase64(ciphertext);
  return payload;
}

async function decryptJSON(payload: string, secret: string): Promise<unknown> {
  const [ivB64, ctB64] = payload.split(":");
  const key = await deriveAesKey(secret);
  const iv = new Uint8Array(base64ToAb(ivB64));
  const ciphertext = base64ToAb(ctB64);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  const dec = new TextDecoder();
  const json = dec.decode(plaintext);
  return JSON.parse(json);
}

export function enqueueClockPayload(item: OfflineClockPayload) {
  try {
    const raw = localStorage.getItem(KEY);
    const arr: OfflineClockPayload[] = raw ? JSON.parse(raw) : [];
    arr.push(item);
    localStorage.setItem(KEY, JSON.stringify(arr));
  } catch (_) {
    // Ignore storage errors
  }
}

export function dequeueAll(): OfflineClockPayload[] {
  try {
    const raw = localStorage.getItem(KEY);
    const arr: OfflineClockPayload[] = raw ? JSON.parse(raw) : [];
    localStorage.removeItem(KEY);
    return arr;
  } catch (_) {
    return [];
  }
}

export function peekAll(): OfflineClockPayload[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

// Secure variants using device secret
export async function enqueueClockPayloadSecure(item: OfflineClockPayload, secret?: string) {
  try {
    const s = secret || getOrCreateDeviceSecret();
    const raw = localStorage.getItem(KEY_SECURE);
    const arr: OfflineClockPayload[] = raw ? (await decryptJSON(raw, s)) as OfflineClockPayload[] : [];
    arr.push(item);
    const encPayload = await encryptJSON(arr, s);
    localStorage.setItem(KEY_SECURE, encPayload);
  } catch (_) {
    // fallback to plaintext queue
    enqueueClockPayload(item);
  }
}

export async function dequeueAllSecure(secret?: string): Promise<OfflineClockPayload[]> {
  try {
    const s = secret || getOrCreateDeviceSecret();
    const raw = localStorage.getItem(KEY_SECURE);
    if (!raw) return [];
    const arr = (await decryptJSON(raw, s)) as OfflineClockPayload[];
    localStorage.removeItem(KEY_SECURE);
    return arr;
  } catch (_) {
    // fallback to plaintext
    return dequeueAll();
  }
}

export async function peekAllSecure(secret?: string): Promise<OfflineClockPayload[]> {
  try {
    const s = secret || getOrCreateDeviceSecret();
    const raw = localStorage.getItem(KEY_SECURE);
    if (!raw) return [];
    return (await decryptJSON(raw, s)) as OfflineClockPayload[];
  } catch (_) {
    return peekAll();
  }
}

export function initDeviceSecret(): string {
  return getOrCreateDeviceSecret();
}