import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
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
  type MiyaQualityAssessment,
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
import { conversationTurnBlocks } from "@/lib/agentConversationTurns";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;
const LONG_MESSAGE_CHARS = 280;
const LONG_MESSAGE_LINES = 5;

type DatePreset = "today" | "yesterday" | "last_7_days" | "last_30_days";

const ADMIN_ROLE_RANK: Record<string, number> = {
  SUPER_ADMIN: 0,
  ADMIN: 1,
  OWNER: 2,
  MANAGER: 3,
};

function roleInboxRank(role?: string | null) {
  if (!role) return 100;
  return ADMIN_ROLE_RANK[role.toUpperCase()] ?? 50;
}

function isElevatedRole(role?: string | null) {
  return roleInboxRank(role) <= 3;
}

function turnTimestamp(iso?: string | null) {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function CollapsibleMessageText({
  text,
  className,
  collapsedLines = LONG_MESSAGE_LINES,
}: {
  text: string;
  className?: string;
  collapsedLines?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const content = (text || "").trim();
  const lineCount = content ? content.split(/\n/).length : 0;
  const isLong = content.length > LONG_MESSAGE_CHARS || lineCount > collapsedLines;

  if (!content) return null;

  return (
    <div className={cn("min-w-0", className)}>
      <p
        className={cn(
          "whitespace-pre-wrap break-words text-slate-800 dark:text-slate-100",
        )}
        style={
          isLong && !expanded
            ? {
                display: "-webkit-box",
                WebkitLineClamp: collapsedLines,
                WebkitBoxOrient: "vertical" as const,
                overflow: "hidden",
              }
            : undefined
        }
      >
        {content}
      </p>
      {isLong ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
          aria-expanded={expanded}
        >
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")}
          />
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}

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

function channelDisplay(channel?: string, label?: string) {
  if (label) return label;
  if (!channel) return "Unknown";
  if (channel === "proactive_whatsapp") return "Proactive";
  if (channel === "whatsapp") return "WhatsApp";
  if (channel === "dashboard") return "Dashboard";
  return channel.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function channelBadgeClass(channel?: string) {
  if (channel === "dashboard") {
    return "bg-blue-500/15 text-blue-700 dark:text-blue-300";
  }
  if (channel === "proactive_whatsapp") {
    return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  }
  return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
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

function qualityStatusLabel(status?: string) {
  if (!status) return "Unknown";
  if (status === "HEALTHY") return "Healthy";
  if (status === "NEEDS_REVIEW") return "Needs review";
  if (status === "CRITICAL") return "Critical";
  if (status === "FAILED") return "Failed";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function qualityBadgeClass(status?: string) {
  if (status === "HEALTHY") return opsBadgeOk;
  if (status === "CRITICAL" || status === "FAILED") return opsBadgeDanger;
  if (status === "NEEDS_REVIEW") return opsBadgeWarn;
  return "rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300";
}

function qualityScoreDisplay(score?: number | null) {
  if (score == null || Number.isNaN(score)) return "-";
  return Math.round(score);
}

function dimensionLabel(dimension: string) {
  return dimension
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function dimensionStatusIcon(status?: string) {
  if (status === "PASS") return "✓";
  if (status === "FAIL") return "✕";
  if (status === "PARTIAL") return "~";
  if (status === "NOT_APPLICABLE") return "-";
  return "?";
}

function QualityPanel({
  quality,
  humanReviews,
}: {
  quality?: MiyaQualityAssessment | null;
  humanReviews?: MiyaConversationTurn["human_reviews"];
}) {
  if (!quality) {
    return (
      <section className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Quality</p>
        <p className={cn(opsMuted, "mt-2")}>No quality assessment for this turn.</p>
      </section>
    );
  }

  if (quality.overall_state === "NOT_EVALUATED") {
    return (
      <section className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Quality</p>
        <p className={cn(opsMuted, "mt-2")}>Not evaluated (historical or session-only turn).</p>
      </section>
    );
  }

  const critical = (quality.critical_failure_count || 0) > 0 || quality.overall_status === "CRITICAL";
  const latestHuman = humanReviews?.[0];

  return (
    <section className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Quality</p>

      {critical ? (
        <p className="mt-2 text-sm font-bold text-rose-600 dark:text-rose-400">Critical failure</p>
      ) : null}

      <div className="mt-2 space-y-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Automated</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {qualityScoreDisplay(quality?.overall_score)}
              <span className="text-sm font-normal text-slate-500"> / 100</span>
            </p>
            <span className={qualityBadgeClass(quality?.overall_status)}>
              {qualityStatusLabel(quality?.overall_status)}
            </span>
            {quality?.overall_state ? (
              <span className={opsMuted}>State: {quality.overall_state}</span>
            ) : null}
          </div>
        </div>

        {latestHuman ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-2 dark:border-amber-900/40 dark:bg-amber-950/20">
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              Human review
            </p>
            <p className="mt-1 text-sm font-semibold">{latestHuman.status.replace(/_/g, " ")}</p>
            {latestHuman.failure_category ? (
              <p className={cn(opsMuted, "text-xs")}>Category: {latestHuman.failure_category}</p>
            ) : null}
          </div>
        ) : (
          <p className={cn(opsMuted, "text-sm")}>Human review: none</p>
        )}
      </div>

      {quality.dimension_scores?.length ? (
        <div className="mt-4 grid gap-1 sm:grid-cols-2">
          {quality.dimension_scores.map((dim) => (
            <div key={dim.dimension} className="flex items-center justify-between gap-2 text-sm">
              <span>{dimensionLabel(dim.dimension)}</span>
              <span
                className={cn(
                  "font-mono text-xs",
                  dim.status === "PASS"
                    ? "text-emerald-600"
                    : dim.status === "FAIL"
                      ? "text-rose-600"
                      : "text-slate-500",
                )}
              >
                {dimensionStatusIcon(dim.status)} {dim.status}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {quality.failures?.length ? (
        <div className="mt-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-rose-600">Failures</p>
          <ul className="mt-2 space-y-1">
            {quality.failures.map((failure) => (
              <li key={`${failure.code}-${failure.reason}`} className="text-sm text-rose-700 dark:text-rose-300">
                <span className="font-medium">{failure.code.replace(/_/g, " ")}</span>
                <span className={opsMuted}>: {failure.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className={cn(opsMuted, "mt-4")}>Failures: none</p>
      )}

      {quality.evidence?.length ? (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold">Evidence</summary>
          <ul className="mt-2 space-y-1 text-sm">
            {quality.evidence.map((ev) => (
              <li key={`${ev.dimension}-${ev.source}`}>
                <span className="font-medium">{ev.source || "System"}</span>
                {ev.reason ? <span className={opsMuted}>: {ev.reason}</span> : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
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
              <span
                className={cn(
                  "inline-flex rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                  channelBadgeClass(item.channel),
                )}
              >
                {channelDisplay(item.channel, item.channel_label)}
              </span>
              <p className="mt-1 truncate font-semibold text-slate-900 dark:text-white">
                {item.user?.name || "Unknown user"}
              </p>
              <p className={opsMuted}>
                {item.user?.role || "Unknown role"}
                {item.restaurant?.name ? ` · ${item.restaurant.name}` : ""}
              </p>
              {isElevatedRole(item.user?.role) ? (
                <span className="mt-1 inline-flex rounded bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                  Admin / manager
                </span>
              ) : null}
            </div>
            <span className={opsMuted}>{formatTime(item.last_message_at)}</span>
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
            {item.last_message_preview ? `"${item.last_message_preview}"` : "No preview"}
          </p>
          {item.quality_failure_preview ? (
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">
              {item.quality_failure_preview}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={opsMuted}>{statusLabel(item.status)}</span>
            <span className={healthBadge(item.health)}>{healthLabel(item.health)}</span>
            {item.has_critical_failure ? (
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">Critical failure</span>
            ) : null}
            {item.quality_score != null || item.quality_status ? (
              <span className={qualityBadgeClass(item.quality_status)}>
                {qualityScoreDisplay(item.quality_score)} {qualityStatusLabel(item.quality_status)}
              </span>
            ) : null}
            {item.session_only ? (
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                Session history only
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
}

function TurnInspector({
  turn,
  conversationId,
  onReview,
  onReEvaluated,
}: {
  turn: MiyaConversationTurn;
  conversationId: string;
  onReview: (payload: {
    status: string;
    reason?: string;
    failure_category?: string;
    severity?: string;
  }) => void;
  onReEvaluated: () => void;
}) {
  const [showTechnical, setShowTechnical] = useState(false);
  const [reEvaluating, setReEvaluating] = useState(false);
  const [reviewStatus, setReviewStatus] = useState("NEEDS_REVIEW");
  const trace = turn.trace || {};

  const handleReEvaluate = async () => {
    if (!window.confirm(
      "Re-run Agent's quality evaluator for this turn? This does not execute any operational action.",
    )) {
      return;
    }
    setReEvaluating(true);
    try {
      await platformApi.miyaConversationReEvaluate(conversationId, { turn_id: turn.id });
      onReEvaluated();
    } finally {
      setReEvaluating(false);
    }
  };

  return (
    <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
      {turn.user_message ? (
        <section>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            User asked
          </p>
          <div className="mt-1 text-sm">
            <CollapsibleMessageText text={turn.user_message} />
          </div>
        </section>
      ) : null}

      {turn.understanding?.summary ? (
        <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/50">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">
            Agent understood
          </p>
          <p className="mt-1 text-sm">{turn.understanding.summary}</p>
          {turn.understanding.entity?.label ? (
            <p className={cn(opsMuted, "mt-2")}>
              Entity: {turn.understanding.entity.type || "item"}: {turn.understanding.entity.label}
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
                  <span className={opsMuted}>: {stage.detail}</span>
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
                  <span className={opsMuted}>: {stage.detail}</span>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {turn.actions?.length ? (
        <section>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Agent did
          </p>
          <ul className="mt-2 space-y-1">
            {turn.actions.map((action) => (
              <li key={action.tool} className="text-sm">
                <span className={action.success ? "text-emerald-600" : "text-rose-600"}>
                  {action.success ? "✓" : "✕"}
                </span>{" "}
                {action.label}
                {action.reason ? (
                  <span className={opsMuted}>: {action.reason}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {turn.miya_reply ? (
        <section>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Agent replied
          </p>
          <div className="mt-1 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm">
            <CollapsibleMessageText text={turn.miya_reply} />
          </div>
        </section>
      ) : null}

      <QualityPanel quality={turn.quality} humanReviews={turn.human_reviews} />

      {turn.is_proactive ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">
            Agent · Proactive
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
              ["Workflow", trace.workflow],
              ["Operation ID", trace.operation_id || trace.operationId],
              ["Entity type", trace.entity_type],
              ["Entity ID", trace.entity_id],
              ["Resolution", trace.resolution_state],
              ["Resolution source", trace.resolution_source || trace.resolutionSource],
              ["Resolution confidence", trace.resolution_confidence ?? trace.resolutionConfidence],
              ["Category", trace.category],
              ["Assignee", trace.assignee],
              ["Status", trace.status],
              ["Status before", trace.status_before || trace.statusBefore],
              ["Status after", trace.status_after || trace.statusAfter],
              ["Operation", trace.operation_mode],
              ["Execution", trace.execution_result || trace.executionResult || trace.outcome],
              ["Response mode", trace.response_mode],
              ["Language", trace.language],
              ["Language source", trace.language_source],
              ["Runtime path", turn.runtime_path || trace.runtime_path],
              ["Goal status", trace.goal_status],
              ["Goal type", trace.goal_type],
              ["Goal blockers", trace.goal_blocker_count],
              ["Readiness", trace.readiness_state],
              ["Attention count", trace.attention_count],
              ["Decision source", trace.decision_source],
              ["Action runtime", trace.action_runtime_used ? "yes" : "-"],
              ["Authorization", trace.authorization_result || (trace.outcome === "denied" ? "DENIED" : "-")],
              ["Verification", trace.verification_result || trace.verificationResult || (trace.verified === false ? "FAILED" : trace.verified ? "VERIFIED" : "-")],
              ["Failure reason", trace.failure_reason || trace.failureReason],
              ["Notification", trace.notification_delivery_status],
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
        <button type="button" className={opsBtnPrimary} onClick={() => onReview({ status: "CORRECT" })}>
          Mark correct
        </button>
        <select
          value={reviewStatus}
          onChange={(e) => setReviewStatus(e.target.value)}
          className={opsInput}
        >
          <option value="NEEDS_REVIEW">Needs review</option>
          <option value="INCORRECT">Incorrect</option>
          <option value="PARTIALLY_CORRECT">Partially correct</option>
          <option value="UNSAFE">Unsafe</option>
        </select>
        <button
          type="button"
          className={opsBtnGhost}
          onClick={() =>
            onReview({
              status: reviewStatus,
              reason: "manual_review",
              failure_category: "entity",
              severity: "HIGH",
            })
          }
        >
          Submit human review
        </button>
        {!turn.session_only ? (
          <button type="button" className={opsBtnGhost} onClick={handleReEvaluate} disabled={reEvaluating}>
            {reEvaluating ? "Re-evaluating..." : "Re-evaluate"}
          </button>
        ) : null}
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
    mutationFn: (payload: {
      status: string;
      reason?: string;
      failure_category?: string;
      severity?: string;
    }) =>
      platformApi.miyaConversationQuality(conversationId, {
        status: payload.status,
        reason: payload.reason,
        notes,
        turn_id: selectedTurnId || undefined,
        failure_category: payload.failure_category,
        severity: payload.severity,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-miya-conversation", conversationId] });
      qc.invalidateQueries({ queryKey: ["platform-miya-conversation-turns", conversationId] });
      setNotes("");
    },
  });

  const detail = detailQuery.data as MiyaConversationDetail | undefined;
  const turnsNewestFirst = useMemo(() => {
    const turns = turnsQuery.data?.results || [];
    return [...turns].sort((a, b) => turnTimestamp(b.created_at) - turnTimestamp(a.created_at));
  }, [turnsQuery.data?.results]);
  const selectedTurn =
    turnsNewestFirst.find((t) => t.id === selectedTurnId) || turnsNewestFirst[0] || null;

  return (
    <div className={cn(opsCard, "flex h-full min-h-0 flex-col overflow-hidden")}>
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
            Agent conversation
          </p>
          <h3 className="mt-1 truncate text-lg font-bold text-slate-900 dark:text-white">
            {detail?.user?.name || "Conversation"}
          </h3>
          <p className={cn(opsMuted, "truncate")}>
            {detail?.restaurant?.name || "No tenant"}
            {detail?.user?.role ? ` · ${detail.user.role}` : ""}
            {detail?.channel ? ` · ${channelDisplay(detail.channel)}` : ""}
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

            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                Messages
              </p>
              <p className={opsMuted}>Newest first</p>
            </div>

            <div className="space-y-3">
              {turnsNewestFirst.map((turn) => {
                const isSelected = selectedTurn?.id === turn.id;
                const blocks = conversationTurnBlocks(turn);
                return (
                  <div
                    key={turn.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedTurnId(turn.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedTurnId(turn.id);
                      }
                    }}
                    className={cn(
                      "block w-full cursor-pointer rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      isSelected
                        ? "border-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/20"
                        : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600",
                    )}
                  >
                    <div className="space-y-3">
                      {blocks.map((block, idx) => (
                        <div key={`${turn.id}-${block.speaker}-${idx}`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                              {turn.is_proactive ? "Agent · Proactive" : block.speaker === "user" ? "User" : "Agent"}
                            </span>
                            {idx === 0 ? (
                              <span className={opsMuted}>{formatTime(turn.created_at)}</span>
                            ) : null}
                          </div>
                          <div className="mt-1">
                            <CollapsibleMessageText text={block.text} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {!turnsNewestFirst.length ? (
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
                      {detail.context.active_entity.type}: {detail.context.active_entity.label}
                    </p>
                  ) : null}
                  {detail.context.recent_entities?.length ? (
                    <div>
                      <p className={opsMuted}>Recent entities</p>
                      <ul className="mt-1 space-y-1">
                        {detail.context.recent_entities.map((ent, idx) => (
                          <li key={`${ent.id || idx}`}>
                            {ent.type}: {ent.label}
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
                conversationId={conversationId}
                onReview={(payload) => reviewMutation.mutate(payload)}
                onReEvaluated={() => {
                  qc.invalidateQueries({ queryKey: ["platform-miya-conversation-turns", conversationId] });
                }}
              />
            ) : (
              <p className={opsMuted}>Select a message to inspect Agent behavior.</p>
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

export default function AgentConversationsPage() {
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [page, setPage] = useState(1);
  const [channel, setChannel] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [health, setHealth] = useState("");
  const [quality, setQuality] = useState("");
  const [failureCategory, setFailureCategory] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("today");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [metricsOpen, setMetricsOpen] = useState(false);

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
      quality,
      failureCategory,
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
        ...(quality ? { quality } : {}),
        ...(failureCategory ? { failure_category: failureCategory } : {}),
        date: datePreset,
      }),
  });

  const metrics = metricsQuery.data as MiyaConversationMetrics | undefined;
  const conversations = useMemo(() => {
    const rows = listQuery.data?.results || [];
    return [...rows].sort(
      (a, b) => turnTimestamp(b.last_message_at) - turnTimestamp(a.last_message_at),
    );
  }, [listQuery.data?.results]);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedId) || null,
    [conversations, selectedId],
  );

  return (
    <div className="space-y-6 p-6 sm:p-8 max-w-[90rem]">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className={opsTitle}>Agent Conversations</h2>
          <p className={opsSubtitle}>
            Monitor how Agent interacts with users across WhatsApp and Mizan.
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

      <div className={cn(opsCard, "overflow-hidden p-0")}>
        <div className="grid gap-px bg-slate-200 dark:bg-slate-800 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "Conversations", value: metrics?.conversations_today ?? "-" },
            { label: "Active now", value: metrics?.active_now ?? "-" },
            { label: "Needs review", value: metrics?.needs_review ?? "-" },
            { label: "Errors", value: metrics?.errors ?? "-" },
            { label: "Avg response", value: metrics?.avg_response_time_label || "-" },
          ].map((m) => (
            <div key={m.label} className="bg-white px-4 py-3 dark:bg-slate-900">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                {m.label}
              </p>
              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{m.value}</p>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setMetricsOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 border-t border-slate-200 px-4 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/60"
          aria-expanded={metricsOpen}
        >
          <span>Channel, quality, and failure detail</span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", metricsOpen && "rotate-180")} />
        </button>
        {metricsOpen ? (
          <div className="space-y-4 border-t border-slate-200 p-4 dark:border-slate-700">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <MetricCard label="WhatsApp" value={metrics?.whatsapp_conversations ?? "-"} />
              <MetricCard label="Dashboard" value={metrics?.dashboard_conversations ?? "-"} />
              <MetricCard label="Proactive" value={metrics?.proactive_conversations ?? "-"} />
              <MetricCard label="Staff" value={metrics?.staff_conversations ?? "-"} />
              <MetricCard label="Managers" value={metrics?.manager_conversations ?? "-"} />
              <MetricCard label="Agent actions" value={metrics?.miya_actions ?? "-"} />
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { label: "Critical", value: "CRITICAL" },
                { label: "Needs review", value: "NEEDS_REVIEW" },
                { label: "Unreviewed", value: "UNREVIEWED" },
                { label: "Healthy", value: "HEALTHY" },
              ].map((chip) => (
                <button
                  key={chip.value}
                  type="button"
                  className={cn(
                    opsBtnGhost,
                    quality === chip.value && "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20",
                  )}
                  onClick={() => {
                    setPage(1);
                    setQuality(quality === chip.value ? "" : chip.value);
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard
                label="Overall quality"
                value={
                  metrics?.overall_quality_score != null
                    ? qualityScoreDisplay(metrics.overall_quality_score)
                    : "Insufficient data"
                }
              />
              <MetricCard label="Pass turns" value={metrics?.correct_turns ?? "Insufficient data"} />
              <MetricCard label="Partial turns" value={metrics?.partial_turns ?? "Insufficient data"} />
              <MetricCard label="Unknown turns" value={metrics?.unknown_turns ?? "Insufficient data"} />
              <MetricCard
                label="Quality coverage"
                value={metrics?.quality_coverage?.label ?? "Insufficient data"}
                hint={metrics?.quality_coverage?.warning ? "Coverage below 100%" : undefined}
              />
            </div>

            {metrics?.failure_sources?.length ? (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  Failure sources
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {metrics.failure_sources.map((src) => (
                    <div key={src.category} className="text-sm">
                      <span className="font-medium capitalize">{src.category}</span>
                      <span className={opsMuted}>
                        : {src.pct}% ({src.count})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
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
              {channelDisplay(ch)}
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
          <option value="">All health</option>
          <option value="healthy">Good</option>
          <option value="needs_review">Needs review</option>
          <option value="error">Error</option>
        </select>
        <select
          value={quality}
          onChange={(e) => {
            setPage(1);
            setQuality(e.target.value);
          }}
          className={opsInput}
        >
          <option value="">All quality</option>
          {(filtersQuery.data?.quality || ["HEALTHY", "NEEDS_REVIEW", "CRITICAL", "FAILED", "UNREVIEWED"]).map(
            (qStatus) => (
              <option key={qStatus} value={qStatus}>
                {qualityStatusLabel(qStatus)}
              </option>
            ),
          )}
        </select>
        <select
          value={failureCategory}
          onChange={(e) => {
            setPage(1);
            setFailureCategory(e.target.value);
          }}
          className={opsInput}
        >
          <option value="">All failure categories</option>
          {(filtersQuery.data?.failure_categories || []).map((cat) => (
            <option key={cat} value={cat}>
              {cat.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <button type="submit" className={opsBtnPrimary}>
          Search
        </button>
      </form>

      <div className="grid h-[min(72vh,44rem)] min-h-[24rem] items-stretch gap-4 xl:grid-cols-[26rem_minmax(0,1fr)]">
        <div className={cn(opsCard, "flex h-full min-h-0 flex-col overflow-hidden")}>
          <div className="shrink-0 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
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
              {" · "}
              Newest first
            </p>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            {listQuery.isLoading ? (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-[#00C853]" />
              </div>
            ) : listQuery.error ? (
              <p className="p-4 text-rose-600">{(listQuery.error as Error).message}</p>
            ) : conversations.length ? (
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
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
              <div className="flex flex-1 items-center justify-center p-8 text-center">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">No conversations found</p>
                  <p className={cn(opsMuted, "mt-1")}>
                    {submitted || channel || role || status || health || quality || failureCategory
                      ? "No persisted Agent turns match the current search and filters. Try widening the date range or clearing filters."
                      : "No persisted Agent conversations for this date range yet. Turns appear here after WhatsApp, dashboard, or proactive Agent activity."}
                  </p>
                </div>
              </div>
            )}
          </div>

          {listQuery.data ? (
            <div className="mt-auto shrink-0 border-t border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
              <OpsPagination
                page={page}
                pageSize={PAGE_SIZE}
                total={listQuery.data.count}
                onPageChange={setPage}
              />
            </div>
          ) : null}
        </div>

        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          {selectedId ? (
            <ConversationDetailPanel
              conversationId={selectedId}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <div
              className={cn(
                opsCard,
                "flex h-full min-h-0 flex-1 flex-col items-center justify-center p-8 text-center",
              )}
            >
              <MessageSquare className="h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
                Select a conversation
              </p>
              <p className={cn(opsMuted, "mt-1 max-w-md")}>
                {selectedConversation
                  ? "Open a conversation to inspect what Agent understood, did, and replied."
                  : "Choose a row from the inbox to debug Agent behavior across understanding, execution, and verification."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
