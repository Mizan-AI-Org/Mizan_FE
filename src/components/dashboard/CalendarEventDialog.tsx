import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { loadStaffPickerOptions } from "@/lib/staffPicker";
import type { MeetingReminderItem } from "@/lib/types";

type T = (key: string, options?: Record<string, string | number> | string) => string;

const pad = (n: number) => String(n).padStart(2, "0");
const dateOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const timeOf = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

function nextHalfHour(): Date {
  const d = new Date();
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
  return d;
}

/** Create or edit a meeting. The same backend action Miya uses (create- / update-calendar-event), so the result
 * is identical on the web and on WhatsApp; invitees hear about it on WhatsApp. */
export function CalendarEventDialog({
  event,
  onClose,
  onSaved,
  t,
}: {
  event?: MeetingReminderItem | null;
  onClose: () => void;
  onSaved: () => void;
  t: T;
}) {
  const start = event ? new Date(event.start) : nextHalfHour();
  const end = event?.end ? new Date(event.end) : new Date(start.getTime() + 60 * 60_000);
  const [title, setTitle] = useState(event?.title ?? "");
  const [day, setDay] = useState(dateOf(start));
  const [from, setFrom] = useState(timeOf(start));
  const [to, setTo] = useState(timeOf(end));
  const [location, setLocation] = useState(event?.location ?? "");
  const [notes, setNotes] = useState(event?.notes ?? "");
  const [attendees, setAttendees] = useState<string[]>(event?.attendee_ids ?? []);
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState(false);

  const staff = useQuery({ queryKey: ["staff-picker-options"], queryFn: () => loadStaffPickerOptions() });
  const shown = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return (staff.data ?? []).filter((s) => !needle || s.name.toLowerCase().includes(needle)).slice(0, 60);
  }, [staff.data, filter]);

  const startsAt = new Date(`${day}T${from}`);
  const endsAt = new Date(`${day}T${to}`);
  const valid = title.trim() && !Number.isNaN(startsAt.getTime()) && endsAt > startsAt;

  async function save() {
    if (!valid) return;
    setSaving(true);
    try {
      const body = {
        title: title.trim(),
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        location,
        notes,
      };
      if (event) {
        const before = new Set(event.attendee_ids ?? []);
        await api.updateCalendarEvent(event.id, {
          ...body,
          attendeeIds: attendees.filter((id) => !before.has(id)),
          removeAttendeeIds: [...before].filter((id) => !attendees.includes(id)),
        });
        toast.success(t("dashboard.meetings_reminders.updated_toast"));
      } else {
        await api.createCalendarEvent({ ...body, attendeeIds: attendees });
        toast.success(t("dashboard.meetings_reminders.created_toast"));
      }
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("dashboard.meetings_reminders.update_failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>
            {event ? t("dashboard.meetings_reminders.edit_title") : t("dashboard.meetings_reminders.new_title")}
          </DialogTitle>
          <DialogDescription>{t("dashboard.meetings_reminders.dialog_help")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="ev-title">{t("dashboard.meetings_reminders.field_title")}</Label>
            <Input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
          <div className="grid grid-cols-[1fr_auto_auto] gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor="ev-day">{t("dashboard.meetings_reminders.field_day")}</Label>
              <Input id="ev-day" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ev-from">{t("dashboard.meetings_reminders.field_from")}</Label>
              <Input id="ev-from" type="time" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ev-to">{t("dashboard.meetings_reminders.field_to")}</Label>
              <Input id="ev-to" type="time" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
          {!valid && title.trim() && (
            <p className="text-xs text-rose-600">{t("dashboard.meetings_reminders.end_after_start")}</p>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="ev-where">{t("dashboard.meetings_reminders.field_where")}</Label>
            <Input id="ev-where" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ev-who">{t("dashboard.meetings_reminders.field_who")}</Label>
            <Input
              id="ev-who"
              placeholder={t("dashboard.meetings_reminders.search_team")}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <div className="max-h-36 overflow-y-auto rounded-md border divide-y">
              {shown.map((person) => (
                <label key={person.id} className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer">
                  <Checkbox
                    checked={attendees.includes(person.id)}
                    onCheckedChange={(on) =>
                      setAttendees((ids) => (on ? [...ids, person.id] : ids.filter((id) => id !== person.id)))
                    }
                  />
                  <span className="truncate">{person.name}</span>
                  {person.role && <span className="ml-auto text-xs text-muted-foreground">{person.role}</span>}
                </label>
              ))}
            </div>
            {attendees.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {t("dashboard.meetings_reminders.invitees_told", { count: attendees.length })}
              </p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ev-notes">{t("dashboard.meetings_reminders.field_notes")}</Label>
            <Textarea id="ev-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button disabled={!valid || saving} onClick={save}>
            {event ? t("common.save") : t("dashboard.meetings_reminders.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
