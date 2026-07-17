import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { platformApi } from "@/lib/platformApi";
import { Loader2, ArrowLeft, LogIn } from "lucide-react";
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
  const [staffPage, setStaffPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-tenant", id] });
      qc.invalidateQueries({ queryKey: ["platform-subscriptions"] });
    },
    onError: (e: Error) => setError(e.message),
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
      <Link
        to="/admin/tenants"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Tenants
      </Link>

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

      {error ? <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p> : null}

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
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Billing</h3>
          <Link to="/admin/billing" className={`text-xs ${opsLink}`}>
            All subscriptions →
          </Link>
        </div>
        {sub ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Plan
              </span>
              <select
                className={`${opsInput} w-full`}
                value={sub.plan_id ?? ""}
                disabled={patchBilling.isPending}
                onChange={(e) => {
                  setError(null);
                  const plan = e.target.value ? Number(e.target.value) : null;
                  patchBilling.mutate({ plan });
                }}
              >
                <option value="">No plan</option>
                {(plans || []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.tier})
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Status
              </span>
              <select
                className={`${opsInput} w-full capitalize`}
                value={sub.status}
                disabled={patchBilling.isPending}
                onChange={(e) => {
                  setError(null);
                  patchBilling.mutate({ status: e.target.value });
                }}
              >
                {["trialing", "active", "past_due", "canceled", "incomplete", "unpaid"].map(
                  (st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ),
                )}
              </select>
            </label>
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
        ) : (
          <p className="text-sm text-slate-500">No billing record yet.</p>
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
