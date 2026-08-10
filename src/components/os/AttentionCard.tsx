import React from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SeverityBadge, severityPanelClass, type SeverityLevel } from "@/components/os/SeverityBadge";
import { cn } from "@/lib/utils";

export type AttentionCardModel = {
  id: string;
  severity?: SeverityLevel;
  category?: string;
  title: string;
  detail?: string;
  why?: string;
  impact?: string;
  recommendation?: string;
  owner?: string | null;
  reviewLabel?: string;
  askPrompt?: string;
};

type Props = {
  item: AttentionCardModel;
  onReview?: () => void;
  onAskMiya?: () => void;
  className?: string;
  compact?: boolean;
};

/** Attention item: WHAT / WHY / Miya recommends / one primary action. */
export function AttentionCard({ item, onReview, onAskMiya, className, compact }: Props) {
  return (
    <article
      className={cn(
        "rounded-panel px-4 py-4 shadow-xs transition-all duration-os hover:shadow-soft",
        severityPanelClass(item.severity),
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-5 gap-y-3">
        <div className="min-w-[16rem] flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge level={item.severity} />
            {item.category ? (
              <span className="text-caption text-muted-foreground">
                {item.category.replace(/_/g, " ")}
              </span>
            ) : null}
          </div>
          <h3 className="text-section-title">{item.title}</h3>
          {item.detail && !compact ? (
            <p className="type-secondary">{item.detail}</p>
          ) : null}
          {item.why ? (
            <p className="text-body text-foreground/90">
              <span className="font-medium text-foreground">Why it matters: </span>
              {item.why}
            </p>
          ) : null}
          {item.impact && !compact ? (
            <p className="type-secondary">
              <span className="font-medium text-foreground">Impact: </span>
              {item.impact}
            </p>
          ) : null}
          {item.recommendation ? (
            <p className="text-body text-foreground/90">
              <span className="font-medium text-foreground">Miya recommends: </span>
              {item.recommendation}
            </p>
          ) : null}
          {item.owner ? <p className="text-caption">Owner: {item.owner}</p> : null}
        </div>

        {onReview || onAskMiya ? (
          <div className="flex shrink-0 flex-col items-stretch gap-2">
            {onReview ? (
              <Button type="button" size="sm" className="justify-center gap-1" onClick={onReview}>
                {item.reviewLabel || "Review"}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Button>
            ) : null}
            {onAskMiya ? (
              <Button
                type="button"
                size="sm"
                variant="ai"
                className="justify-center"
                onClick={onAskMiya}
              >
                Ask Miya
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default AttentionCard;
