import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Package,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Plus,
  Download,
  TrendingDown
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
  getStockStatus: (item: InventoryItem) => "low" | "high" | "optimal";
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
      className="p-4 flex justify-between items-center hover:shadow-lg transition-shadow duration-200 cursor-pointer"
      onClick={() => navigate(`/dashboard/inventory/${item.id}`)} // Example navigation
    >
      <div className="flex items-center space-x-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${status === "low" ? "bg-destructive/20" :
            status === "high" ? "bg-primary/20" :
              "bg-yellow-100"
          }`}>
          <Package className={`h-6 w-6 ${stockStatusClass}`} />
        </div>
        <div>
          <h3 className="font-semibold text-lg">{item.name}</h3>
          <p className="text-sm text-muted-foreground">{item.category}</p>
          <div className="flex items-center mt-1 text-sm text-gray-600">
            Current: <span className={`font-medium ml-1 ${stockStatusClass}`}>{item.currentStock} {item.unit}</span>
            <Badge variant="outline" className={`ml-2 text-xs ${statusBadgeClass}`}>{status}</Badge>
          </div>
        </div>
      </div>

      <div className="text-right space-y-2">
        <div className="text-lg font-semibold">
          ${(item.currentStock * item.costPerUnit).toFixed(2)}
        </div>
        <div className="text-sm text-muted-foreground">
          ${item.costPerUnit}/{item.unit}
        </div>
        {item.aiRecommendation && (
          <div className={`text-xs p-2 rounded ${item.trend === "critical" ? "bg-destructive/10 text-destructive" :
              item.trend === "decreasing" ? "bg-warning/10 text-warning" :
                "bg-primary/10 text-primary"
            }`}>
            🤖 {item.aiRecommendation}
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
    if (item.currentStock <= item.minLevel) return "critical";
    if (item.currentStock <= item.minLevel * 1.5) return "low";
    return "good";
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground">Track stock levels and AI-powered recommendations</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button className="bg-gradient-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* AI Insights Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Total Inventory Value</p>
                <p className="text-2xl font-bold">{aiInsights.totalValue}</p>
              </div>
              <Package className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Waste Risk Level</p>
                <p className="text-2xl font-bold">{aiInsights.wasteRisk}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">AI Recommendations</p>
                <p className="text-2xl font-bold">{aiInsights.orderRecommendations}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Potential Savings</p>
                <p className="text-2xl font-bold">{aiInsights.costSavings}</p>
              </div>
              <Calendar className="w-8 h-8 text-accent" />
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
      <Card className="shadow-soft bg-gradient-warm border-accent/20">
        <CardHeader>
          <CardTitle className="flex items-center">
            🤖 AI-Generated Purchase List for Tomorrow
          </CardTitle>
          <CardDescription>Based on consumption patterns, weather, and events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-card rounded-lg">
              <span className="font-medium">Roma Tomatoes</span>
              <div className="text-right">
                <span className="font-bold">42 lbs</span>
                <div className="text-sm text-muted-foreground">Critical shortage</div>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 bg-card rounded-lg">
              <span className="font-medium">Chicken Breast</span>
              <div className="text-right">
                <span className="font-bold">55 lbs</span>
                <div className="text-sm text-muted-foreground">Weekend demand spike</div>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 bg-card rounded-lg">
              <span className="font-medium">Mozzarella Cheese</span>
              <div className="text-right">
                <span className="font-bold">15 lbs</span>
                <div className="text-sm text-muted-foreground">Pizza Friday prep</div>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold">Estimated Total:</span>
              <span className="text-2xl font-bold text-primary">$436.75</span>
            </div>
            <div className="flex gap-3">
              <Button className="flex-1 bg-gradient-primary hover:bg-primary/90">
                Send to Suppliers
              </Button>
              <Button variant="outline">
                Modify Orders
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}