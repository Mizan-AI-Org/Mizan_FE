import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { useAuth } from "../contexts/AuthContext";
import { AuthForm } from "../components/AuthForm";
import { InviteLinkRetired } from "./AcceptInvitation";
import { SignUpForm } from "../components/SignUpForm";
import { RestaurantShowcase } from "../components/RestaurantShowcase";
import { AuthLanguagePicker } from "@/components/AuthLanguagePicker";
import {
  AuthAmbientBackground,
  authFieldClass,
  authGlassCardClass,
  authGlassTabsClass,
} from "@/components/AuthAmbientBackground";
import { useLanguage } from "@/hooks/use-language";

/** Auth is always dark — isolated from dashboard light/dark preference. */
const AuthShell: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <div className={`dark min-h-screen bg-[#0A0D10] text-white ${className}`}>{children}</div>
);

const AuthBackground: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="relative flex min-h-full flex-1 flex-col overflow-hidden bg-[#0A0D10]">
    <AuthAmbientBackground />
    <div className="relative z-10 flex min-h-full flex-1 flex-col">{children}</div>
  </div>
);

const Auth = () => {
  const [currentPage, setCurrentPage] = useState<"login" | "signup">("login");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();
  const { t } = useLanguage();
  const auth = useAuth();

  const isInvitationLink = () =>
    new URLSearchParams(window.location.search).has("token");

  if (isInvitationLink()) {
    return <InviteLinkRetired />;
  }

  const isSignup = currentPage === "signup";

  return (
    <AuthShell className="lg:flex">
      <div className="relative flex min-h-screen w-full shrink-0 flex-col lg:w-[min(52%,640px)] lg:max-w-[720px] xl:max-w-[780px]">
        <AuthBackground>
          <header className="relative z-20 flex items-center justify-between gap-4 px-5 py-5 lg:px-8">
            <div className="flex min-w-0 items-center gap-2.5">
              <BrandLogo size="md" />
              <div className="min-w-0">
                <div className="truncate text-lg font-bold tracking-tight text-white">
                  Mizan AI
                </div>
                <div className="truncate text-xs text-[#78909C]">{t("auth.tagline")}</div>
              </div>
            </div>
            <AuthLanguagePicker compact />
          </header>

          <div className="relative z-10 flex flex-1 flex-col overflow-y-auto px-5 pb-8 lg:px-10 lg:pb-10">
            <div
              className={
                isSignup
                  ? "mx-auto w-full max-w-xl flex-1"
                  : "mx-auto flex w-full max-w-md flex-1 flex-col justify-center"
              }
            >
              <div className={authGlassTabsClass}>
                <button
                  type="button"
                  onClick={() => setCurrentPage("login")}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
                    !isSignup
                      ? "bg-[#00E676] text-[#0A0D10] shadow-[0_0_20px_rgba(0,230,118,0.25)]"
                      : "text-[#B0BEC5] hover:text-white"
                  }`}
                >
                  {t("auth.actions.sign_in")}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage("signup")}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
                    isSignup
                      ? "bg-[#00E676] text-[#0A0D10] shadow-[0_0_20px_rgba(0,230,118,0.25)]"
                      : "text-[#B0BEC5] hover:text-white"
                  }`}
                >
                  {t("auth.actions.create_account")}
                </button>
              </div>

              <div className={authGlassCardClass}>
                {isSignup ? <SignUpForm /> : <AuthForm embedded />}
              </div>

              {!isSignup && (
                <p className="mt-4 px-2 text-center text-[11px] leading-relaxed text-[#78909C]">
                  {t("auth.footer.continue_agree_prefix")}{" "}
                  <a href="#" className="text-[#00E676] hover:underline">
                    {t("auth.footer.terms_of_use")}
                  </a>{" "}
                  {t("auth.footer.and")}{" "}
                  <a href="#" className="text-[#00E676] hover:underline">
                    {t("auth.footer.privacy")}
                  </a>
                  .
                </p>
              )}
            </div>
          </div>
        </AuthBackground>
      </div>

      <RestaurantShowcase />
    </AuthShell>
  );
};

export default Auth;
