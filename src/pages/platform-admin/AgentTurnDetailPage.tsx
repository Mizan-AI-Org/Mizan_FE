import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import OpsBackNav from "@/components/platform-admin/OpsBackNav";
import { platformApi } from "@/lib/platformApi";
import {
  opsBadgeDanger,
  opsBadgeOk,
  opsCard,
  opsLink,
  opsMuted,
  opsPage,
  opsSubtitle,
  opsTitle,
} from "@/components/platform-admin/opsStyles";

export default function AgentTurnDetailPage() {
  const { id = "" } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["platform-agent-turn", id],
    queryFn: () => platformApi.agentTurn(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#00C853]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-rose-600">{(error as Error)?.message || "Turn not found"}</div>
    );
  }

  return (
    <div className={opsPage}>
      <OpsBackNav to="/admin/agent/turns" label="Agent turns" />

      <header>
        <h2 className={opsTitle}>Turn detail</h2>
        <p className={opsSubtitle}>
          {new Date(data.created_at).toLocaleString()} · {data.channel} · {data.total_ms}ms
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Info label="User" value={data.user_email || "—"} link={data.user ? `/admin/users/${data.user}` : undefined} />
        <Info label="Tenant" value={data.restaurant_name} link={`/admin/tenants/${data.restaurant}`} />
        <Info
          label="Conversation"
          value={data.conversation_id || "—"}
          link={data.conversation_id ? `/admin/agent/conversations/${encodeURIComponent(data.conversation_id)}` : undefined}
        />
        <Info label="Intent" value={data.interpreted_intent || "—"} />
        <Info label="Confidence" value={`${(data.confidence_score * 100).toFixed(0)}% (${data.confidence_level})`} />
        <Info label="Capability" value={data.primary_capability || "—"} />
        <Info label="Deploy version" value={data.deploy_version || "—"} />
        <Info
          label="Execution"
          value={data.execution_success === true ? "Success" : data.execution_success === false ? "Failed" : "Unknown"}
        />
        {data.evaluation ? (
          <Info
            label="Quality scores"
            value={`Q ${data.evaluation.quality_score} · A ${data.evaluation.accuracy_score} · H ${data.evaluation.helpfulness_score}`}
          />
        ) : null}
      </div>

      <section className={`${opsCard} p-5 space-y-3`}>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">User message</h3>
        <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{data.input_text}</p>
      </section>

      <section className={`${opsCard} p-5 space-y-3`}>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Agent response</h3>
        <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{data.response_text || "—"}</p>
        {data.user_thumbs_up !== null ? (
          <p className={`text-xs ${opsMuted}`}>
            User feedback: {data.user_thumbs_up ? "👍" : "👎"}
            {data.user_feedback_text ? ` — ${data.user_feedback_text}` : ""}
          </p>
        ) : null}
      </section>

      {data.capability_executions.length > 0 ? (
        <section className={`${opsCard} p-5 space-y-4`}>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Capability executions ({data.capability_executions.length})
          </h3>
          {data.capability_executions.map((cap) => (
            <div
              key={cap.id}
              className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-semibold">{cap.capability_name}</span>
                {cap.execution_success ? (
                  <span className={opsBadgeOk}>OK</span>
                ) : cap.execution_success === false ? (
                  <span className={opsBadgeDanger}>Fail</span>
                ) : null}
              </div>
              <p className={`text-xs ${opsMuted}`}>
                Auth: {cap.authorization_result || "—"} · {cap.total_ms}ms
                {cap.execution_error_code ? ` · ${cap.execution_error_code}` : ""}
              </p>
              {Object.keys(cap.input_parameters || {}).length > 0 ? (
                <pre className="text-xs overflow-x-auto rounded bg-slate-50 dark:bg-slate-950 p-2 text-slate-600 dark:text-slate-400">
                  {JSON.stringify(cap.input_parameters, null, 2)}
                </pre>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      {Object.keys(data.run_metadata || {}).length > 0 ? (
        <section className={`${opsCard} p-5 space-y-3`}>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Run metadata</h3>
          <pre className="text-xs overflow-x-auto rounded bg-slate-50 dark:bg-slate-950 p-3 text-slate-600 dark:text-slate-400">
            {JSON.stringify(data.run_metadata, null, 2)}
          </pre>
        </section>
      ) : null}
    </div>
  );
}

function Info({ label, value, link }: { label: string; value: string; link?: string }) {
  return (
    <div className={`${opsCard} px-4 py-3`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </p>
      {link ? (
        <Link to={link} className={`mt-1 block text-sm ${opsLink}`}>{value}</Link>
      ) : (
        <p className="mt-1 text-sm text-slate-900 dark:text-slate-100 break-all">{value}</p>
      )}
    </div>
  );
}
