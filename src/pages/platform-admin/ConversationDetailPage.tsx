import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import OpsBackNav from "@/components/platform-admin/OpsBackNav";
import { platformApi } from "@/lib/platformApi";
import {
  opsCard,
  opsLink,
  opsMuted,
  opsPage,
  opsSubtitle,
  opsTitle,
} from "@/components/platform-admin/opsStyles";

export default function ConversationDetailPage() {
  const { conversationId = "" } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["platform-agent-conversation", conversationId],
    queryFn: () => platformApi.agentConversation(conversationId),
    enabled: !!conversationId,
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
      <div className="p-8 text-rose-600">{(error as Error)?.message || "Conversation not found"}</div>
    );
  }

  return (
    <div className={opsPage}>
      <OpsBackNav to="/admin/agent/conversations" label="Conversations" />

      <header>
        <h2 className={opsTitle}>Conversation</h2>
        <p className={opsSubtitle}>
          {data.turn_count} turns · {data.channel}
          {data.restaurant_name ? (
            <>
              {" · "}
              <Link to={`/admin/tenants/${data.restaurant_id}`} className={opsLink}>
                {data.restaurant_name}
              </Link>
            </>
          ) : null}
        </p>
        <p className={`mt-1 text-xs font-mono ${opsMuted} break-all`}>{data.conversation_id}</p>
      </header>

      <div className="space-y-4">
        {data.turns.map((turn, i) => (
          <article key={turn.id} className={`${opsCard} p-5 space-y-3`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={`text-xs ${opsMuted}`}>
                Turn {i + 1} · {new Date(turn.created_at).toLocaleString()}
                {turn.user_email ? ` · ${turn.user_email}` : ""}
              </span>
              <Link to={`/admin/agent/turns/${turn.id}`} className={opsLink}>
                Detail
              </Link>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-950/80 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">User</p>
              <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{turn.input_text}</p>
            </div>
            <div className="rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
                Agent
                {turn.interpreted_intent ? ` · ${turn.interpreted_intent}` : ""}
              </p>
              <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                {turn.response_text || "—"}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
