import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { platformApi } from "@/lib/platformApi";
import { Loader2, LogIn } from "lucide-react";
import OpsBackNav from "@/components/platform-admin/OpsBackNav";
import { startImpersonation } from "@/lib/impersonation";
import OpsPagination from "@/components/platform-admin/OpsPagination";
import {
  opsBtnGhost,
  opsBtnPrimary,
  opsCard,
  opsInput,
  opsLink,
  opsMuted,
  opsPage,
  opsRow,
  opsSubtitle,
  opsTableWrap,
  opsTd,
  opsTh,
  opsTitle,
} from "@/components/platform-admin/opsStyles";

const STAFF_PAGE_SIZE = 15;
const AUDIT_PAGE_SIZE = 10;

export default function TenantDetailPage() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [staffPage, setStaffPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [planReason, setPlanReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["platform-tenant", id],
    queryFn: () => platformApi.tenant(id),
    enabled: !!id,
  });

  const { data: plans } = useQuery({
    queryKey: ["platform-plans"],
    queryFn: () => platformApi.plans(),
  });

  const suspend = useMutation({
    mutationFn: (suspended: boolean) => platformApi.patchTenant(id, { suspended }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-tenant", id] });
      qc.invalidateQueries({ queryKey: ["platform-tenants"] });
    },
  });

  const patchBilling = useMutation({
    mutationFn: (body: Record<string, unknown>) => {
      const subId = data?.subscription?.id;
      if (!subId) throw new Error("No subscription on this tenant");
      return platformApi.patchSubscription(Number(subId), body);
    },
    onSuccess: async (_res, body) => {
      setError(null);
      if ("plan" in body) {
        setOkMsg("Plan updated — effective tier refreshed.");
        setPendingPlanId(null);
        setPlanReason("");
      }
      await qc.invalidateQueries({ queryKey: ["platform-tenant", id] });
      await qc.refetchQueries({ queryKey: ["platform-tenant", id] });
      qc.invalidateQueries({ queryKey: ["platform-subscriptions"] });
      qc.invalidateQueries({ queryKey: ["platform-audit"] });
    },
    onError: (e: Error) => {
      setOkMsg(null);
      setError(e.message);
    },
  });

  const impersonate = useMutation({
    mutationFn: () => platformApi.impersonate(id),
    onSuccess: (res) => {
      // Drop ops caches so a back/bfcache restore cannot refetch /api/platform/* as the tenant.
      qc.removeQueries({ queryKey: ["platform-me"] });
      qc.removeQueries({ queryKey: ["platform-tenant"] });
      qc.removeQueries({ queryKey: ["platform-tenants"] });
      qc.removeQueries({ queryKey: ["platform-plans"] });
      qc.removeQueries({ queryKey: ["platform-users"] });
      qc.removeQueries({ queryKey: ["platform-subscriptions"] });
      qc.removeQueries({ queryKey: ["platform-overview"] });
      qc.removeQueries({ queryKey: ["platform-audit"] });
      qc.removeQueries({ queryKey: ["platform-operators"] });
      qc.removeQueries({ queryKey: ["platform-health"] });
      startImpersonation({
        access: res.access,
        refresh: res.refresh,
        restaurant: res.restaurant,
        returnTo: `/admin/tenants/${id}`,
      });
      // replace so Back does not reopen /admin with the restaurant JWT
      window.location.replace("/dashboard");
    },
    onError: (e: Error) => setError(e.message),
  });

  const staff = data?.staff || [];
  const audit = data?.recent_audit || [];
  const staffRows = useMemo(() => {
    const start = (staffPage - 1) * STAFF_PAGE_SIZE;
    return staff.slice(start, start + STAFF_PAGE_SIZE);
  }, [staff, staffPage]);
  const auditRows = useMemo(() => {
    const start = (auditPage - 1) * AUDIT_PAGE_SIZE;
    return audit.slice(start, start + AUDIT_PAGE_SIZE);
  }, [audit, auditPage]);

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#00C853]" />
      </div>
    );
  }

  const sub = data.subscription;

  return (
    <div className={opsPage}>
      <OpsBackNav to="/admin/tenants" label="Tenants" />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className={opsTitle}>{data.name}</h2>
          <p className={opsSubtitle}>{data.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={impersonate.isPending}
            onClick={() => {
              setError(null);
              impersonate.mutate();
            }}
            className={opsBtnPrimary}
            aria-label="Enter as tenant"
            data-testid="enter-as-tenant"
          >
            {impersonate.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            Enter as tenant
          </button>
          <button
            type="button"
            disabled={suspend.isPending}
            onClick={() => suspend.mutate(!data.suspended)}
            className={opsBtnGhost}
          >
            {data.suspended ? "Unsuspend" : "Suspend"}
          </button>
        </div>
      </header>

      {okMsg ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 rounded-lg px-3 py-2">
          {okMsg}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 rounded-lg px-3 py-2">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Info label="Country" value={data.country_code || "—"} />
        <Info label="Currency" value={data.currency || "—"} />
        <Info label="Timezone" value={data.timezone || "—"} />
        <Info label="POS" value={data.pos_provider || "—"} />
        <Info label="Staff count" value={String(data.staff_count)} />
        <Info
          label="Onboarding"
          value={data.onboarding_done ? "Complete" : "Incomplete"}
        />
        <Info
          label="Owner"
          value={
            data.owner
              ? `${data.owner.first_name} ${data.owner.last_name} (${data.owner.email})`
              : "—"
          }
        />
        <Info label="Created" value={new Date(data.created_at).toLocaleString()} />
        <Info label="Address" value={data.address || "—"} />
      </div>

      <section className={`${opsCard} p-5 space-y-4`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Billing</h3>
            <p className={`mt-0.5 text-xs ${opsMuted}`}>
              Change plan/tier with a required reason. Status is set by billing
              activity — not editable here.
            </p>
          </div>
          <Link to="/admin/billing" className={`text-xs ${opsLink}`}>
            All subscriptions →
          </Link>
        </div>
        {sub ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Plan
                </span>
                <select
                  className={`${opsInput} w-full`}
                  value={pendingPlanId ?? String(sub.plan_id ?? "")}
                  disabled={patchBilling.isPending || !(plans || []).length}
                  onChange={(e) => {
                    setError(null);
                    setOkMsg(null);
                    const next = e.target.value;
                    if (!next || next === String(sub.plan_id ?? "")) {
                      setPendingPlanId(null);
                      setPlanReason("");
                      return;
                    }
                    setPendingPlanId(next);
                  }}
                >
                  {(plans || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.tier})
                    </option>
                  ))}
                </select>
              </label>
              <Info
                label="Status"
                value={String(sub.status || "—")}
              />
              <Info
                label="Effective tier"
                value={String(sub.effective_tier || sub.tier || "STARTER")}
              />
              <Info
                label="Trial ends"
                value={
                  sub.trial_ends_at
                    ? new Date(String(sub.trial_ends_at)).toLocaleDateString()
                    : "—"
                }
              />
              <Info label="Stripe customer" value={String(sub.stripe_customer_id || "—")} />
              <Info
                label="Period end"
                value={
                  sub.current_period_end
                    ? new Date(String(sub.current_period_end)).toLocaleDateString()
                    : "—"
                }
              />
            </div>

            {pendingPlanId !== null ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  Confirm plan change
                  {(() => {
                    const selected = (plans || []).find(
                      (p) => String(p.id) === pendingPlanId,
                    );
                    const from = sub.plan || "Starter";
                    const to = selected ? `${selected.name} (${selected.tier})` : "—";
                    return (
                      <span className={`block mt-1 font-normal ${opsMuted}`}>
                        {from} → {to}
                      </span>
                    );
                  })()}
                </p>
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Reason / explanation
                  </span>
                  <textarea
                    className={`${opsInput} w-full min-h-[88px] py-2`}
                    value={planReason}
                    placeholder="e.g. Comp upgrade for pilot partner — approved by ops on 2026-07-17"
                    onChange={(e) => setPlanReason(e.target.value)}
                  />
                  <span
                    className={`text-xs ${
                      planReason.trim().length < 8
                        ? "text-amber-700 dark:text-amber-400"
                        : opsMuted
                    }`}
                  >
                    {planReason.trim().length < 8
                      ? `Enter at least 8 characters (${planReason.trim().length}/8). Saved to audit history.`
                      : "Ready to apply. Saved to audit history."}
                  </span>
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={`${opsBtnPrimary} disabled:cursor-not-allowed disabled:opacity-40`}
                    disabled={patchBilling.isPending || planReason.trim().length < 8}
                    onClick={() => {
                      const reason = planReason.trim();
                      if (!pendingPlanId) {
                        setError("Select a plan/tier.");
                        return;
                      }
                      if (reason.length < 8) {
                        setError("Reason must be at least 8 characters.");
                        return;
                      }
                      setError(null);
                      patchBilling.mutate({
                        plan: Number(pendingPlanId),
                        reason,
                      });
                    }}
                  >
                    {patchBilling.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    Apply plan change
                  </button>
                  <button
                    type="button"
                    className={opsBtnGhost}
                    disabled={patchBilling.isPending}
                    onClick={() => {
                      setPendingPlanId(null);
                      setPlanReason("");
                      setError(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {sub.last_plan_change?.reason ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs dark:border-slate-700 dark:bg-slate-950/50">
                <p className="font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Last plan change
                </p>
                <p className="mt-1 text-slate-700 dark:text-slate-200">
                  {(sub.last_plan_change.from_plan || "none") +
                    " → " +
                    (sub.last_plan_change.to_plan || "none")}
                  {sub.last_plan_change.at
                    ? ` · ${new Date(sub.last_plan_change.at).toLocaleString()}`
                    : ""}
                  {sub.last_plan_change.by_email
                    ? ` · ${sub.last_plan_change.by_email}`
                    : ""}
                </p>
                <p className="mt-1 text-slate-600 dark:text-slate-300">
                  {sub.last_plan_change.reason}
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Loading billing… refresh if this stays empty (every tenant should have a Starter tier).
          </p>
        )}
      </section>

      {(data.locations || []).length > 0 ? (
        <section className={`${opsCard} p-5`}>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Locations</h3>
          <ul className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
            {data.locations!.map((loc) => (
              <li key={loc.id}>
                {loc.name}
                {loc.is_primary ? " · primary" : ""}
                {!loc.is_active ? " · inactive" : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {staff.length > 0 ? (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">People</h3>
          <div className={opsTableWrap}>
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className={opsTh}>User</th>
                  <th className={opsTh}>Role</th>
                  <th className={opsTh}>Active</th>
                </tr>
              </thead>
              <tbody>
                {staffRows.map((u) => (
                  <tr key={u.id} className={opsRow}>
                    <td className={opsTd}>
                      <Link to={`/admin/users/${u.id}`} className={opsLink}>
                        {u.first_name} {u.last_name}
                      </Link>
                      <div className={opsMuted}>{u.email}</div>
                    </td>
                    <td className={opsTd}>{u.role}</td>
                    <td className={opsTd}>{u.is_active ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <OpsPagination
              page={staffPage}
              pageSize={STAFF_PAGE_SIZE}
              total={staff.length}
              onPageChange={setStaffPage}
            />
          </div>
        </section>
      ) : null}

      {audit.length > 0 ? (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
            Recent activity
          </h3>
          <div className={opsTableWrap}>
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className={opsTh}>When</th>
                  <th className={opsTh}>Action</th>
                  <th className={opsTh}>Who</th>
                  <th className={opsTh}>Description</th>
                </tr>
              </thead>
              <tbody>
                {auditRows.map((row) => (
                  <tr key={row.id} className={opsRow}>
                    <td className={`${opsTd} whitespace-nowrap text-xs ${opsMuted}`}>
                      {new Date(row.timestamp).toLocaleString()}
                    </td>
                    <td className={`${opsTd} font-mono text-xs`}>{row.action_type}</td>
                    <td className={opsTd}>{row.user_email || "—"}</td>
                    <td className={`${opsTd} max-w-md truncate`}>{row.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <OpsPagination
              page={auditPage}
              pageSize={AUDIT_PAGE_SIZE}
              total={audit.length}
              onPageChange={setAuditPage}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${opsCard} px-4 py-3`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm text-slate-900 dark:text-slate-100 break-words">{value}</p>
    </div>
  );
}
