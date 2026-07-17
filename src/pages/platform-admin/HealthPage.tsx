import React from "react";
import { useQuery } from "@tanstack/react-query";
import { platformApi, type PlatformHealthItem } from "@/lib/platformApi";
import { Loader2, CheckCircle2, AlertTriangle, RefreshCw, Info } from "lucide-react";
import {
  opsBtnGhost,
  opsCard,
  opsMuted,
  opsPage,
  opsSubtitle,
  opsTitle,
} from "@/components/platform-admin/opsStyles";

/** Fallback labels if an older API response only has `checks`. */
const LEGACY_LABELS: Record<string, string> = {
  stripe_configured: "Stripe (optional)",
  whatsapp_access_token: "WhatsApp access token",
  whatsapp_phone_number_id: "WhatsApp phone number ID",
  whatsapp_activation_wa_phone: "WhatsApp activation number",
  lua_whatsapp_webhook: "Lua WhatsApp webhook",
  redis: "Redis / cache",
};

function kindBadge(item: PlatformHealthItem) {
  if (item.kind === "optional" || item.required === false) return "Optional";
  if (item.kind === "runtime") return "Runtime";
  return "Config";
}

export default function HealthPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["platform-health"],
    queryFn: () => platformApi.health(),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#00C853]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-rose-600 dark:text-rose-400">
        {(error as Error)?.message || "Failed to load health"}
      </div>
    );
  }

  const items: PlatformHealthItem[] =
    data.items && data.items.length > 0
      ? data.items
      : Object.entries(data.checks || {}).map(([id, ok]) => ({
          id,
          label: LEGACY_LABELS[id] || id.replace(/_/g, " "),
          ok,
          kind: id === "stripe_configured" ? "optional" : id === "redis" ? "runtime" : "config",
          required: id !== "stripe_configured",
          message: ok ? "OK" : "Not configured or failing",
        }));

  const requiredItems = items.filter((i) => i.required !== false && i.kind !== "optional");
  const optionalItems = items.filter((i) => i.required === false || i.kind === "optional");
  const failed = requiredItems.filter((i) => !i.ok);
  const healthy = data.ok;

  return (
    <div className={`${opsPage} max-w-3xl`}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className={opsTitle}>System health</h2>
          <p className={opsSubtitle}>
            Platform-wide messaging and cache. Payment providers are per tenant / country.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className={opsBtnGhost}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          {isFetching ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      <section
        className={`${opsCard} p-5 ${
          healthy
            ? "border-emerald-200 dark:border-emerald-900/50"
            : "border-amber-200 dark:border-amber-900/40"
        }`}
      >
        <div className="flex items-start gap-3">
          {healthy ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          )}
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Overall:{" "}
              <span
                className={
                  healthy
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-700 dark:text-amber-400"
                }
              >
                {healthy ? "Healthy" : "Degraded"}
              </span>
            </p>
            <p className={`mt-1 text-sm ${opsMuted}`}>
              {data.summary ||
                (healthy
                  ? "Required platform services look healthy"
                  : `${failed.length} required check${failed.length === 1 ? "" : "s"} need attention`)}
            </p>
            {!healthy ? (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Degraded
                </span>{" "}
                means a required platform service (WhatsApp, Lua webhook, or Redis) is missing
                or unreachable — not that a payment provider is unset.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Required
        </h3>
        <ul className="space-y-2">
          {requiredItems.map((item) => (
            <li key={item.id} className={`${opsCard} px-4 py-3`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      {item.label}
                    </span>
                    <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {kindBadge(item)}
                    </span>
                  </div>
                  <p className={`mt-1 text-xs ${opsMuted}`}>{item.message}</p>
                </div>
                {item.ok ? (
                  <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" /> OK
                  </span>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4" /> Needs setup
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Payment providers
        </h3>
        <section className={`${opsCard} mb-2 flex items-start gap-3 p-4`}>
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <p className={`text-xs leading-relaxed ${opsMuted}`}>
            {data.payments?.note ||
              "Payment provider is chosen per tenant based on registered location/country. Stripe is one option among others."}
          </p>
        </section>
        <ul className="space-y-2">
          {optionalItems.map((item) => (
            <li key={item.id} className={`${opsCard} px-4 py-3`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      {item.label}
                    </span>
                    <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Optional
                    </span>
                  </div>
                  <p className={`mt-1 text-xs ${opsMuted}`}>{item.message}</p>
                </div>
                {item.ok ? (
                  <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" /> Available
                  </span>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
                    Not configured
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
