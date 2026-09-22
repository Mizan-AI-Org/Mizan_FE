/**
 * Theme utilities – kept separate from ThemeToggle.tsx so that Vite/SWC
 * Fast-Refresh can work correctly (component files must only export components).
 */

export type AppTheme = "light" | "dark";
export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "theme";

function readStoredPreference(): ThemePreference | null {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "dark" || saved === "light" || saved === "system") {
      return saved;
    }
  } catch {
    /* ignore – SSR / private browsing */
  }
  return null;
}

/** Stored user choice. Default is light (not system). */
export function getStoredThemePreference(): ThemePreference {
  return readStoredPreference() ?? "light";
}

export function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveEffectiveTheme(
  preference: ThemePreference = getStoredThemePreference(),
): AppTheme {
  if (preference === "dark") return "dark";
  if (preference === "light") return "light";
  return systemPrefersDark() ? "dark" : "light";
}

/** @deprecated Use getStoredThemePreference + resolveEffectiveTheme */
export function resolveAppTheme(): AppTheme {
  return resolveEffectiveTheme();
}

/** Apply resolved light/dark to the document root. */
export function applyAppTheme(theme: AppTheme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", theme === "dark" ? "#0f1a16" : "#56BC6D");
  }
}

export function applyThemePreference(preference: ThemePreference): AppTheme {
  const effective = resolveEffectiveTheme(preference);
  applyAppTheme(effective);
  return effective;
}

export function persistThemePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    /* ignore */
  }
}

/** Re-apply when OS theme changes and preference is system. */
export function subscribeToSystemTheme(
  onChange: (effective: AppTheme) => void,
): () => void {
  if (typeof window === "undefined" || !window.matchMedia) {
    return () => undefined;
  }
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => {
    if (getStoredThemePreference() !== "system") return;
    onChange(applyThemePreference("system"));
  };
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}
