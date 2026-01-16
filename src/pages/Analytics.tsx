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

const monthlyData = [
  { month: "Jan", revenue: 45000, orders: 1200, waste: 8.5 },
  { month: "Feb", revenue: 52000, orders: 1350, waste: 7.2 },
  { month: "Mar", revenue: 48000, orders: 1280, waste: 9.1 },
  { month: "Apr", revenue: 58000, orders: 1450, waste: 6.8 },
  { month: "May", revenue: 62000, orders: 1580, waste: 5.9 },
  { month: "Jun", revenue: 55000, orders: 1420, waste: 7.5 }
];

const topItems = [
  { name: "Margherita Pizza", sales: 245, revenue: 3675, trend: "up" },
  { name: "Caesar Salad", sales: 189, revenue: 2268, trend: "up" },
  { name: "Chicken Pasta", sales: 167, revenue: 2838, trend: "down" },
  { name: "Beef Burger", sales: 156, revenue: 2340, trend: "up" },
  { name: "Fish Tacos", sales: 134, revenue: 1876, trend: "down" }
];

const wasteAnalysis = [
  { category: "Vegetables", percentage: 32, amount: "$420", trend: "down" },
  { category: "Proteins", percentage: 28, amount: "$380", trend: "up" },
  { category: "Dairy", percentage: 20, amount: "$260", trend: "down" },
  { category: "Bread", percentage: 12, amount: "$150", trend: "stable" },
  { category: "Other", percentage: 8, amount: "$90", trend: "stable" }
];

export default function Analytics() {
  return (
    <div className="space-y-6 pt-4 pb-8 max-w-[1600px] mx-auto p-4 md:p-8">
      {/* Page Title */}
      <div className="mb-2">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Analytics & Reports</h1>
        <p className="text-gray-500 mt-1 font-medium italic text-sm">Actionable insights driven by Mizan AI</p>
      </div>

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-slate-100 shadow-sm bg-white rounded-2xl hover:shadow-md transition-all">
          <CardHeader className="pb-2 px-6 pt-6 flex flex-row items-center justify-between space-y-0">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Monthly Revenue</p>
            <DollarSign className="w-4 h-4 text-slate-300" />
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">$58,420</h3>
                <p className="text-xs text-slate-400 font-bold mt-1">vs last month</p>
              </div>
              <Badge className="bg-green-50 text-green-700 border-none font-black text-[10px] tracking-widest uppercase">
                +12.5%
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm bg-white rounded-2xl hover:shadow-md transition-all">
          <CardHeader className="pb-2 px-6 pt-6 flex flex-row items-center justify-between space-y-0">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Food Waste</p>
            <Package className="w-4 h-4 text-slate-300" />
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">5.9%</h3>
                <p className="text-xs text-slate-400 font-bold mt-1">of total inventory</p>
              </div>
              <Badge className="bg-red-50 text-red-700 border-none font-black text-[10px] tracking-widest uppercase">
                +3.2%
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm bg-white rounded-2xl hover:shadow-md transition-all">
          <CardHeader className="pb-2 px-6 pt-6 flex flex-row items-center justify-between space-y-0">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Labor Cost</p>
            <Users className="w-4 h-4 text-slate-300" />
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">28.3%</h3>
                <p className="text-xs text-slate-400 font-bold mt-1">of revenue</p>
              </div>
              <Badge className="bg-green-50 text-green-700 border-none font-black text-[10px] tracking-widest uppercase">
                -2.1%
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm bg-white rounded-2xl hover:shadow-md transition-all">
          <CardHeader className="pb-2 px-6 pt-6 flex flex-row items-center justify-between space-y-0">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Total Orders</p>
            <BarChart3 className="w-4 h-4 text-slate-300" />
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">1,580</h3>
                <p className="text-xs text-slate-400 font-bold mt-1">this month</p>
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
            {["overview", "sales", "waste", "trends"].map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="px-8 py-2.5 text-sm font-bold rounded-xl transition-all data-[state=active]:bg-white data-[state=active]:text-green-700 data-[state=active]:shadow-sm text-gray-500 hover:text-gray-700 capitalize"
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <Card className="border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardHeader className="pb-4 border-b border-slate-50">
                <CardTitle className="text-lg font-black text-slate-900 tracking-tight">Revenue Trend</CardTitle>
                <CardDescription className="font-medium text-slate-400">Monthly revenue over the last 6 months</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-48 flex items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <div className="text-center space-y-2">
                    <BarChart3 className="w-10 h-10 mx-auto text-slate-200" />
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Chart View</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                  {monthlyData.slice(-3).map((data) => (
                    <div key={data.month} className="space-y-1">
                      <p className="text-xs text-muted-foreground">{data.month}</p>
                      <p className="text-sm font-semibold">${data.revenue.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Items */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Top Selling Items</CardTitle>
                <CardDescription>Best performers this month</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {topItems.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="w-6 h-6 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.sales} orders</p>
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
              <CardTitle>Sales Analytics</CardTitle>
              <CardDescription>Detailed sales performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-secondary rounded-lg">
                <div className="text-center space-y-2">
                  <PieChart className="w-16 h-16 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Sales analytics coming soon</p>
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
              <CardTitle>Waste Analysis</CardTitle>
              <CardDescription>Food waste breakdown by category</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {wasteAnalysis.map((waste) => (
                <div key={waste.category} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-primary rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium">{waste.category}</p>
                      <p className="text-xs text-muted-foreground">{waste.percentage}% of total waste</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{waste.amount}</p>
                    <Badge variant={waste.trend === "down" ? "default" : waste.trend === "up" ? "destructive" : "secondary"}>
                      {waste.trend}
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
              <CardTitle>Trend Analysis</CardTitle>
              <CardDescription>AI-powered insights and predictions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-gradient-warm rounded-lg border border-accent/20">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-warning mt-1" />
                    <div>
                      <h4 className="font-semibold">Seasonal Trend Alert</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Based on historical data, expect 25% increase in soup orders next week due to weather forecast.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="h-48 flex items-center justify-center bg-secondary rounded-lg">
                  <div className="text-center space-y-2">
                    <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Trend analysis visualization</p>
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