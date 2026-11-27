import React, { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { MessageCircle, Shield } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { roleDisplayName } from "@/lib/roleDisplayName";
import { DEFAULT_STAFF_WHATSAPP_URL } from "@/lib/operationalCommandRoles";

type LocationState = {
  whatsappUrl?: string | null;
  role?: string | null;
};

/**
 * Landing for CHEF / WAITER / STAFF / etc. — they work on WhatsApp, not the web app.
 */
export default function StaffWhatsAppOnly() {
  const { t } = useLanguage();
  const location = useLocation();
  const state = (location.state || {}) as LocationState;

  const { url, role } = useMemo(() => {
    let wa = state.whatsappUrl || null;
    let r = state.role || null;
    if (!wa || !r) {
      try {
        const raw = sessionStorage.getItem("mizan_whatsapp_only");
        if (raw) {
          const parsed = JSON.parse(raw) as { whatsapp_url?: string; role?: string };
          wa = wa || parsed.whatsapp_url || null;
          r = r || parsed.role || null;
        }
      } catch {
        /* ignore */
      }
    }
    return { url: wa || DEFAULT_STAFF_WHATSAPP_URL, role: r };
  }, [state.whatsappUrl, state.role]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg space-y-5 text-center">
        <div className="flex justify-center">
          <BrandLogo size="sm" />
        </div>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <MessageCircle className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">{t("staff_whatsapp.title")}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {role ? (
              <>
                {t("staff_whatsapp.role_prefix")} (<span className="font-medium text-foreground">{roleDisplayName(role, t)}</span>) {t("staff_whatsapp.role_suffix")}
              </>
            ) : (
              <>{t("staff_whatsapp.generic")}</>
            )}
          </p>
        </div>
        <Button asChild className="w-full gap-2 bg-emerald-500 hover:bg-emerald-600 text-white">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-4 w-4" />
            {t("staff_whatsapp.open")}
          </a>
        </Button>
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <Shield className="h-3.5 w-3.5" />
          {t("staff_whatsapp.manager_q")}{" "}
          <Link to="/auth" className="font-medium text-emerald-600 hover:underline dark:text-emerald-400">
            {t("staff_whatsapp.sign_in")}
          </Link>
        </p>
      </div>
    </div>
  );
}
