import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Loader2,
  PauseCircle,
  ShieldCheck,
  XCircle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ExecutionStateKind =
  | "detected"
  | "recommended"
  | "awaiting_approval"
  | "approved"
  | "executing"
  | "verifying"
  | "completed"
  | "verified"
  | "failed"
  | "blocked";

const META: Record<
  ExecutionStateKind,
  { label: string; icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  detected: {
    label: "Detected",
    icon: CircleDashed,
    className: "border-border bg-muted text-foreground",
  },
  recommended: {
    label: "Recommended",
    icon: Zap,
    className: "border-ai-border bg-ai text-ai-foreground",
  },
  awaiting_approval: {
    label: "Awaiting approval",
    icon: PauseCircle,
    className: "border-approval-border bg-approval-muted text-approval",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle2,
    className: "border-border bg-primary-muted text-primary",
  },
  executing: {
    label: "Executing",
    icon: Loader2,
    className: "border-border bg-muted text-foreground",
  },
  verifying: {
    label: "Verifying",
    icon: Loader2,
    className: "border-border bg-muted text-foreground",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    className: "border-border bg-primary-muted text-primary",
  },
  verified: {
    label: "Verified",
    icon: ShieldCheck,
    className: "border-border bg-primary-muted text-primary",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    className: "border-critical-border bg-critical-muted text-critical",
  },
  blocked: {
    label: "Blocked",
    icon: AlertTriangle,
    className: "border-high-border bg-high-muted text-high-foreground",
  },
};

type Props = {
  state: ExecutionStateKind;
  label?: string;
  className?: string;
  spinning?: boolean;
};

/** Distinguishes recommendation vs execution vs verification. */
export function ExecutionState({ state, label, className, spinning }: Props) {
  const meta = META[state];
  const Icon = meta.icon;
  const animate =
    spinning ?? (state === "executing" || state === "verifying");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-control border px-2 py-0.5 text-caption",
        meta.className,
        className,
      )}
      data-execution-state={state}
    >
      <Icon className={cn("h-3.5 w-3.5", animate && "animate-spin")} aria-hidden />
      {label || meta.label}
    </span>
  );
}

export default ExecutionState;
