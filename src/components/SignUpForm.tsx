import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, User, Mail, Lock, Building2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "@/hooks/use-language";

interface SignUpFormProps {
  onNavigateToLogin: () => void;
}

interface SignupData {
  user: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
  };
  restaurant: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
}

export const SignUpForm: React.FC<SignUpFormProps> = ({ onNavigateToLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
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

    // Split full name into first and last
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
          className="bg-red-500/10 border-red-500/30 rounded-lg"
        >
          <AlertDescription className="text-red-200">{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2 mb-6">
        <h2 className="text-2xl font-bold text-white">{t("auth.signup.title")}</h2>
        <p className="text-sm text-[#B0BEC5]">{t("auth.signup.subtitle")}</p>
      </div>

      <form onSubmit={handleOwnerSignUp} className="space-y-4">
        {/* Business Name */}
        <div className="space-y-2">
          <Label htmlFor="businessName" className="text-white text-sm">
            {t("auth.signup.restaurant_name")}
          </Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#00E676]/60" />
            <Input
              id="businessName"
              name="businessName"
              placeholder={t("auth.signup.restaurant_placeholder")}
              required
              className="pl-9 bg-[#0A0D10]/50 border border-white/10 focus:border-[#00E676] text-white placeholder:text-[#B0BEC5] text-sm"
            />
          </div>
        </div>

        {/* Full Name */}
        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-white text-sm">
            {t("auth.signup.owner_full_name")}
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#00E676]/60" />
            <Input
              id="fullName"
              name="fullName"
              placeholder={t("auth.signup.name_placeholder")}
              required
              className="pl-9 bg-[#0A0D10]/50 border border-white/10 focus:border-[#00E676] text-white placeholder:text-[#B0BEC5] text-sm"
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="signup-email" className="text-white text-sm">
            {t("auth.signup.email")}
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#00E676]/60" />
            <Input
              id="signup-email"
              name="email"
              type="email"
              placeholder={t("auth.signup.email_placeholder")}
              required
              className="pl-9 bg-[#0A0D10]/50 border border-white/10 focus:border-[#00E676] text-white placeholder:text-[#B0BEC5] text-sm"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="signup-password" className="text-white text-sm">
            {t("auth.signup.password")}
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#00E676]/60" />
            <Input
              id="signup-password"
              name="password"
              type="password"
              required
              minLength={6}
              className="pl-9 bg-[#0A0D10]/50 border border-white/10 focus:border-[#00E676] text-white placeholder:text-[#B0BEC5] text-sm"
            />
          </div>
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-white text-sm">
            {t("auth.signup.confirm_password")}
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#00E676]/60" />
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={6}
              className="pl-9 bg-[#0A0D10]/50 border border-white/10 focus:border-[#00E676] text-white placeholder:text-[#B0BEC5] text-sm"
            />
          </div>
        </div>

        {/* Terms Checkbox */}
        <div className="flex items-start space-x-3 py-2">
          <input
            type="checkbox"
            id="terms"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 bg-[#0A0D10] border-white/10 rounded cursor-pointer accent-[#00E676]"
          />
          <label htmlFor="terms" className="text-xs text-[#B0BEC5] cursor-pointer">
            {t("auth.signup.terms")}{" "}
            <a href="#" className="text-[#00E676] hover:text-[#00C853] transition-colors">
              {t("auth.signup.terms_link")}
            </a>{" "}
            {t("auth.signup.and")}{" "}
            <a href="#" className="text-[#00E676] hover:text-[#00C853] transition-colors">
              {t("auth.signup.privacy_link")}
            </a>
          </label>
        </div>

        <Button
          type="submit"
          className="w-full bg-[#00E676] hover:bg-[#00C853] text-white font-semibold h-11 rounded-lg shadow-lg hover:shadow-[#00E676]/50 transition-all mt-4"
          disabled={isLoading || !termsAccepted}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? t("auth.signup.submitting") : t("auth.signup.submit")}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-[#00E676]/25" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-[#0A0D10]/40 px-3 py-1 text-[#B0BEC5] rounded-full border border-white/10 backdrop-blur-sm">
            {t("auth.signup.already_have")}
          </span>
        </div>
      </div>

      <Button
        onClick={onNavigateToLogin}
        className="w-full border border-[#00E676]/30 text-[#00E676] hover:bg-[#00E676]/10 hover:text-[#00C853] font-semibold h-11 bg-transparent"
      >
        {t("auth.actions.sign_in")}
      </Button>
    </div>
  );
};