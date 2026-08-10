import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Loader2,
  Plus,
  Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { AuthContextType } from "@/contexts/AuthContext.types";
import { api } from "@/lib/api";
import { AUTOMATION_BUILDER_SHELL } from "@/lib/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { actionLabel, triggerLabel } from "./automations-i18n";
import { ActionLibrarySheet } from "./ActionLibrarySheet";
import { AutomationStepEditor } from "./AutomationStepEditor";
import {
  STEP_DEFAULTS,
  normalizeAutomationSteps,
  type AutomationStep,
  type CatalogItem,
  type CatalogResponse,
} from "./automation-types";

const CANVAS_BG =
  "bg-slate-50/90 dark:bg-slate-950/30 [background-image:radial-gradient(circle,rgb(148_163_184/0.28)_1px,transparent_1px)] dark:[background-image:radial-gradient(circle,rgb(71_85_105/0.45)_1px,transparent_1px)] [background-size:24px_24px]";

const NODE_CARD =
  "rounded-xl border border-slate-200/90 dark:border-slate-700/90 bg-card shadow-sm";

const CONNECTOR = "w-px h-8 bg-slate-300 dark:bg-slate-600 mx-auto";

export default function AutomationBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new" || !id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { accessToken } = useAuth() as AuthContextType;
  const { t } = useLanguage();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const untitledLabel = t("automations.builder.untitled");

  const [libraryOpen, setLibraryOpen] = useState(false);
  const [stopMiya, setStopMiya] = useState(false);

  const { data: catalog } = useQuery({
    queryKey: ["automations-catalog", accessToken],
    queryFn: () => api.getAutomationsCatalog(accessToken!) as Promise<CatalogResponse>,
    enabled: !!accessToken,
  });

  const { data: existing, isLoading } = useQuery({
    queryKey: ["automation", id, accessToken],
    queryFn: () => api.getAutomation(accessToken!, id!),
    enabled: !!accessToken && !isNew && !!id,
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [triggerType, setTriggerType] = useState("new_message_received");
  const [keywords, setKeywords] = useState("");
  const [triggerTag, setTriggerTag] = useState("");
  const [steps, setSteps] = useState<AutomationStep[]>([]);

  useEffect(() => {
    if (existing) {
      setName(existing.name || untitledLabel);
      setDescription(existing.description || "");
      setIsActive(Boolean(existing.is_active));
      setStopMiya(Boolean(existing.stop_miya_on_match));
      setTriggerType(existing.trigger_type || "new_message_received");
      const cfg = existing.trigger_config || {};
      const kws = (cfg.keywords as string[]) || [];
      setKeywords(kws.join(", "));
      setTriggerTag(String(cfg.tag || ""));
      setSteps(normalizeAutomationSteps((existing.steps as AutomationStep[]) || []));
      return;
    }
    if (isNew) setName(untitledLabel);
  }, [existing, isNew, untitledLabel]);

  useEffect(() => {
    if (isNew && !existing) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [isNew, existing]);

  const actionCatalog: CatalogItem[] = useMemo(
    () =>
      catalog?.action_catalog ||
      Object.entries(catalog?.actions || {}).map(([actionId, label]) => ({
        id: actionId,
        label,
        category: "messaging",
      })),
    [catalog],
  );

  const triggers = useMemo(
    () =>
      catalog?.trigger_catalog ||
      Object.entries(catalog?.triggers || {}).map(([triggerId, label]) => ({
        id: triggerId,
        label,
        category: "whatsapp",
      })),
    [catalog],
  );

  const buildTriggerConfig = () => {
    if (triggerType === "keyword_match") {
      return { keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean) };
    }
    if (triggerType === "tag_added") {
      return { tag: triggerTag.trim() };
    }
    if (triggerType === "time_based") {
      return { off_hours: true };
    }
    return {};
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim() || untitledLabel,
        description,
        is_active: isActive,
        stop_miya_on_match: stopMiya,
        trigger_type: triggerType,
        trigger_config: buildTriggerConfig(),
        steps,
      };
      if (isNew) return api.createAutomation(accessToken!, payload);
      return api.updateAutomation(accessToken!, id!, payload);
    },
    onSuccess: (row) => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      toast.success(
        isActive ? t("automations.toast.save_active") : t("automations.toast.save_draft"),
      );
      if (isNew && row?.id) navigate(`/dashboard/automations/${row.id}`, { replace: true });
    },
    onError: () => toast.error(t("automations.toast.save_error")),
  });

  const addStep = (type: string) => {
    setSteps((s) => [...s, { type, config: { ...(STEP_DEFAULTS[type] || {}) } }]);
  };

  const updateStep = (index: number, config: Record<string, unknown>) => {
    setSteps((prev) => prev.map((st, i) => (i === index ? { ...st, config } : st)));
  };

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const moveStep = (index: number, dir: -1 | 1) => {
    setSteps((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  if (!isNew && isLoading) {
    return (
      <div className={cn(AUTOMATION_BUILDER_SHELL, "flex justify-center py-24")}>
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const hasIssue = steps.length === 0;
  const variables = catalog?.variables || [];

  return (
    <div className={cn(AUTOMATION_BUILDER_SHELL, "space-y-4")}>
      {/* Compact toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200/90 bg-card p-3 shadow-sm dark:border-slate-800 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link to="/dashboard/automations" aria-label={t("automations.builder.back_automations")}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Input
            ref={nameInputRef}
            id="automation-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("automations.builder.name_placeholder")}
            onFocus={(e) => {
              if (name === untitledLabel) e.target.select();
            }}
            aria-label={t("automations.builder.name_label")}
            className="h-10 min-w-0 flex-1 border-none bg-transparent text-lg font-semibold shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <div className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs dark:border-slate-700">
            <Label htmlFor="stop-miya" className="text-slate-600 dark:text-slate-300">
              {t("automations.builder.stop_miya")}
            </Label>
            <Switch id="stop-miya" checked={stopMiya} onCheckedChange={setStopMiya} />
          </div>
          <div className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs dark:border-slate-700">
            <Label htmlFor="active-toggle">{t("automations.builder.active")}</Label>
            <Switch id="active-toggle" checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="shrink-0">
            {saveMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isActive ? (
              t("automations.builder.save_activate")
            ) : (
              t("automations.builder.save_draft")
            )}
          </Button>
        </div>
      </div>

      {hasIssue && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {t("automations.builder.validation_no_actions")}
        </div>
      )}

      {/* Full-width canvas */}
      <div
        className={cn(
          "relative -mx-4 min-h-[min(72vh,820px)] overflow-hidden border-y border-slate-200/80 dark:border-slate-800 sm:-mx-6 lg:-mx-8",
          CANVAS_BG,
        )}
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col px-6 py-10 sm:px-10 sm:py-12 lg:max-w-4xl">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {t("automations.builder.trigger_label")}
          </p>
          <div className={cn("w-full p-5 ring-1 ring-emerald-500/20", NODE_CARD)}>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                <Zap className="h-5 w-5 text-emerald-600" />
              </div>
              <Select value={triggerType} onValueChange={setTriggerType}>
                <SelectTrigger className="flex-1 h-11">
                  <SelectValue placeholder={t("automations.builder.choose_trigger")} />
                </SelectTrigger>
                <SelectContent>
                  {triggers.map((tr) => (
                    <SelectItem key={tr.id} value={tr.id}>
                      {triggerLabel(t, tr.id, tr.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {triggerType === "keyword_match" && (
              <>
                <Input
                  placeholder={t("automations.builder.keywords_placeholder")}
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="mb-2"
                />
                <p className="text-xs text-slate-500">{t("automations.builder.keywords_hint")}</p>
              </>
            )}
            {triggerType === "tag_added" && (
              <Input
                placeholder={t("automations.builder.tag_placeholder")}
                value={triggerTag}
                onChange={(e) => setTriggerTag(e.target.value)}
              />
            )}
            {triggerType === "time_based" && (
              <p className="text-xs text-slate-500">{t("automations.builder.time_based_hint")}</p>
            )}
          </div>

          <div className={CONNECTOR} />
          <Button
            type="button"
            variant="outline"
            size="default"
            className="mx-auto gap-2 rounded-full px-5"
            onClick={() => setLibraryOpen(true)}
          >
            <Plus className="h-4 w-4" />
            {t("automations.builder.add_from_library")}
          </Button>

          {steps.map((step, index) => {
            const stepLabel = actionLabel(t, step.type, catalog?.actions?.[step.type]);
            return (
              <React.Fragment key={`${step.type}-${index}`}>
                <div className={CONNECTOR} />
                <div className={cn("group relative w-full p-5", NODE_CARD)}>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {index + 1}. {stepLabel}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={index === 0}
                        onClick={() => moveStep(index, -1)}
                        aria-label={t("automations.builder.move_up")}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={index === steps.length - 1}
                        onClick={() => moveStep(index, 1)}
                        aria-label={t("automations.builder.move_down")}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-slate-500"
                        onClick={() => removeStep(index)}
                      >
                        {t("automations.builder.remove")}
                      </Button>
                    </div>
                  </div>
                  <AutomationStepEditor
                    step={step}
                    onChange={(config) => updateStep(index, config)}
                  />
                </div>
              </React.Fragment>
            );
          })}

          {steps.length > 0 && (
            <>
              <div className={CONNECTOR} />
              <Button
                type="button"
                variant="outline"
                className="w-full h-11"
                onClick={() => setLibraryOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("automations.builder.add_action_placeholder")}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Meta below canvas */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-card p-4 dark:border-slate-800">
          <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
            {t("automations.builder.variables_title")}
          </h3>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {variables.map((v) => (
              <li key={v.token} className="text-xs">
                <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">{v.token}</code>
                <span className="mt-0.5 block text-slate-500">{v.description}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200 bg-card p-4 dark:border-slate-800">
          <Label htmlFor="automation-description">{t("automations.builder.description_label")}</Label>
          <Textarea
            id="automation-description"
            placeholder={t("automations.builder.description_placeholder")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-2 resize-none"
          />
        </div>
      </div>

      <ActionLibrarySheet
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        actions={actionCatalog}
        onSelect={addStep}
      />
    </div>
  );
}
