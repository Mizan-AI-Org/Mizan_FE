import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, CheckCircle2, Info, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { IntelligenceShell } from "@/pages/intelligence/IntelligenceShell";
import { Button } from "@/components/ui/button";
import { useAgentPanel } from "@/context/AgentPanelContext";
import { useLanguage } from "@/hooks/use-language";
import { localizedCopy } from "@/lib/domain-copy";
import { cn } from "@/lib/utils";

function severityStyle(severity?: string) {
  const s = (severity || "").toLowerCase();
  if (s === "critical" || s === "high") return { icon: AlertTriangle, ring: "border-destructive/30 bg-destructive/5" };
  if (s === "warning" || s === "medium") return { icon: AlertTriangle, ring: "border-amber-500/30 bg-amber-500/5" };
  if (s === "ok" || s === "low") return { icon: CheckCircle2, ring: "border-emerald-500/30 bg-emerald-500/5" };
  return { icon: Info, ring: "border-border bg-card" };
}

export default function IntelligenceRecommendationsPage() {
  const { t } = useLanguage();
  const { askAgent } = useAgentPanel();
  const { data, isLoading } = useQuery({
    queryKey: ["domain-world", "intelligence"],
    queryFn: () => api.getDomainWorld("intelligence"),
    staleTime: 30_000,
  });

  const observations = data?.observations || [];

  return (
    <IntelligenceShell
      title={t("nav.intelligence.recommendations")}
      description={t("intelligence.recommendations.description")}
      askPrompt={t("intelligence.recommendations.ask")}
    >
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : observations.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 px-6 py-14 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="mt-4 text-lg font-medium">{t("intelligence.recommendations.empty_title")}</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {t("intelligence.recommendations.empty_body")}
          </p>
          <Button className="mt-6" variant="outline" onClick={() => askAgent(t("intelligence.recommendations.review_prompt"))}>
            {t("intelligence.recommendations.ask_review")}
          </Button>
        </div>
      ) : (
        <ul className="space-y-4">
          {observations.map((row, i) => {
            const meta = severityStyle(row.severity);
            const Icon = meta.icon;
            const text = localizedCopy(t, row.message_key, row.text, row.message_params);
            return (
              <li
                key={`${row.message_key || row.text}-${i}`}
                className={cn("flex gap-4 rounded-xl border p-5", meta.ring)}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background shadow-sm">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-relaxed">{text}</p>
                  {row.href ? (
                    <Link
                      to={row.href}
                      className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      {t("intelligence.take_action")} <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </IntelligenceShell>
  );
}
