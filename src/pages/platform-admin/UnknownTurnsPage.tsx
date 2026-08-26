import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Inbox, Loader2, RefreshCw } from "lucide-react";
import { platformApi, type UnknownTurnItem } from "@/lib/platformApi";
import {
  opsBadgeWarn,
  opsBtnGhost,
  opsBtnPrimary,
  opsCard,
  opsInput,
  opsMuted,
  opsPage,
  opsSubtitle,
  opsTitle,
} from "@/components/platform-admin/opsStyles";
import { cn } from "@/lib/utils";

export default function UnknownTurnsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("open");
  const [q, setQ] = useState("");
  const params: Record<string, string> = { status, page_size: "50" };
  if (q.trim()) params.q = q.trim();

  const listQuery = useQuery({
    queryKey: ["platform-unknown-turns", status, q],
    queryFn: () => platformApi.unknownTurns(params),
  });

  const review = useMutation({
    mutationFn: ({ id, next }: { id: string; next: string }) =>
      platformApi.reviewUnknownTurn(id, { status: next }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-unknown-turns"] });
    },
  });

  const data = listQuery.data;
  const rows: UnknownTurnItem[] = data?.results || [];

  return (
    <div className={opsPage}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className={opsTitle}>Unknown phrases</h1>
          <p className={opsSubtitle}>
            Restaurant messages with no certified workflow. Review these. Do not
            auto-create specialists from this list.
          </p>
        </div>
        <button
          type="button"
          className={opsBtnGhost}
          onClick={() => listQuery.refetch()}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className={opsBadgeWarn}>
          {data?.open_count ?? 0} open
        </span>
        <select
          className={opsInput}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="open">Open</option>
          <option value="reviewed">Reviewed</option>
          <option value="certified">Certified</option>
          <option value="ignored">Ignored</option>
          <option value="all">All</option>
        </select>
        <input
          className={cn(opsInput, "min-w-[16rem]")}
          placeholder="Search phrase"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {listQuery.isLoading ? (
        <div className={cn(opsCard, "flex items-center gap-2 p-6", opsMuted)}>
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading
        </div>
      ) : rows.length === 0 ? (
        <div className={cn(opsCard, "flex items-center gap-3 p-6", opsMuted)}>
          <Inbox className="h-5 w-5" />
          No unknown phrases in this filter.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <article key={row.id} className={cn(opsCard, "p-4 space-y-2")}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {row.text}
              </p>
              <p className={opsMuted}>
                {row.kind} · {row.disposition || "logged"} · {row.channel} ·{" "}
                {row.role || "role?"} · {row.restaurant?.name || "no tenant"}
              </p>
              {row.reply ? (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Reply: {row.reply}
                </p>
              ) : null}
              {row.status === "open" ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    className={opsBtnPrimary}
                    disabled={review.isPending}
                    onClick={() => review.mutate({ id: row.id, next: "reviewed" })}
                  >
                    Mark reviewed
                  </button>
                  <button
                    type="button"
                    className={opsBtnGhost}
                    disabled={review.isPending}
                    onClick={() => review.mutate({ id: row.id, next: "ignored" })}
                  >
                    Ignore
                  </button>
                  <button
                    type="button"
                    className={opsBtnGhost}
                    disabled={review.isPending}
                    onClick={() => review.mutate({ id: row.id, next: "certified" })}
                  >
                    Certified later
                  </button>
                </div>
              ) : (
                <p className={opsMuted}>{row.status}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
