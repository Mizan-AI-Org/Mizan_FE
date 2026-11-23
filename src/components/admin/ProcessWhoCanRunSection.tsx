import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Users } from "lucide-react";
import { AudiencePicker, audienceIsEmpty, EMPTY_AUDIENCE, normalizeAudience } from "@/components/admin/AudiencePicker";
import { ProcessAssigneeMultiSelect } from "@/components/admin/ProcessAssigneeMultiSelect";
import { useLanguage } from "@/hooks/use-language";
import { api, type AudienceSpec } from "@/lib/api";
import type { StaffPickerOption } from "@/lib/staffPicker";
import { cn } from "@/lib/utils";

type Props = {
  standingAssignees: string[];
  onStandingAssigneesChange: (ids: string[]) => void;
  audience: AudienceSpec;
  onAudienceChange: (next: AudienceSpec) => void;
  staffOptions: StaffPickerOption[];
  disabled?: boolean;
};

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

export function ProcessWhoCanRunSection({
  standingAssignees,
  onStandingAssigneesChange,
  audience,
  onAudienceChange,
  staffOptions,
  disabled = false,
}: Props) {
  const { t } = useLanguage();
  const optionsQ = useQuery({
    queryKey: ["audience-options"],
    queryFn: () => api.getAudienceOptions(),
    staleTime: 60_000,
  });
  const departments = optionsQ.data?.departments ?? [];

  const previewSpec = useMemo(
    () => ({ ...audience, people: standingAssignees }),
    [audience, standingAssignees],
  );
  const hasTarget = !audienceIsEmpty(previewSpec) || standingAssignees.length > 0;
  const specKey = JSON.stringify(previewSpec);
  const [debouncedKey, setDebouncedKey] = useState(specKey);
  useEffect(() => {
    const h = setTimeout(() => setDebouncedKey(specKey), 350);
    return () => clearTimeout(h);
  }, [specKey]);

  const previewQ = useQuery({
    queryKey: ["process-audience-preview", debouncedKey],
    queryFn: () => api.previewAudience(JSON.parse(debouncedKey)),
    enabled: hasTarget,
    staleTime: 15_000,
    retry: false,
  });

  const setAudience = (patch: Partial<AudienceSpec>) => {
    onAudienceChange({ ...audience, ...patch });
  };

  return (
    <div className="space-y-5">
      {departments.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">{t("process.form.assign_departments_title")}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">{t("process.form.assign_departments_hint")}</p>
          <div className="flex flex-wrap gap-2">
            {departments.map((d) => {
              const active = audience.departments.includes(d.value);
              return (
                <button
                  key={d.value}
                  type="button"
                  disabled={disabled}
                  aria-pressed={active}
                  onClick={() => setAudience({ departments: toggle(audience.departments, d.value), everyone: false })}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50",
                    active
                      ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                      : "border-border bg-background text-foreground hover:border-emerald-500/40 hover:bg-muted/60",
                  )}
                >
                  {d.value}
                  <span className={cn("ms-1 tabular-nums", active ? "text-white/90" : "text-muted-foreground")}>
                    ({d.count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <AudiencePicker
        hidePeople
        hideDepartments
        value={audience}
        onChange={onAudienceChange}
        disabled={disabled}
      />

      <div className="space-y-2 rounded-xl border border-dashed border-border/80 bg-muted/20 p-3">
        <p className="text-sm font-medium">{t("process.form.assign_individuals_title")}</p>
        <p className="text-xs text-muted-foreground">{t("process.form.assign_individuals_hint")}</p>
        <ProcessAssigneeMultiSelect
          selectedIds={standingAssignees}
          staffOptions={staffOptions}
          onChange={onStandingAssigneesChange}
          disabled={disabled}
          showDepartmentPills={false}
          emptyTriggerLabel={t("process.assignee.empty_trigger")}
          selectedTriggerLabel={(n) => t("process.assignee.selected_trigger", { count: n })}
          popoverHint={t("process.form.assign_individuals_popover_hint")}
        />
      </div>

      {hasTarget ? (
        <div
          className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-50/50 px-3 py-2.5 text-sm dark:bg-emerald-950/20"
          aria-live="polite"
        >
          {previewQ.isFetching ? (
            <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <Users className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
          )}
          <span className="text-foreground">
            {previewQ.isError
              ? previewQ.error?.message || t("audience.preview_none")
              : previewQ.data
                ? previewQ.data.count === 1
                  ? t("audience.preview_reaches_one")
                  : t("audience.preview_reaches", { count: previewQ.data.count })
                : t("audience.preview_loading")}
            {previewQ.data?.count ? (
              <span className="block text-xs text-muted-foreground mt-0.5">
                {t("process.form.assign_live_hint")}
              </span>
            ) : null}
          </span>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t("process.form.assign_none_hint")}</p>
      )}
    </div>
  );
}

export function emptyProcessAudience(): AudienceSpec {
  return normalizeAudience(EMPTY_AUDIENCE);
}