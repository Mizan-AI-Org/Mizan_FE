import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  message?: string;
  variant?: "inline" | "panel" | "skeleton";
  rows?: number;
  className?: string;
};

/** Contextual Agent/ops loading - prefer copy + skeleton over bare spinner. */
export function AgentLoadingState({
  message = "Reviewing operations…",
  variant = "panel",
  rows = 3,
  className,
}: Props) {
  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-2 type-secondary", className)} role="status" aria-live="polite">
        <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
        <span>{message}</span>
      </div>
    );
  }

  if (variant === "skeleton") {
    return (
      <div className={cn("space-y-3", className)} role="status" aria-label={message}>
        <p className="type-secondary flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden />
          {message}
        </p>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-panel" />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn("os-panel flex min-h-[160px] flex-col items-center justify-center gap-3 px-4 py-10", className)}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
      <p className="type-secondary text-center">{message}</p>
    </div>
  );
}

export default AgentLoadingState;
