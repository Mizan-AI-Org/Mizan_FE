import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { useLanguage } from "@/hooks/use-language";
import { askMiya, focusEntityForMiya } from "@/lib/miyaPageContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyOpsState, MiyaLoadingState, SectionHeader, SeverityBadge } from "@/components/os";

export type MiyaActivityItem = {
  id: string;
  timestamp?: string;
  created_at?: string;
  actor?: string;
  action?: string;
  action_verb?: string;
  reason?: string;
  summary?: string;
  result?: string;
  verification_status?: string;
  failed?: boolean;
  failure_message?: string;
  can_undo?: boolean;
  undo_hint?: string;
  href?: string;
  ask_miya_prompt?: string;
  entity_type?: string;
  entity_id?: string;
  entity_label?: string;
  event_type?: string;
  detail?: {
    what?: string;
    why?: string;
    based_on?: string;
    what_happened?: string;
    what_should_i_do?: string;
    previous_state?: Record<string, unknown>;
    new_state?: Record<string, unknown>;
    evidence?: Array<{ kind?: string; id?: string; label?: string; href?: string }>;
    related_timeline?: Array<{
      id: string;
      event_type?: string;
      summary?: string;
      created_at?: string;
    }>;
  };
};

function formatTime(iso?: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function StatusIcon({ item }: { item: MiyaActivityItem }) {
  if (item.failed || item.result === "failed" || item.verification_status === "failed") {
    return <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-critical" aria-hidden />;
  }
  if (item.verification_status === "unverified" || item.result === "partial") {
    return <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-high" aria-hidden />;
  }
  return <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />;
}

type Props = {
  items?: MiyaActivityItem[];
  className?: string;
  compact?: boolean;
  /** When true, fetch from /api/miya/activity/ instead of using items prop */
  fetchRemote?: boolean;
  queryKey?: unknown[];
  title?: string;
  subtitle?: string;
};

export function MiyaActivityTimeline({
  items: itemsProp,
  className,
  compact = false,
  fetchRemote = false,
  queryKey = ["miya", "activity"],
  title: titleProp,
  subtitle: subtitleProp,
}: Props) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const qc = useQueryClient();
  const title = titleProp || t("activity.title");
  const subtitle = subtitleProp || t("activity.subtitle");
  const [openId, setOpenId] = useState<string | null>(null);

  const remote = useQuery({
    queryKey,
    queryFn: () => api.getMiyaActivity({ limit: compact ? 12 : 40 }) as Promise<{ items: MiyaActivityItem[] }>,
    enabled: fetchRemote,
    staleTime: 15_000,
    refetchInterval: fetchRemote ? 60_000 : false,
  });

  const detailQuery = useQuery({
    queryKey: ["miya", "activity", openId],
    queryFn: () => api.getMiyaActivityDetail(openId!) as Promise<MiyaActivityItem>,
    enabled: Boolean(openId),
  });

  const undo = useMutation({
    mutationFn: (id: string) => api.undoMiyaActivity(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["miya", "activity"] });
      void qc.invalidateQueries({ queryKey: ["miya", "command-center"] });
      if (openId) void qc.invalidateQueries({ queryKey: ["miya", "activity", openId] });
    },
  });

  const items = useMemo(() => {
    if (fetchRemote) return remote.data?.items || [];
    return itemsProp || [];
  }, [fetchRemote, remote.data, itemsProp]);

  const openItem = detailQuery.data || items.find((i) => i.id === openId) || null;

  const openEntity = (item: MiyaActivityItem) => {
    if (item.entity_type && item.entity_id) {
      focusEntityForMiya({
        entity_type: item.entity_type,
        entity_id: item.entity_id,
        entity_label: item.entity_label || item.summary,
        route: item.href,
      });
    }
    if (item.href) navigate(item.href);
  };

  return (
    <section aria-label="Miya activity" className={cn("space-y-3", className)}>
      <SectionHeader eyebrow={t("activity.eyebrow")} title={title} description={subtitle} />

      {fetchRemote && remote.isLoading ? (
        <MiyaLoadingState message={t("activity.loading")} variant="inline" />
      ) : items.length === 0 ? (
        <EmptyOpsState
          title={t("activity.empty_title")}
          description={t("activity.empty_desc")}
        />
      ) : (
        <ul className="divide-y divide-border/80 overflow-hidden rounded-panel border border-border/80 bg-card">
          {items.slice(0, compact ? 8 : 40).map((ev) => {
            const line = ev.action || ev.summary || t("activity.miya_action");
            const failed = Boolean(ev.failed || ev.result === "failed");
            return (
              <li
                key={ev.id}
                className="flex flex-wrap items-start justify-between gap-3 bg-card/80 px-4 py-3"
              >
                <div className="flex min-w-0 items-start gap-2">
                  <StatusIcon item={ev} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-meta tabular-nums text-muted-foreground">
                        {formatTime(ev.timestamp || ev.created_at)}
                      </span>
                      {ev.action_verb ? (
                        <span className="text-caption text-muted-foreground">{ev.action_verb}</span>
                      ) : null}
                      {failed ? <SeverityBadge level="CRITICAL" label={t("activity.failed")} /> : null}
                    </div>
                    <button
                      type="button"
                      className="mt-0.5 text-left text-body font-medium text-foreground hover:underline"
                      onClick={() => setOpenId(ev.id)}
                    >
                      {line}
                    </button>
                    {failed && ev.failure_message ? (
                      <p className="mt-1 text-meta text-critical">{ev.failure_message}</p>
                    ) : null}
                    {ev.entity_label && ev.entity_label !== line ? (
                      <p className="text-meta text-muted-foreground">{ev.entity_label}</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button type="button" size="sm" variant="ghost" onClick={() => setOpenId(ev.id)}>
                    {t("activity.open")}
                  </Button>
                  {ev.href ? (
                    <Button type="button" size="sm" variant="ghost" onClick={() => openEntity(ev)}>
                      {t("common.view")}
                    </Button>
                  ) : null}
                  {ev.can_undo ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      disabled={undo.isPending}
                      onClick={() => undo.mutate(ev.id)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                      {t("activity.undo")}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="gap-1"
                    onClick={() =>
                      askMiya({
                        prompt: ev.ask_miya_prompt || t("activity.explain_prompt", { action: line }),
                        pageContext: {
                          entity_type: ev.entity_type,
                          entity_id: ev.entity_id,
                          entity_label: ev.entity_label || line,
                          route: typeof window !== "undefined" ? window.location.pathname : "/dashboard",
                        },
                      })
                    }
                  >
                    <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                    {t("nav.ask_miya")}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {openId ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Activity detail"
        >
          <button
            type="button"
            className="absolute inset-0 bg-foreground/40"
            aria-label="Close activity detail"
            onClick={() => setOpenId(null)}
          />
          <div className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-panel border border-border bg-card p-5 shadow-strong">
            {detailQuery.isLoading && !openItem?.detail ? (
              <MiyaLoadingState message={t("activity.loading_detail")} variant="inline" />
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-caption text-muted-foreground">
                      {openItem?.actor || "Miya"} · {formatTime(openItem?.timestamp || openItem?.created_at)}
                    </p>
                    <h3 className="mt-1 text-page-title text-foreground">
                      {openItem?.detail?.what || openItem?.action || openItem?.summary}
                    </h3>
                  </div>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setOpenId(null)}>
                    {t("common.close")}
                  </Button>
                </div>

                <dl className="mt-4 space-y-3 text-body">
                  <div>
                    <dt className="text-caption text-muted-foreground">{t("activity.detail.why")}</dt>
                    <dd className="mt-1 type-secondary text-foreground">
                      {openItem?.detail?.why || openItem?.reason || "-"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-caption text-muted-foreground">{t("activity.detail.based_on")}</dt>
                    <dd className="mt-1 type-secondary text-foreground">
                      {openItem?.detail?.based_on || t("activity.detail.based_on_default")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-caption text-muted-foreground">{t("activity.detail.what_happened")}</dt>
                    <dd
                      className={cn(
                        "mt-1 type-secondary",
                        openItem?.failed ? "text-critical" : "text-foreground",
                      )}
                    >
                      {openItem?.detail?.what_happened ||
                        openItem?.failure_message ||
                        openItem?.summary ||
                        "-"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-caption text-muted-foreground">{t("activity.detail.what_should_i_do")}</dt>
                    <dd className="mt-1 type-secondary text-foreground">
                      {openItem?.detail?.what_should_i_do || t("activity.detail.what_should_i_do_default")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-caption text-muted-foreground">{t("activity.detail.verification")}</dt>
                    <dd className="mt-1 text-meta uppercase tracking-wide text-muted-foreground">
                      {openItem?.verification_status || "-"} · {openItem?.result || "-"}
                    </dd>
                  </div>
                </dl>

                {openItem?.detail?.related_timeline && openItem.detail.related_timeline.length > 0 ? (
                  <div className="mt-4">
                    <p className="text-caption text-muted-foreground">{t("activity.detail.related_timeline")}</p>
                    <ul className="mt-2 space-y-1.5">
                      {openItem.detail.related_timeline.slice(0, 8).map((r) => (
                        <li key={r.id} className="text-meta text-muted-foreground">
                          {formatTime(r.created_at)} · {r.summary || r.event_type}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-2">
                  {openItem?.can_undo ? (
                    <Button
                      type="button"
                      className="gap-1.5"
                      disabled={undo.isPending}
                      onClick={() => openItem && undo.mutate(openItem.id)}
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden />
                      {openItem.undo_hint || t("activity.undo")}
                    </Button>
                  ) : null}
                  {openItem?.href ? (
                    <Button type="button" variant="outline" onClick={() => openItem && openEntity(openItem)}>
                      {t("activity.open_record")}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() =>
                      askMiya({
                        prompt:
                          openItem?.ask_miya_prompt ||
                          t("activity.explain_prompt", { action: openItem?.action || openItem?.summary || "" }),
                        pageContext: {
                          entity_type: openItem?.entity_type,
                          entity_id: openItem?.entity_id,
                          entity_label: openItem?.entity_label || openItem?.summary,
                          route: typeof window !== "undefined" ? window.location.pathname : "/dashboard",
                        },
                      })
                    }
                  >
                    <MessageSquare className="h-4 w-4" aria-hidden />
                    {t("nav.ask_miya")}
                  </Button>
                </div>

                {undo.isError ? (
                  <p className="mt-3 type-secondary text-critical">{t("activity.undo_failed")}</p>
                ) : null}
                {undo.isSuccess && !(undo.data as { ok?: boolean })?.ok ? (
                  <p className="mt-3 type-secondary text-critical">
                    {(undo.data as { message?: string })?.message || t("activity.undo_not_verified")}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default MiyaActivityTimeline;
