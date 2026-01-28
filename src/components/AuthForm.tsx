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

interface AuthFormProps {
  onNavigateToSignup: () => void;
}

type UserType = "staff" | "manager";

export const AuthForm: React.FC<AuthFormProps> = ({ onNavigateToSignup }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [userType, setUserType] = useState<UserType>("manager");
  const [pinInput, setPinInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { toast } = useToast();
  const auth = useAuth();
  const { t } = useLanguage();

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "").slice(0, 4);
    setPinInput(value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordInput(e.target.value);
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const credential =
      userType === "staff" ? pinInput : (formData.get("credential") as string);

    // Validate PIN for staff users
    if (userType === "staff") {
      if (!/^\d{4}$/.test(credential)) {
        setError(t("auth.errors.pin_invalid"));
        setIsLoading(false);
        return;
      }
    }

    try {
      if (userType === "staff") {
        // Use PIN login for staff (email is optional for PIN authentication)
        await auth.loginWithPin(credential, email);
      } else {
        // Use regular login for managers/owners
        await auth.login(email, credential);
      }

      // Build a friendly display name from user profile with graceful fallback
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
        if (userType === "staff") {
          if (raw.includes("invalid pin") || raw.includes("pin login failed")) {
            friendly = t("auth.errors.invalid_pin");
          }
        } else {
          if (raw.includes("invalid email") || raw.includes("login failed")) {
            friendly = t("auth.errors.invalid_credentials");
          }
        }
        if (!friendly) {
          if (raw.includes("server error")) friendly = t("auth.errors.server");
          else if (raw.includes("network error") || raw.includes("failed to fetch") || raw.includes("check backend")) friendly = t("auth.errors.network");
        }
        setError(friendly || error.message || t("auth.errors.unexpected"));
      } else {
        setError(t("auth.errors.unexpected"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Show forgot password form for managers
  if (showForgotPassword && userType === "manager") {
    return <ForgotPasswordForm onBack={() => setShowForgotPassword(false)} />;
  }

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

      {/* Elegant User Type Toggle with Premium Styling */}
      <div className="flex gap-2 bg-white/5 rounded-lg p-1 border border-white/10 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => {
            setUserType("staff");
            setPinInput("");
            setPasswordInput("");
          }}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-all text-sm duration-300 ${userType === "staff"
            ? "bg-gradient-to-r from-[#00E676] to-[#00C853] text-white shadow-lg shadow-[#00E676]/20"
            : "text-[#B0BEC5] hover:text-[#00E676] hover:bg-[#00E676]/10"
            }`}
        >
          {t("auth.toggles.staff")}
        </button>
        <button
          type="button"
          onClick={() => {
            setUserType("manager");
            setPinInput("");
            setPasswordInput("");
          }}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-all text-sm duration-300 ${userType === "manager"
            ? "bg-gradient-to-r from-[#00E676] to-[#00C853] text-white shadow-lg shadow-[#00E676]/20"
            : "text-[#B0BEC5] hover:text-[#00E676] hover:bg-[#00E676]/10"
            }`}
        >
          {t("auth.toggles.manager")}
        </button>
      </div>

      <form onSubmit={handleSignIn} className="space-y-5">
        {/* Email Field  */}
        <div className="space-y-2">
          <Label
            htmlFor="signin-email"
            className="text-white font-semibold text-sm tracking-wider"
          >
            {t("auth.labels.email")}
          </Label>
          <div className="relative group">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#00E676]/60 group-focus-within:text-[#00E676] transition-colors" />
            <Input
              id="signin-email"
              name="email"
              type="email"
              placeholder={t("auth.placeholders.email")}
              required
              className="pl-10 bg-[#0A0D10]/50 border border-white/10 focus:border-[#00E676] text-white placeholder:text-[#B0BEC5] rounded-lg transition-all duration-300 focus:shadow-[0_0_15px_rgba(0,230,118,0.2)] backdrop-blur-sm"
            />
          </div>
        </div>

        {/* Credential Field (PIN/Password)  */}
        <div className="space-y-2">
          <Label
            htmlFor="signin-credential"
            className="text-white font-semibold text-sm tracking-wider"
          >
            {userType === "staff" ? t("auth.labels.pin") : t("auth.labels.password")}
          </Label>
          <div className="relative group">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#00E676]/60 group-focus-within:text-[#00E676] transition-colors" />
            {userType === "staff" ? (
              <Input
                id="signin-credential"
                type="text"
                placeholder={t("auth.placeholders.pin")}
                required
                value={pinInput}
                onChange={handlePinChange}
                inputMode="numeric"
                maxLength={4}
                className="pl-10 bg-[#0A0D10]/50 border border-white/10 focus:border-[#00E676] text-white placeholder:text-[#B0BEC5] rounded-lg transition-all duration-300 focus:shadow-[0_0_15px_rgba(0,230,118,0.2)] backdrop-blur-sm"
              />
            ) : (
              <Input
                id="signin-credential"
                name="credential"
                type="password"
                placeholder={t("auth.placeholders.password")}
                required
                value={passwordInput}
                onChange={handlePasswordChange}
                className="pl-10 bg-[#0A0D10]/50 border border-white/10 focus:border-[#00E676] text-white placeholder:text-[#B0BEC5] rounded-lg transition-all duration-300 focus:shadow-[0_0_15px_rgba(0,230,118,0.2)] backdrop-blur-sm"
              />
            )}
          </div>
          {userType === "staff" && (
            <p className="text-xs text-[#B0BEC5] font-medium">
              {t("auth.helper.pin_hint")}
            </p>
          )}
        </div>

        {/* Sign In Button */}
        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-[#00E676] to-[#00C853] hover:from-[#00F77B] hover:to-[#00D96B] text-white font-semibold h-11 rounded-lg shadow-lg hover:shadow-[0_0_25px_rgba(0,230,118,0.4)] transition-all duration-300 border border-[#00E676]/30 mt-2"
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? t("auth.actions.signing_in") : t("auth.actions.sign_in")}
        </Button>
      </form>

      {/* Elegant Divider and Footer Section */}
      <div className="text-center space-y-4 text-sm pt-2">
        <p>
          <button
            type="button"
            onClick={() => {
              if (userType === "manager") {
                setShowForgotPassword(true);
              }
            }}
            className="text-[#00E676] hover:text-[#00F77B] transition-colors font-medium underline-offset-2 hover:underline"
          >
            {userType === "staff" ? t("auth.misc.forgot_pin") : "Forgot Password?"}
          </button>
        </p>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <span className="flex-1 border-t border-white/20" />
          <span className="text-[#B0BEC5] font-medium text-xs tracking-wide">
            {t("auth.misc.new_to_mizan")}
          </span>
          <span className="flex-1 border-t border-white/20" />
        </div>
      </div>

      {/* Signup Button */}
      <Button
        onClick={onNavigateToSignup}
        className="w-full border-2 border-[#00E676]/50 text-[#00E676] hover:bg-[#00E676]/10 hover:text-[#00F77B] hover:border-[#00E676] font-semibold h-11 bg-transparent backdrop-blur-sm transition-all duration-300 mt-2"
      >
        {t("auth.actions.create_account")}
      </Button>
    </div>
  );
};
