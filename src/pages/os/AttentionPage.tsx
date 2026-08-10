import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { askMiya, focusEntityForMiya } from "@/lib/miyaPageContext";
import { PAGE_SHELL_PADDED } from "@/lib/page-shell";
import { miyaPrompts } from "@/components/miya/AskMiyaButton";
import {
  AttentionCard,
  EmptyOpsState,
  MiyaLoadingState,
  OpsStateBanner,
  SectionHeader,
} from "@/components/os";

type AttentionItem = {
  id: string;
  category: string;
  severity: string;
  title: string;
  detail?: string;
  why_it_matters?: string;
  entity_type?: string;
  entity_id?: string | null;
  entity_ids?: string[];
  owner?: string | null;
  recommended_action?: { label?: string; href?: string };
  ask_miya_prompt?: string;
};

function bucketOf(sev: string) {
  const s = (sev || "").toUpperCase();
  if (s === "CRITICAL" || s === "URGENT_ACTION") return "CRITICAL";
  if (s === "HIGH" || s === "ACTION_REQUIRED") return "HIGH";
  if (s.includes("APPROVAL")) return "APPROVALS";
  return "WATCH";
}

const ORDER = ["CRITICAL", "HIGH", "WATCH", "APPROVALS"] as const;

export default function AttentionPage() {
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ["miya", "command-center", "attention-page"],
    queryFn: () => api.getMiyaCommandCenter() as Promise<{ attention?: AttentionItem[]; proactive_insights?: AttentionItem[] }>,
    refetchInterval: 60_000,
  });

  const grouped = useMemo(() => {
    const items = query.data?.attention || [];
    const map: Record<string, AttentionItem[]> = {
      CRITICAL: [],
      HIGH: [],
      WATCH: [],
      APPROVALS: [],
    };
    for (const item of items) {
      const b = bucketOf(item.severity);
      if (item.category?.includes("approval") || item.category?.includes("invoice")) {
        map.APPROVALS.push(item);
      } else {
        map[b].push(item);
      }
    }
    return map;
  }, [query.data]);

  const openItem = (item: AttentionItem) => {
    const entityId = item.entity_id || item.entity_ids?.[0];
    if (item.entity_type && entityId) {
      focusEntityForMiya({
        entity_type: item.entity_type,
        entity_id: String(entityId),
        entity_label: item.title,
        route: item.recommended_action?.href,
      });
    }
    if (item.recommended_action?.href) navigate(item.recommended_action.href);
  };

  return (
    <div className={PAGE_SHELL_PADDED}>
      <div className="space-y-section">
        <SectionHeader
          as="h1"
          title="Attention"
          description="Things that need a human decision. Critical first."
          titleClassName="text-page-title"
        />

        {query.isLoading ? (
          <MiyaLoadingState message="Gathering what needs your attention…" variant="skeleton" rows={4} />
        ) : null}

        {query.isError ? (
          <OpsStateBanner
            variant="error"
            title="Couldn't load Attention"
            actionLabel="Retry"
            onAction={() => void query.refetch()}
          />
        ) : null}

        {!query.isLoading && !query.isError
          ? ORDER.map((bucket) => {
              const list = grouped[bucket] || [];
              if (!list.length && bucket !== "CRITICAL") return null;
              return (
                <section key={bucket} aria-label={bucket} className="os-section">
                  <SectionHeader
                    title={bucket === "APPROVALS" ? "Approvals" : bucket.charAt(0) + bucket.slice(1).toLowerCase()}
                    description={
                      bucket === "CRITICAL"
                        ? "Needs immediate action."
                        : bucket === "HIGH"
                          ? "Should be handled today."
                          : bucket === "WATCH"
                            ? "Potential issues Miya detected."
                            : "Requires human authorization."
                    }
                  />
                  {list.length === 0 ? (
                    <EmptyOpsState
                      title={bucket === "CRITICAL" ? "No critical items." : "Nothing in this lane."}
                      miyaLine={bucket === "CRITICAL" ? "No emergencies right now." : undefined}
                      askPrompt={bucket === "CRITICAL" ? "Scan for emerging critical risks." : undefined}
                    />
                  ) : (
                    <ul className="space-y-3">
                      {list.map((item) => (
                        <li key={item.id}>
                          <AttentionCard
                            item={{
                              id: item.id,
                              severity: bucket === "APPROVALS" ? "APPROVAL" : item.severity,
                              category: item.category,
                              title: item.title,
                              detail: item.detail,
                              why: item.why_it_matters,
                              recommendation: item.recommended_action?.label,
                              owner: item.owner,
                              reviewLabel: item.recommended_action?.label || "Review",
                            }}
                            onReview={() => openItem(item)}
                            onAskMiya={() =>
                              askMiya({
                                prompt: item.ask_miya_prompt || miyaPrompts.attention(item.title),
                                pageContext: {
                                  entity_type: item.entity_type,
                                  entity_id: item.entity_id || item.entity_ids?.[0] || undefined,
                                  entity_label: item.title,
                                },
                              })
                            }
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })
          : null}
      </div>
    </div>
  );
}
