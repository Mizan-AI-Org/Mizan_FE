/**
 * Tenant role vocabulary — must stay aligned with
 * Mizan_BE apps.accounts.models.CustomUser.Role and apps.accounts.rbac.
 */

/**
 * Roles allowed to use the web SPA (dashboard, settings, scheduling UI).
 * Everyone else (CHEF, WAITER, BARTENDER, STAFF, …) is WhatsApp-only.
 */
export const WEB_APP_ROLES = [
  "SUPER_ADMIN",
  "OWNER",
  "ADMIN",
  "MANAGER",
  "SUPERVISOR",
] as const;

/** Roles that get the full Miya Manager agent on web (AgentChatPanel). */
export const WEB_AGENT_ROLES = [
  "SUPER_ADMIN",
  "OWNER",
  "ADMIN",
  "MANAGER",
  "SUPERVISOR",
] as const;

/**
 * Core SOAM set — must have identical Agent behavior on web and WhatsApp
 * (same miya-manager tools, drafts, confirm). Aligns with BE AGENT_PARITY_ROLES.
 */
export const AGENT_PARITY_ROLES = [
  "SUPER_ADMIN",
  "OWNER",
  "ADMIN",
  "MANAGER",
] as const;

/** @deprecated alias — same as WEB_APP_ROLES */
export const OPERATIONAL_COMMAND_ROLES = WEB_APP_ROLES;

/** Restaurant owners / privileged editors — full SPA RBAC buckets. */
export const PRIVILEGED_ROLES = ["SUPER_ADMIN", "OWNER", "ADMIN"] as const;

/** Who may edit Role permissions in Settings. */
export const RBAC_EDITOR_ROLES = ["SUPER_ADMIN", "OWNER", "ADMIN"] as const;

export type WebAppRole = (typeof WEB_APP_ROLES)[number];
export type OperationalCommandRole = WebAppRole;
export type PrivilegedRole = (typeof PRIVILEGED_ROLES)[number];

export function normalizeRole(role: string | null | undefined): string {
  return String(role || "").trim().toUpperCase();
}

export function isPrivilegedRole(role: string | null | undefined): boolean {
  const r = normalizeRole(role);
  return (PRIVILEGED_ROLES as readonly string[]).includes(r);
}

export function isWebAppRole(role: string | null | undefined): boolean {
  const r = normalizeRole(role);
  return (WEB_APP_ROLES as readonly string[]).includes(r);
}

export function isWebAgentRole(role: string | null | undefined): boolean {
  const r = normalizeRole(role);
  return (WEB_AGENT_ROLES as readonly string[]).includes(r);
}

export function isAgentParityRole(role: string | null | undefined): boolean {
  const r = normalizeRole(role);
  return (AGENT_PARITY_ROLES as readonly string[]).includes(r);
}

/** Front-of-house / kitchen / general staff — WhatsApp channel only. */
export function isWhatsAppOnlyRole(role: string | null | undefined): boolean {
  const r = normalizeRole(role);
  return Boolean(r) && !isWebAppRole(r);
}

export function hasOperationalCommandRole(role: string | null | undefined): boolean {
  return isWebAppRole(role);
}

/**
 * True when `role` is allowed by `allowed`.
 * Privileged restaurant owners satisfy any allow-list that includes SUPER_ADMIN
 * (or OWNER/ADMIN), so page gates that omit OWNER still work for owners.
 */
export function roleAllowed(
  role: string | null | undefined,
  allowed: readonly string[],
): boolean {
  const r = normalizeRole(role);
  if (!r) return false;
  const set = new Set(allowed.map((a) => normalizeRole(a)));
  if (set.has(r)) return true;
  if (isPrivilegedRole(r) && (set.has("SUPER_ADMIN") || set.has("OWNER") || set.has("ADMIN"))) {
    return true;
  }
  return false;
}

/** Default Mizan staff WhatsApp deep link (overridable via env at build time). */
export const DEFAULT_STAFF_WHATSAPP_URL =
  "https://wa.me/212784476751?text=" + encodeURIComponent("Hi Mizan AI");
