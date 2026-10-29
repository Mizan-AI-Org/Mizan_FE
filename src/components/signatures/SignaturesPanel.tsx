import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BellRing,
  Check,
  ChevronDown,
  Clock,
  Download,
  Eye,
  FileSignature,
  Loader2,
  MessageCircle,
  PenLine,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-language";
import { api } from "@/lib/api";
import { signaturesApi } from "@/lib/signaturesApi";
import { cn } from "@/lib/utils";
import type { SignatureRequestRow, SignatureSigner, SignatureStatus } from "@/lib/types";
import SignDialog from "./SignDialog";

const STATUS_TONE: Record<SignatureStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  approval: "bg-sky-100 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200",
  sent: "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
  declined: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200",
  voided: "bg-muted text-muted-foreground",
  expired: "bg-muted text-muted-foreground",
};
const KINDS = ["contract", "offer_letter", "supplier_agreement", "nda", "policy", "lease", "other"];
type Filter = "open" | "to_sign" | "completed" | "";

function SignerLine({ s }: { s: SignatureSigner }) {
  const { t } = useLanguage();
  const icon =
    s.status === "signed" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> :
    s.status === "declined" ? <X className="h-3.5 w-3.5 text-red-600" /> :
    s.status === "viewed" ? <Eye className="h-3.5 w-3.5 text-amber-600" /> :
    <Clock className={cn("h-3.5 w-3.5", s.isCurrent ? "text-amber-600" : "text-muted-foreground/60")} />;
  return (
    <li className="flex flex-wrap items-center gap-2 text-xs">
      <span className="w-4 text-center font-mono text-muted-foreground">{s.role === "copy" ? "·" : s.order}</span>
      {icon}
      <span className="font-medium text-foreground">{s.name}</span>
      {!s.isTeam ? <span className="text-muted-foreground">{s.phone}</span> : null}
      <span className="text-muted-foreground">
        {s.role === "copy" ? t("signatures.signer.copy") : s.undelivered ? "" : t(`signatures.signer.${s.status}`)}
        {s.signedAt ? ` · ${new Date(s.signedAt).toLocaleString()}` : ""}
        {s.reminders ? ` · ${t("signatures.reminded", { count: s.reminders })}` : ""}
      </span>
      {s.undelivered ? <span className="font-semibold text-red-600 dark:text-red-400">{t("signatures.signer.undelivered")}</span> : null}
      {s.declineReason ? <span className="w-full ps-6 text-red-700 dark:text-red-300">“{s.declineReason}”</span> : null}
    </li>
  );
}

