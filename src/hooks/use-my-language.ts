import { useCallback, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { api } from "@/lib/api";
import { normalizeAppLanguage, type AppLanguage } from "@/lib/userLanguage";
import type { User } from "@/contexts/AuthContext.types";

function hasSession(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage.getItem("access_token");
  } catch {
    return false;
  }
}

/**
 * Change the signed-in person's language: the app switches immediately (RTL for Arabic), then it is saved as
 * their own language (Miya and WhatsApp follow it). `business: true` also makes it the business default.
 * Signed out (login / signup page) it only changes the app and is sent with the signup.
 */
export function useMyLanguage() {
  const { user, updateUser } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [saving, setSaving] = useState(false);

  const changeLanguage = useCallback(
    async (next: string, opts: { business?: boolean } = {}): Promise<User | null> => {
      const lng: AppLanguage = normalizeAppLanguage(next) ?? "en";
      try {
        // Accept-Language for the PATCH (and every later call) comes from here.
        window.localStorage.setItem("language", lng);
      } catch {
        // ignore storage failures
      }
      setLanguage(lng);
      if (!user || !hasSession()) return null;
      setSaving(true);
      try {
        const updated = await api.updateMyLanguage({ language: lng, ...(opts.business ? { business: true } : {}) });
        if (updated) updateUser(updated);
        return updated;
      } finally {
        setSaving(false);
      }
    },
    [user, updateUser, setLanguage],
  );

  return { language, changeLanguage, saving };
}
