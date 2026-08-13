import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import {
  platformApi,
  type MiyaConversationDetail,
  type MiyaConversationListItem,
  type MiyaConversationMetrics,
  type MiyaConversationTurn,
} from "@/lib/platformApi";
import OpsPagination from "@/components/platform-admin/OpsPagination";
import {
  opsBadgeDanger,
  opsBadgeOk,
  opsBadgeWarn,
  opsBtnGhost,
  opsBtnPrimary,
  opsCard,
  opsInput,
  opsMuted,
  opsSubtitle,
  opsTitle,
} from "@/components/platform-admin/opsStyles";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

type DatePreset = "today" | "yesterday" | "last_7_days" | "last_30_days";

function initials(name?: string | null) {
  const parts = (name || "?").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

function formatTime(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function healthBadge(health?: string) {
  if (health === "healthy") return opsBadgeOk;
  if (health === "error") return opsBadgeDanger;
  return opsBadgeWarn;
}

function healthLabel(health?: string) {
  if (health === "healthy") return "Good";
  if (health === "error") return "Error";
  return "Needs review";
}

function statusLabel(status?: string) {
  if (!status) return "Unknown";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className={cn(opsCard, "p-4")}>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      {hint ? <p className={cn(opsMuted, "mt-1")}>{hint}</p> : null}
    </div>
  );
}

function ConversationRow({
  item,
  selected,
  onSelect,
}: {
  item: MiyaConversationListItem;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full border-b border-slate-100 px-4 py-3 text-left transition-colors dark:border-slate-800",
        selected
          ? "bg-emerald-50/80 dark:bg-emerald-950/20"
          : "hover:bg-slate-50 dark:hover:bg-slate-800/60",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-bold text-emerald-700 dark:text-emerald-300">
          {initials(item.user?.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900 dark:text-white">
                {item.user?.name || "Unknown user"}
              </p>
              <p className={opsMuted}>
                {item.restaurant?.name || "No tenant"}
                {item.user?.role ? ` · ${item.user.role}` : ""}
              </p>
            </div>
            <span className={opsMuted}>{formatTime(item.last_message_at)}</span>
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
            {item.last_message_preview ? `"${item.last_message_preview}"` : "No preview"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {item.channel}
            </span>
            <span className={opsMuted}>{statusLabel(item.status)}</span>
            <span className={healthBadge(item.health)}>{healthLabel(item.health)}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function TurnInspector({
  turn,
  onFlag,
}: {
  turn: MiyaConversationTurn;
  onFlag: (reason: string) => void;
}) {
  const [showTechnical, setShowTechnical] = useState(false);
  const trace = turn.trace || {};

  return (
    <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
      {turn.user_message ? (
        <section>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            User asked
          </p>
          <p className="mt-1 text-sm text-slate-800 dark:text-slate-100">"{turn.user_message}"</p>
        </section>
      ) : null}

      {turn.understanding?.summary ? (
        <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/50">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">
            Miya understood
          </p>
          <p className="mt-1 text-sm">{turn.understanding.summary}</p>
          {turn.understanding.entity?.label ? (
            <p className={cn(opsMuted, "mt-2")}>
              Entity: {turn.understanding.entity.type || "item"} — {turn.understanding.entity.label}
            </p>
          ) : null}
        </section>
      ) : null}

      {turn.understanding?.proactive_pipeline?.length ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">
            Proactive pipeline
          </p>
          <ol className="mt-2 space-y-1">
            {turn.understanding.proactive_pipeline.map((stage) => (
              <li key={stage.stage} className="text-sm">
                <span className="font-medium">{stage.stage.replace(/_/g, " ")}</span>
                {stage.detail ? (
                  <span className={opsMuted}> — {stage.detail}</span>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {turn.understanding?.action_pipeline?.length ? (
        <section className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/50 dark:bg-blue-950/20">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700 dark:text-blue-300">
            Action pipeline
          </p>
          <ol className="mt-2 space-y-1">
            {turn.understanding.action_pipeline.map((stage) => (
              <li key={stage.stage} className="text-sm">
                <span className="font-medium">{stage.stage.replace(/_/g, " ")}</span>
                {stage.detail ? (
                  <span className={opsMuted}> — {stage.detail}</span>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {turn.actions?.length ? (
        <section>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Miya did
          </p>
          <ul className="mt-2 space-y-1">
            {turn.actions.map((action) => (
              <li key={action.tool} className="text-sm">
                <span className={action.success ? "text-emerald-600" : "text-rose-600"}>
                  {action.success ? "✓" : "✕"}
                </span>{" "}
                {action.label}
                {action.reason ? (
                  <span className={opsMuted}> — {action.reason}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {turn.miya_reply ? (
        <section>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Miya replied
          </p>
          <p className="mt-1 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-slate-800 dark:text-slate-100">
            "{turn.miya_reply}"
          </p>
        </section>
      ) : null}

      {turn.is_proactive ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">
            Miya · Proactive
          </p>
          {turn.proactive_meta?.source ? (
            <p className={cn(opsMuted, "mt-1")}>Source: {turn.proactive_meta.source}</p>
          ) : null}
        </section>
      ) : null}

      {turn.attachments?.length ? (
        <section>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Attachments
          </p>
          <div className="mt-2 grid gap-2">
            {turn.attachments.map((att) =>
              att.url && att.mime_type?.startsWith("image/") ? (
                <img
                  key={att.id}
                  src={att.url}
                  alt={att.title || "Attachment"}
                  className="max-h-48 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                />
              ) : (
                <p key={att.id} className="text-sm">
                  {att.title || "Attachment"}
                </p>
              ),
            )}
          </div>
        </section>
      ) : null}

      <button
        type="button"
        className={opsBtnGhost}
        onClick={() => setShowTechnical((v) => !v)}
      >
        {showTechnical ? "Hide technical details" : "Technical details"}
      </button>

      {showTechnical ? (
        <div className="rounded-lg border border-slate-200 bg-slate-950 p-3 text-xs text-slate-200 dark:border-slate-700">
          <dl className="grid gap-2 sm:grid-cols-2">
            {[
              ["Intent", trace.intent],
              ["Entity type", trace.entity_type],
              ["Entity ID", trace.entity_id],
              ["Resolution", trace.resolution_state],
              ["Resolution source", trace.resolution_source],
              ["Operation", trace.operation_mode],
              ["Authorization", trace.outcome === "denied" ? "DENIED" : "ALLOWED"],
              ["Execution", trace.outcome],
              ["Verification", trace.verified === false ? "FAILED" : trace.verified ? "VERIFIED" : "-"],
              ["Response mode", trace.response_mode],
              ["Language", trace.language],
              ["Language source", trace.language_source],
              ["Runtime path", turn.runtime_path || trace.runtime_path],
              ["Latency", trace.latency_ms || trace.elapsed_ms ? `${trace.latency_ms || trace.elapsed_ms}ms` : "-"],
              ["Tools", (trace.tools_called || trace.tools_selected || []).join(", ") || "-"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-slate-500">{label}</dt>
                <dd className="font-mono text-slate-100">{value || "-"}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button type="button" className={opsBtnPrimary} onClick={() => onFlag("correct")}>
          Mark as correct
        </button>
        <button type="button" className={opsBtnGhost} onClick={() => onFlag("wrong_entity")}>
          Flag for review
        </button>
      </div>
    </div>
  );
}

function ConversationDetailPanel({
  conversationId,
  onClose,
}: {
  conversationId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [selectedTurnId, setSelectedTurnId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const detailQuery = useQuery({
    queryKey: ["platform-miya-conversation", conversationId],
    queryFn: () => platformApi.miyaConversation(conversationId),
  });

  const turnsQuery = useQuery({
    queryKey: ["platform-miya-conversation-turns", conversationId],
    queryFn: () => platformApi.miyaConversationTurns(conversationId, { page_size: "100" }),
  });

  const reviewMutation = useMutation({
    mutationFn: (payload: { status: "correct" | "flagged"; reason?: string }) =>
      platformApi.miyaConversationQuality(conversationId, {
        status: payload.status,
        reason: payload.reason,
        notes,
        turn_id: selectedTurnId || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-miya-conversation", conversationId] });
      setNotes("");
    },
  });

  const detail = detailQuery.data as MiyaConversationDetail | undefined;
  const turns = turnsQuery.data?.results || [];
  const selectedTurn =
    turns.find((t) => t.id === selectedTurnId) || turns[turns.length - 1] || null;

  return (
    <div className={cn(opsCard, "flex h-full min-h-[32rem] flex-col overflow-hidden")}>
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-700">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
            Miya conversation
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
            {detail?.user?.name || "Conversation"}
          </h3>
          <p className={opsMuted}>
            {detail?.restaurant?.name || "No tenant"}
            {detail?.user?.role ? ` · ${detail.user.role}` : ""}
            {detail?.channel ? ` · ${detail.channel}` : ""}
          </p>
        </div>
        <button type="button" onClick={onClose} className={opsBtnGhost} aria-label="Close detail">
          <X className="h-4 w-4" />
        </button>
      </div>

      {detailQuery.isLoading || turnsQuery.isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#00C853]" />
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_1.1fr]">
          <div className="min-h-0 overflow-auto border-b border-slate-200 p-4 dark:border-slate-700 lg:border-b-0 lg:border-r">
            <div className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <p className={opsMuted}>Started</p>
                <p>{formatTime(detail?.started_at)}</p>
              </div>
              <div>
                <p className={opsMuted}>Status</p>
                <p>{statusLabel(detail?.status)}</p>
              </div>
              <div>
                <p className={opsMuted}>Health</p>
                <span className={healthBadge(detail?.health)}>{healthLabel(detail?.health)}</span>
              </div>
              <div>
                <p className={opsMuted}>Phone</p>
                <p>{detail?.user?.phone || "-"}</p>
              </div>
            </div>

            <div className="space-y-3">
              {turns.map((turn) => {
                const isUser = Boolean(turn.user_message) && !turn.is_proactive;
                const isSelected = selectedTurn?.id === turn.id;
                return (
                  <button
                    key={turn.id}
                    type="button"
                    onClick={() => setSelectedTurnId(turn.id)}
                    className={cn(
                      "block w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      isSelected
                        ? "border-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/20"
                        : "border-slate-200 dark:border-slate-700",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        {turn.is_proactive ? "Miya · Proactive" : isUser ? "User" : "Miya"}
                      </span>
                      <span className={opsMuted}>{formatTime(turn.created_at)}</span>
                    </div>
                    <p className="mt-1 text-slate-800 dark:text-slate-100">
                      {turn.user_message || turn.miya_reply || turn.content}
                    </p>
                  </button>
                );
              })}
              {!turns.length ? (
                <p className={opsMuted}>No messages in this conversation yet.</p>
              ) : null}
            </div>
          </div>

          <div className="min-h-0 overflow-auto p-4">
            {detail?.context ? (
              <details className="mb-4 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <summary className="cursor-pointer text-sm font-semibold">
                  Conversation context
                </summary>
                <div className="mt-3 space-y-2 text-sm">
                  {detail.context.active_entity?.label ? (
                    <p>
                      <span className={opsMuted}>Active entity: </span>
                      {detail.context.active_entity.type} — {detail.context.active_entity.label}
                    </p>
                  ) : null}
                  {detail.context.recent_entities?.length ? (
                    <div>
                      <p className={opsMuted}>Recent entities</p>
                      <ul className="mt-1 space-y-1">
                        {detail.context.recent_entities.map((ent, idx) => (
                          <li key={`${ent.id || idx}`}>
                            {ent.type} — {ent.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {detail.context.language ? (
                    <p>
                      <span className={opsMuted}>Language: </span>
                      {detail.context.language}
                    </p>
                  ) : null}
                </div>
              </details>
            ) : null}

            {selectedTurn ? (
              <TurnInspector
                turn={selectedTurn}
                onFlag={(reason) =>
                  reviewMutation.mutate({
                    status: reason === "correct" ? "correct" : "flagged",
                    reason,
                  })
                }
              />
            ) : (
              <p className={opsMuted}>Select a message to inspect Miya behavior.</p>
            )}

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal review notes (optional)"
              className={cn(opsInput, "mt-4 min-h-[72px] w-full py-2")}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function MiyaConversationsPage() {
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [page, setPage] = useState(1);
  const [channel, setChannel] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [health, setHealth] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("today");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtersQuery = useQuery({
    queryKey: ["platform-miya-conversation-filters"],
    queryFn: () => platformApi.miyaConversationFilters(),
  });

  const metricsQuery = useQuery({
    queryKey: ["platform-miya-conversation-metrics", datePreset],
    queryFn: () => platformApi.miyaConversationMetrics({ date: datePreset }),
  });

  const listQuery = useQuery({
    queryKey: [
      "platform-miya-conversations",
      submitted,
      page,
      channel,
      role,
      status,
      health,
      datePreset,
    ],
    queryFn: () =>
      platformApi.miyaConversations({
        ...(submitted ? { q: submitted } : {}),
        page: String(page),
        page_size: String(PAGE_SIZE),
        ...(channel ? { channel } : {}),
        ...(role ? { role } : {}),
        ...(status ? { status } : {}),
        ...(health ? { health } : {}),
        date: datePreset,
      }),
  });

  const metrics = metricsQuery.data as MiyaConversationMetrics | undefined;
  const conversations = listQuery.data?.results || [];

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedId) || null,
    [conversations, selectedId],
  );

  return (
    <div className="space-y-6 p-6 sm:p-8 max-w-[90rem]">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className={opsTitle}>Miya&apos;s Conversations</h2>
          <p className={opsSubtitle}>
            Monitor how Miya interacts with users across WhatsApp and Mizan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={datePreset}
            onChange={(e) => {
              setPage(1);
              setDatePreset(e.target.value as DatePreset);
            }}
            className={opsInput}
            aria-label="Date range"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last_7_days">Last 7 days</option>
            <option value="last_30_days">Last 30 days</option>
          </select>
          <button
            type="button"
            className={opsBtnGhost}
            onClick={() => {
              metricsQuery.refetch();
              listQuery.refetch();
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Conversations today" value={metrics?.conversations_today ?? "-"} />
        <MetricCard label="Active now" value={metrics?.active_now ?? "-"} />
        <MetricCard label="Needs review" value={metrics?.needs_review ?? "-"} />
        <MetricCard label="Errors" value={metrics?.errors ?? "-"} />
        <MetricCard
          label="Avg response time"
          value={metrics?.avg_response_time_label || "-"}
        />
      </div>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSubmitted(q.trim());
        }}
      >
        <div className="relative min-w-[16rem] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search conversations..."
            className={cn(opsInput, "w-full pl-9")}
          />
        </div>
        <select
          value={channel}
          onChange={(e) => {
            setPage(1);
            setChannel(e.target.value);
          }}
          className={opsInput}
        >
          <option value="">All channels</option>
          {(filtersQuery.data?.channels || []).map((ch) => (
            <option key={ch} value={ch}>
              {ch}
            </option>
          ))}
        </select>
        <select
          value={role}
          onChange={(e) => {
            setPage(1);
            setRole(e.target.value);
          }}
          className={opsInput}
        >
          <option value="">All roles</option>
          {(filtersQuery.data?.roles || []).map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          className={opsInput}
        >
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="escalated">Escalated</option>
          <option value="waiting">Waiting</option>
        </select>
        <select
          value={health}
          onChange={(e) => {
            setPage(1);
            setHealth(e.target.value);
          }}
          className={opsInput}
        >
          <option value="">All quality</option>
          <option value="healthy">Good</option>
          <option value="needs_review">Needs review</option>
          <option value="error">Error</option>
        </select>
        <button type="submit" className={opsBtnPrimary}>
          Search
        </button>
      </form>

      <div className="grid gap-4 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <div className={cn(opsCard, "overflow-hidden")}>
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-emerald-600" />
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Conversation inbox
              </p>
            </div>
            <p className={opsMuted}>
              {typeof listQuery.data?.count === "number"
                ? `${listQuery.data.count} conversations`
                : ""}
            </p>
          </div>

          {listQuery.isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#00C853]" />
            </div>
          ) : listQuery.error ? (
            <p className="p-4 text-rose-600">{(listQuery.error as Error).message}</p>
          ) : conversations.length ? (
            <div className="max-h-[calc(100vh-22rem)] overflow-auto">
              {conversations.map((item) => (
                <ConversationRow
                  key={item.id}
                  item={item}
                  selected={selectedId === item.id}
                  onSelect={() => setSelectedId(item.id)}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="font-medium text-slate-900 dark:text-white">No conversations found</p>
              <p className={cn(opsMuted, "mt-1")}>
                Try widening the date range or clearing filters.
              </p>
            </div>
          )}

          {listQuery.data ? (
            <div className="border-t border-slate-200 p-3 dark:border-slate-700">
              <OpsPagination
                page={page}
                pageSize={PAGE_SIZE}
                total={listQuery.data.count}
                onPageChange={setPage}
              />
            </div>
          ) : null}
        </div>

        <div className="min-h-[32rem]">
          {selectedId ? (
            <ConversationDetailPanel
              conversationId={selectedId}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <div
              className={cn(
                opsCard,
                "flex h-full min-h-[32rem] flex-col items-center justify-center p-8 text-center",
              )}
            >
              <MessageSquare className="h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
                Select a conversation
              </p>
              <p className={cn(opsMuted, "mt-1 max-w-md")}>
                {selectedConversation
                  ? "Open a conversation to inspect what Miya understood, did, and replied."
                  : "Choose a row from the inbox to debug Miya behavior across understanding, execution, and verification."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
