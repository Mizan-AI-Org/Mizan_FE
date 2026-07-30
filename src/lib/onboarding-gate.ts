/**
 * Client-only onboarding bypass flag helpers.
 *
 * Historically a single ``onboarding_skipped=true`` key was set when an owner
 * skipped the wizard (or when the skip request failed). That key was global
 * to the browser and never cleared on logout/signup, so every *new* business
 * created later on the same machine silently bypassed onboarding.
 *
 * Prefer the server field ``restaurant_data.onboarding_completed_at``. These
 * helpers only exist to purge the legacy key and any restaurant-scoped
 * leftovers.
 */

const LEGACY_SKIP_KEY = "onboarding_skipped";
const SKIP_PREFIX = "onboarding_skipped";

export function clearOnboardingSkipFlags(): void {
  try {
    localStorage.removeItem(LEGACY_SKIP_KEY);
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && (key === LEGACY_SKIP_KEY || key.startsWith(`${SKIP_PREFIX}:`))) {
        toRemove.push(key);
      }
    }
    toRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    // ignore storage failures (private mode, quota, …)
  }
}

/** True when this tenant has finished (or permanently skipped) onboarding. */
export function restaurantOnboardingComplete(user: {
  restaurant_data?: { onboarding_completed_at?: string | null } | null;
} | null | undefined): boolean {
  return Boolean(user?.restaurant_data?.onboarding_completed_at);
}
