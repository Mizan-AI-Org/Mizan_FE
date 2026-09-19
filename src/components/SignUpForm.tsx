import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, User, Mail, Lock, Building2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "@/hooks/use-language";
import type { SignupData } from "@/lib/types";
import {
  DEFAULT_BUSINESS_VERTICAL,
  SIGNUP_SECTOR_OPTIONS,
  type BusinessVertical,
} from "@/config/staffInviteRolesByVertical";
import { authFieldClass } from "./AuthAmbientBackground";

interface SignUpFormProps {
  /** Kept for invitation flows; auth page uses tab navigation instead. */
  onNavigateToLogin?: () => void;
}

export const SignUpForm: React.FC<SignUpFormProps> = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [sector, setSector] = useState<BusinessVertical>(DEFAULT_BUSINESS_VERTICAL);
  const { toast } = useToast();
  const { t } = useLanguage();
  const auth = useAuth();

  const handleOwnerSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!termsAccepted) {
      setError(t("auth.signup.errors.terms_required"));
      setIsLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    const businessName = formData.get("businessName") as string;
    const fullName = formData.get("fullName") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError(t("auth.signup.errors.passwords_match"));
      setIsLoading(false);
      return;
    }

    const nameParts = fullName.trim().split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || "User";

    const signupData: SignupData = {
      user: {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      },
      restaurant: {
        name: businessName,
        address: "",
        phone: "",
        email: email,
        business_vertical: sector,
      },
    };

    try {
      await auth.ownerSignup(signupData);

      toast({
        title: t("auth.signup.toast_welcome"),
        description: t("auth.signup.toast_desc"),
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError(t("auth.signup.errors.unexpected"));
      }
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

      <div className="mb-6 space-y-2">
        <h2 className="text-2xl font-bold text-white">{t("auth.signup.title")}</h2>
        <p className="text-sm text-[#B0BEC5]">{t("auth.signup.subtitle")}</p>
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
            <Label htmlFor="businessVertical" className="text-sm text-white">
              {t("auth.signup.sector_label")}
            </Label>
            <p id="sector-hint" className="text-[11px] leading-snug text-[#78909C]">
              {t("auth.signup.sector_hint")}
            </p>
            <select
              id="businessVertical"
              name="businessVertical"
              value={sector}
              onChange={(e) => setSector(e.target.value as BusinessVertical)}
              aria-describedby="sector-hint"
              className={`h-11 w-full px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#00E676]/40 ${authFieldClass}`}
            >
              {SIGNUP_SECTOR_OPTIONS.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  title={t(opt.taglineKey)}
                  className="bg-[#0A0D10] text-white"
                >
                  {opt.emoji} {t(opt.nameKey)}
                </option>
              ))}
            </select>
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
            <a href="#" className="text-[#00E676] transition-colors hover:text-[#00F77B]">
              {t("auth.signup.terms_link")}
            </a>{" "}
            {t("auth.signup.and")}{" "}
            <a href="#" className="text-[#00E676] transition-colors hover:text-[#00F77B]">
              {t("auth.signup.privacy_link")}
            </a>
          </label>
        </div>

        <Button
          type="submit"
          className="mt-2 h-11 w-full rounded-lg border border-[#00E676]/30 bg-gradient-to-r from-[#00E676] to-[#00C853] font-semibold text-[#0A0D10] shadow-lg transition-all duration-300 hover:from-[#00F77B] hover:to-[#00D96B] hover:shadow-[0_0_25px_rgba(0,230,118,0.4)]"
          disabled={isLoading || !termsAccepted}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? t("auth.signup.submitting") : t("auth.signup.submit")}
        </Button>
      </form>
    </div>
  );
};
