import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import OpsPagination from "@/components/platform-admin/OpsPagination";
import { platformApi } from "@/lib/platformApi";
import {
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

export default function ConversationsPage() {
  const [channel, setChannel] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: ["platform-agent-conversations", channel, page],
    queryFn: () =>
      platformApi.agentConversations({
        ...(channel ? { channel } : {}),
        page: String(page),
        page_size: String(PAGE_SIZE),
      }),
  });

  return (
    <div className={opsPage}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className={opsTitle}>Conversations</h2>
          <p className={opsSubtitle}>
            Agent threads grouped by conversation ID
            {typeof data?.count === "number" ? ` · ${data.count} total` : ""}
          </p>
        </div>
        <div className="flex gap-2">
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
          <button type="button" className={opsBtnPrimary} onClick={() => refetch()}>
            Refresh
          </button>
        </div>
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
                <th className={opsTh}>Last active</th>
                <th className={opsTh}>User</th>
                <th className={opsTh}>Tenant</th>
                <th className={opsTh}>Channel</th>
                <th className={opsTh}>Turns</th>
                <th className={opsTh}>Success / Fail</th>
                <th className={opsTh}>Avg conf.</th>
                <th className={opsTh} />
              </tr>
            </thead>
            <tbody className={isFetching ? "opacity-60" : ""}>
              {(data?.results || []).map((row) => (
                <tr key={row.conversation_id} className={opsRow}>
                  <td className={`${opsTd} whitespace-nowrap text-xs ${opsMuted}`}>
                    {new Date(row.last_at).toLocaleString()}
                  </td>
                  <td className={opsTd}>
                    {row.user_id ? (
                      <Link to={`/admin/users/${row.user_id}`} className={opsLink}>
                        {row.user_email || row.user_id}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={opsTd}>
                    {row.restaurant_id ? (
                      <Link to={`/admin/tenants/${row.restaurant_id}`} className={opsLink}>
                        {row.restaurant_name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={`${opsTd} font-mono text-xs`}>{row.channel}</td>
                  <td className={opsTd}>{row.turn_count}</td>
                  <td className={opsTd}>
                    <span className="text-emerald-600 dark:text-emerald-400">{row.success_count}</span>
                    {" / "}
                    <span className="text-rose-600 dark:text-rose-400">{row.fail_count}</span>
                  </td>
                  <td className={opsTd}>{(row.avg_confidence * 100).toFixed(0)}%</td>
                  <td className={opsTd}>
                    <Link
                      to={`/admin/agent/conversations/${encodeURIComponent(row.conversation_id)}`}
                      className={opsLink}
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
              {(data?.results || []).length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No conversations recorded yet
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
