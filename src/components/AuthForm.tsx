import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Mail, Lock } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "@/hooks/use-language";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import { authFieldClass } from "./AuthAmbientBackground";

interface AuthFormProps {
  onNavigateToSignup?: () => void;
  embedded?: boolean;
}

export const AuthForm: React.FC<AuthFormProps> = ({
  onNavigateToSignup,
  embedded = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { toast } = useToast();
  const auth = useAuth();
  const { t } = useLanguage();

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordInput(e.target.value);
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const credential = formData.get("credential") as string;

    if (!credential) {
      setError(t("auth.errors.invalid_credentials"));
      setIsLoading(false);
      return;
    }

    try {
      await auth.login(email, credential);

      const displayName =
        auth.user?.first_name?.trim() ||
        (auth.user?.email ? auth.user.email.split("@")[0] : "there");

      toast({
        title: `${t("auth.toasts.welcome_back")}, ${displayName}!`,
        description: t("auth.toasts.signed_in_success"),
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        const raw = (error.message || "").toLowerCase();
        let friendly = "";
        if (raw.includes("invalid email") || raw.includes("login failed")) {
          friendly = t("auth.errors.invalid_credentials");
        }
        if (!friendly) {
          if (raw.includes("server error")) friendly = t("auth.errors.server");
          else if (
            raw.includes("network error") ||
            raw.includes("failed to fetch") ||
            raw.includes("check backend")
          ) {
            friendly = t("auth.errors.network");
          }
        }
        setError(friendly || error.message || t("auth.errors.unexpected"));
      } else {
        setError(t("auth.errors.unexpected"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (showForgotPassword) {
    return <ForgotPasswordForm onBack={() => setShowForgotPassword(false)} />;
  }

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

      <div className="space-y-1">
        <h2 className="text-xl font-bold text-white">{t("auth.actions.sign_in")}</h2>
        <p className="text-sm text-[#B0BEC5]">{t("auth.signup.subtitle")}</p>
      </div>

      <form onSubmit={handleSignIn} className="space-y-5">
        <div className="space-y-2">
          <Label
            htmlFor="signin-email"
            className="text-sm font-semibold tracking-wider text-white"
          >
            {t("auth.labels.email")}
          </Label>
          <div className="group relative">
            <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#00E676]/60 transition-colors group-focus-within:text-[#00E676]" />
            <Input
              id="signin-email"
              name="email"
              type="email"
              placeholder={t("auth.placeholders.email")}
              required
              className={`h-11 pl-10 ${authFieldClass}`}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="signin-credential"
            className="text-sm font-semibold tracking-wider text-white"
          >
            {t("auth.labels.password")}
          </Label>
          <div className="group relative">
            <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#00E676]/60 transition-colors group-focus-within:text-[#00E676]" />
            <Input
              id="signin-credential"
              name="credential"
              type="password"
              placeholder={t("auth.placeholders.password")}
              required
              value={passwordInput}
              onChange={handlePasswordChange}
              className={`h-11 pl-10 ${authFieldClass}`}
            />
          </div>
        </div>

        <Button
          type="submit"
          className="mt-2 h-11 w-full rounded-lg border border-[#00E676]/30 bg-gradient-to-r from-[#00E676] to-[#00C853] font-semibold text-[#0A0D10] shadow-lg transition-all duration-300 hover:from-[#00F77B] hover:to-[#00D96B] hover:shadow-[0_0_25px_rgba(0,230,118,0.4)]"
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? t("auth.actions.signing_in") : t("auth.actions.sign_in")}
        </Button>
      </form>

      <div className="space-y-4 pt-2 text-center text-sm">
        <button
          type="button"
          onClick={() => setShowForgotPassword(true)}
          className="font-medium text-[#00E676] underline-offset-2 transition-colors hover:text-[#00F77B] hover:underline"
        >
          {t("auth.forgot.title")}
        </button>

        {!embedded && onNavigateToSignup && (
          <>
            <div className="flex items-center gap-3">
              <span className="flex-1 border-t border-white/20" />
              <span className="text-xs font-medium tracking-wide text-[#B0BEC5]">
                {t("auth.misc.new_to_mizan")}
              </span>
              <span className="flex-1 border-t border-white/20" />
            </div>
            <Button
              onClick={onNavigateToSignup}
              className="mt-2 h-11 w-full border-2 border-[#00E676]/50 bg-transparent font-semibold text-[#00E676] backdrop-blur-sm transition-all duration-300 hover:border-[#00E676] hover:bg-[#00E676]/10 hover:text-[#00F77B]"
            >
              {t("auth.actions.create_account")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
