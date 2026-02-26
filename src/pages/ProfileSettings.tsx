import React, { useState, useEffect } from 'react';
import { useAuth } from "../contexts/AuthContext";
import { AuthContextType } from "../contexts/AuthContext.types";
import { useLanguage } from "@/hooks/use-language";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { User, Mail, Phone, ShieldAlert, Lock, Save, Loader2 } from "lucide-react";

import { API_BASE } from "@/lib/api";

const ProfileSettings: React.FC = () => {
    const { user, updateUser } = useAuth() as AuthContextType;
    const { toast } = useToast();
    const { t } = useLanguage();

    const [firstName, setFirstName] = useState(user?.first_name || "");
    const [lastName, setLastName] = useState(user?.last_name || "");
    const [email, setEmail] = useState(user?.email || "");
    const [phone, setPhone] = useState(user?.phone || "");
    const [preferredLanguage, setPreferredLanguage] = useState<string>((user as any)?.preferred_language || "");
    const [emergencyContactName, setEmergencyContactName] = useState(user?.profile?.emergency_contact_name || "");
    const [emergencyContactPhone, setEmergencyContactPhone] = useState(user?.profile?.emergency_contact_phone || "");
    const [isLoading, setIsLoading] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Update form when user data changes
    useEffect(() => {
        if (user) {
            setFirstName(user.first_name || "");
            setLastName(user.last_name || "");
            setEmail(user.email || "");
            setPhone(user.phone || "");
            setPreferredLanguage((user as any)?.preferred_language || "");
            setEmergencyContactName(user.profile?.emergency_contact_name || "");
            setEmergencyContactPhone(user.profile?.emergency_contact_phone || "");
        }
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Basic client-side validation for password change
            if (newPassword || confirmPassword || currentPassword) {
                if (!newPassword || !confirmPassword || !currentPassword) {
                    throw new Error("Please fill current, new, and confirm password.");
                }
                if (newPassword !== confirmPassword) {
                    throw new Error("New password and confirmation do not match.");
                }
                if (newPassword.length < 8) {
                    throw new Error("Password must be at least 8 characters.");
                }
            }

            const response = await fetch(`${API_BASE}/auth/me/`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                },
                body: JSON.stringify({
                    first_name: firstName,
                    last_name: lastName,
                    phone: phone,
                    // Staff/user-level language override for notifications + Miya
                    preferred_language: preferredLanguage || null,
                    ...(newPassword ? {
                        current_password: currentPassword,
                        new_password: newPassword,
                        confirm_password: confirmPassword,
                    } : {}),
                    profile: {
                        emergency_contact_name: emergencyContactName,
                        emergency_contact_phone: emergencyContactPhone,
                    },
                }),
            });

            let responseData;
            try {
                responseData = await response.json();
            } catch (error) {
                throw new Error("Invalid response from server");
            }

            if (!response.ok) {
                throw new Error(responseData.detail || responseData.message || "Failed to update profile");
            }

            // Update user in auth context so UI reflects latest profile details
            if (typeof updateUser === "function") {
                updateUser(responseData);
            } else {
                // Fallback: persist to localStorage and let periodic refresh sync
                localStorage.setItem("user", JSON.stringify(responseData));
            }
            toast({
                title: t("profile.updated_success"),
                description: newPassword ? t("profile.updated_password_desc") : t("profile.updated_success_desc"),
            });
        } catch (error: unknown) {
            console.error("Profile update error:", error);
            const message =
                error instanceof Error
                    ? error.message
                    : typeof error === "string"
                        ? error
                        : "An unexpected error occurred.";
            toast({
                title: t("profile.update_failed"),
                description: message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* Personal Information Section */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-200 dark:border-slate-700">
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
                        <User className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t("profile.section_personal")}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{t("profile.section_personal_desc")}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("profile.first_name")}</Label>
                        <Input
                            id="firstName"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            required
                            className="h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-gray-100 focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-500 focus:ring-emerald-500 transition-all"
                            placeholder={t("profile.placeholder_first_name")}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="lastName" className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("profile.last_name")}</Label>
                        <Input
                            id="lastName"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            required
                            className="h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-gray-100 focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-500 focus:ring-emerald-500 transition-all"
                            placeholder={t("profile.placeholder_last_name")}
                        />
                    </div>
                </div>
            </div>

            {/* Contact Information Section */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-200 dark:border-slate-700">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                        <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t("profile.section_contact")}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{t("profile.section_contact_desc")}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("profile.email_address")}</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            disabled
                            className="h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                        />
                        <p className="text-xs text-slate-400 dark:text-slate-500">{t("profile.email_cannot_change")}</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("profile.phone_number")}</Label>
                        <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                id="phone"
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="h-12 pl-11 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-gray-100 focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-500 focus:ring-emerald-500 transition-all"
                                placeholder={t("profile.phone_placeholder")}
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("profile.role")}</Label>
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-100 dark:border-emerald-800">
                        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                            <ShieldAlert className="w-4 h-4 text-emerald-600" />
                        </div>
                        <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">
                            {user?.role?.replace(/_/g, " ") || "N/A"}
                        </span>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="preferredLanguage" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {t("profile.preferred_language")}
                    </Label>
                    <select
                        id="preferredLanguage"
                        value={preferredLanguage || ""}
                        onChange={(e) => setPreferredLanguage(e.target.value)}
                        className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm font-medium text-slate-700 dark:text-slate-300 focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-500 focus:ring-emerald-500 transition-all"
                    >
                        <option value="">{t("profile.use_restaurant_default")}</option>
                        <option value="en">English</option>
                        <option value="fr">Français</option>
                        <option value="ar">العربية</option>
                    </select>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t("profile.language_hint")}
                    </p>
                </div>
            </div>

            {/* Emergency Contact Section */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-200 dark:border-slate-700">
                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/30">
                        <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t("profile.emergency_contact")}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{t("profile.emergency_contact_desc")}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="emergencyContactName" className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("profile.contact_name")}</Label>
                        <Input
                            id="emergencyContactName"
                            value={emergencyContactName}
                            onChange={(e) => setEmergencyContactName(e.target.value)}
                            className="h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-gray-100 focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-500 focus:ring-emerald-500 transition-all"
                            placeholder={t("profile.emergency_contact_name")}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="emergencyContactPhone" className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("profile.contact_phone")}</Label>
                        <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                id="emergencyContactPhone"
                                type="tel"
                                value={emergencyContactPhone}
                                onChange={(e) => setEmergencyContactPhone(e.target.value)}
                                className="h-12 pl-11 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-gray-100 focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-500 focus:ring-emerald-500 transition-all"
                                placeholder={t("profile.phone_placeholder")}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Change Password Section */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-200 dark:border-slate-700">
                    <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/30">
                        <Lock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t("profile.change_password")}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{t("profile.change_password_desc")}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="space-y-2">
                        <Label htmlFor="currentPassword" className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("profile.current_password")}</Label>
                        <Input
                            id="currentPassword"
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-gray-100 focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-500 focus:ring-emerald-500 transition-all"
                            placeholder="••••••••"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="newPassword" className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("profile.new_password")}</Label>
                        <Input
                            id="newPassword"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-gray-100 focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-500 focus:ring-emerald-500 transition-all"
                            placeholder="••••••••"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("profile.confirm_password")}</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-gray-100 focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-500 focus:ring-emerald-500 transition-all"
                            placeholder="••••••••"
                        />
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button
                    type="submit"
                    className="w-full h-14 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-base shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            {t("profile.saving_changes")}
                        </>
                    ) : (
                        <>
                            <Save className="w-5 h-5 mr-2" />
                            {t("profile.save_changes")}
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
};

export default ProfileSettings;