function SignatureCard({ row, me, onChanged }: { row: SignatureRequestRow; me: string; onChanged: () => void }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [signing, setSigning] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const detail = useQuery({ queryKey: ["signature", row.id], queryFn: () => signaturesApi.get(row.id), enabled: open });
  const full = detail.data ?? row;
  const mine = row.signers.find((s) => s.canSignHere);
  const after = (msg: string) => () => {
    toast.success(msg);
    setSigning(false);
    setDeclining(false);
    onChanged();
  };
  const fail = (e: unknown) => toast.error((e as Error).message);
  const remind = useMutation({ mutationFn: () => signaturesApi.remind(row.id), onSuccess: after(t("signatures.toast.reminded")), onError: fail });
  const voidIt = useMutation({ mutationFn: () => signaturesApi.void(row.id, reason), onSuccess: after(t("signatures.toast.voided")), onError: fail });
  const sign = useMutation({ mutationFn: (name: string) => signaturesApi.sign(row.id, name), onSuccess: after(t("signatures.toast.signed")), onError: fail });
  const decline = useMutation({ mutationFn: () => signaturesApi.decline(row.id, reason), onSuccess: after(t("signatures.toast.declined")), onError: fail });
  const openFile = (path: string) => signaturesApi.open(path).catch(fail);
  const signedCount = row.signers.filter((s) => s.role === "signer" && s.status === "signed").length;
  const total = row.signers.filter((s) => s.role === "signer").length;
  const waitingFor = row.signers.filter((s) => s.isCurrent).map((s) => s.name).join(", ");

  return (
    <li className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-start gap-3 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground/80">
          <FileSignature className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-muted-foreground">{t(`signatures.kinds.${row.kind}`, { defaultValue: row.kind })}</span>
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]" title={t("signatures.code_hint")}>#{row.code}</span>
            <span className={cn("rounded px-1.5 py-0.5 font-semibold", STATUS_TONE[row.status])}>{t(`signatures.status.${row.status}`)}</span>
          </div>
          <p className="truncate text-sm font-semibold text-foreground sm:text-base">{row.title}</p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span>{row.createdBy || "—"}</span>
            <span className="tabular-nums">{t("signatures.progress", { done: signedCount, total })}</span>
            {row.status === "sent" && waitingFor ? <span>{t("signatures.waiting_for", { names: waitingFor })}</span> : null}
            {row.status === "approval" && row.approval ? <span>{t("signatures.awaiting_approval", { code: row.approval.code })}</span> : null}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {mine ? (
            <>
              <Button size="sm" onClick={() => setSigning(true)}>
                <PenLine className="me-1.5 h-4 w-4" aria-hidden />
                {t("signatures.sign.button")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setDeclining(true)}>{t("signatures.decline")}</Button>
            </>
          ) : null}
          {row.sealedUrl ? (
            <Button size="sm" variant="outline" onClick={() => openFile(row.sealedUrl)}>
              <Download className="me-1.5 h-4 w-4" aria-hidden />
              {t("signatures.signed_copy")}
            </Button>
          ) : null}
          <Button size="icon" variant="ghost" aria-expanded={open} aria-label={t("approvals.details")} onClick={() => setOpen((v) => !v)}>
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
          </Button>
        </div>
      </div>

      {declining ? (
        <form className="flex flex-wrap items-center gap-2 border-t border-border/60 px-4 py-3"
              onSubmit={(e) => { e.preventDefault(); if (reason.trim()) decline.mutate(); }}>
          <Input autoFocus value={reason} onChange={(e) => setReason(e.target.value)} className="min-w-[220px] flex-1"
                 placeholder={t("signatures.decline_placeholder")} aria-label={t("signatures.decline_placeholder")} />
          <Button type="submit" size="sm" variant="destructive" disabled={!reason.trim() || decline.isPending}>{t("signatures.decline")}</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setDeclining(false)}>{t("approvals.back")}</Button>
        </form>
      ) : null}

      {open ? (
        <div className="grid gap-4 border-t border-border/60 px-4 py-4 text-sm sm:grid-cols-2">
          <div className="space-y-3">
            {full.message ? <p className="whitespace-pre-line text-foreground/90">“{full.message}”</p> : null}
            <ol className="space-y-1.5">{full.signers.map((s) => <SignerLine key={s.id} s={s} />)}</ol>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" className="px-2 text-xs" onClick={() => openFile(full.documentUrl)}>
                <Eye className="me-1 h-3.5 w-3.5" aria-hidden />{t("signatures.original")}
              </Button>
              {full.status === "sent" && me === "manager" ? (
                <Button size="sm" variant="ghost" className="px-2 text-xs" disabled={remind.isPending} onClick={() => remind.mutate()}>
                  <BellRing className="me-1 h-3.5 w-3.5" aria-hidden />{t("signatures.remind")}
                </Button>
              ) : null}
              {["sent", "approval"].includes(full.status) && me === "manager" ? (
                <Button size="sm" variant="ghost" className="px-2 text-xs text-destructive hover:text-destructive" disabled={voidIt.isPending}
                        onClick={() => { if (window.confirm(t("signatures.void_confirm"))) voidIt.mutate(); }}>
                  <Trash2 className="me-1 h-3.5 w-3.5" aria-hidden />{t("signatures.void")}
                </Button>
              ) : null}
            </div>
            {full.status === "completed" ? (
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                <span>{t("signatures.sealed_hint")} <a href={full.verifyUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-primary hover:underline">{full.ref}</a></span>
              </p>
            ) : null}
          </div>
          <div>
            <p className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("approvals.timeline")}
              {full.chainOk === true ? <span className="normal-case tracking-normal text-emerald-600">· {t("signatures.chain_ok")}</span> : null}
              {full.chainOk === false ? <span className="normal-case tracking-normal text-red-600">· {t("signatures.chain_broken")}</span> : null}
            </p>
            {detail.isLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
            <ol className="space-y-1.5 border-s border-border ps-3">
              {(full.events || []).map((ev, i) => (
                <li key={`${ev.at}-${i}`} className="text-xs">
                  <span className="font-medium text-foreground">{t(`signatures.event.${ev.kind}`, { defaultValue: ev.label })}</span>
                  {ev.who ? <span className="text-muted-foreground"> · {ev.who}</span> : null}
                  {ev.detail.via === "whatsapp" ? <MessageCircle className="ms-1 inline h-3 w-3 text-emerald-600" aria-label="WhatsApp" /> : null}
                  <span className="text-muted-foreground"> · {ev.localTime}</span>
                  {ev.detail.reason ? <p className="text-muted-foreground">“{ev.detail.reason}”</p> : null}
                  {ev.detail.question ? <p className="text-muted-foreground">“{ev.detail.question}”</p> : null}
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : null}

      {mine ? (
        <SignDialog open={signing} onOpenChange={setSigning} title={t("signatures.sign.title", { title: row.title })}
                    expectedName={mine.name} pending={sign.isPending} onSign={(name) => sign.mutate(name)} />
      ) : null}
    </li>
  );
}

type Draft = { key: number; kind: "team" | "outside"; userId: string; name: string; phone: string; title: string; copy: boolean };

function NewSignature({ onCreated }: { onCreated: () => void }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("contract");
  const [message, setMessage] = useState("");
  const [ordered, setOrdered] = useState(true);
  const [days, setDays] = useState(14);
  const [signers, setSigners] = useState<Draft[]>([{ key: 1, kind: "outside", userId: "", name: "", phone: "", title: "", copy: false }]);
  const input = useRef<HTMLInputElement>(null);
  const team = useQuery({
    queryKey: ["staff-list-sign"],
    queryFn: () => api.getStaffList(localStorage.getItem("access_token") || ""),
    enabled: open,
  });
  const valid = !!file && signers.some((s) => !s.copy) &&
    signers.every((s) => (s.kind === "team" ? !!s.userId : s.name.trim() && s.phone.replace(/\D/g, "").length >= 8));
  const create = useMutation({
    mutationFn: () => {
      const form = new FormData();
      form.append("file", file as File);
      form.append("title", title || (file as File).name.replace(/\.pdf$/i, ""));
      form.append("kind", kind);
      form.append("message", message);
      form.append("ordered", String(ordered));
      form.append("expires_in_days", String(days));
      form.append("signers", JSON.stringify(signers.map((s, i) => ({
        ...(s.kind === "team" ? { user_id: s.userId } : { name: s.name.trim(), phone: s.phone }),
        title: s.title, order: i + 1, role: s.copy ? "copy" : "signer",
      }))));
      return signaturesApi.create(form);
    },
    onSuccess: (row) => {
      toast.success(row.status === "approval" ? t("signatures.toast.awaiting_approval") : t("signatures.toast.sent"));
      setOpen(false);
      setFile(null);
      setTitle("");
      setMessage("");
      setSigners([{ key: Date.now(), kind: "outside", userId: "", name: "", phone: "", title: "", copy: false }]);
      onCreated();
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const patch = (key: number, p: Partial<Draft>) => setSigners((list) => list.map((s) => (s.key === key ? { ...s, ...p } : s)));

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="me-1.5 h-4 w-4" aria-hidden />
        {t("signatures.new")}
      </Button>
    );
  }
  return (
    <form className="w-full space-y-4 rounded-xl border border-border bg-card p-4"
          onSubmit={(e) => { e.preventDefault(); if (valid) create.mutate(); }}>
      <div className="flex flex-wrap items-center gap-2">
        <input ref={input} type="file" accept="application/pdf,.pdf" className="hidden"
               onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <Button type="button" variant="outline" onClick={() => input.current?.click()}>
          <Upload className="me-1.5 h-4 w-4" aria-hidden />
          {file ? file.name : t("signatures.choose_pdf")}
        </Button>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("signatures.title_placeholder")}
               className="min-w-[200px] flex-1" aria-label={t("signatures.title_placeholder")} />
        <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label={t("signatures.kind")}
                className="h-10 rounded-md border border-input bg-background px-2 text-sm">
          {KINDS.map((k) => <option key={k} value={k}>{t(`signatures.kinds.${k}`)}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">{ordered ? t("signatures.signers_ordered") : t("signatures.signers_parallel")}</p>
        {signers.map((s, i) => (
          <div key={s.key} className="flex flex-wrap items-center gap-2">
            <span className="w-5 text-center font-mono text-xs text-muted-foreground">{s.copy ? "·" : i + 1}</span>
            <select value={s.kind} onChange={(e) => patch(s.key, { kind: e.target.value as Draft["kind"] })}
                    aria-label={t("signatures.who")} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
              <option value="outside">{t("signatures.outside")}</option>
              <option value="team">{t("signatures.team_member")}</option>
            </select>
            {s.kind === "team" ? (
              <select value={s.userId} onChange={(e) => patch(s.key, { userId: e.target.value })} aria-label={t("signatures.team_member")}
                      className="h-9 min-w-[180px] flex-1 rounded-md border border-input bg-background px-2 text-sm">
                <option value="">{t("signatures.pick_member")}</option>
                {(team.data || []).map((m) => <option key={m.id} value={m.id}>{`${m.first_name} ${m.last_name}`.trim() || m.email}</option>)}
              </select>
            ) : (
              <>
                <Input value={s.name} onChange={(e) => patch(s.key, { name: e.target.value })} placeholder={t("signatures.full_name")}
                       className="h-9 min-w-[160px] flex-1" aria-label={t("signatures.full_name")} />
                <Input value={s.phone} onChange={(e) => patch(s.key, { phone: e.target.value })} placeholder="+212 6…" inputMode="tel"
                       className="h-9 w-40" aria-label={t("signatures.whatsapp_number")} />
              </>
            )}
            <Input value={s.title} onChange={(e) => patch(s.key, { title: e.target.value })} placeholder={t("signatures.role_placeholder")}
                   className="h-9 w-32" aria-label={t("signatures.role_placeholder")} />
            <label className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <input type="checkbox" checked={s.copy} onChange={(e) => patch(s.key, { copy: e.target.checked })} />
              {t("signatures.copy_only")}
            </label>
            {signers.length > 1 ? (
              <Button type="button" size="icon" variant="ghost" aria-label={t("signatures.remove")}
                      onClick={() => setSigners((list) => list.filter((x) => x.key !== s.key))}>
                <X className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        ))}
        <Button type="button" size="sm" variant="ghost" onClick={() => setSigners((list) => [...list, { key: Date.now(), kind: "team", userId: "", name: "", phone: "", title: "", copy: false }])}>
          <Plus className="me-1 h-3.5 w-3.5" aria-hidden />{t("signatures.add_signer")}
        </Button>
      </div>

      <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder={t("signatures.message_placeholder")} />
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={ordered} onChange={(e) => setOrdered(e.target.checked)} />
          {t("signatures.in_order")}
        </label>
        <label className="inline-flex items-center gap-2">
          {t("signatures.expires_in")}
          <Input type="number" min={1} max={90} value={days} onChange={(e) => setDays(Number(e.target.value) || 14)} className="h-8 w-16" />
          {t("signatures.days")}
        </label>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <MessageCircle className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
        {t("signatures.how_it_works")}
      </p>
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{t("approvals.back")}</Button>
        <Button type="submit" disabled={!valid || create.isPending}>
          {create.isPending ? <Loader2 className="me-1.5 h-4 w-4 animate-spin" /> : <FileSignature className="me-1.5 h-4 w-4" aria-hidden />}
          {t("signatures.send")}
        </Button>
      </div>
    </form>
  );
}

/** Approvals → Signatures: documents out for e-signature on WhatsApp, the ones I must sign, sealed copies. */
export default function SignaturesPanel({ canManage }: { canManage: boolean }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("open");
  const query = useQuery({ queryKey: ["signatures", filter], queryFn: () => signaturesApi.list(filter), refetchInterval: 30_000 });
  const rows = useMemo(() => query.data ?? [], [query.data]);
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["signatures"] });
  const filters: { id: Filter; label: string }[] = [
    { id: "open", label: t("signatures.filter.open") },
    { id: "to_sign", label: t("signatures.filter.to_sign") },
    { id: "completed", label: t("signatures.filter.completed") },
    { id: "", label: t("signatures.filter.all") },
  ];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1" role="tablist">
          {filters.map((f) => (
            <button key={f.id || "all"} type="button" role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)}
                    className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold",
                      filter === f.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>
              {f.label}
            </button>
          ))}
        </div>
        {canManage ? <NewSignature onCreated={refresh} /> : null}
      </div>
      {query.isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : null}
      {query.isError ? <p className="text-sm text-destructive">{t("signatures.load_error")}</p> : null}
      {!query.isLoading && rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          {t(`signatures.empty.${filter || "all"}`)}
        </div>
      ) : null}
      <ul className="space-y-2.5">
        {rows.map((row) => <SignatureCard key={row.id} row={row} me={canManage ? "manager" : ""} onChanged={refresh} />)}
      </ul>
    </div>
  );
}
