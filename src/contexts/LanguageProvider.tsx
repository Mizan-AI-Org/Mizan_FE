import { ReactNode, useEffect, useCallback, useState } from 'react';
import { Language, LanguageContextType } from './LanguageContext.types';
import { LanguageContext } from './LanguageContext';
import i18n, { applyLanguageAttributes } from '../i18n';

// Backwards compatibility: some older builds stored 'ma' (Darija) in localStorage/cookies.
// We now treat Arabic as 'ar' system language.
const normalizeLanguage = (lng: string): Language => {
  if (lng === 'ma' || lng === 'ar-MA') return 'ar';
  if (lng === 'en' || lng === 'fr' || lng === 'ar') return lng as Language;
  return 'en';
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(i18n.isInitialized);
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return normalizeLanguage(saved || i18n.language || 'en');
  });
  const [isChanging, setIsChanging] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Gate rendering until i18next has loaded its translation resources
  useEffect(() => {
    if (i18n.isInitialized) {
      setReady(true);
      return;
    }
    const onInit = () => setReady(true);
    i18n.on('initialized', onInit);
    return () => { i18n.off('initialized', onInit); };
  }, []);

  const isRTL = language === 'ar';

  useEffect(() => {
    // Keep i18next in sync with our context
    if (i18n.language !== language) {
      i18n.changeLanguage(language).catch((err) => {
        setError(`Failed to change language: ${String(err)}`);
      });
    }
    localStorage.setItem('language', language);
    applyLanguageAttributes(language);
  }, [language]);

  // Subscribe to i18n events for robust state management and error handling
  useEffect(() => {
    const onLanguageChanged = (lng: string) => {
      const normalized = normalizeLanguage(lng);
      setLanguageState(normalized);
      setIsChanging(false);
      setError(null);
    };

    const onLoaded = () => {
      // Resources finished loading; stop showing change indicator
      setIsChanging(false);
    };

    const onFailedLoading = (_lng: string, _ns: string, msg: string) => {
      setIsChanging(false);
      setError(`Language resources failed to load: ${msg}`);
      // Fallback to English to preserve UX if current language isn't ready
      if (language !== 'en') {
        i18n.changeLanguage('en').catch(() => {
          // ignore secondary error
        });
      }
    };

    i18n.on('languageChanged', onLanguageChanged);
    i18n.on('loaded', onLoaded);
    i18n.on('failedLoading', onFailedLoading);

    // Cross-tab sync: reflect changes to localStorage from other tabs
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'language' && typeof e.newValue === 'string') {
        const normalized = normalizeLanguage(e.newValue);
        if (normalized !== language) {
          setIsChanging(true);
          setLanguageState(normalized);
          i18n.changeLanguage(normalized).catch((err) => {
            setError(`Failed to change language: ${String(err)}`);
            setIsChanging(false);
          });
        }
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      i18n.off('languageChanged', onLanguageChanged);
      i18n.off('loaded', onLoaded);
      i18n.off('failedLoading', onFailedLoading);
      window.removeEventListener('storage', onStorage);
    };
  }, [language]);

  const setLanguage = useCallback((lng: Language) => {
    const normalized = normalizeLanguage(lng);
    setIsChanging(true);
    setError(null);
    // Load resources and then change language to ensure smooth transitions
    i18n
      .changeLanguage(normalized)
      .then(() => {
        setLanguageState(normalized);
        localStorage.setItem('language', normalized);
      })
      .catch((err) => {
        setError(`Failed to change language: ${String(err)}`);
        setIsChanging(false);
      });
  }, []);

  const t = useCallback((key: string, options?: Record<string, string | number>): string => {
    const opts = options ? { ...options } : {};
    const result = i18n.t(key, opts);
    // Ensure robust fallback: if missing or unchanged, use English fallback
    if (typeof result !== 'string' || result === key || result.trim() === '') {
      const fallback = i18n.t(key, { ...opts, lng: 'en' });
      return typeof fallback === 'string' && fallback.trim() !== '' ? fallback : key;
    }
    return result;
  }, []);

  // Don't render children until i18n translation resources have loaded;
  // this prevents raw keys like "auth.tagline" from flashing on screen.
  if (!ready) {
    return (
      <div className="min-h-screen bg-[#0A0D10] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00E676] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL, isChanging, error }}>
      {children}
    </LanguageContext.Provider>
  );
}
