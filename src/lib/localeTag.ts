import type { Language } from "@/contexts/LanguageContext.types";

export function localeTag(language: Language): string {
  switch (language) {
    case "fr":
      return "fr-FR";
    case "ar":
      return "ar";
    default:
      return "en-US";
  }
}

/** Translate backend widget subtitles like "6 task(s)". */
export function translateWidgetTaskSubtitle(
  subtitle: string | undefined | null,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string | undefined {
  if (!subtitle?.trim()) return subtitle ?? undefined;
  const match = subtitle.trim().match(/^(\d+)\s+task\(s\)$/i);
  if (!match) return subtitle;
  return t("dashboard.custom_widget.task_count", { count: Number(match[1]) });
}
