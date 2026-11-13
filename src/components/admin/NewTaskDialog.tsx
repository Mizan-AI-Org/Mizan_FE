import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AudiencePicker, EMPTY_AUDIENCE, audienceIsEmpty } from "@/components/admin/AudiencePicker";
import { useLanguage } from "@/hooks/use-language";
import { api, type AudienceSpec } from "@/lib/api";

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

export function NewTaskDialog({ open, onOpenChange }: Props) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState("normal");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [photo, setPhoto] = useState(false);
  const [validation, setValidation] = useState(false);
  const [audience, setAudience] = useState<AudienceSpec>(EMPTY_AUDIENCE);

  const reset = () => {
    setTitle("");
    setNotes("");
    setPriority("normal");
    setDueDate("");
    setDueTime("");
    setPhoto(false);
    setValidation(false);
    setAudience(EMPTY_AUDIENCE);
  };

  const create = useMutation({
    mutationFn: () => {
      const single = audience.people.length === 1 && audienceIsEmpty({ ...audience, people: [] });
      return api.createDashboardTask({
        title: title.trim(),
        description: notes.trim() || undefined,
        priority,
        due_date: dueDate || null,
        due_time: dueTime || null,
        require_photo_proof: photo,
        requires_validation: validation,
        ...(audienceIsEmpty(audience)
          ? {}
          : single && !audience.on_shift && !audience.branch_id
            ? { assigned_to: audience.people[0] }
            : { audience }),
      });
    },
    onSuccess: (res) => {
      const n = res.createdCount ?? 1;
      toast.success(n > 1 ? t("new_task.created_many", { count: n }) : t("new_task.created_one"));
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      reset();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message || t("new_task.failed")),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("new_task.title")}</DialogTitle>
          <DialogDescription>{t("new_task.desc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nt-title">{t("new_task.field_title")}</Label>
            <Input id="nt-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nt-notes">{t("new_task.field_notes")}</Label>
            <Textarea id="nt-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="rounded-lg border border-border/60 p-3">
            <p className="mb-3 text-sm font-semibold">{t("new_task.who")}</p>
            <AudiencePicker value={audience} onChange={setAudience} date={dueDate || undefined} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>{t("task_sched.priority")}</Label>
              <Select value={priority} onValueChange={setPriority}>
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
              <Label htmlFor="nt-date">{t("new_task.due_date")}</Label>
              <Input id="nt-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nt-time">{t("task_sched.due_time")}</Label>
              <Input id="nt-time" type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={photo} onCheckedChange={setPhoto} />
              {t("task_sched.photo_proof")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={validation} onCheckedChange={setValidation} />
              {t("task_sched.validation")}
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => create.mutate()} disabled={!title.trim() || create.isPending}>
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("new_task.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default NewTaskDialog;
