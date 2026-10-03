"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ClipboardList, Users } from "lucide-react";
import { MizanPageShell } from "@/components/os/MizanPageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HUB_TABS_TRIGGER } from "@/lib/mizan-ui";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";
import { ReservationsPanel } from "@/pages/ReservationsPage";
import { OrdersPanel } from "@/pages/orders/OrdersPage";

type HubTab = "reservations" | "orders";

function tabFromParam(value: string | null): HubTab {
  return value === "orders" ? "orders" : "reservations";
}

export default function ReservationsOrdersPage() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<HubTab>(() => tabFromParam(searchParams.get("tab")));

  useEffect(() => {
    setActiveTab(tabFromParam(searchParams.get("tab")));
  }, [searchParams]);

  const selectTab = (value: string) => {
    const next = tabFromParam(value);
    setActiveTab(next);
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next === "reservations") params.delete("tab");
        else params.set("tab", next);
        return params;
      },
      { replace: true },
    );
  };

  return (
    <MizanPageShell title={t("nav.customers.reservations_orders")} showHeader={false}>
      <Tabs value={activeTab} onValueChange={selectTab} className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-xl border border-border/60 bg-muted/40 p-1.5">
          <TabsTrigger value="reservations" className={cn(HUB_TABS_TRIGGER, "gap-2 py-3")}>
            <Users className="h-4 w-4 shrink-0" aria-hidden />
            {t("nav.customers.reservations")}
          </TabsTrigger>
          <TabsTrigger value="orders" className={cn(HUB_TABS_TRIGGER, "gap-2 py-3")}>
            <ClipboardList className="h-4 w-4 shrink-0" aria-hidden />
            {t("nav.customers.orders")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="reservations" className="mt-6 focus-visible:outline-none">
          <ReservationsPanel embedded />
        </TabsContent>
        <TabsContent value="orders" className="mt-6 focus-visible:outline-none">
          <OrdersPanel embedded />
        </TabsContent>
      </Tabs>
    </MizanPageShell>
  );
}
