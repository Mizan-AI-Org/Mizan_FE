import React from "react";
import { Sparkles } from "lucide-react";
import { askMiya, type MiyaPageContext } from "@/lib/miyaPageContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  label = "Ask Miya",
  className,
  size = "sm",
  variant = "ai",
  onClickStopPropagation = false,
}: Props) {
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
      {size === "icon" ? <span className="sr-only">{label}</span> : label}
    </Button>
  );
}

/** Helpers for object-specific prompts */
export const miyaPrompts = {
  attention: (title?: string) =>
    title
      ? `Help me with this attention item: ${title}. What should I do?`
      : "What needs my attention right now?",
  incident: (label?: string) =>
    label
      ? `Ask about incident "${label}": why is it still open and what should we do next?`
      : "Show unresolved incidents and recommend next actions.",
  task: (label?: string) =>
    label
      ? `Help me handle the task "${label}". What's blocking it and who should own it?`
      : "What tasks are overdue and how should I resolve them?",
  staff: (name?: string) =>
    name
      ? `What is blocking ${name}? Summarize their load and recommend rebalancing.`
      : "Who is overloaded right now?",
  schedule: () => "Are we understaffed tomorrow? Show coverage gaps and recommendations.",
  invoice: (label?: string) =>
    label
      ? `Is invoice "${label}" safe to approve? Explain risk and policy.`
      : "Which invoices need my approval and which are safe?",
  compliance: () => "What compliance items need attention?",
  focusToday: () => "What should I focus on today?",
  activity: () => "Show me what Miya has done today.",
};

export default AskMiyaButton;
