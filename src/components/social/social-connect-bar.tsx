import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Plug, Settings2 } from "lucide-react";
import { socialApi, SocialApiError } from "@/lib/social-api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SocialPlatformIcon } from "@/components/social/social-platform-icon";
import {
  SocialPlatformSetupDialog,
  type PlatformSetupInfo,
} from "@/components/social/social-platform-setup-dialog";
import { SocialConnectionTargetDialog } from "@/components/social/social-connection-target-dialog";
import { useLanguage } from "@/hooks/use-language";

const PLATFORMS: { id: string; label: string }[] = [
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "tiktok", label: "TikTok" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "youtube", label: "YouTube" },
  { id: "google_business", label: "Google Business" },
];

/** Shown as disabled until provider OAuth is available in production. */
const COMING_SOON = new Set(["tiktok"]);

type Props = {
  className?: string;
  compact?: boolean;
};

/** Live OAuth only — opens provider authorization when configured. */
export function SocialConnectBar({ className, compact }: Props) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const returnTo = `${window.location.origin}/dashboard/social-media?tab=home`;
  const [setupPlatform, setSetupPlatform] = useState<{ id: string; label: string } | null>(null);
  const [targetPlatform, setTargetPlatform] = useState<{ id: string; label: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["social-accounts"],
    queryFn: () => socialApi.accounts(),
  });

  const connect = useMutation({
    mutationFn: async (platform: string) => {
      const res = await socialApi.oauthStart(platform, returnTo);
      if (res.authorization_url) {
        window.location.href = res.authorization_url;
        return;
      }
      throw new SocialApiError("OAuth URL missing", 503, res);
    },
    onError: (e: unknown) => {
      const err = e instanceof SocialApiError ? e : null;
      const payload = err?.payload;
      const missing = payload?.missing_env?.length ? payload.missing_env.join(", ") : null;
      const docs = payload?.docs_url;
      if (missing) {
        toast.error(t("social.connect.add_env", { missing }), {
          action: docs
            ? {
                label: t("social.connect.setup_guide"),
                onClick: () => window.open(docs, "_blank", "noopener,noreferrer"),
              }
            : undefined,
          duration: 8000,
        });
      } else {
        toast.error(err?.message || (e instanceof Error ? e.message : t("social.connect.could_not_start")));
      }
    },
  });

  const disconnect = useMutation({
    mutationFn: (platform: string) => socialApi.disconnect(platform),
    onSuccess: () => {
      toast.success(t("social.connect.disconnected"));
      qc.invalidateQueries({ queryKey: ["social-accounts"] });
      qc.invalidateQueries({ queryKey: ["social-overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setupByPlatform = Object.fromEntries((data?.platform_setup || []).map((s) => [s.platform, s]));
  const byPlatform = Object.fromEntries((data?.accounts || []).map((a) => [String(a.platform), a]));
  const connectedCount = (data?.accounts || []).filter((a) => a.status === "connected").length;

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2 rounded-xl border bg-muted/30 px-4 py-3", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{t("social.connect.loading")}</span>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border bg-gradient-to-br from-muted/40 to-muted/10 p-5", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-medium">
          {t("social.connect.your_channels")}
          {connectedCount > 0 ? (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {t("social.connect.connected_count", { count: connectedCount })}
            </span>
          ) : null}
        </p>
        {!compact ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Plug className="h-3.5 w-3.5 text-primary" /> {t("social.connect.one_at_a_time")}
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {PLATFORMS.map(({ id, label }) => {
          const acc = byPlatform[id];
          const connected = acc?.status === "connected";
          const pending = connect.isPending && connect.variables === id;
          const setup = setupByPlatform[id];
          const oauthReady = setup?.configured === true;
          const comingSoon = COMING_SOON.has(id);
          const needsTarget = Boolean(
            connected && (acc?.metadata as { needs_page_selection?: boolean } | undefined)?.needs_page_selection,
          );

          if (comingSoon && !connected) {
            return (
              <div
                key={id}
                aria-disabled
                title={t("social.connect.coming_soon_title", { label })}
                className="flex min-h-[8.5rem] min-w-0 w-full flex-col overflow-hidden rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30 px-3 py-3 opacity-60 grayscale"
              >
                <SocialPlatformIcon platform={id} size={28} />
                <p className="mt-2 truncate text-sm font-medium text-muted-foreground">{label}</p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{t("social.connect.coming_soon")}</p>
                <Button type="button" size="sm" disabled variant="secondary" className="mt-auto h-8 min-h-0 w-full max-w-full px-2 text-xs">
                  {t("social.connect.soon")}
                </Button>
              </div>
            );
          }

          const runConnectAction = () => {
            if (needsTarget) {
              setTargetPlatform({ id, label });
              return;
            }
            if (!oauthReady) {
              setSetupPlatform({ id, label });
              return;
            }
            connect.mutate(id);
          };

          const actionLabel = connected
            ? t("social.connect.reconnect_short")
            : needsTarget
              ? t("social.connect.finish")
              : oauthReady
                ? t("social.connect.connect")
                : t("social.connect.setup");

          return (
            <div
              key={id}
              className={cn(
                "flex min-h-[8.5rem] min-w-0 w-full flex-col overflow-hidden rounded-lg border px-3 py-3",
                connected
                  ? "border-emerald-500/40 bg-emerald-500/10"
                  : "border-border bg-background",
                pending && "opacity-60",
              )}
            >
              <div className="flex w-full items-start justify-between gap-2">
                <SocialPlatformIcon platform={id} size={28} />
                {connected ? (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                ) : pending ? (
                  <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" aria-hidden />
                ) : !oauthReady ? (
                  <Settings2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                ) : null}
              </div>
              <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug">{label}</p>
              {connected ? (
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  @{String(acc?.username || acc?.account_name || "live")}
                </p>
              ) : needsTarget ? (
                <p className="mt-0.5 text-[11px] text-amber-600 dark:text-amber-400">{t("social.connect.pick_target")}</p>
              ) : !oauthReady ? (
                <p className="mt-0.5 text-[11px] text-muted-foreground">{t("social.connect.server_setup")}</p>
              ) : (
                <p className="mt-0.5 text-[11px] text-muted-foreground">&nbsp;</p>
              )}
              <Button
                type="button"
                size="sm"
                disabled={pending}
                variant={connected ? "outline" : needsTarget ? "default" : oauthReady ? "default" : "secondary"}
                className={cn(
                  "mt-auto h-8 min-h-0 w-full max-w-full px-2 text-xs font-semibold",
                  needsTarget && "bg-amber-500 text-white hover:bg-amber-600",
                )}
                onClick={runConnectAction}
              >
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : actionLabel}
              </Button>
            </div>
          );
        })}
      </div>
      {connectedCount > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {(data?.accounts || [])
            .filter((a) => a.status === "connected")
            .map((a) => (
              <Button
                key={String(a.platform)}
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={() => disconnect.mutate(String(a.platform))}
              >
                {t("social.connect.disconnect", {
                  label: PLATFORMS.find((p) => p.id === a.platform)?.label || a.platform,
                })}
              </Button>
            ))}
        </div>
      ) : null}

      <SocialPlatformSetupDialog
        open={!!setupPlatform}
        onOpenChange={(o) => !o && setSetupPlatform(null)}
        label={setupPlatform?.label || ""}
        setup={setupByPlatform[setupPlatform?.id || ""] as PlatformSetupInfo | undefined}
      />
      {targetPlatform ? (
        <SocialConnectionTargetDialog
          platform={targetPlatform.id}
          label={targetPlatform.label}
          open
          onOpenChange={(o) => !o && setTargetPlatform(null)}
        />
      ) : null}
    </div>
  );
}
