import { createContext, useContext } from 'react';
import { LanguageContextType } from '../contexts/LanguageContext.types';
import { LanguageContext } from '../contexts/LanguageContext';

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within LanguageProvider');
    }
    return context;
}
