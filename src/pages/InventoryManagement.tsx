import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ChevronRight, ClipboardCheck, Package, ShoppingCart, Truck, Users } from "lucide-react";

import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { PAGE_SHELL } from "@/lib/page-shell";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { key: "items", icon: Package, color: "text-blue-500", href: "/dashboard/inventory/items" },
  { key: "count", icon: ClipboardCheck, color: "text-emerald-600", href: "/dashboard/inventory/count" },
  { key: "reorder", icon: ShoppingCart, color: "text-green-600", href: "/dashboard/suppliers/procurement?tab=reorder" },
  { key: "suppliers", icon: Users, color: "text-purple-500", href: "/dashboard/inventory/suppliers" },
  { key: "orders", icon: Truck, color: "text-amber-600", href: "/dashboard/suppliers/procurement?tab=orders" },
  { key: "adjustments", icon: AlertTriangle, color: "text-red-500", href: "/dashboard/inventory/adjustments" },
] as const;

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-card p-5">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</p>
      <p className={cn("text-2xl font-black text-slate-900 dark:text-white mt-1", tone)}>{value}</p>
      {sub ? <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sub}</p> : null}
    </div>
  );
}

/** Inventory overview: stock value, waste, what's on order and what's running low, from the stock ledger. */
export default function InventoryManagement() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useQuery({ queryKey: ["inventory-summary"], queryFn: () => api.getInventorySummary() });
  const c = data?.currency || "MAD";
  const money = (v?: number) => `${Math.round(v ?? 0).toLocaleString()} ${c}`;

  return (
    <div className="min-h-screen pb-8 pt-4">
      <div className={`${PAGE_SHELL} py-6 md:py-8 space-y-6`}>
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">{t("inv.overview.title")}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{t("inv.overview.subtitle")}</p>
        </div>

        {isError ? (
          <p className="text-sm text-red-600">{t("inv.overview.error")}</p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Tile label={t("inv.kpi.value")} value={isLoading ? "—" : money(data?.stockValue)}
                  sub={data?.itemsWithoutCost ? t("inv.kpi.without_cost", { count: data.itemsWithoutCost }) : undefined} />
            <Tile label={t("inv.kpi.waste")} value={isLoading ? "—" : money(data?.wasteCost30d)} sub={t("inv.kpi.last_30d")} />
            <Tile label={t("inv.kpi.on_order")} value={isLoading ? "—" : money(data?.onOrderValue)} />
            <Tile label={t("inv.kpi.low")} value={isLoading ? "—" : String(data?.lowStockCount ?? 0)}
                  sub={data?.outOfStockCount ? t("inv.kpi.out", { count: data.outOfStockCount }) : undefined}
                  tone={data?.outOfStockCount ? "text-red-700 dark:text-red-400" : undefined} />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-12">
          {SECTIONS.map((section) => (
            <Link key={section.key} to={section.href} className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
              <Card className="flex items-center justify-between p-5 rounded-2xl hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className={cn("w-11 h-11 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center", section.color)}>
                    <section.icon className="w-5 h-5" aria-hidden />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{t(`inv.section.${section.key}.title`)}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t(`inv.section.${section.key}.desc`)}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300" aria-hidden />
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
