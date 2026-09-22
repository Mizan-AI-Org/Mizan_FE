import React, { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { MessageCircle, Shield } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { DEFAULT_STAFF_WHATSAPP_URL } from "@/lib/operationalCommandRoles";

type LocationState = {
  whatsappUrl?: string | null;
  role?: string | null;
};

/**
 * Landing for CHEF / WAITER / STAFF / etc. — they work on WhatsApp, not the web app.
 */
export default function StaffWhatsAppOnly() {
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
          <h1 className="text-xl font-semibold tracking-tight">WhatsApp only</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {role ? (
              <>
                Your role (<span className="font-medium text-foreground">{role}</span>) uses
                WhatsApp to clock in, finish tasks, and talk to Mizan.
              </>
            ) : (
              <>
                Front-of-house and kitchen staff use WhatsApp — not the web dashboard.
                Managers and owners sign in here on the web.
              </>
            )}
          </p>
        </div>
        <Button asChild className="w-full gap-2 bg-emerald-500 hover:bg-emerald-600 text-white">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-4 w-4" />
            Open WhatsApp
          </a>
        </Button>
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <Shield className="h-3.5 w-3.5" />
          Manager or owner?{" "}
          <Link to="/auth" className="font-medium text-emerald-600 hover:underline dark:text-emerald-400">
            Sign in on the web
          </Link>
        </p>
      </div>
    </div>
  );
}
