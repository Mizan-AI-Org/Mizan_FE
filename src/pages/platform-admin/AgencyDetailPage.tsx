import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import {
  AGENCY_SCOPES,
  AGENCY_URGENCIES,
  platformApi,
  type AgencyLink,
  type AgencyScope,
  type AgencyTargets,
} from "@/lib/platformApi";
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

const SCOPE_LABEL: Record<AgencyScope, string> = {
  breakdown: "Breakdowns / repairs",
  cleaning: "Cleaning",
  security: "Security",
  common_area: "Shared areas (avenue)",
};

const DEFAULT_TARGETS: AgencyTargets = {
  critical: { respond: 15, fix: 120 },
  high: { respond: 60, fix: 480 },
  normal: { respond: 240, fix: 1440 },
  low: { respond: 1440, fix: 4320 },
};

function minutes(value: number | null | undefined): string {
  if (value == null) return "-";
  if (value < 60) return `${value} min`;
  if (value < 1440) return `${Math.round((value / 60) * 10) / 10} h`;
  return `${Math.round((value / 1440) * 10) / 10} d`;
}

export default function AgencyDetailPage() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["platform-agency", id],
    queryFn: () => platformApi.agency(id),
    enabled: !!id,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["platform-agency", id] });

  if (isLoading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#00C853]" />
      </div>
    );
  }
  if (error || !data) {
    return <p className={`${opsPage} text-rose-600`}>{(error as Error)?.message || "Not found"}</p>;
  }

  return (
    <div className={opsPage}>
      <Link to="/admin/agencies" className={`${opsMuted} inline-flex items-center gap-1 hover:underline`}>
        <ArrowLeft className="h-3 w-3" /> Agencies
      </Link>
      <header>
        <h2 className={opsTitle}>{data.name}</h2>
        <p className={opsSubtitle}>
          {data.email} · {data.phone || "no office phone"} · owner {data.ownerName || "-"}
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-4">
        <Kpi label="Open jobs" value={String(data.kpis.openJobs)} />
        <Kpi label="Past their fix time" value={String(data.kpis.overdue)} danger={data.kpis.overdue > 0} />
        <Kpi label="Median time to respond (30 d)" value={minutes(data.kpis.medianRespondMinutes)} />
        <Kpi label="Median time to fix (30 d)" value={minutes(data.kpis.medianFixMinutes)} />
      </section>

      <Avenues agencyId={id} avenues={data.avenues} onChange={refresh} />
      <Links agencyId={id} links={data.links} avenues={data.avenues} onChange={refresh} />
    </div>
  );
}

function Kpi({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className={`${opsCard} p-4`}>
      <div className={opsMuted}>{label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${danger ? "text-rose-600" : "text-slate-900 dark:text-white"}`}>
        {value}
      </div>
    </div>
  );
}

function Avenues({
  agencyId,
  avenues,
  onChange,
}: {
  agencyId: string;
  avenues: { id: string; name: string; city: string; notes?: string }[];
  onChange: () => void;
}) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const add = useMutation({
    mutationFn: () => platformApi.createAvenue(agencyId, { name, city }),
    onSuccess: () => {
      setName("");
      setCity("");
      onChange();
    },
  });
  const remove = useMutation({
    mutationFn: (avenueId: string) => platformApi.deleteAvenue(agencyId, avenueId),
    onSuccess: onChange,
  });

  return (
    <section className={`${opsCard} space-y-3 p-5`}>
      <h3 className="font-semibold text-slate-900 dark:text-white">Avenues</h3>
      <ul className="space-y-1">
        {avenues.map((a) => (
          <li key={a.id} className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-200">
            <span>
              {a.name}
              {a.city ? <span className={`${opsMuted} ml-2`}>{a.city}</span> : null}
            </span>
            <button
              type="button"
              className="text-slate-400 hover:text-rose-600"
              onClick={() => remove.mutate(a.id)}
              aria-label={`Remove ${a.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
        {avenues.length === 0 ? <li className={opsMuted}>No avenue yet</li> : null}
      </ul>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) add.mutate();
        }}
      >
        <input className={opsInput} placeholder="Avenue name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={opsInput} placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
        <button type="submit" className={opsBtnGhost} disabled={!name.trim() || add.isPending}>
          <Plus className="h-4 w-4" /> Add avenue
        </button>
      </form>
    </section>
  );
}

