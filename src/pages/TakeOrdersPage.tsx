import React, { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ClipboardList, ClipboardPlus, FileDown, FileSpreadsheet, Loader2, Pencil, Search, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { AuthContextType } from "@/contexts/AuthContext.types";
import { useLanguage } from "@/hooks/use-language";
import { api } from "@/lib/api";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type {
  StaffCapturedOrderFulfillmentStatus,
  StaffCapturedOrderPatchBody,
  StaffCapturedOrderRow,
} from "@/lib/types";
import { toast } from "sonner";
import {
  exportStaffCapturedOrdersExcel,
  exportStaffCapturedOrdersPdf,
  staffOrdersExportFileSlug,
} from "@/utils/staffCapturedOrdersExport";

const MANAGER_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "OWNER"] as const;

const FULFILLMENT_SEQUENCE: StaffCapturedOrderFulfillmentStatus[] = [
  "NEW",
  "IN_PROGRESS",
  "FULFILLED",
  "CANCELLED",
];

const STATUS_SORT_ORDER: Record<StaffCapturedOrderFulfillmentStatus, number> = {
  NEW: 0,
  IN_PROGRESS: 1,
  FULFILLED: 2,
  CANCELLED: 3,
};

type SortKey = "newest" | "oldest" | "status";

function fulfillmentBadgeClass(s: StaffCapturedOrderFulfillmentStatus): string {
  switch (s) {
    case "NEW":
      return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-100";
    case "IN_PROGRESS":
      return "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800/80 dark:bg-blue-950/40 dark:text-blue-100";
    case "FULFILLED":
      return "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800/80 dark:bg-emerald-950/40 dark:text-emerald-100";
    case "CANCELLED":
      return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200";
    default:
      return "";
  }
}

function channelLabelKey(ch: StaffCapturedOrderRow["channel"]): string {
  const map: Record<StaffCapturedOrderRow["channel"], string> = {
    VOICE: "take_orders.channel.voice",
    TEXT: "take_orders.channel.text",
    MANUAL: "take_orders.channel.manual",
  };
  return map[ch];
}

function orderTypeLabelKey(ot: StaffCapturedOrderRow["order_type"]): string {
  const map: Record<StaffCapturedOrderRow["order_type"], string> = {
    DINE_IN: "take_orders.type.dine_in",
    TAKEOUT: "take_orders.type.takeout",
    DELIVERY: "take_orders.type.delivery",
    OTHER: "take_orders.type.other",
  };
  return map[ot];
}

function channelBadgeClass(ch: StaffCapturedOrderRow["channel"]): string {
  switch (ch) {
    case "VOICE":
      return "border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-100";
    case "TEXT":
      return "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100";
    case "MANUAL":
      return "border-slate-200 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-200";
    default:
      return "";
  }
}

function statusBorderClass(s: StaffCapturedOrderFulfillmentStatus): string {
  switch (s) {
    case "NEW":
      return "border-l-amber-500";
    case "IN_PROGRESS":
      return "border-l-blue-500";
    case "FULFILLED":
      return "border-l-emerald-500";
    case "CANCELLED":
      return "border-l-slate-400 dark:border-l-slate-500";
    default:
      return "border-l-slate-300";
  }
}

