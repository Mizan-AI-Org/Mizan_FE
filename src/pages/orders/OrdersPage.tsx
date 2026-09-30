import React, { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ClipboardList,
  ClipboardPlus,
  Loader2,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MizanPageShell } from "@/components/os/MizanPageShell";
import { MIZAN_GRID_GAP, MIZAN_SURFACE_CARD, MIZAN_TOOLBAR } from "@/lib/mizan-ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import type { AuthContextType } from "@/contexts/AuthContext.types";
import { useLanguage } from "@/hooks/use-language";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type {
  StaffCapturedOrderFulfillmentStatus,
  StaffCapturedOrderRow,
} from "@/lib/types";
import { toast } from "sonner";

const MANAGER_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "OWNER"] as const;

const QUEUE_COLUMNS: StaffCapturedOrderFulfillmentStatus[] = [
  "NEW",
  "IN_PROGRESS",
  "READY",
  "FULFILLED",
];

type SourceFilter = "all" | "agent" | "manual";
type ChannelFilter = "all" | string;

function normalizeStatus(raw?: string | null): StaffCapturedOrderFulfillmentStatus {
  const s = (raw || "NEW").toUpperCase();
  if (s === "COMPLETED" || s === "DONE") return "FULFILLED";
  if (QUEUE_COLUMNS.includes(s as StaffCapturedOrderFulfillmentStatus) || s === "CANCELLED") {
    return s as StaffCapturedOrderFulfillmentStatus;
  }
  return "NEW";
}

function channelLabel(ch: string, t: (k: string) => string): string {
  const key = `take_orders.channel.${ch.toLowerCase()}`;
  const translated = t(key);
  return translated === key ? ch : translated;
}

function statusLabel(st: StaffCapturedOrderFulfillmentStatus, t: (k: string) => string): string {
  return t(`take_orders.status.${st}`);
}

function statusAccent(st: StaffCapturedOrderFulfillmentStatus): string {
  switch (st) {
    case "NEW":
      return "border-l-amber-500";
    case "IN_PROGRESS":
      return "border-l-sky-500";
    case "READY":
      return "border-l-violet-500";
    case "FULFILLED":
      return "border-l-emerald-500";
    case "CANCELLED":
      return "border-l-slate-500";
    default:
      return "border-l-border";
  }
}

function isAgentTaken(row: StaffCapturedOrderRow): boolean {
  const src = (row.capture_source || "").toUpperCase();
  if (src === "AGENT") return true;
  const ch = (row.channel || "").toUpperCase();
  return ["AGENT", "WHATSAPP", "WHATSAPP_VOICE", "WEB", "VOICE", "TEXT"].includes(ch);
}

