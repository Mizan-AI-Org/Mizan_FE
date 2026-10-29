import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { PAGE_SHELL } from "@/lib/page-shell";
import { cn } from "@/lib/utils";
import type { StockCountReport } from "@/lib/types";

/** Physical stock count: type what is on the shelf, the differences go to the stock ledger with their value. */
export default function StockCountPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const token = localStorage.getItem("access_token") || "";
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [report, setReport] = useState<StockCountReport | null>(null);
  const items = useQuery({ queryKey: ["inventoryItems", token], queryFn: () => api.getInventoryItems(token) });
  const summary = useQuery({ queryKey: ["inventory-summary"], queryFn: () => api.getInventorySummary() });
  const currency = summary.data?.currency || "MAD";

  const rows = useMemo(
    () => (items.data || []).filter((i) => i.name.toLowerCase().includes(search.trim().toLowerCase())),
    [items.data, search],
  );
  const entered = Object.entries(counts).filter(([, v]) => v.trim() !== "" && !Number.isNaN(Number(v)));

  const submit = useMutation({
    mutationFn: () => api.submitStockCount(entered.map(([itemId, v]) => ({ itemId, counted: Number(v) }))),
    onSuccess: (data) => {
      setReport(data);
      setCounts({});
      void queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
      void queryClient.invalidateQueries({ queryKey: ["inventory-summary"] });
      toast.success(t("inv.count.saved", { count: data.itemsCounted }));
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="min-h-screen pb-24">
      <div className={`${PAGE_SHELL} py-6 md:py-8 space-y-5`}>
        <Link to="/dashboard/inventory" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
          <ArrowLeft className="w-4 h-4 me-1" aria-hidden /> {t("inv.overview.title")}
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">{t("inv.count.title")}</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{t("inv.count.subtitle")}</p>
          </div>
          <Button disabled={!entered.length || submit.isPending} onClick={() => submit.mutate()}>
            {submit.isPending ? <Loader2 className="w-4 h-4 animate-spin me-1" /> : null}
            {t("inv.count.submit", { count: entered.length })}
          </Button>
        </div>

        {report && (
          <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-card p-4 space-y-2">
            <p className="font-bold text-slate-900 dark:text-white">
              {t("inv.count.result", { counted: report.itemsCounted, variances: report.itemsWithVariance })}{" "}
              <span className={cn(report.varianceValue < 0 ? "text-red-700 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400")}>
                {report.varianceValue > 0 ? "+" : ""}{Math.round(report.varianceValue).toLocaleString()} {currency}
              </span>
            </p>
            {report.lines.filter((l) => l.variance).slice(0, 8).map((l) => (
              <p key={l.itemId} className="text-sm text-slate-600 dark:text-slate-300">
                {l.name}: {l.expected} → {l.counted} {l.unit} ({l.variance > 0 ? "+" : ""}{l.variance}
                {l.varianceValue ? `, ${Math.round(l.varianceValue)} ${currency}` : ""})
              </p>
            ))}
          </div>
        )}

        <div className="relative max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("inv.count.search")} className="ps-9" />
        </div>

        {items.isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200/70 dark:border-slate-800">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("inv.count.item")}</TableHead>
                  <TableHead className="text-end">{t("inv.count.expected")}</TableHead>
                  <TableHead className="w-40">{t("inv.count.counted")}</TableHead>
                  <TableHead className="text-end">{t("inv.count.diff")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((item) => {
                  const raw = counts[item.id] ?? "";
                  const diff = raw.trim() !== "" && !Number.isNaN(Number(raw)) ? Number(raw) - item.current_stock : null;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-semibold">{item.name}</TableCell>
                      <TableCell className="text-end tabular-nums">{item.current_stock} {item.unit}</TableCell>
                      <TableCell>
                        <Input
                          type="number" min="0" step="any" inputMode="decimal" value={raw}
                          aria-label={t("inv.count.counted_for", { name: item.name })}
                          onChange={(e) => setCounts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          className="h-9"
                        />
                      </TableCell>
                      <TableCell className={cn("text-end tabular-nums", diff && diff < 0 && "text-red-700 dark:text-red-400",
                                                diff && diff > 0 && "text-emerald-700 dark:text-emerald-400")}>
                        {diff === null ? "" : `${diff > 0 ? "+" : ""}${Math.round(diff * 100) / 100}`}
                        {diff && item.cost_per_unit ? ` · ${Math.round(diff * item.cost_per_unit)} ${currency}` : ""}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
