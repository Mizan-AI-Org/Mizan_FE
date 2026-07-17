import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { platformApi } from "@/lib/platformApi";
import { Loader2 } from "lucide-react";
import OpsPagination from "@/components/platform-admin/OpsPagination";
import {
  opsMuted,
  opsPage,
  opsRow,
  opsSubtitle,
  opsTableWrap,
  opsTd,
  opsTh,
  opsTitle,
} from "@/components/platform-admin/opsStyles";

const PAGE_SIZE = 25;

export default function AuditPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["platform-audit", page],
    queryFn: () =>
      platformApi.audit({
        page: String(page),
        page_size: String(PAGE_SIZE),
      }),
  });

  return (
    <div className={opsPage}>
      <header>
        <h2 className={opsTitle}>Audit log</h2>
        <p className={opsSubtitle}>
          Recent platform and cross-tenant events
          {typeof data?.count === "number" ? ` · ${data.count} total` : ""}
        </p>
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
                <th className={opsTh}>When</th>
                <th className={opsTh}>Action</th>
                <th className={opsTh}>Actor</th>
                <th className={opsTh}>Tenant</th>
                <th className={opsTh}>Description</th>
              </tr>
            </thead>
            <tbody className={isFetching ? "opacity-60" : ""}>
              {(data?.results || []).map((row) => (
                <tr key={row.id} className={opsRow}>
                  <td className={`${opsTd} whitespace-nowrap text-xs ${opsMuted}`}>
                    {new Date(row.timestamp).toLocaleString()}
                  </td>
                  <td className={`${opsTd} font-mono text-xs text-slate-700 dark:text-slate-300`}>
                    {row.action_type}
                  </td>
                  <td className={opsTd}>{row.user_email || "—"}</td>
                  <td className={opsTd}>{row.restaurant_name || "—"}</td>
                  <td className={`${opsTd} max-w-md truncate`}>{row.description}</td>
                </tr>
              ))}
              {(data?.results || []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    No audit events
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
