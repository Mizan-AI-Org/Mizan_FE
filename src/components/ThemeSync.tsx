import { useEffect } from "react";
import {
  applyThemePreference,
  getStoredThemePreference,
  subscribeToSystemTheme,
} from "@/lib/theme";

/** Applies saved theme on boot and keeps system mode in sync with OS changes. */
export function ThemeSync() {
  useEffect(() => {
    applyThemePreference(getStoredThemePreference());
    return subscribeToSystemTheme(() => undefined);
  }, []);

  return null;
}
