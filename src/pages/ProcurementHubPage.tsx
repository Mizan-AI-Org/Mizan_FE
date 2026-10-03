"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { ClipboardList, FileText, PackageCheck, ShoppingCart } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { API_BASE, api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MizanPageShell } from "@/components/os/MizanPageShell";
import { HUB_TABS_TRIGGER } from "@/lib/mizan-ui";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";

type HubTab = "needs" | "orders" | "receiving" | "invoices";

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
  if (value === "orders" || value === "receiving" || value === "invoices") return value;
  return "needs";
}

const RECEIVING_STATUSES = new Set(["approved", "sent", "partial_received"]);
const INVOICE_STATUSES = new Set([
  "received",
  "pending_invoice_match",
  "pending_payment",
  "pending_approval",
  "closed",
]);

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

  const { data, isLoading } = useQuery({
    queryKey: ["procurement-needs", accessToken],
    queryFn: () => load("/procurement/needs/", accessToken),
    enabled: !!accessToken,
  });

  const needs = (data || {}) as NeedsPayload;
  const orders = (needs.orders || []) as ProcurementOrder[];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["procurement-needs"] });
    queryClient.invalidateQueries({ queryKey: ["purchasing"] });
  };

  const createFromRec = useMutation({
    mutationFn: (row: { id: string; suggestedQuantity: number; reason: string }) =>
      post("/procurement/orders/", accessToken, {
        lines: [{ itemId: row.id, quantity: row.suggestedQuantity, notes: row.reason }],
        source: "alert",
      }),
    onSuccess: invalidate,
  });

  const convertRequest = useMutation({
    mutationFn: (staffRequestId: string) =>
      post(`/procurement/staff-requests/${staffRequestId}/convert/`, accessToken, {}),
    onSuccess: invalidate,
  });

  const submitOrder = useMutation({
    mutationFn: (orderId: string) => post(`/procurement/orders/${orderId}/submit/`, accessToken, {}),
    onSuccess: invalidate,
  });

  const sendOrder = useMutation({
    mutationFn: (orderId: string) => post(`/procurement/orders/${orderId}/send/`, accessToken, {}),
    onSuccess: invalidate,
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
  });

  const attachInvoice = useMutation({
    mutationFn: ({ orderId, invoiceId }: { orderId: string; invoiceId: string }) =>
      post(`/procurement/orders/${orderId}/attach-invoice/`, accessToken, { invoiceId }),
    onSuccess: invalidate,
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
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-xl border border-border/60 bg-muted/40 p-1.5 lg:grid-cols-4">
          {(
            [
              ["needs", ShoppingCart, t("procurement.tab.needs")],
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
              !order.invoiceId ? (
                <select
                  className="rounded-md border bg-background px-2 py-1 text-sm"
                  defaultValue=""
                  onChange={(e) => {
                    const invoiceId = e.target.value;
                    if (invoiceId) attachInvoice.mutate({ orderId: order.id, invoiceId });
                  }}
                >
                  <option value="">{t("procurement.link_invoice")}</option>
                  {(invoiceList?.results || []).map((inv: { id: string; vendor?: string; amount?: number }) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.vendor || inv.id} · {inv.amount}
                    </option>
                  ))}
                </select>
              ) : (
                <Button size="sm" variant="outline" asChild>
                  <a href="/dashboard/operations/approvals">{t("procurement.view_approvals")}</a>
                </Button>
              ),
            ),
          )}
        </TabsContent>
      </Tabs>
    </MizanPageShell>
  );
}
