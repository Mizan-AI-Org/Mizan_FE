import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Briefcase, Loader2 } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useBusinessVertical } from "@/hooks/use-business-vertical";
import { api, JOB_TITLE_ROLES, type RoleLowered, type UnmatchedTitle } from "@/lib/api";
import { Button } from "@/components/ui/button";

/** Job title -> role, after an import (apps/accounts/job_titles.py). "Plongeur (5) → [role] [Apply]" gives everyone
 * with that title the role and remembers it for the next import. Used in Add people, onboarding and Settings. */

const selectClass = "h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm";
const CUSTOM = "CUSTOM:";

type CustomRole = { id: string; name: string };

function useRoleLabel() {
  const { t } = useLanguage();
  return (role: string) => t(`staff.add_people.roles.${role.toLowerCase()}`);
}

/** Role picker: the title roles, then the business's own custom titles (value `CUSTOM:<id>`). */
export function TitleRolePicker({
  value,
  onChange,
  customRoles,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  customRoles: CustomRole[];
  ariaLabel?: string;
}) {
  const { t } = useLanguage();
  const roleLabel = useRoleLabel();
  return (
    <select className={selectClass} value={value} aria-label={ariaLabel} onChange={(e) => onChange(e.target.value)}>
      <option value="" disabled>{t("staff.job_titles.pick_role")}</option>
      {JOB_TITLE_ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
      {customRoles.length > 0 && (
        <optgroup label={t("staff.job_titles.custom_titles")}>
          {customRoles.map((c) => <option key={c.id} value={`${CUSTOM}${c.id}`}>{c.name}</option>)}
        </optgroup>
      )}
    </select>
  );
}

function TitleRow({
  title,
  count,
  initial,
  customRoles,
  onApplied,
}: {
  title: string;
  count?: number;
  initial: string;
  customRoles: CustomRole[];
  onApplied?: (title: string) => void;
}) {
  const { t } = useLanguage();
  const roleLabel = useRoleLabel();
  const [choice, setChoice] = useState(initial);
  const [busy, setBusy] = useState(false);

  const apply = async () => {
    if (!choice) return;
    setBusy(true);
    try {
      const custom = choice.startsWith(CUSTOM) ? choice.slice(CUSTOM.length) : "";
      const out = await api.applyTitleMapping(custom ? { title, customRoleId: custom, remember: true }
        : { title, role: choice, remember: true });
      const label = custom ? customRoles.find((c) => c.id === custom)?.name || out?.label || title : roleLabel(choice);
      toast.success(t("staff.job_titles.applied", { title, role: label, count: out?.updated ?? 0 }));
      for (const s of (out?.skipped || []).slice(0, 2)) toast.warning(`${s.name}: ${s.reason}`);
      onApplied?.(title);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("staff.job_titles.failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2" data-testid="job-title-row">
      <span className="min-w-0 flex-1 truncate text-sm font-medium" title={title}>
        {title}
        {count !== undefined && <span className="ms-1 font-normal text-muted-foreground">({count})</span>}
      </span>
      <span className="text-muted-foreground" aria-hidden>→</span>
      <div className="flex w-40 shrink-0">
        <TitleRolePicker value={choice} onChange={setChoice} customRoles={customRoles}
          ariaLabel={t("staff.job_titles.role_for", { title })} />
      </div>
      <Button type="button" size="sm" variant="outline" className="h-8 shrink-0" disabled={!choice || busy || choice === initial}
        onClick={apply}>
        {busy && <Loader2 className="me-1 h-3.5 w-3.5 animate-spin" />}
        {t("staff.job_titles.apply")}
      </Button>
    </div>
  );
}

/** After an import: titles nobody recognised (one row each) and people added at a lower role than their title. */
export function UnmatchedTitlesPanel({
  unmatched = [],
  lowered = [],
  onApplied,
  customRoles,
  beforeImport = false,
}: {
  unmatched?: UnmatchedTitle[];
  lowered?: RoleLowered[];
  /** Called with the title once its role is applied (refresh the preview / drop the row). */
  onApplied?: (title: string) => void;
  /** Defaults to the business's custom titles from Settings. */
  customRoles?: CustomRole[];
  /** Before anyone is added (import preview): the hint says the choice applies to this list. */
  beforeImport?: boolean;
}) {
  const { t } = useLanguage();
  const roleLabel = useRoleLabel();
  const { data: settings } = useBusinessVertical();
  const custom = customRoles ?? settings?.customStaffRoles ?? [];
  if (unmatched.length === 0 && lowered.length === 0) return null;
  return (
    <div className="grid gap-3" data-testid="unmatched-titles-panel">
      {unmatched.length > 0 && (
        <div className="grid gap-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-800 dark:bg-amber-900/20">
          <div className="flex items-start gap-2 text-sm">
            <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <div className="font-medium">{t("staff.job_titles.unmatched_title")}</div>
              <p className="text-xs text-muted-foreground">{t(beforeImport ? "staff.job_titles.preview_hint" : "staff.job_titles.unmatched_hint")}</p>
            </div>
          </div>
          {unmatched.map((u) => (
            <TitleRow key={u.title} title={u.title} count={u.count} initial="" customRoles={custom} onApplied={onApplied} />
          ))}
        </div>
      )}
      {lowered.length > 0 && (
        <div className="grid gap-1 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-800/40">
          {lowered.map((l, i) => (
            <p key={`${l.id || l.name}-${i}`} className="flex items-start gap-1.5" data-testid="role-lowered">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              {t("staff.job_titles.lowered", { name: l.name || l.title, given: roleLabel(l.given), requested: roleLabel(l.requested) })}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/** Settings: the titles the business already answered, and the ones still waiting for a role. Managers only. */
export function JobTitlesSettings() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { data: settings } = useBusinessVertical();
  const custom = settings?.customStaffRoles ?? [];
  const { data, isLoading, isError } = useQuery({
    queryKey: ["staff", "title-mappings"],
    queryFn: () => api.getTitleMappings(),
    retry: false,
  });
  if (isError) return null; // not a manager: nothing to show
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["staff", "title-mappings"] });
  const remembered = data?.remembered ?? [];
  const unmatched = data?.unmatchedTitles ?? [];
  return (
    <div className="space-y-3 rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/30"
      data-testid="job-titles-settings">
      <div>
        <div className="text-sm font-medium">{t("staff.job_titles.settings_title")}</div>
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{t("staff.job_titles.settings_desc")}</p>
      </div>
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <>
          {unmatched.length > 0 && <UnmatchedTitlesPanel unmatched={unmatched} customRoles={custom} onApplied={refresh} />}
          {remembered.length > 0 ? (
            <div className="grid gap-2">
              <div className="text-xs font-medium text-muted-foreground">{t("staff.job_titles.remembered")}</div>
              {remembered.map((m) => (
                <TitleRow key={`${m.title}-${m.customRoleId || m.role}`} title={m.title}
                  initial={m.customRoleId ? `${CUSTOM}${m.customRoleId}` : m.role} customRoles={custom} onApplied={refresh} />
              ))}
            </div>
          ) : (
            unmatched.length === 0 && <p className="text-xs text-muted-foreground">{t("staff.job_titles.none")}</p>
          )}
        </>
      )}
    </div>
  );
}
