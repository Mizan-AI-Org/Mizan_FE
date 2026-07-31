import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  Clock,
  Loader2,
  MessageCircle,
  PhoneForwarded,
  Search,
  Shield,
  Star,
  Users,
  Zap,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  categoryLabel,
  difficultyLabel,
  templateDescription,
  templateName,
  triggerLabel,
} from "./automations-i18n";
import { DIFFICULTY_COLORS, type TemplateItem } from "./automation-types";

const TEMPLATE_ICONS: Record<string, React.ElementType> = {
  welcome_message: MessageCircle,
  out_of_office: Clock,
  lead_qualifier: Users,
  follow_up_reminder: PhoneForwarded,
  keyword_vip: Star,
  shift_clock_in_nudge: Clock,
  missed_shift_escalation: AlertTriangle,
  incident_acknowledgment: Shield,
  reservation_inquiry: Calendar,
  staff_onboarding: Users,
  complaint_triage: MessageCircle,
  emergency_alert: AlertTriangle,
  coverage_request: Calendar,
  miya_handoff: Zap,
};

type Props = {
  templates: TemplateItem[];
  triggers: Record<string, string>;
  loading?: boolean;
  onUseTemplate: (id: string) => void;
  pendingId?: string | null;
};

export function AutomationLibraryPanel({
  templates,
  triggers,
  loading,
  onUseTemplate,
  pendingId,
}: Props) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const categories = useMemo(() => {
    const ids = [...new Set(templates.map((tpl) => tpl.category || "getting_started"))];
    return ["all", ...ids.sort()];
  }, [templates]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((tpl) => {
      if (category !== "all" && tpl.category !== category) return false;
      if (!q) return true;
      const name = templateName(t, tpl.id, tpl.name).toLowerCase();
      const desc = templateDescription(t, tpl.id, tpl.description).toLowerCase();
      const tags = (tpl.tags || []).join(" ").toLowerCase();
      return name.includes(q) || desc.includes(q) || tags.includes(q) || tpl.id.includes(q);
    });
  }, [templates, category, query, t]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("automations.library.search_templates")}
            className="pl-9"
          />
        </div>
        <p className="text-xs text-slate-500 shrink-0">
          {t("automations.library.count", { count: filtered.length })}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium border transition-colors",
              category === cat
                ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400",
            )}
          >
            {cat === "all"
              ? t("automations.library.all_categories")
              : categoryLabel(t, "template", cat)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center text-slate-500">
          {t("automations.library.no_results")}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((tpl) => {
            const Icon = TEMPLATE_ICONS[tpl.id] || Zap;
            const diff = tpl.difficulty || "easy";
            const trigger = triggerLabel(t, tpl.trigger?.type, triggers[tpl.trigger?.type]);
            return (
              <article
                key={tpl.id}
                className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80"
              >
                <div className="flex gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                    <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {templateName(t, tpl.id, tpl.name)}
                      </h3>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                          DIFFICULTY_COLORS[diff] || DIFFICULTY_COLORS.easy,
                        )}
                      >
                        {difficultyLabel(t, diff)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                      {templateDescription(t, tpl.id, tpl.description)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {categoryLabel(t, "template", tpl.category || "getting_started")}
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {t("automations.library.steps", { count: tpl.step_count ?? tpl.steps?.length ?? 0 })}
                  </span>
                </div>

                <p className="mt-2 text-xs text-slate-500 truncate">
                  {t("automations.library.trigger_preview", { trigger })}
                </p>

                {(tpl.tags || []).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(tpl.tags || []).slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] text-emerald-700 dark:text-emerald-400"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <Button
                  type="button"
                  size="sm"
                  className="mt-4 w-full"
                  disabled={pendingId === tpl.id}
                  onClick={() => onUseTemplate(tpl.id)}
                >
                  {pendingId === tpl.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t("automations.library.use_template")
                  )}
                </Button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
