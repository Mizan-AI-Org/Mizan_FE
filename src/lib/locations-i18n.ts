/** Shared i18n helpers for Locations Overview / branch detail. */

type Translate = (
  key: string,
  options?: Record<string, string | number>,
) => string;

export function formatPortfolioMoney(
  amount: number,
  language: string,
  currencyLabel = "MAD",
): string {
  const abs = Math.abs(amount);
  const rounded = abs >= 100 ? Math.round(abs) : Math.round(abs * 100) / 100;
  const sign = amount < 0 ? "−" : "";
  return `${sign}${rounded.toLocaleString(language)} ${currencyLabel}`;
}

export function translateTopConcern(
  t: Translate,
  row: {
    top_concern?: string | null;
    top_concern_code?: string | null;
    top_concern_params?: Record<string, string | number>;
  },
): string {
  const code = row.top_concern_code;
  if (code) {
    const key = `locations_overview.concern.${code}`;
    const translated = t(key, row.top_concern_params || {});
    if (translated && translated !== key) return translated;
  }
  if (row.top_concern) return row.top_concern;
  return t("locations_overview.all_systems_go");
}
