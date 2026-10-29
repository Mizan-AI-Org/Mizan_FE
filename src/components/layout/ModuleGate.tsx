import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Power } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { TENANT_MODULES_QUERY_KEY, useModules } from "@/hooks/use-modules";
import { MODULES, moduleForPath } from "@/config/modules";
import { api } from "@/lib/api";

/** Pages of a module the tenant turned off show how to turn it back on instead of the page. */
export function ModuleGate({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { selected, isEnabled, canEdit, ready, suspended } = useModules();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const key = moduleForPath(pathname);
  if (!key) return <>{children}</>;
  if (!ready) {
    // A module page waits for the module list, so a turned-off page never flashes or calls its API.
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }
  if (isEnabled(key)) return <>{children}</>;

  const meta = MODULES.find((m) => m.key === key)!;
  const Icon = meta.icon;
  const name = t(`modules.${key}.name`);
  const turnOn = async () => {
    setSaving(true);
    try {
      await api.updateTenantModules([...selected, key]);
      await queryClient.invalidateQueries({ queryKey: TENANT_MODULES_QUERY_KEY });
      toast.success(t("modules.turned_on", { name }));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (suspended && selected.includes(key)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-md space-y-4 rounded-2xl border border-amber-300/60 bg-card p-8 text-center shadow-sm dark:border-amber-700/50">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            <Icon className="h-6 w-6" aria-hidden />
          </span>
          <div className="space-y-1.5">
            <h1 className="text-lg font-bold text-foreground">{t("billing.paused_title", { name })}</h1>
            <p className="text-sm text-muted-foreground">{t("billing.paused_desc")}</p>
          </div>
          <Button asChild>
            <Link to="/dashboard/settings?tab=billing">{t("billing.pay_now")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md space-y-4 rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
        <div className="space-y-1.5">
          <h1 className="text-lg font-bold text-foreground">{t("modules.off_title", { name })}</h1>
          <p className="text-sm text-muted-foreground">{t(`modules.${key}.desc`)}</p>
        </div>
        {canEdit ? (
          <div className="flex flex-col items-center gap-2">
            <Button onClick={turnOn} disabled={saving}>
              {saving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Power className="me-2 h-4 w-4" aria-hidden />}
              {t("modules.turn_on", { name })}
            </Button>
            <Link to="/dashboard/settings?tab=general-settings&section=modules" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
              {t("modules.manage_all")}
            </Link>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t("modules.ask_owner")}</p>
        )}
      </div>
    </div>
  );
}
