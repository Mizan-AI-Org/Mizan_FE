"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { ClipboardList, FileText, Loader2, PackageCheck, Repeat, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { API_BASE, api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MizanPageShell } from "@/components/os/MizanPageShell";
import { HUB_TABS_TRIGGER } from "@/lib/mizan-ui";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";

type HubTab = "needs" | "reorder" | "orders" | "receiving" | "invoices";

type ProcurementLine = {
  id: string;
  itemName: string;
  quantityOrdered: number;
  quantityReceived: number;
  unit: string;
};

type ProcurementOrder = {
  id: string;
  status: string;
  supplierName?: string | null;
  subtotal: number;
  currency: string;
  invoiceId?: string | null;
  lines: ProcurementLine[];
  notes?: string;
};

type NeedsPayload = {
  recommendations: Array<{
    id: string;
    name: string;
    suggestedQuantity: number;
    unit: string;
    reason: string;
  }>;
  staffRequests: Array<{ id: string; subject: string; description?: string; status: string }>;
  orders?: ProcurementOrder[];
};

async function load(path: string, token: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "Request failed");
  return body.data ?? body;
}

async function post(path: string, token: string, payload: Record<string, unknown> = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "Request failed");
  return body.data ?? body;
}

function tabFromParam(value: string | null): HubTab {
  if (value === "reorder" || value === "orders" || value === "receiving" || value === "invoices") return value;
  return "needs";
}

const RECEIVING_STATUSES = new Set(["approved", "sent", "partial_received"]);
// An invoice is matched against what was received, so only delivered orders can take one.
const INVOICE_STATUSES = new Set(["partial_received", "received", "pending_invoice_match", "pending_payment", "closed"]);
const CAN_ATTACH_INVOICE = new Set(["partial_received", "received", "pending_invoice_match"]);

