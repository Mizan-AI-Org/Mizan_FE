import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Copy, KeyRound, Loader2, Plug, RefreshCw, Unplug } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  SettingsSection,
  settingsFieldClassName,
  settingsInsetPanelClassName,
} from "@/components/settings/SettingsSection";
import { useLanguage } from "@/hooks/use-language";
import { API_BASE } from "@/lib/api";
import { cn } from "@/lib/utils";
import { PosProviderLogo } from "@/components/settings/PosProviderLogo";
import { formatDateTime } from "@/lib/localeTag";

type PosKey = "square" | "clover" | "lightspeed" | "toast" | "custom";

export interface PosProviderState {
  provider: PosKey;
  label: string;
  auth: "oauth" | "toast" | "push";
  available: boolean;
  status: "connected" | "disconnected" | "error";
  connected: boolean;
  account: string;
  connectedAt: string | null;
  lastSyncAt: string | null;
  lastSyncImported: number | null;
  lastError: string;
  keyPrefix?: string | null;
  endpoint?: string;
}

const PROVIDER_RING: Record<PosKey, string> = {
  square: "hover:ring-neutral-400/30",
  clover: "hover:ring-emerald-500/25",
  lightspeed: "hover:ring-rose-500/25",
  toast: "hover:ring-orange-500/25",
  custom: "hover:ring-slate-500/25",
};

async function posRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(payload.detail || payload.error || "Request failed") as Error & { status?: number };
    err.status = response.status;
    throw err;
  }
  return payload as T;
}

const QUERY_KEY = ["pos-integrations"];

const fmtWhen = (iso: string | null) =>
  iso ? formatDateTime(new Date(iso), undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

/** Settings → Integrations → POS: one card per POS, each with its real state, plus the push API for any other POS. */
export default function PosIntegrations({ onChange }: { onChange?: () => void }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => posRequest<{ providers: PosProviderState[]; canManage: boolean }>("/integrations/pos/"),
  });
  const [busy, setBusy] = useState<string>("");
  const [toastGuid, setToastGuid] = useState("");
  const [revealedKey, setRevealedKey] = useState("");
  const [confirmDisconnect, setConfirmDisconnect] = useState<PosProviderState | null>(null);

  const refresh = (providers?: PosProviderState[]) => {
    if (providers) queryClient.setQueryData(QUERY_KEY, { ...(query.data || { canManage: true }), providers });
    else void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    onChange?.();
  };

  useEffect(() => {
    const url = new URL(window.location.href);
    const connected = url.searchParams.get("pos_connected");
    const error = url.searchParams.get("pos_error");
    if (!connected && !error) return;
    const provider = url.searchParams.get("provider") || "";
    const label = provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : "POS";
    if (connected === "true") toast.success(t("pos.hub.connected_toast", { name: label }));
    else toast.error(t(`pos.hub.error.${error}`) || t("pos.hub.error.exchange"));
    ["pos_connected", "pos_error", "provider", "square", "message"].forEach((k) => url.searchParams.delete(k));
    window.history.replaceState({}, "", url.toString());
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }, [queryClient, t]);

  const run = async (id: string, fn: () => Promise<void>) => {
    setBusy(id);
    try {
      await fn();
    } catch (error) {
      const err = error as Error & { status?: number };
      toast.error(err.status === 501 ? t("pos.hub.pending_toast") : err.message);
    } finally {
      setBusy("");
    }
  };

  const connectOauth = (p: PosProviderState) =>
    run(`connect-${p.provider}`, async () => {
      const returnTo = "/dashboard/settings?tab=integrations&section=pos";
      const res = await posRequest<{ authorization_url: string }>(
        `/integrations/pos/${p.provider}/authorize/?return_to=${encodeURIComponent(returnTo)}`,
      );
      window.location.href = res.authorization_url;
    });

  const connectToast = () =>
    run("connect-toast", async () => {
      const res = await posRequest<{ providers: PosProviderState[] }>("/integrations/pos/toast/connect/", {
        method: "POST",
        body: JSON.stringify({ restaurant_guid: toastGuid.trim() }),
      });
      setToastGuid("");
      toast.success(t("pos.hub.connected_toast", { name: "Toast" }));
      refresh(res.providers);
    });

  const sync = (p: PosProviderState) =>
    run(`sync-${p.provider}`, async () => {
      const res = await posRequest<{ imported: number; providers: PosProviderState[] }>(`/integrations/pos/${p.provider}/sync/`, {
        method: "POST",
        body: "{}",
      });
      toast.success(t("pos.hub.synced", { count: String(res.imported) }));
      refresh(res.providers);
    });

  const disconnect = (p: PosProviderState) =>
    run(`disconnect-${p.provider}`, async () => {
      const res = await posRequest<{ providers: PosProviderState[] }>(`/integrations/pos/${p.provider}/disconnect/`, {
        method: "POST",
      });
      setConfirmDisconnect(null);
      setRevealedKey("");
      toast.success(t("pos.hub.disconnected", { name: p.label }));
      refresh(res.providers);
    });

  const issueKey = () =>
    run("key", async () => {
      const res = await posRequest<{ apiKey: string; providers: PosProviderState[] }>("/integrations/pos/custom/key/", {
        method: "POST",
      });
      setRevealedKey(res.apiKey);
      refresh(res.providers);
    });

  const providers = query.data?.providers || [];
  const canManage = query.data?.canManage ?? false;
  const anyConnected = providers.some((p) => p.connected);
  const connectedCount = providers.filter((p) => p.connected).length;

  return (
    <SettingsSection
      id="pos-integration"
      icon={<Plug className="h-5 w-5" />}
      iconClassName="bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
      title={t("pos.title")}
      description={t("pos.hub.description")}
      contentClassName="space-y-4"
      actions={
        <Badge
          variant="outline"
          className={cn(
            "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
            anyConnected
              ? "border-emerald-400/80 bg-emerald-500/10 text-emerald-800 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "border-border bg-muted/50 text-muted-foreground",
          )}
        >
          {anyConnected
            ? t("integrations.status.fully_connected")
            : t("integrations.status.pos_not_configured")}
        </Badge>
      }
    >
      {anyConnected ? (
        <p className="text-xs text-muted-foreground">
          {t("pos.hub.summary_connected", { count: String(connectedCount) })}
        </p>
      ) : null}

      {query.isLoading ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        </div>
      ) : query.isError ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {t("pos.hub.load_error")}
        </p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {providers.map((p) => (
            <PosProviderCard
              key={p.provider}
              provider={p}
              canManage={canManage}
              busy={busy}
              toastGuid={toastGuid}
              revealedKey={revealedKey}
              onToastGuidChange={setToastGuid}
              onConnectOauth={() => void connectOauth(p)}
              onConnectToast={() => void connectToast()}
              onSync={() => void sync(p)}
              onDisconnect={() => setConfirmDisconnect(p)}
              onIssueKey={() => void issueKey()}
            />
          ))}
        </ul>
      )}

      <AlertDialog open={!!confirmDisconnect} onOpenChange={(open) => !open && setConfirmDisconnect(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("pos.hub.disconnect_title", { name: confirmDisconnect?.label || "" })}</AlertDialogTitle>
            <AlertDialogDescription className="text-start">
              {confirmDisconnect?.provider === "custom" ? t("pos.hub.disconnect_custom") : t("pos.hub.disconnect_body")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!busy}>{t("common.cancel")}</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={!!busy}
              onClick={() => confirmDisconnect && void disconnect(confirmDisconnect)}
            >
              {busy.startsWith("disconnect") ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Unplug className="me-2 h-4 w-4" />}
              {t("pos.hub.disconnect")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsSection>
  );
}

