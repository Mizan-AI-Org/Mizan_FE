import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/use-language";
import { apiPost } from "@/lib/accountErrors";
import { SettingsSection, settingsFieldClassName } from "@/components/settings/SettingsSection";

/** A person leaves this business on their own: their account here is deactivated and they are signed out. */
export function LeaveBusinessCard() {
  const { t } = useLanguage();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const leave = async () => {
    setBusy(true);
    setError("");
    const res = await apiPost("/auth/me/deactivate/", { password });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    logout();
  };

  return (
    <SettingsSection
      icon={<span aria-hidden>!</span>}
      iconClassName="bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
      title={t("account.leave.title")}
      description={t("account.leave.desc")}
      className="border-red-200/80 dark:border-red-900/50"
    >
      {!open ? (
        <Button type="button" variant="destructive" className="h-11 w-full rounded-xl sm:w-auto" onClick={() => setOpen(true)}>
          {t("account.leave.button")}
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="leavePassword">{t("account.leave.password")}</Label>
            <Input
              id="leavePassword"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={settingsFieldClassName}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm font-medium text-red-600">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="destructive" disabled={busy || !password} onClick={leave}>
              {busy && <Loader2 className="me-1 h-4 w-4 animate-spin" />}
              {t("account.leave.confirm")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => { setOpen(false); setPassword(""); setError(""); }}>
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      )}
    </SettingsSection>
  );
}
