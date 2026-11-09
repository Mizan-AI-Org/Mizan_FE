import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Clock, Loader2, MapPin, Plus, User, Wrench } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { API_BASE, authFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Facility agency: the jobs from the restaurants it services (Mizan_BE apps/agencies). Most of the work happens on
 * WhatsApp (dispatch, "on my way", done with a photo); this board is the coordinators' overview. */

export type AgencyJob = {
  id: string;
  client: { id: string; name: string } | null;
  avenue: { id: string; name: string } | null;
  scope: "breakdown" | "cleaning" | "security" | "common_area";
  title: string;
  description: string;
  photos: string[];
  urgency: "critical" | "high" | "normal" | "low";
  urgencyReason: string;
  respondBy: string | null;
  fixBy: string | null;
  overdue: "respond" | "fix" | null;
  status: "NEW" | "ASSIGNED" | "ON_SITE" | "DONE" | "CANT" | "CANCELLED";
  assignedTo: { id: string; name: string; roleLabel: string } | null;
  reportedBy: { name: string; restaurant: string } | null;
  proof: string[];
  events: { at: string; kind: string; by: string; note: string }[];
  incidentId: string | null;
  createdAt: string | null;
};
type Staff = { id: string; name: string; roleLabel: string };
type Client = { id: string; name: string; avenue: { id: string; name: string } | null; scopes: string[] };
type ReportRow = {
  client: { id: string | null; name: string };
  jobs: number;
  onTimeRespondPct: number;
  onTimeFixPct: number;
  medianRespondMinutes: number | null;
  medianFixMinutes: number | null;
};

const SCOPES = ["breakdown", "cleaning", "security", "common_area"] as const;
const URGENCIES = ["critical", "high", "normal", "low"] as const;
const COLUMNS: { key: string; statuses: AgencyJob["status"][] }[] = [
  { key: "new", statuses: ["NEW", "CANT"] },
  { key: "assigned", statuses: ["ASSIGNED"] },
  { key: "on_site", statuses: ["ON_SITE"] },
  { key: "done", statuses: ["DONE"] },
];
const URGENCY_CLASS: Record<AgencyJob["urgency"], string> = {
  critical: "bg-rose-600 text-white",
  high: "bg-orange-500 text-white",
  normal: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
};
const selectClass = "h-10 w-full rounded-md border bg-background px-3 text-sm";

async function request<T>(path: string, method = "GET", body?: Record<string, unknown>): Promise<T> {
  const res = await authFetch(`${API_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(data.error || "Request failed");
  return (data.data ?? data) as T;
}

/** "in 25 min" / "12 min late" against now. */
function useCountdown() {
  const { t } = useLanguage();
  return (iso: string | null) => {
    if (!iso) return "";
    const minutes = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
    const span = (m: number) => (m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`);
    return minutes >= 0 ? t("agency.in", { time: span(minutes) }) : t("agency.late_by", { time: span(-minutes) });
  };
}

