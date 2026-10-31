import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Languages, Loader2 } from "lucide-react";
import AgentConversationThread, {
  type MessageViewMode,
} from "@/components/platform-admin/AgentConversationThread";
import OpsBackNav from "@/components/platform-admin/OpsBackNav";
import {
  opsCard,
  opsLink,
  opsMuted,
  opsPage,
  opsSubtitle,
  opsTitle,
} from "@/components/platform-admin/opsStyles";
import {
  conversationLikelyNonEnglish,
  opsUserMessagePlainText,
} from "@/lib/opsConversationMessage";
import { platformApi, type PlatformAgentTurn } from "@/lib/platformApi";
import { cn } from "@/lib/utils";

function buildTranslationSegments(turns: PlatformAgentTurn[]) {
  const segments: Array<{ id: string; text: string }> = [];
  for (const turn of turns) {
    const input = opsUserMessagePlainText(turn.input_text || "");
    if (input.trim()) {
      segments.push({ id: `${turn.id}-input`, text: input });
    }
    const response = (turn.response_text || "").trim();
    if (response) {
      segments.push({ id: `${turn.id}-response`, text: response });
    }
  }
  return segments;
}

export default function ConversationDetailPage() {
  const { conversationId = "" } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["platform-agent-conversation", conversationId],
    queryFn: () => platformApi.agentConversation(conversationId),
    enabled: !!conversationId,
  });

  const likelyNonEnglish = useMemo(
    () => (data?.turns ? conversationLikelyNonEnglish(data.turns) : false),
    [data?.turns],
  );

  const [viewMode, setViewMode] = useState<MessageViewMode>("original");
  const [translationMap, setTranslationMap] = useState<
    Record<string, { text_en: string; source_language?: string }>
  >({});
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [serviceAvailable, setServiceAvailable] = useState(true);

  const translateMutation = useMutation({
    mutationFn: (segments: Array<{ id: string; text: string }>) =>
      platformApi.agentTranslate(segments),
    onSuccess: (result) => {
      setServiceAvailable(result.service_available);
      const next: Record<string, { text_en: string; source_language?: string }> = {};
      for (const seg of result.segments) {
        next[seg.id] = { text_en: seg.text_en, source_language: seg.source_language };
      }
      setTranslationMap(next);
      setTranslateError(null);
    },
    onError: (err: Error) => {
      setTranslateError(err.message || "Translation failed");
    },
  });

  useEffect(() => {
    if (!data?.turns?.length) {
      return;
    }
    setViewMode(likelyNonEnglish ? "english" : "original");
    setTranslationMap({});
    setTranslateError(null);
  }, [conversationId, data?.turns, likelyNonEnglish]);

  useEffect(() => {
    if (viewMode !== "english" || !data?.turns?.length) {
      return;
    }
    const segments = buildTranslationSegments(data.turns);
    if (!segments.length) {
      return;
    }
    const missing = segments.some((s) => !translationMap[s.id]);
    if (!missing && Object.keys(translationMap).length > 0) {
      return;
    }
    translateMutation.mutate(segments);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch when mode or turns change
  }, [viewMode, data?.turns]);

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

  const translating = viewMode === "english" && translateMutation.isPending;

  return (
    <div className={opsPage}>
      <OpsBackNav to="/admin/agent/conversations" label="Conversations" />

      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
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
          </div>

          <div className="flex flex-col items-end gap-2">
            <div
              className="inline-flex rounded-lg border border-slate-200 dark:border-slate-600 p-0.5 bg-white dark:bg-slate-900"
              role="group"
              aria-label="Message language"
            >
              <button
                type="button"
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                  viewMode === "english"
                    ? "bg-[#00E676] text-slate-900"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800",
                )}
                onClick={() => setViewMode("english")}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Languages className="h-3.5 w-3.5" aria-hidden />
                  English
                </span>
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                  viewMode === "original"
                    ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800",
                )}
                onClick={() => setViewMode("original")}
              >
                Original
              </button>
            </div>
            {translating ? (
              <p className={`inline-flex items-center gap-1.5 text-xs ${opsMuted}`}>
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                Translating…
              </p>
            ) : null}
            {translateError ? (
              <p className="text-xs text-rose-600 dark:text-rose-400 max-w-xs text-right">{translateError}</p>
            ) : null}
            {viewMode === "english" && !serviceAvailable && !translating ? (
              <p className="text-xs text-amber-700 dark:text-amber-300 max-w-xs text-right">
                Translation service unavailable — showing original text.
              </p>
            ) : null}
          </div>
        </div>
      </header>

      <div className={`${opsCard} p-5 sm:p-6`}>
        <AgentConversationThread
          turns={data.turns}
          viewMode={viewMode}
          translations={translationMap}
        />
      </div>
    </div>
  );
}
