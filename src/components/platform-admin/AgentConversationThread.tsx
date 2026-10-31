import React from "react";
import { Link } from "react-router-dom";
import { Camera, ExternalLink } from "lucide-react";
import type { PlatformAgentTurn } from "@/lib/platformApi";
import { parseOpsUserMessage } from "@/lib/opsConversationMessage";
import { cn } from "@/lib/utils";
import { opsLink, opsMuted } from "@/components/platform-admin/opsStyles";

export type MessageViewMode = "original" | "english";

type TranslationMap = Record<string, { text_en: string; source_language?: string }>;

type Props = {
  turns: PlatformAgentTurn[];
  viewMode: MessageViewMode;
  translations: TranslationMap;
};

function displayText(
  id: string,
  original: string,
  viewMode: MessageViewMode,
  translations: TranslationMap,
): { body: string; translated: boolean; sourceLanguage?: string } {
  const trimmed = (original || "").trim();
  if (!trimmed) {
    return { body: "—", translated: false };
  }
  if (viewMode === "english") {
    const hit = translations[id];
    if (hit?.text_en) {
      return {
        body: hit.text_en,
        translated: hit.text_en !== trimmed,
        sourceLanguage: hit.source_language,
      };
    }
  }
  return { body: trimmed, translated: false };
}

function PhotoUserBubble({ parsed }: { parsed: Extract<ReturnType<typeof parseOpsUserMessage>, { type: "photo" }> }) {
  const r = parsed.reading;
  const mediaId = parsed.mediaId;
  const rows = [
    r.summary && { label: "Summary", value: r.summary },
    r.kind && r.kind !== "unknown" && { label: "Type", value: r.kind },
    r.vendor && r.vendor !== "unknown" && { label: "Vendor", value: r.vendor },
    r.amount && r.amount !== "unknown" && {
      label: "Amount",
      value: [r.amount, r.currency !== "unknown" ? r.currency : ""].filter(Boolean).join(" "),
    },
    r.date && r.date !== "unknown" && { label: "Date", value: r.date },
    r.invoiceNumber && r.invoiceNumber !== "unknown" && { label: "Invoice #", value: r.invoiceNumber },
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <div className="space-y-2">
      <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-200/80 dark:bg-slate-700/80 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
        <Camera className="h-3.5 w-3.5" aria-hidden />
        Photo message
      </div>
      {rows.length ? (
        <dl className="grid gap-1.5 text-sm">
          {rows.map((row) => (
            <div key={row.label}>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{row.label}</dt>
              <dd className="text-slate-800 dark:text-slate-100 whitespace-pre-wrap">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className={`text-sm ${opsMuted}`}>No document details extracted.</p>
      )}
      {mediaId ? <p className={`text-[10px] font-mono ${opsMuted}`}>media {mediaId}</p> : null}
    </div>
  );
}

function UserBubble({
  turn,
  viewMode,
  translations,
}: {
  turn: PlatformAgentTurn;
  viewMode: MessageViewMode;
  translations: TranslationMap;
}) {
  const parsed = parseOpsUserMessage(turn.input_text || "");
  const inputId = `${turn.id}-input`;
  const { body, translated, sourceLanguage } = displayText(
    inputId,
    parsed.type === "text" ? parsed.displayText : turn.input_text || "",
    viewMode,
    translations,
  );

  return (
    <div className="flex justify-end">
      <div className="max-w-[min(100%,42rem)] rounded-2xl rounded-br-md border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-800/90 px-4 py-3 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
          User
          {translated && sourceLanguage && sourceLanguage !== "en" ? (
            <span className="ml-2 font-normal normal-case text-slate-400">from {sourceLanguage}</span>
          ) : null}
        </p>
        {parsed.type === "photo" && viewMode === "original" ? (
          <PhotoUserBubble parsed={parsed} />
        ) : (
          <p className="text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap">{body}</p>
        )}
      </div>
    </div>
  );
}

function AgentBubble({
  turn,
  viewMode,
  translations,
}: {
  turn: PlatformAgentTurn;
  viewMode: MessageViewMode;
  translations: TranslationMap;
}) {
  const responseId = `${turn.id}-response`;
  const { body, translated, sourceLanguage } = displayText(
    responseId,
    turn.response_text || "",
    viewMode,
    translations,
  );
  const failed = turn.execution_success === false;

  return (
    <div className="flex justify-start">
      <div
        className={cn(
          "max-w-[min(100%,42rem)] rounded-2xl rounded-bl-md border px-4 py-3 shadow-sm",
          failed
            ? "border-rose-200 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-950/30"
            : "border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/25",
        )}
      >
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Agent
            {translated && sourceLanguage && sourceLanguage !== "en" ? (
              <span className="ml-2 font-normal normal-case text-emerald-600/80 dark:text-emerald-500/80">
                from {sourceLanguage}
              </span>
            ) : null}
          </p>
          {turn.interpreted_intent ? (
            <span className="rounded bg-white/60 dark:bg-slate-900/60 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
              {turn.interpreted_intent}
            </span>
          ) : null}
          {failed ? (
            <span className="rounded bg-rose-100 dark:bg-rose-950/80 px-1.5 py-0.5 text-[10px] font-bold uppercase text-rose-700 dark:text-rose-300">
              Failed
            </span>
          ) : null}
        </div>
        <p className="text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap">{body}</p>
      </div>
    </div>
  );
}

export default function AgentConversationThread({ turns, viewMode, translations }: Props) {
  return (
    <div className="space-y-8">
      {turns.map((turn, index) => {
        const when = turn.created_at ? new Date(turn.created_at).toLocaleString() : "—";
        return (
          <section key={turn.id} className="space-y-3" aria-label={`Turn ${index + 1}`}>
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              <span className={`text-xs font-medium ${opsMuted}`}>Turn {index + 1}</span>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-600">·</span>
              <time className={`text-xs ${opsMuted}`} dateTime={turn.created_at}>
                {when}
              </time>
              {turn.user_email ? (
                <>
                  <span className="hidden sm:inline text-slate-300 dark:text-slate-600">·</span>
                  <span className={`text-xs ${opsMuted}`}>{turn.user_email}</span>
                </>
              ) : null}
              <Link
                to={`/admin/agent/turns/${turn.id}`}
                className={cn(opsLink, "ml-auto inline-flex items-center gap-1 text-xs")}
              >
                Inspect turn
                <ExternalLink className="h-3 w-3" aria-hidden />
              </Link>
            </div>
            <UserBubble turn={turn} viewMode={viewMode} translations={translations} />
            <AgentBubble turn={turn} viewMode={viewMode} translations={translations} />
          </section>
        );
      })}
    </div>
  );
}
