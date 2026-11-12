import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, MessageCircle, UserPlus, Users } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { API_BASE, api, type JobTitleReport, type StaffImportPreview } from "@/lib/api";
import { parseLines, ROLE_CODES, rowsToPreviewCsv } from "@/lib/staffPaste";
import { UnmatchedTitlesPanel } from "@/components/staff/JobTitlesPanel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Add people WhatsApp-first (apps/accounts/onboarding.py): no invitation links. Mizan sends each person the approved
 * welcome template and they join with one tap. Phone is required, email optional. One person, or several pasted as
 * "Name, phone, role or job title" lines (a spreadsheet copy works too; see lib/staffPaste.ts). A job title the
 * backend doesn't recognise is asked once afterwards ("Plongeur (5) → role") via UnmatchedTitlesPanel. */

const ROLES = ROLE_CODES;
const selectClass = "h-10 w-full rounded-md border bg-background px-3 text-sm";

type Location = { id: string; name: string };

export function AddPeopleDialog({
  open,
  onOpenChange,
  locations,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: Location[];
  onAdded: () => void;
}) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<"one" | "many">("one");
  const [form, setForm] = useState({ first_name: "", last_name: "", phone: "", email: "", role: "STAFF", location: "" });
  const [bulk, setBulk] = useState("");
  const [busy, setBusy] = useState(false);
  const parsed = useMemo(() => parseLines(bulk, form.role), [bulk, form.role]);
  // What the backend makes of each pasted title (POST /staff/import/ preview), and what an import reported back.
  const [preview, setPreview] = useState<StaffImportPreview | null>(null);
  const [previewTick, setPreviewTick] = useState(0);
  const [report, setReport] = useState<JobTitleReport | null>(null);
  const hasTitles = parsed.rows.some((r) => r.title);

  useEffect(() => {
    if (mode !== "many" || !hasTitles) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      api.previewStaffImport(rowsToPreviewCsv(parsed.rows))
        .then((out) => { if (!cancelled) setPreview(out); })
        .catch(() => { if (!cancelled) setPreview(null); });
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [mode, hasTitles, parsed.rows, previewTick]);

  const resolvedByLine = useMemo(() => {
    const out = new Map<number, { role: string; unmatched: boolean }>();
    for (const r of [...(preview?.valid ?? []), ...(preview?.duplicates ?? []), ...(preview?.errors ?? [])]) {
      if (r.line && r.resolvedRole) out.set(r.line, { role: r.resolvedRole, unmatched: !!r.titleUnmatched });
    }
    return out;
  }, [preview]);

  const post = async (path: string, body: Record<string, unknown>) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) throw new Error(data.error || data.message || t("staff.add_people.failed"));
    return data;
  };

  const reset = () => {
    setForm({ first_name: "", last_name: "", phone: "", email: "", role: "STAFF", location: "" });
    setBulk("");
    setPreview(null);
  };

  const close = (next: boolean) => {
    if (!next) setReport(null);
    onOpenChange(next);
  };

  const submit = async () => {
    setBusy(true);
    let result: JobTitleReport = {};
    try {
      if (mode === "one") {
        const data = await post("/staff/invite/", {
          first_name: form.first_name,
          last_name: form.last_name,
          phone_number: form.phone,
          email: form.email || undefined,
          role: form.role,
          primary_location: form.location || undefined,
        });
        const delivered = data.data?.status === "sent";
        toast[delivered ? "success" : "warning"](delivered ? t("staff.add_people.sent_one") : t("staff.add_people.not_delivered"));
        result = data;
      } else {
        const data = await post("/staff/invite-bulk-csv/", {
          staff_list: parsed.rows,
          primary_location: form.location || undefined,
        });
        const sent = (data.people || []).filter((p: { status?: string }) => p.status === "sent").length;
        toast.success(t("staff.add_people.sent_many", { added: data.created ?? 0, sent }));
        for (const err of (data.errors || []).slice(0, 3)) toast.error(String(err));
        result = data;
      }
      reset();
      onAdded();
      if (result.unmatchedTitles?.length || result.rolesLowered?.length) {
        // Stay open on the answer step: "Plongeur (5) → which role?" and who was added lower than their title.
        setReport({ unmatchedTitles: result.unmatchedTitles ?? [], rolesLowered: result.rolesLowered ?? [] });
      } else {
        onOpenChange(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = mode === "one" ? !!form.phone.trim() && !!form.first_name.trim() : parsed.rows.length > 0;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("staff.add_people.title")}</DialogTitle>
          <DialogDescription className="flex items-start gap-2">
            <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            {t("staff.add_people.subtitle")}
          </DialogDescription>
        </DialogHeader>

        {report ? (
          <>
            <UnmatchedTitlesPanel
              unmatched={report.unmatchedTitles}
              lowered={report.rolesLowered}
              onApplied={(title) => {
                setReport((r) => r && { ...r, unmatchedTitles: (r.unmatchedTitles ?? []).filter((u) => u.title !== title) });
                onAdded();
              }}
            />
            <DialogFooter>
              <Button onClick={() => close(false)}>{t("staff.job_titles.done")}</Button>
            </DialogFooter>
          </>
        ) : (
        <>
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
          {(["one", "many"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm ${mode === m ? "bg-background font-medium shadow-sm" : "text-muted-foreground"}`}>
              {m === "one" ? <UserPlus className="h-4 w-4" /> : <Users className="h-4 w-4" />}
              {t(`staff.add_people.mode_${m}`)}
            </button>
          ))}
        </div>

        <div className="grid gap-3">
          {mode === "one" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <Label>{t("staff.add_people.first_name")}</Label>
                  <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                </div>
                <div className="grid gap-1">
                  <Label>{t("staff.add_people.last_name")}</Label>
                  <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-1">
                <Label>{t("staff.add_people.phone")}</Label>
                <Input type="tel" placeholder="+212 6 12 34 56 78" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="grid gap-1">
                <Label>{t("staff.add_people.email_optional")}</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </>
          ) : (
            <div className="grid gap-1">
              <Label>{t("staff.add_people.paste_label")}</Label>
              <Textarea rows={7} value={bulk} placeholder={"Amina Benali, +212612345678, CHEF\nFatima Zahra 0612345678 Serveuse\nYoussef Idrissi, +212698765432"}
                onChange={(e) => setBulk(e.target.value)} className="font-mono text-sm" />
              <p className="text-xs text-muted-foreground">
                {t("staff.add_people.parsed", { count: parsed.rows.length })}
                {parsed.bad.length > 0 && ` · ${t("staff.add_people.skipped", { count: parsed.bad.length })}`}
              </p>
              {hasTitles && (
                <div className="mt-1 max-h-40 divide-y overflow-y-auto rounded-md border text-xs" data-testid="paste-preview">
                  {parsed.rows.slice(0, 30).map((r, i) => {
                    const resolved = resolvedByLine.get(i + 2);
                    const role = r.role || resolved?.role;
                    const unmatched = !r.role && !!resolved?.unmatched;
                    return (
                      <div key={i} className="flex items-center gap-2 px-2 py-1">
                        <span className="min-w-0 flex-1 truncate">{`${r.first_name} ${r.last_name}`.trim()}</span>
                        {r.title && <span className="truncate text-muted-foreground">{r.title}</span>}
                        {role && (
                          <span className={`shrink-0 rounded px-1.5 py-0.5 ${unmatched ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200" : "bg-muted"}`}
                            title={unmatched ? t("staff.job_titles.unmatched_badge") : undefined}>
                            {t(`staff.add_people.roles.${role.toLowerCase()}`)}{unmatched ? " ?" : ""}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {preview && preview.unmatchedTitles.length > 0 && (
                <UnmatchedTitlesPanel beforeImport unmatched={preview.unmatchedTitles} onApplied={() => setPreviewTick((n) => n + 1)} />
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label>{mode === "one" ? t("staff.add_people.role") : t("staff.add_people.default_role")}</Label>
              <select className={selectClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLES.map((r) => <option key={r} value={r}>{t(`staff.add_people.roles.${r.toLowerCase()}`)}</option>)}
              </select>
            </div>
            {locations.length > 1 && (
              <div className="grid gap-1">
                <Label>{t("staff.add_people.branch")}</Label>
                <select className={selectClass} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}>
                  <option value="">{t("staff.add_people.main_branch")}</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>{t("common.cancel")}</Button>
          <Button onClick={submit} disabled={busy || !canSubmit} className="bg-emerald-600 text-white hover:bg-emerald-700">
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "one" ? t("staff.add_people.send_one") : t("staff.add_people.send_many", { count: parsed.rows.length })}
          </Button>
        </DialogFooter>
        </>
        )}
      </DialogContent>
    </Dialog>
  );
}
