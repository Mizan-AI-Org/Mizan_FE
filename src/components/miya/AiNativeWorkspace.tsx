import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Sparkles,
  Workflow,
  Link2,
  Clock,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import { askMiya, focusEntityForMiya, setMiyaPageContext } from "@/lib/miyaPageContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ProactiveInsights } from "@/components/miya/ProactiveInsights";
import { AskMiyaButton, miyaPrompts } from "@/components/miya/AskMiyaButton";
import { SeverityBadge, MiyaLoadingState, EmptyOpsState } from "@/components/os";

export type WorkspaceModule =
  | "operations"
  | "incidents"
  | "tasks"
  | "staff"
  | "scheduling"
  | "checklists"
  | "finance"
  | "automations"
  | "analytics"
  | "settings";

type WorkspacePayload = {
  module: string;
  title?: string;
  summary?: { headline?: string; body?: string; attention_count?: number };
  attention?: Array<{
    id: string;
    severity?: string;
    title: string;
    detail?: string;
    href?: string;
    ask_miya_prompt?: string;
    entity_ids?: string[];
    category?: string;
  }>;
  proactive_insights?: Array<{
    id: string;
    fingerprint: string;
    domain: string;
    level: string;
    what: string;
    why?: string;
    impact?: string;
    recommendation?: string;
    evidence?: Array<{ kind?: string; id?: string; label?: string; href?: string }>;
    actions?: Array<{
      id: string;
      label: string;
      kind?: string;
      href?: string;
      ask_miya_prompt?: string;
    }>;
    entity_ids?: string[];
    entity_type?: string;
    priority_score?: number;
  }>;
  recommended_actions?: Array<{
    id: string;
    label: string;
    reason?: string;
    href?: string;
    ask_miya_prompt?: string;
    severity?: string;
  }>;
  nl_commands?: string[];
  related_entities?: Array<{
    entity_type: string;
    entity_id?: string;
    label: string;
    href?: string;
  }>;
  timeline?: Array<{
    id: string;
    summary: string;
    created_at?: string;
    entity_type?: string;
    entity_id?: string;
  }>;
  ask_miya?: { prompt?: string; hint?: string };
  automation_opportunities?: Array<{
    title: string;
    detail?: string;
    prompt?: string;
  }>;
  policy_note?: string;
  live?: Record<string, number>;
  counts?: Record<string, number>;
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="text-caption text-muted-foreground">{children}</h3>;
}

function moduleAskPrompt(module: WorkspaceModule, title?: string) {
  if (module === "staff") return miyaPrompts.staff();
  if (module === "scheduling") return miyaPrompts.schedule();
  if (module === "incidents") return miyaPrompts.incident();
  if (module === "tasks") return miyaPrompts.task();
  if (module === "finance") return miyaPrompts.invoice();
  return `Help me with ${title || module}. What's most important here?`;
}

type Props = {
  module: WorkspaceModule;
  className?: string;
  /** When true, start collapsed to keep domain UI primary */
  defaultCollapsed?: boolean;
  compact?: boolean;
};

/**
 * Intelligence layer above a domain module - does not replace domain functionality.
 */
