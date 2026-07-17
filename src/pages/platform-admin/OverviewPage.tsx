import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { platformApi, type GrowthPoint } from "@/lib/platformApi";
import {
  Building2,
  Users,
  CreditCard,
  Timer,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { opsPage } from "@/components/platform-admin/opsStyles";

function DeltaBadge({ value }: { value: number }) {
  if (value > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
        <TrendingUp className="h-3 w-3" />+{value} vs prior
      </span>
    );
  }
  if (value < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:text-rose-400">
        <TrendingDown className="h-3 w-3" />
        {value} vs prior
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
      <Minus className="h-3 w-3" />
      Flat
    </span>
  );
}

function Sparkline({ data, color }: { data: GrowthPoint[]; color: string }) {
  if (!data?.length) return null;
  return (
    <div className="h-12 w-full mt-3 -mb-1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke={color}
            strokeWidth={2}
            fill={`url(#spark-${color})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  delta,
  spark,
  sparkColor,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ElementType;
  delta?: number;
  spark?: GrowthPoint[];
  sparkColor?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
            {value}
          </p>
          {hint ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
          {typeof delta === "number" ? (
            <div className="mt-2">
              <DeltaBadge value={delta} />
            </div>
          ) : null}
        </div>
        <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-2.5 text-slate-700 dark:text-slate-200">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {spark ? <Sparkline data={spark} color={sparkColor || "#00C853"} /> : null}
    </div>
  );
}

function HealthDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
          ok
            ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
            : "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400",
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", ok ? "bg-emerald-500" : "bg-rose-500")} />
        {ok ? "Ready" : "Missing"}
      </span>
    </div>
  );
}

export default function OverviewPage() {
  const [range, setRange] = useState<"weekly" | "monthly">("weekly");
  const { data, isLoading, error } = useQuery({
    queryKey: ["platform-overview"],
    queryFn: () => platformApi.overview(),
  });

  const chartData = useMemo(() => {
    if (!data?.growth) return [];
    const users = data.growth[range].users;
    const tenants = data.growth[range].tenants;
    return users.map((u, i) => ({
      label: u.label,
      users: u.cumulative,
      usersNew: u.new,
      tenants: tenants[i]?.cumulative ?? 0,
      tenantsNew: tenants[i]?.new ?? 0,
    }));
  }, [data, range]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#00C853]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-rose-600">
        Failed to load overview: {(error as Error)?.message || "Unknown error"}
      </div>
    );
  }

  const statusEntries = Object.entries(data.subscriptions_by_status || {});
  const maxStatus = Math.max(1, ...statusEntries.map(([, c]) => c));

  return (
    <div className={`${opsPage} max-w-7xl`}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#00C853]">
            Mizan Ops
          </p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Overview</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Growth, subscriptions, and platform health at a glance
          </p>
        </div>
        <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 shadow-sm">
          {(["weekly", "monthly"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setRange(key)}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors",
                range === key
                  ? "bg-[#00E676] text-slate-900 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200",
              )}
            >
              {key}
            </button>
          ))}
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Tenants"
          value={data.restaurants}
          hint={`${data.deltas?.tenants_new_this_week ?? 0} new this week`}
          icon={Building2}
          delta={data.deltas?.tenants_wow}
          spark={data.growth?.weekly.tenants}
          sparkColor="#00C853"
        />
        <Kpi
          label="Active users"
          value={data.users_active}
          hint={`${data.staff_active} staff · ${data.managers_active ?? 0} managers/owners`}
          icon={Users}
          delta={data.deltas?.users_wow}
          spark={data.growth?.weekly.users}
          sparkColor="#059669"
        />
        <Kpi
          label="Active / trial subs"
          value={data.subscriptions_active}
          hint={
            data.mrr_estimate
              ? `~$${Number(data.mrr_estimate).toLocaleString()} MRR`
              : "Starter default on signup"
          }
          icon={CreditCard}
        />
        <Kpi label="Trials ending 7d" value={data.trials_ending_7d} icon={Timer} />
      </div>

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">User & tenant growth</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Cumulative totals · {range === "weekly" ? "last 12 weeks" : "last 12 months"}
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#00C853]" /> Users
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-400" /> Tenants
            </span>
          </div>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="usersFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00C853" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#00C853" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="tenantsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-700" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "currentColor", fontSize: 11 }}
                className="text-slate-500"
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "currentColor", fontSize: 11 }}
                className="text-slate-500"
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--ops-tooltip-bg, #fff)",
                  border: "1px solid var(--ops-tooltip-border, #e2e8f0)",
                  borderRadius: 12,
                  color: "var(--ops-tooltip-fg, #0f172a)",
                  fontSize: 12,
                }}
                formatter={(val: number, name: string) => [
                  val,
                  name === "users" ? "Users (total)" : "Tenants (total)",
                ]}
              />
              <Area
                type="monotone"
                dataKey="users"
                stroke="#00C853"
                strokeWidth={2.5}
                fill="url(#usersFill)"
              />
              <Area
                type="monotone"
                dataKey="tenants"
                stroke="#94a3b8"
                strokeWidth={2}
                fill="url(#tenantsFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-5">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">New signups per period</h4>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-700" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "currentColor", fontSize: 10 }}
                  className="text-slate-500"
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "currentColor", fontSize: 10 }}
                  className="text-slate-500"
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--ops-tooltip-bg, #fff)",
                    border: "1px solid var(--ops-tooltip-border, #e2e8f0)",
                    borderRadius: 12,
                    color: "var(--ops-tooltip-fg, #0f172a)",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="usersNew" name="New users" fill="#00C853" radius={[4, 4, 0, 0]} />
                <Bar dataKey="tenantsNew" name="New tenants" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Subscription status</h3>
            <Link
              to="/admin/billing"
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              Open billing →
            </Link>
          </div>
          <ul className="space-y-3">
            {statusEntries.length === 0 ? (
              <li className="text-sm text-slate-500 dark:text-slate-400">No subscriptions</li>
            ) : (
              statusEntries.map(([status, count]) => (
                <li key={status}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="capitalize text-slate-600 dark:text-slate-400">{status}</span>
                    <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#00E676] to-[#00C853]"
                      style={{ width: `${(count / maxStatus) * 100}%` }}
                    />
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Integration health</h3>
            <Link
              to="/admin/health"
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              Details →
            </Link>
          </div>
          <div className="space-y-2">
            <HealthDot ok={data.health.whatsapp_configured} label="WhatsApp" />
            <HealthDot ok={data.health.lua_webhook_configured} label="Lua webhook" />
            <p className="pt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              Payment providers are per tenant / country — see{" "}
              <Link to="/admin/health" className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline">
                Health
              </Link>
              .
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
