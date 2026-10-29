import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Info, ShoppingCart, Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { downloadBuyListPdf, getBuyList, type BuyGroup, type BuyPlan } from "@/lib/salesApi";
import { useLanguage } from "@/hooks/use-language";

const FLAG_KEYS: Record<string, string> = {
  "estimated recipes": "buy.flag.estimated",
  "never counted": "buy.flag.never_counted",
  "no recipe uses it: based on recent use": "buy.flag.no_recipe",
  "supplier delivery days not set": "buy.flag.no_delivery_days",
  "runs out before delivery": "buy.flag.runs_out",
};

function flagLabel(flag: string, t: (k: string, o?: Record<string, string | number>) => string) {
  const counted = flag.match(/^counted (\d+) days ago$/);
  if (counted) return t("buy.flag.counted_ago", { days: counted[1] });
  return FLAG_KEYS[flag] ? t(FLAG_KEYS[flag]) : flag;
}

const qty = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 });

function SupplierGroup({ group, currency }: { group: BuyGroup; currency: string }) {
  const { t } = useLanguage();
  const arrival = new Date(`${group.arrival}T12:00:00`);
  return (
    <section className="rounded-xl border">
      <header className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b bg-muted/40">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
          <Truck className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
          <span className="font-semibold">{group.supplier || t("buy.market")}</span>
          <span className="text-xs text-muted-foreground basis-full sm:basis-auto">
            {t("buy.arrives", { day: arrival.toLocaleDateString(undefined, { weekday: "long", day: "numeric" }) })}
            {" · "}
            {t("buy.covers_days", { count: group.coverDays.length })}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {group.orderBy && (
            <Badge variant="outline">{t("buy.order_by", { time: group.orderBy.slice(11, 16) })}</Badge>
          )}
          <span className="font-semibold tabular-nums">
            ~{group.estimatedTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })} {currency}
          </span>
        </div>
      </header>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("buy.col.item")}</TableHead>
              <TableHead className="text-right">{t("buy.col.buy")}</TableHead>
              <TableHead className="text-right hidden md:table-cell">{t("buy.col.need")}</TableHead>
              <TableHead className="text-right hidden md:table-cell">{t("buy.col.left")}</TableHead>
              <TableHead className="hidden lg:table-cell">{t("buy.col.why")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {group.lines.map((line) => (
              <TableRow key={line.itemId}>
                <TableCell className="align-top">
                  <div className="font-medium">{line.name}</div>
                  {line.flags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {line.flags.map((flag) => (
                        <Badge key={flag} variant="outline" className="text-[10px] font-normal text-amber-700 dark:text-amber-400 border-amber-300">
                          {flagLabel(flag, t)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right align-top tabular-nums font-semibold whitespace-nowrap">
                  {line.packs != null ? `${line.packs} ${line.packUnit}` : `${qty(line.toBuy)} ${line.unit}`}
                  {line.packs != null && (
                    <div className="text-xs font-normal text-muted-foreground">
                      {qty(line.toBuy)} {line.unit}
                    </div>
                  )}
                  {line.shortBeforeDelivery != null && line.runsOutOn && (
                    <div className="text-xs font-normal text-rose-700 dark:text-rose-400 whitespace-normal">
                      {t("buy.short_meanwhile", {
                        qty: `${qty(line.shortBeforeDelivery)} ${line.unit}`,
                        day: new Date(`${line.runsOutOn}T12:00:00`).toLocaleDateString(undefined, { weekday: "long" }),
                      })}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right align-top tabular-nums hidden md:table-cell">
                  {qty(line.need)} {line.unit}
                  <div className="text-xs text-muted-foreground">+{qty(line.safety)} {t("buy.safety")}</div>
                </TableCell>
                <TableCell className="text-right align-top tabular-nums hidden md:table-cell">
                  {qty(Math.max(line.expectedOnArrival, 0))} {line.unit}
                  {line.onOrder > 0 && (
                    <div className="text-xs text-muted-foreground">{t("buy.incl_on_order", { qty: line.onOrder })}</div>
                  )}
                </TableCell>
                <TableCell className="align-top text-xs text-muted-foreground hidden lg:table-cell max-w-[260px]">
                  {line.usedIn.length ? line.usedIn.join(", ") : t("buy.basis_history")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {group.belowMinimum && (
        <p className="px-4 py-2 text-xs text-amber-700 dark:text-amber-400 border-t">
          {t("buy.below_minimum", { amount: `${group.minOrder} ${currency}` })}
        </p>
      )}
    </section>
  );
}

function PlanBody({ plan }: { plan: BuyPlan }) {
  const { t } = useLanguage();
  if (!plan.suppliers.length) {
    return <p className="text-sm text-muted-foreground py-6 text-center">{t("buy.nothing")}</p>;
  }
  return (
    <div className="space-y-4">
      {plan.suppliers.map((group) => (
        <SupplierGroup key={group.supplierId ?? "market"} group={group} currency={plan.currency} />
      ))}
    </div>
  );
}

/** What to buy for the next deliveries (forecast x recipes - stock - on order + safety, rounded to packs). */
export function BuyListCard({ className = "" }: { className?: string }) {
  const { t } = useLanguage();
  const { data, isLoading, isError } = useQuery({ queryKey: ["buy-list"], queryFn: getBuyList });
  const sections = data?.branches ?? (data ? [data] : []);
  const notes = sections.flatMap((s) => s.notes);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 border-b">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">{t("buy.title")}</CardTitle>
            <p className="text-xs text-muted-foreground">{t("buy.subtitle")}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={!sections.some((s) => s.suppliers.length)}
          onClick={() => downloadBuyListPdf().catch((err) => toast.error(String(err?.message || err)))}
        >
          <Download className="w-4 h-4 mr-1.5" aria-hidden />
          {t("buy.download")}
        </Button>
      </CardHeader>
      <CardContent className="pt-5 space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{t("dashboard.sales.loading")}</p>
        ) : isError || !data ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{t("dashboard.sales.error")}</p>
        ) : (
          <>
            {sections.map((section) => (
              <div key={section.branch ?? "all"} className="space-y-3">
                {section.branch && data.branches && <h3 className="text-sm font-semibold">{section.branch}</h3>}
                <PlanBody plan={section} />
              </div>
            ))}
            {notes.length > 0 && (
              <ul className="space-y-1 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                {notes.map((note) => (
                  <li key={note.code} className="flex gap-2">
                    <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden />
                    {t(`buy.note.${note.code}`, note)}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
