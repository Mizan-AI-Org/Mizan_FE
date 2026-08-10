import React from "react";
import { Sparkles } from "lucide-react";
import { askMiya, type MiyaPageContext } from "@/lib/miyaPageContext";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Translate = (key: string, options?: Record<string, string | number>) => string;

type Props = {
  /** Contextual prompt - never a generic chatbot opener when object context exists. */
  prompt: string;
  pageContext?: MiyaPageContext | null;
  label?: string;
  className?: string;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "ghost" | "outline" | "default" | "secondary" | "ai";
  onClickStopPropagation?: boolean;
};

/** Contextual Ask Miya - subtle AI treatment by default (not a primary green CTA). */
export function AskMiyaButton({
  prompt,
  pageContext,
  label,
  className,
  size = "sm",
  variant = "ai",
  onClickStopPropagation = false,
}: Props) {
  const { t } = useLanguage();
  const resolvedLabel = label || t("dashboard.miya_widget.ask_miya") || t("nav.ask_miya");
  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={cn("gap-1.5", className)}
      onClick={(e) => {
        if (onClickStopPropagation) e.stopPropagation();
        askMiya({ prompt, pageContext });
      }}
    >
      <Sparkles className="h-3.5 w-3.5" aria-hidden />
      {size === "icon" ? <span className="sr-only">{resolvedLabel}</span> : resolvedLabel}
    </Button>
  );
}

function tr(t: Translate | undefined, key: string, fallback: string, options?: Record<string, string | number>) {
  if (!t) return fallback;
  const value = t(key, options);
  return !value || value === key ? fallback : value;
}

/** Helpers for object-specific prompts (pass `t` for locale-aware copy). */
export const miyaPrompts = {
  attention: (title?: string, t?: Translate) => {
    if (!title) return tr(t, "ai.prompt.attention", "What needs my attention right now?");
    const lower = title.toLowerCase();
    if (lower.includes("overdue")) {
      return tr(t, "ai.prompt.overdue_tasks", "Which tasks are overdue and how should I resolve them?");
    }
    if (lower.includes("incident")) {
      return tr(t, "ai.prompt.incidents", "Show unresolved incidents and recommend next actions.");
    }
    if (lower.includes("document") || lower.includes("compliance")) {
      return tr(t, "ai.prompt.compliance", "What compliance items need attention?");
    }
    return tr(
      t,
      "ai.prompt.attention_named",
      `Help me with this attention item: ${title}. What should I do?`,
      { title },
    );
  },
  incident: (label?: string, t?: Translate) =>
    label
      ? tr(
          t,
          "ai.prompt.incident_named",
          `Why is incident "${label}" still open, and what should we do next?`,
          { label },
        )
      : tr(t, "ai.prompt.incidents", "Show unresolved incidents and recommend next actions."),
  task: (label?: string, t?: Translate) =>
    label
      ? tr(
          t,
          "ai.prompt.task_named",
          `Help me handle the task "${label}". What's blocking it and who should own it?`,
          { label },
        )
      : tr(t, "ai.prompt.overdue_tasks", "Which tasks are overdue and how should I resolve them?"),
  staff: (name?: string, t?: Translate) =>
    name
      ? tr(
          t,
          "ai.prompt.staff_named",
          `What is blocking ${name}? Summarize their load and recommend rebalancing.`,
          { name },
        )
      : tr(t, "ai.prompt.overloaded", "Who is overloaded right now?"),
  schedule: (t?: Translate) =>
    tr(
      t,
      "ai.prompt.schedule_gaps",
      "Are we understaffed tomorrow? Show coverage gaps and recommendations.",
    ),
  invoice: (label?: string, t?: Translate) =>
    label
      ? tr(
          t,
          "ai.prompt.invoice_named",
          `Is invoice "${label}" safe to approve? Explain risk and policy.`,
          { label },
        )
      : tr(
          t,
          "ai.prompt.invoices_approval",
          "Which invoices need my approval and which are safe?",
        ),
  compliance: (t?: Translate) =>
    tr(t, "ai.prompt.compliance", "What compliance items need attention?"),
  focusToday: (t?: Translate) =>
    tr(t, "ai.prompt.focus_today", "What should I focus on today?"),
  activity: (t?: Translate) =>
    tr(t, "ai.prompt.activity_today", "Show me what Miya has done today."),
};

export default AskMiyaButton;