function CapturedOrderRow({
  row,
  t,
  pendingId,
  onStatusChange,
  canManage,
  onEdit,
  onDelete,
}: {
  row: StaffCapturedOrderRow;
  t: (key: string) => string;
  pendingId: string | null;
  onStatusChange: (id: string, status: StaffCapturedOrderFulfillmentStatus) => void;
  canManage: boolean;
  onEdit: (row: StaffCapturedOrderRow) => void;
  onDelete: (row: StaffCapturedOrderRow) => void;
}) {
  const status = (row.fulfillment_status ?? "NEW") as StaffCapturedOrderFulfillmentStatus;
  const busy = pendingId === row.id;

  return (
    <li
      className={cn(
        "rounded-xl border border-slate-200/90 dark:border-slate-700/90 border-l-4 bg-white pl-4 pr-4 py-4 shadow-sm transition-shadow hover:shadow-md dark:bg-slate-900/60",
        statusBorderClass(status),
        status === "FULFILLED" && "bg-emerald-50/40 dark:bg-emerald-950/20",
        status === "CANCELLED" && "opacity-[0.92] bg-slate-50/80 dark:bg-slate-900/40",
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-[15px] font-semibold leading-snug text-slate-900 dark:text-white whitespace-pre-wrap">
            {row.items_summary}
          </p>
          <div className="grid gap-2 text-xs text-slate-600 dark:text-slate-400 sm:grid-cols-2 xl:grid-cols-3">
            {[row.customer_name && `${t("take_orders.field.customer")}: ${row.customer_name}`, row.customer_phone && `${t("take_orders.field.phone")}: ${row.customer_phone}`, row.table_or_location && `${t("take_orders.field.table")}: ${row.table_or_location}`]
              .filter(Boolean)
              .map((line) => (
                <div key={line as string} className="min-w-0 break-words">
                  {line}
                </div>
              ))}
            {row.dietary_notes ? (
              <div className="sm:col-span-2 xl:col-span-3">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{t("take_orders.field.dietary")}: </span>
                {row.dietary_notes}
              </div>
            ) : null}
            {row.special_instructions ? (
              <div className="sm:col-span-2 xl:col-span-3">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{t("take_orders.field.special")}: </span>
                {row.special_instructions}
              </div>
            ) : null}
            {row.recorded_by_name ? (
              <div className="text-slate-500 sm:col-span-2 xl:col-span-3 pt-0.5 border-t border-slate-100 dark:border-slate-800 mt-1">
                {t("take_orders.recorded_by")}: {row.recorded_by_name}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-slate-100 pt-3 dark:border-slate-800 lg:w-[min(100%,17rem)] lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-stretch">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 lg:w-full">
              {t("take_orders.status.label")}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={status}
                disabled={busy}
                onValueChange={(v) => onStatusChange(row.id, v as StaffCapturedOrderFulfillmentStatus)}
              >
                <SelectTrigger
                  className={cn(
                    "h-9 w-full min-w-[10rem] text-xs font-semibold border-2",
                    fulfillmentBadgeClass(status),
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FULFILLMENT_SEQUENCE.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {t(`take_orders.status.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {busy ? <Loader2 className="h-4 w-4 animate-spin text-emerald-600 shrink-0" /> : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <time className="font-mono text-xs text-slate-500 dark:text-slate-400" dateTime={row.created_at}>
              {new Date(row.created_at).toLocaleString()}
            </time>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-[10px] font-semibold">
              {t(orderTypeLabelKey(row.order_type))}
            </Badge>
            <Badge
              variant="outline"
              className={cn("text-[10px] font-semibold", channelBadgeClass(row.channel))}
              title={t(channelLabelKey(row.channel))}
            >
              {t(channelLabelKey(row.channel))}
            </Badge>
          </div>
          {canManage ? (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => onEdit(row)}
              >
                <Pencil className="h-3.5 w-3.5" />
                {t("take_orders.edit")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/40"
                onClick={() => onDelete(row)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t("take_orders.delete")}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export default function TakeOrdersPage() {
  const { accessToken, hasRole } = useAuth() as AuthContextType;
  const { t } = useLanguage();
  const qc = useQueryClient();
  const canAddManual = hasRole([...MANAGER_ROLES]);

  const [manualOpen, setManualOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffCapturedOrderRow | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | StaffCapturedOrderFulfillmentStatus>("all");
  const [filterType, setFilterType] = useState<"all" | StaffCapturedOrderRow["order_type"]>("all");
  const [filterChannel, setFilterChannel] = useState<"all" | StaffCapturedOrderRow["channel"]>("all");
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [exportDateFrom, setExportDateFrom] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [exportDateTo, setExportDateTo] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [exportBusy, setExportBusy] = useState<null | "pdf" | "xlsx">(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderType, setOrderType] = useState<StaffCapturedOrderRow["order_type"]>("DINE_IN");
  const [tableOrLocation, setTableOrLocation] = useState("");
  const [itemsSummary, setItemsSummary] = useState("");
  const [dietaryNotes, setDietaryNotes] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [editingChannel, setEditingChannel] = useState<StaffCapturedOrderRow["channel"]>("MANUAL");

  const resetForm = useCallback(() => {
    setEditingId(null);
    setEditingChannel("MANUAL");
    setCustomerName("");
    setCustomerPhone("");
    setOrderType("DINE_IN");
    setTableOrLocation("");
    setItemsSummary("");
    setDietaryNotes("");
    setSpecialInstructions("");
  }, []);

  const { data: todayRows, isLoading } = useQuery({
    queryKey: ["staff-captured-orders", "active", accessToken],
    queryFn: () => api.listStaffCapturedOrders({ active: true }),
    enabled: !!accessToken,
    staleTime: 20_000,
    refetchInterval: 30_000,
  });

  const list = useMemo(() => (Array.isArray(todayRows) ? todayRows : []), [todayRows]);

  const filteredSorted = useMemo(() => {
    let rows = [...list];
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => {
        const hay = [r.customer_name, r.customer_phone, r.table_or_location, r.items_summary, r.dietary_notes, r.special_instructions]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    if (filterStatus !== "all") {
      rows = rows.filter((r) => (r.fulfillment_status ?? "NEW") === filterStatus);
    }
    if (filterType !== "all") {
      rows = rows.filter((r) => r.order_type === filterType);
    }
    if (filterChannel !== "all") {
      rows = rows.filter((r) => r.channel === filterChannel);
    }
    rows.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      const sa = STATUS_SORT_ORDER[(a.fulfillment_status ?? "NEW") as StaffCapturedOrderFulfillmentStatus];
      const sb = STATUS_SORT_ORDER[(b.fulfillment_status ?? "NEW") as StaffCapturedOrderFulfillmentStatus];
      if (sa !== sb) return sa - sb;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return rows;
  }, [list, search, filterStatus, filterType, filterChannel, sortBy]);

  const hasActiveFilters =
    search.trim().length > 0 || filterStatus !== "all" || filterType !== "all" || filterChannel !== "all";

  const openCreate = useCallback(() => {
    resetForm();
    setManualOpen(true);
  }, [resetForm]);

  const openEdit = useCallback((row: StaffCapturedOrderRow) => {
    setEditingId(row.id);
    setEditingChannel(row.channel);
    setCustomerName(row.customer_name || "");
    setCustomerPhone(row.customer_phone || "");
    setOrderType(row.order_type);
    setTableOrLocation(row.table_or_location || "");
    setItemsSummary(row.items_summary || "");
    setDietaryNotes(row.dietary_notes || "");
    setSpecialInstructions(row.special_instructions || "");
    setManualOpen(true);
  }, []);

  const queueStats = useMemo(() => {
    const todayStr = new Date().toDateString();
    let totalToday = 0;
    let filled = 0;
    let cancelled = 0;
    for (const row of list) {
      const st = (row.fulfillment_status ?? "NEW") as StaffCapturedOrderFulfillmentStatus;
      if (st === "FULFILLED") filled += 1;
      if (st === "CANCELLED") cancelled += 1;
      if (new Date(row.created_at).toDateString() === todayStr) totalToday += 1;
    }
    return { totalToday, filled, cancelled };
  }, [list]);

  const exportHeaders = useMemo(
    () => [
      t("take_orders.export_col_time"),
      t("take_orders.export_col_items"),
      t("take_orders.export_col_customer"),
      t("take_orders.export_col_phone"),
      t("take_orders.export_col_table"),
      t("take_orders.export_col_dietary"),
      t("take_orders.export_col_special"),
      t("take_orders.export_col_channel"),
      t("take_orders.export_col_type"),
      t("take_orders.export_col_status"),
      t("take_orders.export_col_recorded"),
    ],
    [t],
  );

  const exportRowValues = useCallback(
    (row: StaffCapturedOrderRow) => {
      const st = (row.fulfillment_status ?? "NEW") as StaffCapturedOrderFulfillmentStatus;
      const time = new Date(row.created_at).toLocaleString();
      const items = (row.items_summary || "").replace(/\r?\n/g, " ");
      return [
        time,
        items,
        row.customer_name || "—",
        row.customer_phone || "—",
        row.table_or_location || "—",
        row.dietary_notes || "—",
        row.special_instructions || "—",
        t(channelLabelKey(row.channel)),
        t(orderTypeLabelKey(row.order_type)),
        t(`take_orders.status.${st}`),
        row.recorded_by_name || "—",
      ];
    },
    [t],
  );

  const runExport = useCallback(
    async (kind: "pdf" | "xlsx") => {
      if (!accessToken) {
        toast.error(t("take_orders.export_failed"));
        return;
      }
      if (exportDateFrom > exportDateTo) {
        toast.error(t("take_orders.export_invalid_range"));
        return;
      }
      const fileSlug = staffOrdersExportFileSlug(exportDateFrom, exportDateTo);
      const rangeSubtitle =
        exportDateFrom === exportDateTo ? exportDateFrom : `${exportDateFrom} — ${exportDateTo}`;
      setExportBusy(kind);
      try {
        const rows = await api.listStaffCapturedOrders({ dateFrom: exportDateFrom, dateTo: exportDateTo });
        if (!rows.length) {
          toast.info(t("take_orders.export_empty"));
          return;
        }
        const title = t("take_orders.export_title");
        if (kind === "pdf") {
          await exportStaffCapturedOrdersPdf(rows, rangeSubtitle, fileSlug, title, exportHeaders, exportRowValues);
        } else {
          await exportStaffCapturedOrdersExcel(
            rows,
            rangeSubtitle,
            fileSlug,
            title,
            t("take_orders.export_sheet"),
            exportHeaders,
            exportRowValues,
          );
        }
        toast.success(t("take_orders.export_done"));
      } catch {
        toast.error(t("take_orders.export_failed"));
      } finally {
        setExportBusy(null);
      }
    },
    [accessToken, exportDateFrom, exportDateTo, exportHeaders, exportRowValues, t],
  );

  const statusMutation = useMutation({
    mutationFn: ({ id, fulfillment_status }: { id: string; fulfillment_status: StaffCapturedOrderFulfillmentStatus }) =>
      api.patchStaffCapturedOrder(id, { fulfillment_status }),
    onMutate: (vars) => setPendingStatusId(vars.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-captured-orders"] });
      toast.success(t("take_orders.status_updated"));
    },
    onError: (e: Error) => toast.error(e.message || t("take_orders.save_failed")),
    onSettled: () => setPendingStatusId(null),
  });

  const onStatusChange = useCallback(
    (id: string, fulfillment_status: StaffCapturedOrderFulfillmentStatus) => {
      statusMutation.mutate({ id, fulfillment_status });
    },
    [statusMutation],
  );

  const mutation = useMutation({
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
      resetForm();
      setManualOpen(false);
    },
    onError: (e: Error) => toast.error(e.message || t("take_orders.save_failed")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: StaffCapturedOrderPatchBody }) => api.patchStaffCapturedOrder(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-captured-orders"] });
      toast.success(t("take_orders.updated"));
      resetForm();
      setManualOpen(false);
    },
    onError: (e: Error) => toast.error(e.message || t("take_orders.save_failed")),
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

  const onSubmitManual = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!itemsSummary.trim()) {
        toast.error(t("take_orders.items_required"));
        return;
      }
      if (editingId) {
        const body: StaffCapturedOrderPatchBody = {
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          order_type: orderType,
          table_or_location: tableOrLocation.trim(),
          items_summary: itemsSummary.trim(),
          dietary_notes: dietaryNotes.trim(),
          special_instructions: specialInstructions.trim(),
          channel: editingChannel,
        };
        updateMutation.mutate({ id: editingId, body });
        return;
      }
      mutation.mutate();
    },
    [
      itemsSummary,
      editingId,
      customerName,
      customerPhone,
      orderType,
      tableOrLocation,
      dietaryNotes,
      specialInstructions,
      editingChannel,
      mutation,
      updateMutation,
      t,
    ],
  );

  return (
    <div className="min-h-[60vh] bg-gradient-to-b from-slate-100/80 via-slate-50 to-white dark:from-[#0a0d12] dark:via-[#0f1419] dark:to-slate-950 pb-16">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        <header className="mb-6 lg:mb-8">
          <div className="grid grid-cols-1 gap-3 sm:gap-2 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                {t("take_orders.log_title")}
              </h1>
            </div>

            <div className="flex min-w-0 justify-center">
            {!isLoading && list.length > 0 ? (
              <div className="flex w-full min-w-0 flex-wrap items-center justify-center gap-1.5 rounded-lg border border-slate-200/90 bg-white/90 px-2 py-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 lg:max-w-xl lg:px-2.5 lg:py-2 xl:max-w-2xl">
                <div className="relative min-w-[140px] max-w-[220px] flex-1">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("take_orders.search_placeholder")}
                    className="h-8 rounded-md border-slate-200 bg-white py-0 pl-8 pr-2 text-xs dark:border-slate-600 dark:bg-slate-900/50"
                    aria-label={t("take_orders.search_placeholder")}
                  />
                </div>
                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
                  <SelectTrigger
                    className="h-8 w-[min(100%,7.5rem)] rounded-md text-[11px] lg:w-[7.25rem]"
                    aria-label={t("take_orders.filter_status")}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("take_orders.filter_all")}</SelectItem>
                    {FULFILLMENT_SEQUENCE.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`take_orders.status.${s}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
                  <SelectTrigger
                    className="h-8 w-[min(100%,7.5rem)] rounded-md text-[11px] lg:w-[7.25rem]"
                    aria-label={t("take_orders.filter_type")}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("take_orders.filter_all")}</SelectItem>
                    <SelectItem value="DINE_IN">{t("take_orders.type.dine_in")}</SelectItem>
                    <SelectItem value="TAKEOUT">{t("take_orders.type.takeout")}</SelectItem>
                    <SelectItem value="DELIVERY">{t("take_orders.type.delivery")}</SelectItem>
                    <SelectItem value="OTHER">{t("take_orders.type.other")}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterChannel} onValueChange={(v) => setFilterChannel(v as typeof filterChannel)}>
                  <SelectTrigger
                    className="h-8 w-[min(100%,7.5rem)] rounded-md text-[11px] lg:w-[7.25rem]"
                    aria-label={t("take_orders.filter_channel")}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("take_orders.filter_all")}</SelectItem>
                    <SelectItem value="MANUAL">{t("take_orders.channel.manual")}</SelectItem>
                    <SelectItem value="VOICE">{t("take_orders.channel.voice")}</SelectItem>
                    <SelectItem value="TEXT">{t("take_orders.channel.text")}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
                  <SelectTrigger
                    className="h-8 w-[min(100%,8.5rem)] rounded-md text-[11px] lg:w-[8.25rem]"
                    aria-label={t("take_orders.sort_label")}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">{t("take_orders.sort_newest")}</SelectItem>
                    <SelectItem value="oldest">{t("take_orders.sort_oldest")}</SelectItem>
                    <SelectItem value="status">{t("take_orders.sort_status")}</SelectItem>
                  </SelectContent>
                </Select>
                {hasActiveFilters ? (
                  <span className="whitespace-nowrap px-1 text-[10px] text-slate-500 dark:text-slate-400">
                    {t("take_orders.showing_filtered", { visible: filteredSorted.length, total: list.length })}
                  </span>
                ) : null}
              </div>
            ) : null}
            </div>

            <div className="flex shrink-0 justify-start lg:justify-end">
              {canAddManual && (
                <Button
                  type="button"
                  size="sm"
                  className="h-10 gap-2 rounded-lg bg-emerald-600 px-4 font-semibold text-white shadow-sm hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                  onClick={openCreate}
                >
                  <ClipboardPlus className="h-4 w-4" />
                  {t("take_orders.add_manual")}
                </Button>
              )}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 xl:gap-8">
          <div className="min-w-0 xl:col-span-9">
            <Card className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
              <div className="flex flex-col gap-1 border-b border-slate-100 bg-slate-50/90 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/80 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t("take_orders.list_heading")}</h2>
                <Badge variant="secondary" className="w-fit text-xs font-bold tabular-nums">
                  {isLoading ? "…" : `${filteredSorted.length}`}
                </Badge>
              </div>
              <CardContent className="p-4 sm:p-6">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600/80" />
                    <span className="text-sm font-medium">{t("take_orders.loading")}</span>
                  </div>
                ) : list.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-16 dark:border-slate-700 dark:bg-slate-900/40">
                    <ClipboardList className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                    <p className="max-w-md text-center text-sm text-slate-500 dark:text-slate-400">{t("take_orders.empty")}</p>
                  </div>
                ) : filteredSorted.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-14 dark:border-slate-700 dark:bg-slate-900/40">
                    <p className="text-sm text-slate-600 dark:text-slate-400">{t("take_orders.no_matches")}</p>
                    <Button type="button" variant="outline" size="sm" onClick={() => { setSearch(""); setFilterStatus("all"); setFilterType("all"); setFilterChannel("all"); }}>
                      {t("take_orders.clear_filters")}
                    </Button>
                  </div>
                ) : (
                  <ul className="grid gap-3 sm:gap-4">
                    {filteredSorted.map((row) => (
                      <CapturedOrderRow
                        key={row.id}
                        row={row}
                        t={t}
                        pendingId={pendingStatusId}
                        onStatusChange={onStatusChange}
                        canManage={canAddManual}
                        onEdit={openEdit}
                        onDelete={setDeleteTarget}
                      />
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-4 xl:col-span-3 xl:min-w-0">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1 xl:gap-3">
              <div className="rounded-xl border border-slate-200/90 bg-white/90 px-3 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 sm:px-4 sm:py-4">
                <p className="text-xs font-medium leading-snug text-slate-600 dark:text-slate-400">{t("take_orders.stat_total_today")}</p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{isLoading ? "…" : queueStats.totalToday}</p>
              </div>
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 px-3 py-3 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/25 sm:px-4 sm:py-4">
                <p className="text-xs font-medium leading-snug text-emerald-900/90 dark:text-emerald-200/95">{t("take_orders.stat_filled")}</p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-950 dark:text-emerald-100">{isLoading ? "…" : queueStats.filled}</p>
              </div>
              <div className="rounded-xl border border-rose-200/80 bg-rose-50/50 px-3 py-3 shadow-sm dark:border-rose-900/50 dark:bg-rose-950/25 sm:px-4 sm:py-4">
                <p className="text-xs font-medium leading-snug text-rose-900/90 dark:text-rose-200/95">{t("take_orders.stat_cancelled")}</p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-rose-950 dark:text-rose-100">{isLoading ? "…" : queueStats.cancelled}</p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200/90 bg-white/90 px-2 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t("take_orders.export_section_title")}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <div className="space-y-0.5">
                  <Label htmlFor="export-date-from" className="text-[10px] text-slate-500 dark:text-slate-500">
                    {t("take_orders.export_date_from")}
                  </Label>
                  <Input
                    id="export-date-from"
                    type="date"
                    value={exportDateFrom}
                    onChange={(e) => setExportDateFrom(e.target.value)}
                    className="h-7 rounded-md border-slate-200 bg-white px-1.5 text-[11px] dark:border-slate-700 dark:bg-slate-900/50"
                  />
                </div>
                <div className="space-y-0.5">
                  <Label htmlFor="export-date-to" className="text-[10px] text-slate-500 dark:text-slate-500">
                    {t("take_orders.export_date_to")}
                  </Label>
                  <Input
                    id="export-date-to"
                    type="date"
                    value={exportDateTo}
                    onChange={(e) => setExportDateTo(e.target.value)}
                    className="h-7 rounded-md border-slate-200 bg-white px-1.5 text-[11px] dark:border-slate-700 dark:bg-slate-900/50"
                  />
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="h-7 justify-center gap-1 rounded-md bg-emerald-600 px-2 text-[11px] text-white hover:bg-emerald-700"
                  disabled={!!exportBusy}
                  onClick={() => runExport("pdf")}
                >
                  {exportBusy === "pdf" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                  {t("take_orders.export_btn_pdf")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 justify-center gap-1 rounded-md px-2 text-[11px]"
                  disabled={!!exportBusy}
                  onClick={() => runExport("xlsx")}
                >
                  {exportBusy === "xlsx" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
                  {t("take_orders.export_btn_excel")}
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <Dialog
        open={manualOpen}
        onOpenChange={(open) => {
          setManualOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="gap-0 max-h-[min(90vh,720px)] w-[calc(100vw-1.5rem)] max-w-xl overflow-y-auto rounded-2xl border border-slate-200/90 bg-white p-0 shadow-2xl dark:border-slate-700 dark:bg-slate-950 sm:max-w-xl">
          <form onSubmit={onSubmitManual} className="flex flex-col">
            <DialogHeader className="sr-only">
              <DialogTitle>{editingId ? t("take_orders.edit_title") : t("take_orders.manual_dialog_title")}</DialogTitle>
            </DialogHeader>

            <div className="space-y-6 px-5 py-6 sm:px-8">
              <div className="space-y-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-500">
                  {t("take_orders.manual_section_guest")}
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="manual-cust-name" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {t("take_orders.field.customer")}
                    </Label>
                    <Input
                      id="manual-cust-name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder={t("take_orders.placeholder.customer")}
                      className="h-10 rounded-lg border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manual-cust-phone" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {t("take_orders.field.phone")}
                    </Label>
                    <Input
                      id="manual-cust-phone"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder={t("take_orders.placeholder.phone")}
                      className="h-10 rounded-lg border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/50"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">{t("take_orders.field.order_type")}</Label>
                    <Select value={orderType} onValueChange={(v) => setOrderType(v as StaffCapturedOrderRow["order_type"])}>
                      <SelectTrigger className="h-10 rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-900/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DINE_IN">{t("take_orders.type.dine_in")}</SelectItem>
                        <SelectItem value="TAKEOUT">{t("take_orders.type.takeout")}</SelectItem>
                        <SelectItem value="DELIVERY">{t("take_orders.type.delivery")}</SelectItem>
                        <SelectItem value="OTHER">{t("take_orders.type.other")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manual-table" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {t("take_orders.field.table")}
                    </Label>
                    <Input
                      id="manual-table"
                      value={tableOrLocation}
                      onChange={(e) => setTableOrLocation(e.target.value)}
                      placeholder={t("take_orders.placeholder.table")}
                      className="h-10 rounded-lg border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/50"
                    />
                  </div>
                </div>
              </div>

              <Separator className="bg-slate-200/80 dark:bg-slate-800" />

              <div className="space-y-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-500">
                  {t("take_orders.manual_section_order")}
                </p>
                <div className="space-y-2">
                  <Label htmlFor="manual-items" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {t("take_orders.field.items")}
                    <span className="ml-0.5 text-destructive" aria-hidden>
                      *
                    </span>
                  </Label>
                  <Textarea
                    id="manual-items"
                    required
                    rows={4}
                    value={itemsSummary}
                    onChange={(e) => setItemsSummary(e.target.value)}
                    placeholder={t("take_orders.placeholder.items")}
                    className="min-h-[6.5rem] resize-y rounded-lg border-slate-200 font-normal leading-relaxed dark:border-slate-700 dark:bg-slate-900/50"
                  />
                </div>
              </div>

              <Separator className="bg-slate-200/80 dark:bg-slate-800" />

              <div className="space-y-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-500">
                  {t("take_orders.manual_section_notes")}
                </p>
                <div className="space-y-2">
                  <Label htmlFor="manual-diet" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {t("take_orders.field.dietary")}
                  </Label>
                  <Textarea
                    id="manual-diet"
                    rows={2}
                    value={dietaryNotes}
                    onChange={(e) => setDietaryNotes(e.target.value)}
                    placeholder={t("take_orders.placeholder.dietary")}
                    className="rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-900/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manual-spec" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {t("take_orders.field.special")}
                  </Label>
                  <Textarea
                    id="manual-spec"
                    rows={2}
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder={t("take_orders.placeholder.special")}
                    className="rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-900/50"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 border-t border-slate-100 bg-slate-50/90 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/60 sm:gap-3 sm:px-8 sm:py-5">
              <Button type="button" variant="outline" className="rounded-lg" onClick={() => setManualOpen(false)}>
                {t("take_orders.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending || updateMutation.isPending}
                className="min-w-[7.5rem] gap-2 rounded-lg font-semibold shadow-sm"
              >
                {mutation.isPending || updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editingId ? t("take_orders.save_changes") : t("take_orders.submit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("take_orders.delete_confirm_title")}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("take_orders.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("take_orders.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
