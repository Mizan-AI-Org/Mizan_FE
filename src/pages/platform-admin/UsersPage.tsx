import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { platformApi, type PlatformUser } from "@/lib/platformApi";
import { Loader2, Search } from "lucide-react";
import OpsPagination from "@/components/platform-admin/OpsPagination";
import {
  opsBadgeOk,
  opsBadgeViolet,
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

type StatusFilter = "active" | "inactive" | "all";

export default function UsersPage() {
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["platform-users", submitted, status, page],
    queryFn: () =>
      platformApi.users({
        ...(submitted ? { q: submitted } : {}),
        status,
        page: String(page),
        page_size: String(PAGE_SIZE),
      }),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      platformApi.patchUser(id, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform-users"] }),
  });

  const statusLabel =
    status === "active"
      ? "active users"
      : status === "inactive"
        ? "inactive users"
        : "users";

  return (
    <div className={opsPage}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className={opsTitle}>Users</h2>
          <p className={opsSubtitle}>
            Global search across all tenants
            {typeof data?.count === "number" ? ` · ${data.count} ${statusLabel}` : ""}
          </p>
        </div>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSubmitted(q.trim());
          }}
        >
          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value as StatusFilter);
            }}
            className={opsInput}
            aria-label="User status filter"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Email, phone, name…"
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
                <th className={opsTh}>User</th>
                <th className={opsTh}>Role</th>
                <th className={opsTh}>Tenant</th>
                <th className={opsTh}>Flags</th>
                <th className={opsTh}>Active</th>
              </tr>
            </thead>
            <tbody className={isFetching ? "opacity-60" : ""}>
              {(data?.results || []).map((u: PlatformUser) => (
                <tr key={u.id} className={opsRow}>
                  <td className={opsTd}>
                    <Link to={`/admin/users/${u.id}`} className={opsLink}>
                      {u.first_name} {u.last_name}
                    </Link>
                    <div className={opsMuted}>{u.email}</div>
                    {u.phone ? <div className={opsMuted}>{u.phone}</div> : null}
                  </td>
                  <td className={opsTd}>{u.role}</td>
                  <td className={opsTd}>
                    {u.restaurant ? (
                      <Link to={`/admin/tenants/${u.restaurant}`} className={opsLink}>
                        {u.restaurant_name || "View tenant"}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={`${opsTd} space-x-1`}>
                    {u.is_platform_operator || u.is_staff ? (
                      <span className={opsBadgeOk}>Ops</span>
                    ) : null}
                    {u.is_superuser ? <span className={opsBadgeViolet}>Super</span> : null}
                  </td>
                  <td className={opsTd}>
                    <button
                      type="button"
                      disabled={toggleActive.isPending}
                      onClick={() =>
                        toggleActive.mutate({ id: u.id, is_active: !u.is_active })
                      }
                      className={`rounded px-2 py-1 text-xs font-semibold ${
                        u.is_active
                          ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {u.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                </tr>
              ))}
              {(data?.results || []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    No users found
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
