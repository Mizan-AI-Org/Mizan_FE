import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Archive, CalendarClock, Loader2, Pause, Pencil, Play, Plus, Repeat } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AudiencePicker, normalizeAudience, audienceIsEmpty } from "@/components/admin/AudiencePicker";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import { api, type AudienceSpec, type TaskScheduleRow } from "@/lib/api";

type Frequency = TaskScheduleRow["frequency"];
const FREQS: Frequency[] = ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "ANNUALLY"];
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

interface Draft {
  title: string;
  notes: string;
  audience: AudienceSpec;
  frequency: Frequency;
  interval: number;
  weekdays: number[];
  monthDay: number;
  releaseTime: string;
  dueTime: string;
  dueInDays: string;
  priority: "normal" | "medium" | "urgent";
  requirePhotoProof: boolean;
  requiresValidation: boolean;
  startsOn: string;
  endsOn: string;
}

function toDraft(r?: TaskScheduleRow | null): Draft {
  return {
    title: r?.title ?? "",
    notes: r?.notes ?? "",
    audience: normalizeAudience({ ...(r?.audience || {}), mode: (r?.audience?.mode || r?.mode || "first") as AudienceSpec["mode"], on_shift: r?.audience?.on_shift ?? r?.onShiftOnly ?? false }),
    frequency: r?.frequency ?? "DAILY",
    interval: r?.interval ?? 1,
    weekdays: r?.weekdays ?? [],
    monthDay: r?.monthDay ?? 1,
    releaseTime: (r?.releaseTime || "07:00").slice(0, 5),
    dueTime: (r?.dueTime || "").slice(0, 5),
    dueInDays: r?.dueInDays != null ? String(r.dueInDays) : "",
    priority: r?.priority ?? "normal",
    requirePhotoProof: !!r?.requirePhotoProof,
    requiresValidation: !!r?.requiresValidation,
    startsOn: r?.startsOn ?? "",
    endsOn: r?.endsOn ?? "",
  };
}

function toPayload(d: Draft) {
  const usesMonthDay = d.frequency === "MONTHLY" || d.frequency === "QUARTERLY" || d.frequency === "ANNUALLY";
  return {
    title: d.title.trim(),
    notes: d.notes.trim(),
    audience: d.audience,
    mode: d.audience.mode,
    onShiftOnly: d.audience.on_shift,
    frequency: d.frequency,
    interval: Math.max(1, d.interval || 1),
    weekdays: d.frequency === "WEEKLY" ? d.weekdays : [],
    monthDay: usesMonthDay ? d.monthDay : null,
    releaseTime: d.releaseTime || "07:00",
    dueTime: d.dueTime || null,
    dueInDays: d.dueInDays === "" ? null : Number(d.dueInDays),
    priority: d.priority,
    requirePhotoProof: d.requirePhotoProof,
    requiresValidation: d.requiresValidation,
    startsOn: d.startsOn || null,
    endsOn: d.endsOn || null,
    branch: d.audience.branch_id || null,
  };
}

