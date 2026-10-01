import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ChevronDown, Loader2, Search, Sunrise } from "lucide-react";
import OpsPagination from "@/components/platform-admin/OpsPagination";
import OpsDateRangeFilter from "@/components/platform-admin/OpsDateRangeFilter";
import { dateRangeQueryParams } from "@/lib/opsDateRange";
import { platformApi, type PlatformBriefing, type PlatformBriefingRecipient } from "@/lib/platformApi";
import { cn } from "@/lib/utils";
import {
  opsBadgeDanger,
  opsBadgeOk,
  opsBadgeWarn,
  opsBtnPrimary,
  opsCard,
  opsInput,
  opsLink,
  opsMuted,
  opsPage,
  opsSubtitle,
  opsTitle,
} from "@/components/platform-admin/opsStyles";

const PAGE_SIZE = 25;

const KIND_FILTERS = [
  { id: "", label: "All" },
  { id: "morning", label: "Morning briefings" },
  { id: "evening", label: "Evening debriefings" },
] as const;

function roleLabel(role: string) {
  if (role === "OWNER") return "Owner";
  if (role === "MANAGER") return "Manager";
  return role || "Recipient";
}

function statusBadge(status: string) {
  if (status === "sent") return <span className={opsBadgeOk}>Sent</span>;
  if (status === "no_recipients") return <span className={opsBadgeWarn}>No recipients</span>;
  return <span className={opsBadgeDanger}>{status.replace(/_/g, " ")}</span>;
}

function channelLabel(channel: string) {
  if (channel === "whatsapp") return "WhatsApp";
  if (channel === "in_app") return "In-app";
  return channel;
}

function audienceLine(row: PlatformBriefing) {
  const parts: string[] = [];
  if (row.owner_count) parts.push(`${row.owner_count} owner${row.owner_count === 1 ? "" : "s"}`);
  if (row.manager_count) parts.push(`${row.manager_count} manager${row.manager_count === 1 ? "" : "s"}`);
  return parts.join(" · ") || "No owners or managers";
}

function RecipientRow({ person }: { person: PlatformBriefingRecipient }) {
  const channels = Object.entries(person.channels || {});
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/60">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
          {person.name || person.email || "Unknown recipient"}
        </p>
        <p className={opsMuted}>
          {roleLabel(person.role)}
          {person.email ? ` · ${person.email}` : ""}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {channels.map(([channel, outcome]) => (
          <span
            key={channel}
            className={outcome === "sent" || outcome === "SENT" ? opsBadgeOk : opsBadgeDanger}
          >
            {channelLabel(channel)} {outcome}
          </span>
        ))}
      </div>
    </li>
  );
}

function BriefingCard({ row }: { row: PlatformBriefing }) {
  const [open, setOpen] = useState(false);
  const preview = (row.body || row.error || "").replace(/\s+/g, " ").trim();

  return (
    <article className={opsCard}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start gap-3 px-4 py-4 text-left"
        aria-expanded={open}
      >
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
          <Sunrise className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-slate-900 dark:text-white">{row.kind_label}</span>
            {statusBadge(row.status)}
            <span className={opsMuted}>{row.local_date || "—"}</span>
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
            <Link
              to={`/admin/tenants/${row.restaurant_id}`}
              className={opsLink}
              onClick={(event) => event.stopPropagation()}
            >
              {row.restaurant_name || "Tenant"}
            </Link>
            <span className={opsMuted}>{audienceLine(row)}</span>
          </span>
          {preview ? (
            <span className="mt-2 block truncate text-sm text-slate-500 dark:text-slate-400">{preview}</span>
          ) : (
            <span className="mt-2 block text-sm text-slate-400">No message text stored for this send.</span>
          )}
        </span>
        <ChevronDown className={cn("mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="space-y-4 border-t border-slate-100 px-4 py-4 dark:border-slate-800">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800 dark:text-slate-100">
            {row.body || row.error || "The text of this briefing was not stored."}
          </pre>
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Sent to
            </p>
            {row.recipients.length ? (
              <ul className="space-y-2">
                {row.recipients.map((person) => (
                  <RecipientRow key={`${person.user_id}-${person.role}`} person={person} />
                ))}
              </ul>
            ) : (
              <p className={opsMuted}>No owner or manager deliveries recorded.</p>
            )}
          </div>
        </div>
      ) : null}
    </article>
  );
}

export default function BriefingsPage() {
  const [kind, setKind] = useState("");
  const [role, setRole] = useState("");
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["platform-briefings", kind, role, submitted, dateFrom, dateTo, page],
    queryFn: () =>
      platformApi.briefings({
        ...(kind ? { kind } : {}),
        ...(role ? { role } : {}),
        ...(submitted ? { q: submitted } : {}),
        ...dateRangeQueryParams(dateFrom, dateTo),
        page: String(page),
        page_size: String(PAGE_SIZE),
      }),
  });

  return (
    <div className={opsPage}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className={opsTitle}>Briefings</h2>
          <p className={opsSubtitle}>
            Daily morning briefings and evening debriefings for owners and managers
            {typeof data?.count === "number" ? ` · ${data.count}` : ""}
          </p>
        </div>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setSubmitted(q.trim());
          }}
        >
          <select
            value={role}
            onChange={(event) => {
              setPage(1);
              setRole(event.target.value);
            }}
            className={opsInput}
            aria-label="Recipient role"
          >
            <option value="">Owners and managers</option>
            <option value="OWNER">Owners only</option>
            <option value="MANAGER">Managers only</option>
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Tenant or briefing text…"
              className={`${opsInput} w-56 pl-9`}
            />
          </div>
          <button type="submit" className={opsBtnPrimary}>
            Search
          </button>
        </form>
      </header>

      <OpsDateRangeFilter
        dateFrom={dateFrom}
        dateTo={dateTo}
        onChange={({ dateFrom: nextFrom, dateTo: nextTo }) => {
          setPage(1);
          setDateFrom(nextFrom);
          setDateTo(nextTo);
        }}
      />

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Briefing kind">
        {KIND_FILTERS.map((filter) => {
          const active = kind === filter.id;
          return (
            <button
              key={filter.id || "all"}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setPage(1);
                setKind(filter.id);
              }}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
                active
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800",
              )}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#00C853]" />
        </div>
      ) : error ? (
        <p className="text-rose-600 dark:text-rose-400">{(error as Error).message}</p>
      ) : (
        <div className={cn("space-y-3", isFetching && "opacity-60")}>
          {(data?.results || []).map((row) => (
            <BriefingCard key={row.id} row={row} />
          ))}
          {(data?.results || []).length === 0 ? (
            <div className={`${opsCard} px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400`}>
              No sent morning briefings or evening debriefings match this filter.
            </div>
          ) : null}
          <OpsPagination
            page={page}
            pageSize={PAGE_SIZE}
            total={data?.count ?? 0}
            onPageChange={setPage}
            className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
      )}
    </div>
  );
}
