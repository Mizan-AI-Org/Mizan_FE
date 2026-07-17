import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { platformApi } from "@/lib/platformApi";
import { Loader2, Search } from "lucide-react";
import OpsPagination from "@/components/platform-admin/OpsPagination";
import {
  opsBadgeDanger,
  opsBadgeWarn,
  opsBtnPrimary,
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

export default function TenantsPage() {
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["platform-tenants", submitted, page],
    queryFn: () =>
      platformApi.tenants({
        ...(submitted ? { q: submitted } : {}),
        page: String(page),
        page_size: String(PAGE_SIZE),
      }),
  });

  return (
    <div className={opsPage}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className={opsTitle}>Tenants</h2>
          <p className={opsSubtitle}>{data?.count ?? "…"} tenants</p>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSubmitted(q.trim());
          }}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, email…"
              className={`${opsInput} w-64 pl-9`}
            />
          </div>
          <button type="submit" className={opsBtnPrimary}>
            Search
          </button>
        </form>
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
                <th className={opsTh}>Name</th>
                <th className={opsTh}>Country</th>
                <th className={opsTh}>Staff</th>
                <th className={opsTh}>Plan</th>
                <th className={opsTh}>Status</th>
                <th className={opsTh}>Flags</th>
              </tr>
            </thead>
            <tbody className={isFetching ? "opacity-60" : ""}>
              {(data?.results || []).map((t) => (
                <tr key={t.id} className={opsRow}>
                  <td className={opsTd}>
                    <Link to={`/admin/tenants/${t.id}`} className={opsLink}>
                      {t.name}
                    </Link>
                    <div className={opsMuted}>{t.email}</div>
                  </td>
                  <td className={opsTd}>{t.country_code || "—"}</td>
                  <td className={`${opsTd} tabular-nums`}>{t.staff_count}</td>
                  <td className={opsTd}>{t.subscription_plan || "Starter"}</td>
                  <td className={`${opsTd} capitalize`}>{t.subscription_status || "—"}</td>
                  <td className={`${opsTd} space-x-1`}>
                    {t.suspended ? (
                      <span className={opsBadgeDanger}>Suspended</span>
                    ) : null}
                    {!t.onboarding_done ? (
                      <span className={opsBadgeWarn}>Onboarding</span>
                    ) : null}
                  </td>
                </tr>
              ))}
              {(data?.results || []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    No tenants found
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
