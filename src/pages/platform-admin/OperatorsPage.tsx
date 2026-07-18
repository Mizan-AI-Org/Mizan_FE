import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useOutletContext } from "react-router-dom";
import { platformApi, type PlatformMe } from "@/lib/platformApi";
import { Loader2, Plus, Shield } from "lucide-react";
import OpsPagination from "@/components/platform-admin/OpsPagination";
import {
  opsBadgeOk,
  opsBadgeViolet,
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

const PAGE_SIZE = 20;

export default function OperatorsPage() {
  const { me } = useOutletContext<{ me: PlatformMe }>();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    password: "",
    is_superuser: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["platform-operators"],
    queryFn: () => platformApi.operators(),
  });

  const results = data?.results || [];
  const total = data?.count ?? results.length;
  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return results.slice(start, start + PAGE_SIZE);
  }, [results, page]);

  const create = useMutation({
    mutationFn: () =>
      platformApi.createOperator({
        email: form.email.trim(),
        first_name: form.first_name.trim() || undefined,
        last_name: form.last_name.trim() || undefined,
        password: form.password,
        is_superuser: me.is_superuser ? form.is_superuser : false,
      }),
    onSuccess: (user) => {
      setOkMsg(`Operator ready: ${user.email}`);
      setError(null);
      setOpen(false);
      setForm({
        email: "",
        first_name: "",
        last_name: "",
        password: "",
        is_superuser: false,
      });
      qc.invalidateQueries({ queryKey: ["platform-operators"] });
      qc.invalidateQueries({ queryKey: ["platform-users"] });
    },
    onError: (e: Error) => {
      setOkMsg(null);
      setError(e.message);
    },
  });

  return (
    <div className={opsPage}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className={opsTitle}>Operators</h2>
          <p className={opsSubtitle}>
            Mizan staff accounts with access to Platform Admin (/admin)
          </p>
        </div>
        <button
          type="button"
          className={opsBtnPrimary}
          onClick={() => {
            setOpen((v) => !v);
            setError(null);
            setOkMsg(null);
          }}
        >
          <Plus className="h-4 w-4" />
          Add operator
        </button>
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

      {open ? (
        <section className={`${opsCard} p-5 space-y-4 max-w-lg`}>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              New platform operator
            </h3>
          </div>
          <p className={`text-xs ${opsMuted}`}>
            Creates or promotes an account for Platform Admin. They can sign in at /admin.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5 sm:col-span-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Email
              </span>
              <input
                type="email"
                className={`${opsInput} w-full`}
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                First name
              </span>
              <input
                className={`${opsInput} w-full`}
                value={form.first_name}
                onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Last name
              </span>
              <input
                className={`${opsInput} w-full`}
                value={form.last_name}
                onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
              />
            </label>
            <label className="block space-y-1.5 sm:col-span-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Temporary password
              </span>
              <input
                type="password"
                autoComplete="new-password"
                className={`${opsInput} w-full`}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </label>
            {me.is_superuser ? (
              <label className="flex items-center gap-2 sm:col-span-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={form.is_superuser}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, is_superuser: e.target.checked }))
                  }
                />
                Grant superuser (can change other operators&apos; privileges)
              </label>
            ) : null}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className={opsBtnPrimary}
              disabled={create.isPending || !form.email.trim() || form.password.length < 8}
              onClick={() => create.mutate()}
            >
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create operator
            </button>
            <button type="button" className={opsBtnGhost} onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </section>
      ) : null}

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#00C853]" />
        </div>
      ) : (
        <div className={opsTableWrap}>
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className={opsTh}>Operator</th>
                <th className={opsTh}>Flags</th>
                <th className={opsTh}>Active</th>
                <th className={opsTh} />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((u) => (
                <tr key={u.id} className={opsRow}>
                  <td className={opsTd}>
                    <Link
                      to={`/admin/operators/${u.id}`}
                      className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                    >
                      {u.first_name} {u.last_name}
                    </Link>
                    <div className={opsMuted}>{u.email}</div>
                  </td>
                  <td className={`${opsTd} space-x-1`}>
                    <span className={opsBadgeOk}>Ops</span>
                    {u.is_superuser ? <span className={opsBadgeViolet}>Super</span> : null}
                  </td>
                  <td className={opsTd}>{u.is_active ? "Yes" : "No"}</td>
                  <td className={opsTd}>
                    <Link to={`/admin/operators/${u.id}`} className={`text-xs ${opsLink}`}>
                      Edit →
                    </Link>
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    No operators yet
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          <OpsPagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
