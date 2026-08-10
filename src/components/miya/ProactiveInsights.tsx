import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { api } from "@/lib/api";
import { askMiya, focusEntityForMiya } from "@/lib/miyaPageContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SectionHeader, SeverityBadge, severityPanelClass } from "@/components/os";

export type ProactiveInsightAction = {
  id: string;
  label: string;
  kind?: string;
  href?: string;
  ask_miya_prompt?: string;
  tool_hint?: string;
};

export type ProactiveInsight = {
  id: string;
  fingerprint: string;
  domain: string;
  level: string;
  what: string;
  why?: string;
  impact?: string;
  recommendation?: string;
  evidence?: Array<{
    kind?: string;
    id?: string;
    label?: string;
    href?: string;
  }>;
  actions?: ProactiveInsightAction[];
  entity_ids?: string[];
  entity_type?: string;
  priority_score?: number;
  stages_completed?: string[];
};

type Props = {
  insights: ProactiveInsight[];
  className?: string;
  compact?: boolean;
  queryKey?: unknown[];
};

export function ProactiveInsights({
  insights,
  className,
  compact = false,
  queryKey = ["miya", "command-center"],
}: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const dismiss = useMutation({
    mutationFn: (fingerprint: string) => api.dismissMiyaInsight(fingerprint),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey });
      void qc.invalidateQueries({ queryKey: ["miya", "insights"] });
    },
  });

  const snooze = useMutation({
    mutationFn: (fingerprint: string) => api.snoozeMiyaInsight(fingerprint, { hours: 6 }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey });
      void qc.invalidateQueries({ queryKey: ["miya", "insights"] });
    },
  });

  const sorted = useMemo(() => {
    const rank: Record<string, number> = {
      URGENT_ACTION: 4,
      ACTION_REQUIRED: 3,
      RECOMMENDATION: 2,
      INFORMATION: 1,
    };
    return [...insights].sort(
      (a, b) =>
        (rank[b.level] || 0) - (rank[a.level] || 0) ||
        (b.priority_score || 0) - (a.priority_score || 0),
    );
  }, [insights]);

  if (!sorted.length) return null;

  const runAction = (insight: ProactiveInsight, action: ProactiveInsightAction) => {
    const kind = (action.kind || "").toLowerCase();
    if (kind === "dismiss") {
      dismiss.mutate(insight.fingerprint);
      return;
    }
    if (kind === "snooze") {
      snooze.mutate(insight.fingerprint);
      return;
    }
    if (kind === "navigate" && action.href) {
      const eid = insight.entity_ids?.[0];
      if (insight.entity_type && eid) {
        focusEntityForMiya({
          entity_type: insight.entity_type,
          entity_id: String(eid),
          entity_label: insight.what,
          route: action.href,
        });
      }
      navigate(action.href);
      return;
    }
    askMiya({
      prompt: action.ask_miya_prompt || `Help me with: ${insight.what}`,
      pageContext: {
        route: typeof window !== "undefined" ? window.location.pathname : "/dashboard",
        entity_type: insight.entity_type || insight.domain,
        entity_id: insight.entity_ids?.[0],
        entity_label: insight.what,
      },
    });
  };

  return (
    <section aria-label="Proactive insights" className={cn("space-y-3", className)}>
      {!compact ? (
        <SectionHeader
          title="Proactive insights"
          description="Situations Miya detected before you asked."
          action={<span className="text-caption tabular-nums">{sorted.length}</span>}
        />
      ) : null}

      <ul className="space-y-3">
        {sorted.slice(0, compact ? 4 : 12).map((insight) => (
          <li
            key={insight.id}
            className={cn(
              "rounded-panel px-4 py-3.5 shadow-xs transition-all duration-os hover:shadow-soft",
              severityPanelClass(insight.level),
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge level={insight.level} />
              <span className="text-caption text-muted-foreground">{insight.domain}</span>
            </div>

            <p className="mt-2 text-card-title text-foreground">{insight.what}</p>

            {insight.why ? (
              <p className="mt-1.5 text-body text-foreground/85">
                <span className="font-medium text-foreground">Why: </span>
                {insight.why}
              </p>
            ) : null}

            {!compact && insight.evidence && insight.evidence.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {insight.evidence.slice(0, 4).map((ev, idx) => (
                  <li key={`${insight.id}-ev-${idx}`} className="type-secondary">
                    · {ev.label || ev.kind || "Evidence"}
                  </li>
                ))}
              </ul>
            ) : null}

            {!compact && insight.impact ? (
              <p className="mt-2 text-body text-foreground/85">
                <span className="font-medium text-foreground">Impact: </span>
                {insight.impact}
              </p>
            ) : null}

            {insight.recommendation ? (
              <p className="mt-2 text-body text-foreground/85">
                <span className="font-medium text-foreground">Recommendation: </span>
                {insight.recommendation}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              {(insight.actions || []).map((action) => (
                <Button
                  key={action.id}
                  type="button"
                  size="sm"
                  variant={action.kind === "dismiss" || action.kind === "snooze" ? "ghost" : "outline"}
                  className="h-8 gap-1.5"
                  disabled={dismiss.isPending || snooze.isPending}
                  onClick={() => runAction(insight, action)}
                >
                  {action.kind === "ask_miya" ? <MessageSquare className="h-3.5 w-3.5" aria-hidden /> : null}
                  {action.label}
                </Button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default ProactiveInsights;
