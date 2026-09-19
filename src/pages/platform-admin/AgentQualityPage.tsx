import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { platformApi } from "@/lib/platformApi";
import {
  opsBtnPrimary,
  opsCard,
  opsInput,
  opsMuted,
  opsPage,
  opsSubtitle,
  opsTableWrap,
  opsTd,
  opsTh,
  opsTitle,
} from "@/components/platform-admin/opsStyles";

function ScoreCard({ label, value, suffix = "" }: { label: string; value: string | number; suffix?: string }) {
  return (
    <div className={`${opsCard} px-4 py-4`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
        {value}
        {suffix}
      </p>
    </div>
  );
}

export default function AgentQualityPage() {
  const [days, setDays] = useState("7");

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["platform-agent-metrics", days],
    queryFn: () => platformApi.agentMetrics({ days }),
  });

  const successPct =
    data?.turns.success_rate != null
      ? `${(data.turns.success_rate * 100).toFixed(1)}%`
      : "—";

  return (
    <div className={opsPage}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className={opsTitle}>Agent quality</h2>
          <p className={opsSubtitle}>
            Turn volume, success rate, and heuristic accuracy scores
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className={opsInput}
            aria-label="Period"
          >
            <option value="1">Last 24h</option>
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
          </select>
          <button type="button" className={opsBtnPrimary} onClick={() => refetch()} disabled={isFetching}>
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
      ) : data ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ScoreCard label="Total turns" value={data.turns.total} />
            <ScoreCard label="Success rate" value={successPct} />
            <ScoreCard label="Avg confidence" value={`${(data.turns.avg_confidence * 100).toFixed(0)}%`} />
            <ScoreCard label="Avg latency" value={data.turns.avg_latency_ms} suffix="ms" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <ScoreCard label="Quality score" value={data.evaluation.avg_quality} />
            <ScoreCard label="Accuracy score" value={data.evaluation.avg_accuracy} />
            <ScoreCard label="Helpfulness" value={data.evaluation.avg_helpfulness} />
            <ScoreCard label="Safety" value={data.evaluation.avg_safety} />
            <ScoreCard
              label="Verification rate"
              value={`${(data.evaluation.avg_verification_rate * 100).toFixed(0)}%`}
            />
          </div>

          <p className={`text-xs ${opsMuted}`}>
            Based on {data.evaluation.count} evaluated turns since {new Date(data.since).toLocaleDateString()}.
            User feedback: {data.turns.thumbs_up} 👍 · {data.turns.thumbs_down} 👎
          </p>

          <div className="grid gap-6 lg:grid-cols-2">
            <section>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">By channel</h3>
              <div className={opsTableWrap}>
                <table className="w-full text-left">
                  <thead>
                    <tr>
                      <th className={opsTh}>Channel</th>
                      <th className={opsTh}>Turns</th>
                      <th className={opsTh}>Success</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_channel.map((row) => (
                      <tr key={row.channel}>
                        <td className={opsTd}>{row.channel}</td>
                        <td className={opsTd}>{row.count}</td>
                        <td className={opsTd}>{row.success}</td>
                      </tr>
                    ))}
                    {data.by_channel.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-slate-500">No data</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Top intents</h3>
              <div className={opsTableWrap}>
                <table className="w-full text-left">
                  <thead>
                    <tr>
                      <th className={opsTh}>Intent</th>
                      <th className={opsTh}>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top_intents.map((row) => (
                      <tr key={row.interpreted_intent}>
                        <td className={`${opsTd} font-mono text-xs`}>{row.interpreted_intent}</td>
                        <td className={opsTd}>{row.count}</td>
                      </tr>
                    ))}
                    {data.top_intents.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-4 py-6 text-center text-slate-500">No data</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {data.by_deploy_version.length > 0 ? (
            <section>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">By deploy version</h3>
              <div className={opsTableWrap}>
                <table className="w-full text-left">
                  <thead>
                    <tr>
                      <th className={opsTh}>Version</th>
                      <th className={opsTh}>Turns</th>
                      <th className={opsTh}>Success</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_deploy_version.map((row) => (
                      <tr key={row.deploy_version}>
                        <td className={`${opsTd} font-mono text-xs`}>{row.deploy_version}</td>
                        <td className={opsTd}>{row.count}</td>
                        <td className={opsTd}>{row.success}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
