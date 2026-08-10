import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Loader2, Pencil, Power, Trash2, Zap } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { AuthContextType } from "@/contexts/AuthContext.types";
import { api } from "@/lib/api";
import { PAGE_SHELL_BELOW_BACK } from "@/lib/page-shell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { triggerLabel } from "./automations-i18n";
import { AutomationLibraryPanel } from "./AutomationLibraryPanel";
import type { CatalogResponse, TemplateItem } from "./automation-types";
import { AiNativeWorkspace } from "@/components/miya/AiNativeWorkspace";

type AutomationRow = {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  trigger_type: string;
  trigger_label?: string;
  run_count: number;
  last_run_ago?: string | null;
};

function AutomationListRow({
  row,
  accessToken,
  onOpen,
}: {
  row: AutomationRow;
  accessToken: string;
  onOpen: () => void;
}) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const toggleMut = useMutation({
    mutationFn: () => api.toggleAutomation(accessToken, row.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automations"] }),
    onError: () => toast.error(t("automations.toast.toggle_error")),
  });

  const deleteMut = useMutation({
    mutationFn: () => api.deleteAutomation(accessToken, row.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      toast.success(t("automations.toast.deleted"));
    },
    onError: () => toast.error(t("automations.toast.delete_error")),
  });

  const confirmDelete = () => {
    const msg = t("automations.list.delete_confirm", { name: row.name });
    const text =
      msg === "automations.list.delete_confirm" || msg.startsWith("automations.list.delete")
        ? `Delete "${row.name}"? This cannot be undone.`
        : msg;
    if (window.confirm(text)) {
      deleteMut.mutate();
    }
  };

  const trigger = triggerLabel(t, row.trigger_type, row.trigger_label);
  const runsMeta = row.last_run_ago
    ? t("automations.list.runs_last", { count: row.run_count, when: row.last_run_ago })
    : t("automations.list.runs", { count: row.run_count });

  return (
    <div
      className={cn(
        "flex items-start gap-4 rounded-xl border border-slate-200 dark:border-slate-800",
        "bg-card px-4 py-3",
      )}
    >
      <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
        <Zap className="h-5 w-5 text-emerald-600" />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpen}
            className="min-w-0 flex-1 text-left font-semibold text-slate-900 dark:text-white truncate hover:text-emerald-700 dark:hover:text-emerald-400"
          >
            {row.name}
          </button>
          {row.is_active && (
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" aria-hidden />
          )}
        </div>
        <button type="button" onClick={onOpen} className="w-full text-left">
          <div className="text-sm text-slate-600 dark:text-slate-400 truncate">
            {row.description ||
              t("automations.list.summary", { trigger, count: row.run_count })}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">{runsMeta}</div>
        </button>
      </div>

      <div className="flex items-center gap-1 shrink-0 mt-0.5">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 text-slate-600 hover:text-emerald-700 dark:text-slate-300"
          aria-label={t("automations.list.edit")}
          title={t("automations.list.edit")}
          onClick={onOpen}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn(
            "h-9 w-9",
            row.is_active
              ? "text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40"
              : "text-slate-400 hover:text-slate-600",
          )}
          aria-label={
            row.is_active ? t("automations.list.disable") : t("automations.list.enable")
          }
          title={row.is_active ? t("automations.list.disable") : t("automations.list.enable")}
          disabled={toggleMut.isPending}
          onClick={() => toggleMut.mutate()}
        >
          <Power className={cn("h-4 w-4", row.is_active && "fill-current")} />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30"
          aria-label={t("automations.list.delete")}
          title={t("automations.list.delete")}
          disabled={deleteMut.isPending}
          onClick={confirmDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function AutomationsPage() {
  const { accessToken } = useAuth() as AuthContextType;
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "library" ? "library" : "mine";
  const [pendingTemplate, setPendingTemplate] = useState<string | null>(null);

  const { data: catalog, isLoading: catalogLoading } = useQuery({
    queryKey: ["automations-catalog", accessToken],
    queryFn: () => api.getAutomationsCatalog(accessToken!) as Promise<CatalogResponse>,
    enabled: !!accessToken,
  });

  const { data: automations = [], isLoading } = useQuery({
    queryKey: ["automations", accessToken],
    queryFn: () => api.listAutomations(accessToken!),
    enabled: !!accessToken,
  });

  const createFromTemplate = useMutation({
    mutationFn: (templateId: string) => {
      setPendingTemplate(templateId);
      return api.createAutomation(accessToken!, { template_id: templateId, is_active: false });
    },
    onSuccess: (row) => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      navigate(`/dashboard/automations/${row.id}`);
    },
    onError: () => toast.error(t("automations.toast.template_error")),
    onSettled: () => setPendingTemplate(null),
  });

  const templates: TemplateItem[] = useMemo(
    () => (catalog?.templates as TemplateItem[]) || [],
    [catalog],
  );

  const stats = useMemo(() => {
    const rows = automations as AutomationRow[];
    return {
      total: rows.length,
      active: rows.filter((r) => r.is_active).length,
      runs: rows.reduce((sum, r) => sum + (r.run_count || 0), 0),
    };
  }, [automations]);

  return (
    <div className={cn(PAGE_SHELL_BELOW_BACK, "space-y-5 pb-28")}>
      <AiNativeWorkspace module="automations" />
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t("automations.title")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            {t("automations.subtitle")}
          </p>
        </div>
        <Button asChild className="gap-2 shrink-0">
          <Link to="/dashboard/automations/new">
            <Plus className="h-4 w-4" />
            {t("automations.create")}
          </Link>
        </Button>
      </header>

      <div className="grid grid-cols-3 gap-3 max-w-lg">
        {[
          { label: t("automations.stats.total"), value: stats.total },
          { label: t("automations.stats.active"), value: stats.active },
          { label: t("automations.stats.runs"), value: stats.runs },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-slate-200 bg-card px-3 py-2 dark:border-slate-800"
          >
            <div className="text-lg font-bold text-slate-900 dark:text-white">{s.value}</div>
            <div className="text-[11px] text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setSearchParams(v === "library" ? { tab: "library" } : {})}
        className="space-y-5"
      >
        <TabsList className="h-auto w-full sm:w-auto inline-flex gap-1 bg-slate-100/90 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
          <TabsTrigger value="mine" className="flex-1 sm:flex-none rounded-lg px-4 py-2 text-sm font-semibold">
            {t("automations.tabs.mine")} ({stats.total})
          </TabsTrigger>
          <TabsTrigger value="library" className="flex-1 sm:flex-none rounded-lg px-4 py-2 text-sm font-semibold">
            {t("automations.tabs.library")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mine" className="mt-0 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : (automations as AutomationRow[]).length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center">
              <p className="text-slate-600 dark:text-slate-400 mb-4">{t("automations.list.empty")}</p>
              <Button variant="outline" onClick={() => setSearchParams({ tab: "library" })}>
                {t("automations.library.browse")}
              </Button>
            </div>
          ) : (
            (automations as AutomationRow[]).map((row) => (
              <AutomationListRow
                key={row.id}
                row={row}
                accessToken={accessToken!}
                onOpen={() => navigate(`/dashboard/automations/${row.id}`)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="library" className="mt-0">
          <AutomationLibraryPanel
            templates={templates}
            triggers={(catalog?.triggers as Record<string, string>) || {}}
            loading={catalogLoading}
            onUseTemplate={(id) => createFromTemplate.mutate(id)}
            pendingId={pendingTemplate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
