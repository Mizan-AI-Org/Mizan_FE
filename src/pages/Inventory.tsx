import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Search,
  Package,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Plus,
  Download,
  TrendingDown,
  Sparkles
} from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";

interface InventoryItem {
  id: number;
  name: string;
  category: string;
  currentStock: number;
  unit: string;
  minLevel: number;
  maxLevel: number;
  costPerUnit: number;
  supplier: string;
  expirationDate: string;
  lastUpdated: string;
  trend: string;
  aiRecommendation: string;
}

interface InventoryCardProps {
  item: InventoryItem;
  getStockStatus: (item: InventoryItem) => string;
  navigate: (path: string) => void;
}

const MemoizedInventoryCard = React.memo(({ item, getStockStatus, navigate }: InventoryCardProps) => {
  const status = getStockStatus(item);
  const stockStatusClass =
    status === "low" ? "text-destructive" :
      status === "high" ? "text-primary" :
        "text-yellow-600";

  const statusBadgeClass =
    status === "low" ? "bg-destructive/10 text-destructive" :
      status === "high" ? "bg-primary/10 text-primary" :
        "bg-yellow-100 text-yellow-800";

  const trendIcon =
    item.trend === "increasing" ? <TrendingUp className="h-4 w-4 text-green-500" /> :
      item.trend === "decreasing" ? <TrendingDown className="h-4 w-4 text-red-500" /> :
        null;

  return (
    <Card
      key={item.id}
      className="p-5 flex justify-between items-center bg-white border-slate-100 shadow-sm hover:shadow-md hover:border-green-100 transition-all duration-300 cursor-pointer rounded-2xl"
      onClick={() => navigate(`/dashboard/inventory/${item.id}`)}
    >
      <div className="flex items-center space-x-5">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${status === "low" ? "bg-red-50" :
          status === "high" ? "bg-green-50" :
            "bg-orange-50"
          }`}>
          <Package className={`h-7 w-7 ${status === "low" ? "text-red-500" : status === "high" ? "text-green-600" : "text-orange-500"}`} />
        </div>
        <div>
          <h3 className="font-black text-slate-900 text-lg tracking-tight">{item.name}</h3>
          <p className="text-sm text-slate-400 font-medium uppercase tracking-widest">{item.category}</p>
          <div className="flex items-center mt-2 text-sm text-slate-600 font-medium">
            Current: <span className={`font-black ml-1 ${status === "low" ? "text-red-600" : "text-slate-900"}`}>{item.currentStock} {item.unit}</span>
            <Badge variant="outline" className={cn(
              "ml-3 text-[10px] font-black uppercase tracking-widest px-2 py-0 border-none",
              status === "low" ? "bg-red-100 text-red-700" : status === "high" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
            )}>{status}</Badge>
          </div>
        </div>
      </div>

      <div className="text-right space-y-1.5">
        <div className="text-xl font-black text-slate-900">
          ${(item.currentStock * item.costPerUnit).toFixed(2)}
        </div>
        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
          ${item.costPerUnit}/{item.unit}
        </div>
        {item.aiRecommendation && (
          <div className={cn(
            "text-[11px] p-2 rounded-xl mt-2 font-bold flex items-center gap-2",
            item.trend === "critical" ? "bg-red-50 text-red-600" :
              item.trend === "decreasing" ? "bg-orange-50 text-orange-600" :
                "bg-green-50 text-green-600"
          )}>
            <TrendingUp className="w-3 h-3" />
            {item.aiRecommendation}
          </div>
        )}
      </div>
    </Card>
  );
});

const inventoryItems = [
  {
    id: 1,
    name: "Chicken Breast",
    category: "Protein",
    currentStock: 45,
    unit: "lbs",
    minLevel: 20,
    maxLevel: 100,
    costPerUnit: 6.50,
    supplier: "Fresh Foods Co",
    expirationDate: "2024-01-15",
    lastUpdated: "2 hours ago",
    trend: "decreasing",
    aiRecommendation: "Order 55 lbs by tomorrow"
  },
  {
    id: 2,
    name: "Roma Tomatoes",
    category: "Produce",
    currentStock: 8,
    unit: "lbs",
    minLevel: 15,
    maxLevel: 50,
    costPerUnit: 2.25,
    supplier: "Garden Fresh",
    expirationDate: "2024-01-12",
    lastUpdated: "1 hour ago",
    trend: "critical",
    aiRecommendation: "URGENT: Order 42 lbs today"
  },
  {
    id: 3,
    name: "Mozzarella Cheese",
    category: "Dairy",
    currentStock: 25,
    unit: "lbs",
    minLevel: 10,
    maxLevel: 60,
    costPerUnit: 4.75,
    supplier: "Dairy Direct",
    expirationDate: "2024-01-20",
    lastUpdated: "30 min ago",
    trend: "stable",
    aiRecommendation: "Order 15 lbs for weekend rush"
  },
  {
    id: 4,
    name: "Ground Beef 80/20",
    category: "Protein",
    currentStock: 32,
    unit: "lbs",
    minLevel: 25,
    maxLevel: 80,
    costPerUnit: 5.25,
    supplier: "Prime Meats",
    expirationDate: "2024-01-14",
    lastUpdated: "45 min ago",
    trend: "increasing",
    aiRecommendation: "Current levels sufficient"
  }
];

const aiInsights = {
  totalValue: "$2,847",
  wasteRisk: "Medium",
  orderRecommendations: 6,
  costSavings: "$127"
};

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const navigate = useNavigate();

  const categories = ["All", "Protein", "Produce", "Dairy", "Pantry"];

  const filteredItems = React.useMemo(() => {
    let items = inventoryItems;

    if (filterCategory !== "All") {
      items = items.filter(item => item.category === filterCategory);
    }

    if (searchTerm) {
      items = items.filter(
        item =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return items;
  }, [inventoryItems, filterCategory, searchTerm]);

  const getStockStatus = (item: InventoryItem) => {
    if (item.currentStock <= item.minLevel) return "low";
    if (item.currentStock <= item.minLevel * 1.5) return "low";
    return "high";
  };

  const getStockBadge = (status: string) => {
    switch (status) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>;
      case "low":
        return <Badge className="bg-warning text-warning-foreground">Low</Badge>;
      default:
        return <Badge className="bg-success text-success-foreground">Good</Badge>;
    }
  };

  return (
    <div className="space-y-6 pt-4 pb-8 max-w-[1600px] mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Inventory Management</h1>
          <p className="text-gray-500 mt-1 font-medium italic text-sm">Track stock levels and AI-powered recommendations</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl font-bold border-slate-200">
            <Download className="w-4 h-4 mr-2" />
            Report
          </Button>
          <Button className="bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold px-6 shadow-sm hover:shadow-md transition-all h-11">
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* AI Insights Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-slate-100 shadow-sm bg-white rounded-2xl hover:shadow-md transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Total Value</p>
                <p className="text-2xl font-black text-slate-900">{aiInsights.totalValue}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                <Package className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm bg-white rounded-2xl hover:shadow-md transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Waste Risk</p>
                <p className="text-2xl font-black text-slate-900">{aiInsights.wasteRisk}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm bg-white rounded-2xl hover:shadow-md transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">AI Insights</p>
                <p className="text-2xl font-black text-slate-900">{aiInsights.orderRecommendations}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm bg-white rounded-2xl hover:shadow-md transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Savings</p>
                <p className="text-2xl font-black text-slate-900">{aiInsights.costSavings}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-soft">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search inventory items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {categories.map(category => (
                <Button
                  key={category}
                  variant={filterCategory === category ? "default" : "outline"}
                  onClick={() => setFilterCategory(category)}
                  size="sm"
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Current Inventory</CardTitle>
          <CardDescription>Real-time stock levels with AI recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredItems.map(item => {
              const status = getStockStatus(item);
              return (
                <MemoizedInventoryCard
                  key={item.id}
                  item={item}
                  getStockStatus={getStockStatus}
                  navigate={navigate}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* AI Generated Purchase List */}
      <Card className="border-green-100 shadow-sm rounded-2xl overflow-hidden bg-green-50/30">
        <CardHeader className="bg-white/50 border-b border-green-50">
          <CardTitle className="flex items-center gap-2 text-xl font-black text-gray-900">
            <Sparkles className="w-5 h-5 text-green-600" />
            AI-Generated Purchase List
          </CardTitle>
          <CardDescription className="font-medium text-slate-500">Optimized based on historical patterns and demand forecast</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-3">
            {[
              { name: "Roma Tomatoes", qty: "42 lbs", reason: "Critical shortage" },
              { name: "Chicken Breast", qty: "55 lbs", reason: "Weekend demand spike" },
              { name: "Mozzarella Cheese", qty: "15 lbs", reason: "Pizza Friday prep" }
            ].map((p, i) => (
              <div key={i} className="flex justify-between items-center p-4 bg-white rounded-xl shadow-sm border border-slate-50">
                <div>
                  <span className="font-black text-slate-900 block">{p.name}</span>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">{p.reason}</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-green-700">{p.qty}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <span className="text-lg font-black text-slate-900 uppercase tracking-widest">Estimated Total</span>
              <span className="text-3xl font-black text-green-700">$436.75</span>
            </div>
            <div className="flex gap-4">
              <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold h-12 shadow-sm">
                Send to Suppliers
              </Button>
              <Button variant="outline" className="rounded-xl font-bold h-12 border-slate-200">
                Modify Orders
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}