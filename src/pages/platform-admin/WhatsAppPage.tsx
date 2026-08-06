import React, { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  MessageSquare,
  RefreshCw,
  Settings2,
  Trash2,
  Unlink,
  Zap,
} from "lucide-react";
import {
  platformApi,
  type PlatformWhatsAppTemplate,
} from "@/lib/platformApi";
import {
  opsBtnGhost,
  opsBtnPrimary,
  opsCard,
  opsInput,
  opsMuted,
  opsPage,
  opsSubtitle,
  opsTitle,
  opsBadgeOk,
  opsBadgeDanger,
  opsBadgeViolet,
} from "@/components/platform-admin/opsStyles";
import { cn } from "@/lib/utils";

type Tab = "config" | "templates";

const SETUP_STEPS = [
  {
    title: "Create a Meta App",
    body: "In Meta for Developers, create a Business app and add your business portfolio.",
  },
  {
    title: "Add WhatsApp Product",
    body: "Enable WhatsApp in the app, connect your Business Account, and register the central Mizan number (+212784476751).",
  },
  {
    title: "Get API Credentials",
    body: "Copy Phone Number ID, WhatsApp Business Account ID, and a permanent System User access token with whatsapp_business_messaging permissions.",
  },
  {
    title: "Configure Webhooks",
    body: "Paste the Callback URL below into Meta → WhatsApp → Configuration. Use the same Verify Token you save here. Subscribe to messages.",
  },
];

function statusBadge(status: string) {
  const s = status.toUpperCase();
  if (s === "APPROVED") return opsBadgeOk;
  if (s === "REJECTED" || s === "DISABLED") return opsBadgeDanger;
  return opsBadgeViolet;
}

