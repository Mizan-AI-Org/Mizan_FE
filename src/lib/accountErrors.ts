import i18n from "@/i18n";
import { API_BASE, authFetch } from "@/lib/api";

/** Version of the Terms + Privacy text the signup records (the backend stores it with the acceptance time). */
export const LEGAL_VERSION = "2026-11-12";

export interface AccountResponse<T = Record<string, unknown>> {
  ok: boolean;
  status: number;
  data: T;
  code: string;
  /** Message in the person's language: from the server's `code` when we know it, else the server text. */
  error: string;
}

/** Server error codes of the account endpoints (apps/accounts/account_essentials.py) -> locale keys. */
const CODE_KEYS: Record<string, string> = {
  terms_required: "account.errors.terms_required",
  email_taken: "account.errors.email_taken",
  email_invalid: "account.errors.email_invalid",
  email_needs_password: "account.errors.email_needs_password",
  whatsapp_required: "account.errors.whatsapp_required",
  whatsapp_invalid: "account.errors.whatsapp_invalid",
  whatsapp_taken: "account.errors.whatsapp_taken",
  whatsapp_use_code: "account.errors.whatsapp_use_code",
  whatsapp_missing: "account.errors.whatsapp_missing",
  password_weak: "account.errors.password_weak",
  password_mismatch: "profile.errors.password_mismatch",
  password_fields_required: "profile.errors.password_fields_required",
  wrong_current: "profile.errors.wrong_current",
  wrong_password: "profile.errors.wrong_current",
  first_name_required: "account.errors.first_name_required",
  code_wrong: "account.errors.code_wrong",
  code_expired: "account.errors.code_expired",
  cooldown: "account.errors.cooldown",
  too_many: "account.errors.too_many",
  reset_invalid: "auth.reset.invalid_link",
  owner_only: "account.errors.owner_only",
  last_owner: "account.errors.last_owner",
  confirm_name: "account.errors.confirm_name",
  already_closed: "account.errors.already_closed",
};

export function accountErrorText(code: string | undefined, fallback: string): string {
  const key = code ? CODE_KEYS[code] : undefined;
  if (!key) return fallback;
  const text = i18n.t(key) as string;
  return text && text !== key ? text : fallback;
}

/** Message for a failed account response body ({code?, error?, message?, detail?}). */
export function accountErrorFrom(body: unknown, fallback: string): string {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const raw = [b.error, b.detail, b.message].find((v) => typeof v === "string" && v) as string | undefined;
  return accountErrorText(typeof b.code === "string" ? b.code : undefined, raw || fallback);
}

/** Authenticated JSON call to an account endpoint; never throws on an HTTP error, returns {ok, error, code}. */
export async function accountRequest<T = Record<string, unknown>>(
  path: string,
  method: "GET" | "POST" | "PATCH" = "GET",
  body?: unknown,
): Promise<AccountResponse<T>> {
  const response = await authFetch(`${API_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let parsed: unknown = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }
  const p = (parsed && typeof parsed === "object" ? parsed : {}) as Record<string, unknown>;
  const fallback = i18n.t("account.errors.generic") as string;
  return {
    ok: response.ok,
    status: response.status,
    data: ((p.data as T) ?? (p as T)) as T,
    code: typeof p.code === "string" ? p.code : "",
    error: response.ok ? "" : accountErrorFrom(p, fallback),
  };
}

export interface DialCountry {
  code: string;
  dial: string;
  label: string;
}

/** Morocco first (default); any other country is allowed through "Other" (type the number with its +code). */
export const DIAL_COUNTRIES: DialCountry[] = [
  { code: "MA", dial: "212", label: "Maroc +212" },
  { code: "FR", dial: "33", label: "France +33" },
  { code: "ES", dial: "34", label: "España +34" },
  { code: "BE", dial: "32", label: "Belgique +32" },
  { code: "DZ", dial: "213", label: "Algérie +213" },
  { code: "TN", dial: "216", label: "Tunisie +216" },
  { code: "SN", dial: "221", label: "Sénégal +221" },
  { code: "AE", dial: "971", label: "UAE +971" },
  { code: "SA", dial: "966", label: "السعودية +966" },
  { code: "GB", dial: "44", label: "UK +44" },
  { code: "US", dial: "1", label: "US +1" },
];

/**
 * The WhatsApp number as international digits-with-plus. A number typed with "+" or "00" is kept as typed (any
 * country); otherwise the national number gets the chosen country's code, dropping a leading trunk "0".
 */
export function composeWhatsAppNumber(input: string, dial: string): string {
  const raw = String(input || "").trim();
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (raw.startsWith("+")) return `+${digits}`;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (dial && digits.startsWith(dial) && digits.length >= dial.length + 8) return `+${digits}`;
  return `+${dial}${digits.replace(/^0+/, "")}`;
}

export function isPlausibleWhatsApp(e164: string): boolean {
  const n = e164.replace(/\D/g, "");
  return n.length >= 8 && n.length <= 15;
}

/** Write helpers named like the other API wrappers so the web-to-Miya parity scan sees these calls. */
export const apiPost = <T = Record<string, unknown>>(path: string, body?: unknown) =>
  accountRequest<T>(path, "POST", body);
