import { Eye, Sparkles } from "lucide-react";
import { AgentAvatar } from "@/components/agent/AgentAvatar";
import { Button } from "@/components/ui/button";
import { useAgentPanel } from "@/context/AgentPanelContext";
import { useLanguage } from "@/hooks/use-language";

type Props = {
  watchingCount: number;
  handlingCount: number;
  decideCount: number;
};

/** Compact Agent status + brief — used on Command and Live ops. */
export function AgentOpsStrip({ watchingCount, handlingCount, decideCount }: Props) {
  const { t } = useLanguage();
  const { askAgent } = useAgentPanel();

  return (
    <section
      aria-label={t("command.agent_strip_aria")}
      className="flex flex-wrap items-center gap-3 rounded-panel border border-ai-border bg-gradient-to-br from-ai via-ai/40 to-card px-3 py-3 shadow-xs"
    >
      <AgentAvatar size="lg" ring />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
        <p className="text-sm font-semibold text-foreground">{t("command.agent_strip_title")}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-caption font-medium text-primary">
            <Eye className="h-3 w-3" aria-hidden />
            {t("command.agent_watching_count", { count: watchingCount })}
          </span>
          {handlingCount > 0 ? (
            <span className="inline-flex items-center rounded-full bg-card px-2 py-0.5 text-caption font-medium text-muted-foreground ring-1 ring-border/80">
              {t("command.agent_handling_count", { count: handlingCount })}
            </span>
          ) : null}
          {decideCount > 0 ? (
            <span className="inline-flex items-center rounded-full bg-critical-muted px-2 py-0.5 text-caption font-medium text-critical">
              {t("command.agent_decide_count", { count: decideCount })}
            </span>
          ) : null}
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        className="shrink-0 gap-1.5"
        onClick={() => askAgent(t("attention.brief_prompt"))}
      >
        <Sparkles className="h-4 w-4" aria-hidden />
        {t("attention.brief_me")}
      </Button>
    </section>
  );
}
