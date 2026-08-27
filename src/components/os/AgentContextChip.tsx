import React from "react";
import { Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  entityType?: string;
  entityLabel?: string;
  onClear?: () => void;
  className?: string;
};

/** Shows which entity Agent is focused on. */
export function AgentContextChip({ entityType, entityLabel, onClear, className }: Props) {
  if (!entityLabel && !entityType) return null;
  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-control border border-ai-border bg-ai px-2 py-1 text-caption text-ai-foreground",
        className,
      )}
    >
      <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="min-w-0 truncate">
        {entityType ? <span className="text-muted-foreground">{entityType}: </span> : null}
        {entityLabel || "Current context"}
      </span>
      {onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="touch-target -mr-1 inline-flex h-6 w-6 items-center justify-center rounded-control hover:bg-background/60"
          aria-label="Clear Agent context"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export default AgentContextChip;
