import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, MessageCircle, UserPlus, Users } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { API_BASE } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Add people WhatsApp-first (apps/accounts/onboarding.py): no invitation links. Mizan sends each person the approved
 * welcome template and they join with one tap. Phone is required, email optional. One person, or several pasted as
 * "Name, phone, role" lines (a spreadsheet copy works too). */

const ROLES = ["STAFF", "CHEF", "WAITER", "BARTENDER", "SUPERVISOR", "MANAGER", "ADMIN"];
const selectClass = "h-10 w-full rounded-md border bg-background px-3 text-sm";

type Location = { id: string; name: string };
type Row = { first_name: string; last_name: string; phone: string; role: string };

function parseLines(text: string, fallbackRole: string): { rows: Row[]; bad: string[] } {
  const rows: Row[] = [];
  const bad: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const parts = line.split(/[\t,;]+/).map((p) => p.trim()).filter(Boolean);
    const phoneAt = parts.findIndex((p) => /^\+?[\d\s().-]{7,}$/.test(p));
    if (phoneAt < 0) {
      bad.push(line);
      continue;
    }
    const phone = parts[phoneAt];
    const rest = parts.filter((_, i) => i !== phoneAt);
    const role = rest.find((p) => ROLES.includes(p.toUpperCase()));
    const name = rest.filter((p) => p !== role).join(" ").split(/\s+/);
    rows.push({ first_name: name[0] || "", last_name: name.slice(1).join(" "), phone, role: (role || fallbackRole).toUpperCase() });
  }
  return { rows, bad };
}

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
  };

  const submit = async () => {
    setBusy(true);
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
      } else {
        const data = await post("/staff/invite-bulk-csv/", {
          staff_list: parsed.rows,
          primary_location: form.location || undefined,
        });
        const sent = (data.people || []).filter((p: { status?: string }) => p.status === "sent").length;
        toast.success(t("staff.add_people.sent_many", { added: data.created ?? 0, sent }));
        for (const err of (data.errors || []).slice(0, 3)) toast.error(String(err));
      }
      reset();
      onAdded();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = mode === "one" ? !!form.phone.trim() && !!form.first_name.trim() : parsed.rows.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("staff.add_people.title")}</DialogTitle>
          <DialogDescription className="flex items-start gap-2">
            <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            {t("staff.add_people.subtitle")}
          </DialogDescription>
        </DialogHeader>

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
              <Textarea rows={7} value={bulk} placeholder={"Amina Benali, +212612345678, CHEF\nYoussef Idrissi, +212698765432"}
                onChange={(e) => setBulk(e.target.value)} className="font-mono text-sm" />
              <p className="text-xs text-muted-foreground">
                {t("staff.add_people.parsed", { count: parsed.rows.length })}
                {parsed.bad.length > 0 && ` · ${t("staff.add_people.skipped", { count: parsed.bad.length })}`}
              </p>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={submit} disabled={busy || !canSubmit} className="bg-emerald-600 text-white hover:bg-emerald-700">
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "one" ? t("staff.add_people.send_one") : t("staff.add_people.send_many", { count: parsed.rows.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
