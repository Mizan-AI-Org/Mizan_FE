import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/use-language";
import { accountRequest, apiPost } from "@/lib/accountErrors";
import { SettingsSection, settingsFieldClassName } from "@/components/settings/SettingsSection";

interface ExportRow {
  id: string;
  status: "pending" | "ready" | "failed" | "expired";
  createdAt: string;
  expiresAt: string | null;
  downloadUrl: string;
}

export const OWNER_ROLES = ["OWNER", "SUPER_ADMIN"];

/** Whether the typed text names the business (case, accents-insensitive enough, extra spaces ignored). */
export function namesMatch(typed: string, businessName: string): boolean {
  const norm = (v: string) => v.trim().replace(/\s+/g, " ").toLocaleLowerCase();
  return !!typed.trim() && norm(typed) === norm(businessName);
}

/** Owner only: download all the business data (ZIP of CSVs) and close the business (30 days, then erased). */
export function AccountDataCard() {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [typed, setTyped] = useState("");
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [exportError, setExportError] = useState("");

  const isOwner = !!user && OWNER_ROLES.includes(user.role);
  const exportsQuery = useQuery({
    queryKey: ["account-exports"],
    enabled: isOwner,
    queryFn: async () => {
      const res = await accountRequest<ExportRow[]>("/account/export/");
      return Array.isArray(res.data) ? res.data : [];
    },
    refetchInterval: (query) => ((query.state.data as ExportRow[] | undefined)?.[0]?.status === "pending" ? 4000 : false),
  });
  const latest = exportsQuery.data?.[0];

  const startExport = useMutation({
    mutationFn: async () => {
      const res = await apiPost("/account/export/", {});
      if (!res.ok) throw new Error(res.error);
    },
    onMutate: () => setExportError(""),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["account-exports"] }),
    onError: (err: Error) => setExportError(err.message),
  });

  const close = useMutation({
    mutationFn: async () => {
      const res = await apiPost("/account/close/", {
        confirm_name: typed,
        password,
        reason,
      });
      if (!res.ok) throw new Error(res.error);
    },
    onMutate: () => setError(""),
    onSuccess: () => logout(),
    onError: (err: Error) => setError(err.message),
  });

  if (!isOwner) return null;
  const businessName = user?.restaurant_name || "";

  return (
    <SettingsSection
      icon={<AlertCircle className="h-5 w-5" />}
      iconClassName="bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
      title={t("account.data.title")}
      description={t("account.data.desc")}
      className="border-red-200/80 dark:border-red-900/50"
    >
      <div className="space-y-3 rounded-xl border border-border/60 p-4">
        <p className="text-sm font-semibold">{t("account.export.title")}</p>
        <p className="text-xs text-muted-foreground">{t("account.export.desc")}</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={startExport.isPending || latest?.status === "pending"}
            onClick={() => startExport.mutate()}
          >
            {(startExport.isPending || latest?.status === "pending") && <Loader2 className="me-1 h-4 w-4 animate-spin" />}
            {latest?.status === "pending" ? t("account.export.building") : t("account.export.button")}
          </Button>
          {latest?.status === "ready" && latest.downloadUrl && (
            <a
              href={latest.downloadUrl}
              className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 underline underline-offset-2 dark:text-emerald-300"
            >
              <Download className="h-4 w-4" aria-hidden />
              {t("account.export.download")}
            </a>
          )}
          {latest?.status === "failed" && <span className="text-sm text-red-600">{t("account.export.failed")}</span>}
        </div>
        {exportError && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {exportError}
          </p>
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-red-200 p-4 dark:border-red-900/50">
        <p className="text-sm font-semibold">{t("account.close.title")}</p>
        <p className="text-xs text-muted-foreground">{t("account.close.desc")}</p>
        <Button type="button" variant="destructive" className="h-11 w-full rounded-xl sm:w-auto" onClick={() => setDialog(true)}>
          {t("settings.delete_account")}
        </Button>
      </div>

      <AlertDialog open={dialog} onOpenChange={(open) => { setDialog(open); if (!open) { setTyped(""); setPassword(""); setError(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("account.close.dialog_title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("account.close.dialog_desc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="closeName">{t("account.close.type_name", { name: businessName })}</Label>
              <Input id="closeName" value={typed} onChange={(e) => setTyped(e.target.value)} className={settingsFieldClassName} autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="closePassword">{t("account.leave.password")}</Label>
              <Input id="closePassword" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={settingsFieldClassName} autoComplete="current-password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="closeReason">{t("account.close.reason")}</Label>
              <Input id="closeReason" value={reason} onChange={(e) => setReason(e.target.value)} className={settingsFieldClassName} />
            </div>
            {error && (
              <p role="alert" className="text-sm font-medium text-red-600">
                {error}
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={close.isPending || !namesMatch(typed, businessName) || !password}
              onClick={() => close.mutate()}
            >
              {close.isPending && <Loader2 className="me-1 h-4 w-4 animate-spin" />}
              {t("account.close.confirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsSection>
  );
}
