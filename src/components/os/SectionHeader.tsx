import React from "react";
import { cn } from "@/lib/utils";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
  titleClassName?: string;
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
  as = "h2",
  titleClassName,
}: Props) {
  const TitleTag = as;
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0 space-y-1">
        {eyebrow ? <p className="text-caption-label">{eyebrow}</p> : null}
        <TitleTag
          className={cn(as === "h1" ? "text-page-title" : "text-section-title", titleClassName)}
        >
          {title}
        </TitleTag>
        {description ? <p className="max-w-2xl type-secondary">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export default SectionHeader;
