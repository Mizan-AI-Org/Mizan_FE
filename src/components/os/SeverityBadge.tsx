import React from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";

export type SeverityLevel =
  | "CRITICAL"
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | "WATCH"
  | "APPROVAL"
  | "URGENT_ACTION"
  | "ACTION_REQUIRED"
  | "RECOMMENDATION"
  | "INFORMATION"
  | string;

function normalizeSeverity(raw: string | undefined): "critical" | "high" | "watch" | "approval" | "neutral" {
  const s = (raw || "").toUpperCase();
  if (s === "CRITICAL" || s === "URGENT_ACTION") return "critical";
  if (s === "HIGH" || s === "ACTION_REQUIRED") return "high";
  if (s === "APPROVAL" || s === "APPROVALS") return "approval";
  if (s === "MEDIUM" || s === "WATCH" || s === "RECOMMENDATION") return "watch";
  return "neutral";
}

const TONE: Record<string, string> = {
  critical: "border-critical-border bg-critical-muted text-critical",
  high: "border-high-border bg-high-muted text-high-foreground",
  watch: "border-watch-border bg-watch-muted text-watch-foreground",
  approval: "border-approval-border bg-approval-muted text-approval",
  neutral: "border-border bg-muted text-muted-foreground",
};

type Props = {
  level?: SeverityLevel;
  label?: string;
  className?: string;
};

/** Shared severity chip - color + text (never color-only). */
export function SeverityBadge({ level, label, className }: Props) {
  const { t } = useLanguage();
  const tone = normalizeSeverity(level);
  const raw = level ? String(level).toUpperCase() : "";
  const text = label || t(`severity.${raw}`, { defaultValue: raw.replace(/_/g, " ") || "signal" });
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-control border px-2 py-0.5 text-caption",
        TONE[tone],
        className,
      )}
      data-severity={tone}
    >
      {text}
    </span>
  );
}

/**
 * Severity surface: a solid left accent plus a tint that fades into the card,
 * so urgency reads instantly without turning the row into a colour block.
 */
export function severityPanelClass(level?: SeverityLevel) {
  const tone = normalizeSeverity(level);
  const base = "border-y border-r border-border border-l-[3px] bg-gradient-to-r to-card";
  if (tone === "critical") return `${base} border-l-critical from-critical-muted/80 via-card`;
  if (tone === "high") return `${base} border-l-high from-high-muted/70 via-card`;
  if (tone === "approval") return `${base} border-l-approval from-approval-muted/70 via-card`;
  if (tone === "watch") return `${base} border-l-watch from-watch-muted/60 via-card`;
  return "border border-border bg-card";
}

export default SeverityBadge;
