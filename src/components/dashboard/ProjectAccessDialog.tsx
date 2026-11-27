import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { loadStaffPickerOptions, type StaffPickerOption } from "@/lib/staffPicker";
import { PRIVILEGED_ROLES } from "@/lib/operationalCommandRoles";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PRIVILEGED = new Set<string>(PRIVILEGED_ROLES);

type Access = { restricted?: boolean; member_ids?: string[] };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widgetId: string;
  title: string;
  access?: Access;
  t: (key: string, options?: Record<string, string | number> | string) => string;
};

export function ProjectAccessDialog({ open, onOpenChange, widgetId, title, access, t }: Props) {
  const qc = useQueryClient();
  const [restricted, setRestricted] = useState(Boolean(access?.restricted));
  const [selected, setSelected] = useState<string[]>(access?.member_ids ?? []);
  const [people, setPeople] = useState<StaffPickerOption[]>([]);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRestricted(Boolean(access?.restricted));
    setSelected([...(access?.member_ids ?? [])]);
    setQuery("");
    void loadStaffPickerOptions({ pageSize: 500 }).then(setPeople);
  }, [open, access]);

  const choosable = useMemo(
    () => people.filter((person) => !PRIVILEGED.has(String(person.role || "").toUpperCase())),
    [people],
  );
  const needle = query.trim().toLowerCase();
  const shown = choosable.filter((person) => !needle || person.name.toLowerCase().includes(needle));

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function save() {
    setSaving(true);
    try {
      await api.updateDashboardCustomWidget(widgetId, {
        access: { restricted, member_ids: restricted ? selected : [] },
      });
      await qc.invalidateQueries({ queryKey: ["dashboard-custom-widgets"] });
      toast.success(t("dashboard.project_access.saved"));
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("dashboard.tasks_demands.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("dashboard.project_access.title", { title })}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{t("dashboard.project_access.always")}</p>
        <div className="grid gap-2">
          <Button
            type="button"
            variant={restricted ? "outline" : "default"}
            className="justify-start"
            onClick={() => setRestricted(false)}
          >
            {t("dashboard.project_access.everyone")}
          </Button>
          <Button
            type="button"
            variant={restricted ? "default" : "outline"}
            className="justify-start"
            onClick={() => setRestricted(true)}
          >
            {t("dashboard.project_access.selected")}
          </Button>
        </div>
        {restricted ? (
          <div className="grid gap-2">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("dashboard.project_access.search")}
              aria-label={t("dashboard.project_access.search")}
            />
            {shown.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("dashboard.project_access.empty")}</p>
            ) : (
              <ul className="max-h-56 space-y-1 overflow-y-auto">
                {shown.map((person) => (
                  <li key={person.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted">
                      <Checkbox
                        checked={selected.includes(person.id)}
                        onCheckedChange={() => toggle(person.id)}
                      />
                      <span className="min-w-0 truncate text-sm">
                        {person.name}
                        {person.role ? (
                          <span className="ms-2 text-xs text-muted-foreground">{person.role}</span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
        <Button type="button" onClick={() => void save()} disabled={saving}>
          {t("dashboard.project_access.save")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
