import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { CheckCircle2, Download, FileText, Loader2, Paperclip, Trash2, Upload, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useModules } from "@/hooks/use-modules";
import { cn } from "@/lib/utils";
import type {
  StaffAbsence,
  StaffAbsenceStatus,
  StaffDocumentCategory,
  StaffHRFile as StaffHRFileData,
  StaffNoteKind,
} from "@/lib/types";
import { safeUrl } from "@/lib/safeUrl";

const DOC_CATEGORIES: StaffDocumentCategory[] = ["CONTRACT", "ID", "CERTIFICATE", "MEDICAL", "JUSTIFICATION", "PAYSLIP", "OTHER"];

const ABSENCE_TONE: Record<StaffAbsenceStatus, string> = {
  REPORTED: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
  JUSTIFIED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
  EXCUSED: "bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300",
  UNJUSTIFIED: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300",
};

const NOTE_TONE: Record<StaffNoteKind, string> = {
  NOTE: "border-slate-200 dark:border-slate-700",
  PRAISE: "border-emerald-200 dark:border-emerald-900",
  WARNING: "border-red-200 dark:border-red-900",
};

// StaffApp's profile modal is re-created on every parent render, which remounts this component:
// keep the last file and tab so a remount is instant instead of a spinner + reset.
const fileCache = new Map<string, StaffHRFileData>();
let lastTab = "overview";

function token() {
  return localStorage.getItem("access_token") || "";
}

function fmtDay(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className={cn("text-xl font-black text-slate-900 dark:text-white", tone)}>{value}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: unknown }) {
  const shown = Array.isArray(value) ? value.join(", ") : value === null || value === undefined || value === "" ? "" : String(value);
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</p>
      <p className={cn("text-sm font-medium", shown ? "text-slate-700 dark:text-slate-200" : "text-slate-400 italic")}>
        {shown || "—"}
      </p>
    </div>
  );
}

