import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  CalendarOff,
  Check,
  ChevronDown,
  CircleHelp,
  Clock,
  FileSignature,
  FileText,
  Loader2,
  MessageCircle,
  Package,
  Paperclip,
  Percent,
  Plus,
  Receipt,
  Repeat,
  ShoppingCart,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-language";
import { api } from "@/lib/api";
import { signaturesApi } from "@/lib/signaturesApi";
import SignDialog from "@/components/signatures/SignDialog";
import SignaturesPanel from "@/components/signatures/SignaturesPanel";
import { cn } from "@/lib/utils";
import type { ApprovalKind, ApprovalRow } from "@/lib/types";

type Scope = "mine" | "pending" | "requested" | "decided";

const KIND_ICON: Record<ApprovalKind, LucideIcon> = {
  purchase: ShoppingCart,
  expense: Receipt,
  salary_advance: Banknote,
  overtime: Clock,
  discount: Percent,
  purchase_order: Package,
  invoice: FileText,
  time_off: CalendarOff,
  shift_swap: Repeat,
  contract: FileSignature,
  other: CircleHelp,
};
const REQUESTABLE: ApprovalKind[] = ["purchase", "expense", "salary_advance", "overtime", "discount", "other"];
const MONEY: ApprovalKind[] = ["purchase", "expense", "salary_advance", "discount", "purchase_order", "invoice", "other"];

const STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200",
  cancelled: "bg-muted text-muted-foreground",
};

function money(amount: string, currency: string) {
  if (!amount) return "";
  const n = Number(amount);
  const shown = Number.isFinite(n) ? String(Math.round(n * 100) / 100).replace(/\B(?=(\d{3})+(?!\d))/g, " ") : amount;
  return `${shown} ${currency}`;
}

function ago(iso: string | null, t: (k: string, o?: Record<string, string | number>) => string) {
  if (!iso) return "";
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (hours < 1) return t("approvals.just_now");
  if (hours < 48) return t("approvals.hours_ago", { count: hours });
  return t("approvals.days_ago", { count: Math.floor(hours / 24) });
}

function StepDots({ row }: { row: ApprovalRow }) {
  if (row.steps.length < 2) return null;
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      {row.steps.map((step, i) => (
        <span
          key={`${step.approverId}-${i}`}
          className={cn(
            "h-1.5 w-5 rounded-full",
            step.status === "approved" ? "bg-emerald-500" : step.status === "rejected" ? "bg-red-500" : i === row.stepIndex ? "bg-amber-500" : "bg-muted",
          )}
        />
      ))}
    </span>
  );
}

