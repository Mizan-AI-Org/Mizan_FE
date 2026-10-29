import { API_BASE } from "@/lib/api";

/** The day's sales and what to buy (Django apps/inventory: sales_day, forecast, recipes, pos_items). Every write
 * here is the same action Miya runs on WhatsApp (link-pos-item, set-recipe, confirm-recipes, set-demand-event). */

export type SalesDay = {
  date: string;
  currency: string;
  netSales: number;
  grossSales: number;
  discounts: number;
  refunds: number;
  tax: number;
  totalWithTax: number;
  orders: number;
  averageTicket: number;
  covers: number | null;
  topItems: { name: string; quantity: number; revenue: number; linked: boolean }[];
  itemCount: number;
  byHour: { hour: number; netSales: number }[];
  byBranch: Record<string, number>;
  compare: {
    /** The day is still open: compared with the same hours of the past days. */
    sameTimeOnly: boolean;
    sameDayLastWeek: number;
    vsLastWeekPct: number | null;
    fourWeekAverage: number;
    vsFourWeekPct: number | null;
  };
  completeness: {
    posConnected: boolean;
    feeds: { provider: string; lastSyncAt: string | null; stale: boolean }[];
    dayOpen: boolean;
    complete: boolean;
    stale: boolean;
  };
};

export type BuyLine = {
  itemId: string;
  name: string;
  unit: string;
  toBuy: number;
  packs: number | null;
  packUnit: string | null;
  need: number;
  safety: number;
  onHand: number;
  onOrder: number;
  expectedOnArrival: number;
  usageFactor: number;
  basis: "recipes" | "stock history";
  estimatedCost: number;
  /** Stock that won't last until this supplier's delivery: how much to get meanwhile, and the day it runs out. */
  shortBeforeDelivery: number | null;
  runsOutOn: string | null;
  usedIn: string[];
  flags: string[];
  reason: string;
};

export type BuyGroup = {
  supplierId: string | null;
  supplier: string | null;
  arrival: string;
  coverDays: string[];
  orderBy: string | null;
  minOrder: number | null;
  belowMinimum: boolean;
  lines: BuyLine[];
  estimatedTotal: number;
};

export type BuyPlan = {
  date: string;
  currency: string;
  suppliers: BuyGroup[];
  estimatedTotal: number;
  /** Codes + values, said in the reader's language (buy.note.<code>). */
  notes: ({ code: "unlinked_sales"; pct: number } | { code: "no_recipe"; count: number; names: string }
    | { code: "short_history"; days: number })[];
  closedDays: string[];
  events: string[];
  branch?: string;
  branches?: (BuyPlan & { branch: string; branchId: string })[];
};

export type Forecast = {
  date: string;
  dishes: { name: string; quantity: number; basis: string }[];
  dayFactor: number;
  dayReasons: string[];
  accuracy: { days: number; accuracyPct: number | null };
};

export type RecipeLine = {
  id?: string;
  itemId: string | null;
  item: string | null;
  stockUnit: string | null;
  subRecipe: string | null;
  quantity: number;
  unit: string;
  wastePct: number;
};

export type Recipe = {
  id: string;
  name: string;
  kind: "dish" | "addon" | "prep";
  status: "estimated" | "confirmed";
  menuItemId: string | null;
  price: number | null;
  cost: number;
  foodCostPct: number | null;
  problems: string[];
  lines: RecipeLine[];
};

export type RecipeOverview = {
  recipes: Recipe[];
  coverage: {
    days: number;
    shares: { confirmed: number; estimated: number; missing: number; unlinked: number; asIs: number };
    dishesWithoutRecipe: string[];
  };
  dishesWithoutRecipe: { id: string; name: string; price: number }[];
};

export type UnlinkedPosItems = {
  items: {
    name: string;
    quantity: number;
    revenue: number;
    share: number;
    suggestedMenuItemId: string | null;
    suggestedMenuItem: string | null;
  }[];
  count: number;
  unlinkedShare: number;
};

export type DemandEvent = {
  id: string;
  startsOn: string;
  endsOn: string;
  multiplier: number;
  extraCovers: number;
  note: string;
};

function token() {
  return localStorage.getItem("access_token") || "";
}

async function call<T>(path: string, method: "GET" | "POST" | "DELETE" = "GET", body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(data.error || data.message || "Request failed");
  return (data.data ?? data) as T;
}

const post = <T>(path: string, body: unknown) => call<T>(path, "POST", body);
const del = <T>(path: string) => call<T>(path, "DELETE");

export const getSalesDay = (date?: string) => call<SalesDay>(`/sales/day/${date ? `?date=${date}` : ""}`);
export const getBuyList = () => call<BuyPlan>("/sales/buy-list/");
export const getForecast = () => call<Forecast>("/sales/forecast/");
export const getRecipes = () => call<RecipeOverview>("/inventory/recipes/");
export const getUnlinkedPosItems = () => call<UnlinkedPosItems>("/sales/pos-items/");
export const getDemandEvents = () => call<DemandEvent[]>("/inventory/demand-events/");

export const linkPosItem = (body: { name: string; menuItemId?: string; inventoryItemId?: string; ignore?: boolean }) =>
  post<unknown>("/sales/pos-items/", body);
export const addPosItemsToMenu = (names?: string[]) => post<unknown>("/sales/pos-items/", { addToMenu: true, names });
export const saveRecipe = (body: {
  dish: string;
  status: "estimated" | "confirmed";
  lines: { itemId: string; quantity: number; unit: string; wastePct?: number }[];
}) => post<{ recipe: string; status: string; cost: number; foodCostPct: number | null }>("/inventory/recipes/", body);
export const confirmRecipes = (body: { recipes?: string[]; all?: boolean }) =>
  post<{ confirmed: string[]; count: number }>("/inventory/recipes/confirm/", body);
export const deleteRecipe = (id: string) => del<unknown>(`/inventory/recipes/${id}/`);
export const addDemandEvent = (body: {
  startsOn: string;
  endsOn?: string;
  extraCovers?: number;
  multiplier?: number;
  note: string;
}) => post<DemandEvent>("/inventory/demand-events/", body);
export const removeDemandEvent = (id: string) => del<unknown>(`/inventory/demand-events/${id}/`);

/** The printable buy list (a PDF the browser saves). */
export async function downloadBuyListPdf(): Promise<void> {
  const res = await fetch(`${API_BASE}/sales/buy-list/?download=pdf`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = (res.headers.get("Content-Disposition") || "").match(/filename="([^"]+)"/)?.[1] || "buy-list.pdf";
  link.click();
  URL.revokeObjectURL(url);
}