export default function RecurringTasks() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<TaskScheduleRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(toDraft());
  const [archiving, setArchiving] = useState<TaskScheduleRow | null>(null);

  const listQ = useQuery({ queryKey: ["task-schedules"], queryFn: () => api.listTaskSchedules() });
  const rows = listQ.data?.results ?? [];
  const refresh = () => qc.invalidateQueries({ queryKey: ["task-schedules"] });

  const save = useMutation({
    mutationFn: () =>
      editing ? api.updateTaskSchedule(editing.id, toPayload(draft)) : api.createTaskSchedule(toPayload(draft)),
    onSuccess: () => {
      toast.success(t("task_sched.saved"));
      refresh();
      setEditing(null);
      setCreating(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const togglePause = useMutation({
    mutationFn: (r: TaskScheduleRow) => api.updateTaskSchedule(r.id, { isActive: !r.isActive }),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });
  const archive = useMutation({
    mutationFn: (r: TaskScheduleRow) => api.archiveTaskSchedule(r.id),
    onSuccess: () => {
      toast.success(t("task_sched.archived"));
      refresh();
      setArchiving(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setDraft(toDraft());
    setEditing(null);
    setCreating(true);
  };
  const openEdit = (r: TaskScheduleRow) => {
    setDraft(toDraft(r));
    setEditing(r);
    setCreating(false);
  };
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const dialogOpen = creating || !!editing;
  const showWeekdays = draft.frequency === "WEEKLY";
  const showMonthDay = ["MONTHLY", "QUARTERLY", "ANNUALLY"].includes(draft.frequency);
  const canSave = draft.title.trim() && !audienceIsEmpty(draft.audience) && !save.isPending;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Repeat className="h-5 w-5 text-teal-600" />
            {t("task_sched.title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("task_sched.subtitle")}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t("task_sched.new")}
        </Button>
      </div>

      {listQ.isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : listQ.isError ? (
        <p className="text-sm text-destructive">{(listQ.error as Error).message}</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t("task_sched.empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => (
            <Card key={r.id} className={cn(!r.isActive && "opacity-75")}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{r.title}</span>
                    {!r.isActive && <Badge variant="secondary">{t("task_sched.paused")}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("task_sched.who_prefix")} {r.audienceLabel || "-"}
                  </p>
                  <p className="text-sm text-muted-foreground">{r.rule}</p>
                  {r.isActive && r.nextDates?.[0] && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {t("task_sched.next")} {r.nextDates[0]}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                    <Pencil className="mr-1.5 h-4 w-4" />
                    {t("common.edit")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={togglePause.isPending}
                    onClick={() => togglePause.mutate(r)}
                  >
                    {r.isActive ? <Pause className="mr-1.5 h-4 w-4" /> : <Play className="mr-1.5 h-4 w-4" />}
                    {r.isActive ? t("task_sched.pause") : t("task_sched.resume")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setArchiving(r)}>
                    <Archive className="mr-1.5 h-4 w-4" />
                    {t("task_sched.archive")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false);
            setEditing(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? t("task_sched.edit") : t("task_sched.new")}</DialogTitle>
            <DialogDescription>{t("task_sched.dialog_desc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ts-title">{t("new_task.field_title")}</Label>
              <Input id="ts-title" value={draft.title} onChange={(e) => set({ title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ts-notes">{t("new_task.field_notes")}</Label>
              <Textarea id="ts-notes" rows={2} value={draft.notes} onChange={(e) => set({ notes: e.target.value })} />
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="mb-3 text-sm font-semibold">{t("new_task.who")}</p>
              <AudiencePicker value={draft.audience} onChange={(a) => set({ audience: a })} />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>{t("task_sched.repeats")}</Label>
                <Select value={draft.frequency} onValueChange={(v) => set({ frequency: v as Frequency })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQS.map((f) => (
                      <SelectItem key={f} value={f}>
                        {t(`task_sched.freq_${f.toLowerCase()}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ts-interval">{t("task_sched.every")}</Label>
                <Input
                  id="ts-interval"
                  type="number"
                  min={1}
                  value={draft.interval}
                  onChange={(e) => set({ interval: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">{t(`task_sched.unit_${draft.frequency.toLowerCase()}`)}</p>
              </div>
              {showMonthDay && (
                <div className="space-y-1.5">
                  <Label>{t("task_sched.month_day")}</Label>
                  <Select value={String(draft.monthDay)} onValueChange={(v) => set({ monthDay: Number(v) })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {d}
                        </SelectItem>
                      ))}
                      <SelectItem value="-1">{t("task_sched.last_day")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {showWeekdays && (
              <div className="space-y-1.5">
                <Label>{t("task_sched.weekdays")}</Label>
                <div className="flex flex-wrap gap-2">
                  {DAY_KEYS.map((k, i) => {
                    const on = draft.weekdays.includes(i);
                    return (
                      <Button
                        key={k}
                        type="button"
                        size="sm"
                        variant={on ? "default" : "outline"}
                        className={cn("min-w-[3rem]", on && "bg-emerald-600 hover:bg-emerald-700")}
                        onClick={() =>
                          set({
                            weekdays: on
                              ? draft.weekdays.filter((d) => d !== i)
                              : [...draft.weekdays, i].sort((a, b) => a - b),
                          })
                        }
                      >
                        {t(`process.schedule.day_${k}`)}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="ts-release">{t("task_sched.release_time")}</Label>
                <Input
                  id="ts-release"
                  type="time"
                  value={draft.releaseTime}
                  onChange={(e) => set({ releaseTime: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">{t("task_sched.release_help")}</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ts-due">{t("task_sched.due_time")}</Label>
                <Input id="ts-due" type="time" value={draft.dueTime} onChange={(e) => set({ dueTime: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ts-dueindays">{t("task_sched.due_in_days")}</Label>
                <Input
                  id="ts-dueindays"
                  type="number"
                  min={0}
                  value={draft.dueInDays}
                  onChange={(e) => set({ dueInDays: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>{t("task_sched.priority")}</Label>
                <Select value={draft.priority} onValueChange={(v) => set({ priority: v as Draft["priority"] })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">{t("task_sched.priority_normal")}</SelectItem>
                    <SelectItem value="medium">{t("task_sched.priority_medium")}</SelectItem>
                    <SelectItem value="urgent">{t("task_sched.priority_urgent")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ts-start">{t("task_sched.starts_on")}</Label>
                <Input id="ts-start" type="date" value={draft.startsOn} onChange={(e) => set({ startsOn: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ts-end">{t("task_sched.ends_on")}</Label>
                <Input id="ts-end" type="date" value={draft.endsOn} onChange={(e) => set({ endsOn: e.target.value })} />
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={draft.requirePhotoProof} onCheckedChange={(v) => set({ requirePhotoProof: v })} />
                {t("task_sched.photo_proof")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={draft.requiresValidation} onCheckedChange={(v) => set({ requiresValidation: v })} />
                {t("task_sched.validation")}
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={() => save.mutate()} disabled={!canSave}>
              {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!archiving} onOpenChange={(o) => !o && setArchiving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("task_sched.archive_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("task_sched.archive_desc", { title: archiving?.title ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => archiving && archive.mutate(archiving)}>
              {t("task_sched.archive")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
