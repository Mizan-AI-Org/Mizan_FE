/** Regional defaults: Mizan is Morocco-first, so a business that never chose gets Casablanca time and dirhams. */
export const DEFAULT_TIMEZONE = "Africa/Casablanca";
export const DEFAULT_CURRENCY = "MAD";

/** Same list the backend accepts (Mizan_BE apps/accounts/unified_settings.py CURRENCIES). */
export const CURRENCY_CODES = ["MAD", "EUR", "USD", "GBP", "AED", "SAR", "XOF", "TND", "DZD", "EGP", "CAD", "CHF"] as const;

export const TIMEZONES = [
  "Africa/Casablanca",
  "Africa/Algiers",
  "Africa/Tunis",
  "Africa/Cairo",
  "Africa/Dakar",
  "Europe/Paris",
  "Europe/Madrid",
  "Europe/London",
  "Europe/Brussels",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Riyadh",
  "America/Toronto",
  "America/New_York",
  "UTC",
] as const;

/** The list, plus the business's own value when it is something we don't list (never silently replaced). */
export function withCurrent<T extends string>(list: readonly T[], current: string): string[] {
  return current && !(list as readonly string[]).includes(current) ? [current, ...list] : [...list];
}
