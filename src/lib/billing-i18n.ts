/** Localize subscription plan marketing copy that arrives in English from the API. */

type Translate = (
  key: string,
  options?: Record<string, string | number>,
) => string;

function localizedOrFallback(
  t: Translate,
  key: string,
  fallback: string,
): string {
  const translated = t(key);
  if (!translated || translated === key) return fallback;
  return translated;
}

export function translatePlanName(t: Translate, plan: { slug: string; name: string; tier: string }): string {
  return localizedOrFallback(t, `billing.tier.${plan.tier.toLowerCase()}`, plan.name);
}

export function translatePlanDescription(
  t: Translate,
  plan: { slug: string; description: string },
): string {
  return localizedOrFallback(
    t,
    `billing.plan.${plan.slug}.description`,
    plan.description,
  );
}

export function translatePlanBadge(t: Translate, badge: string): string {
  const normalized = badge.trim().toLowerCase().replace(/\s+/g, "_");
  if (!normalized) return "";
  return localizedOrFallback(t, `billing.badge.${normalized}`, badge);
}

/** Prefer per-slug feature list from locales; fall back to English API strings. */
export function translatePlanFeatures(
  t: Translate,
  plan: {
    slug: string;
    features: string[];
    max_staff?: number | null;
    max_locations?: number | null;
  },
): string[] {
  const localized: string[] = [];
  for (let i = 0; i < plan.features.length; i++) {
    const key = `billing.plan.${plan.slug}.feature.${i}`;
    const opts: Record<string, string | number> = {};
    if (plan.max_staff != null) opts.count = plan.max_staff;
    if (plan.max_locations != null) opts.locations = plan.max_locations;
    const translated = t(key, opts);
    if (translated && translated !== key) {
      localized.push(translated);
    } else {
      // Keep marketing copy aligned with live plan limits when API text is stale.
      let fallback = plan.features[i];
      if (plan.max_staff != null && /up to \d+ staff/i.test(fallback)) {
        fallback = `Up to ${plan.max_staff} staff`;
      }
      if (plan.max_locations != null && /up to \d+ locations/i.test(fallback)) {
        fallback = `Up to ${plan.max_locations} locations`;
      }
      if (plan.max_locations === 1 && /^1 location$/i.test(fallback.trim())) {
        fallback = "1 location";
      }
      localized.push(fallback);
    }
  }
  return localized;
}
