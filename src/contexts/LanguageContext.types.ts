export type Language = 'en' | 'fr' | 'ma';

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
  // Live switching state
  isChanging: boolean;
  error?: string | null;
}

