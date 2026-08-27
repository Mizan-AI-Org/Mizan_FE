import React from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SeverityBadge, severityPanelClass } from "@/components/os/SeverityBadge";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import type { AttentionBoardItem } from "./attentionBoardTypes";

type Props = {
  item: AttentionBoardItem;
  onReview?: () => void;
  onAskAgent?: () => void;
  className?: string;
  quiet?: boolean;
};

/** Compact operational attention card for the command board. */
export function AttentionPriorityCard({ item, onReview, onAskAgent, className, quiet }: Props) {
  const { t } = useLanguage();
  const categoryKey = item.category ? `category.${item.category}` : "";
  const categoryLabel = item.category
    ? t(categoryKey, { defaultValue: item.category.replace(/_/g, " ") })
    : null;

  return (
    <article
      className={cn(
        "rounded-panel px-3.5 py-3 shadow-xs transition-all duration-os",
        quiet
          ? "border border-border/60 bg-card/60"
          : severityPanelClass(item.severity),
        !quiet && "hover:shadow-soft",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <SeverityBadge level={item.severity} />
            {categoryLabel ? (
              <span className="text-caption text-muted-foreground">{categoryLabel}</span>
            ) : null}
            {item.state_label ? (
              <span className="text-caption text-muted-foreground/80">· {item.state_label}</span>
            ) : null}
          </div>
          <h3 className="text-card-title leading-snug">{item.title}</h3>
          {item.why_it_matters ? (
            <p className="text-body text-muted-foreground line-clamp-2">{item.why_it_matters}</p>
          ) : item.detail ? (
            <p className="text-body text-muted-foreground line-clamp-2">{item.detail}</p>
          ) : null}
          {item.owner ? (
            <p className="text-caption text-muted-foreground">
              {t("os.attention.owner")} {item.owner}
            </p>
          ) : null}
        </div>

        {onReview || onAskAgent ? (
          <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:flex-col sm:items-stretch">
            {onReview ? (
              <Button type="button" size="sm" className="justify-center gap-1" onClick={onReview}>
                {item.recommended_action?.label || t("os.attention.review")}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Button>
            ) : null}
            {onAskAgent ? (
              <Button type="button" size="sm" variant="ai" className="justify-center" onClick={onAskAgent}>
                {t("nav.ask_agent")}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default AttentionPriorityCard;
