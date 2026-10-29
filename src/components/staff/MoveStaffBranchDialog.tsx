import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { API_BASE } from "@/lib/api";
import type { BusinessLocationBrief } from "@/hooks/use-business-locations";

import { useLanguage } from "@/hooks/use-language";

export type MoveStaffTarget = {
  id: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  primary_location?: string | null;
  primary_location_data?: { id: string; name: string } | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: MoveStaffTarget[];
  locations: BusinessLocationBrief[];
  onMoved: () => void;
};

type StaffBranches = {
  home: { id: string; name: string } | null;
  allowed: { id: string; name: string }[];
  managed: { id: string; name: string }[];
};

const MANAGING_ROLES = new Set(["MANAGER", "SUPERVISOR"]);

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("access_token") || localStorage.getItem("accessToken") || "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Several people: move them to a new home branch. One person: their home branch, the other branches where they
 * may work (and clock in), and for managers / supervisors the branches they run.
 */
export function MoveStaffBranchDialog({ open, onOpenChange, staff, locations, onMoved }: Props) {
  const { t } = useLanguage();
  const [destinationId, setDestinationId] = useState<string>("");
  const [allowed, setAllowed] = useState<Set<string>>(new Set());
  const [managed, setManaged] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState<StaffBranches | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const count = staff.length;
  const single = count === 1 ? staff[0] : null;
  const canManage = Boolean(single?.role && MANAGING_ROLES.has(String(single.role).toUpperCase()));

  const fromBranch = useMemo(() => {
    const names = Array.from(
      new Set(staff.map((s) => s.primary_location_data?.name).filter((n): n is string => Boolean(n))),
    );
    if (names.length === 1) return names[0];
    if (names.length > 1) return t("branches.move.several_branches");
    return null;
  }, [staff, t]);

  const currentHomeIds = useMemo(
    () =>
      new Set(
        staff
          .map((s) => s.primary_location_data?.id || s.primary_location)
          .filter(Boolean)
          .map(String),
      ),
    [staff],
  );

  const destinationOptions = useMemo(() => {
    if (single) return locations;
    const others = locations.filter((loc) => !currentHomeIds.has(String(loc.id)));
    return others.length > 0 ? others : locations;
  }, [locations, currentHomeIds, single]);

  useEffect(() => {
    if (!open) return;
    setDestinationId("");
    setSubmitting(false);
    setLoaded(null);
    setAllowed(new Set());
    setManaged(new Set());
    if (!single) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`${API_BASE}/staff/${single.id}/branches/`, {
          headers: authHeaders(),
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || cancelled) return;
        const row: StaffBranches = data?.data ?? data;
        setLoaded(row);
        setDestinationId(row.home?.id ?? "");
        setAllowed(new Set(row.allowed.map((b) => b.id).filter((id) => id !== row.home?.id)));
        setManaged(new Set(row.managed.map((b) => b.id)));
      } catch {
        /* the move still works without the current branches */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, single]);

  const toggle = (set: Set<string>, id: string, on: boolean) => {
    const next = new Set(set);
    if (on) next.add(id);
    else next.delete(id);
    return next;
  };

  const title = single
    ? t("branches.move.title_one", { name: single.first_name || t("branches.move.staff") })
    : t("branches.move.title_many", { count });

  const destName = locations.find((l) => l.id === destinationId)?.name || "";

  const handleSubmit = async () => {
    if (!destinationId) {
      toast.error(t("generic.toast.pick_a_branch"));
      return;
    }
    if (count === 0) return;
    setSubmitting(true);
    try {
      const res = single
        ? await fetch(`${API_BASE}/staff/${single.id}/branches/`, {
            method: "PATCH",
            headers: authHeaders(),
            credentials: "include",
            body: JSON.stringify({
              primary_location: destinationId,
              allowed_locations: [destinationId, ...Array.from(allowed).filter((id) => id !== destinationId)],
              ...(canManage ? { managed_locations: Array.from(managed) } : {}),
            }),
          })
        : await fetch(`${API_BASE}/staff/transfer-locations/`, {
            method: "POST",
            headers: authHeaders(),
            credentials: "include",
            body: JSON.stringify({
              staff_ids: staff.map((s) => s.id),
              primary_location: destinationId,
              allowed_mode: "set_destination_only",
            }),
          });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.error || data?.detail || t("branches.move.failed"));
      }
      toast.success(
        single
          ? t("branches.move.saved_one", { name: single.first_name || t("branches.move.staff") })
          : t("branches.move.moved_many", { count, branch: destName }),
      );
      onOpenChange(false);
      onMoved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("branches.move.failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const others = locations.filter((loc) => loc.id !== destinationId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-emerald-600" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {single
              ? t("branches.move.description_one")
              : fromBranch
                ? t("branches.move.description_from", { branch: fromBranch })
                : t("branches.move.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {count > 1 ? (
            <ul className="max-h-28 overflow-y-auto rounded-lg bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 space-y-1">
              {staff.map((s) => (
                <li key={s.id}>
                  {s.first_name} {s.last_name}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="space-y-2">
            <Label>{single ? t("branches.move.home_branch") : t("branches.move.new_branch")}</Label>
            <Select value={destinationId} onValueChange={setDestinationId}>
              <SelectTrigger>
                <SelectValue placeholder={t("branches.move.pick")} />
              </SelectTrigger>
              <SelectContent>
                {destinationOptions.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                    {loc.is_primary ? ` (${t("branches.move.main")})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {single && others.length > 0 ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">{t("branches.move.also_works_at")}</legend>
              <p className="text-xs text-muted-foreground">{t("branches.move.also_works_at_hint")}</p>
              {others.map((loc) => (
                <label key={loc.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={allowed.has(loc.id)}
                    onCheckedChange={(on) => setAllowed((s) => toggle(s, loc.id, on === true))}
                  />
                  {loc.name}
                </label>
              ))}
            </fieldset>
          ) : null}

          {single && canManage && loaded ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">{t("branches.move.manages")}</legend>
              <p className="text-xs text-muted-foreground">{t("branches.move.manages_hint")}</p>
              {locations.map((loc) => (
                <label key={loc.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={managed.has(loc.id)}
                    onCheckedChange={(on) => setManaged((s) => toggle(s, loc.id, on === true))}
                  />
                  {loc.name}
                </label>
              ))}
            </fieldset>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleSubmit}
            disabled={submitting || !destinationId}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 me-2 animate-spin" />
                {t("branches.move.saving")}
              </>
            ) : single ? (
              t("branches.move.save")
            ) : (
              t("branches.move.move")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default MoveStaffBranchDialog;
