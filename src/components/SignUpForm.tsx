import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { ArrowRight, Loader2, User, Mail, Lock, Building2, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { DIAL_COUNTRIES, LEGAL_VERSION, composeWhatsAppNumber, isPlausibleWhatsApp } from "@/lib/accountErrors";
import { useLanguage } from "@/hooks/use-language";
import type { SignupData } from "@/lib/types";
import { authFieldClass } from "./AuthAmbientBackground";

interface SignUpFormProps {
  /** Kept for invitation flows; auth page uses tab navigation instead. */
  onNavigateToLogin?: () => void;
}

export const SignUpForm: React.FC<SignUpFormProps> = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const auth = useAuth();
  const [country, setCountry] = useState("MA");

  const handleOwnerSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!termsAccepted) {
      setError(t("auth.signup.errors.terms_required"));
      return;
    }
    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    if (password !== (formData.get("confirmPassword") as string)) {
      setError(t("auth.signup.errors.passwords_match"));
      return;
    }
    const fullName = (formData.get("fullName") as string).trim();
    const email = (formData.get("email") as string).trim();
    const dial = DIAL_COUNTRIES.find((c) => c.code === country)?.dial || "212";
    const whatsappPhone = composeWhatsAppNumber(formData.get("whatsappPhone") as string, dial);
    if (!isPlausibleWhatsApp(whatsappPhone)) {
      setError(t("auth.signup.errors.whatsapp_invalid"));
      return;
    }
    const nameParts = fullName.split(" ");
    const signupData: SignupData = {
      user: {
        email,
        password,
        first_name: nameParts[0],
        last_name: nameParts.slice(1).join(" "),
        whatsapp_phone: whatsappPhone,
        phone: whatsappPhone,
        language,
        accept_terms: true,
        terms_version: LEGAL_VERSION,
      },
      restaurant: {
        name: (formData.get("businessName") as string).trim(),
        address: "",
        phone: "",
        email,
        country,
      },
    };

    setIsLoading(true);
    try {
      await auth.ownerSignup(signupData);
      toast({
        title: t("auth.signup.toast_welcome"),
        description: t("auth.signup.toast_desc"),
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("auth.signup.errors.unexpected"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {error && (
        <Alert
          variant="destructive"
          className="rounded-lg border-red-500/30 bg-red-500/10"
        >
          <AlertDescription className="text-red-200">{error}</AlertDescription>
        </Alert>
      )}

      <div className="mb-6 space-y-3">
        <h2 className="text-2xl font-bold text-white">{t("auth.signup.title")}</h2>
        <p className="text-sm text-[#B0BEC5]">{t("auth.signup.subtitle")}</p>
        <p className="text-[11px] leading-snug text-[#78909C]">{t("auth.signup.sector_onboarding_hint")}</p>
      </div>

      <form onSubmit={handleOwnerSignUp} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="businessName" className="text-sm text-white">
              {t("auth.signup.restaurant_name")}
            </Label>
            <div className="group relative">
              <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#00E676]/60 transition-colors group-focus-within:text-[#00E676]" />
              <Input
                id="businessName"
                name="businessName"
                placeholder={t("auth.signup.restaurant_placeholder")}
                required
                className={`h-11 pl-9 text-sm ${authFieldClass}`}
              />
            </div>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="fullName" className="text-sm text-white">
              {t("auth.signup.owner_full_name")}
            </Label>
            <div className="group relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#00E676]/60 transition-colors group-focus-within:text-[#00E676]" />
              <Input
                id="fullName"
                name="fullName"
                placeholder={t("auth.signup.name_placeholder")}
                required
                className={`h-11 pl-9 text-sm ${authFieldClass}`}
              />
            </div>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="signup-email" className="text-sm text-white">
              {t("auth.signup.email")}
            </Label>
            <div className="group relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#00E676]/60 transition-colors group-focus-within:text-[#00E676]" />
              <Input
                id="signup-email"
                name="email"
                type="email"
                placeholder={t("auth.signup.email_placeholder")}
                required
                className={`h-11 pl-9 text-sm ${authFieldClass}`}
              />
            </div>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <div className="rounded-xl border border-[#00E676]/25 bg-gradient-to-br from-[#00E676]/[0.07] to-transparent p-4 shadow-[inset_0_1px_0_rgba(0,230,118,0.12)]">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Label htmlFor="signup-whatsapp" className="text-sm font-semibold text-white">
                  {t("auth.signup.whatsapp")}
                </Label>
                <span className="inline-flex items-center gap-1 rounded-full border border-[#00E676]/30 bg-[#00E676]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#00E676]">
                  <MessageCircle className="h-3 w-3" aria-hidden />
                  WhatsApp
                </span>
              </div>
              <p id="signup-whatsapp-hint" className="mb-3 text-[11px] leading-snug text-[#78909C]">
                {t("auth.signup.whatsapp_hint")}
              </p>
              <div className="flex gap-2">
                <select
                  aria-label={t("auth.signup.whatsapp_country")}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className={`h-11 shrink-0 rounded-md px-2 text-sm ${authFieldClass} border-[#00E676]/20`}
                >
                  {DIAL_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code} className="bg-[#0A0D10] text-white">
                      {c.label}
                    </option>
                  ))}
                </select>
              <div className="group relative min-w-0 flex-1">
                <MessageCircle className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#00E676]/70 transition-colors group-focus-within:text-[#00E676]" />
                <Input
                  id="signup-whatsapp"
                  name="whatsappPhone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder={t("auth.signup.whatsapp_placeholder")}
                  required
                  aria-describedby="signup-whatsapp-hint"
                  className={`h-11 pl-10 text-sm ${authFieldClass} border-[#00E676]/20 focus-visible:ring-[#00E676]/40`}
                />
              </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-password" className="text-sm text-white">
              {t("auth.signup.password")}
            </Label>
            <div className="group relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#00E676]/60 transition-colors group-focus-within:text-[#00E676]" />
              <Input
                id="signup-password"
                name="password"
                type="password"
                required
                minLength={6}
                className={`h-11 pl-9 text-sm ${authFieldClass}`}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm text-white">
              {t("auth.signup.confirm_password")}
            </Label>
            <div className="group relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#00E676]/60 transition-colors group-focus-within:text-[#00E676]" />
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={6}
                className={`h-11 pl-9 text-sm ${authFieldClass}`}
              />
            </div>
          </div>
        </div>

        <div className="flex items-start space-x-3 py-2">
          <input
            type="checkbox"
            id="terms"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 cursor-pointer rounded border-white/20 bg-black/30 accent-[#00E676]"
          />
          <label htmlFor="terms" className="cursor-pointer text-xs text-[#B0BEC5]">
            {t("auth.signup.terms")}{" "}
            <Link to="/legal/terms" target="_blank" rel="noopener" className="text-[#00E676] transition-colors hover:text-[#00F77B]">
              {t("auth.signup.terms_link")}
            </Link>{" "}
            {t("auth.signup.and")}{" "}
            <Link to="/legal/privacy" target="_blank" rel="noopener" className="text-[#00E676] transition-colors hover:text-[#00F77B]">
              {t("auth.signup.privacy_link")}
            </Link>
          </label>
        </div>

        <Button
          type="submit"
          className="mt-2 h-11 w-full rounded-lg border border-[#00E676]/30 bg-gradient-to-r from-[#00E676] to-[#00C853] font-semibold text-[#0A0D10] shadow-lg transition-all duration-300 hover:from-[#00F77B] hover:to-[#00D96B] hover:shadow-[0_0_25px_rgba(0,230,118,0.4)]"
          disabled={!termsAccepted || isLoading}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? t("auth.signup.submitting") : t("auth.signup.submit")}
          <ArrowRight className="ms-2 h-4 w-4 rtl:rotate-180" aria-hidden />
        </Button>
      </form>
    </div>
  );
};

export default SignUpForm;
