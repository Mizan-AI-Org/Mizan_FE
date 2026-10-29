import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { LayoutGrid, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ModulePicker, formatMoney, monthlyTotal } from "@/components/onboarding/ModulePicker";
import { useLanguage } from "@/hooks/use-language";
import { TENANT_MODULES_QUERY_KEY } from "@/hooks/use-modules";
import { api } from "@/lib/api";
import type { ModuleKey } from "@/lib/types";

/** Settings > Modules: what this workspace runs and pays for. Turning a module off hides it; no data is deleted. */
export default function ModulesSettings() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: TENANT_MODULES_QUERY_KEY, queryFn: () => api.getTenantModules() });
  const [draft, setDraft] = useState<ModuleKey[] | null>(null);
  useEffect(() => {
    if (query.data && draft === null) setDraft(query.data.selected ?? query.data.enabled);
  }, [query.data, draft]);

  const saved = query.data?.selected ?? query.data?.enabled ?? [];
  const prices = useMemo(
    () => Object.fromEntries((query.data?.modules ?? []).map((m) => [m.key, m.priceMonthly])) as Partial<Record<ModuleKey, number>>,
    [query.data],
  );
  const recommended = useMemo(
    () => (query.data?.modules ?? []).filter((m) => m.recommended).map((m) => m.key),
    [query.data],
  );
  const pricing = query.data?.pricing;
  const dirty = !!draft && (draft.length !== saved.length || draft.some((k) => !saved.includes(k)));
  const before = monthlyTotal(saved, prices, pricing);
  const after = monthlyTotal(draft ?? saved, prices, pricing);
  const adding = (draft ?? []).some((k) => !saved.includes(k));
  const currency = pricing?.currency || "MAD";

  const save = useMutation({
    mutationFn: () => api.updateTenantModules(draft ?? saved),
    onSuccess: (res) => {
      queryClient.setQueryData(TENANT_MODULES_QUERY_KEY, {
        ...query.data!,
        enabled: res.enabled,
        selected: res.selected,
        suspended: res.suspended,
      });
      void queryClient.invalidateQueries({ queryKey: ["billing-overview"] });
      setDraft(res.selected);
      const proration = res.billing?.proration;
      toast.success(
        proration
          ? t("modules.saved_prorated", { amount: formatMoney(proration.total, proration.currency), number: proration.number })
          : t("modules.saved"),
      );
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (query.isLoading || !draft) {
    return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  }
  const canEdit = !!query.data?.canEdit;
  return (
    <section className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <header className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <LayoutGrid className="h-5 w-5" aria-hidden />
        </span>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-foreground">{t("modules.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("modules.settings_desc")}</p>
          <Link to="/dashboard/settings?tab=billing" className="text-xs font-semibold text-primary hover:underline">
            {t("modules.see_billing")}
          </Link>
        </div>
      </header>

      <ModulePicker
        value={draft}
        onChange={setDraft}
        recommended={recommended}
        prices={prices}
        pricing={pricing}
        disabled={!canEdit || save.isPending}
      />

      {canEdit ? (
        <div
          className={`sticky bottom-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background/95 px-4 py-3 shadow-sm backdrop-blur transition-opacity ${
            dirty ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          aria-hidden={!dirty}
        >
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-foreground">
              {t("modules.next_bill_change", {
                after: formatMoney(after, currency),
                before: formatMoney(before, currency),
              })}
            </p>
            <p className="text-xs text-muted-foreground">
              {adding ? t("modules.prorate_note") : t("modules.off_keeps_data")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDraft(saved)} disabled={save.isPending}>
              {t("modules.discard")}
            </Button>
            <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("modules.save")}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t("modules.ask_owner")}</p>
      )}
    </section>
  );
}
