import React from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SeverityBadge, severityPanelClass, type SeverityLevel } from "@/components/os/SeverityBadge";
import { useLanguage } from "@/hooks/use-language";
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
};

type Props = {
  item: AttentionCardModel;
  onReview?: () => void;
  className?: string;
  compact?: boolean;
};

/** Attention item: WHAT / WHY / recommendation / one primary action. */
export function AttentionCard({ item, onReview, className, compact }: Props) {
  const { t } = useLanguage();
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
                {t(`category.${item.category}`)}
              </span>
            ) : null}
          </div>
          <h3 className="text-section-title">{item.title}</h3>
          {item.detail && !compact ? (
            <p className="type-secondary">{item.detail}</p>
          ) : null}
          {item.why ? (
            <p className="text-body text-foreground/90">
              <span className="font-medium text-foreground">{t("os.attention.why")} </span>
              {item.why}
            </p>
          ) : null}
          {item.impact && !compact ? (
            <p className="type-secondary">
              <span className="font-medium text-foreground">{t("os.attention.impact")} </span>
              {item.impact}
            </p>
          ) : null}
          {item.recommendation ? (
            <p className="text-body text-foreground/90">
              <span className="font-medium text-foreground">{t("os.attention.recommends")} </span>
              {item.recommendation}
            </p>
          ) : null}
          {item.owner ? (
            <p className="text-caption">
              {t("os.attention.owner")} {item.owner}
            </p>
          ) : null}
        </div>

        {onReview ? (
          <div className="flex shrink-0 flex-col items-stretch gap-2">
            <Button type="button" size="sm" className="justify-center gap-1" onClick={onReview}>
              {item.reviewLabel || t("os.attention.review")}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default AttentionCard;