/** The HR file of one team member: contract, leave, attendance, absences + justifications, documents, notes. */
function StaffHRFileBody({ staffId, canEdit = true }: { staffId: string; canEdit?: boolean }) {
  const { t } = useTranslation();
  const [file, setFile] = useState<StaffHRFileData | null>(() => fileCache.get(staffId) ?? null);
  const [loading, setLoading] = useState(() => !fileCache.has(staffId));
  const [tab, setTab] = useState(lastTab);
  const [busy, setBusy] = useState(false);
  const [docCategory, setDocCategory] = useState<StaffDocumentCategory>("CONTRACT");
  const [docTitle, setDocTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteKind, setNoteKind] = useState<StaffNoteKind>("NOTE");
  const docInput = useRef<HTMLInputElement>(null);
  const justificationInput = useRef<HTMLInputElement>(null);
  const [justifyFor, setJustifyFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const fresh = await api.getStaffFile(token(), staffId);
      fileCache.set(staffId, fresh);
      setFile(fresh);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }
  if (!file) return null;

  const month = file.attendanceThisMonth;
  const reasonLabel = (a: StaffAbsence) => t(`hr.absence.reason.${a.reason}`, { defaultValue: a.reasonLabel });
  const statusLabel = (s: StaffAbsenceStatus) => t(`hr.absence.status.${s}`, { defaultValue: s });

  return (
    <Tabs
      value={tab}
      onValueChange={(next) => {
        lastTab = next;
        setTab(next);
      }}
      className="w-full"
    >
      <TabsList className="flex flex-wrap h-auto gap-1">
        <TabsTrigger value="overview">{t("hr.tab.overview")}</TabsTrigger>
        <TabsTrigger value="attendance">{t("hr.tab.attendance")}</TabsTrigger>
        <TabsTrigger value="absences">
          {t("hr.tab.absences")}
          {file.absences.some((a) => a.status === "REPORTED") ? (
            <span className="ms-1.5 inline-block w-2 h-2 rounded-full bg-amber-500" aria-hidden />
          ) : null}
        </TabsTrigger>
        <TabsTrigger value="documents">{t("hr.tab.documents")}</TabsTrigger>
        <TabsTrigger value="notes">{t("hr.tab.notes")}</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6 pt-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label={t("hr.leave.remaining")} value={`${file.leave.remainingDays} / ${file.leave.entitlementDays}`} />
          <Stat label={t("hr.tenure")} value={file.tenureDays !== null ? t("hr.days", { count: file.tenureDays }) : "—"} />
          <Stat
            label={t("hr.contract_ends")}
            value={file.contractEndsInDays !== null ? t("hr.days", { count: file.contractEndsInDays }) : "—"}
            tone={file.contractEndsInDays !== null && file.contractEndsInDays <= 30 ? "text-amber-600" : undefined}
          />
          <Stat label={t("hr.open_tasks")} value={file.work.openTasks} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">{t("hr.section.employment")}</h4>
            <Field label={t("hr.field.contract_type")} value={file.employment.contract_type} />
            <Field label={t("hr.field.contract_start")} value={file.employment.contract_start} />
            <Field label={t("hr.field.contract_end")} value={file.employment.contract_end} />
            <Field label={t("hr.field.probation_end")} value={file.employment.probation_end} />
            <Field label={t("hr.field.weekly_hours")} value={file.employment.weekly_hours} />
            <Field label={t("hr.field.locations")} value={file.locations.map((l) => l.name)} />
          </div>
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">{t("hr.section.personal")}</h4>
            <Field label={t("hr.field.date_of_birth")} value={file.personal.date_of_birth} />
            <Field label={t("hr.field.address")} value={[file.personal.address, file.personal.city].filter(Boolean).join(", ")} />
            <Field label={t("hr.field.languages")} value={file.personal.languages} />
            <Field
              label={t("hr.field.emergency_contact")}
              value={[file.personal.emergency_contact_name, file.personal.emergency_contact_relation, file.personal.emergency_contact_phone]
                .filter(Boolean)
                .join(" · ")}
            />
            <Field label={t("hr.field.skills")} value={file.skills.skills} />
            <Field label={t("hr.field.certifications")} value={file.skills.certifications} />
          </div>
        </div>
        {file.upcomingShifts.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">{t("hr.upcoming_shifts")}</h4>
            <div className="flex flex-wrap gap-2">
              {file.upcomingShifts.map((s) => (
                <Badge key={`${s.date}-${s.start}`} variant="outline" className="font-semibold">
                  {fmtDay(s.date)} {s.start}–{s.end}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {file.sensitiveHidden && <p className="text-[11px] text-slate-400">{t("hr.sensitive_hidden")}</p>}
      </TabsContent>

      <TabsContent value="attendance" className="space-y-4 pt-4">
        {file.today && (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t("hr.today")}: <strong>{t(`hr.presence.${file.today.status}`)}</strong>
            {file.today.clockIn ? ` · ${file.today.clockIn}` : ""}
            {file.today.site ? ` · ${file.today.site}` : ""}
          </p>
        )}
        {month ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label={t("hr.att.present")} value={`${month.days_present}/${month.scheduled_shifts}`} />
            <Stat
              label={t("hr.att.late")}
              value={`${month.late_count} · ${month.late_minutes} min`}
              tone={month.late_count >= 3 ? "text-amber-600" : undefined}
            />
            <Stat
              label={t("hr.att.no_show")}
              value={month.absent_unreported}
              tone={month.absent_unreported ? "text-red-600" : undefined}
            />
            <Stat label={t("hr.att.hours")} value={`${month.hours}h`} />
            <Stat label={t("hr.att.justified")} value={month.absences_justified} />
            <Stat label={t("hr.att.pending")} value={month.absences_pending} />
            <Stat label={t("hr.att.unjustified")} value={month.absences_unjustified} />
            <Stat label={t("hr.att.leave")} value={month.leave_days} />
          </div>
        ) : (
          <p className="text-sm text-slate-400">{t("hr.att.none")}</p>
        )}
      </TabsContent>

      <TabsContent value="absences" className="space-y-3 pt-4">
        <input
          ref={justificationInput}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            const picked = e.target.files?.[0];
            if (picked && justifyFor) {
              void run(() => api.uploadAbsenceJustification(token(), justifyFor, picked), t("hr.absence.justification_saved"));
            }
            e.target.value = "";
          }}
        />
        {file.absences.length === 0 && <p className="text-sm text-slate-400">{t("hr.absence.none")}</p>}
        {file.absences.map((a) => (
          <div key={a.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {fmtDay(a.startDate)}
                  {a.endDate !== a.startDate ? ` → ${fmtDay(a.endDate)}` : ""} · {reasonLabel(a)}
                </p>
                {a.note && <p className="text-xs text-slate-500 whitespace-pre-line">{a.note}</p>}
              </div>
              <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-lg", ABSENCE_TONE[a.status])}>{statusLabel(a.status)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {a.justification ? (
                <a
                  href={safeUrl(a.justification.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  <Paperclip className="w-3.5 h-3.5" /> {t("hr.absence.view_justification")}
                </a>
              ) : (
                canEdit && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setJustifyFor(a.id);
                      justificationInput.current?.click();
                    }}
                  >
                    <Upload className="w-3.5 h-3.5 me-1" /> {t("hr.absence.upload_justification")}
                  </Button>
                )
              )}
              {canEdit && a.status !== "JUSTIFIED" && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => run(() => api.reviewAbsence(token(), a.id, "JUSTIFIED"), t("hr.absence.updated"))}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 me-1" /> {statusLabel("JUSTIFIED")}
                </Button>
              )}
              {canEdit && a.status !== "EXCUSED" && (
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(() => api.reviewAbsence(token(), a.id, "EXCUSED"), t("hr.absence.updated"))}>
                  {statusLabel("EXCUSED")}
                </Button>
              )}
              {canEdit && a.status !== "UNJUSTIFIED" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600"
                  disabled={busy}
                  onClick={() => run(() => api.reviewAbsence(token(), a.id, "UNJUSTIFIED"), t("hr.absence.updated"))}
                >
                  <XCircle className="w-3.5 h-3.5 me-1" /> {statusLabel("UNJUSTIFIED")}
                </Button>
              )}
            </div>
          </div>
        ))}
      </TabsContent>

      <TabsContent value="documents" className="space-y-3 pt-4">
        {canEdit && (
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={docCategory}
              onChange={(e) => setDocCategory(e.target.value as StaffDocumentCategory)}
              aria-label={t("hr.doc.category")}
            >
              {DOC_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`hr.doc.cat.${c}`)}
                </option>
              ))}
            </select>
            <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder={t("hr.doc.title_placeholder")} />
            <input
              ref={docInput}
              type="file"
              className="hidden"
              onChange={(e) => {
                const picked = e.target.files?.[0];
                if (picked) {
                  void run(
                    () => api.uploadStaffDocumentFull(token(), staffId, picked, docTitle || picked.name, docCategory),
                    t("hr.doc.uploaded"),
                  ).then(() => setDocTitle(""));
                }
                e.target.value = "";
              }}
            />
            <Button disabled={busy} onClick={() => docInput.current?.click()}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 me-1" />} {t("hr.doc.upload")}
            </Button>
          </div>
        )}
        {file.documents.length === 0 && <p className="text-sm text-slate-400">{t("hr.doc.none")}</p>}
        {file.documents.map((d) => (
          <div key={d.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate text-slate-800 dark:text-slate-100">{d.title}</p>
                <p className="text-[11px] text-slate-500">
                  {t(`hr.doc.cat.${d.category}`)} · {fmtDay(d.createdAt)}
                  {d.source === "whatsapp" ? " · WhatsApp" : ""}
                  {d.expiresAt ? ` · ${t("hr.doc.expires")} ${fmtDay(d.expiresAt)}` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <a
                href={safeUrl(d.url)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("hr.doc.download")}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-emerald-600"
              >
                <Download className="w-4 h-4" />
              </a>
              {canEdit && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={t("hr.doc.delete")}
                  disabled={busy}
                  onClick={() => run(() => api.deleteStaffDocument(token(), d.id), t("hr.doc.deleted"))}
                >
                  <Trash2 className="w-4 h-4 text-slate-400" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </TabsContent>

      <TabsContent value="notes" className="space-y-3 pt-4">
        {canEdit && (
          <div className="space-y-2">
            <Textarea value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder={t("hr.note.placeholder")} rows={2} />
            <div className="flex gap-2">
              {(["NOTE", "PRAISE", "WARNING"] as StaffNoteKind[]).map((k) => (
                <Button key={k} size="sm" variant={noteKind === k ? "default" : "outline"} onClick={() => setNoteKind(k)}>
                  {t(`hr.note.kind.${k}`)}
                </Button>
              ))}
              <Button
                size="sm"
                className="ms-auto"
                disabled={busy || noteBody.trim().length < 2}
                onClick={() =>
                  run(() => api.addStaffNote(token(), staffId, noteBody.trim(), noteKind), t("hr.note.added")).then(() => setNoteBody(""))
                }
              >
                {t("hr.note.add")}
              </Button>
            </div>
          </div>
        )}
        {file.notes.length === 0 && <p className="text-sm text-slate-400">{t("hr.note.none")}</p>}
        {file.notes.map((n) => (
          <div key={n.id} className={cn("rounded-xl border p-3", NOTE_TONE[n.kind])}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{t(`hr.note.kind.${n.kind}`)}</span>
              <span className="text-[11px] text-slate-400">
                {n.author} · {fmtDay(n.createdAt)}
              </span>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line mt-1">{n.body}</p>
            {canEdit && (
              <button
                type="button"
                className="text-[11px] text-slate-400 hover:text-red-600 mt-1"
                onClick={() => run(() => api.deleteStaffNote(token(), n.id), t("hr.note.deleted"))}
              >
                {t("hr.note.delete")}
              </button>
            )}
          </div>
        ))}
      </TabsContent>
    </Tabs>
  );
}

/** The staff HR file is the HR & staff files module; without it, say so instead of calling its API. */
export default function StaffHRFile(props: { staffId: string; canEdit?: boolean }) {
  const { t } = useTranslation();
  const { isEnabled, ready } = useModules();
  if (ready && !isEnabled("hr")) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("modules.off_inline", { name: t("modules.hr.name") })}{" "}
        <Link to="/dashboard/settings?tab=modules" className="font-semibold text-primary hover:underline">
          {t("modules.manage_all")}
        </Link>
      </p>
    );
  }
  return <StaffHRFileBody {...props} />;
}