function ApprovalCard({ row, onChanged }: { row: ApprovalRow; onChanged: () => void }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [signing, setSigning] = useState(false);
  const Icon = KIND_ICON[row.kind] || CircleHelp;
  const detail = useQuery({ queryKey: ["approval", row.id], queryFn: () => api.getApproval(row.id), enabled: open });
  const act = useMutation({
    mutationFn: ({ decision, note, signedAs }: { decision: "approve" | "reject"; note?: string; signedAs?: string }) =>
      signedAs ? signaturesApi.approveSigned(row.id, signedAs, note) : api.decideApproval(row.id, decision, note),
    onSuccess: (res) => {
      setSigning(false);
      toast.success(
        res.status === "pending"
          ? t("approvals.toast_next", { name: res.assignedTo })
          : res.status === "approved"
            ? t("approvals.toast_approved")
            : t("approvals.toast_rejected"),
      );
      setRejecting(false);
      setReason("");
      onChanged();
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const cancel = useMutation({
    mutationFn: () => api.cancelApproval(row.id),
    onSuccess: () => {
      toast.success(t("approvals.toast_cancelled"));
      onChanged();
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const full = detail.data ?? row;

  return (
    <li className={cn("rounded-xl border bg-card transition-colors", row.overdue ? "border-red-300 dark:border-red-900/60" : "border-border")}>
      <div className="flex flex-wrap items-start gap-3 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground/80">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-muted-foreground">{row.kindLabel}</span>
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]" title={t("approvals.ref_hint")}>#{row.code}</span>
            <span className={cn("rounded px-1.5 py-0.5 font-semibold", STATUS_TONE[row.status])}>{t(`approvals.status.${row.status}`)}</span>
            {row.overdue ? <span className="font-semibold text-red-600 dark:text-red-400">{t("approvals.overdue")}</span> : null}
          </div>
          <p className="truncate text-sm font-semibold text-foreground sm:text-base">{row.title}</p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span>{row.requestedBy || "—"}</span>
            {row.amount ? <span className="font-semibold text-foreground tabular-nums">{money(row.amount, row.currency)}</span> : null}
            <span>{ago(row.createdAt, t)}</span>
            {row.status === "pending" && row.assignedTo ? (
              <span>
                {row.steps.length > 1 ? t("approvals.step_with", { n: row.stepIndex + 1, total: row.steps.length, name: row.assignedTo }) : t("approvals.with", { name: row.assignedTo })}
              </span>
            ) : null}
            {row.status !== "pending" && row.decidedBy ? <span>{t("approvals.by", { name: row.decidedBy })}</span> : null}
            <StepDots row={row} />
          </p>
          {row.status === "rejected" && row.decisionNotes ? <p className="text-xs text-red-700 dark:text-red-300">“{row.decisionNotes}”</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {row.canDecide && !rejecting ? (
            <>
              <Button size="sm" disabled={act.isPending}
                      onClick={() => (row.needsSignature ? setSigning(true) : act.mutate({ decision: "approve" }))}>
                {act.isPending ? <Loader2 className="me-1.5 h-4 w-4 animate-spin" /> : <Check className="me-1.5 h-4 w-4" aria-hidden />}
                {row.needsSignature ? t("approvals.approve_sign") : t("approvals.approve")}
              </Button>
              <Button size="sm" variant="outline" disabled={act.isPending} onClick={() => setRejecting(true)}>
                <X className="me-1.5 h-4 w-4" aria-hidden />
                {t("approvals.reject")}
              </Button>
            </>
          ) : null}
          <Button size="icon" variant="ghost" aria-expanded={open} aria-label={t("approvals.details")} onClick={() => setOpen((v) => !v)}>
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
          </Button>
        </div>
      </div>

      {rejecting ? (
        <form
          className="flex flex-wrap items-center gap-2 border-t border-border/60 px-4 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (reason.trim()) act.mutate({ decision: "reject", note: reason.trim() });
          }}
        >
          <Input
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("approvals.reason_placeholder", { name: row.requestedBy || "" })}
            className="min-w-[220px] flex-1"
            aria-label={t("approvals.reason_label")}
          />
          <Button type="submit" size="sm" variant="destructive" disabled={!reason.trim() || act.isPending}>
            {t("approvals.reject")}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setRejecting(false)}>
            {t("approvals.back")}
          </Button>
        </form>
      ) : null}

      {open ? (
        <div className="grid gap-4 border-t border-border/60 px-4 py-4 text-sm sm:grid-cols-2">
          <div className="space-y-2">
            {full.notes ? <p className="whitespace-pre-line text-foreground/90">{full.notes}</p> : <p className="text-muted-foreground">{t("approvals.no_notes")}</p>}
            {full.evidenceUrl.startsWith("http") ? (
              <a href={full.evidenceUrl} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                <Paperclip className="h-3.5 w-3.5" aria-hidden />
                {t("approvals.attachment")}
              </a>
            ) : full.evidenceUrl ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Paperclip className="h-3.5 w-3.5" aria-hidden />
                {t("approvals.attachment_whatsapp")}
              </span>
            ) : null}
            {full.steps.length ? (
              <ol className="space-y-1 pt-1">
                {full.steps.map((step, i) => (
                  <li key={`${step.approverId}-${i}`} className="flex items-center gap-2 text-xs">
                    <span className={cn("h-2 w-2 rounded-full", step.status === "approved" ? "bg-emerald-500" : step.status === "rejected" ? "bg-red-500" : i === full.stepIndex && full.status === "pending" ? "bg-amber-500" : "bg-muted-foreground/30")} />
                    <span className="font-medium">{step.approverName}</span>
                    <span className="text-muted-foreground">{t(`approvals.step_status.${step.status}`)}</span>
                    {step.signature ? <span className="font-serif italic text-foreground">✍ {step.signature.name}</span> : null}
                    {step.escalatedFrom ? <span className="text-muted-foreground">({t("approvals.escalated_from", { name: step.escalatedFrom })})</span> : null}
                  </li>
                ))}
              </ol>
            ) : null}
            {row.status === "pending" && !row.canDecide ? (
              <Button size="sm" variant="ghost" className="px-0 text-xs" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
                {t("approvals.cancel_request")}
              </Button>
            ) : null}
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t("approvals.timeline")}</p>
            {detail.isLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
            <ol className="space-y-1.5 border-s border-border ps-3">
              {(full.events || []).map((ev, i) => (
                <li key={`${ev.at}-${i}`} className="text-xs">
                  <span className="font-medium text-foreground">{t(`approvals.event.${ev.kind}`, { defaultValue: ev.kind })}</span>
                  {ev.actor ? <span className="text-muted-foreground"> · {ev.actor}</span> : null}
                  {ev.via === "whatsapp" ? <MessageCircle className="ms-1 inline h-3 w-3 text-emerald-600" aria-label="WhatsApp" /> : null}
                  <span className="text-muted-foreground"> · {new Date(ev.at).toLocaleString()}</span>
                  {ev.note && ev.kind !== "notified" ? <p className="text-muted-foreground">“{ev.note}”</p> : null}
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : null}
      {row.needsSignature ? (
        <SignDialog open={signing} onOpenChange={setSigning} title={t("approvals.sign_title", { title: row.title })}
                    intro={t("approvals.sign_intro")} expectedName={currentUserName()} confirmLabel={t("approvals.approve_sign")}
                    pending={act.isPending} onSign={(name) => act.mutate({ decision: "approve", signedAs: name })} />
      ) : null}
    </li>
  );
}

function currentUser(): { first_name?: string; last_name?: string; role?: string } {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

function currentUserName() {
  const u = currentUser();
  return `${u.first_name || ""} ${u.last_name || ""}`.trim();
}

const MANAGER_ROLES = ["SUPER_ADMIN", "OWNER", "ADMIN", "MANAGER"];

function NewRequest({ onCreated }: { onCreated: () => void }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ApprovalKind>("purchase");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const create = useMutation({
    mutationFn: () => api.createApproval({ kind, title, amount: MONEY.includes(kind) ? amount : "", notes }),
    onSuccess: (row) => {
      toast.success(row.status === "approved" ? t("approvals.toast_auto") : t("approvals.toast_sent", { name: row.assignedTo || "—" }));
      setOpen(false);
      setTitle("");
      setAmount("");
      setNotes("");
      onCreated();
    },
    onError: (e) => toast.error((e as Error).message),
  });
  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="me-1.5 h-4 w-4" aria-hidden />
        {t("approvals.new")}
      </Button>
    );
  }
  return (
    <form
      className="w-full space-y-3 rounded-xl border border-border bg-card p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim()) create.mutate();
      }}
    >
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t("approvals.kind")}>
        {REQUESTABLE.map((k) => {
          const Icon = KIND_ICON[k];
          return (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold",
                kind === k ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {t(`approvals.kinds.${k}`)}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("approvals.placeholder_title")}
               className="min-w-[220px] flex-1" aria-label={t("approvals.placeholder_title")} />
        {MONEY.includes(kind) ? (
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder={t("approvals.placeholder_amount")}
                 className="w-36" aria-label={t("approvals.placeholder_amount")} />
        ) : null}
      </div>
      <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("approvals.placeholder_reason")} rows={2} />
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{t("approvals.back")}</Button>
        <Button type="submit" disabled={!title.trim() || create.isPending}>
          {create.isPending ? <Loader2 className="me-1.5 h-4 w-4 animate-spin" /> : null}
          {t("approvals.submit")}
        </Button>
      </div>
    </form>
  );
}

/** Operations → Approvals: everything waiting for a yes, the same rows the approver gets on WhatsApp. */
export default function ApprovalsPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<Scope>("mine");
  const [view, setView] = useState<"approvals" | "signatures">(() =>
    new URLSearchParams(window.location.search).get("view") === "signatures" ? "signatures" : "approvals",
  );
  const canManage = MANAGER_ROLES.includes(String(currentUser().role || "").toUpperCase());
  const query = useQuery({
    queryKey: ["approvals", scope],
    queryFn: () => api.listApprovals(scope),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const counts = query.data?.counts;
  const rows = useMemo(() => query.data?.approvals ?? [], [query.data]);
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["approvals"] });
    void queryClient.invalidateQueries({ queryKey: ["nav-attention"] });
  };
  const tabs: { id: Scope; label: string; count?: number }[] = [
    { id: "mine", label: t("approvals.tab.mine"), count: counts?.mine },
    { id: "pending", label: t("approvals.tab.pending"), count: counts?.pending },
    { id: "requested", label: t("approvals.tab.requested"), count: counts?.requested },
    { id: "decided", label: t("approvals.tab.decided") },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">{t("approvals.title")}</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">{t("approvals.subtitle")}</p>
        </div>
        {view === "approvals" ? <NewRequest onCreated={refresh} /> : null}
      </header>

      <div className="inline-flex rounded-xl border border-border bg-muted/30 p-1" role="tablist" aria-label={t("approvals.view")}>
        {(["approvals", "signatures"] as const).map((v) => (
          <button key={v} type="button" role="tab" aria-selected={view === v}
                  onClick={() => {
                    setView(v);
                    const url = new URL(window.location.href);
                    if (v === "signatures") url.searchParams.set("view", v);
                    else url.searchParams.delete("view");
                    window.history.replaceState({}, "", url.toString());
                  }}
                  className={cn("inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold",
                    view === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {v === "signatures" ? <FileSignature className="h-4 w-4" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}
            {t(`approvals.view_${v}`)}
          </button>
        ))}
      </div>

      {view === "signatures" ? <SignaturesPanel canManage={canManage} /> : (
      <>

      <nav className="flex flex-wrap gap-1 rounded-xl border border-border bg-muted/30 p-1" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={scope === tab.id}
            onClick={() => setScope(tab.id)}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
              scope === tab.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {tab.count ? <span className="rounded-full bg-primary/15 px-1.5 text-[11px] text-primary tabular-nums">{tab.count}</span> : null}
          </button>
        ))}
      </nav>

      {query.isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : null}
      {query.isError ? <p className="text-sm text-destructive">{t("approvals.load_error")}</p> : null}
      {!query.isLoading && rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          {t(`approvals.empty.${scope}`)}
        </div>
      ) : null}
      <ul className="space-y-2.5">
        {rows.map((row) => (
          <ApprovalCard key={row.id} row={row} onChanged={refresh} />
        ))}
      </ul>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <MessageCircle className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
        {t("approvals.whatsapp_hint")}
      </p>
      </>
      )}
    </div>
  );
}