export default function ProcurementHubPage() {
  const { t } = useLanguage();
  const { accessToken } = useAuth() as { accessToken: string };
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<HubTab>(() => tabFromParam(searchParams.get("tab")));
  const focusOrderId = searchParams.get("order") || "";

  useEffect(() => {
    setActiveTab(tabFromParam(searchParams.get("tab")));
  }, [searchParams]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["procurement-needs", accessToken],
    queryFn: () => load("/procurement/needs/", accessToken),
    enabled: !!accessToken,
  });

  const needs = (data || {}) as NeedsPayload;
  const orders = (needs.orders || []) as ProcurementOrder[];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["procurement-needs"] });
    queryClient.invalidateQueries({ queryKey: ["purchasing"] });
    queryClient.invalidateQueries({ queryKey: ["procurement-reorder"] });
    queryClient.invalidateQueries({ queryKey: ["inventory-summary"] });
  };
  const fail = (e: unknown) => toast.error((e as Error).message || t("procurement.action_failed"));

  const createFromRec = useMutation({
    mutationFn: (row: { id: string; suggestedQuantity: number; reason: string }) =>
      post("/procurement/orders/", accessToken, {
        lines: [{ itemId: row.id, quantity: row.suggestedQuantity, notes: row.reason }],
        source: "alert",
      }),
    onSuccess: invalidate,
    onError: fail,
  });

  const convertRequest = useMutation({
    mutationFn: (staffRequestId: string) =>
      post(`/procurement/staff-requests/${staffRequestId}/convert/`, accessToken, {}),
    onSuccess: invalidate,
    onError: fail,
  });

  const submitOrder = useMutation({
    mutationFn: (orderId: string) => post(`/procurement/orders/${orderId}/submit/`, accessToken, {}),
    onSuccess: invalidate,
    onError: fail,
  });

  const sendOrder = useMutation({
    mutationFn: (orderId: string) => post(`/procurement/orders/${orderId}/send/`, accessToken, {}),
    onSuccess: invalidate,
    onError: fail,
  });

  const receiveOrder = useMutation({
    mutationFn: (order: ProcurementOrder) =>
      post(`/procurement/orders/${order.id}/receive/`, accessToken, {
        lines: order.lines.map((ln) => ({
          lineId: ln.id,
          quantityReceived: Math.max(0, ln.quantityOrdered - ln.quantityReceived),
        })),
      }),
    onSuccess: invalidate,
    onError: fail,
  });

  const attachInvoice = useMutation({
    mutationFn: ({ orderId, invoiceId }: { orderId: string; invoiceId: string }) =>
      post(`/procurement/orders/${orderId}/attach-invoice/`, accessToken, { invoiceId }),
    onSuccess: invalidate,
    onError: fail,
  });

  const { data: invoiceList } = useQuery({
    queryKey: ["invoices-procurement", accessToken],
    queryFn: () => api.listInvoices({ status: "OPEN" }),
    enabled: !!accessToken && activeTab === "invoices",
  });

  const openOrders = useMemo(
    () => orders.filter((o) => !["closed", "cancelled"].includes(o.status)),
    [orders],
  );

  const receivingOrders = useMemo(
    () => openOrders.filter((o) => RECEIVING_STATUSES.has(o.status)),
    [openOrders],
  );

  const invoiceOrders = useMemo(
    () => orders.filter((o) => INVOICE_STATUSES.has(o.status)),
    [orders],
  );

  const selectTab = (value: string) => {
    const next = tabFromParam(value);
    setActiveTab(next);
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next === "needs") params.delete("tab");
        else params.set("tab", next);
        return params;
      },
      { replace: true },
    );
  };

  const renderOrderCard = (order: ProcurementOrder, actions: React.ReactNode) => (
    <div
      key={order.id}
      className={cn(
        "rounded-lg border p-4",
        focusOrderId === order.id && "border-primary ring-1 ring-primary/30",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">
            {order.supplierName ? `${order.supplierName} · ` : ""}
            {order.lines.map((l) => l.itemName).join(", ") || t("procurement.order_fallback")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("procurement.status")}: {order.status.replace(/_/g, " ")} · {order.subtotal}{" "}
            {order.currency}
          </p>
          {order.invoiceId && (
            <p className="text-xs text-muted-foreground">
              {t("procurement.invoice_linked")}: {order.invoiceId}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>
    </div>
  );

  return (
    <MizanPageShell title={t("nav.suppliers.procurement")} eyebrow={t("procurement.subtitle")}>
      <Tabs value={activeTab} onValueChange={selectTab} className="w-full">
        {isError && (
          <p className="mb-4 rounded-lg border border-red-200 dark:border-red-900/50 p-3 text-sm text-red-700 dark:text-red-400">
            {(error as Error)?.message || t("procurement.load_failed")}
          </p>
        )}
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-xl border border-border/60 bg-muted/40 p-1.5 lg:grid-cols-5">
          {(
            [
              ["needs", ShoppingCart, t("procurement.tab.needs")],
              ["reorder", Repeat, t("procurement.tab.reorder")],
              ["orders", ClipboardList, t("procurement.tab.orders")],
              ["receiving", PackageCheck, t("procurement.tab.receiving")],
              ["invoices", FileText, t("procurement.tab.invoices")],
            ] as const
          ).map(([value, Icon, label]) => (
            <TabsTrigger
              key={value}
              value={value}
              className={cn(HUB_TABS_TRIGGER, "w-full justify-center gap-2 py-3 text-sm font-semibold")}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="needs" className="mt-6 space-y-6 focus-visible:outline-none">
          <Card>
            <CardHeader>
              <CardTitle>{t("purchasing.recommendations")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading && <p className="text-sm text-muted-foreground">{t("purchasing.loading")}</p>}
              {!isLoading && (needs.recommendations || []).length === 0 && (
                <p className="text-sm text-muted-foreground">{t("purchasing.none")}</p>
              )}
              {(needs.recommendations || []).map((row) => (
                <div key={row.id} className="flex items-center justify-between gap-4 border-b py-2 last:border-0">
                  <div>
                    <p className="font-medium">{row.name}</p>
                    <p className="text-sm text-muted-foreground">{row.reason}</p>
                  </div>
                  <Button size="sm" disabled={createFromRec.isPending} onClick={() => createFromRec.mutate(row)}>
                    {t("purchasing.order_qty", { qty: row.suggestedQuantity, unit: row.unit })}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("procurement.staff_requests")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(needs.staffRequests || []).length === 0 && (
                <p className="text-sm text-muted-foreground">{t("procurement.no_staff_requests")}</p>
              )}
              {(needs.staffRequests || []).map((req) => (
                <div key={req.id} className="flex items-center justify-between gap-4 border-b py-2 last:border-0">
                  <div>
                    <p className="font-medium">{req.subject}</p>
                    <p className="text-sm text-muted-foreground">{req.description}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => convertRequest.mutate(req.id)}>
                    {t("procurement.convert_request")}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reorder" className="mt-6 space-y-4 focus-visible:outline-none">
          <ReorderPanel enabled={activeTab === "reorder"} onCreated={() => { invalidate(); selectTab("orders"); }} />
        </TabsContent>

        <TabsContent value="orders" className="mt-6 space-y-4 focus-visible:outline-none">
          {openOrders.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("procurement.no_orders")}</p>
          )}
          {openOrders.map((order) =>
            renderOrderCard(
              order,
              <>
                {order.status === "draft" && (
                  <Button size="sm" onClick={() => submitOrder.mutate(order.id)}>
                    {t("procurement.submit")}
                  </Button>
                )}
                {order.status === "approved" && (
                  <Button size="sm" variant="outline" onClick={() => sendOrder.mutate(order.id)}>
                    {t("procurement.mark_sent")}
                  </Button>
                )}
              </>,
            ),
          )}
        </TabsContent>

        <TabsContent value="receiving" className="mt-6 space-y-4 focus-visible:outline-none">
          {receivingOrders.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("procurement.no_receiving")}</p>
          )}
          {receivingOrders.map((order) =>
            renderOrderCard(
              order,
              <Button size="sm" onClick={() => receiveOrder.mutate(order)}>
                {t("purchasing.mark_received")}
              </Button>,
            ),
          )}
        </TabsContent>

        <TabsContent value="invoices" className="mt-6 space-y-4 focus-visible:outline-none">
          {invoiceOrders.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("procurement.no_invoices")}</p>
          )}
          {invoiceOrders.map((order) =>
            renderOrderCard(
              order,
              !order.invoiceId && CAN_ATTACH_INVOICE.has(order.status) ? (
                <select
                  className="rounded-md border bg-background px-2 py-1 text-sm"
                  defaultValue=""
                  onChange={(e) => {
                    const invoiceId = e.target.value;
                    if (invoiceId) attachInvoice.mutate({ orderId: order.id, invoiceId });
                  }}
                >
                  <option value="">{t("procurement.link_invoice")}</option>
                  {(invoiceList?.results || []).map((inv: { id: string; vendor_name?: string; invoice_number?: string; amount?: string | number; currency?: string }) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.vendor_name || inv.id}{inv.invoice_number ? ` #${inv.invoice_number}` : ""} · {inv.amount} {inv.currency || ""}
                    </option>
                  ))}
                </select>
              ) : order.invoiceId ? (
                <Button size="sm" variant="outline" asChild>
                  <a href="/dashboard/operations/approvals">{t("procurement.view_approvals")}</a>
                </Button>
              ) : null,
            ),
          )}
        </TabsContent>
      </Tabs>
    </MizanPageShell>
  );
}


/** Reorder: items below their reorder point (or short for demand), topped up to par, grouped by supplier.
 * Quantities are editable; each supplier becomes one draft purchase order. */
function ReorderPanel({ enabled, onCreated }: { enabled: boolean; onCreated: () => void }) {
  const { t } = useLanguage();
  const { data, isLoading } = useQuery({
    queryKey: ["procurement-reorder"],
    queryFn: () => api.getReorderSuggestions(),
    enabled,
  });
  const [qty, setQty] = useState<Record<string, string>>({});
  const create = useMutation({
    mutationFn: (groups: NonNullable<typeof data>["groups"]) =>
      api.createReorderOrders(
        groups.map((g) => ({
          supplierId: g.supplierId,
          lines: g.lines.map((l) => ({ itemId: l.itemId, quantity: Number(qty[l.itemId] ?? l.suggestedQuantity) || 0,
                                       unitPrice: l.unitPrice || undefined })),
        })),
      ),
    onSuccess: (res) => {
      toast.success(t("procurement.reorder.created", { count: res.orders.length }));
      setQty({});
      onCreated();
    },
    onError: (e) => toast.error((e as Error).message),
  });
  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  const groups = data?.groups || [];
  if (!groups.length) return <p className="text-sm text-muted-foreground">{t("procurement.reorder.none")}</p>;
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button disabled={create.isPending} onClick={() => create.mutate(groups)}>
          {t("procurement.reorder.create_all", { count: groups.length })}
        </Button>
      </div>
      {groups.map((g) => (
        <Card key={g.supplierId || "none"}>
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle className="text-base">{g.supplierName || t("procurement.reorder.no_supplier")}</CardTitle>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground tabular-nums">
                {t("procurement.reorder.estimate", { amount: Math.round(g.estimatedTotal).toLocaleString() })}
              </span>
              <Button size="sm" variant="outline" disabled={create.isPending} onClick={() => create.mutate([g])}>
                {t("procurement.reorder.create_one")}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {g.lines.map((l) => (
              <div key={l.itemId} className="flex flex-wrap items-center justify-between gap-3 border-b py-2 last:border-0">
                <div className="min-w-0">
                  <p className="font-medium">{l.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("procurement.reorder.line_detail", { onHand: l.onHand, unit: l.unit, par: l.parLevel || l.reorderPoint })}
                    {l.unitPrice ? ` · ${l.unitPrice} / ${l.unit}` : ` · ${t("procurement.reorder.no_price")}`}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="number" min="0" step="any"
                    className="h-9 w-24 rounded-md border bg-background px-2 text-sm"
                    value={qty[l.itemId] ?? String(l.suggestedQuantity)}
                    onChange={(e) => setQty((prev) => ({ ...prev, [l.itemId]: e.target.value }))}
                    aria-label={t("procurement.reorder.qty_for", { name: l.name })}
                  />
                  {l.unit}
                </label>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
