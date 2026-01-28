import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Package,
  AlertTriangle,
  PieChart,
  BarChart3
} from "lucide-react";
import POSIntegration from "@/components/POSIntegration";
import { useLanguage } from "@/hooks/use-language";

const monthlyData = [
  { monthKey: "months.jan", revenue: 45000, orders: 1200, waste: 8.5 },
  { monthKey: "months.feb", revenue: 52000, orders: 1350, waste: 7.2 },
  { monthKey: "months.mar", revenue: 48000, orders: 1280, waste: 9.1 },
  { monthKey: "months.apr", revenue: 58000, orders: 1450, waste: 6.8 },
  { monthKey: "months.may", revenue: 62000, orders: 1580, waste: 5.9 },
  { monthKey: "months.jun", revenue: 55000, orders: 1420, waste: 7.5 }
];

const topItems = [
  { nameKey: "analytics.top_items.margherita_pizza", sales: 245, revenue: 3675, trend: "up" },
  { nameKey: "analytics.top_items.caesar_salad", sales: 189, revenue: 2268, trend: "up" },
  { nameKey: "analytics.top_items.chicken_pasta", sales: 167, revenue: 2838, trend: "down" },
  { nameKey: "analytics.top_items.beef_burger", sales: 156, revenue: 2340, trend: "up" },
  { nameKey: "analytics.top_items.fish_tacos", sales: 134, revenue: 1876, trend: "down" }
];

const wasteAnalysis = [
  { categoryKey: "analytics.waste.categories.vegetables", percentage: 32, amount: "$420", trend: "down" },
  { categoryKey: "analytics.waste.categories.proteins", percentage: 28, amount: "$380", trend: "up" },
  { categoryKey: "analytics.waste.categories.dairy", percentage: 20, amount: "$260", trend: "down" },
  { categoryKey: "analytics.waste.categories.bread", percentage: 12, amount: "$150", trend: "stable" },
  { categoryKey: "analytics.waste.categories.other", percentage: 8, amount: "$90", trend: "stable" }
];

