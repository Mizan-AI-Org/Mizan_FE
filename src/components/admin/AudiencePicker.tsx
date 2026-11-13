import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Users } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProcessAssigneeMultiSelect } from "@/components/admin/ProcessAssigneeMultiSelect";
import { useLanguage } from "@/hooks/use-language";
import { api, type AudienceMode, type AudiencePreview, type AudienceSpec } from "@/lib/api";
import { cn } from "@/lib/utils";

export const EMPTY_AUDIENCE: AudienceSpec = {
  people: [],
  roles: [],
  titles: [],
  departments: [],
  everyone: false,
  on_shift: false,
  branch_id: null,
  mode: "first",
};

/** Normalise a (possibly partial) server spec into a full one. */
export function normalizeAudience(a?: Partial<AudienceSpec> | null): AudienceSpec {
  return {
    ...EMPTY_AUDIENCE,
    ...(a || {}),
    people: (a?.people || []).map(String),
    roles: a?.roles || [],
    titles: a?.titles || [],
    departments: a?.departments || [],
    mode: (a?.mode as AudienceMode) || "first",
  };
}

export function audienceIsEmpty(a: AudienceSpec, ignoreBranchAndShift = true): boolean {
  void ignoreBranchAndShift;
  return !(a.people.length || a.roles.length || a.titles.length || a.departments.length || a.everyone);
}

type Props = {
  value: AudienceSpec;
  onChange: (next: AudienceSpec) => void;
  /** Hide the named-people picker (process templates keep people in standing_assignees). */
  hidePeople?: boolean;
  /** Day used to work out who is on shift (YYYY-MM-DD). */
  date?: string;
  disabled?: boolean;
};

