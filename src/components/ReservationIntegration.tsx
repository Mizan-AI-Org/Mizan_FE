import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type EatNowDiscoverRestaurantRow = { group_id?: string; restaurants?: { id: string }[] };
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Globe2, Link as LinkIcon, Loader2, Plug, ListOrdered, Copy } from "lucide-react";
import { toast } from "sonner";
import { API_BASE, api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type ReservationProvider = "NONE" | "EATAPP" | "OPENTABLE" | "THEFORK" | "SEVENROOMS" | "CUSTOM";

export default function ReservationIntegration() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [provider, setProvider] = useState<ReservationProvider>("NONE");
  const [widgetUrl, setWidgetUrl] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [eatnowApiKey, setEatnowApiKey] = useState("");
  const [eatnowGroupId, setEatnowGroupId] = useState("");
  const [eatnowRestaurantId, setEatnowRestaurantId] = useState("");
  const [eatnowApiBase, setEatnowApiBase] = useState("");
  const [apiKeySet, setApiKeySet] = useState(false);
  const [schemaVersion, setSchemaVersion] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [testing, setTesting] = useState(false);
  const [discoverJson, setDiscoverJson] = useState<string | null>(null);
  const [eatnowWebhookUrl, setEatnowWebhookUrl] = useState("");
  const [eatnowWebhookSecret, setEatnowWebhookSecret] = useState("");
  const [webhookSecretSet, setWebhookSecretSet] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    try {
      const r = await fetch(`${API_BASE}/settings/unified/`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });
      if (!r.ok) {
        setLoading(false);
        return;
      }
      const data = await r.json();
      setProvider((data.reservation_provider as ReservationProvider) || "NONE");
      setWidgetUrl(data.reservation_widget_url || "");
      setDisplayName(data.reservation_display_name || "");
      setEatnowGroupId(data.eatnow_group_id || "");
      setEatnowRestaurantId(data.eatnow_restaurant_id || "");
      setEatnowApiBase(data.eatnow_api_base || "");
      setApiKeySet(!!data.eatnow_api_key_set);
      const whRaw =
        typeof data.eatnow_webhook_url === "string" && data.eatnow_webhook_url.trim()
          ? data.eatnow_webhook_url.trim()
          : `${API_BASE.replace(/\/$/, "")}/webhooks/eatnow/`;
      setEatnowWebhookUrl(whRaw);
      setWebhookSecretSet(!!data.eatnow_webhook_secret_set);
      setEatnowWebhookSecret("");
      setSchemaVersion(
        typeof data.settings_schema_version === "number" ? data.settings_schema_version : null
      );
    } catch {
      toast.error("Could not load reservation settings");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!accessToken || schemaVersion === null) {
      toast.error("Settings not loaded yet");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        settings_schema_version: schemaVersion,
        reservation_provider: provider,
        reservation_widget_url: widgetUrl,
        reservation_display_name: displayName,
        eatnow_group_id: eatnowGroupId,
        eatnow_restaurant_id: eatnowRestaurantId,
        eatnow_api_base: eatnowApiBase,
      };
      if (eatnowApiKey.trim()) {
        body.eatnow_api_key = eatnowApiKey.trim();
      }
      if (eatnowWebhookSecret.trim()) {
        body.eatnow_webhook_secret = eatnowWebhookSecret.trim();
      }
      const r = await fetch(`${API_BASE}/settings/unified/`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) {
        toast.error(data.detail || data.error || "Save failed");
        return;
      }
      toast.success("Reservation settings saved");
      setEatnowApiKey("");
      setEatnowWebhookSecret("");
      setApiKeySet(!!data.eatnow_api_key_set || !!(eatnowApiKey && eatnowApiKey.trim()));
      setWebhookSecretSet(!!data.eatnow_webhook_secret_set || !!(eatnowWebhookSecret && eatnowWebhookSecret.trim()));
      if (typeof data.eatnow_webhook_url === "string" && data.eatnow_webhook_url.trim()) {
        setEatnowWebhookUrl(data.eatnow_webhook_url.trim());
      }
      setSchemaVersion(
        typeof data.settings_schema_version === "number" ? data.settings_schema_version : schemaVersion
      );
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscover = async () => {
    if (!accessToken) return;
    setDiscovering(true);
    setDiscoverJson(null);
    try {
      const out = await api.postEatNowDiscover(accessToken, {
        api_key: eatnowApiKey.trim() || undefined,
        eatnow_api_base: eatnowApiBase.trim() || undefined,
      });
      setDiscoverJson(JSON.stringify(out, null, 2));
      const rb = out.restaurants_by_group as EatNowDiscoverRestaurantRow[] | undefined;
      if (out.success && out.groups?.length === 1 && rb?.[0]?.restaurants?.length === 1) {
        const g = out.groups[0];
        const rest = rb[0].restaurants?.[0];
        if (g?.id) setEatnowGroupId(g.id);
        if (rest?.id) setEatnowRestaurantId(rest.id);
        toast.success("Filled Group and Restaurant ID from your account.");
      } else {
        toast.info("Copy Restaurant ID from the JSON below if needed.");
      }
    } catch (e) {
      toast.error((e as Error).message || "Discover failed");
    } finally {
      setDiscovering(false);
    }
  };

  const handleTest = async () => {
    if (!accessToken) return;
    setTesting(true);
    try {
      const out = await api.postEatNowTest(accessToken, {
        api_key: eatnowApiKey.trim() || undefined,
        eatnow_restaurant_id: eatnowRestaurantId.trim() || undefined,
        eatnow_api_base: eatnowApiBase.trim() || undefined,
      });
      toast.success(out.message || `Connected (${out.sample_count ?? 0} today)`);
    } catch (e) {
      toast.error((e as Error).message || "Test failed");
    } finally {
      setTesting(false);
    }
  };

  const handleTestLink = () => {
    if (!widgetUrl) return;
    try {
      const url = new URL(widgetUrl);
      window.open(url.toString(), "_blank", "noopener,noreferrer");
    } catch {
      window.open(widgetUrl, "_blank", "noopener,noreferrer");
    }
  };

  const hasWidget = provider !== "NONE" && widgetUrl.trim().length > 0;
  /** Webhook path: restaurant ID + signing secret (same as in Eat Now webhook settings). */
  const eatnowWebhookReady =
    provider === "EATAPP" &&
    eatnowRestaurantId.trim().length > 0 &&
    (webhookSecretSet || eatnowWebhookSecret.trim().length > 0);
  const canViewReservations = provider === "EATAPP" && eatnowRestaurantId.trim().length > 0;

  if (loading) {
    return (
      <Card className="shadow-soft">
        <CardContent className="py-10 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe2 className="w-5 h-5 text-emerald-500" />
          Reservation Booking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="reservation-provider" className="text-sm font-medium">
            Reservation provider
          </Label>
          <select
            id="reservation-provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value as ReservationProvider)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 rounded-md text-sm"
          >
            <option value="NONE">Not configured</option>
            <option value="EATAPP">Eat App (Eat Now)</option>
            <option value="OPENTABLE" disabled>
              OpenTable (soon)
            </option>
            <option value="THEFORK" disabled>
              TheFork (soon)
            </option>
            <option value="SEVENROOMS" disabled>
              SevenRooms (soon)
            </option>
            <option value="CUSTOM">Custom booking widget</option>
          </select>
        </div>

        <Separator />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="reservation-display-name" className="text-sm font-medium">
                Display name
              </Label>
              <Input
                id="reservation-display-name"
                placeholder="e.g. Book a table"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Shown on buttons or links where you promote reservations.</p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="reservation-widget-url" className="text-sm font-medium">
                Booking widget URL
              </Label>
              <Input
                id="reservation-widget-url"
                placeholder="https://..."
                value={widgetUrl}
                onChange={(e) => setWidgetUrl(e.target.value)}
              />
            </div>

            {provider === "EATAPP" && (
              <div className="rounded-xl border border-slate-200/90 dark:border-slate-700/90 bg-white dark:bg-slate-950/30 p-4 sm:p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Plug className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden />
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">
                      Eat Now webhooks
                    </h3>
                  </div>
                  <a
                    href="https://docs.eat-now.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline shrink-0"
                  >
                    Docs ↗
                  </a>
                </div>

                <p className="text-xs text-muted-foreground leading-snug">
                  In Eat Now: <strong className="font-medium text-slate-700 dark:text-slate-300">Integrations → Webhooks</strong>
                  . Paste the URL below as destination, enable reservation events, and enter the same signing secret here.
                </p>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="eatnow-restaurant" className="text-xs font-medium">
                      Restaurant ID <span className="text-red-600 dark:text-red-400">*</span>
                    </Label>
                    <Input
                      id="eatnow-restaurant"
                      value={eatnowRestaurantId}
                      onChange={(e) => setEatnowRestaurantId(e.target.value)}
                      className="h-9"
                      placeholder="Usually the slug from Eat Now → Settings → Restaurant"
                    />
                    <details className="group text-xs text-muted-foreground">
                      <summary className="cursor-pointer list-none flex items-center gap-1.5 text-emerald-700/90 dark:text-emerald-400/95 hover:underline [&::-webkit-details-marker]:hidden">
                        <span className="inline-block w-1 h-1 rounded-full bg-current opacity-70" aria-hidden />
                        Where to find the restaurant ID
                      </summary>
                      <ul className="mt-2 ml-1.5 space-y-1.5 pl-3 border-l border-slate-200 dark:border-slate-700 text-[11px] leading-relaxed">
                        <li>
                          <span className="text-slate-600 dark:text-slate-400">Most often:</span> Eat Now{" "}
                          <strong className="font-medium text-slate-700 dark:text-slate-300">Settings → Restaurant → Slug</strong>{" "}
                          (e.g. <code className="text-[10px] px-0.5 rounded bg-slate-100 dark:bg-slate-800">barometre-marrakech</code>).
                        </li>
                        <li>
                          Or <strong className="font-medium">Integrations → API Keys</strong> if a venue id is shown.
                        </li>
                        <li>
                          Exact value: <code className="text-[10px] px-0.5 rounded bg-slate-100 dark:bg-slate-800">restaurant_id</code> in a
                          webhook test payload (Eat Now <strong className="font-medium">Test</strong> or delivery log).
                        </li>
                      </ul>
                    </details>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Webhook URL</Label>
                    <div className="flex gap-2">
                      <Input readOnly value={eatnowWebhookUrl} className="font-mono text-[11px] h-9 bg-slate-50/80 dark:bg-slate-900/50" />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="shrink-0 h-9 w-9"
                        onClick={() => {
                          void navigator.clipboard.writeText(eatnowWebhookUrl);
                          toast.success("Copied");
                        }}
                        aria-label="Copy webhook URL"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="eatnow-webhook-secret" className="text-xs font-medium">
                      Signing secret
                      {webhookSecretSet ? (
                        <span className="font-normal text-muted-foreground"> — leave blank to keep saved</span>
                      ) : null}
                    </Label>
                    <Input
                      id="eatnow-webhook-secret"
                      type="password"
                      autoComplete="off"
                      placeholder={webhookSecretSet ? "••••••••" : "Same secret as in Eat Now webhook settings"}
                      value={eatnowWebhookSecret}
                      onChange={(e) => setEatnowWebhookSecret(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>

                <details className="rounded-lg border border-slate-200/80 dark:border-slate-700/80 px-3 py-2.5 text-xs">
                  <summary className="cursor-pointer font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200">
                    Optional: Concierge API (legacy)
                  </summary>
                  <div className="pt-3 space-y-3 border-t border-slate-100 dark:border-slate-800 mt-2">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Partner API at <code className="text-[10px]">api.eatapp.co</code> — discover / test only; Mizan
                      listing uses webhooks.
                    </p>
                    <div className="space-y-1">
                      <Label htmlFor="eatnow-api-base">API base URL (optional)</Label>
                      <Input
                        id="eatnow-api-base"
                        placeholder="https://api.eatapp.co"
                        value={eatnowApiBase}
                        onChange={(e) => setEatnowApiBase(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="eatnow-api-key">API key {apiKeySet ? "(leave blank to keep saved)" : ""}</Label>
                      <Input
                        id="eatnow-api-key"
                        type="password"
                        autoComplete="off"
                        placeholder={apiKeySet ? "••••••••" : "en_prod_…"}
                        value={eatnowApiKey}
                        onChange={(e) => setEatnowApiKey(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="eatnow-group">Group ID (optional)</Label>
                      <Input
                        id="eatnow-group"
                        value={eatnowGroupId}
                        onChange={(e) => setEatnowGroupId(e.target.value)}
                        placeholder="From Discover"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" size="sm" onClick={handleDiscover} disabled={discovering}>
                        {discovering ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Load groups & restaurants
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={handleTest} disabled={testing}>
                        {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Test Concierge API
                      </Button>
                    </div>
                    {discoverJson && (
                      <pre className="text-[11px] bg-muted p-2 rounded-md max-h-40 overflow-auto whitespace-pre-wrap">
                        {discoverJson}
                      </pre>
                    )}
                  </div>
                </details>

                <Button
                  type="button"
                  variant="default"
                  className="w-full"
                  onClick={() => navigate("/dashboard/reservations")}
                  disabled={!canViewReservations}
                >
                  <ListOrdered className="h-4 w-4 mr-2" />
                  View all reservations
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Plug className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium">Connection status</span>
              </div>
              <Badge
                variant="outline"
                className={
                  provider === "EATAPP" && eatnowWebhookReady
                    ? "border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300"
                    : hasWidget || (provider === "EATAPP" && (apiKeySet || eatnowRestaurantId.trim()))
                      ? "border-amber-200 text-amber-800"
                      : ""
                }
              >
                {provider === "EATAPP" && eatnowWebhookReady
                  ? "Webhooks ready"
                  : provider === "NONE"
                    ? "Not configured"
                    : "Partial"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-snug">
              {provider === "EATAPP" ? (
                <>
                  Save URL + secret, then use <strong className="font-medium text-slate-700 dark:text-slate-300">Save configuration</strong>.{" "}
                  <span className="text-muted-foreground/90">Promote bookings with the widget link below when set.</span>
                </>
              ) : (
                <>
                  Use the booking link on your site, QR codes, or menu to send guests to your reservation flow.
                </>
              )}
            </p>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving || schemaVersion === null} className="flex-1">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Globe2 className="w-4 h-4 mr-2" />
                    Save configuration
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" disabled={!widgetUrl} onClick={handleTestLink} className="flex-1">
                <LinkIcon className="w-4 h-4 mr-2" />
                Open booking link
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
