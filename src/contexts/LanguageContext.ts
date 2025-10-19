import { createContext } from 'react';
import { LanguageContextType } from './LanguageContext.types';

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