function Chip({
  active,
  onClick,
  children,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50",
        active
          ? "border-emerald-600 bg-emerald-600 text-white"
          : "border-border bg-background text-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function toggle(list: string[], v: string): string[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export function AudiencePicker({ value, onChange, hidePeople = false, date, disabled = false }: Props) {
  const { t } = useLanguage();
  const optionsQ = useQuery({
    queryKey: ["audience-options"],
    queryFn: () => api.getAudienceOptions(),
    staleTime: 60_000,
  });
  const options = optionsQ.data;
  const set = (patch: Partial<AudienceSpec>) => onChange({ ...value, ...patch });

  const hasTarget = !audienceIsEmpty(value);
  const specKey = JSON.stringify([value, date]);
  const [debouncedKey, setDebouncedKey] = useState(specKey);
  useEffect(() => {
    const h = setTimeout(() => setDebouncedKey(specKey), 350);
    return () => clearTimeout(h);
  }, [specKey]);

  const previewQ = useQuery<AudiencePreview, Error>({
    queryKey: ["audience-preview", debouncedKey],
    queryFn: () => api.previewAudience(JSON.parse(debouncedKey)[0], date),
    enabled: hasTarget,
    retry: false,
    staleTime: 15_000,
  });

  const staffOptions = useMemo(
    () =>
      (options?.people || []).map((p) => ({
        id: String(p.id),
        name: p.name,
        role: p.role,
        department: p.department,
      })),
    [options],
  );

  const preview = hasTarget ? previewQ.data : undefined;
  const reachCount = preview?.count ?? 0;
  const multi = hasTarget && reachCount > 1;
  const names = (preview?.people || []).map((p) => p.name);
  const shown = names.slice(0, 6).join(", ");
  const more = names.length > 6 ? t("audience.preview_more", { n: names.length - 6 }) : "";

  const modes: { key: AudienceMode; label: string; help: string }[] = [
    { key: "first", label: t("audience.mode_first"), help: t("audience.mode_first_help") },
    { key: "all", label: t("audience.mode_all"), help: t("audience.mode_all_help") },
    { key: "each", label: t("audience.mode_each"), help: t("audience.mode_each_help") },
  ];

  return (
    <div className="space-y-4">
      {!hidePeople && (
        <div className="space-y-1.5">
          <Label>{t("audience.people")}</Label>
          <ProcessAssigneeMultiSelect
            selectedIds={value.people}
            staffOptions={staffOptions}
            onChange={(ids) => set({ people: ids })}
            disabled={disabled}
            showDepartmentPills={false}
            emptyTriggerLabel={t("audience.people_pick")}
            selectedTriggerLabel={(n) => t("audience.people_selected", { n })}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label>{t("audience.everyone_label")}</Label>
        <div className="flex items-center gap-2">
          <Switch
            checked={value.everyone}
            disabled={disabled}
            onCheckedChange={(v) => set({ everyone: v })}
            id="audience-everyone"
          />
          <Label htmlFor="audience-everyone" className="font-normal">
            {t("audience.everyone")}
          </Label>
        </div>
      </div>

      {!value.everyone && (
        <>
          {!!options?.roles.length && (
            <div className="space-y-1.5">
              <Label>{t("audience.roles")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {options.roles.map((r) => (
                  <Chip
                    key={r.value}
                    disabled={disabled}
                    active={value.roles.includes(r.value)}
                    onClick={() => set({ roles: toggle(value.roles, r.value) })}
                  >
                    {r.label} ({r.count})
                  </Chip>
                ))}
              </div>
            </div>
          )}
          {!!options?.titles.length && (
            <div className="space-y-1.5">
              <Label>{t("audience.titles")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {options.titles.map((r) => (
                  <Chip
                    key={r.value}
                    disabled={disabled}
                    active={value.titles.includes(r.value)}
                    onClick={() => set({ titles: toggle(value.titles, r.value) })}
                  >
                    {r.value} ({r.count})
                  </Chip>
                ))}
              </div>
            </div>
          )}
          {!!options?.departments.length && (
            <div className="space-y-1.5">
              <Label>{t("audience.departments")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {options.departments.map((r) => (
                  <Chip
                    key={r.value}
                    disabled={disabled}
                    active={value.departments.includes(r.value)}
                    onClick={() => set({ departments: toggle(value.departments, r.value) })}
                  >
                    {r.value} ({r.count})
                  </Chip>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex items-center gap-2">
        <Switch
          id="audience-on-shift"
          checked={value.on_shift}
          disabled={disabled}
          onCheckedChange={(v) => set({ on_shift: v })}
        />
        <Label htmlFor="audience-on-shift" className="font-normal">
          {t("audience.on_shift")}
        </Label>
      </div>

      {(options?.branches.length ?? 0) > 1 && (
        <div className="space-y-1.5">
          <Label>{t("audience.branch")}</Label>
          <Select
            value={value.branch_id || "__all__"}
            onValueChange={(v) => set({ branch_id: v === "__all__" ? null : v })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("audience.branch_all")}</SelectItem>
              {options!.branches.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {multi && (
        <div className="space-y-1.5">
          <Label>{t("audience.mode_label")}</Label>
          <RadioGroup
            value={value.mode}
            onValueChange={(v) => set({ mode: v as AudienceMode })}
            className="gap-2"
            disabled={disabled}
          >
            {modes.map((m) => (
              <label
                key={m.key}
                htmlFor={`audience-mode-${m.key}`}
                className="flex cursor-pointer items-start gap-2 rounded-md border border-border/60 p-2"
              >
                <RadioGroupItem value={m.key} id={`audience-mode-${m.key}`} className="mt-0.5" />
                <span>
                  <span className="block text-sm font-medium">{m.label}</span>
                  <span className="block text-xs text-muted-foreground">{m.help}</span>
                </span>
              </label>
            ))}
          </RadioGroup>
        </div>
      )}

      {hasTarget && (
        <div
          className="flex items-start gap-2 rounded-md bg-muted/60 px-3 py-2 text-sm"
          aria-live="polite"
        >
          {previewQ.isFetching ? (
            <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span>
            {previewQ.isError
              ? previewQ.error.message || t("audience.preview_none")
              : preview
                ? (preview.count === 1 ? t("audience.preview_reaches_one") : t("audience.preview_reaches", { count: preview.count })) +
                  (shown ? `: ${shown}${more ? ` ${more}` : ""}` : "")
                : t("audience.preview_loading")}
          </span>
        </div>
      )}
    </div>
  );
}

export default AudiencePicker;
