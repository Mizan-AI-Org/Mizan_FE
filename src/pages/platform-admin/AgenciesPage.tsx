import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Plus, Search, X } from "lucide-react";
import { platformApi } from "@/lib/platformApi";
import {
  opsBadgeDanger,
  opsBadgeOk,
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

/** Facility agencies: their own tenants, servicing the restaurants of an avenue (breakdowns, cleaning, security,
 * shared areas). Create one here; connect restaurants on its page. */
export default function AgenciesPage() {
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [creating, setCreating] = useState(false);
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["platform-agencies", submitted],
    queryFn: () => platformApi.agencies(submitted),
  });
  const rows = data?.results || [];

  return (
    <div className={opsPage}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className={opsTitle}>Agencies</h2>
          <p className={opsSubtitle}>
            Facility agencies and the restaurants they look after ({data?.count ?? "…"})
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(q.trim());
            }}
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, email…"
                className={`${opsInput} w-56 pl-9`}
              />
            </div>
          </form>
          <button type="button" className={opsBtnPrimary} onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Create agency
          </button>
        </div>
      </header>

      {creating ? <CreateAgency onClose={() => setCreating(false)} /> : null}

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
                <th className={opsTh}>Agency</th>
                <th className={opsTh}>Owner</th>
                <th className={opsTh}>Avenues</th>
                <th className={opsTh}>Restaurants</th>
                <th className={opsTh}>Open jobs</th>
                <th className={opsTh}>Status</th>
              </tr>
            </thead>
            <tbody className={isFetching ? "opacity-60" : ""}>
              {rows.map((a) => (
                <tr key={a.id} className={opsRow}>
                  <td className={opsTd}>
                    <Link to={`/admin/agencies/${a.id}`} className={opsLink}>
                      {a.name}
                    </Link>
                    <div className={opsMuted}>{a.email}</div>
                  </td>
                  <td className={opsTd}>{a.ownerName || "-"}</td>
                  <td className={opsTd}>{a.avenues.map((v) => v.name).join(", ") || "-"}</td>
                  <td className={`${opsTd} tabular-nums`}>{a.linkedCount}</td>
                  <td className={`${opsTd} tabular-nums`}>{a.openJobs}</td>
                  <td className={opsTd}>
                    {a.suspended ? (
                      <span className={opsBadgeDanger}>Suspended</span>
                    ) : (
                      <span className={opsBadgeOk}>Active</span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    No agencies yet
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CreateAgency({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    language: "fr",
    ownerName: "",
    ownerPhone: "",
  });
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));
  const create = useMutation({
    mutationFn: () => platformApi.createAgency(form),
    onSuccess: (agency) => {
      queryClient.invalidateQueries({ queryKey: ["platform-agencies"] });
      navigate(`/admin/agencies/${agency.id}`);
    },
  });
  const ready = form.name.trim() && form.email.trim() && form.ownerPhone.trim();

  return (
    <form
      className={`${opsCard} space-y-4 p-5`}
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) create.mutate();
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-white">New agency</h3>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Agency name">
          <input className={`${opsInput} w-full`} value={form.name} onChange={set("name")} required />
        </Field>
        <Field label="Email">
          <input className={`${opsInput} w-full`} type="email" value={form.email} onChange={set("email")} required />
        </Field>
        <Field label="Phone (office)">
          <input className={`${opsInput} w-full`} value={form.phone} onChange={set("phone")} />
        </Field>
        <Field label="Language">
          <select className={`${opsInput} w-full`} value={form.language} onChange={set("language")}>
            <option value="fr">Français</option>
            <option value="en">English</option>
            <option value="ar">العربية</option>
          </select>
        </Field>
        <Field label="Owner's name">
          <input className={`${opsInput} w-full`} value={form.ownerName} onChange={set("ownerName")} />
        </Field>
        <Field label="Owner's WhatsApp number">
          <input
            className={`${opsInput} w-full`}
            value={form.ownerPhone}
            onChange={set("ownerPhone")}
            placeholder="212600000000"
            required
          />
        </Field>
      </div>
      <p className={opsMuted}>The owner gets the Mizan welcome on WhatsApp and joins with one tap.</p>
      {create.error ? <p className="text-sm text-rose-600">{(create.error as Error).message}</p> : null}
      <div className="flex gap-2">
        <button type="submit" className={opsBtnPrimary} disabled={!ready || create.isPending}>
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create agency
        </button>
        <button type="button" className={opsBtnGhost} onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}
