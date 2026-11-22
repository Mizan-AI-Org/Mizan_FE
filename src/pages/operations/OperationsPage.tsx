import { useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MizanPageShell } from "@/components/os/MizanPageShell";
import { HUB_TABS_TRIGGER } from "@/lib/mizan-ui";
import { publishUiContext } from "@/lib/uiContext";
import { useLanguage } from "@/hooks/use-language";
import { useModules } from "@/hooks/use-modules";
import ComplianceDocumentsSettings from "@/components/settings/ComplianceDocumentsSettings";
import { AccountabilityPanel } from "@/components/operations/AccountabilityPanel";
import { OperationsProgressPanel } from "@/components/operations/OperationsProgressPanel";
import { OperationsSubviewShell } from "@/components/operations/OperationsSubviewShell";
import { OperationsCategoryChips } from "@/pages/operations/OperationsCategoryChips";
import { OperationsFilters } from "@/pages/operations/OperationsFilters";
import { OperationsItemSheet } from "@/pages/operations/OperationsItemSheet";
import { OperationsSummaryStrip } from "@/pages/operations/OperationsSummaryStrip";
import { OperationsWorkList } from "@/pages/operations/OperationsWorkList";
import { useOperationsOverview } from "@/pages/operations/useOperationsOverview";
import {
  operationsViewFromParams,
  selectedOperationsId,
  type OperationsFocus,
  type OperationsItem,
  type OperationsView,
} from "@/pages/operations/contract";

/** One Operations page: everything that needs a person (tasks, processes, checklists, requests, incidents, agency),
 * plus Compliance, Accountability and Progress as sub-views (`?view=`). */
export default function OperationsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { isEnabled } = useModules();
  const [params, setParams] = useSearchParams();
  const view = operationsViewFromParams(params);
  const category = params.get("category") || "";
  const layout = params.get("layout") === "board" ? "board" : "list";
  const focus = params.get("focus") || "";
  const staff = params.get("staff") || "";
  const priority = params.get("priority") || "";
  const q = params.get("q") || "";
  const dateFrom = params.get("dateFrom") || "";
  const dateTo = params.get("dateTo") || "";
  const selectedId = selectedOperationsId(params);
  // ?task= opens the layout's own full task sheet; this page's quick sheet opens for ?item= and ?incident=.
  const sheetId = params.get("item") || params.get("incident") || "";

  const overview = useOperationsOverview({
    tab: view,
    category,
    view: layout,
    focus,
    staff,
    priority,
    q,
    dateFrom,
    dateTo,
    item: sheetId,
    enabled: view === "work",
  });
  const selected = useMemo(
    () => overview.data?.items.find((item) => item.id === sheetId) ?? null,
    [overview.data, sheetId],
  );

  useEffect(() => {
    publishUiContext({
      tab: view,
      category,
      view: layout,
      focus,
      selectedItemId: selectedId,
      counts: overview.data?.summary,
      filters: { staff, priority, q, dateFrom, dateTo },
    });
  }, [view, category, layout, focus, selectedId, staff, priority, q, dateFrom, dateTo, overview.data?.summary]);

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (!value) next.delete(key);
      else next.set(key, value);
    }
    setParams(next, { replace: true });
  };

  const setView = (next: OperationsView) => {
    // Sub-views carry their own params (Progress keeps ?tab=staff|categories): start each one clean.
    const fresh = new URLSearchParams();
    if (next !== "work") fresh.set("view", next);
    setParams(fresh, { replace: true });
  };

  const openFull = (item: OperationsItem, href: string | null) => {
    if (item.kind === "task") {
      const next = new URLSearchParams(params);
      next.delete("item");
      next.delete("incident");
      next.set("task", item.id);
      setParams(next, { replace: true });
      return;
    }
    if (href) navigate(href);
  };

  const tabs: { id: OperationsView; label: string; show: boolean }[] = [
    { id: "work", label: t("cursorUi.ops.tab.work"), show: true },
    { id: "compliance", label: t("cursorUi.ops.tab.compliance"), show: true },
    { id: "accountability", label: t("nav.work.accountability"), show: isEnabled("accountability") },
    { id: "progress", label: t("nav.work.progress"), show: true },
  ];

  return (
    <MizanPageShell
      title={t("nav.operations")}
      description={t("cursorUi.ops.subtitle")}
      showAskAgent
      askAgentPrompt={t("cursorUi.ops.ask_prompt")}
    >
      <Tabs value={view} onValueChange={(value) => setView(value as OperationsView)}>
        <TabsList className="mb-4 h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0">
          {tabs
            .filter((tab) => tab.show)
            .map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className={HUB_TABS_TRIGGER}>
                {tab.label}
              </TabsTrigger>
            ))}
        </TabsList>
      </Tabs>

      {view === "work" ? (
        <div className="space-y-4">
          <OperationsSummaryStrip
            summary={overview.data?.summary}
            focus={focus}
            onFocus={(next: OperationsFocus) => set({ focus: next })}
          />
          <OperationsCategoryChips counts={overview.data?.counts} category={category || "all"} onCategory={(value) => set({ category: value })} />
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex gap-2">
              {(["list", "board"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={layout === option}
                  className={`rounded-full px-3 py-1 text-sm ${layout === option ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                  onClick={() => set({ layout: option === "list" ? "" : option })}
                >
                  {t(`cursorUi.ops.layout_${option}`)}
                </button>
              ))}
              <Link
                to="/dashboard/operations/live"
                className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground hover:text-foreground"
              >
                {t("nav.work.live_operations")}
              </Link>
            </div>
            <OperationsFilters staff={staff} priority={priority} q={q} dateFrom={dateFrom} dateTo={dateTo} onChange={set} />
          </div>
          {overview.isError ? <p className="text-sm text-destructive">{t("cursorUi.ops.load_failed")}</p> : null}
          <OperationsWorkList
            items={overview.data?.items ?? []}
            total={overview.data?.total}
            view={layout}
            onOpen={(item) => set({ item: item.id, task: "", incident: "" })}
          />
        </div>
      ) : null}

      {view === "compliance" ? (
        <OperationsSubviewShell>
          <ComplianceDocumentsSettings />
        </OperationsSubviewShell>
      ) : null}

      {view === "accountability" ? (
        isEnabled("accountability") ? (
          <OperationsSubviewShell>
            <p className="mb-4 text-sm text-muted-foreground">{t("accountability.page_subtitle")}</p>
            <AccountabilityPanel />
          </OperationsSubviewShell>
        ) : (
          <OperationsSubviewShell>
            <p className="text-sm text-muted-foreground">{t("cursorUi.ops.module_off", { name: t("modules.accountability.name") })}</p>
            <Link to="/dashboard/settings?tab=billing" className="mt-2 inline-block text-sm text-primary underline">
              {t("cursorUi.ops.module_settings")}
            </Link>
          </OperationsSubviewShell>
        )
      ) : null}

      {view === "progress" ? (
        <OperationsSubviewShell>
          <OperationsProgressPanel />
        </OperationsSubviewShell>
      ) : null}

      <OperationsItemSheet item={selected} onClose={() => set({ item: "", incident: "" })} onOpenFull={openFull} />
    </MizanPageShell>
  );
}
