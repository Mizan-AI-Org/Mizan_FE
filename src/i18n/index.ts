import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

// Supported languages
export const supportedLanguages = ['en', 'fr', 'ar'] as const;
export type SupportedLanguage = typeof supportedLanguages[number];

// Helper to update document direction and lang
export const applyLanguageAttributes = (lng: SupportedLanguage) => {
  const isRTL = lng === 'ar';
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
};

// Initialize i18n with lazy-loaded resources
i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: supportedLanguages as unknown as string[],
    fallbackLng: 'en',
    returnEmptyString: false,
    saveMissing: false,
    // Load resources from public folder for smaller bundle
    backend: {
      loadPath: '/locales/{{lng}}.json',
    },
    detection: {
      // Prefer server cookie if present, then localStorage, then browser
      order: ['cookie', 'localStorage', 'navigator', 'htmlTag', 'path', 'querystring'],
      caches: ['localStorage', 'cookie'],
      lookupCookie: 'language',
      lookupLocalStorage: 'language',
    },
    interpolation: {
      escapeValue: false, // react already escapes
    },
    react: {
      useSuspense: true,
    },
  });

// Apply initial document attributes
applyLanguageAttributes((i18n.language as SupportedLanguage) || 'en');

// Update attributes when language changes
i18n.on('languageChanged', (lng) => {
  applyLanguageAttributes((lng as SupportedLanguage) || 'en');
  // Optional: add a transient class for smooth fade transitions
  const root = document.documentElement;
  root.classList.add('lang-changing');
  window.setTimeout(() => root.classList.remove('lang-changing'), 150);
});

// Log missing translation keys during development for visibility
if (import.meta && import.meta.env && import.meta.env.DEV) {
  i18n.on('missingKey', (lngs, namespace, key) => {
    // eslint-disable-next-line no-console
    console.warn(`[i18n] Missing key: ${key} in ${lngs?.join(', ') || 'unknown'} (${namespace})`);
  });
}

export default i18n;