function friendlyRole(role?: string | null): string {
  const r = (role || "").trim().toUpperCase();
  if (!r) return "";
  if (r === "SUPER_ADMIN" || r === "ADMIN" || r === "OWNER") return "";
  if (r === "MANAGER" || r === "SUPERVISOR") return "";
  // Show floor roles only when useful (waiter, chef, …)
  return r
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function OrderCard({
  row,
  t,
  canManage,
  pendingId,
  onStatus,
  onDelete,
}: {
  row: StaffCapturedOrderRow;
  t: (k: string) => string;
  canManage: boolean;
  pendingId: string | null;
  onStatus: (id: string, status: StaffCapturedOrderFulfillmentStatus) => void;
  onDelete: (row: StaffCapturedOrderRow) => void;
}) {
  const status = normalizeStatus(row.fulfillment_status);
  const busy = pendingId === row.id;
  const viaMiya = isAgentTaken(row);
  const taker = (row.recorded_by_name || "").trim() || t("take_orders.provenance.someone");
  const channel = channelLabel(String(row.channel || "MANUAL"), t);
  const role = friendlyRole(row.taken_by_role);
  const time = format(new Date(row.created_at), "HH:mm");
  const guestBits = [row.customer_name, row.table_or_location, row.customer_phone]
    .map((s) => (s || "").trim())
    .filter(Boolean);

  return (
    <article
      className={cn(
        "group relative rounded-lg border border-border/60 bg-card",
        "border-l-4 pl-3 pr-3 pt-3 pb-2.5",
        statusAccent(status),
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-[13px] font-medium leading-snug text-foreground whitespace-pre-wrap">
            {row.items_summary || "—"}
          </p>

          {guestBits.length > 0 ? (
            <p className="truncate text-xs text-muted-foreground">{guestBits.join(" · ")}</p>
          ) : null}

          {(row.dietary_notes || row.special_instructions) && (
            <p className="text-xs leading-relaxed text-muted-foreground/90">
              {[row.dietary_notes, row.special_instructions].filter(Boolean).join(" · ")}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-muted-foreground">
            {viaMiya ? (
              <span className="inline-flex items-center gap-1 text-primary/90">
                <Sparkles className="h-3 w-3" aria-hidden />
                Miya
              </span>
            ) : (
              <span>{t("take_orders.provenance.manual")}</span>
            )}
            <span className="text-border">·</span>
            <span className="truncate">
              {taker}
              {role ? ` · ${role}` : ""}
            </span>
            <span className="text-border">·</span>
            <span>{channel}</span>
            <span className="text-border">·</span>
            <span className="tabular-nums">{time}</span>
            {row.requires_manager_validation && !row.manager_validated ? (
              <>
                <span className="text-border">·</span>
                <span className="text-amber-600 dark:text-amber-400">
                  {t("take_orders.validation.needs")}
                </span>
              </>
            ) : null}
          </div>
        </div>

        {canManage ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
            onClick={() => onDelete(row)}
            aria-label={t("take_orders.delete")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>

      <div className="mt-2.5 flex items-center gap-2 border-t border-border/50 pt-2">
        <Select
          value={status}
          disabled={busy || !canManage}
          onValueChange={(v) => onStatus(row.id, v as StaffCapturedOrderFulfillmentStatus)}
        >
          <SelectTrigger className="h-8 flex-1 border-border/70 bg-background/50 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[...QUEUE_COLUMNS, "CANCELLED" as const].map((s) => (
              <SelectItem key={s} value={s} className="text-xs">
                {statusLabel(s, t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {busy ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" /> : null}
      </div>
    </article>
  );
}

export default function OrdersPage() {
  const { t } = useLanguage();
  const { accessToken, user } = useAuth() as AuthContextType;
  const qc = useQueryClient();
  const canManage = MANAGER_ROLES.includes(
    (user?.role || "").toUpperCase() as (typeof MANAGER_ROLES)[number],
  );

  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffCapturedOrderRow | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderType, setOrderType] = useState<StaffCapturedOrderRow["order_type"]>("TAKEOUT");
  const [tableOrLocation, setTableOrLocation] = useState("");
  const [itemsSummary, setItemsSummary] = useState("");
  const [dietaryNotes, setDietaryNotes] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");

  const { data: todayRows = [], isLoading } = useQuery({
    queryKey: ["staff-captured-orders", "active"],
    queryFn: () => api.listStaffCapturedOrders({ active: true }),
    enabled: Boolean(accessToken),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const list = useMemo(
    () => (Array.isArray(todayRows) ? todayRows : []).map((r) => ({
      ...r,
      fulfillment_status: normalizeStatus(r.fulfillment_status),
    })),
    [todayRows],
  );

  const filtered = useMemo(() => {
    let rows = [...list];
    if (sourceFilter === "agent") rows = rows.filter(isAgentTaken);
    if (sourceFilter === "manual") rows = rows.filter((r) => !isAgentTaken(r));
    if (channelFilter !== "all") {
      rows = rows.filter((r) => String(r.channel || "").toUpperCase() === channelFilter.toUpperCase());
    }
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) =>
        [r.customer_name, r.customer_phone, r.items_summary, r.table_or_location, r.recorded_by_name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }
    return rows;
  }, [list, search, sourceFilter, channelFilter]);

  const byColumn = useMemo(() => {
    const map: Record<string, StaffCapturedOrderRow[]> = {
      NEW: [],
      IN_PROGRESS: [],
      READY: [],
      FULFILLED: [],
      CANCELLED: [],
    };
    for (const row of filtered) {
      const st = normalizeStatus(row.fulfillment_status);
      (map[st] || map.NEW).push(row);
    }
    return map;
  }, [filtered]);

  const stats = useMemo(() => {
    const agent = list.filter(isAgentTaken).length;
    const manual = list.length - agent;
    const awaiting = list.filter((r) => r.requires_manager_validation && !r.manager_validated).length;
    return { total: list.length, agent, manual, awaiting };
  }, [list]);

  const channelsInUse = useMemo(() => {
    const set = new Set<string>();
    for (const r of list) {
      if (r.channel) set.add(String(r.channel).toUpperCase());
    }
    return Array.from(set).sort();
  }, [list]);

  const statusMutation = useMutation({
    mutationFn: ({
      id,
      fulfillment_status,
    }: {
      id: string;
      fulfillment_status: StaffCapturedOrderFulfillmentStatus;
    }) => api.patchStaffCapturedOrder(id, { fulfillment_status }),
    onMutate: (vars) => setPendingStatusId(vars.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-captured-orders"] });
      toast.success(t("take_orders.status_updated"));
    },
    onError: (e: Error) => toast.error(e.message || t("take_orders.save_failed")),
    onSettled: () => setPendingStatusId(null),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteStaffCapturedOrder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-captured-orders"] });
      toast.success(t("take_orders.deleted"));
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message || t("take_orders.save_failed")),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.createStaffCapturedOrder({
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        order_type: orderType,
        table_or_location: tableOrLocation.trim(),
        items_summary: itemsSummary.trim(),
        dietary_notes: dietaryNotes.trim(),
        special_instructions: specialInstructions.trim(),
        channel: "MANUAL",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-captured-orders"] });
      toast.success(t("take_orders.saved"));
      setManualOpen(false);
      setCustomerName("");
      setCustomerPhone("");
      setTableOrLocation("");
      setItemsSummary("");
      setDietaryNotes("");
      setSpecialInstructions("");
    },
    onError: (e: Error) => toast.error(e.message || t("take_orders.save_failed")),
  });

  const onStatus = useCallback(
    (id: string, fulfillment_status: StaffCapturedOrderFulfillmentStatus) => {
      statusMutation.mutate({ id, fulfillment_status });
    },
    [statusMutation],
  );

  return (
    <MizanPageShell
      title={t("take_orders.log_title")}
      description={t("take_orders.page_hint_agent")}
      hero={false}
      actions={
        canManage ? (
          <Button type="button" onClick={() => setManualOpen(true)} className="gap-1.5">
            <ClipboardPlus className="h-4 w-4" />
            {t("take_orders.add_manual")}
          </Button>
        ) : null
      }
    >
      <div className={cn("grid grid-cols-2 md:grid-cols-4", MIZAN_GRID_GAP)}>
        {[
          { label: t("take_orders.stats.total"), value: stats.total },
          { label: t("take_orders.stats.via_miya"), value: stats.agent, icon: Sparkles },
          { label: t("take_orders.stats.manual"), value: stats.manual },
          { label: t("take_orders.stats.awaiting"), value: stats.awaiting },
        ].map((s) => (
          <div key={s.label} className={cn(MIZAN_SURFACE_CARD, "p-3")}>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <div className={cn(MIZAN_TOOLBAR, "mt-4 flex flex-wrap items-center gap-2")}>
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("take_orders.search_placeholder")}
            className="h-9 pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", t("take_orders.filter.source_all")],
              ["agent", t("take_orders.filter.source_miya")],
              ["manual", t("take_orders.filter.source_manual")],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              type="button"
              size="sm"
              variant={sourceFilter === id ? "default" : "outline"}
              className="h-8"
              onClick={() => setSourceFilter(id)}
            >
              {id === "agent" ? <Sparkles className="mr-1 h-3 w-3" /> : null}
              {label}
            </Button>
          ))}
        </div>
        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue placeholder={t("take_orders.filter.channel")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("take_orders.filter.channel_all")}</SelectItem>
            {channelsInUse.map((ch) => (
              <SelectItem key={ch} value={ch}>
                {channelLabel(ch, t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="mt-10 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className={cn(MIZAN_SURFACE_CARD, "mt-6 flex flex-col items-center gap-3 p-10 text-center")}>
          <ClipboardList className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("take_orders.empty_agent")}</p>
          <p className="max-w-md text-xs text-muted-foreground">{t("take_orders.empty_agent_hint")}</p>
        </div>
      ) : (
        <div className={cn("mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4", MIZAN_GRID_GAP)}>
          {QUEUE_COLUMNS.map((col) => (
            <section key={col} className="min-w-0">
              <header className="mb-2 flex items-center justify-between px-0.5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {statusLabel(col, t)}
                </h3>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {(byColumn[col] || []).length}
                </span>
              </header>
              <div className="flex flex-col gap-2">
                {(byColumn[col] || []).map((row) => (
                  <OrderCard
                    key={row.id}
                    row={row}
                    t={t}
                    canManage={canManage}
                    pendingId={pendingStatusId}
                    onStatus={onStatus}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("take_orders.add_manual")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label>{t("take_orders.field.items")}</Label>
              <Textarea value={itemsSummary} onChange={(e) => setItemsSummary(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>{t("take_orders.field.customer")}</Label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("take_orders.field.phone")}</Label>
                <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>{t("take_orders.field.type")}</Label>
                <Select
                  value={orderType}
                  onValueChange={(v) => setOrderType(v as StaffCapturedOrderRow["order_type"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["DINE_IN", "TAKEOUT", "DELIVERY", "OTHER"] as const).map((ot) => (
                      <SelectItem key={ot} value={ot}>
                        {t(`take_orders.type.${ot === "DINE_IN" ? "dine_in" : ot.toLowerCase()}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>{t("take_orders.field.table")}</Label>
                <Input value={tableOrLocation} onChange={(e) => setTableOrLocation(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>{t("take_orders.field.dietary")}</Label>
              <Input value={dietaryNotes} onChange={(e) => setDietaryNotes(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>{t("take_orders.field.special")}</Label>
              <Input value={specialInstructions} onChange={(e) => setSpecialInstructions(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setManualOpen(false)}>
              {t("take_orders.cancel")}
            </Button>
            <Button
              type="button"
              disabled={!itemsSummary.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("take_orders.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("take_orders.delete_confirm_title")}</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground">{t("take_orders.delete_confirm_body")}</p>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("take_orders.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("take_orders.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MizanPageShell>
  );
}
