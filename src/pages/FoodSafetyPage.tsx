import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Archive, CheckCircle2, Clock, Download, Loader2, Pencil, Plus, Thermometer } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { API_BASE, authFetch } from "@/lib/api";
import { archiveWithUndo } from "@/lib/archiveApi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

/** Food safety (HACCP): control points, today's checks, readings out of range, compliance and the inspector PDF.
 * Readings mostly arrive on WhatsApp (apps/food_safety/flow.py); managers can log one here too. */

type Point = {
  id: string;
  name: string;
  kind: string;
  min: number | null;
  max: number | null;
  unit: string;
  range: string;
  checkTimes: string[];
  requiresPhoto: boolean;
  assignee: string | null;
  assigneeRole: string;
  instructions: string;
  isActive: boolean;
  branch: string;
};
type Log = {
  id: string;
  point: string;
  value: number | null;
  unit: string;
  passed: boolean;
  correctiveAction: string;
  by: string | null;
  branch: string;
  at: string;
};
type Summary = {
  compliancePct: number | null;
  checksDue: number;
  checksDone: number;
  today: { pointId: string; point: string; time: string; status: string; branch: string }[];
  missed: { point: string; at: string; branch: string }[];
  outOfRange: Log[];
  points: number;
};

const KINDS = ["fridge", "freezer", "hot_hold", "cooking", "cooling", "delivery", "cleaning", "other"];
const ROLES = ["", "CHEF", "STAFF", "WAITER", "BARTENDER", "SUPERVISOR", "MANAGER"];
const selectClass = "h-10 w-full rounded-md border bg-background px-3 text-sm";

