import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useLanguage } from "@/hooks/use-language";

interface ForgotPasswordFormProps {
    onBack: () => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onBack }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [email, setEmail] = useState("");
    const { t } = useLanguage();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            await api.requestPasswordReset(email);
            setSuccess(true);
        } catch (error: unknown) {
            if (error instanceof Error) {
                setError(error.message);
            } else {
                setError(t("auth.forgot.errors.unexpected"));
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="w-full space-y-6 text-center">
                <div className="flex justify-center">
                    <div className="w-16 h-16 bg-[#00E676]/20 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-8 h-8 text-[#00E676]" />
                    </div>
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-white">{t("auth.forgot.check_email")}</h3>
                    <p className="text-[#B0BEC5] text-sm">
                        {t("auth.forgot.check_email_desc").replace("{{email}}", email)}
                    </p>
                </div>
                <div className="pt-4">
                    <Button
                        onClick={onBack}
                        className="w-full border-2 border-[#00E676]/50 text-[#00E676] hover:bg-[#00E676]/10 hover:text-[#00F77B] hover:border-[#00E676] font-semibold h-11 bg-transparent backdrop-blur-sm transition-all duration-300"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {t("auth.forgot.back")}
                    </Button>
                </div>
                <p className="text-xs text-[#B0BEC5]">
                    {t("auth.forgot.no_email")}
                </p>
            </div>
        );
    }

    return (
        <div className="w-full space-y-6">
            {/* Header */}
            <div className="space-y-2 text-center">
                <h3 className="text-xl font-semibold text-white">{t("auth.forgot.title")}</h3>
                <p className="text-[#B0BEC5] text-sm">
                    {t("auth.forgot.desc")}
                </p>
            </div>

            {error && (
                <Alert
                    variant="destructive"
                    className="bg-red-500/10 border-red-500/30 rounded-lg"
                >
                    <AlertDescription className="text-red-200">{error}</AlertDescription>
                </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email Field */}
                <div className="space-y-2">
                    <Label
                        htmlFor="reset-email"
                        className="text-white font-semibold text-sm tracking-wider"
                    >
                        {t("auth.forgot.email_label")}
                    </Label>
                    <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#00E676]/60 group-focus-within:text-[#00E676] transition-colors" />
                        <Input
                            id="reset-email"
                            type="email"
                            placeholder={t("auth.forgot.email_placeholder")}
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-10 bg-[#0A0D10]/50 border border-white/10 focus:border-[#00E676] text-white placeholder:text-[#B0BEC5] rounded-lg transition-all duration-300 focus:shadow-[0_0_15px_rgba(0,230,118,0.2)] backdrop-blur-sm"
                        />
                    </div>
                </div>

                {/* Submit Button */}
                <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-[#00E676] to-[#00C853] hover:from-[#00F77B] hover:to-[#00D96B] text-white font-semibold h-11 rounded-lg shadow-lg hover:shadow-[0_0_25px_rgba(0,230,118,0.4)] transition-all duration-300 border border-[#00E676]/30 mt-2"
                    disabled={isLoading}
                >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isLoading ? t("auth.forgot.sending") : t("auth.forgot.send_link")}
                </Button>
            </form>

            {/* Back to Login */}
            <div className="text-center pt-2">
                <button
                    type="button"
                    onClick={onBack}
                    className="text-[#00E676] hover:text-[#00F77B] transition-colors font-medium text-sm inline-flex items-center"
                >
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    {t("auth.forgot.back")}
                </button>
            </div>
        </div>
    );
};