export default function WhatsAppPage() {
  const [tab, setTab] = useState<Tab>("config");
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    phone_number_id: "",
    business_account_id: "",
    access_token: "",
    verify_token: "",
    activation_phone: "",
    api_version: "v22.0",
    miya_whatsapp_enabled: true,
    miya_voice_default: false,
    miya_voice_label: "Sarah",
    miya_fish_reference_id: "",
    miya_fish_model: "s2.1-pro",
    miya_voice_speed: 1.05,
    miya_openai_fallback_voice: "shimmer",
  });
  const [voicePreviewLoading, setVoicePreviewLoading] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    language: "en_US",
    category: "UTILITY",
    body_text: "",
    footer_text: "",
  });
  const [showNewTemplate, setShowNewTemplate] = useState(false);

  const queryClient = useQueryClient();

  const configQuery = useQuery({
    queryKey: ["platform-whatsapp-config"],
    queryFn: () => platformApi.whatsappConfig(),
  });

  useEffect(() => {
    const c = configQuery.data;
    if (!c) return;
    setForm((prev) => ({
      ...prev,
      phone_number_id: c.phone_number_id || "",
      business_account_id: c.business_account_id || "",
      verify_token: c.verify_token || "",
      activation_phone: c.activation_phone || "",
      api_version: c.api_version || "v22.0",
      miya_whatsapp_enabled: c.miya_whatsapp_enabled,
      miya_voice_default: c.miya_voice_default,
      miya_voice_label: c.miya_voice_label || "Sarah",
      miya_fish_reference_id: c.miya_fish_reference_id || "",
      miya_fish_model: c.miya_fish_model || "s2.1-pro",
      miya_voice_speed: c.miya_voice_speed ?? 1.05,
      miya_openai_fallback_voice: c.miya_openai_fallback_voice || "shimmer",
      access_token: "",
    }));
  }, [configQuery.data]);

  const templatesQuery = useQuery({
    queryKey: ["platform-whatsapp-templates"],
    queryFn: () => platformApi.whatsappTemplates(),
    enabled: tab === "templates",
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      platformApi.saveWhatsAppConfig({
        phone_number_id: form.phone_number_id,
        business_account_id: form.business_account_id,
        verify_token: form.verify_token,
        activation_phone: form.activation_phone,
        api_version: form.api_version,
        miya_whatsapp_enabled: form.miya_whatsapp_enabled,
        miya_voice_default: form.miya_voice_default,
        miya_voice_label: form.miya_voice_label,
        miya_fish_reference_id: form.miya_fish_reference_id,
        miya_fish_model: form.miya_fish_model,
        miya_voice_speed: form.miya_voice_speed,
        miya_openai_fallback_voice: form.miya_openai_fallback_voice,
        ...(form.access_token.trim() ? { access_token: form.access_token.trim() } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-whatsapp-config"] });
      setForm((f) => ({ ...f, access_token: "" }));
    },
  });

  const testMutation = useMutation({
    mutationFn: () =>
      platformApi.testWhatsAppConnection({
        phone_number_id: form.phone_number_id.trim(),
        business_account_id: form.business_account_id.trim(),
        activation_phone: form.activation_phone.trim(),
        api_version: form.api_version.trim(),
        ...(form.access_token.trim() ? { access_token: form.access_token.trim() } : {}),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["platform-whatsapp-config"] });
      if (data?.auto_corrected && data.phone_number_id) {
        setForm((f) => ({
          ...f,
          phone_number_id: data.phone_number_id || f.phone_number_id,
          business_account_id:
            data.suggested_business_account_id || f.business_account_id,
        }));
      }
    },
  });

  const applySuggestedIds = useCallback(
    (phoneNumberId: string, businessAccountId?: string) => {
      setForm((f) => ({
        ...f,
        phone_number_id: phoneNumberId,
        business_account_id: businessAccountId || f.business_account_id,
      }));
    },
    [],
  );

  const syncMutation = useMutation({
    mutationFn: () => platformApi.syncWhatsAppTemplates(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-whatsapp-templates"] });
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: () => platformApi.createWhatsAppTemplate(newTemplate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-whatsapp-templates"] });
      setShowNewTemplate(false);
      setNewTemplate({
        name: "",
        language: "en_US",
        category: "UTILITY",
        body_text: "",
        footer_text: "",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => platformApi.deleteWhatsAppTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-whatsapp-templates"] });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => platformApi.disconnectWhatsApp(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-whatsapp-config"] });
      queryClient.invalidateQueries({ queryKey: ["platform-whatsapp-templates"] });
      setForm({
        phone_number_id: "",
        business_account_id: "",
        access_token: "",
        verify_token: "",
        activation_phone: "212784476751",
        api_version: "v22.0",
        miya_whatsapp_enabled: true,
        miya_voice_default: false,
      });
      testMutation.reset();
    },
  });

  const config = configQuery.data;
  const connected = config?.connected || config?.last_probe_ok;
  const canDisconnect =
    Boolean(config?.connected || config?.access_token_set || config?.phone_number_id) &&
    !config?.disconnected;

  const copyWebhook = useCallback(async () => {
    const url = config?.webhook_callback_url;
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [config?.webhook_callback_url]);

  if (configQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#00C853]" />
      </div>
    );
  }

  if (configQuery.error) {
    return (
      <div className="p-8 text-rose-600 dark:text-rose-400">
        {(configQuery.error as Error).message || "Failed to load WhatsApp config"}
      </div>
    );
  }

  return (
    <div className={`${opsPage} max-w-6xl`}>
      <header>
        <h2 className={opsTitle}>WhatsApp & Miya</h2>
        <p className={opsSubtitle}>
          Connect the central Mizan WhatsApp number to Meta and Miya for staff CRUD over chat.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("config")}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
            tab === "config"
              ? "bg-emerald-500 text-slate-950"
              : "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800",
          )}
        >
          <Settings2 className="h-4 w-4" />
          WhatsApp Config
        </button>
        <button
          type="button"
          onClick={() => setTab("templates")}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
            tab === "templates"
              ? "bg-emerald-500 text-slate-950"
              : "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800",
          )}
        >
          <MessageSquare className="h-4 w-4" />
          Templates
        </button>
      </div>

      {tab === "config" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <div
              className={cn(
                opsCard,
                "flex items-start gap-3 p-4",
                connected
                  ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20"
                  : "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20",
              )}
            >
              {connected ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              )}
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {connected ? "Connected" : "Not Connected"}
                </p>
                <p className={opsMuted}>
                  {connected
                    ? `Meta verified ${config?.display_phone_number || config?.verified_name || "phone number"}. Miya routes inbound messages for CRUD.`
                    : config?.disconnected
                      ? "WhatsApp is disconnected. Miya will not send or receive WhatsApp messages until you connect again."
                      : "Save Meta API credentials and run Test Connection to link the central number to Miya."}
                </p>
                {config?.last_probe_message && !connected && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{config.last_probe_message}</p>
                )}
                {testMutation.data?.fix_steps && !connected && (
                  <ol className="mt-3 list-decimal space-y-1 pl-4 text-xs text-slate-600 dark:text-slate-300">
                    {testMutation.data.fix_steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                )}
                {testMutation.data?.available_phone_numbers &&
                  testMutation.data.available_phone_numbers.length > 0 &&
                  !connected && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        Numbers this token can access:
                      </p>
                      {testMutation.data.available_phone_numbers.map((phone) => (
                        <div
                          key={phone.phone_number_id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2"
                        >
                          <div className="text-xs text-slate-600 dark:text-slate-300">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {phone.display_phone_number || phone.verified_name || "WhatsApp number"}
                            </span>
                            <span className="block font-mono text-[11px] text-slate-500">
                              Phone ID {phone.phone_number_id}
                            </span>
                          </div>
                          <button
                            type="button"
                            className={opsBtnGhost}
                            onClick={() =>
                              applySuggestedIds(
                                phone.phone_number_id,
                                phone.business_account_id,
                              )
                            }
                          >
                            Use this ID
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            </div>

            <section className={`${opsCard} p-6 space-y-4`}>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                API Credentials
              </h3>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Phone Number ID</span>
                <input
                  className={`${opsInput} w-full`}
                  value={form.phone_number_id}
                  onChange={(e) => setForm((f) => ({ ...f, phone_number_id: e.target.value }))}
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  WhatsApp Business Account ID
                </span>
                <input
                  className={`${opsInput} w-full`}
                  value={form.business_account_id}
                  onChange={(e) => setForm((f) => ({ ...f, business_account_id: e.target.value }))}
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Permanent Access Token
                </span>
                <div className="relative">
                  <input
                    type={showToken ? "text" : "password"}
                    className={`${opsInput} w-full pr-10`}
                    value={form.access_token}
                    onChange={(e) => setForm((f) => ({ ...f, access_token: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowToken((v) => !v)}
                    aria-label={showToken ? "Hide token" : "Show token"}
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {config?.access_token_set && (
                  <p className={opsMuted}>
                    Saved ({config.access_token_masked}). Leave blank to keep the current token.
                  </p>
                )}
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Webhook Verify Token</span>
                <input
                  className={`${opsInput} w-full`}
                  value={form.verify_token}
                  onChange={(e) => setForm((f) => ({ ...f, verify_token: e.target.value }))}
                />
                <p className={opsMuted}>
                  Must match the verify token in Meta webhook settings.
                </p>
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Activation phone (digits only)
                </span>
                <input
                  className={`${opsInput} w-full`}
                  value={form.activation_phone}
                  onChange={(e) => setForm((f) => ({ ...f, activation_phone: e.target.value }))}
                />
                <p className={opsMuted}>Staff wa.me link - not the Meta Phone Number ID.</p>
              </label>

              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={form.miya_whatsapp_enabled}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, miya_whatsapp_enabled: e.target.checked }))
                    }
                    className="rounded border-slate-300"
                  />
                  Miya WhatsApp enabled
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={form.miya_voice_default}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, miya_voice_default: e.target.checked }))
                    }
                    className="rounded border-slate-300"
                  />
                  Default Fish Audio voice replies
                </label>
              </div>
            </section>

            <section className={`${opsCard} p-6 space-y-4`}>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Miya voice identity
              </h3>
              <p className={opsMuted}>
                Young female voice (Fish Audio Sarah by default). Cross-lingual on s2.1-pro — speaks
                English, French, Arabic, and Darija from the reply text. Env vars override when fields
                are empty.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Voice label</span>
                  <input
                    className={`${opsInput} w-full`}
                    value={form.miya_voice_label}
                    onChange={(e) => setForm((f) => ({ ...f, miya_voice_label: e.target.value }))}
                    placeholder="Sarah"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Fish Audio model</span>
                  <input
                    className={`${opsInput} w-full font-mono text-xs`}
                    value={form.miya_fish_model}
                    onChange={(e) => setForm((f) => ({ ...f, miya_fish_model: e.target.value }))}
                    placeholder="s2.1-pro"
                  />
                </label>
                <label className="block space-y-1.5 sm:col-span-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Fish Audio reference ID
                  </span>
                  <input
                    className={`${opsInput} w-full font-mono text-xs`}
                    value={form.miya_fish_reference_id}
                    onChange={(e) => setForm((f) => ({ ...f, miya_fish_reference_id: e.target.value }))}
                    placeholder="933563129e564b19a115bedd57b7406a"
                  />
                  <p className={opsMuted}>
                    Browse voices at fish.audio/discover. Provider: {config?.miya_voice_provider || "—"}
                  </p>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Speaking speed ({form.miya_voice_speed.toFixed(2)}×)
                  </span>
                  <input
                    type="range"
                    min={0.85}
                    max={1.25}
                    step={0.01}
                    value={form.miya_voice_speed}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, miya_voice_speed: parseFloat(e.target.value) }))
                    }
                    className="w-full"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    OpenAI fallback voice
                  </span>
                  <select
                    className={`${opsInput} w-full`}
                    value={form.miya_openai_fallback_voice}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, miya_openai_fallback_voice: e.target.value }))
                    }
                  >
                    <option value="shimmer">shimmer (warm female)</option>
                    <option value="nova">nova (friendly female)</option>
                    <option value="coral">coral (clear female)</option>
                    <option value="sage">sage (calm female)</option>
                  </select>
                </label>
              </div>
              <button
                type="button"
                className={opsBtnGhost}
                disabled={voicePreviewLoading}
                onClick={async () => {
                  setVoicePreviewLoading(true);
                  try {
                    await saveMutation.mutateAsync();
                    const res = await platformApi.previewMiyaVoice(
                      "Hello, I'm Miya — your AI operations companion.",
                    );
                    if (res.base64) {
                      const audio = new Audio(`data:${res.mime_type};base64,${res.base64}`);
                      await audio.play();
                    }
                  } catch {
                    /* toast optional */
                  } finally {
                    setVoicePreviewLoading(false);
                  }
                }}
              >
                {voicePreviewLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageSquare className="h-4 w-4" />
                )}
                Preview Miya voice
              </button>
            </section>

            <section className={`${opsCard} p-6 space-y-3`}>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Webhook Configuration
              </h3>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Webhook Callback URL</span>
                <div className="flex gap-2">
                  <input
                    readOnly
                    className={`${opsInput} w-full font-mono text-xs`}
                    value={config?.webhook_callback_url || ""}
                  />
                  <button type="button" className={opsBtnGhost} onClick={copyWebhook} title="Copy URL">
                    <Copy className="h-4 w-4" />
                    {copied ? "Copied" : ""}
                  </button>
                </div>
              </label>
            </section>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className={opsBtnPrimary}
                disabled={saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save Configuration
              </button>
              <button
                type="button"
                className={opsBtnGhost}
                disabled={testMutation.isPending}
                onClick={async () => {
                  try {
                    await saveMutation.mutateAsync();
                  } catch {
                    return;
                  }
                  testMutation.mutate();
                }}
              >
                {testMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                Test API Connection
              </button>
              {canDisconnect && (
                <button
                  type="button"
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-900 px-4 text-sm font-medium text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50"
                  disabled={disconnectMutation.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Disconnect WhatsApp? This clears saved Meta credentials, disables Miya on WhatsApp, and removes cached templates.",
                      )
                    ) {
                      disconnectMutation.mutate();
                    }
                  }}
                >
                  {disconnectMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Unlink className="h-4 w-4" />
                  )}
                  Disconnect
                </button>
              )}
            </div>

            {disconnectMutation.error && (
              <p className="text-sm text-rose-600 dark:text-rose-400">
                {(disconnectMutation.error as Error).message}
              </p>
            )}

            {(saveMutation.error || (testMutation.data && !testMutation.data.ok && testMutation.data.message)) && (
              <p className="text-sm text-rose-600 dark:text-rose-400">
                {saveMutation.error
                  ? (saveMutation.error as Error).message
                  : testMutation.data?.message || "Connection test failed"}
              </p>
            )}
            {testMutation.data?.ok && testMutation.data.message && (
              <p className="text-sm text-emerald-700 dark:text-emerald-400">{testMutation.data.message}</p>
            )}
          </div>

          <aside className={`${opsCard} p-5 h-fit space-y-3`}>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Setup Instructions</h3>
            {SETUP_STEPS.map((step, i) => (
              <details key={step.title} className="group border-b border-slate-100 dark:border-slate-800 pb-3 last:border-0">
                <summary className="cursor-pointer text-sm font-semibold text-slate-800 dark:text-slate-200 list-none flex justify-between">
                  <span>
                    {i + 1}. {step.title}
                  </span>
                </summary>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{step.body}</p>
              </details>
            ))}
            <a
              href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              Meta WhatsApp API Documentation
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </aside>
        </div>
      )}

      {tab === "templates" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Message Templates</h3>
              <p className={opsSubtitle}>
                Sync approved templates from Meta. Miya uses these for outbound messages outside the 24h window.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={opsBtnGhost}
                disabled={syncMutation.isPending}
                onClick={() => syncMutation.mutate()}
              >
                {syncMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Sync from Meta
              </button>
              <button type="button" className={opsBtnPrimary} onClick={() => setShowNewTemplate(true)}>
                + New Template
              </button>
            </div>
          </div>

          {syncMutation.error && (
            <p className="text-sm text-rose-600 dark:text-rose-400">
              {(syncMutation.error as Error).message}
            </p>
          )}

          {showNewTemplate && (
            <div className={`${opsCard} p-6 space-y-4`}>
              <h4 className="font-semibold text-slate-900 dark:text-white">Create template (submitted to Meta)</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium">Name</span>
                  <input
                    className={`${opsInput} w-full`}
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate((t) => ({ ...t, name: e.target.value }))}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium">Language</span>
                  <input
                    className={`${opsInput} w-full`}
                    value={newTemplate.language}
                    onChange={(e) => setNewTemplate((t) => ({ ...t, language: e.target.value }))}
                  />
                </label>
                <label className="block space-y-1.5 sm:col-span-2">
                  <span className="text-sm font-medium">Category</span>
                  <select
                    className={`${opsInput} w-full`}
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate((t) => ({ ...t, category: e.target.value }))}
                  >
                    <option value="UTILITY">Utility</option>
                    <option value="MARKETING">Marketing</option>
                    <option value="AUTHENTICATION">Authentication</option>
                  </select>
                </label>
                <label className="block space-y-1.5 sm:col-span-2">
                  <span className="text-sm font-medium">Body</span>
                  <textarea
                    className={`${opsInput} w-full min-h-[80px] py-2`}
                    value={newTemplate.body_text}
                    onChange={(e) => setNewTemplate((t) => ({ ...t, body_text: e.target.value }))}
                  />
                </label>
                <label className="block space-y-1.5 sm:col-span-2">
                  <span className="text-sm font-medium">Footer (optional)</span>
                  <input
                    className={`${opsInput} w-full`}
                    value={newTemplate.footer_text}
                    onChange={(e) => setNewTemplate((t) => ({ ...t, footer_text: e.target.value }))}
                  />
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={opsBtnPrimary}
                  disabled={createTemplateMutation.isPending}
                  onClick={() => createTemplateMutation.mutate()}
                >
                  Submit to Meta
                </button>
                <button type="button" className={opsBtnGhost} onClick={() => setShowNewTemplate(false)}>
                  Cancel
                </button>
              </div>
              {createTemplateMutation.error && (
                <p className="text-sm text-rose-600 dark:text-rose-400">
                  {(createTemplateMutation.error as Error).message}
                </p>
              )}
            </div>
          )}

          {templatesQuery.isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#00C853]" />
            </div>
          ) : (
            <div className="space-y-3">
              {(templatesQuery.data?.results || []).length === 0 ? (
                <div className={`${opsCard} p-8 text-center ${opsMuted}`}>
                  No templates cached yet. Save WhatsApp config, then click Sync from Meta.
                </div>
              ) : (
                templatesQuery.data?.results.map((t: PlatformWhatsAppTemplate) => (
                  <article key={t.id} className={`${opsCard} p-5 space-y-3`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <code className="text-sm font-bold text-slate-900 dark:text-white">{t.name}</code>
                        <div className="flex flex-wrap gap-2">
                          {t.category && (
                            <span className={opsBadgeViolet}>{t.category}</span>
                          )}
                          {t.status && (
                            <span className={statusBadge(t.status)}>{t.status}</span>
                          )}
                          <span className="text-xs text-slate-500 dark:text-slate-400">{t.language}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="text-slate-400 hover:text-rose-500 p-1"
                        title="Delete from Meta"
                        disabled={deleteTemplateMutation.isPending}
                        onClick={() => {
                          if (window.confirm(`Delete template "${t.name}" from Meta?`)) {
                            deleteTemplateMutation.mutate(t.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {t.body_text && (
                      <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{t.body_text}</p>
                    )}
                    {t.footer_text && (
                      <p className="text-xs italic text-slate-500 dark:text-slate-400">{t.footer_text}</p>
                    )}
                  </article>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
