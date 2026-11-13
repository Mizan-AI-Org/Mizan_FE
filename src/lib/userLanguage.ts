import type { User } from "@/contexts/AuthContext.types";

export type AppLanguage = "en" | "fr" | "ar";

const APP_LANGUAGES: readonly AppLanguage[] = ["en", "fr", "ar"];

/** "fr-FR" → "fr", legacy "ma" / Darija → "ar"; anything unsupported → null. */
export function normalizeAppLanguage(value: unknown): AppLanguage | null {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return null;
  if (raw === "ma" || raw === "ary" || raw === "ar-ma") return "ar";
  const base = raw.split(/[-_]/)[0];
  return (APP_LANGUAGES as readonly string[]).includes(base) ? (base as AppLanguage) : null;
}

/**
 * The language the app should show for this person: their own choice first (top-level `language` in the
 * login / me payload), then the business default (`restaurant_data.language`), then whatever is showing now.
 * The business language never overrides a person's own choice.
 */
export function resolveUserLanguage(
  user: Pick<User, "language" | "restaurant_data"> | null | undefined,
  current?: string | null,
): AppLanguage | null {
  if (!user) return normalizeAppLanguage(current);
  return (
    normalizeAppLanguage(user.language) ??
    normalizeAppLanguage(user.restaurant_data?.language) ??
    normalizeAppLanguage(current)
  );
}
