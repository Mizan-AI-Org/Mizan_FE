import type { Language } from "@/contexts/LanguageContext.types";

export const LANGUAGE_OPTIONS: {
  id: Language;
  labelKey: string;
  native: string;
  flag: string;
}[] = [
  { id: "en", labelKey: "onboarding.language.en", native: "English", flag: "🇺🇸" },
  { id: "fr", labelKey: "onboarding.language.fr", native: "Français", flag: "🇫🇷" },
  { id: "ar", labelKey: "onboarding.language.ar", native: "العربية", flag: "🇸🇦" },
];
