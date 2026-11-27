import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, Circle, ListChecks, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAgentPanelOptional } from "@/context/AgentPanelContext";
import { useLanguage } from "@/hooks/use-language";
import { API_BASE, authFetch } from "@/lib/api";
import { api } from "@/lib/api";
import { CATEGORY_OWNER_GROUPS } from "@/lib/categoryOwners";
import { unwrapEnvelope } from "@/lib/envelope";
import { cn } from "@/lib/utils";
import { MIZAN_ELEVATED_INSET } from "@/lib/mizan-ui";

/** Pure: how many owner areas have nobody in charge (their work falls to the managers). */
export function countOwnerGaps(owners: Record<string, string | string[]> | undefined): number {
  if (!owners) return 0;
  return CATEGORY_OWNER_GROUPS.flatMap((g) => g.items).filter((cat) => {
    const value = owners[cat.key];
    return !(Array.isArray(value) ? value.some(Boolean) : value);
  }).length;
}

export type FirstRunState = {
  team_invited: boolean;
  schedule_created: boolean;
  work_zone_set: boolean;
  pos_connected: boolean;
};

/** The setup steps: the four from the API, plus "areas nobody owns" when the owners map has gaps. */
export type StepKey = keyof FirstRunState | "owners_set";
type Item = { key: StepKey; route: string; done: boolean };

export const OWNERS_ROUTE = "/dashboard/settings?tab=general-settings&section=general#who-owns-what";

/** Pure: the four first-run steps, in the order a new business should do them. */
export function checklistItems(state: FirstRunState, ownerGaps = 0): Item[] {
  const items: Item[] = [
    { key: "team_invited", route: "/dashboard/staff-app", done: state.team_invited },
    { key: "schedule_created", route: "/dashboard/scheduling", done: state.schedule_created },
    { key: "work_zone_set", route: "/dashboard/settings?tab=location", done: state.work_zone_set },
    { key: "pos_connected", route: "/dashboard/settings?tab=pos", done: state.pos_connected },
  ];
  // Only once there is a team to hand areas to; a business where managers do everything just hides the banner.
  if (state.team_invited && ownerGaps > 0) items.push({ key: "owners_set", route: OWNERS_ROUTE, done: false });
  return items;
}

const HIDE_KEY = "mizan_setup_hidden_until";
const HIDE_DAYS = 7;

function hiddenNow(): boolean {
  try {
    const until = Number(window.localStorage.getItem(HIDE_KEY) || 0);
    return until > Date.now();
  } catch {
    return false;
  }
}

function hideForAWeek() {
  try {
    window.localStorage.setItem(HIDE_KEY, String(Date.now() + HIDE_DAYS * 24 * 60 * 60 * 1000));
  } catch {
    /* storage blocked: it simply shows again next visit */
  }
}

/** A small ring that fills as steps get done. */
function ProgressRing({ done, total }: { done: number; total: number }) {
  const r = 9;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 -rotate-90" aria-hidden>
      <circle cx="12" cy="12" r={r} fill="none" strokeWidth="3" className="stroke-muted" />
      <circle
        cx="12"
        cy="12"
        r={r}
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${(done / total) * c} ${c}`}
        className="stroke-primary transition-[stroke-dasharray] duration-500"
      />
    </svg>
  );
}

/**
 * First-run setup as one quiet line: progress, the single next step with its action, and the full list on demand.
 * It never takes over the dashboard and can be put away for a week.
 */
export function FirstRunChecklistCard({ state, ownerGaps = 0 }: { state: FirstRunState; ownerGaps?: number }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const agent = useAgentPanelOptional();
  const [hidden, setHidden] = useState(hiddenNow);
  const items = checklistItems(state, ownerGaps);
  const open = items.filter((i) => !i.done);
  if (open.length === 0 || hidden) return null;
  const next = open[0];
  const doneCount = items.length - open.length;

  return (
    <section
      className={cn("mb-0 flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-1.5 text-sm", MIZAN_ELEVATED_INSET)}
      aria-label={t("firstrun.title")}
      data-testid="first-run-checklist"
    >
      <span className="flex items-center gap-2">
        <ProgressRing done={doneCount} total={items.length} />
        <span className="font-medium tabular-nums text-muted-foreground">
          {t("firstrun.progress", { done: doneCount, total: items.length })}
        </span>
      </span>

      <span className="min-w-0 flex-1 truncate">
        <span className="text-muted-foreground">{t("firstrun.next")} </span>
        <span className="font-medium">{t(`firstrun.${next.key}`)}</span>
        {next.key === "owners_set" ? (
          <span className="ms-2 hidden text-muted-foreground md:inline">
            {t("firstrun.owners_gap_detail", { count: ownerGaps })}
          </span>
        ) : null}
      </span>

      <span className="flex items-center gap-1">
        <Button size="sm" variant="ghost" className="h-8 gap-1 text-primary" onClick={() => navigate(next.route)}>
          {t(`firstrun.${next.key}_cta`)}
          <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="ghost" className="h-8 gap-1 text-muted-foreground">
              <ListChecks className="h-4 w-4" aria-hidden />
              {t("firstrun.all_steps")}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-2">
            <p className="px-2 pb-2 pt-1 text-xs font-medium text-muted-foreground">{t("firstrun.title")}</p>
            <ul className="grid gap-0.5">
              {items.map((item) => (
                <li key={item.key} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60">
                  {item.done ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                  <span className={item.done ? "flex-1 text-muted-foreground line-through" : "flex-1"}>
                    {t(`firstrun.${item.key}`)}
                  </span>
                  {item.done ? null : (
                    <span className="flex items-center">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        aria-label={t(`firstrun.${item.key}_cta`)}
                        title={t(`firstrun.${item.key}_cta`)}
                        onClick={() => navigate(item.route)}
                      >
                        <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
                      </Button>
                      {agent ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          aria-label={t("firstrun.ask_miya")}
                          title={t("firstrun.ask_miya")}
                          onClick={() => agent.askAgent(t(`firstrun.${item.key}_ask`))}
                        >
                          <Sparkles className="h-3.5 w-3.5" aria-hidden />
                        </Button>
                      ) : null}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>

        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground"
          aria-label={t("firstrun.hide")}
          title={t("firstrun.hide")}
          onClick={() => {
            hideForAWeek();
            setHidden(true);
          }}
        >
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </span>
    </section>
  );
}

/** First-run setup for a business that has not finished it. Renders nothing once all is done
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
  // Managers only (the owners map is 403 for staff): a failed read just means no extra step.
  const owners = useQuery<number>({
    queryKey: ["first-run-owner-gaps"],
    staleTime: 60_000,
    retry: false,
    enabled: Boolean(query.data),
    queryFn: async () => {
      try {
        return countOwnerGaps((await api.getCategoryOwners())?.owners);
      } catch {
        return 0;
      }
    },
  });
  if (!query.data) return null;
  return <FirstRunChecklistCard state={query.data} ownerGaps={owners.data ?? 0} />;
}
