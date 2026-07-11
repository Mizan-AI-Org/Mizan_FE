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

export type MoveStaffTarget = {
  id: string;
  first_name?: string;
  last_name?: string;
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

export function MoveStaffBranchDialog({
  open,
  onOpenChange,
  staff,
  locations,
  onMoved,
}: Props) {
  const [destinationId, setDestinationId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const count = staff.length;

  const fromBranch = useMemo(() => {
    const names = Array.from(
      new Set(
        staff
          .map((s) => s.primary_location_data?.name)
          .filter((n): n is string => Boolean(n)),
      ),
    );
    if (names.length === 1) return names[0];
    if (names.length > 1) return "multiple branches";
    return null;
  }, [staff]);

  const currentHomeIds = useMemo(() => {
    return new Set(
      staff
        .map((s) => s.primary_location_data?.id || s.primary_location)
        .filter(Boolean)
        .map(String),
    );
  }, [staff]);

  const destinationOptions = useMemo(() => {
    // Prefer destinations that aren't already everyone's home
    const others = locations.filter((loc) => !currentHomeIds.has(String(loc.id)));
    return others.length > 0 ? others : locations;
  }, [locations, currentHomeIds]);

  useEffect(() => {
    if (open) {
      setDestinationId("");
      setSubmitting(false);
    }
  }, [open, staff]);

  const title =
    count === 1
      ? `Move ${staff[0]?.first_name || "staff"}`
      : `Move ${count} people`;

  const handleSubmit = async () => {
    if (!destinationId) {
      toast.error("Pick a branch");
      return;
    }
    if (count === 0) return;

    setSubmitting(true);
    try {
      const token =
        localStorage.getItem("access_token") ||
        localStorage.getItem("accessToken") ||
        "";
      const res = await fetch(`${API_BASE}/staff/transfer-locations/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          staff_ids: staff.map((s) => s.id),
          primary_location: destinationId,
          // Simple move: new home branch only
          allowed_mode: "set_destination_only",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.error || data?.detail || "Failed to move staff");
      }
      const destName =
        locations.find((l) => l.id === destinationId)?.name || "new branch";
      toast.success(
        count === 1
          ? `Moved ${staff[0]?.first_name || "staff"} to ${destName}`
          : `Moved ${count} people to ${destName}`,
      );
      setDestinationId("");
      onOpenChange(false);
      onMoved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to move staff");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-emerald-600" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {fromBranch
              ? `From ${fromBranch} → choose their new branch.`
              : "Choose their new branch."}
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
            <Label>New branch</Label>
            <Select value={destinationId} onValueChange={setDestinationId}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a branch…" />
              </SelectTrigger>
              <SelectContent>
                {destinationOptions.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                    {loc.is_primary ? " (main)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleSubmit}
            disabled={submitting || !destinationId}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Moving…
              </>
            ) : (
              "Move"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default MoveStaffBranchDialog;
