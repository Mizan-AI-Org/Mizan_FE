// Supported UI languages (system-wide)
export type Language = 'en' | 'fr' | 'ar';

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
  // Live switching state
  isChanging: boolean;
  error?: string | null;
}