export default function Analytics() {
  const { t } = useLanguage();
  const tabs: Array<{ key: string; label: string }> = [
    { key: "overview", label: t("analytics.tabs.overview") },
    { key: "sales", label: t("analytics.tabs.sales") },
    { key: "pos", label: t("analytics.tabs.pos") },
    { key: "waste", label: t("analytics.tabs.waste") },
    { key: "trends", label: t("analytics.tabs.trends") },
  ];

  return (
    <div className="space-y-6 pt-4 pb-8 max-w-[1600px] mx-auto p-4 md:p-8">
      {/* Page Title */}
      <div className="mb-2">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">{t("analytics.title")}</h1>
        <p className="text-gray-500 mt-1 font-medium italic text-sm">{t("analytics.subtitle")}</p>
      </div>

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-slate-100 shadow-sm bg-white rounded-2xl hover:shadow-md transition-all">
          <CardHeader className="pb-2 px-6 pt-6 flex flex-row items-center justify-between space-y-0">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">{t("analytics.kpis.monthly_revenue")}</p>
            <DollarSign className="w-4 h-4 text-slate-300" />
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">$58,420</h3>
                <p className="text-xs text-slate-400 font-bold mt-1">{t("analytics.kpis.vs_last_month")}</p>
              </div>
              <Badge className="bg-green-50 text-green-700 border-none font-black text-[10px] tracking-widest uppercase">
                +12.5%
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm bg-white rounded-2xl hover:shadow-md transition-all">
          <CardHeader className="pb-2 px-6 pt-6 flex flex-row items-center justify-between space-y-0">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">{t("analytics.kpis.food_waste")}</p>
            <Package className="w-4 h-4 text-slate-300" />
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">5.9%</h3>
                <p className="text-xs text-slate-400 font-bold mt-1">{t("analytics.kpis.of_total_inventory")}</p>
              </div>
              <Badge className="bg-red-50 text-red-700 border-none font-black text-[10px] tracking-widest uppercase">
                +3.2%
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm bg-white rounded-2xl hover:shadow-md transition-all">
          <CardHeader className="pb-2 px-6 pt-6 flex flex-row items-center justify-between space-y-0">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">{t("analytics.kpis.labor_cost")}</p>
            <Users className="w-4 h-4 text-slate-300" />
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">28.3%</h3>
                <p className="text-xs text-slate-400 font-bold mt-1">{t("analytics.kpis.of_revenue")}</p>
              </div>
              <Badge className="bg-green-50 text-green-700 border-none font-black text-[10px] tracking-widest uppercase">
                -2.1%
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm bg-white rounded-2xl hover:shadow-md transition-all">
          <CardHeader className="pb-2 px-6 pt-6 flex flex-row items-center justify-between space-y-0">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">{t("analytics.kpis.total_orders")}</p>
            <BarChart3 className="w-4 h-4 text-slate-300" />
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">1,580</h3>
                <p className="text-xs text-slate-400 font-bold mt-1">{t("analytics.kpis.this_month")}</p>
              </div>
              <Badge className="bg-green-50 text-green-700 border-none font-black text-[10px] tracking-widest uppercase">
                +8.7%
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <div className="bg-gray-100 p-1.5 rounded-2xl w-fit">
          <TabsList className="bg-transparent border-none gap-1">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.key}
                value={tab.key}
                className="px-8 py-2.5 text-sm font-bold rounded-xl transition-all data-[state=active]:bg-white data-[state=active]:text-green-700 data-[state=active]:shadow-sm text-gray-500 hover:text-gray-700 capitalize"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <Card className="border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardHeader className="pb-4 border-b border-slate-50">
                <CardTitle className="text-lg font-black text-slate-900 tracking-tight">{t("analytics.overview.revenue_trend.title")}</CardTitle>
                <CardDescription className="font-medium text-slate-400">{t("analytics.overview.revenue_trend.subtitle")}</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-48 flex items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <div className="text-center space-y-2">
                    <BarChart3 className="w-10 h-10 mx-auto text-slate-200" />
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">{t("analytics.overview.chart_view")}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                  {monthlyData.slice(-3).map((data) => (
                    <div key={data.monthKey} className="space-y-1">
                      <p className="text-xs text-muted-foreground">{t(data.monthKey)}</p>
                      <p className="text-sm font-semibold">${data.revenue.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Items */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>{t("analytics.overview.top_selling.title")}</CardTitle>
                <CardDescription>{t("analytics.overview.top_selling.subtitle")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {topItems.map((item, index) => (
                  <div key={item.nameKey} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="w-6 h-6 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{t(item.nameKey)}</p>
                        <p className="text-xs text-muted-foreground">
                          {t("analytics.common.orders", { count: String(item.sales) })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">${item.revenue}</p>
                      {item.trend === "up" ? (
                        <TrendingUp className="w-3 h-3 text-success inline" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-destructive inline" />
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sales" className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>{t("analytics.sales.title")}</CardTitle>
              <CardDescription>{t("analytics.sales.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-secondary rounded-lg">
                <div className="text-center space-y-2">
                  <PieChart className="w-16 h-16 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{t("analytics.sales.coming_soon")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pos" className="space-y-6">
          <POSIntegration />
        </TabsContent>

        <TabsContent value="waste" className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>{t("analytics.waste.title")}</CardTitle>
              <CardDescription>{t("analytics.waste.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {wasteAnalysis.map((waste) => (
                <div key={waste.categoryKey} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-primary rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium">{t(waste.categoryKey)}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("analytics.waste.of_total_waste", {
                          percentage: String(waste.percentage),
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{waste.amount}</p>
                    <Badge variant={waste.trend === "down" ? "default" : waste.trend === "up" ? "destructive" : "secondary"}>
                      {waste.trend === "up"
                        ? t("analytics.common.trend.up")
                        : waste.trend === "down"
                          ? t("analytics.common.trend.down")
                          : t("analytics.common.trend.stable")}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>{t("analytics.trends.title")}</CardTitle>
              <CardDescription>{t("analytics.trends.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-gradient-warm rounded-lg border border-accent/20">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-warning mt-1" />
                    <div>
                      <h4 className="font-semibold">{t("analytics.trends.alert.title")}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t("analytics.trends.alert.body")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="h-48 flex items-center justify-center bg-secondary rounded-lg">
                  <div className="text-center space-y-2">
                    <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{t("analytics.trends.visualization")}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}