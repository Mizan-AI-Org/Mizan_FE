import React from "react";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Variant = "error" | "success" | "info";

type Props = {
  variant?: Variant;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

const ICONS = {
  error: XCircle,
  success: CheckCircle2,
  info: AlertCircle,
};

const TONES = {
  error: "border-critical-border bg-critical-muted/50 text-critical",
  success: "border-primary/30 bg-ai-surface text-foreground",
  info: "border-watch-border bg-watch-muted/40 text-foreground",
};

export function OpsStateBanner({
  variant = "info",
  title,
  description,
  actionLabel,
  onAction,
  className,
}: Props) {
  const Icon = ICONS[variant];
  return (
    <div className={cn("rounded-panel border px-4 py-3", TONES[variant], className)} role="status">
      <div className="flex flex-wrap items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-card-title">{title}</p>
          {description ? <p className="mt-1 type-secondary">{description}</p> : null}
        </div>
        {actionLabel && onAction ? (
          <Button type="button" size="sm" variant="outline" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default OpsStateBanner;
