import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/hooks/use-language";

export type SupplierBuying = {
  delivery_days?: number[];
  order_cutoff?: string | null;
  min_order_amount?: number;
};

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

/** When a supplier delivers, the latest time an order makes the next delivery, and the minimum order. The buy
 * list orders each supplier for exactly the days until its following delivery. */
export function SupplierBuyingFields({
  value,
  onChange,
  idPrefix,
}: {
  value: SupplierBuying;
  onChange: (next: SupplierBuying) => void;
  idPrefix: string;
}) {
  const { t } = useLanguage();
  const days = new Set(value.delivery_days ?? []);
  const toggle = (i: number) => {
    const next = new Set(days);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    onChange({ ...value, delivery_days: [...next].sort() });
  };
  return (
    <>
      <div className="grid grid-cols-4 items-start gap-4">
        <span className="text-right pt-2 text-sm font-medium">{t("suppliers.buying.delivery_days")}</span>
        <div className="col-span-3 space-y-1">
          <div className="flex flex-wrap gap-1" role="group" aria-label={t("suppliers.buying.delivery_days")}>
            {DAYS.map((d, i) => (
              <button
                key={d}
                type="button"
                aria-pressed={days.has(i)}
                onClick={() => toggle(i)}
                className={`h-8 min-w-10 px-2 rounded-md border text-xs ${
                  days.has(i) ? "bg-primary text-primary-foreground border-primary" : "bg-background"
                }`}
              >
                {t(`suppliers.buying.day.${d}`)}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">{t("suppliers.buying.delivery_days_hint")}</p>
        </div>
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor={`${idPrefix}-cutoff`} className="text-right">{t("suppliers.buying.cutoff")}</Label>
        <Input
          id={`${idPrefix}-cutoff`}
          type="time"
          className="col-span-3"
          value={value.order_cutoff ?? ""}
          onChange={(e) => onChange({ ...value, order_cutoff: e.target.value || null })}
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor={`${idPrefix}-min`} className="text-right">{t("suppliers.buying.min_order")}</Label>
        <Input
          id={`${idPrefix}-min`}
          type="number"
          min="0"
          step="1"
          className="col-span-3"
          value={value.min_order_amount ?? 0}
          onChange={(e) => onChange({ ...value, min_order_amount: e.target.value === "" ? 0 : Number(e.target.value) })}
        />
      </div>
    </>
  );
}
