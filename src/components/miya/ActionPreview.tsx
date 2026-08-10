import React from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "@/components/os";
import { cn } from "@/lib/utils";

export type ActionPreviewModel = {
  mode: "confirm" | "clarify" | "done";
  title: string;
  summary?: string;
  intent?: string;
  command_kind?: string;
  entity_type?: string;
  entity_id?: string;
  assignee?: string;
  risk?: string;
  pending_confirmation?: Record<string, unknown>;
  primary_action?: { label: string; confirm_message: string } | null;
  secondary_action?: { label: string; confirm_message: string } | null;
  lines?: Array<{ label: string; value: string }>;
  verified?: boolean;
};

type Props = {
  preview: ActionPreviewModel;
  busy?: boolean;
  onConfirm?: (message: string, pending?: Record<string, unknown>) => void;
  onCancel?: () => void;
  className?: string;
};

/** Structured Miya action card: what / who / result / verification. */
export function ActionPreview({ preview, busy, onConfirm, onCancel, className }: Props) {
  const risk = (preview.risk || "LOW").toUpperCase();
  return (
    <div className={cn("miya-surface px-4 py-3 shadow-soft", className)} role="region" aria-label="Miya action">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-caption">
            {preview.mode === "confirm"
              ? "Confirm action"
              : preview.mode === "clarify"
                ? "Need detail"
                : "Completed"}
          </p>
          <p className="mt-1 text-card-title text-foreground">{preview.title}</p>
        </div>
        {preview.mode === "confirm" ? (
          <SeverityBadge level={risk === "HIGH" ? "HIGH" : risk === "MEDIUM" ? "WATCH" : "LOW"} label={`${risk} risk`} />
        ) : null}
        {preview.mode === "done" ? (
          <span className="inline-flex items-center gap-1 text-meta text-primary">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            {preview.verified !== false ? "Verified" : "Recorded"}
          </span>
        ) : null}
      </div>

      {preview.lines && preview.lines.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {preview.lines.map((line) => (
            <li key={`${line.label}-${line.value}`} className="flex gap-2 text-body">
              <span className="w-28 shrink-0 text-meta">→ {line.label}</span>
              <span className="min-w-0 truncate text-foreground">{line.value}</span>
            </li>
          ))}
        </ul>
      ) : preview.summary ? (
        <p className="mt-2 whitespace-pre-wrap type-secondary">{preview.summary}</p>
      ) : null}

      {preview.mode === "done" ? (
        <p className="mt-3 text-meta">
          {preview.verified !== false
            ? "Verified successfully against the system of record."
            : "Recorded. Verification pending."}
        </p>
      ) : null}

      {preview.mode === "confirm" && preview.primary_action ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() =>
              onConfirm?.(
                preview.primary_action!.confirm_message,
                preview.pending_confirmation || undefined,
              )
            }
          >
            {preview.primary_action.label}
          </Button>
          {preview.secondary_action ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() =>
                onConfirm?.(
                  preview.secondary_action!.confirm_message,
                  preview.pending_confirmation || undefined,
                )
              }
            >
              {preview.secondary_action.label}
            </Button>
          ) : null}
          {onCancel ? (
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
        </div>
      ) : null}

      {preview.mode === "clarify" && onCancel ? (
        <div className="mt-3">
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Dismiss
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default ActionPreview;
