import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, MessageCircle, KeyRound } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { API_BASE } from "@/lib/api";
import { authFieldClass } from "./AuthAmbientBackground";

/** Sign in with a one-time code Mizan sends on WhatsApp (mizan_login_code). Stores the tokens like a password
 * login, then reloads: AuthContext's start-up check sends the person to their home page. */
export const WhatsAppCodeForm: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { t } = useLanguage();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const post = async (path: string, body: Record<string, string>) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.message || t("auth.errors.unexpected"));
    return data;
  };

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await post("/auth/whatsapp-code/", { phone });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.errors.unexpected"));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await post("/auth/whatsapp-code/verify/", { phone, code });
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("access_token", data.tokens?.access || data.access);
      localStorage.setItem("refresh_token", data.tokens?.refresh || data.refresh);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.errors.unexpected"));
      setBusy(false);
    }
  };

  const submitClass =
    "mt-2 h-11 w-full rounded-lg border border-[#00E676]/30 bg-gradient-to-r from-[#00E676] to-[#00C853] font-semibold text-[#0A0D10] shadow-lg";

  return (
    <div className="w-full space-y-6">
      {error && (
        <Alert variant="destructive" className="rounded-lg border-red-500/30 bg-red-500/10">
          <AlertDescription className="text-red-200">{error}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-white">{t("auth.wa_code.title")}</h2>
        <p className="text-sm text-[#B0BEC5]">
          {sent ? t("auth.wa_code.sent", { phone }) : t("auth.wa_code.subtitle")}
        </p>
      </div>
      {!sent ? (
        <form onSubmit={sendCode} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="wa-phone" className="text-sm font-semibold tracking-wider text-white">
              {t("auth.wa_code.phone")}
            </Label>
            <div className="group relative">
              <MessageCircle className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#00E676]/60" />
              <Input id="wa-phone" type="tel" required value={phone} placeholder="+212 6 12 34 56 78"
                onChange={(e) => setPhone(e.target.value)} className={`h-11 pl-10 ${authFieldClass}`} />
            </div>
          </div>
          <Button type="submit" className={submitClass} disabled={busy || !phone.trim()}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("auth.wa_code.send")}
          </Button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="wa-code" className="text-sm font-semibold tracking-wider text-white">
              {t("auth.wa_code.code")}
            </Label>
            <div className="group relative">
              <KeyRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#00E676]/60" />
              <Input id="wa-code" inputMode="numeric" autoComplete="one-time-code" required value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                className={`h-11 pl-10 tracking-[0.3em] ${authFieldClass}`} />
            </div>
          </div>
          <Button type="submit" className={submitClass} disabled={busy || code.length < 4}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("auth.actions.sign_in")}
          </Button>
          <button type="button" onClick={() => { setSent(false); setCode(""); }}
            className="w-full text-center text-sm text-[#B0BEC5] hover:text-white">
            {t("auth.wa_code.resend")}
          </button>
        </form>
      )}
      <div className="text-center text-sm">
        <button type="button" onClick={onBack} className="font-medium text-[#00E676] hover:underline">
          {t("auth.wa_code.back")}
        </button>
      </div>
    </div>
  );
};
