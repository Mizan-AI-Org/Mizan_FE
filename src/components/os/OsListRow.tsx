import React from "react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  meta?: React.ReactNode;
  leading?: React.ReactNode;
  action?: React.ReactNode;
  onClick?: () => void;
  className?: string;
};

/** Flat list row - spacing over nested cards. */
export function OsListRow({ title, description, meta, leading, action, onClick, className }: Props) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 border-b border-border/70 py-3 text-left last:border-b-0",
        onClick && "rounded-control hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {leading ? <div className="mt-0.5 shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        <p className="text-card-title">{title}</p>
        {description ? <p className="mt-0.5 type-secondary">{description}</p> : null}
        {meta ? <div className="mt-1">{meta}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </Comp>
  );
}

export default OsListRow;
