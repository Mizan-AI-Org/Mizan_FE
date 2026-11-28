import { format as dfFormat, type Locale } from "date-fns";
import { ar as dfAr, enGB as dfEnGB, fr as dfFr } from "date-fns/locale";
import type { Language } from "@/contexts/LanguageContext.types";

export function localeTag(language: Language): string {
  switch (language) {
    case "fr":
      return "fr-FR";
    case "ar":
      return "ar-MA";
    default:
      return "en-GB";
  }
}

/** fr and ar read 24h clocks; en stays 12h with AM/PM. */
export function uses24h(language: Language): boolean {
  return language !== "en";
}

/** date-fns locale for the UI language (month/weekday names). */
export function dateFnsLocale(language: Language): Locale {
  switch (language) {
    case "fr":
      return dfFr;
    case "ar":
      return dfAr;
    default:
      return dfEnGB;
  }
}

/** "09:30" (fr/ar) or "9:30 AM" (en) from a Date or "HH:mm[:ss]" string. */
export function formatClockTime(value: Date | string, language: Language): string {
  let h: number;
  let m: number;
  if (value instanceof Date) {
    h = value.getHours();
    m = value.getMinutes();
  } else {
    const [hh, mm] = value.split(":");
    h = parseInt(hh, 10);
    m = parseInt(mm || "0", 10);
    if (Number.isNaN(h)) return "";
  }
  const mm = String(Number.isNaN(m) ? 0 : m).padStart(2, "0");
  if (uses24h(language)) return `${String(h).padStart(2, "0")}:${mm}`;
  return `${h % 12 || 12}:${mm} ${h >= 12 ? "PM" : "AM"}`;
}

/** UI language read outside React (module-level helpers); components should prefer useLanguage(). */
export function currentLanguage(): Language {
  try {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem("language") : null;
    if (saved === "fr" || saved === "ar" || saved === "en") return saved;
    if (saved === "ma" || saved === "ar-MA") return "ar";
  } catch {
    /* storage unavailable */
  }
  return "en";
}

type DateInput = Date | string | number;

function asDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

/** Date in the UI language (fr-FR / ar-MA / en-GB). Defaults to the current UI language. */
export function formatDate(
  value: DateInput,
  language: Language = currentLanguage(),
  opts?: Intl.DateTimeFormatOptions,
): string {
  return asDate(value).toLocaleDateString(localeTag(language), opts);
}

/** Time of day in the UI language, 24h for fr/ar. */
export function formatTime(
  value: DateInput,
  language: Language = currentLanguage(),
  opts?: Intl.DateTimeFormatOptions,
): string {
  return asDate(value).toLocaleTimeString(localeTag(language), { hour12: !uses24h(language), ...opts });
}

/** Date + time in the UI language with a 24h clock for fr/ar. */
export function formatDateTime(
  value: DateInput,
  language: Language = currentLanguage(),
  opts?: Intl.DateTimeFormatOptions,
): string {
  return asDate(value).toLocaleString(localeTag(language), { hour12: !uses24h(language), ...opts });
}

/** date-fns format() with the UI language's locale. Use only for display patterns, never for ISO/API strings. */
export function formatPattern(
  value: Date | number,
  pattern: string,
  language: Language = currentLanguage(),
): string {
  return dfFormat(value, pattern, { locale: dateFnsLocale(language) });
}

/** Translate backend widget subtitles like "6 task(s)". */
export function translateWidgetTaskSubtitle(
  subtitle: string | undefined | null,
  t: (key: string, opts?: Record<string, string | number>) => string,
): string | undefined {
  if (!subtitle?.trim()) return subtitle ?? undefined;
  const match = subtitle.trim().match(/^(\d+)\s+task\(s\)$/i);
  if (!match) return subtitle;
  return t("dashboard.custom_widget.task_count", { count: Number(match[1]) });
}
