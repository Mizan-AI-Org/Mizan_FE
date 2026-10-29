import { useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Download, ExternalLink, Loader2 } from "lucide-react";
import { CartesianGrid, LabelList, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { PAGE_SHELL } from "@/lib/page-shell";
import { cn } from "@/lib/utils";
import { COST_CATEGORIES, type FinancePeriod, type FinancePnL, type Invoice } from "@/lib/types";

const PERIODS: FinancePeriod[] = ["month", "last_month", "week", "30d"];

function money(value: number | null | undefined, currency: string) {
  return `${Math.round(value ?? 0).toLocaleString()} ${currency}`;
}

function pct(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : `${value.toFixed(1)}%`;
}

/** Change vs the previous period of the same length. */
function Delta({ now, before, goodWhenUp = true }: { now: number; before?: number; goodWhenUp?: boolean }) {
  // A % change against a zero or negative base is meaningless (e.g. a loss shrinking reads as "-110%").
  if (before === undefined || before <= 0) return null;
  const change = ((now - before) / Math.abs(before)) * 100;
  if (!isFinite(change) || Math.abs(change) < 0.5) return null;
  const up = change > 0;
  const good = up === goodWhenUp;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center text-xs font-semibold", good ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400")}>
      <Icon className="w-3.5 h-3.5" aria-hidden />
      {Math.abs(change).toFixed(0)}%
    </span>
  );
}

function Tile({ label, value, sub, delta }: { label: string; value: string; sub?: string; delta?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-card p-4">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{value}</p>
      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
        {sub ? <span>{sub}</span> : null}
        {delta}
      </div>
    </div>
  );
}

function StatementRow({ label, value, share, strong, indent, currency }: {
  label: string; value: number; share?: number | null; strong?: boolean; indent?: boolean; currency: string;
}) {
  return (
    <TableRow>
      <TableCell className={cn(indent && "ps-8 text-slate-600 dark:text-slate-300", strong && "font-bold")}>{label}</TableCell>
      <TableCell className={cn("text-end tabular-nums", strong && "font-bold")}>{money(value, currency)}</TableCell>
      <TableCell className="text-end tabular-nums text-slate-500">{share === undefined ? "" : pct(share)}</TableCell>
    </TableRow>
  );
}