type PosProviderCardProps = {
  provider: PosProviderState;
  canManage: boolean;
  busy: string;
  toastGuid: string;
  revealedKey: string;
  onToastGuidChange: (v: string) => void;
  onConnectOauth: () => void;
  onConnectToast: () => void;
  onSync: () => void;
  onDisconnect: () => void;
  onIssueKey: () => void;
};

function PosProviderCard({
  provider: p,
  canManage,
  busy,
  toastGuid,
  revealedKey,
  onToastGuidChange,
  onConnectOauth,
  onConnectToast,
  onSync,
  onDisconnect,
  onIssueKey,
}: PosProviderCardProps) {
  const { t } = useLanguage();
  const displayName = p.provider === "custom" ? t("pos.custom_api") : p.label;
  const pending = !p.available;
  const busyConnect = busy === `connect-${p.provider}` || busy === "connect-toast";
  const busySync = busy === `sync-${p.provider}`;
  const busyKey = busy === "key";

  return (
    <li
      className={cn(
        "flex min-h-[11.5rem] flex-col rounded-2xl border bg-card p-0 shadow-sm ring-1 ring-transparent transition-shadow",
        pending ? "border-dashed border-border/80 bg-muted/20 opacity-90" : "border-border/70",
        p.connected
          ? "ring-emerald-500/20 dark:ring-emerald-500/25"
          : p.status === "error"
            ? "ring-destructive/25"
            : PROVIDER_RING[p.provider],
        p.provider === "custom" && "md:col-span-2",
      )}
    >
      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <PosProviderLogo provider={p.provider} />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">{displayName}</h3>
              <StatusBadge p={p} />
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{t(`pos.hub.blurb.${p.provider}`)}</p>
          </div>
        </div>

        {pending ? (
          <p className="text-xs italic leading-relaxed text-muted-foreground/90">{t("pos.hub.pending_hint", { name: p.label })}</p>
        ) : null}

        {(p.connected || p.status === "error") && !pending ? (
          <div className={cn(settingsInsetPanelClassName, "space-y-1 text-xs")}>
            {p.account ? <p className="truncate font-medium text-foreground">{t("pos.hub.account", { account: p.account })}</p> : null}
            {p.lastSyncAt ? (
              <p className="text-muted-foreground">
                {t("pos.hub.last_sync", {
                  when: fmtWhen(p.lastSyncAt),
                  count: String(p.lastSyncImported ?? 0),
                })}
              </p>
            ) : p.auth !== "push" ? (
              <p className="text-muted-foreground">{t("pos.hub.first_sync")}</p>
            ) : null}
            {p.lastError ? <p className="text-destructive">{p.lastError}</p> : null}
          </div>
        ) : null}

        {p.provider === "custom" && p.connected ? (
          <div className={cn(settingsInsetPanelClassName, "space-y-2 text-xs")}>
            <p className="font-medium text-foreground">{t("pos.hub.custom.endpoint")}</p>
            <code className="block break-all rounded-lg bg-background px-2.5 py-2 font-mono text-[11px]">POST {p.endpoint}</code>
            <p className="text-muted-foreground">{t("pos.hub.custom.auth", { prefix: `${p.keyPrefix || "mzn_pos_"}…` })}</p>
            <pre className="overflow-x-auto whitespace-pre rounded-lg bg-background p-2.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
              {`{"sales": [{"id": "ticket-1042-1", "item": "Tajine",
  "quantity": 2, "revenue": 240,
  "sold_at": "2026-10-27T13:05:00+01:00"}]}`}
            </pre>
            <p className="text-muted-foreground">{t("pos.hub.custom.rules")}</p>
          </div>
        ) : null}

        {revealedKey && p.provider === "custom" ? <RevealedKey value={revealedKey} /> : null}
      </div>

      {canManage && p.available ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 bg-muted/20 px-4 py-3 sm:px-5">
          {p.connected ? (
            <>
              {p.auth !== "push" ? (
                <Button size="sm" variant="secondary" disabled={!!busy} onClick={onSync} className="gap-1.5 rounded-lg">
                  {busySync ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  {t("pos.hub.sync_now")}
                </Button>
              ) : (
                <Button size="sm" variant="secondary" disabled={!!busy} onClick={onIssueKey} className="gap-1.5 rounded-lg">
                  <KeyRound className="h-3.5 w-3.5" />
                  {t("pos.hub.custom.rotate")}
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                disabled={!!busy}
                onClick={onDisconnect}
                className="ms-auto gap-1.5 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Unplug className="h-3.5 w-3.5" />
                {t("pos.hub.disconnect")}
              </Button>
            </>
          ) : p.auth === "oauth" ? (
            <Button size="sm" disabled={!!busy} onClick={onConnectOauth} className="gap-1.5 rounded-lg">
              {busyConnect ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
              {p.status === "error" ? t("pos.hub.reconnect") : t("pos.hub.connect_with", { name: p.label.split(" ")[0] })}
            </Button>
          ) : p.auth === "toast" ? (
            <div className="w-full space-y-2">
              <p className="text-[11px] text-muted-foreground">{t("pos.toast.guid_hint")}</p>
              <form
                className="flex flex-col gap-2 sm:flex-row sm:items-center"
                onSubmit={(e) => {
                  e.preventDefault();
                  onConnectToast();
                }}
              >
                <Input
                  value={toastGuid}
                  onChange={(e) => onToastGuidChange(e.target.value)}
                  placeholder={t("pos.toast.guid_label_short")}
                  aria-label={t("pos.toast.guid_label_short")}
                  className={cn(settingsFieldClassName, "h-9 flex-1 font-mono text-xs")}
                />
                <Button size="sm" type="submit" disabled={!!busy || !toastGuid.trim()} className="shrink-0 rounded-lg">
                  {busy === "connect-toast" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("pos.toast.connect")}
                </Button>
              </form>
            </div>
          ) : (
            <Button size="sm" disabled={!!busy} onClick={onIssueKey} className="gap-1.5 rounded-lg">
              {busyKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
              {t("pos.hub.custom.create")}
            </Button>
          )}
        </div>
      ) : null}
    </li>
  );
}

function StatusBadge({ p }: { p: PosProviderState }) {
  const { t } = useLanguage();
  const [label, cls] = p.connected
    ? [t("pos.hub.state.connected"), "border-emerald-400/60 bg-emerald-500/10 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"]
    : p.status === "error"
      ? [t("pos.hub.state.error"), "border-red-300/80 bg-red-500/10 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"]
      : !p.available
        ? [t("pos.hub.state.pending"), "border-border bg-muted/40 text-muted-foreground"]
        : [t("pos.hub.state.ready"), "border-border bg-background text-muted-foreground"];
  return (
    <Badge variant="outline" className={cn("rounded-full px-2 py-0 text-[10px] font-semibold uppercase tracking-wide", cls)}>
      {label}
    </Badge>
  );
}

function RevealedKey({ value }: { value: string }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-2 rounded-xl border border-amber-400/40 bg-amber-500/5 p-3 text-xs dark:border-amber-700/50 dark:bg-amber-950/20">
      <p className="font-medium text-amber-950 dark:text-amber-100">{t("pos.hub.custom.copy_now")}</p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 break-all rounded-lg bg-background px-2.5 py-2 font-mono text-[11px]">{value}</code>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 rounded-lg"
          aria-label={t("pos.hub.custom.copy")}
          onClick={() => {
            void navigator.clipboard?.writeText(value).then(() => setCopied(true));
          }}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}