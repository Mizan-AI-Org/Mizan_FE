import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type ReservationRow = {
  id: string;
  start_time?: string;
  covers?: number;
  status?: string;
  guest_name?: string;
  phone?: string;
  email?: string;
  notes?: string;
  table?: string;
};

/** `yyyy-MM-ddTHH:mm` in the browser's local time, the format <input type="datetime-local"> wants. */
function toLocalInput(iso?: string): string {
  const d = iso ? new Date(iso) : new Date(Date.now() + 60 * 60 * 1000);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Props = {
  open: boolean;
  accessToken: string;
  reservation: ReservationRow | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function ReservationDialog({ open, accessToken, reservation, onClose, onSaved }: Props) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState("2");
  const [startsAt, setStartsAt] = useState("");
  const [table, setTable] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(reservation?.guest_name || "");
    setPhone(reservation?.phone || "");
    setPartySize(String(reservation?.covers ?? 2));
    setStartsAt(toLocalInput(reservation?.start_time));
    setTable(reservation?.table || "");
    setNotes(reservation?.notes || "");
  }, [open, reservation]);

  const save = async () => {
    const size = Number(partySize);
    if (!name.trim()) return toast.error(t("reservations.form.err_name"));
    if (!startsAt) return toast.error(t("reservations.form.err_time"));
    if (!Number.isInteger(size) || size < 1) return toast.error(t("reservations.form.err_party"));
    setSaving(true);
    try {
      const input = {
        name: name.trim(),
        phone: phone.trim(),
        party_size: size,
        starts_at: new Date(startsAt).toISOString(),
        table: table.trim(),
        notes: notes.trim(),
      };
      if (reservation?.id) await api.updateReservation(accessToken, reservation.id, input);
      else await api.createReservation(accessToken, input);
      toast.success(t("reservations.form.saved"));
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("reservations.form.save_failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{reservation ? t("reservations.form.edit_title") : t("reservations.form.new_title")}</DialogTitle>
          <DialogDescription>{t("reservations.form.desc")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="res-name">{t("reservations.form.guest")}</Label>
            <Input id="res-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="res-phone">{t("reservations.form.phone")}</Label>
            <Input id="res-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+212 6 00 00 00 00" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="res-party">{t("reservations.form.party_size")}</Label>
              <Input id="res-party" type="number" min={1} value={partySize} onChange={(e) => setPartySize(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="res-table">{t("reservations.form.table")}</Label>
              <Input id="res-table" value={table} onChange={(e) => setTable(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="res-time">{t("reservations.form.when")}</Label>
            <Input id="res-time" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="res-notes">{t("reservations.form.notes")}</Label>
            <Textarea id="res-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {t("reservations.form.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
