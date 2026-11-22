import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MizanPageShell } from "@/components/os/MizanPageShell";
import { HUB_TABS_TRIGGER } from "@/lib/mizan-ui";
import { publishUiContext } from "@/lib/uiContext";
import ComplianceDocumentsSettings from "@/components/settings/ComplianceDocumentsSettings";
import { ResponsibilityGapCard } from "@/components/responsibilities/ResponsibilityGapCard";
import { OperationsCategoryChips } from "@/pages/operations/OperationsCategoryChips";
import { OperationsFilters } from "@/pages/operations/OperationsFilters";
import { OperationsItemSheet } from "@/pages/operations/OperationsItemSheet";
import { OperationsSummaryStrip } from "@/pages/operations/OperationsSummaryStrip";
import { OperationsWorkList } from "@/pages/operations/OperationsWorkList";
import { useOperationsOverview } from "@/pages/operations/useOperationsOverview";
import { selectedOperationsId, type OperationsFocus } from "@/pages/operations/contract";

export default function OperationsPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "compliance" ? "compliance" : "work";
  const category = params.get("category") || "";
  const view = params.get("view") || "list";
  const focus = params.get("focus") || "";
  const staff = params.get("staff") || "";
  const priority = params.get("priority") || "";
  const q = params.get("q") || "";
  const dateFrom = params.get("dateFrom") || "";
  const dateTo = params.get("dateTo") || "";
  const selectedId = selectedOperationsId(params);

  const overview = useOperationsOverview({ tab, category, view, focus, staff, priority, q, dateFrom, dateTo, item: selectedId });
  const selected = useMemo(
    () => overview.data?.items.find((item) => item.id === selectedId) ?? null,
    [overview.data, selectedId],
  );

  useEffect(() => {
    publishUiContext({
      tab,
      category,
      view,
      focus,
      selectedItemId: selectedId,
      counts: overview.data?.summary,
      filters: { staff, priority, q, dateFrom, dateTo },
    });
  }, [tab, category, view, focus, selectedId, staff, priority, q, dateFrom, dateTo, overview.data?.summary]);

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (!value) next.delete(key);
      else next.set(key, value);
    }
    setParams(next, { replace: true });
  };

  return (
    <MizanPageShell title="Operations" description="Everything that needs a person today." showAskAgent askAgentPrompt="What needs attention on Operations?">
      <Tabs value={tab} onValueChange={(value) => set({ tab: value === "work" ? "" : value })}>
        <TabsList className="mb-4 h-auto w-full justify-start gap-2 bg-transparent p-0">
          <TabsTrigger value="work" className={HUB_TABS_TRIGGER}>Work</TabsTrigger>
          <TabsTrigger value="compliance" className={HUB_TABS_TRIGGER}>Compliance</TabsTrigger>
        </TabsList>
        <TabsContent value="work" className="space-y-4">
          <ResponsibilityGapCard />
          <OperationsSummaryStrip
            summary={overview.data?.summary}
            focus={focus}
            onFocus={(next: OperationsFocus) => set({ focus: next })}
          />
          <OperationsCategoryChips counts={overview.data?.counts} category={category || "all"} onCategory={(value) => set({ category: value })} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {(["list", "board"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`rounded-full px-3 py-1 text-sm ${view === option ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                  onClick={() => set({ view: option === "list" ? "" : option })}
                >
                  {option[0].toUpperCase() + option.slice(1)}
                </button>
              ))}
            </div>
            <OperationsFilters
              staff={staff}
              priority={priority}
              q={q}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onChange={set}
            />
          </div>
          {overview.isError ? <p className="text-sm text-destructive">Operations could not be loaded.</p> : null}
          <OperationsWorkList items={overview.data?.items ?? []} view={view} onOpen={(item) => set({ item: item.id })} />
        </TabsContent>
        <TabsContent value="compliance">
          <ComplianceDocumentsSettings />
        </TabsContent>
      </Tabs>
      <OperationsItemSheet item={selected} onClose={() => set({ item: "", task: "", incident: "" })} />
    </MizanPageShell>
  );
}
