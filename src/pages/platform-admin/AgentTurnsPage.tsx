import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, Search } from "lucide-react";
import OpsPagination from "@/components/platform-admin/OpsPagination";
import { platformApi } from "@/lib/platformApi";
import {
  opsBadgeDanger,
  opsBadgeOk,
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

const PAGE_SIZE = 25;

function SuccessBadge({ ok }: { ok: boolean | null }) {
  if (ok === true) return <span className={opsBadgeOk}>OK</span>;
  if (ok === false) return <span className={opsBadgeDanger}>Fail</span>;
  return <span className={opsBadgeWarn}>—</span>;
}

export default function AgentTurnsPage() {
  const [searchParams] = useSearchParams();
  const userIdFilter = searchParams.get("user_id") || "";
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [channel, setChannel] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["platform-agent-turns", submitted, channel, userIdFilter, page],
    queryFn: () =>
      platformApi.agentTurns({
        ...(submitted ? { q: submitted } : {}),
        ...(channel ? { channel } : {}),
        ...(userIdFilter ? { user_id: userIdFilter } : {}),
        page: String(page),
        page_size: String(PAGE_SIZE),
      }),
  });

  return (
    <div className={opsPage}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className={opsTitle}>Agent turns</h2>
          <p className={opsSubtitle}>
            Every agent interaction across tenants
            {typeof data?.count === "number" ? ` · ${data.count} total` : ""}
            {userIdFilter ? (
              <>
                {" · "}
                <Link to={`/admin/users/${userIdFilter}`} className={opsLink}>Filtered by user</Link>
              </>
            ) : null}
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
            value={channel}
            onChange={(e) => {
              setPage(1);
              setChannel(e.target.value);
            }}
            className={opsInput}
            aria-label="Channel filter"
          >
            <option value="">All channels</option>
            <option value="dashboard">Dashboard</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="mobile">Mobile</option>
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Message, intent, conversation…"
              className={`${opsInput} w-64 pl-9`}
            />
          </div>
          <button type="submit" className={opsBtnPrimary}>Search</button>
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
                <th className={opsTh}>When</th>
                <th className={opsTh}>User</th>
                <th className={opsTh}>Tenant</th>
                <th className={opsTh}>Channel</th>
                <th className={opsTh}>Input</th>
                <th className={opsTh}>Intent</th>
                <th className={opsTh}>Result</th>
                <th className={opsTh} />
              </tr>
            </thead>
            <tbody className={isFetching ? "opacity-60" : ""}>
              {(data?.results || []).map((row) => (
                <tr key={row.id} className={opsRow}>
                  <td className={`${opsTd} whitespace-nowrap text-xs ${opsMuted}`}>
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className={opsTd}>
                    {row.user ? (
                      <Link to={`/admin/users/${row.user}`} className={opsLink}>
                        {row.user_email || row.user}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={opsTd}>
                    <Link to={`/admin/tenants/${row.restaurant}`} className={opsLink}>
                      {row.restaurant_name}
                    </Link>
                  </td>
                  <td className={`${opsTd} font-mono text-xs`}>{row.channel}</td>
                  <td className={`${opsTd} max-w-[200px] truncate`} title={row.input_text}>
                    {row.input_text}
                  </td>
                  <td className={`${opsTd} max-w-[140px] truncate font-mono text-xs`}>
                    {row.interpreted_intent || "—"}
                  </td>
                  <td className={opsTd}>
                    <SuccessBadge ok={row.execution_success} />
                  </td>
                  <td className={opsTd}>
                    <Link to={`/admin/agent/turns/${row.id}`} className={opsLink}>
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {(data?.results || []).length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No agent turns recorded yet
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
