export type FinancialSnapshot7d = {
  currency: string;
  revenue: number;
  food_cost: number;
  labor_cost: number;
  gross_profit: number;
  net_profit: number;
  gross_margin_pct: number;
  net_margin_pct: number;
  food_cost_pct: number;
  labor_cost_pct: number;
};

type DomainFinancialWorld = {
  kpis?: Array<{ label: string; value: string | number }>;
  snapshot_7d?: FinancialSnapshot7d;
};

function parseAmount(raw: string | number | undefined): number {
  if (raw == null) return 0;
  if (typeof raw === "number") return raw;
  const n = parseFloat(String(raw).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function parsePct(raw: string | number | undefined): number {
  if (raw == null) return 0;
  if (typeof raw === "number") return raw;
  const n = parseFloat(String(raw).replace("%", "").trim());
  return Number.isFinite(n) ? n : 0;
}

/** Resolve 7-day financial roll-up from domain world (snapshot preferred). */
export function resolveFinancialSnapshot7d(
  world: DomainFinancialWorld | undefined | null,
): FinancialSnapshot7d | null {
  if (world?.snapshot_7d) return world.snapshot_7d;
  const kpis = world?.kpis ?? [];
  const by = (needle: string) =>
    kpis.find((k) => k.label.toLowerCase().includes(needle.toLowerCase()));
  const revenue = parseAmount(by("revenue")?.value);
  if (revenue <= 0 && kpis.length === 0) return null;
  const foodPct = parsePct(by("food cost")?.value);
  const laborPct = parsePct(by("labor cost")?.value);
  const grossMarginPct = parsePct(by("gross margin")?.value);
  const netMarginPct = parsePct(by("net margin")?.value);
  const foodCost = revenue * (foodPct / 100);
  const laborCost = revenue * (laborPct / 100);
  const grossProfit = revenue - foodCost;
  const netProfit = grossProfit - laborCost;
  return {
    currency: "MAD",
    revenue,
    food_cost: foodCost,
    labor_cost: laborCost,
    gross_profit: grossProfit,
    net_profit: netProfit,
    gross_margin_pct: grossMarginPct || (revenue ? (grossProfit / revenue) * 100 : 0),
    net_margin_pct: netMarginPct || (revenue ? (netProfit / revenue) * 100 : 0),
    food_cost_pct: foodPct,
    labor_cost_pct: laborPct,
  };
}

export function formatMoney(amount: number, currency: string, locale?: string): string {
  try {
    return new Intl.NumberFormat(locale || undefined, {
      style: "currency",
      currency: currency.length === 3 ? currency : "MAD",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount)} ${currency}`;
  }
}