export default function AgencyJobsPage() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<"board" | "report">("board");
  const [filters, setFilters] = useState({ client: "", scope: "", urgency: "" });
  const [open, setOpen] = useState<AgencyJob | null>(null);
  const [creating, setCreating] = useState(false);
  const query = new URLSearchParams({ ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) });
  const jobs = useQuery({
    queryKey: ["agency-jobs", filters],
    queryFn: () => request<{ results: AgencyJob[] }>(`/agency/jobs/?${query.toString()}`),
    refetchInterval: 60_000,
  });
  const clients = useQuery({ queryKey: ["agency-clients"], queryFn: () => request<Client[]>("/agency/clients/") });
  const rows = jobs.data?.results || [];
  const byColumn = useMemo(
    () => COLUMNS.map((c) => ({ ...c, jobs: rows.filter((j) => c.statuses.includes(j.status)) })),
    [rows],
  );
  const overdue = rows.filter((j) => j.overdue).length;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Wrench className="h-6 w-6" /> {t("agency.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("agency.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant={tab === "board" ? "default" : "outline"} onClick={() => setTab("board")}>
            {t("agency.tab.board")}
          </Button>
          <Button variant={tab === "report" ? "default" : "outline"} onClick={() => setTab("report")}>
            {t("agency.tab.report")}
          </Button>
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-1 h-4 w-4" /> {t("agency.new_job")}
          </Button>
        </div>
      </header>

      {tab === "report" ? (
        <AgencyReport />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <select
              className={selectClass}
              value={filters.client}
              onChange={(e) => setFilters((f) => ({ ...f, client: e.target.value }))}
              aria-label={t("agency.filter.client")}
            >
              <option value="">{t("agency.filter.all_restaurants")}</option>
              {(clients.data || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              className={selectClass}
              value={filters.scope}
              onChange={(e) => setFilters((f) => ({ ...f, scope: e.target.value }))}
              aria-label={t("agency.filter.scope")}
            >
              <option value="">{t("agency.filter.all_scopes")}</option>
              {SCOPES.map((s) => (
                <option key={s} value={s}>
                  {t(`agency.scope.${s}`)}
                </option>
              ))}
            </select>
            <select
              className={selectClass}
              value={filters.urgency}
              onChange={(e) => setFilters((f) => ({ ...f, urgency: e.target.value }))}
              aria-label={t("agency.filter.urgency")}
            >
              <option value="">{t("agency.filter.all_urgencies")}</option>
              {URGENCIES.map((u) => (
                <option key={u} value={u}>
                  {t(`agency.urgency.${u}`)}
                </option>
              ))}
            </select>
            {overdue ? (
              <div className="flex items-center gap-2 rounded-md bg-rose-50 px-3 text-sm font-medium text-rose-700 dark:bg-rose-950 dark:text-rose-200">
                <AlertTriangle className="h-4 w-4" /> {t("agency.overdue_count", { count: overdue })}
              </div>
            ) : null}
          </div>

          {jobs.isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : jobs.error ? (
            <p className="text-destructive">{(jobs.error as Error).message}</p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-4">
              {byColumn.map((column) => (
                <section key={column.key} className="space-y-3 rounded-lg bg-muted/40 p-3">
                  <h2 className="flex items-center justify-between text-sm font-semibold">
                    {t(`agency.column.${column.key}`)}
                    <span className="text-muted-foreground">{column.jobs.length}</span>
                  </h2>
                  {column.jobs.map((job) => (
                    <JobCard key={job.id} job={job} onOpen={() => setOpen(job)} />
                  ))}
                  {column.jobs.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t("agency.empty_column")}</p>
                  ) : null}
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {open ? <JobDialog job={open} onClose={() => setOpen(null)} /> : null}
      {creating ? <NewJobDialog clients={clients.data || []} onClose={() => setCreating(false)} /> : null}
    </div>
  );
}

function JobCard({ job, onOpen }: { job: AgencyJob; onOpen: () => void }) {
  const { t } = useLanguage();
  const countdown = useCountdown();
  const deadline = job.status === "NEW" || job.status === "CANT" ? job.respondBy : job.fixBy;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-full rounded-lg border bg-card p-3 text-left shadow-sm transition hover:shadow ${job.overdue ? "border-rose-400" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium leading-snug">{job.title}</span>
        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${URGENCY_CLASS[job.urgency]}`}>
          {t(`agency.urgency.${job.urgency}`)}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        <MapPin className="h-3 w-3" /> {job.client?.name || job.avenue?.name || "—"} · {t(`agency.scope.${job.scope}`)}
      </div>
      {job.status !== "DONE" ? (
        <div className={`mt-1 flex items-center gap-1 text-xs ${job.overdue ? "font-semibold text-rose-600" : "text-muted-foreground"}`}>
          <Clock className="h-3 w-3" />
          {t(job.status === "NEW" || job.status === "CANT" ? "agency.respond" : "agency.fix")} {countdown(deadline)}
        </div>
      ) : null}
      {job.assignedTo ? (
        <div className="mt-1 flex items-center gap-1 text-xs">
          <User className="h-3 w-3" /> {job.assignedTo.name}
        </div>
      ) : null}
      {job.status === "CANT" ? <Badge variant="destructive" className="mt-2">{t("agency.status.CANT")}</Badge> : null}
    </button>
  );
}

function JobDialog({ job, onClose }: { job: AgencyJob; onClose: () => void }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [staffId, setStaffId] = useState(job.assignedTo?.id || "");
  const [note, setNote] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const staff = useQuery({ queryKey: ["agency-staff"], queryFn: () => request<Staff[]>("/agency/staff/") });
  const done = () => {
    queryClient.invalidateQueries({ queryKey: ["agency-jobs"] });
    onClose();
  };
  const assign = useMutation({
    mutationFn: () => request<AgencyJob>(`/agency/jobs/${job.id}/assign/`, "POST", { staffId }),
    onSuccess: () => {
      toast.success(t("agency.assigned"));
      done();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const setStatus = useMutation({
    mutationFn: (status: string) =>
      request<AgencyJob>(`/agency/jobs/${job.id}/status/`, "POST", { status, note, proofUrl }),
    onSuccess: () => done(),
    onError: (e: Error) => toast.error(e.message),
  });
  const closed = job.status === "DONE" || job.status === "CANCELLED";

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{job.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <span className={`rounded px-1.5 py-0.5 text-xs font-bold uppercase ${URGENCY_CLASS[job.urgency]}`}>
              {t(`agency.urgency.${job.urgency}`)}
            </span>
            <Badge variant="outline">{t(`agency.scope.${job.scope}`)}</Badge>
            <Badge variant="secondary">{t(`agency.status.${job.status}`)}</Badge>
          </div>
          <p>
            <strong>{job.client?.name || job.avenue?.name || "—"}</strong>
            {job.reportedBy ? ` · ${t("agency.reported_by", { name: job.reportedBy.name })}` : ""}
          </p>
          {job.urgencyReason ? <p className="text-muted-foreground">{job.urgencyReason}</p> : null}
          {job.description ? <p className="whitespace-pre-line">{job.description}</p> : null}
          <div className="flex flex-wrap gap-2">
            {[...job.photos, ...job.proof].map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer">
                <img src={url} alt="" className="h-20 w-20 rounded object-cover" />
              </a>
            ))}
          </div>
          {!closed ? (
            <Card>
              <CardContent className="space-y-3 pt-4">
                <Label>{t("agency.assign_to")}</Label>
                <div className="flex gap-2">
                  <select className={selectClass} value={staffId} onChange={(e) => setStaffId(e.target.value)}>
                    <option value="">—</option>
                    {(staff.data || []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.roleLabel ? ` · ${s.roleLabel}` : ""}
                      </option>
                    ))}
                  </select>
                  <Button disabled={!staffId || assign.isPending} onClick={() => assign.mutate()}>
                    {t("agency.assign")}
                  </Button>
                </div>
                <Label>{t("agency.note")}</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
                <Label>{t("agency.proof_url")}</Label>
                <Input value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} placeholder="https://…" />
                <p className="text-xs text-muted-foreground">{t("agency.proof_hint")}</p>
              </CardContent>
            </Card>
          ) : null}
          <div>
            <h3 className="mb-1 font-semibold">{t("agency.timeline")}</h3>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {job.events.map((e, i) => (
                <li key={i}>
                  {new Date(e.at).toLocaleString()} · {t(`agency.event.${e.kind}`, { defaultValue: e.kind })}
                  {e.by ? ` · ${e.by}` : ""}
                  {e.note ? ` — ${e.note}` : ""}
                </li>
              ))}
            </ul>
          </div>
        </div>
        {!closed ? (
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => setStatus.mutate("ON_SITE")} disabled={setStatus.isPending}>
              {t("agency.status.ON_SITE")}
            </Button>
            <Button variant="outline" onClick={() => setStatus.mutate("CANT")} disabled={!note || setStatus.isPending}>
              {t("agency.status.CANT")}
            </Button>
            <Button onClick={() => setStatus.mutate("DONE")} disabled={!proofUrl || setStatus.isPending}>
              {t("agency.status.DONE")}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function NewJobDialog({ clients, onClose }: { clients: Client[]; onClose: () => void }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ clientId: "", scope: "common_area", title: "", description: "", urgency: "" });
  const avenueId = clients.find((c) => c.id === form.clientId)?.avenue?.id || clients[0]?.avenue?.id || null;
  const create = useMutation({
    mutationFn: () =>
      request<AgencyJob>("/agency/jobs/", "POST", {
        ...form,
        clientId: form.clientId || null,
        avenueId,
        urgency: form.urgency || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-jobs"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("agency.new_job")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Label>{t("agency.filter.client")}</Label>
          <select
            className={selectClass}
            value={form.clientId}
            onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
          >
            <option value="">{t("agency.the_avenue")}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Label>{t("agency.filter.scope")}</Label>
          <select
            className={selectClass}
            value={form.scope}
            onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))}
          >
            {SCOPES.map((s) => (
              <option key={s} value={s}>
                {t(`agency.scope.${s}`)}
              </option>
            ))}
          </select>
          <Label>{t("agency.job_title")}</Label>
          <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Label>{t("agency.description")}</Label>
          <Textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
          />
          <Label>{t("agency.filter.urgency")}</Label>
          <select
            className={selectClass}
            value={form.urgency}
            onChange={(e) => setForm((f) => ({ ...f, urgency: e.target.value }))}
          >
            <option value="">{t("agency.urgency.auto")}</option>
            {URGENCIES.map((u) => (
              <option key={u} value={u}>
                {t(`agency.urgency.${u}`)}
              </option>
            ))}
          </select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button disabled={!form.title.trim() || create.isPending} onClick={() => create.mutate()}>
            {t("agency.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AgencyReport() {
  const { t } = useLanguage();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const report = useQuery({
    queryKey: ["agency-report", month],
    queryFn: () => request<{ clients: ReportRow[] }>(`/agency/report/?month=${month}`),
  });
  const fmt = (m: number | null) => (m == null ? "—" : m < 60 ? `${m} min` : `${Math.round(m / 6) / 10} h`);
  const rows = report.data?.clients || [];
  const csv = () => {
    const lines = [
      ["restaurant", "jobs", "on_time_respond_pct", "on_time_fix_pct", "median_respond_min", "median_fix_min"],
      ...rows.map((r) => [r.client.name, r.jobs, r.onTimeRespondPct, r.onTimeFixPct, r.medianRespondMinutes ?? "", r.medianFixMinutes ?? ""]),
    ];
    const blob = new Blob([lines.map((l) => l.join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `agency-report-${month}.csv`;
    a.click();
  };
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>{t("agency.tab.report")}</CardTitle>
        <div className="flex gap-2">
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
          <Button variant="outline" onClick={csv} disabled={!rows.length}>
            CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {report.isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2">{t("agency.filter.client")}</th>
                <th>{t("agency.report.jobs")}</th>
                <th>{t("agency.report.respond_on_time")}</th>
                <th>{t("agency.report.fix_on_time")}</th>
                <th>{t("agency.report.median_respond")}</th>
                <th>{t("agency.report.median_fix")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.client.id || "avenue"} className="border-t">
                  <td className="py-2">{r.client.name}</td>
                  <td>{r.jobs}</td>
                  <td>{r.onTimeRespondPct}%</td>
                  <td>{r.onTimeFixPct}%</td>
                  <td>{fmt(r.medianRespondMinutes)}</td>
                  <td>{fmt(r.medianFixMinutes)}</td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-muted-foreground">
                    {t("agency.report.empty")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
