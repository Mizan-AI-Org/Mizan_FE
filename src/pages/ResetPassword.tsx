import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Lock, CheckCircle, XCircle } from "lucide-react";
import { api } from "@/lib/api";

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get("token");

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    useEffect(() => {
        if (!token) {
            setError("Invalid reset link. Please request a new password reset.");
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }

        setIsLoading(true);

        try {
            await api.confirmPasswordReset(token!, password);
            setSuccess(true);
        } catch (error: unknown) {
            if (error instanceof Error) {
                setError(error.message);
            } else {
                setError("An unexpected error occurred. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[#0A0D10] flex items-center justify-center p-4 relative overflow-hidden">
                {/* Background Effects */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#0A0D10] via-[#1a1f2e] to-[#0f1419]" />
                <div
                    className="absolute inset-0 pointer-events-none opacity-40"
                    style={{
                        background:
                            "radial-gradient(ellipse 800px 600px at 50% 20%, rgba(0, 230, 118, 0.08), transparent 70%)",
                    }}
                />

                <div className="relative z-10 w-full max-w-md">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-[#00E676] shadow-lg">
                            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                                <div className="w-4 h-4 bg-[#00E676] rounded-full" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">Mizan AI</h1>
                    </div>

                    {/* Success Card */}
                    <div className="relative bg-gradient-to-br from-[#121A22] to-[#0f1419] border border-[#00E676]/30 rounded-xl shadow-2xl p-8 text-center">
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 bg-[#00E676]/20 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-8 h-8 text-[#00E676]" />
                            </div>
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">
                            Password Reset Successful!
                        </h3>
                        <p className="text-[#B0BEC5] text-sm mb-6">
                            Your password has been updated. You can now log in with your new
                            password.
                        </p>
                        <Button
                            onClick={() => navigate("/auth")}
                            className="w-full bg-gradient-to-r from-[#00E676] to-[#00C853] hover:from-[#00F77B] hover:to-[#00D96B] text-white font-semibold h-11 rounded-lg shadow-lg hover:shadow-[0_0_25px_rgba(0,230,118,0.4)] transition-all duration-300"
                        >
                            Go to Login
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A0D10] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0A0D10] via-[#1a1f2e] to-[#0f1419]" />
            <div
                className="absolute inset-0 pointer-events-none opacity-40"
                style={{
                    background:
                        "radial-gradient(ellipse 800px 600px at 50% 20%, rgba(0, 230, 118, 0.08), transparent 70%)",
                }}
            />
            <div
                className="absolute inset-0 opacity-5 pointer-events-none"
                style={{
                    background:
                        "linear-gradient(135deg, rgba(255, 215, 0, 0.3) 0%, transparent 40%, rgba(184, 134, 11, 0.2) 100%)",
                }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,230,118,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,230,118,0.03)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none" />

            <div className="relative z-10 w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-[#00E676] shadow-lg">
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                            <div className="w-4 h-4 bg-[#00E676] rounded-full" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Mizan AI</h1>
                    <p className="text-[#B0BEC5]">Create a New Password</p>
                </div>

                {/* Form Card */}
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-[#D4AF37] via-[#00E676] to-[#00E676]/30 rounded-xl opacity-0 group-hover:opacity-30 blur transition duration-1000 pointer-events-none" />

                    <div className="relative bg-gradient-to-br from-[#121A22] to-[#0f1419] border border-[#00E676]/30 rounded-xl shadow-2xl p-8 backdrop-blur-xl hover:shadow-[0_0_30px_rgba(0,230,118,0.15)] transition-all duration-500">
                        <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-50" />

                        {!token ? (
                            <div className="text-center py-4">
                                <div className="flex justify-center mb-4">
                                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                                        <XCircle className="w-8 h-8 text-red-400" />
                                    </div>
                                </div>
                                <h3 className="text-xl font-semibold text-white mb-2">
                                    Invalid Reset Link
                                </h3>
                                <p className="text-[#B0BEC5] text-sm mb-6">{error}</p>
                                <Button
                                    onClick={() => navigate("/auth")}
                                    className="w-full border-2 border-[#00E676]/50 text-[#00E676] hover:bg-[#00E676]/10 font-semibold h-11 bg-transparent"
                                >
                                    Back to Login
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-5">
                                {error && (
                                    <Alert
                                        variant="destructive"
                                        className="bg-red-500/10 border-red-500/30 rounded-lg"
                                    >
                                        <AlertDescription className="text-red-200">
                                            {error}
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {/* New Password */}
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="new-password"
                                        className="text-white font-semibold text-sm tracking-wider"
                                    >
                                        New Password
                                    </Label>
                                    <div className="relative group">
                                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#00E676]/60 group-focus-within:text-[#00E676] transition-colors" />
                                        <Input
                                            id="new-password"
                                            type="password"
                                            placeholder="Enter new password"
                                            required
                                            minLength={8}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="pl-10 bg-[#0A0D10]/50 border border-[#00E676]/20 focus:border-[#00E676] text-white placeholder:text-[#B0BEC5] rounded-lg transition-all duration-300 focus:shadow-[0_0_15px_rgba(0,230,118,0.2)] backdrop-blur-sm"
                                        />
                                    </div>
                                    <p className="text-xs text-[#B0BEC5]">
                                        Must be at least 8 characters with uppercase, lowercase,
                                        number, and special character.
                                    </p>
                                </div>

                                {/* Confirm Password */}
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="confirm-password"
                                        className="text-white font-semibold text-sm tracking-wider"
                                    >
                                        Confirm Password
                                    </Label>
                                    <div className="relative group">
                                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#00E676]/60 group-focus-within:text-[#00E676] transition-colors" />
                                        <Input
                                            id="confirm-password"
                                            type="password"
                                            placeholder="Confirm new password"
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="pl-10 bg-[#0A0D10]/50 border border-[#00E676]/20 focus:border-[#00E676] text-white placeholder:text-[#B0BEC5] rounded-lg transition-all duration-300 focus:shadow-[0_0_15px_rgba(0,230,118,0.2)] backdrop-blur-sm"
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
                                    {isLoading ? "Resetting..." : "Reset Password"}
                                </Button>
                            </form>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-6 text-center text-sm text-[#B0BEC5]">
                    <p>
                        Remember your password?{" "}
                        <a
                            href="/auth"
                            className="text-[#00E676] hover:text-[#00C853] transition-colors"
                        >
                            Sign In
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
