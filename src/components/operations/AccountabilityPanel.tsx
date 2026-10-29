import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertOctagon, CalendarPlus, Camera, CheckCircle2, Clock, Loader2, RotateCcw, UserPlus, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { NeedsAttentionItem } from "@/lib/types";
import { safeUrl } from "@/lib/safeUrl";

const KIND_TONE: Record<NeedsAttentionItem["kind"], string> = {
  blocked: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300",
  overdue: "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
  unassigned: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  validate: "bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300",
};

function Tile({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-4">
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-black text-foreground mt-1 tabular-nums", tone)}>{value}</p>
    </div>
  );
}

function fmtDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Accountability: what needs the manager now, and who delivers on time without being chased. */
export function AccountabilityPanel() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const token = localStorage.getItem("access_token") || "";
  const [days, setDays] = useState(30);
  const [assigning, setAssigning] = useState<string | null>(null);

  const card = useQuery({ queryKey: ["accountability", days], queryFn: () => api.getAccountability(days) });
  const queue = useQuery({ queryKey: ["needs-attention"], queryFn: () => api.getNeedsAttention(), refetchInterval: 60_000 });
  const staff = useQuery({ queryKey: ["staff-list-accountability"], queryFn: () => api.getStaffList(token), enabled: !!assigning });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["accountability"] });
    void queryClient.invalidateQueries({ queryKey: ["needs-attention"] });
    void queryClient.invalidateQueries({ queryKey: ["operations-live"] });
  };
  const act = useMutation({
    mutationFn: ({ id, action, body }: { id: string; action: "reassign" | "extend" | "validate"; body?: Record<string, unknown> }) =>
      api.taskExecutionAction(id, action, body),
    onSuccess: () => { toast.success(t("accountability.done")); setAssigning(null); refresh(); },
    onError: (e) => toast.error((e as Error).message),
  });
  const chase = useMutation({
    mutationFn: (id: string) => api.chaseOperationalRecord({ record_id: id, record_type: "dashboard_task" }),
    onSuccess: () => toast.success(t("accountability.chased")),
    onError: (e) => toast.error((e as Error).message),
  });
  const sendBack = (id: string) => {
    const note = window.prompt(t("accountability.send_back_prompt") || "") || "";
    if (note.trim()) act.mutate({ id, action: "validate", body: { approve: false, note } });
  };

  const team = card.data?.team;
  const items = queue.data?.items || [];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Tile label={t("accountability.kpi.on_time")} value={team?.onTimePct != null ? `${team.onTimePct}%` : "—"} />
        <Tile label={t("accountability.kpi.overdue")} value={team?.openOverdue ?? "—"} tone={team?.openOverdue ? "text-amber-700 dark:text-amber-400" : undefined} />
        <Tile label={t("accountability.kpi.blocked")} value={team?.blocked ?? "—"} tone={team?.blocked ? "text-red-700 dark:text-red-400" : undefined} />
        <Tile label={t("accountability.kpi.unassigned")} value={team?.unassigned ?? "—"} />
        <Tile label={t("accountability.kpi.validate")} value={team?.awaitingValidation ?? "—"} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4 text-amber-600" aria-hidden />{t("accountability.queue.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {queue.isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : null}
          {!queue.isLoading && items.length === 0 ? <p className="text-sm text-muted-foreground">{t("accountability.queue.empty")}</p> : null}
          {items.map((item) => (
            <div key={`${item.kind}-${item.taskId}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-md", KIND_TONE[item.kind])}>{t(`accountability.kind.${item.kind}`)}</span>
                  <p className="font-semibold truncate">{item.title}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {item.who || t("accountability.no_owner")}
                  {item.due ? ` · ${t("accountability.due")} ${fmtDate(item.due)}` : ""}
                  {item.reason ? ` · ${t(`accountability.reason.${item.reason.split(":")[0]}`, { defaultValue: item.reason })}${item.reason.includes(":") ? ` – ${item.reason.split(":").slice(1).join(":").trim()}` : ""}` : ""}
                  {item.nudges ? ` · ${t("accountability.nudged", { count: item.nudges })}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {item.proof ? (
                  <Button size="sm" variant="ghost" asChild>
                    <a href={safeUrl(item.proof)} target="_blank" rel="noopener noreferrer"><Camera className="h-4 w-4 me-1" aria-hidden />{t("accountability.proof")}</a>
                  </Button>
                ) : null}
                {item.kind === "validate" ? (
                  <>
                    <Button size="sm" disabled={act.isPending} onClick={() => act.mutate({ id: item.taskId, action: "validate", body: { approve: true } })}>
                      <CheckCircle2 className="h-4 w-4 me-1" aria-hidden />{t("accountability.approve")}
                    </Button>
                    <Button size="sm" variant="outline" disabled={act.isPending} onClick={() => sendBack(item.taskId)}>
                      <RotateCcw className="h-4 w-4 me-1" aria-hidden />{t("accountability.send_back")}
                    </Button>
                  </>
                ) : (
                  <>
                    {item.kind === "overdue" ? (
                      <Button size="sm" variant="outline" disabled={chase.isPending} onClick={() => chase.mutate(item.taskId)}>
                        <Clock className="h-4 w-4 me-1" aria-hidden />{t("accountability.chase")}
                      </Button>
                    ) : null}
                    {item.kind !== "unassigned" ? (
                      <Button size="sm" variant="outline" disabled={act.isPending} onClick={() => act.mutate({ id: item.taskId, action: "extend", body: { days: 1 } })}>
                        <CalendarPlus className="h-4 w-4 me-1" aria-hidden />{t("accountability.extend")}
                      </Button>
                    ) : null}
                    {assigning === item.taskId ? (
                      <select
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                        defaultValue=""
                        aria-label={t("accountability.pick_owner")}
                        onChange={(e) => e.target.value && act.mutate({ id: item.taskId, action: "reassign", body: { staff_id: e.target.value } })}
                      >
                        <option value="" disabled>{staff.isLoading ? t("generic.loading") : t("accountability.pick_owner")}</option>
                        {(staff.data || []).map((s) => <option key={s.id} value={s.id}>{`${s.first_name} ${s.last_name}`.trim() || s.email}</option>)}
                      </select>
                    ) : (
                      <Button size="sm" variant={item.kind === "unassigned" ? "default" : "outline"} onClick={() => setAssigning(item.taskId)}>
                        <UserPlus className="h-4 w-4 me-1" aria-hidden />{item.kind === "unassigned" ? t("accountability.assign") : t("accountability.reassign")}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base flex items-center gap-2"><AlertOctagon className="h-4 w-4 text-muted-foreground" aria-hidden />{t("accountability.people.title")}</CardTitle>
          <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={days}
                  onChange={(e) => setDays(Number(e.target.value))} aria-label={t("accountability.period")}>
            {[7, 30, 90].map((d) => <option key={d} value={d}>{t("accountability.last_days", { count: d })}</option>)}
          </select>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {card.isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : (card.data?.people.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">{t("accountability.people.empty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("accountability.col.person")}</TableHead>
                  <TableHead className="text-end">{t("accountability.col.on_time")}</TableHead>
                  <TableHead className="text-end">{t("accountability.col.done")}</TableHead>
                  <TableHead className="text-end">{t("accountability.col.overdue")}</TableHead>
                  <TableHead className="text-end">{t("accountability.col.ack")}</TableHead>
                  <TableHead className="text-end">{t("accountability.col.nudges")}</TableHead>
                  <TableHead className="text-end">{t("accountability.col.blocked")}</TableHead>
                  <TableHead>{t("accountability.col.flags")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {card.data!.people.map((p) => (
                  <TableRow key={p.staffId}>
                    <TableCell><p className="font-semibold">{p.name}</p><p className="text-[11px] text-muted-foreground">{p.role}</p></TableCell>
                    <TableCell className={cn("text-end tabular-nums font-semibold", p.onTimePct != null && p.onTimePct < 70 && "text-amber-700 dark:text-amber-400")}>
                      {p.onTimePct != null ? `${p.onTimePct}%` : "—"}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">{p.completed}{p.late ? <span className="text-muted-foreground"> ({t("accountability.late_n", { count: p.late })})</span> : null}</TableCell>
                    <TableCell className={cn("text-end tabular-nums", p.openOverdue && "text-red-700 dark:text-red-400 font-semibold")}>{p.openOverdue}</TableCell>
                    <TableCell className="text-end tabular-nums">{p.medianAckMinutes != null ? `${Math.round(p.medianAckMinutes)} min` : "—"}</TableCell>
                    <TableCell className="text-end tabular-nums">{p.nudgesPerTask}</TableCell>
                    <TableCell className="text-end tabular-nums">{p.blocked}</TableCell>
                    <TableCell className="space-x-1">
                      {p.flags.map((f) => <Badge key={f} variant="outline" className="text-[10px]">{t(`accountability.flag.${f}`)}</Badge>)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
