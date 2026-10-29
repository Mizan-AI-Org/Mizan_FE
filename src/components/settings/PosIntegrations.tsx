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
import { SettingsSection, settingsFieldClassName } from "@/components/settings/SettingsSection";
import { useLanguage } from "@/hooks/use-language";
import { API_BASE } from "@/lib/api";

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
  iso ? new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

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

  // Back from a POS sign-in page: ?pos_connected=true&provider=x or ?pos_error=reason&provider=x
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

  return (
    <SettingsSection
      id="pos-integration"
      icon={<Plug className="h-5 w-5" />}
      iconClassName="bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
      title={t("pos.title")}
      description={t("pos.hub.description")}
      actions={
        <Badge
          variant="outline"
          className={
            anyConnected
              ? "shrink-0 border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
              : "shrink-0 border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-400"
          }
        >
          {anyConnected ? t("integrations.status.fully_connected") : t("integrations.status.pos_not_configured")}
        </Badge>
      }
    >
      {query.isLoading ? (
        <div className="flex justify-center py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : query.isError ? (
        <p className="text-sm text-destructive">{t("pos.hub.load_error")}</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {providers.map((p) => (
            <li
              key={p.provider}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-background p-4 dark:border-slate-700"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{p.provider === "custom" ? t("pos.custom_api") : p.label}</p>
                  <p className="text-xs text-muted-foreground">{t(`pos.hub.blurb.${p.provider}`)}</p>
                </div>
                <StatusBadge p={p} />
              </div>

              {p.connected || p.status === "error" ? (
                <div className="space-y-1 text-xs text-muted-foreground">
                  {p.account ? <p className="truncate">{t("pos.hub.account", { account: p.account })}</p> : null}
                  {p.lastSyncAt ? (
                    <p>
                      {t("pos.hub.last_sync", {
                        when: fmtWhen(p.lastSyncAt),
                        count: String(p.lastSyncImported ?? 0),
                      })}
                    </p>
                  ) : p.auth !== "push" ? (
                    <p>{t("pos.hub.first_sync")}</p>
                  ) : null}
                  {p.lastError ? <p className="text-destructive">{p.lastError}</p> : null}
                </div>
              ) : null}

              {p.provider === "custom" && p.connected ? (
                <div className="space-y-2 rounded-lg bg-muted/50 p-3 text-xs">
                  <p className="font-medium text-foreground">{t("pos.hub.custom.endpoint")}</p>
                  <code className="block break-all font-mono">POST {p.endpoint}</code>
                  <p className="text-muted-foreground">
                    {t("pos.hub.custom.auth", { prefix: `${p.keyPrefix || "mzn_pos_"}…` })}
                  </p>
                  <pre className="overflow-x-auto whitespace-pre rounded bg-background p-2 font-mono text-[11px] leading-relaxed">
{`{"sales": [{"id": "ticket-1042-1", "item": "Tajine",
  "quantity": 2, "revenue": 240,
  "sold_at": "2026-10-27T13:05:00+01:00"}]}`}
                  </pre>
                  <p className="text-muted-foreground">{t("pos.hub.custom.rules")}</p>
                </div>
              ) : null}

              {revealedKey && p.provider === "custom" ? <RevealedKey value={revealedKey} /> : null}

              {canManage ? (
                <div className="mt-auto flex flex-wrap items-center gap-2">
                  {!p.available ? (
                    <p className="text-xs text-muted-foreground">{t("pos.hub.pending_hint", { name: p.label })}</p>
                  ) : p.connected ? (
                    <>
                      {p.auth !== "push" ? (
                        <Button size="sm" variant="outline" disabled={!!busy} onClick={() => void sync(p)} className="gap-1.5">
                          {busy === `sync-${p.provider}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                          {t("pos.hub.sync_now")}
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" disabled={!!busy} onClick={() => void issueKey()} className="gap-1.5">
                          <KeyRound className="h-3.5 w-3.5" />
                          {t("pos.hub.custom.rotate")}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => setConfirmDisconnect(p)} className="gap-1.5 text-destructive hover:text-destructive">
                        <Unplug className="h-3.5 w-3.5" />
                        {t("pos.hub.disconnect")}
                      </Button>
                    </>
                  ) : p.auth === "oauth" ? (
                    <Button size="sm" disabled={!!busy} onClick={() => void connectOauth(p)} className="gap-1.5">
                      {busy === `connect-${p.provider}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
                      {p.status === "error" ? t("pos.hub.reconnect") : t("pos.hub.connect_with", { name: p.label.split(" ")[0] })}
                    </Button>
                  ) : p.auth === "toast" ? (
                    <form
                      className="flex w-full flex-col gap-2 sm:flex-row"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void connectToast();
                      }}
                    >
                      <Input
                        value={toastGuid}
                        onChange={(e) => setToastGuid(e.target.value)}
                        placeholder={t("pos.toast.guid_label_short")}
                        aria-label={t("pos.toast.guid_label_short")}
                        className={`${settingsFieldClassName} h-9 font-mono text-xs`}
                      />
                      <Button size="sm" type="submit" disabled={!!busy || !toastGuid.trim()} className="shrink-0">
                        {busy === "connect-toast" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("pos.toast.connect")}
                      </Button>
                    </form>
                  ) : (
                    <Button size="sm" disabled={!!busy} onClick={() => void issueKey()} className="gap-1.5">
                      {busy === "key" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                      {t("pos.hub.custom.create")}
                    </Button>
                  )}
                </div>
              ) : null}
              {p.provider === "toast" && canManage && p.available && !p.connected ? (
                <p className="text-xs text-muted-foreground">{t("pos.toast.guid_hint")}</p>
              ) : null}
            </li>
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

function StatusBadge({ p }: { p: PosProviderState }) {
  const { t } = useLanguage();
  const [label, cls] = p.connected
    ? [t("pos.hub.state.connected"), "border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"]
    : p.status === "error"
      ? [t("pos.hub.state.error"), "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"]
      : !p.available
        ? [t("pos.hub.state.pending"), "border-slate-300 text-slate-500 dark:border-slate-600 dark:text-slate-400"]
        : [t("pos.hub.state.ready"), "border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-300"];
  return (
    <Badge variant="outline" className={`shrink-0 ${cls}`}>
      {label}
    </Badge>
  );
}

function RevealedKey({ value }: { value: string }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs dark:border-amber-700 dark:bg-amber-950/30">
      <p className="font-medium text-amber-900 dark:text-amber-200">{t("pos.hub.custom.copy_now")}</p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 break-all rounded bg-background px-2 py-1.5 font-mono">{value}</code>
        <Button
          size="sm"
          variant="outline"
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
