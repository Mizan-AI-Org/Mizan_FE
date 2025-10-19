import React, { createContext, useContext } from "react";
import { AuthContextType } from "../contexts/AuthContext.types";
import { AuthContext } from "../contexts/AuthContext.ts";

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
