"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DollarSign, Package } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MizanPageShell } from "@/components/os/MizanPageShell";
import { HUB_TABS_TRIGGER } from "@/lib/mizan-ui";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";
import SalesAndPrepPage from "./SalesAndPrepPage";
import InventoryItemsPage from "./inventory/InventoryItemsPage";

type SalesHubTab = "sales" | "inventory";

function tabFromParam(value: string | null): SalesHubTab {
  return value === "inventory" ? "inventory" : "sales";
}

export default function SalesHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<SalesHubTab>(() =>
    tabFromParam(searchParams.get("tab")),
  );

  useEffect(() => {
    setActiveTab(tabFromParam(searchParams.get("tab")));
  }, [searchParams]);

  const selectTab = (value: string) => {
    const next = tabFromParam(value);
    setActiveTab(next);
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next === "inventory") params.set("tab", "inventory");
        else params.delete("tab");
        return params;
      },
      { replace: true },
    );
  };

  return (
    <MizanPageShell title={t("nav.sales")} showHeader={false}>
      <Tabs value={activeTab} onValueChange={selectTab} className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-xl border border-border/60 bg-muted/40 p-1.5">
          <TabsTrigger
            value="sales"
            className={cn(
              HUB_TABS_TRIGGER,
              "w-full justify-center gap-2 py-3 text-sm font-semibold sm:text-[15px]",
            )}
          >
            <DollarSign className="h-4 w-4 shrink-0" />
            {t("nav.products.sales")}
          </TabsTrigger>
          <TabsTrigger
            value="inventory"
            className={cn(
              HUB_TABS_TRIGGER,
              "w-full justify-center gap-2 py-3 text-sm font-semibold sm:text-[15px]",
            )}
          >
            <Package className="h-4 w-4 shrink-0" />
            {t("nav.products.inventory")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="mt-6 focus-visible:outline-none">
          <SalesAndPrepPage embedded />
        </TabsContent>

        <TabsContent value="inventory" className="mt-6 focus-visible:outline-none">
          <InventoryItemsPage embedded />
        </TabsContent>
      </Tabs>
    </MizanPageShell>
  );
}
