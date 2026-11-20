import { useState } from "react";
import { Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import type { User } from "@/contexts/AuthContext.types";
import { useLanguage } from "@/hooks/use-language";
import { apiPost } from "@/lib/accountErrors";

/**
 * Shown while the WhatsApp number given at signup (or a new number) is not proven yet: the code was sent when the
 * account was created, signup never waits for it. "Resend" asks for a new one; writing to Mizan from that number on
 * WhatsApp proves it too, and the banner goes away on the next sign-in.
 */
export function WhatsAppVerifyBanner() {
  const { t } = useLanguage();
  const { user, updateUser } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"" | "verify" | "resend">("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  if (!user?.whatsapp_verification_pending) return null;

  const resend = async () => {
    setBusy("resend");
    setError("");
    setNote("");
    const res = await apiPost<{ phone?: string; sent?: boolean }>("/auth/me/whatsapp/", {});
    setBusy("");
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setNote(
      res.data?.sent === false ? t("account.verify.not_delivered") : t("account.verify.sent", { phone: res.data?.phone || "" }),
    );
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy("verify");
    setError("");
    const res = await apiPost<{ user?: User }>("/auth/me/whatsapp/verify/", { code: code.trim() });
    setBusy("");
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const next = (res.data as { user?: User })?.user;
    if (next) updateUser({ ...user, ...next });
    setCode("");
  };

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100"
    >
      <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
      <span className="font-medium">{t("account.verify.banner")}</span>
      <form onSubmit={verify} className="flex flex-wrap items-center gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          aria-label={t("account.verify.code_label")}
          className="h-8 w-28 bg-background text-center tracking-widest"
        />
        <Button type="submit" size="sm" disabled={busy !== "" || code.length < 6}>
          {busy === "verify" && <Loader2 className="me-1 h-3 w-3 animate-spin" />}
          {t("account.verify.confirm")}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={busy !== ""} onClick={resend}>
          {busy === "resend" && <Loader2 className="me-1 h-3 w-3 animate-spin" />}
          {t("account.verify.resend")}
        </Button>
      </form>
      {note && <span className="text-xs">{note}</span>}
      {error && (
        <span role="alert" className="text-xs font-semibold text-red-700 dark:text-red-300">
          {error}
        </span>
      )}
    </div>
  );
}