async function request(path: string, method = "GET", body?: Record<string, unknown>) {
  // authFetch attaches the bearer token and silently refreshes it on 401.
  const res = await authFetch(`${API_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(data.error || "Request failed");
  return data.data ?? data;
}

const post = (path: string, body: Record<string, unknown>) => request(path, "POST", body);
const patch = (path: string, body: Record<string, unknown>) => request(path, "PATCH", body);

const blankPoint = {
  name: "",
  kind: "fridge",
  min: "",
  max: "",
  unit: "°C",
  checkTimes: "08:00, 15:00",
  assigneeRole: "",
  requiresPhoto: false,
  instructions: "",
  isActive: true,
};

export default function FoodSafetyPage() {
  const { t } = useLanguage();
  const { accessToken } = useAuth() as { accessToken: string };
  const queryClient = useQueryClient();
  const [days, setDays] = useState(30);
  const [editing, setEditing] = useState<{ id?: string; form: typeof blankPoint } | null>(null);
  const [logging, setLogging] = useState<Point | null>(null);
  const [reading, setReading] = useState({ value: "", done: true, note: "", correctiveAction: "" });
  const [downloading, setDownloading] = useState(false);

  const summary = useQuery<Summary>({
    queryKey: ["food-safety", "summary", days, accessToken],
    queryFn: () => request(`/food-safety/summary/?days=${days}`),
    enabled: !!accessToken,
  });
  const points = useQuery<Point[]>({
    queryKey: ["food-safety", "points", accessToken],
    queryFn: () => request("/food-safety/points/"),
    enabled: !!accessToken,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["food-safety"] });

  const savePoint = useMutation({
    mutationFn: async () => {
      if (!editing) return null;
      const f = editing.form;
      const body = {
        name: f.name,
        kind: f.kind,
        min: f.min === "" ? null : f.min,
        max: f.max === "" ? null : f.max,
        unit: f.unit,
        checkTimes: f.checkTimes.split(/[,\s]+/).filter(Boolean),
        assigneeRole: f.assigneeRole,
        requiresPhoto: f.requiresPhoto,
        instructions: f.instructions,
        isActive: f.isActive,
      };
      return editing.id
        ? patch(`/food-safety/points/${editing.id}/`, body)
        : post("/food-safety/points/", body);
    },
    onSuccess: () => {
      toast.success(t("food_safety.saved"));
      setEditing(null);
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const logReading = useMutation({
    mutationFn: () => {
      if (!logging) return Promise.resolve(null);
      const measured = logging.min !== null || logging.max !== null;
      return post("/food-safety/logs/", {
        pointId: logging.id,
        value: measured ? reading.value : undefined,
        done: measured ? undefined : reading.done,
        note: reading.note,
        correctiveAction: reading.correctiveAction,
      });
    },
    onSuccess: (row: Log | null) => {
      toast[row && !row.passed ? "warning" : "success"](
        row && !row.passed ? t("food_safety.logged_out_of_range") : t("food_safety.logged"),
      );
      setLogging(null);
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const downloadReport = async () => {
    setDownloading(true);
    try {
      const res = await authFetch(`${API_BASE}/food-safety/report/?days=${days}`);
      if (!res.ok) throw new Error(t("food_safety.report_failed"));
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `food-safety-${days}d.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setDownloading(false);
    }
  };

  const openLog = (point: Point) => {
    setReading({ value: "", done: true, note: "", correctiveAction: "" });
    setLogging(point);
  };
  const pointById = (id: string) => (points.data || []).find((p) => p.id === id);
  const s = summary.data;
  const statusTone: Record<string, string> = {
    done: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    missed: "bg-red-500/15 text-red-700 dark:text-red-300",
    due: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    upcoming: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("food_safety.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("food_safety.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="h-9 rounded-md border bg-background px-2 text-sm" value={days}
            onChange={(e) => setDays(Number(e.target.value))} aria-label={t("food_safety.period")}>
            {[7, 30, 90].map((d) => (
              <option key={d} value={d}>{t("food_safety.last_days", { count: d })}</option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={downloadReport} disabled={downloading}>
            {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {t("food_safety.report")}
          </Button>
          <Button size="sm" onClick={() => setEditing({ form: { ...blankPoint } })}>
            <Plus className="mr-2 h-4 w-4" />
            {t("food_safety.add_point")}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("food_safety.compliance")}</p>
            <p className="text-3xl font-semibold">{s?.compliancePct == null ? "—" : `${s.compliancePct}%`}</p>
            <p className="text-xs text-muted-foreground">
              {t("food_safety.checks_done", { done: s?.checksDone ?? 0, due: s?.checksDue ?? 0 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("food_safety.out_of_range")}</p>
            <p className="text-3xl font-semibold">{s?.outOfRange.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("food_safety.missed")}</p>
            <p className="text-3xl font-semibold">{s?.missed.length ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Clock className="h-4 w-4" />{t("food_safety.today")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {summary.isLoading && <p className="text-sm text-muted-foreground">{t("food_safety.loading")}</p>}
          {summary.isError && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              <span>{t("food_safety.load_error")}</span>
              <Button size="sm" variant="outline" onClick={() => summary.refetch()}>{t("food_safety.retry")}</Button>
            </div>
          )}
          {!summary.isLoading && !summary.isError && !s?.today.length && <p className="text-sm text-muted-foreground">{t("food_safety.no_checks_today")}</p>}
          {s?.today.map((row) => {
            const point = pointById(row.pointId);
            return (
              <div key={`${row.pointId}-${row.time}`} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-0">
                <div className="min-w-0">
                  <p className="font-medium">{row.time} · {row.point}</p>
                  {row.branch && <p className="text-xs text-muted-foreground">{row.branch}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${statusTone[row.status] || statusTone.upcoming}`}>
                    {t(`food_safety.status.${row.status}`)}
                  </span>
                  {point && row.status !== "done" && (
                    <Button size="sm" variant="outline" onClick={() => openLog(point)}>{t("food_safety.log_reading")}</Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {!!s?.outOfRange.length && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4 text-red-600" />{t("food_safety.out_of_range")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {s.outOfRange.map((log) => (
              <div key={log.id} className="border-b py-2 text-sm last:border-0">
                <p className="font-medium">
                  {log.point}: {log.value != null ? `${log.value} ${log.unit}` : t("food_safety.not_done")}
                  <span className="ml-2 text-xs text-muted-foreground">{new Date(log.at).toLocaleString()}{log.by ? ` · ${log.by}` : ""}</span>
                </p>
                <p className="text-muted-foreground">
                  {log.correctiveAction ? `${t("food_safety.action_taken")}: ${log.correctiveAction}` : t("food_safety.no_action")}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Thermometer className="h-4 w-4" />{t("food_safety.points")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {points.isError && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              <span>{t("food_safety.load_error")}</span>
              <Button size="sm" variant="outline" onClick={() => points.refetch()}>{t("food_safety.retry")}</Button>
            </div>
          )}
          {!points.isLoading && !points.isError && !points.data?.length && <p className="text-sm text-muted-foreground">{t("food_safety.no_points")}</p>}
          {points.data?.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-0">
              <div className="min-w-0">
                <p className="font-medium">
                  {p.name}
                  {!p.isActive && <Badge variant="secondary" className="ml-2">{t("food_safety.paused")}</Badge>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t(`food_safety.kinds.${p.kind}`)} · {p.range} · {p.checkTimes.join(", ") || t("food_safety.no_times")}
                  {p.assignee ? ` · ${p.assignee}` : p.assigneeRole ? ` · ${p.assigneeRole}` : ""}
                  {p.branch ? ` · ${p.branch}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" onClick={() => openLog(p)}>
                  <CheckCircle2 className="mr-1 h-4 w-4" />{t("food_safety.log_reading")}
                </Button>
                <Button size="icon" variant="ghost" aria-label={t("food_safety.edit")}
                  onClick={() => setEditing({
                    id: p.id,
                    form: {
                      name: p.name, kind: p.kind, min: p.min == null ? "" : String(p.min),
                      max: p.max == null ? "" : String(p.max), unit: p.unit, checkTimes: p.checkTimes.join(", "),
                      assigneeRole: p.assigneeRole, requiresPhoto: p.requiresPhoto, instructions: p.instructions,
                      isActive: p.isActive,
                    },
                  })}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" aria-label={t("archive.archive")}
                  onClick={() => archiveWithUndo("control_point", p.id, {
                    archived: t("archive.archived_named", { name: p.name }), undo: t("archive.undo"),
                    restored: t("archive.restored"),
                  }, refresh)}>
                  <Archive className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? t("food_safety.edit_point") : t("food_safety.add_point")}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="grid gap-1">
                <Label>{t("food_safety.fields.name")}</Label>
                <Input value={editing.form.name} placeholder={t("food_safety.fields.name_placeholder")}
                  onChange={(e) => setEditing({ ...editing, form: { ...editing.form, name: e.target.value } })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <Label>{t("food_safety.fields.kind")}</Label>
                  <select className={selectClass} value={editing.form.kind}
                    onChange={(e) => setEditing({ ...editing, form: { ...editing.form, kind: e.target.value } })}>
                    {KINDS.map((k) => <option key={k} value={k}>{t(`food_safety.kinds.${k}`)}</option>)}
                  </select>
                </div>
                <div className="grid gap-1">
                  <Label>{t("food_safety.fields.role")}</Label>
                  <select className={selectClass} value={editing.form.assigneeRole}
                    onChange={(e) => setEditing({ ...editing, form: { ...editing.form, assigneeRole: e.target.value } })}>
                    {ROLES.map((r) => <option key={r} value={r}>{r ? t(`food_safety.roles.${r.toLowerCase()}`) : t("food_safety.roles.on_shift")}</option>)}
                  </select>
                </div>
              </div>
              {editing.form.kind !== "cleaning" && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="grid gap-1">
                    <Label>{t("food_safety.fields.min")}</Label>
                    <Input inputMode="decimal" value={editing.form.min}
                      onChange={(e) => setEditing({ ...editing, form: { ...editing.form, min: e.target.value } })} />
                  </div>
                  <div className="grid gap-1">
                    <Label>{t("food_safety.fields.max")}</Label>
                    <Input inputMode="decimal" value={editing.form.max}
                      onChange={(e) => setEditing({ ...editing, form: { ...editing.form, max: e.target.value } })} />
                  </div>
                  <div className="grid gap-1">
                    <Label>{t("food_safety.fields.unit")}</Label>
                    <Input value={editing.form.unit}
                      onChange={(e) => setEditing({ ...editing, form: { ...editing.form, unit: e.target.value } })} />
                  </div>
                </div>
              )}
              <div className="grid gap-1">
                <Label>{t("food_safety.fields.times")}</Label>
                <Input value={editing.form.checkTimes} placeholder="08:00, 15:00"
                  onChange={(e) => setEditing({ ...editing, form: { ...editing.form, checkTimes: e.target.value } })} />
              </div>
              <div className="grid gap-1">
                <Label>{t("food_safety.fields.instructions")}</Label>
                <Textarea rows={2} value={editing.form.instructions}
                  onChange={(e) => setEditing({ ...editing, form: { ...editing.form, instructions: e.target.value } })} />
              </div>
              <label className="flex items-center justify-between gap-2 text-sm">
                {t("food_safety.fields.photo")}
                <Switch checked={editing.form.requiresPhoto}
                  onCheckedChange={(v) => setEditing({ ...editing, form: { ...editing.form, requiresPhoto: v } })} />
              </label>
              <label className="flex items-center justify-between gap-2 text-sm">
                {t("food_safety.fields.active")}
                <Switch checked={editing.form.isActive}
                  onCheckedChange={(v) => setEditing({ ...editing, form: { ...editing.form, isActive: v } })} />
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>{t("common.cancel")}</Button>
            <Button onClick={() => savePoint.mutate()} disabled={savePoint.isPending || !editing?.form.name.trim()}>
              {savePoint.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("food_safety.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!logging} onOpenChange={(open) => !open && setLogging(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{logging?.name} · {logging?.range}</DialogTitle>
          </DialogHeader>
          {logging && (
            <div className="grid gap-3">
              {logging.min !== null || logging.max !== null ? (
                <div className="grid gap-1">
                  <Label>{t("food_safety.fields.reading", { unit: logging.unit })}</Label>
                  <Input inputMode="decimal" autoFocus value={reading.value}
                    onChange={(e) => setReading({ ...reading, value: e.target.value })} />
                </div>
              ) : (
                <label className="flex items-center justify-between gap-2 text-sm">
                  {t("food_safety.fields.done")}
                  <Switch checked={reading.done} onCheckedChange={(v) => setReading({ ...reading, done: v })} />
                </label>
              )}
              <div className="grid gap-1">
                <Label>{t("food_safety.fields.note")}</Label>
                <Input value={reading.note} onChange={(e) => setReading({ ...reading, note: e.target.value })} />
              </div>
              <div className="grid gap-1">
                <Label>{t("food_safety.fields.corrective")}</Label>
                <Textarea rows={2} value={reading.correctiveAction}
                  placeholder={t("food_safety.fields.corrective_placeholder")}
                  onChange={(e) => setReading({ ...reading, correctiveAction: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogging(null)}>{t("common.cancel")}</Button>
            <Button onClick={() => logReading.mutate()}
              disabled={logReading.isPending || (!!logging && (logging.min !== null || logging.max !== null) && !reading.value.trim())}>
              {logReading.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("food_safety.log_reading")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
