import React from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "@/components/os/SeverityBadge";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import type { AttentionCluster } from "./attentionBoardTypes";

type Props = {
  cluster: AttentionCluster;
  onReview?: () => void;
  className?: string;
};

export function AttentionClusterCard({ cluster, onReview, className }: Props) {
  const { t } = useLanguage();

  return (
    <article
      className={cn(
        "rounded-panel border border-border/70 bg-card px-3.5 py-3 shadow-xs",
        "transition-all duration-os hover:border-primary/25 hover:shadow-soft",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge level={cluster.severity} />
            <h3 className="text-card-title uppercase tracking-wide">{cluster.label}</h3>
          </div>
          <p className="text-caption text-muted-foreground">
            {t("attention.cluster.meta", {
              issues: cluster.count,
              entities: cluster.entity_count,
            })}
          </p>
          {cluster.members.length > 0 ? (
            <ul className="mt-1 space-y-1">
              {cluster.members.map((m, idx) => (
                <li
                  key={m.id || `${cluster.id}-${idx}`}
                  className="flex items-start gap-2 text-body text-foreground/90"
                >
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" aria-hidden />
                  <span className="min-w-0">
                    <span className="font-medium">{m.title}</span>
                    {m.owner ? (
                      <span className="text-muted-foreground"> · {m.owner}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {onReview ? (
          <Button type="button" size="sm" variant="outline" className="shrink-0 gap-1" onClick={onReview}>
            {cluster.review_label || t("attention.cluster.review")}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Button>
        ) : null}
      </div>
    </article>
  );
}

export default AttentionClusterCard;
