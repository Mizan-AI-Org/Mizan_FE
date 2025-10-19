import React, { createContext } from 'react';
import { AuthContextType } from './AuthContext.types';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
