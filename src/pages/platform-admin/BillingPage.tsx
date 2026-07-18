import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { platformApi } from "@/lib/platformApi";
import { Loader2 } from "lucide-react";
import OpsPagination from "@/components/platform-admin/OpsPagination";
import {
  opsBadgeOk,
  opsBadgeWarn,
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

const PAGE_SIZE = 20;

function StatusBadge({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  const cls =
    s === "active"
      ? opsBadgeOk
      : s === "trialing"
        ? opsBadgeWarn
        : "rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300";
  return <span className={cls}>{status || "—"}</span>;
}

export default function BillingPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["platform-subscriptions", status, page],
    queryFn: () =>
      platformApi.subscriptions({
        ...(status ? { status } : {}),
        page: String(page),
        page_size: String(PAGE_SIZE),
      }),
  });

  return (
    <div className={opsPage}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className={opsTitle}>Billing</h2>
          <p className={opsSubtitle}>
            Subscriptions by tenant · status is set by billing activity (not editable here)
            {typeof data?.count === "number" ? ` · ${data.count} total` : ""}
          </p>
        </div>
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          className={opsInput}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="trialing">Trialing</option>
          <option value="active">Active</option>
          <option value="past_due">Past due</option>
          <option value="canceled">Canceled</option>
          <option value="incomplete">Incomplete</option>
        </select>
      </header>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#00C853]" />
        </div>
      ) : error ? (
        <p className="text-rose-600 dark:text-rose-400">{(error as Error).message}</p>
      ) : (
        <div className={opsTableWrap}>
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className={opsTh}>Tenant</th>
                <th className={opsTh}>Plan</th>
                <th className={opsTh}>Status</th>
                <th className={opsTh}>Interval</th>
                <th className={opsTh}>Period end</th>
                <th className={opsTh}>Stripe</th>
              </tr>
            </thead>
            <tbody className={isFetching ? "opacity-60" : ""}>
              {(data?.results || []).map((s) => (
                <tr key={s.id} className={opsRow}>
                  <td className={opsTd}>
                    <Link to={`/admin/tenants/${s.restaurant_id}`} className={opsLink}>
                      {s.restaurant_name}
                    </Link>
                  </td>
                  <td className={opsTd}>
                    <Link
                      to={`/admin/tenants/${s.restaurant_id}`}
                      className={opsLink}
                      title="Change plan on the tenant page (reason required)"
                    >
                      {s.plan_name || "—"}
                    </Link>
                  </td>
                  <td className={opsTd}>
                    <StatusBadge status={s.status} />
                  </td>
                  <td className={opsTd}>{s.billing_interval || "—"}</td>
                  <td className={opsTd}>
                    {s.current_period_end
                      ? new Date(s.current_period_end).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className={`${opsTd} font-mono text-[11px] ${opsMuted} truncate max-w-[140px]`}>
                    {s.stripe_customer_id || "—"}
                  </td>
                </tr>
              ))}
              {(data?.results || []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    No subscriptions
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          <OpsPagination
            page={page}
            pageSize={PAGE_SIZE}
            total={data?.count ?? 0}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
