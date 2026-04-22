import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DollarSign,
  ShoppingCart,
  ChefHat,
  BarChart3,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  CreditCard,
  Banknote,
  Receipt,
  Sparkles,
  CalendarClock,
  PackagePlus,
  Users,
  Info,
} from "lucide-react";
import { api } from "../lib/api";
import { useLanguage } from "../hooks/use-language";
import { exportPrepListToPDF, exportPrepListToExcel } from "@/utils/prepListExport";
import { format, addDays } from "date-fns";
import { toast } from "sonner";

const ORDER_TYPE_LABELS: Record<string, string> = {
  DINE_IN: "Dine In",
  TAKEOUT: "Takeout",
  DELIVERY: "Delivery",
  CATERING: "Catering",
};

export default function SalesAndPrepPage() {
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const [salesDate, setSalesDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [prepStartDate, setPrepStartDate] = useState(() => format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [prepEndDate, setPrepEndDate] = useState(() => format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [prepListModalOpen, setPrepListModalOpen] = useState(false);
  const [exportingPrep, setExportingPrep] = useState<"pdf" | "excel" | null>(null);

  const { data: todaySales, isLoading: salesLoading, isError: salesError } = useQuery({
    queryKey: ["pos-sales-today", accessToken, salesDate],
    queryFn: () => api.getTodaySales(accessToken!, salesDate),
    enabled: !!accessToken,
  });

  const useDateRange = prepStartDate !== prepEndDate;
  const { data: prepList, isLoading: prepLoading, isError: prepError } = useQuery({
    queryKey: ["pos-prep-list", accessToken, prepStartDate, prepEndDate],
    queryFn: () =>
      useDateRange
        ? api.getPrepList(accessToken!, undefined, prepStartDate, prepEndDate)
        : api.getPrepList(accessToken!, prepStartDate),
    enabled: !!accessToken,
  });

  const refetchPrepList = () => {
    if (!todaySales?.connected) {
      toast.error(t("dashboard.prep.pos_required") || "Connect your POS first. Prep list analysis cannot be done without sales data.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["pos-prep-list", accessToken, prepStartDate, prepEndDate] });
    toast.success("Prep list regenerated");
  };

  type PrepRow = {
    ingredient?: string;
    menu_item?: string;
    needed?: number;
    forecast_portions?: number;
    unit?: string;
    in_stock?: number;
    gap?: number;
    pack_size?: number | null;
    min_order_qty?: number | null;
    shelf_life_days?: number | null;
    cost_per_unit?: number;
    inventory_item_id?: string | null;
    supplier_id?: string | null;
    supplier_name?: string | null;
    lead_time_days?: number | null;
    order_by?: string;
    suggested_order_qty?: number;
    suggested_order_cost?: number;
  };
  const prepItems = (prepList?.ingredient_prep_list ?? prepList?.forecast_portions ?? []) as PrepRow[];

  const shortageRows = prepItems.filter((i) => (i.gap ?? 0) > 0 && i.supplier_id && i.inventory_item_id);
  const canAutoPO = shortageRows.length > 0;
  const coversMult = prepList?.covers_multiplier ?? 1;
  const coversNote = prepList?.baseline_covers && prepList?.expected_covers
    ? `${prepList.expected_covers} covers expected vs ${prepList.baseline_covers} baseline`
    : null;
  const [autoPOLoading, setAutoPOLoading] = useState(false);

  const handleAutoPO = async () => {
    if (!accessToken || !canAutoPO) return;
    setAutoPOLoading(true);
    try {
      const params = useDateRange
        ? { startDate: prepStartDate, endDate: prepEndDate }
        : { date: prepStartDate };
      const result = await api.autoDraftPurchaseOrders(accessToken, params);
      const createdCount = result.created_orders.length;
      const skippedCount = result.skipped.length;
      if (createdCount > 0) {
        toast.success(
          `Drafted ${createdCount} purchase order(s)${skippedCount ? ` · ${skippedCount} skipped` : ""}`,
          {
            action: {
              label: t("common.view") || "View",
              onClick: () => navigate("/dashboard/inventory/purchase-orders"),
            },
          },
        );
      } else if (skippedCount > 0) {
        toast.warning(
          t("dashboard.prep.auto_po_skipped") ||
            `${skippedCount} ingredient(s) skipped. Link them to a supplier in Inventory → Items to include them.`,
        );
      } else {
        toast.info(result.message || t("dashboard.prep.auto_po_none") || "No shortages to draft.");
      }
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["pos-prep-list"] });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`${t("dashboard.prep.auto_po_failed") || "Couldn't draft purchase orders"}: ${msg}`);
    } finally {
      setAutoPOLoading(false);
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    try {
      return format(new Date(iso), "MMM d");
    } catch {
      return iso;
    }
  };

  const handleExportPrep = async (format: "pdf" | "excel") => {
    if (!prepItems.length) return;
    setExportingPrep(format);
    const dateLabel = prepList?.target_end_date
      ? `${prepList?.target_date}–${prepList.target_end_date}`
      : (prepList?.target_date || prepStartDate);
    try {
      if (format === "pdf") {
        await exportPrepListToPDF(
          prepItems,
          dateLabel,
          prepList?.day_of_week || "",
          "Recommended Prep List"
        );
        toast.success("Prep list exported as PDF");
      } else {
        await exportPrepListToExcel(
          prepItems,
          dateLabel,
          prepList?.day_of_week || "",
          "Prep List"
        );
        toast.success("Prep list exported as Excel");
      }
    } catch (e) {
      toast.error("Export failed");
    } finally {
      setExportingPrep(null);
    }
  };

  const cardBase =
    "relative border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 rounded-2xl ring-1 ring-slate-900/[0.03] dark:ring-white/[0.04] overflow-hidden shadow-[0_1px_2px_0_rgb(15_23_42_/_0.04),0_2px_8px_-2px_rgb(15_23_42_/_0.06)] transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-0.5 hover:border-slate-300/70 dark:hover:border-slate-700 hover:shadow-[0_12px_32px_-12px_rgb(15_23_42_/_0.18),0_4px_12px_-4px_rgb(15_23_42_/_0.08)]";

  const miyaRec = prepList as { miya_recommendation?: { title?: string; body?: string; action_label?: string } } | undefined;
  const isConnectPosPrompt = miyaRec?.miya_recommendation?.action_label?.toLowerCase().includes("connect pos") ?? false;
  const showMiyaCard = miyaRec?.miya_recommendation && !isConnectPosPrompt;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50/80 dark:from-[#0f1419] dark:via-slate-950 dark:to-slate-950/80 p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {t("dashboard.sales.page_title") || "Sales Analysis & Prep List"}
          </h1>
        </header>

        <Card className={`${cardBase} flex flex-col`}>
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-emerald-50/80 to-transparent dark:from-emerald-950/20 dark:to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                  {t("dashboard.sales.title") || "Sales Analysis"}
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={salesDate}
                  onChange={(e) => setSalesDate(e.target.value)}
                  className="text-xs px-2 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                />
                <Badge variant="outline" className={todaySales?.connected ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400" : "text-slate-500"}>
                  {todaySales?.connected ? "LIVE" : "POS"}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 pb-8 px-6 md:px-8">
            {salesLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-10 h-10 border-2 border-emerald-200 dark:border-emerald-800 border-t-emerald-500 rounded-full animate-spin" />
                <span className="text-sm text-slate-500 dark:text-slate-400">{t("dashboard.sales.loading") || "Loading…"}</span>
              </div>
            ) : salesError ? (
              <div className="py-10 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">{t("dashboard.sales.error") || "Could not load sales. Try again later."}</p>
                <Button variant="outline" size="default" onClick={() => navigate("/dashboard/settings")}>
                  {t("common.settings") || "Settings"}
                </Button>
              </div>
            ) : !todaySales?.connected ? (
              <div className="py-10 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20 flex items-center justify-center mx-auto mb-5 border border-emerald-100/50 dark:border-emerald-800/30">
                  <DollarSign className="w-10 h-10 text-emerald-500 dark:text-emerald-400" />
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 max-w-[260px] mx-auto leading-relaxed">
                  {todaySales?.error || (t("dashboard.sales.connect_pos") || "Connect your POS in Settings to see sales.")}
                </p>
                <Button size="default" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => navigate("/dashboard/settings")}>
                  {t("dashboard.sales.connect_pos_cta") || "Connect POS"}
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Primary metrics */}
                <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">
                    {t("dashboard.sales.total") || "Total revenue"}
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {todaySales?.currency || ""} {(todaySales?.total_sales ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t("dashboard.sales.orders") || "Orders"}</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">{todaySales?.order_count ?? 0}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t("dashboard.sales.avg_ticket") || "Avg ticket"}</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">
                      {todaySales?.currency || ""} {(todaySales?.avg_ticket ?? 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Payment breakdown */}
                {(todaySales?.tips ?? 0) > 0 || (todaySales?.cash_total ?? 0) > 0 || (todaySales?.card_total ?? 0) > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Payment breakdown</p>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      {(todaySales?.cash_total ?? 0) > 0 && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                          <Banknote className="w-4 h-4 text-emerald-600" />
                          <span className="text-slate-700 dark:text-slate-300">Cash</span>
                          <span className="font-medium ml-auto">{todaySales?.currency} {(todaySales?.cash_total ?? 0).toFixed(0)}</span>
                        </div>
                      )}
                      {(todaySales?.card_total ?? 0) > 0 && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                          <CreditCard className="w-4 h-4 text-emerald-600" />
                          <span className="text-slate-700 dark:text-slate-300">Card</span>
                          <span className="font-medium ml-auto">{todaySales?.currency} {(todaySales?.card_total ?? 0).toFixed(0)}</span>
                        </div>
                      )}
                      {(todaySales?.tips ?? 0) > 0 && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                          <Receipt className="w-4 h-4 text-amber-600" />
                          <span className="text-slate-700 dark:text-slate-300">Tips</span>
                          <span className="font-medium ml-auto">{todaySales?.currency} {(todaySales?.tips ?? 0).toFixed(0)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* Tax & discount */}
                {((todaySales?.total_tax ?? 0) > 0 || (todaySales?.total_discount ?? 0) > 0) && (
                  <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-400">
                    {(todaySales?.total_tax ?? 0) > 0 && (
                      <span>Tax: {todaySales?.currency} {(todaySales?.total_tax ?? 0).toFixed(2)}</span>
                    )}
                    {(todaySales?.total_discount ?? 0) > 0 && (
                      <span>Discount: {todaySales?.currency} {(todaySales?.total_discount ?? 0).toFixed(2)}</span>
                    )}
                  </div>
                )}

                {/* By order type */}
                {todaySales?.by_order_type && Object.keys(todaySales.by_order_type).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">By order type</p>
                    <div className="space-y-1">
                      {Object.entries(todaySales.by_order_type).map(([type, data]) => (
                        <div key={type} className="flex justify-between text-sm py-1 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                          <span className="text-slate-700 dark:text-slate-300">{ORDER_TYPE_LABELS[type] || type}</span>
                          <span className="font-medium text-slate-900 dark:text-white">
                            {data.count} orders · {todaySales?.currency} {data.total.toFixed(0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button variant="outline" size="sm" className="w-full" onClick={() => navigate("/dashboard/reports/sales/daily")}>
                  {t("dashboard.sales.view_reports") || "View full reports"}
                </Button>
              </div>
            )}
          </CardContent>

          {/* Prep List section - same card, below sales */}
          <div className="border-t border-slate-100 dark:border-slate-800">
            <CardContent className="pt-6 pb-8 px-6 md:px-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <ShoppingCart className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{t("dashboard.prep.title") || "Recommended Prep List"}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {useDateRange
                        ? `Prep list for ${prepList?.target_date || prepStartDate} – ${prepList?.target_end_date || prepEndDate} (${prepList?.day_of_week})`
                        : `Prep list for ${prepList?.target_date || prepStartDate} (${prepList?.day_of_week})`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="date"
                    value={prepStartDate}
                    aria-label={t("dashboard.prep.from_date") || "From date"}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPrepStartDate(v);
                      if (v > prepEndDate) setPrepEndDate(v);
                    }}
                    className="text-xs px-2 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  />
                  <span className="text-slate-400 dark:text-slate-500">–</span>
                  <input
                    type="date"
                    value={prepEndDate}
                    aria-label={t("dashboard.prep.to_date") || "To date"}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPrepEndDate(v);
                      if (v < prepStartDate) setPrepStartDate(v);
                    }}
                    className="text-xs px-2 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  />
                  {prepItems.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={refetchPrepList} className="text-amber-600 hover:text-amber-700">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
              {prepLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-8 h-8 border-2 border-amber-200 dark:border-amber-800 border-t-amber-500 rounded-full animate-spin" />
                  <span className="text-sm text-slate-500 dark:text-slate-400">{t("dashboard.prep.loading") || "Loading…"}</span>
                </div>
              ) : prepError ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{t("dashboard.prep.error") || "Could not load prep list. Try again later."}</p>
                  <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/inventory")}>
                    {t("dashboard.prep.view_inventory") || "View inventory"}
                  </Button>
                </div>
              ) : !prepItems.length ? (
                <div className="py-8">
                  {!todaySales?.connected ? (
                    <div className="flex flex-col items-center justify-center py-6">
                      <div className="w-14 h-14 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center mb-4">
                        <ShoppingCart className="w-7 h-7 text-amber-500 dark:text-amber-400" />
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-[280px]">
                        {t("dashboard.prep.connect_above") || "Connect your POS in the Sales section above to generate prep recommendations."}
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                        {prepList?.message_for_user || (t("dashboard.prep.no_data") || "Generate a prep list based on your sales data. Mizan will analyze same-day-of-week sales and recommend what to buy.")}
                      </p>
                      <Button
                        size="default"
                        className="bg-amber-600 hover:bg-amber-700"
                        onClick={refetchPrepList}
                        disabled={prepLoading}
                      >
                        {prepLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Generating…
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            {t("dashboard.prep.generate") || "Generate Prep List"}
                          </>
                        )}
                      </Button>
                      {showMiyaCard && (
                        <div className="mt-4 p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800/30">
                          <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2 mb-2">
                            <Sparkles className="w-4 h-4" /> {miyaRec?.miya_recommendation?.title || "How the prep list works"}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            {miyaRec?.miya_recommendation?.body?.replace(/\*\*(.*?)\*\*/g, "$1") ||
                              "Mizan analyzes your sales data from the same day of week over the last 4 weeks, applies a 10% buffer, and maps forecasted portions to ingredients via your recipes."}
                          </p>
                          {miyaRec?.miya_recommendation?.action_label && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-3"
                              onClick={() => {
                                const label = miyaRec?.miya_recommendation?.action_label;
                                if (label?.includes("Settings")) navigate("/dashboard/settings");
                                else if (prepItems.length > 0 && label?.toLowerCase().includes("prep")) setPrepListModalOpen(true);
                                else navigate("/dashboard");
                              }}
                            >
                              {miyaRec?.miya_recommendation?.action_label}
                            </Button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {(coversMult !== 1 || prepList?.forecast_algo) && (
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      {prepList?.forecast_algo && (
                        <Badge variant="outline" className="border-slate-200 dark:border-slate-700 font-normal">
                          <Sparkles className="w-3 h-3 mr-1" />
                          {t("dashboard.prep.ewma_label") || "EWMA forecast"} · {prepList.buffer_mode || "dynamic"} buffer
                        </Badge>
                      )}
                      {coversMult !== 1 && (
                        <Badge
                          variant="outline"
                          className={`font-normal ${coversMult > 1 ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" : "border-slate-200 text-slate-600 dark:text-slate-400"}`}
                        >
                          <Users className="w-3 h-3 mr-1" />
                          {coversMult > 1 ? "+" : ""}{Math.round((coversMult - 1) * 100)}% {t("dashboard.prep.covers_label") || "EatNow covers"}
                          {coversNote ? ` · ${coversNote}` : ""}
                        </Badge>
                      )}
                    </div>
                  )}
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {prepItems.slice(0, 10).map((item, i) => {
                      const gap = item.gap ?? 0;
                      return (
                        <div key={i} className="flex flex-col gap-0.5 py-1 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium text-slate-900 dark:text-white truncate pr-2">
                              {item.ingredient ?? item.menu_item ?? "—"}
                            </span>
                            <span className={`shrink-0 font-medium ${gap > 0 ? "text-amber-600" : "text-slate-600 dark:text-slate-400"}`}>
                              {item.needed ?? item.forecast_portions ?? 0} {item.unit ?? "portions"}
                            </span>
                          </div>
                          {(gap > 0 && (item.suggested_order_qty || item.order_by || item.supplier_name)) && (
                            <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                              <span>
                                {item.supplier_name
                                  ? `${item.supplier_name}${item.lead_time_days ? ` · ${item.lead_time_days}d lead` : ""}`
                                  : t("dashboard.prep.no_supplier") || "No supplier linked"}
                              </span>
                              <span>
                                {item.suggested_order_qty
                                  ? `${t("dashboard.prep.order_short") || "order"} ${item.suggested_order_qty}${item.unit ?? ""}`
                                  : ""}
                                {item.order_by ? ` · by ${formatDate(item.order_by)}` : ""}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {(prepList?.shortages?.length ?? 0) > 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">⚠ {prepList!.shortages!.length} {t("dashboard.prep.shortages") || "items may need reordering"}</p>
                  )}
                  {showMiyaCard && miyaRec?.miya_recommendation && (
                    <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800/30">
                      <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4" /> {miyaRec.miya_recommendation.title}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {miyaRec.miya_recommendation.body?.replace(/\*\*(.*?)\*\*/g, "$1")}
                      </p>
                      {miyaRec.miya_recommendation.action_label && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={() => {
                            const label = miyaRec.miya_recommendation!.action_label;
                            if (label?.includes("Settings")) navigate("/dashboard/settings");
                            else if (label?.toLowerCase().includes("prep")) setPrepListModalOpen(true);
                            else navigate("/dashboard");
                          }}
                        >
                          {miyaRec.miya_recommendation.action_label}
                        </Button>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPrepListModalOpen(true)}>
                      {t("dashboard.prep.view_full_list") || "View full list"} ({prepItems.length})
                    </Button>
                    <Button
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                      disabled={!canAutoPO || autoPOLoading}
                      onClick={handleAutoPO}
                    >
                      {autoPOLoading ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <PackagePlus className="w-4 h-4 mr-2" />
                      )}
                      {t("dashboard.prep.generate_pos") || "Draft Purchase Orders"}
                      {canAutoPO ? ` (${shortageRows.length})` : ""}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExportPrep("excel")} disabled={!!exportingPrep}>
                      Excel
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExportPrep("pdf")} disabled={!!exportingPrep}>
                      PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/inventory")}>
                      {t("dashboard.prep.view_inventory") || "View inventory"}
                    </Button>
                  </div>
                  {!canAutoPO && shortageRows.length === 0 && (prepList?.shortages?.length ?? 0) > 0 && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      {t("dashboard.prep.link_supplier_hint") || "Link each short ingredient to a supplier in Inventory → Items to enable auto-drafting."}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </div>
        </Card>
      </div>

      {/* Full Prep List Modal */}
      <Dialog open={prepListModalOpen} onOpenChange={setPrepListModalOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Prep List — {prepList?.target_end_date ? `${prepList?.target_date} – ${prepList.target_end_date}` : (prepList?.target_date || prepStartDate)} ({prepList?.day_of_week})
              </span>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={handleAutoPO}
                  disabled={!canAutoPO || autoPOLoading}
                >
                  {autoPOLoading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <PackagePlus className="w-4 h-4 mr-2" />
                  )}
                  {t("dashboard.prep.generate_pos") || "Draft Purchase Orders"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExportPrep("excel")} disabled={!!exportingPrep}>
                  {exportingPrep === "excel" ? "Exporting…" : "Excel"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExportPrep("pdf")} disabled={!!exportingPrep}>
                  {exportingPrep === "pdf" ? "Exporting…" : "PDF"}
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 -mx-6 px-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 font-medium text-slate-700 dark:text-slate-300">Item</th>
                  <th className="text-right py-3 font-medium text-slate-700 dark:text-slate-300">Need</th>
                  <th className="text-right py-3 font-medium text-slate-700 dark:text-slate-300">Stock</th>
                  <th className="text-right py-3 font-medium text-slate-700 dark:text-slate-300">Short</th>
                  <th className="text-right py-3 font-medium text-slate-700 dark:text-slate-300">Order</th>
                  <th className="text-left py-3 font-medium text-slate-700 dark:text-slate-300">Supplier</th>
                  <th className="text-right py-3 font-medium text-slate-700 dark:text-slate-300">Order by</th>
                </tr>
              </thead>
              <tbody>
                {prepItems.map((item, i) => {
                  const gap = item.gap ?? 0;
                  return (
                    <tr key={i} className="border-b border-slate-100 dark:border-slate-800/50">
                      <td className="py-2 font-medium text-slate-900 dark:text-white">
                        {item.ingredient ?? item.menu_item ?? "—"}
                        {item.shelf_life_days != null && (
                          <span className="ml-1 text-[10px] text-slate-500">· {item.shelf_life_days}d shelf</span>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        {item.needed ?? item.forecast_portions ?? 0}
                        <span className="text-slate-400"> {item.unit ?? "portions"}</span>
                      </td>
                      <td className="py-2 text-right text-slate-600 dark:text-slate-400">
                        {item.in_stock != null ? item.in_stock : "—"}
                      </td>
                      <td className={`py-2 text-right font-medium ${gap > 0 ? "text-amber-600" : "text-slate-400"}`}>
                        {gap > 0 ? gap : "—"}
                      </td>
                      <td className="py-2 text-right">
                        {item.suggested_order_qty ? (
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {item.suggested_order_qty} <span className="font-normal text-slate-400">{item.unit ?? ""}</span>
                            {item.pack_size ? (
                              <span className="block text-[10px] text-slate-500">
                                {Math.round(item.suggested_order_qty / item.pack_size)} × pack {item.pack_size}
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2 text-left text-slate-600 dark:text-slate-400">
                        {item.supplier_name || (gap > 0 ? <span className="text-amber-600">no supplier</span> : "—")}
                        {item.lead_time_days != null && item.supplier_name && (
                          <span className="block text-[10px] text-slate-500">{item.lead_time_days}d lead</span>
                        )}
                      </td>
                      <td className="py-2 text-right text-slate-600 dark:text-slate-400">
                        {item.order_by ? (
                          <span className="inline-flex items-center gap-1">
                            <CalendarClock className="w-3 h-3 text-slate-400" />
                            {formatDate(item.order_by)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
