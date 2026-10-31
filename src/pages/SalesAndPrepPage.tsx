import { useLanguage } from "../hooks/use-language";
import { PAGE_SHELL } from "@/lib/page-shell";
import { SalesDayCard } from "@/components/sales/SalesDayCard";
import { BuyListCard } from "@/components/sales/BuyListCard";
import { ForecastCard } from "@/components/sales/ForecastCard";
import { RecipeCoverageCard } from "@/components/sales/RecipeCoverageCard";

type SalesAndPrepPageProps = {
  /** When true, omit page shell and title (used inside Sales hub tabs). */
  embedded?: boolean;
};

/** The day's sales, what to buy for the next deliveries, and what makes that list exact (recipes, linked POS
 * names, events). Everything here Miya can also do on WhatsApp. */
export default function SalesAndPrepPage({ embedded = false }: SalesAndPrepPageProps = {}) {
  const { t } = useLanguage();

  const content = (
    <div className="space-y-6">
      <SalesDayCard />
      <BuyListCard />
      <div className="grid gap-6 xl:grid-cols-2">
        <RecipeCoverageCard />
        <ForecastCard />
      </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="min-h-screen">
      <div className={`${PAGE_SHELL} py-6 md:py-8 space-y-6`}>
        <header className="space-y-1">
          <h1 className="text-2xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {t("dashboard.sales.page_title") || "Sales Analysis"}
          </h1>
        </header>
        {content}
      </div>
    </div>
  );
}
