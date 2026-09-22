import React from "react";
import { Sparkles } from "lucide-react";
import { PAGE_SHELL_PADDED } from "@/lib/page-shell";
import { MIZAN_HERO, MIZAN_PAGE_STACK } from "@/lib/mizan-ui";
import { useLanguage } from "@/hooks/use-language";
import { useAgentPanel } from "@/context/AgentPanelContext";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/os/SectionHeader";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  /** Gradient hero header (default on). Set false for minimal SectionHeader only. */
  hero?: boolean;
  askAgentPrompt?: string;
  showAskAgent?: boolean;
};

/** Canonical page shell — matches Social Media & Intelligence hub styling. */
export function MizanPageShell({
  title,
  description,
  eyebrow,
  children,
  className,
  actions,
  hero = true,
  askAgentPrompt,
  showAskAgent = false,
}: Props) {
  const { t } = useLanguage();
  const { askAgent } = useAgentPanel();
  const askPrompt = askAgentPrompt || t("domain.ask_prompt", { domain: title });

  const askButton = showAskAgent ? (
    <Button
      type="button"
      variant="default"
      className="gap-2 shrink-0 shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30"
      onClick={() => askAgent(askPrompt)}
    >
      <Sparkles className="h-4 w-4" />
      {t("nav.ask_agent")}
    </Button>
  ) : null;

  const headerActions = actions ?? askButton;

  return (
    <div className={cn(PAGE_SHELL_PADDED, className)}>
      {hero ? (
        <header className={MIZAN_HERO}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              {eyebrow ? (
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">{eyebrow}</p>
              ) : null}
              <h1 className={cn("text-2xl font-semibold tracking-tight sm:text-3xl", eyebrow && "mt-1")}>{title}</h1>
              {description ? <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
            </div>
            {headerActions}
          </div>
        </header>
      ) : (
        <SectionHeader
          as="h1"
          eyebrow={eyebrow}
          title={title}
          description={description}
          titleClassName="text-page-title"
          action={headerActions}
          className="mb-6"
        />
      )}
      <div className={MIZAN_PAGE_STACK}>{children}</div>
    </div>
  );
}
