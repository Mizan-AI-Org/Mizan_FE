import raw from "@/lib/dialCountryCodes.json";

export interface DialCountry {
  code: string;
  dial: string;
  label: string;
}

/** Morocco and frequent Mizan markets surface first; everything else is A–Z by localized name. */
export const PRIORITY_DIAL_COUNTRY_CODES = [
  "MA",
  "FR",
  "ES",
  "BE",
  "DZ",
  "TN",
  "SN",
  "CI",
  "CM",
  "AE",
  "SA",
  "QA",
  "KW",
  "BH",
  "OM",
  "EG",
  "GB",
  "US",
  "CA",
  "DE",
  "IT",
  "NL",
  "PT",
  "IN",
  "PK",
  "NG",
  "KE",
  "ZA",
] as const;

export const DEFAULT_DIAL_COUNTRY_CODE = "MA";
export const DEFAULT_DIAL_CODE = "212";

const RAW_ENTRIES = raw as { code: string; dial: string }[];

let displayNamesEn: Intl.DisplayNames | null = null;
let displayNamesFr: Intl.DisplayNames | null = null;
let displayNamesAr: Intl.DisplayNames | null = null;

function regionNames(locale: string): Intl.DisplayNames {
  const key = locale.split("-")[0];
  if (key === "ar") {
    displayNamesAr ??= new Intl.DisplayNames(["ar"], { type: "region" });
    return displayNamesAr;
  }
  if (key === "fr") {
    displayNamesFr ??= new Intl.DisplayNames(["fr"], { type: "region" });
    return displayNamesFr;
  }
  displayNamesEn ??= new Intl.DisplayNames(["en"], { type: "region" });
  return displayNamesEn;
}

export function dialCountryLabel(code: string, dial: string, locale: string): string {
  const name = regionNames(locale).of(code) || code;
  return `${name} +${dial}`;
}

export function buildDialCountries(locale: string): DialCountry[] {
  const priority = new Set<string>(PRIORITY_DIAL_COUNTRY_CODES);
  const ranked = RAW_ENTRIES.map((entry) => ({
    ...entry,
    label: dialCountryLabel(entry.code, entry.dial, locale),
  }));

  ranked.sort((a, b) => {
    const ap = priority.has(a.code) ? PRIORITY_DIAL_COUNTRY_CODES.indexOf(a.code as (typeof PRIORITY_DIAL_COUNTRY_CODES)[number]) : 999;
    const bp = priority.has(b.code) ? PRIORITY_DIAL_COUNTRY_CODES.indexOf(b.code as (typeof PRIORITY_DIAL_COUNTRY_CODES)[number]) : 999;
    if (ap !== bp) return ap - bp;
    return a.label.localeCompare(b.label, locale, { sensitivity: "base" });
  });

  return ranked;
}

export function filterDialCountries(countries: DialCountry[], query: string): DialCountry[] {
  const n = query.trim().toLowerCase();
  if (!n) return countries;
  const digits = n.replace(/\D/g, "");
  return countries.filter((c) => {
    if (c.label.toLowerCase().includes(n)) return true;
    if (c.code.toLowerCase().includes(n)) return true;
    if (n.startsWith("+") && `+${c.dial}`.startsWith(n)) return true;
    if (digits && c.dial.startsWith(digits)) return true;
    if (digits && c.dial.includes(digits)) return true;
    return false;
  });
}

export function dialForCountryCode(code: string): string {
  return RAW_ENTRIES.find((e) => e.code === code)?.dial ?? DEFAULT_DIAL_CODE;
}

/** @deprecated Prefer `buildDialCountries` + `DialCountrySelect`; kept for older imports. */
export const DIAL_COUNTRIES: DialCountry[] = buildDialCountries("fr");