function DailyChart({ data, currency }: { data: FinancePnL["daily"]; currency: string }) {
  const { t } = useTranslation();
  const last = data.length - 1;
  // Both lines often end close together: put the higher one's label above its line, the lower one's below.
  const revenueOnTop = last >= 0 && data[last].revenue >= data[last].costs;
  const endLabel = (name: string, above: boolean) => (props: { index?: number; x?: number; y?: number }) =>
    props.index === last && props.x !== undefined && props.y !== undefined ? (
      <text x={props.x + 6} y={props.y} dy={above ? -6 : 14} className="fill-slate-600 dark:fill-slate-300 text-[11px]">{name}</text>
    ) : null;
  return (
    <div
      className="h-64 w-full [--rev:#2a78d6] [--cost:#eb6834] dark:[--rev:#3987e5] dark:[--cost:#d95926]"
      role="img"
      aria-label={t("finance.chart.aria")}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 64, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} className="stroke-slate-200 dark:stroke-slate-800" />
          <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(8, 10)} tickLine={false} axisLine={false}
                 className="text-[11px]" minTickGap={12} />
          <YAxis tickLine={false} axisLine={false} width={56} className="text-[11px]"
                 tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
          <Tooltip
            formatter={(v: number, name: string) => [money(v, currency), name]}
            labelFormatter={(d: string) => d}
            contentStyle={{ borderRadius: 12, fontSize: 12 }}
          />
          <Legend verticalAlign="top" align="left" height={28} iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="revenue" name={t("finance.chart.revenue")} stroke="var(--rev)" strokeWidth={2}
                dot={false} activeDot={{ r: 4 }}>
            <LabelList dataKey="revenue" content={endLabel(t("finance.chart.revenue"), revenueOnTop)} />
          </Line>
          <Line type="monotone" dataKey="costs" name={t("finance.chart.costs")} stroke="var(--cost)" strokeWidth={2}
                dot={false} activeDot={{ r: 4 }}>
            <LabelList dataKey="costs" content={endLabel(t("finance.chart.costs"), !revenueOnTop)} />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function Overview({ period }: { period: FinancePeriod }) {
  const { t } = useTranslation();
  const { data, isLoading, error } = useQuery({
    queryKey: ["finance-pnl", period],
    queryFn: () => api.getFinancePnL({ period }),
  });
  if (isLoading) return <Loader2 className="w-5 h-5 animate-spin text-slate-400" />;
  if (error || !data) return <p className="text-sm text-red-600">{(error as Error)?.message || t("finance.error")}</p>;
  const c = data.currency;
  const prev = data.previous;
  const r = data.revenue.total;
  return (
    <div className="space-y-6">
      {data.gaps.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 p-3 space-y-1">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4" aria-hidden /> {t("finance.gaps.title")}
          </p>
          {data.gaps.map((g) => (
            <p key={g.key} className="text-xs text-amber-900/80 dark:text-amber-200/80">
              {t(`finance.gaps.${g.key}`, { count: g.count ?? 0, defaultValue: g.detail })}
            </p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Tile label={t("finance.kpi.revenue")} value={money(r, c)} delta={<Delta now={r} before={prev?.revenue.total} />} />
        <Tile label={t("finance.kpi.food_cost")} value={pct(data.ratios.food_cost_pct)} sub={money(data.cogs.total, c)}
              delta={<Delta now={data.cogs.total} before={prev?.cogs.total} goodWhenUp={false} />} />
        <Tile label={t("finance.kpi.labor")} value={pct(data.ratios.labor_pct)} sub={money(data.labor.total, c)}
              delta={<Delta now={data.labor.total} before={prev?.labor.total} goodWhenUp={false} />} />
        <Tile label={t("finance.kpi.prime_cost")} value={pct(data.ratios.prime_cost_pct)} sub={money(data.prime_cost, c)} />
        <Tile label={t("finance.kpi.net_profit")} value={money(data.net_profit, c)} sub={pct(data.ratios.net_margin_pct)}
              delta={<Delta now={data.net_profit} before={prev?.net_profit} />} />
      </div>

      <Card>
        <CardHeader className="pb-1"><CardTitle className="text-base">{t("finance.chart.title")}</CardTitle></CardHeader>
        <CardContent><DailyChart data={data.daily} currency={c} /></CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-1"><CardTitle className="text-base">{t("finance.statement.title")}</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("finance.statement.line")}</TableHead>
                  <TableHead className="text-end">{t("finance.statement.amount")}</TableHead>
                  <TableHead className="text-end">{t("finance.statement.share")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <StatementRow label={t("finance.statement.revenue")} value={r} strong currency={c} />
                <StatementRow label={t("finance.statement.pos_sales")} value={data.revenue.pos_sales} indent currency={c} />
                <StatementRow label={t("finance.statement.mizan_orders")} value={data.revenue.mizan_orders} indent currency={c} />
                <StatementRow label={t("finance.statement.cogs")} value={-data.cogs.total} share={data.ratios.food_cost_pct} strong currency={c} />
                <StatementRow label={t("finance.cat.FOOD")} value={-data.cogs.food} indent currency={c} />
                <StatementRow label={t("finance.cat.BEVERAGE")} value={-data.cogs.beverage} indent currency={c} />
                <StatementRow label={t("finance.statement.gross")} value={data.gross_profit} share={data.ratios.gross_margin_pct} strong currency={c} />
                <StatementRow label={t("finance.statement.labor")} value={-data.labor.total} share={data.ratios.labor_pct} strong currency={c} />
                <StatementRow label={t("finance.statement.labor_floor", { hours: Math.round(data.labor.floor_hours) })} value={-data.labor.floor} indent currency={c} />
                <StatementRow label={t("finance.statement.labor_mgmt")} value={-data.labor.management} indent currency={c} />
                <StatementRow label={t("finance.statement.overheads")} value={-data.overheads.total} strong currency={c} />
                {Object.entries(data.overheads.by_category).map(([k, v]) => (
                  <StatementRow key={k} label={t(`finance.cat.${k.toUpperCase()}`)} value={-v} indent currency={c} />
                ))}
                <StatementRow label={t("finance.statement.net")} value={data.net_profit} share={data.ratios.net_margin_pct} strong currency={c} />
              </TableBody>
            </Table>
            {data.waste.estimated_cost > 0 && (
              <p className="text-xs text-slate-500 mt-2">{t("finance.statement.waste", { amount: money(data.waste.estimated_cost, c) })}</p>
            )}
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-base">{t("finance.vendors.title")}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.top_vendors.length === 0 && <p className="text-sm text-slate-400">{t("finance.vendors.none")}</p>}
              {data.top_vendors.map((v) => (
                <div key={v.vendor} className="flex justify-between text-sm">
                  <span className="truncate pe-2">{v.vendor}</span>
                  <span className="tabular-nums font-semibold">{money(v.amount, c)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          {data.labor.by_person && data.labor.by_person.length > 0 && (
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-base">{t("finance.labor.title")}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {data.labor.by_person.map((p) => (
                  <div key={p.name} className="flex justify-between text-sm">
                    <span className="truncate pe-2">{p.name} <span className="text-slate-400">· {p.hours}h</span></span>
                    <span className="tabular-nums font-semibold">{money(p.cost, c)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Invoices() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"open" | "overdue" | "approval" | "paid">("open");
  const payables = useQuery({ queryKey: ["finance-payables"], queryFn: () => api.getFinancePayables() });
  const invoices = useQuery({
    queryKey: ["finance-invoices", filter],
    queryFn: () =>
      api.listInvoices(
        filter === "overdue" ? { overdue: true } : filter === "approval" ? { status: "PENDING_APPROVAL" }
          : filter === "paid" ? { status: "PAID" } : { status: "OPEN" },
      ),
  });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["finance-invoices"] });
    void queryClient.invalidateQueries({ queryKey: ["finance-payables"] });
    void queryClient.invalidateQueries({ queryKey: ["finance-pnl"] });
  };
  const setCategory = useMutation({
    mutationFn: ({ id, category }: { id: string; category: string }) => api.updateInvoiceFields(id, { category }),
    onSuccess: () => { toast.success(t("finance.inv.category_saved")); refresh(); },
    onError: (e) => toast.error((e as Error).message),
  });
  const markPaid = useMutation({
    mutationFn: (inv: Invoice) => api.markInvoicePaid(inv.id, { amount: Number(inv.amount) }),
    onSuccess: () => { toast.success(t("finance.inv.paid")); refresh(); },
    onError: (e) => toast.error((e as Error).message),
  });
  const b = payables.data?.buckets;
  const rows = invoices.data?.results ?? [];
  return (
    <div className="space-y-6 min-w-0">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Tile label={t("finance.ap.overdue")} value={money(b?.overdue.amount, "MAD")} sub={t("finance.ap.count", { count: b?.overdue.count ?? 0 })} />
        <Tile label={t("finance.ap.due_7d")} value={money(b?.due_7d.amount, "MAD")} sub={t("finance.ap.count", { count: b?.due_7d.count ?? 0 })} />
        <Tile label={t("finance.ap.due_30d")} value={money(b?.due_30d.amount, "MAD")} sub={t("finance.ap.count", { count: b?.due_30d.count ?? 0 })} />
        <Tile label={t("finance.ap.awaiting")} value={money(payables.data?.awaiting_approval, "MAD")} />
        <Tile label={t("finance.ap.paid_30d")} value={money(payables.data?.paid_last_30d, "MAD")} />
      </div>
      <div className="flex flex-wrap gap-2">
        {(["open", "overdue", "approval", "paid"] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
            {t(`finance.inv.filter.${f}`)}
          </Button>
        ))}
      </div>
      {invoices.isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-400">{t("finance.inv.none")}</p>
      ) : (
        <div className="overflow-x-auto max-w-full rounded-xl border border-slate-200/70 dark:border-slate-800">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("finance.inv.vendor")}</TableHead>
                <TableHead>{t("finance.inv.category")}</TableHead>
                <TableHead className="text-end">{t("finance.inv.amount")}</TableHead>
                <TableHead>{t("finance.inv.due")}</TableHead>
                <TableHead>{t("finance.inv.status")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((inv) => {
                const overdue = inv.status !== "PAID" && inv.due_date && inv.due_date < new Date().toISOString().slice(0, 10);
                return (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <p className="font-semibold">{inv.vendor_name}</p>
                      {inv.invoice_number ? <p className="text-[11px] text-slate-500">#{inv.invoice_number}</p> : null}
                    </TableCell>
                    <TableCell>
                      <select
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                        value={COST_CATEGORIES.includes((inv.category || "") as (typeof COST_CATEGORIES)[number]) ? inv.category : ""}
                        onChange={(e) => setCategory.mutate({ id: inv.id, category: e.target.value })}
                        aria-label={t("finance.inv.category")}
                      >
                        <option value="" disabled>{t("finance.inv.pick_category")}</option>
                        {COST_CATEGORIES.map((cat) => <option key={cat} value={cat}>{t(`finance.cat.${cat}`)}</option>)}
                      </select>
                    </TableCell>
                    <TableCell className="text-end tabular-nums font-semibold">
                      {Number(inv.amount) > 0 ? money(Number(inv.amount), inv.currency || "MAD") : (
                        <Badge variant="outline" className="text-amber-700">{t("finance.inv.no_amount")}</Badge>
                      )}
                    </TableCell>
                    <TableCell className={cn("whitespace-nowrap", overdue && "text-red-700 dark:text-red-400 font-semibold")}>
                      {inv.due_date}
                    </TableCell>
                    <TableCell><Badge variant="outline">{t(`finance.status.${inv.status}`, { defaultValue: inv.status })}</Badge></TableCell>
                    <TableCell className="text-end whitespace-nowrap">
                      {inv.status !== "PAID" && (
                        <Button size="sm" variant="ghost" disabled={markPaid.isPending} onClick={() => markPaid.mutate(inv)}>
                          {t("finance.inv.mark_paid")}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" asChild>
                        <Link to={`/dashboard/staff-requests/${inv.id}?kind=invoice`} aria-label={t("finance.inv.open")}>
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

/** Finance: real P&L (sales, supplier invoices by category, clocked labor) and accounts payable. */
export default function FinancePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { section } = useParams();
  const tab = section === "invoices" ? "invoices" : "overview";
  const [period, setPeriod] = useState<FinancePeriod>("month");
  const [exporting, setExporting] = useState(false);
  const range = useMemo(() => {
    const now = new Date();
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (period === "last_month") {
      return { from: iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: iso(new Date(now.getFullYear(), now.getMonth(), 0)) };
    }
    if (period === "week") {
      const start = new Date(now); start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      return { from: iso(start), to: iso(now) };
    }
    if (period === "30d") {
      const start = new Date(now); start.setDate(now.getDate() - 29);
      return { from: iso(start), to: iso(now) };
    }
    return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(now) };
  }, [period]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const blob = await api.downloadInvoicesCsv(range.from, range.to);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoices_${range.from}_${range.to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen pb-28 min-w-0 overflow-x-hidden">
      <div className={`${PAGE_SHELL} py-6 md:py-8 space-y-6 min-w-0`}>
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">{t("finance.title")}</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{t("finance.subtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={period}
              onChange={(e) => setPeriod(e.target.value as FinancePeriod)}
              aria-label={t("finance.period.label")}
            >
              {PERIODS.map((p) => <option key={p} value={p}>{t(`finance.period.${p}`)}</option>)}
            </select>
            <Button variant="outline" onClick={exportCsv} disabled={exporting}>
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 me-1" />}
              {t("finance.export")}
            </Button>
          </div>
        </header>
        <Tabs value={tab} onValueChange={(v) => navigate(v === "invoices" ? "/dashboard/financials/invoices" : "/dashboard/financials")}>
          <TabsList>
            <TabsTrigger value="overview">{t("finance.tab.overview")}</TabsTrigger>
            <TabsTrigger value="invoices">{t("finance.tab.invoices")}</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="pt-4 min-w-0"><Overview period={period} /></TabsContent>
          <TabsContent value="invoices" className="pt-4 min-w-0"><Invoices /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