export function AiNativeWorkspace({
  module,
  className,
  defaultCollapsed = true,
  compact = false,
}: Props) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  useEffect(() => {
    setMiyaPageContext({
      route:
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : `/dashboard`,
      tab: module,
      entity_type: module,
    });
  }, [module]);

  const query = useQuery({
    queryKey: ["miya", "workspace", module],
    queryFn: () => api.getMiyaModuleWorkspace(module) as Promise<WorkspacePayload>,
    staleTime: 30_000,
    refetchInterval: 90_000,
  });

  const data = query.data;
  const attention = data?.attention || [];
  const insights = data?.proactive_insights || [];
  const recommended = data?.recommended_actions || [];
  const commands = data?.nl_commands || [];
  const related = data?.related_entities || [];
  const timeline = data?.timeline || [];
  const automations = data?.automation_opportunities || [];

  const liveBits = useMemo(() => {
    const live = data?.live || {};
    return Object.entries(live).filter(([, v]) => typeof v === "number");
  }, [data?.live]);

  const openEntity = (
    href?: string,
    entity?: { entity_type?: string; entity_id?: string; label?: string },
  ) => {
    if (entity?.entity_type && entity?.entity_id) {
      focusEntityForMiya({
        entity_type: entity.entity_type,
        entity_id: entity.entity_id,
        entity_label: entity.label,
        route: href,
        tab: module,
      });
    }
    if (href) navigate(href);
  };

  return (
    <section
      className={cn("w-full", className)}
      aria-label={`${data?.title || module} AI workspace`}
    >
      <div
        className={cn(
          "overflow-hidden border-border/70",
          collapsed
            ? "border-b"
            : "border-y bg-ai/40 sm:rounded-panel sm:border",
        )}
      >
        <button
          type="button"
          className={cn(
            "flex w-full items-center justify-between gap-3 text-left",
            collapsed ? "px-0 py-2.5" : "px-4 py-3 sm:px-5",
          )}
          onClick={() => setCollapsed((v) => !v)}
          aria-expanded={!collapsed}
        >
          <div className="flex min-w-0 items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <p className="min-w-0 truncate text-body text-foreground">
              <span className="font-medium">Miya</span>
              <span className="text-muted-foreground"> · </span>
              {query.isLoading
                ? "Reviewing this area…"
                : attention.length > 0
                  ? attention.length === 1
                    ? "1 item needs attention"
                    : `${attention.length} items need attention`
                  : data?.summary?.body || data?.summary?.headline || "No urgent signals"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!collapsed ? (
              <AskMiyaButton
                size="sm"
                prompt={moduleAskPrompt(module, data?.title)}
                pageContext={{
                  tab: module,
                  route: typeof window !== "undefined" ? window.location.pathname : "/dashboard",
                }}
                className="hidden sm:inline-flex"
                onClickStopPropagation
              />
            ) : null}
            {collapsed ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
            )}
          </div>
        </button>

        {!collapsed ? (
          <div
            className={cn(
              "space-y-6 border-t border-border/80 px-4 py-4 sm:px-5",
              compact && "space-y-4",
            )}
          >
            {query.isLoading ? (
              <MiyaLoadingState message="Preparing workspace…" variant="inline" />
            ) : query.isError ? (
              <EmptyOpsState
                title="Couldn't load module intelligence"
                description="Retry when the connection is ready."
                askPrompt={moduleAskPrompt(module, data?.title)}
                action={
                  <Button type="button" size="sm" variant="outline" onClick={() => void query.refetch()}>
                    Retry
                  </Button>
                }
              />
            ) : (
              <>
                <div>
                  <SectionLabel>AI summary</SectionLabel>
                  <p className="mt-2 text-body leading-relaxed text-foreground">
                    {data?.summary?.body}
                  </p>
                  {liveBits.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {liveBits.map(([k, v]) => (
                        <span
                          key={k}
                          className="rounded-md border border-border px-2 py-0.5 text-meta text-muted-foreground"
                        >
                          {k.replace(/_/g, " ")}: {v}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {data?.policy_note ? (
                    <p className="mt-2 text-meta text-muted-foreground">{data.policy_note}</p>
                  ) : null}
                </div>

                {insights.length > 0 ? (
                  <ProactiveInsights
                    insights={insights}
                    compact={compact}
                    queryKey={["miya", "workspace", module]}
                  />
                ) : null}

                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-high" aria-hidden />
                    <SectionLabel>Attention</SectionLabel>
                  </div>
                  {attention.length === 0 ? (
                    <p className="type-secondary text-muted-foreground">
                      Nothing needs you in this module right now.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {attention.slice(0, compact ? 3 : 6).map((item) => (
                        <li
                          key={item.id}
                          className="flex flex-wrap items-start justify-between gap-2 rounded-panel border border-border/80 bg-card/80 px-3 py-2.5"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <SeverityBadge level={item.severity} />
                              <button
                                type="button"
                                className="text-left text-body font-semibold text-foreground hover:underline"
                                onClick={() =>
                                  openEntity(item.href, {
                                    entity_type: item.category?.includes("incident")
                                      ? "incident"
                                      : "ops",
                                    entity_id: item.entity_ids?.[0],
                                    label: item.title,
                                  })
                                }
                              >
                                {item.title}
                              </button>
                            </div>
                            {item.detail ? (
                              <p className="mt-1 line-clamp-2 text-meta text-muted-foreground">
                                {item.detail}
                              </p>
                            ) : null}
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="shrink-0 gap-1"
                            onClick={() =>
                              askMiya({
                                prompt: item.ask_miya_prompt || item.title,
                                pageContext: {
                                  route: item.href,
                                  tab: module,
                                  entity_type: item.category?.includes("incident")
                                    ? "incident"
                                    : module,
                                  entity_id: item.entity_ids?.[0],
                                  entity_label: item.title,
                                },
                              })
                            }
                          >
                            <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                            Ask
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-primary" aria-hidden />
                    <SectionLabel>Recommended actions</SectionLabel>
                  </div>
                  {recommended.length === 0 ? (
                    <p className="type-secondary text-muted-foreground">No recommended actions.</p>
                  ) : (
                    <ul className="space-y-2">
                      {recommended.slice(0, compact ? 3 : 5).map((rec) => (
                        <li
                          key={rec.id}
                          className="flex flex-wrap items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="text-body font-medium text-foreground">{rec.label}</p>
                            {rec.reason ? (
                              <p className="line-clamp-1 text-meta text-muted-foreground">
                                {rec.reason}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex gap-1">
                            {rec.href ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="gap-1"
                                onClick={() => navigate(rec.href!)}
                              >
                                Open <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                              </Button>
                            ) : null}
                            <Button
                              type="button"
                              size="sm"
                              onClick={() =>
                                askMiya({
                                  prompt: rec.ask_miya_prompt || rec.label,
                                  pageContext: { route: rec.href, tab: module },
                                })
                              }
                            >
                              Do with Miya
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <SectionLabel>Natural language commands</SectionLabel>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {commands.map((cmd) => (
                      <button
                        key={cmd}
                        type="button"
                        className="rounded-control border border-border bg-card px-2.5 py-1.5 text-left text-meta text-foreground hover:border-primary/40 hover:bg-ai-surface"
                        onClick={() =>
                          askMiya({
                            prompt: cmd,
                            pageContext: { tab: module, route: window.location.pathname },
                          })
                        }
                      >
                        “{cmd}”
                      </button>
                    ))}
                  </div>
                </div>

                {!compact ? (
                  <>
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <Link2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                        <SectionLabel>Related entities</SectionLabel>
                      </div>
                      {related.length === 0 ? (
                        <p className="type-secondary text-muted-foreground">
                          No related records surfaced.
                        </p>
                      ) : (
                        <ul className="flex flex-wrap gap-2">
                          {related.map((ent, idx) => (
                            <li key={`${ent.entity_id || ent.label}-${idx}`}>
                              <button
                                type="button"
                                className="rounded-control border border-border px-2.5 py-1 text-meta text-foreground hover:bg-muted"
                                onClick={() => openEntity(ent.href, ent)}
                              >
                                {ent.entity_type}: {ent.label}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                        <SectionLabel>Timeline</SectionLabel>
                      </div>
                      {timeline.length === 0 ? (
                        <p className="type-secondary text-muted-foreground">
                          No recent events in this module.
                        </p>
                      ) : (
                        <ul className="space-y-2 border-l border-border pl-3">
                          {timeline.map((ev) => (
                            <li key={ev.id} className="relative text-body">
                              <span className="absolute -left-[17px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                              <p className="text-foreground">{ev.summary}</p>
                              {ev.created_at ? (
                                <p className="text-meta text-muted-foreground">
                                  {new Date(ev.created_at).toLocaleString()}
                                </p>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </>
                ) : null}

                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <Workflow className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    <SectionLabel>Automation opportunities</SectionLabel>
                  </div>
                  {automations.length === 0 ? (
                    <p className="type-secondary text-muted-foreground">No automation ideas yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {automations.map((auto) => (
                        <li
                          key={auto.title}
                          className="flex flex-wrap items-start justify-between gap-2 rounded-panel border border-border/80 px-3 py-2.5"
                        >
                          <div>
                            <p className="text-body font-medium text-foreground">{auto.title}</p>
                            {auto.detail ? (
                              <p className="text-meta text-muted-foreground">{auto.detail}</p>
                            ) : null}
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              askMiya({
                                prompt: auto.prompt || auto.title,
                                pageContext: {
                                  tab: module,
                                  route: "/dashboard/automations",
                                },
                              })
                            }
                          >
                            Draft with Miya
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default AiNativeWorkspace;
