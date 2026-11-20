import { useState } from "react";
import { BadgeCheck, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { User } from "@/contexts/AuthContext.types";
import { useLanguage } from "@/hooks/use-language";
import { DIAL_COUNTRIES, apiPost, composeWhatsAppNumber, isPlausibleWhatsApp } from "@/lib/accountErrors";
import { settingsFieldClassName } from "@/components/settings/SettingsSection";

/**
 * The WhatsApp number Miya, sign-in codes and password-reset links use. A new number is only saved after the code
 * WhatsApp sends to THAT number is entered here (the profile form never changes it directly).
 */
export function WhatsAppNumberCard() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [country, setCountry] = useState("MA");
  const [input, setInput] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setEditing(false);
    setInput("");
    setSentTo("");
    setCode("");
    setError("");
  };

  const send = async () => {
    const dial = DIAL_COUNTRIES.find((c) => c.code === country)?.dial || "212";
    const phone = composeWhatsAppNumber(input, dial);
    if (!isPlausibleWhatsApp(phone)) {
      setError(t("account.errors.whatsapp_invalid"));
      return;
    }
    setBusy(true);
    setError("");
    const res = await apiPost<{ phone?: string }>("/auth/me/whatsapp/", { phone });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSentTo(res.data?.phone || phone);
  };

  const confirm = async () => {
    setBusy(true);
    setError("");
    const res = await apiPost<{ user?: User }>("/auth/me/whatsapp/verify/", { code: code.trim() });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const next = (res.data as { user?: User })?.user;
    if (next && user) updateUser({ ...user, ...next });
    toast({ title: t("account.whatsapp.changed") });
    reset();
  };

  const current = user?.phone ? `+${String(user.phone).replace(/\D/g, "")}` : t("account.whatsapp.none");
  const verified = !!user?.whatsapp_verified;

  return (
    <div className="space-y-3 rounded-xl border border-border/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <MessageCircle className="h-4 w-4 text-emerald-600" aria-hidden />
        <Label className="text-sm font-semibold">{t("account.whatsapp.title")}</Label>
        <span dir="ltr" className="text-sm tabular-nums">{current}</span>
        {verified ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
            {t("account.whatsapp.verified")}
          </span>
        ) : (
          <span className="text-xs text-amber-700 dark:text-amber-300">{t("account.whatsapp.not_verified")}</span>
        )}
        {!editing && (
          <Button type="button" variant="outline" size="sm" className="ms-auto" onClick={() => setEditing(true)}>
            {t("account.whatsapp.change")}
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{t("account.whatsapp.hint")}</p>
      {editing && (
        <div className="space-y-3">
          {!sentTo ? (
            <div className="flex flex-wrap gap-2">
              <select
                aria-label={t("auth.signup.whatsapp_country")}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className={`${settingsFieldClassName} w-auto`}
              >
                {DIAL_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
              <Input
                type="tel"
                inputMode="tel"
                dir="ltr"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t("auth.signup.whatsapp_placeholder")}
                className={`${settingsFieldClassName} min-w-[12rem] flex-1`}
              />
              <Button type="button" onClick={send} disabled={busy || !input.trim()}>
                {busy && <Loader2 className="me-1 h-4 w-4 animate-spin" />}
                {t("account.whatsapp.send_code")}
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm">{t("account.whatsapp.code_sent", { phone: sentTo })}</span>
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                aria-label={t("account.verify.code_label")}
                className={`${settingsFieldClassName} w-32 text-center tracking-widest`}
              />
              <Button type="button" onClick={confirm} disabled={busy || code.length < 6}>
                {busy && <Loader2 className="me-1 h-4 w-4 animate-spin" />}
                {t("account.verify.confirm")}
              </Button>
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm font-medium text-red-600">
              {error}
            </p>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={reset}>
            {t("common.cancel")}
          </Button>
        </div>
      )}
    </div>
  );
}
