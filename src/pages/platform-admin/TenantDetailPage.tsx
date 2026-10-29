import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import TenantModuleBilling from "@/components/platform-admin/TenantModuleBilling";
import { platformApi } from "@/lib/platformApi";
import { Loader2, LogIn } from "lucide-react";
import OpsBackNav from "@/components/platform-admin/OpsBackNav";
import { startImpersonation } from "@/lib/impersonation";
import OpsPagination from "@/components/platform-admin/OpsPagination";
import {
  opsBtnGhost,
  opsBtnPrimary,
  opsCard,
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

  const { data, isLoading } = useQuery({
    queryKey: ["platform-tenant", id],
    queryFn: () => platformApi.tenant(id),
    enabled: !!id,
  });

  const suspend = useMutation({
    mutationFn: (suspended: boolean) => platformApi.patchTenant(id, { suspended }),
    onSuccess: (_res, suspended) => {
      setError(null);
      setOkMsg(suspended ? "Tenant suspended." : "Tenant unsuspended.");
      qc.invalidateQueries({ queryKey: ["platform-tenant", id] });
      qc.invalidateQueries({ queryKey: ["platform-tenants"] });
    },
    onError: (e: Error) => {
      setOkMsg(null);
      setError(e.message);
    },
  });

  const deactivate = useMutation({
    mutationFn: (deactivated: boolean) =>
      platformApi.patchTenant(id, { deactivated }),
    onSuccess: (_res, deactivated) => {
      setError(null);
      setOkMsg(
        deactivated
          ? "Tenant deactivated - all user accounts on this tenant are now inactive."
          : "Tenant reactivated - user accounts restored to active.",
      );
      qc.invalidateQueries({ queryKey: ["platform-tenant", id] });
      qc.invalidateQueries({ queryKey: ["platform-tenants"] });
      qc.invalidateQueries({ queryKey: ["platform-users"] });
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


  return (
    <div className={opsPage}>
      <OpsBackNav to="/admin/tenants" label="Tenants" />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className={opsTitle}>{data.name}</h2>
          <p className={opsSubtitle}>{data.email}</p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
            {data.deactivated ? (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                Deactivated
              </span>
            ) : null}
            {data.suspended && !data.deactivated ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                Suspended
              </span>
            ) : null}
            {!data.suspended && !data.deactivated ? (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                Active
              </span>
            ) : null}
          </div>
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
            disabled={suspend.isPending || data.deactivated}
            onClick={() => suspend.mutate(!data.suspended)}
            className={opsBtnGhost}
            title={
              data.deactivated
                ? "Reactivate the tenant before changing suspension"
                : undefined
            }
          >
            {data.suspended ? "Unsuspend" : "Suspend"}
          </button>
          <button
            type="button"
            disabled={
              deactivate.isPending ||
              (!data.deactivated && !data.suspended)
            }
            onClick={() => {
              const next = !data.deactivated;
              const ok = window.confirm(
                next
                  ? "Deactivate this tenant and disable all user accounts? They will not be able to sign in."
                  : "Reactivate this tenant and restore user accounts to active?",
              );
              if (!ok) return;
              deactivate.mutate(next);
            }}
            className={opsBtnGhost}
            title={
              !data.deactivated && !data.suspended
                ? "Suspend the tenant first, then deactivate accounts"
                : undefined
            }
          >
            {data.deactivated ? "Reactivate" : "Deactivate accounts"}
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
        <Info label="Country" value={data.country_code || "-"} />
        <Info label="Currency" value={data.currency || "-"} />
        <Info label="Timezone" value={data.timezone || "-"} />
        <Info label="POS" value={data.pos_provider || "-"} />
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
              : "-"
          }
        />
        <Info label="Created" value={new Date(data.created_at).toLocaleString()} />
        <Info label="Address" value={data.address || "-"} />
      </div>

      <TenantModuleBilling restaurantId={id} />

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
                    <td className={opsTd}>{row.user_email || "-"}</td>
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
