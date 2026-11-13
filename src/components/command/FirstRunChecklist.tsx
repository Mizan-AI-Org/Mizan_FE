import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, Circle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAgentPanelOptional } from "@/context/AgentPanelContext";
import { useLanguage } from "@/hooks/use-language";
import { API_BASE, authFetch } from "@/lib/api";
import { unwrapEnvelope } from "@/lib/envelope";

export type FirstRunState = {
  team_invited: boolean;
  schedule_created: boolean;
  work_zone_set: boolean;
  pos_connected: boolean;
};

type Item = { key: keyof FirstRunState; route: string; done: boolean };

/** Pure: the items still open, in the order a new business should do them. */
export function checklistItems(state: FirstRunState): Item[] {
  return [
    { key: "team_invited", route: "/dashboard/staff-app", done: state.team_invited },
    { key: "schedule_created", route: "/dashboard/scheduling", done: state.schedule_created },
    { key: "work_zone_set", route: "/dashboard/settings?tab=location", done: state.work_zone_set },
    { key: "pos_connected", route: "/dashboard/settings?tab=pos", done: state.pos_connected },
  ];
}

export function FirstRunChecklistCard({ state }: { state: FirstRunState }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const agent = useAgentPanelOptional();
  const items = checklistItems(state);
  const open = items.filter((i) => !i.done);
  if (open.length === 0) return null;
  const doneCount = items.length - open.length;
  return (
    <section
      className="mb-4 rounded-panel border border-emerald-200/70 bg-emerald-50/50 p-4 shadow-xs dark:border-emerald-900/50 dark:bg-emerald-950/20"
      aria-label={t("firstrun.title")}
      data-testid="first-run-checklist"
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">{t("firstrun.title")}</h2>
        <span className="text-xs text-muted-foreground">
          {t("firstrun.progress", { done: doneCount, total: items.length })}
        </span>
      </div>
      <ul className="grid gap-2">
        {items.map((item) => (
          <li key={item.key} className="flex flex-wrap items-center gap-3 text-sm">
            {item.done ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            )}
            <span className={item.done ? "text-muted-foreground line-through" : "font-medium"}>
              {t(`firstrun.${item.key}`)}
            </span>
            {item.done ? null : (
              <span className="ms-auto flex items-center gap-1">
                <Button size="sm" variant="outline" className="gap-1" onClick={() => navigate(item.route)}>
                  {t(`firstrun.${item.key}_cta`)}
                  <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
                </Button>
                {agent ? (
                  <Button size="sm" variant="ghost" className="gap-1" onClick={() => agent.askAgent(t(`firstrun.${item.key}_ask`))}>
                    <Sparkles className="h-3.5 w-3.5" aria-hidden />
                    {t("firstrun.ask_miya")}
                  </Button>
                ) : null}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Dashboard card for a business that has not finished its first setup. Renders nothing once all is done
 * (or if the checklist can't be loaded, e.g. for staff roles). */
export default function FirstRunChecklist() {
  const query = useQuery<FirstRunState | null>({
    queryKey: ["first-run-checklist"],
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      const res = await authFetch(`${API_BASE}/onboarding/checklist/`);
      if (!res.ok) return null;
      return unwrapEnvelope(await res.json()) as FirstRunState;
    },
  });
  if (!query.data) return null;
  return <FirstRunChecklistCard state={query.data} />;
}
