import React from "react";
import { cn } from "@/lib/utils";

export type StatusTone = "neutral" | "success" | "warning" | "critical" | "info" | "ai";

const TONE: Record<StatusTone, string> = {
  neutral: "bg-muted-foreground/50",
  success: "bg-success",
  warning: "bg-high",
  critical: "bg-critical",
  info: "bg-watch",
  ai: "bg-primary",
};

type Props = {
  tone?: StatusTone;
  label: string;
  className?: string;
  showLabel?: boolean;
};

/** Status with shape + text - never color alone. */
export function StatusDot({ tone = "neutral", label, className, showLabel = true }: Props) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-caption text-muted-foreground", className)}>
      <span className={cn("h-2 w-2 shrink-0 rounded-full", TONE[tone])} aria-hidden />
      {showLabel ? <span className="text-foreground/80">{label}</span> : <span className="sr-only">{label}</span>}
    </span>
  );
}

export default StatusDot;