function Links({
  agencyId,
  links,
  avenues,
  onChange,
}: {
  agencyId: string;
  links: AgencyLink[];
  avenues: { id: string; name: string }[];
  onChange: () => void;
}) {
  const [editing, setEditing] = useState<AgencyLink | "new" | null>(null);
  const unlink = useMutation({
    mutationFn: (linkId: string) => platformApi.unlinkRestaurant(agencyId, linkId),
    onSuccess: onChange,
  });

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-white">Restaurants serviced</h3>
        <button type="button" className={opsBtnPrimary} onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" /> Connect restaurant
        </button>
      </div>
      {editing ? (
        <LinkForm
          agencyId={agencyId}
          link={editing === "new" ? null : editing}
          avenues={avenues}
          onDone={() => {
            setEditing(null);
            onChange();
          }}
        />
      ) : null}
      <div className={opsTableWrap}>
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className={opsTh}>Restaurant</th>
              <th className={opsTh}>Avenue</th>
              <th className={opsTh}>Handles</th>
              <th className={opsTh}>Critical / high (respond · fix)</th>
              <th className={opsTh}>Status</th>
              <th className={opsTh} />
            </tr>
          </thead>
          <tbody>
            {links.map((link) => (
              <tr key={link.id} className={opsRow}>
                <td className={opsTd}>
                  <Link to={`/admin/tenants/${link.client.id}`} className={opsLink}>
                    {link.client.name}
                  </Link>
                </td>
                <td className={opsTd}>{link.avenue?.name || "-"}</td>
                <td className={opsTd}>{link.scopes.map((s) => SCOPE_LABEL[s]).join(", ")}</td>
                <td className={`${opsTd} tabular-nums`}>
                  {minutes(link.targets.critical.respond)} · {minutes(link.targets.critical.fix)}
                  <div className={opsMuted}>
                    {minutes(link.targets.high.respond)} · {minutes(link.targets.high.fix)}
                  </div>
                </td>
                <td className={opsTd}>
                  {link.active ? <span className={opsBadgeOk}>Active</span> : <span className={opsBadgeDanger}>Off</span>}
                </td>
                <td className={`${opsTd} space-x-2 whitespace-nowrap text-right`}>
                  <button type="button" className={opsLink} onClick={() => setEditing(link)}>
                    Edit
                  </button>
                  {link.active ? (
                    <button type="button" className="text-sm text-rose-600 hover:underline" onClick={() => unlink.mutate(link.id)}>
                      Disconnect
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
            {links.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                  No restaurant connected yet
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function LinkForm({
  agencyId,
  link,
  avenues,
  onDone,
}: {
  agencyId: string;
  link: AgencyLink | null;
  avenues: { id: string; name: string }[];
  onDone: () => void;
}) {
  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState(link?.client.id || "");
  const [avenueId, setAvenueId] = useState(link?.avenue?.id || avenues[0]?.id || "");
  const [scopes, setScopes] = useState<AgencyScope[]>(link?.scopes || [...AGENCY_SCOPES]);
  const [targets, setTargets] = useState<AgencyTargets>(link?.targets || DEFAULT_TARGETS);
  const [context, setContext] = useState(link?.context || "");
  const tenants = useQuery({
    queryKey: ["platform-tenants-pick", search],
    queryFn: () => platformApi.tenants({ q: search, status: "active", page_size: "20" }),
    enabled: !link && search.trim().length >= 2,
  });
  const choices = (tenants.data?.results || []).filter((t) => t.restaurant_type !== "agency");
  const save = useMutation({
    mutationFn: () =>
      link
        ? platformApi.updateLink(agencyId, link.id, { avenueId: avenueId || null, scopes, targets, context, active: true })
        : platformApi.linkRestaurant(agencyId, { clientId, avenueId: avenueId || null, scopes, targets, context }),
    onSuccess: onDone,
  });
  const toggle = (scope: AgencyScope) =>
    setScopes((current) => (current.includes(scope) ? current.filter((s) => s !== scope) : [...current, scope]));
  const setTarget = (urgency: keyof AgencyTargets, key: "respond" | "fix", value: string) =>
    setTargets((t) => ({ ...t, [urgency]: { ...t[urgency], [key]: Math.max(1, Number(value) || 1) } }));

  return (
    <form
      className={`${opsCard} space-y-4 p-5`}
      onSubmit={(e) => {
        e.preventDefault();
        if ((link || clientId) && scopes.length) save.mutate();
      }}
    >
      <h4 className="font-semibold text-slate-900 dark:text-white">
        {link ? `Edit ${link.client.name}` : "Connect a restaurant"}
      </h4>
      {!link ? (
        <div className="space-y-2">
          <input
            className={`${opsInput} w-full`}
            placeholder="Search a restaurant by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {choices.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setClientId(t.id)}
                className={clientId === t.id ? opsBtnPrimary : opsBtnGhost}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <label className="block space-y-1">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Avenue</span>
        <select className={`${opsInput} w-full`} value={avenueId} onChange={(e) => setAvenueId(e.target.value)}>
          <option value="">No avenue</option>
          {avenues.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="space-y-1">
        <legend className="text-xs font-medium text-slate-600 dark:text-slate-300">The agency handles</legend>
        <div className="flex flex-wrap gap-4">
          {AGENCY_SCOPES.map((scope) => (
            <label key={scope} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input type="checkbox" checked={scopes.includes(scope)} onChange={() => toggle(scope)} />
              {SCOPE_LABEL[scope]}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
          Targets for this restaurant (minutes). Miya sets each job's urgency; these are the times that apply.
        </div>
        <table className="mt-2 text-sm">
          <thead>
            <tr>
              <th className={opsTh}>Urgency</th>
              <th className={opsTh}>Respond within</th>
              <th className={opsTh}>Fix within</th>
            </tr>
          </thead>
          <tbody>
            {AGENCY_URGENCIES.map((u) => (
              <tr key={u}>
                <td className={`${opsTd} capitalize`}>{u}</td>
                <td className={opsTd}>
                  <input
                    type="number"
                    min={1}
                    className={`${opsInput} w-24`}
                    value={targets[u].respond}
                    onChange={(e) => setTarget(u, "respond", e.target.value)}
                    aria-label={`${u} respond minutes`}
                  />
                </td>
                <td className={opsTd}>
                  <input
                    type="number"
                    min={1}
                    className={`${opsInput} w-24`}
                    value={targets[u].fix}
                    onChange={(e) => setTarget(u, "fix", e.target.value)}
                    aria-label={`${u} fix minutes`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
          What Miya should know when judging urgency here
        </span>
        <textarea
          className={`${opsInput} h-20 w-full py-2`}
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Opens at 08:00. The walk-in fridge is critical during service."
        />
      </label>
      {save.error ? <p className="text-sm text-rose-600">{(save.error as Error).message}</p> : null}
      <div className="flex gap-2">
        <button type="submit" className={opsBtnPrimary} disabled={(!link && !clientId) || !scopes.length || save.isPending}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {link ? "Save" : "Connect"}
        </button>
        <button type="button" className={opsBtnGhost} onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}
