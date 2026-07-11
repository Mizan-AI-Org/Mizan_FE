import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { AuthContextType } from "../contexts/AuthContext.types";
import { useLanguage } from "@/hooks/use-language";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { User, Mail, Phone, ShieldAlert, Lock, Save, Loader2 } from "lucide-react";
import {
  SettingsSection,
  SettingsStickyActions,
  settingsFieldClassName,
} from "@/components/settings/SettingsSection";

import { API_BASE } from "@/lib/api";

const ProfileSettings: React.FC = () => {
  const { user, updateUser } = useAuth() as AuthContextType;
  const { toast } = useToast();
  const { t } = useLanguage();

  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [emergencyContactName, setEmergencyContactName] = useState(
    user?.profile?.emergency_contact_name || "",
  );
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(
    user?.profile?.emergency_contact_phone || "",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
      setEmergencyContactName(user.profile?.emergency_contact_name || "");
      setEmergencyContactPhone(user.profile?.emergency_contact_phone || "");
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
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
          ...(newPassword
            ? {
                current_password: currentPassword,
                new_password: newPassword,
                confirm_password: confirmPassword,
              }
            : {}),
          profile: {
            emergency_contact_name: emergencyContactName,
            emergency_contact_phone: emergencyContactPhone,
          },
        }),
      });

      let responseData;
      try {
        responseData = await response.json();
      } catch {
        throw new Error("Invalid response from server");
      }

      if (!response.ok) {
        throw new Error(
          responseData.detail || responseData.message || "Failed to update profile",
        );
      }

      if (typeof updateUser === "function") {
        updateUser(responseData);
      } else {
        localStorage.setItem("user", JSON.stringify(responseData));
      }
      toast({
        title: t("profile.updated_success"),
        description: newPassword
          ? t("profile.updated_password_desc")
          : t("profile.updated_success_desc"),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <SettingsSection
        icon={<User className="h-5 w-5" />}
        iconClassName="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
        title={t("profile.section_personal")}
        description={t("profile.section_personal_desc")}
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">{t("profile.first_name")}</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className={settingsFieldClassName}
              placeholder={t("profile.placeholder_first_name")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">{t("profile.last_name")}</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className={settingsFieldClassName}
              placeholder={t("profile.placeholder_last_name")}
            />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        icon={<Mail className="h-5 w-5" />}
        iconClassName="bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
        title={t("profile.section_contact")}
        description={t("profile.section_contact_desc")}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email">{t("profile.email_address")}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled
              className={`${settingsFieldClassName} bg-slate-100 dark:bg-slate-800/70 text-slate-500 cursor-not-allowed`}
            />
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {t("profile.email_cannot_change")}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t("profile.phone_number")}</Label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`${settingsFieldClassName} pl-10`}
                placeholder={t("profile.phone_placeholder")}
              />
            </div>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>{t("profile.role")}</Label>
            <div className="inline-flex max-w-full items-center gap-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/20 px-3.5 py-2.5">
              <ShieldAlert className="w-4 h-4 text-emerald-700 dark:text-emerald-300 shrink-0" />
              <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-200 uppercase tracking-wide">
                {user?.role?.replace(/_/g, " ") || "N/A"}
              </span>
            </div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        icon={<ShieldAlert className="h-5 w-5" />}
        iconClassName="bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
        title={t("profile.emergency_contact")}
        description={t("profile.emergency_contact_desc")}
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="emergencyContactName">{t("profile.contact_name")}</Label>
            <Input
              id="emergencyContactName"
              value={emergencyContactName}
              onChange={(e) => setEmergencyContactName(e.target.value)}
              className={settingsFieldClassName}
              placeholder={t("profile.emergency_contact_name")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergencyContactPhone">{t("profile.contact_phone")}</Label>
            <Input
              id="emergencyContactPhone"
              type="tel"
              value={emergencyContactPhone}
              onChange={(e) => setEmergencyContactPhone(e.target.value)}
              className={settingsFieldClassName}
              placeholder={t("profile.phone_placeholder")}
            />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        icon={<Lock className="h-5 w-5" />}
        iconClassName="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
        title={t("profile.change_password")}
        description={t("profile.change_password_desc")}
      >
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">{t("profile.current_password")}</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={settingsFieldClassName}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">{t("profile.new_password")}</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={settingsFieldClassName}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t("profile.confirm_password")}</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={settingsFieldClassName}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>
        </div>
      </SettingsSection>

      <SettingsStickyActions hint={t("settings.save_hint")}>
        <Button
          type="submit"
          className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t("profile.saving_changes")}
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {t("profile.save_changes")}
            </>
          )}
        </Button>
      </SettingsStickyActions>
    </form>
  );
};

export default ProfileSettings;
