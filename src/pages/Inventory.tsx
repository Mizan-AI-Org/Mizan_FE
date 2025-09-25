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
  Download
} from "lucide-react";

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
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = ["All", "Protein", "Produce", "Dairy", "Pantry"];

  const filteredItems = inventoryItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStockStatus = (item: any) => {
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
                  variant={selectedCategory === category ? "default" : "outline"}
                  onClick={() => setSelectedCategory(category)}
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
                <div key={item.id} className="flex items-center justify-between p-4 bg-secondary rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Package className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <h3 className="font-semibold">{item.name}</h3>
                        {getStockBadge(status)}
                        <Badge variant="outline">{item.category}</Badge>
                      </div>
                      <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                        <span>Stock: <strong>{item.currentStock} {item.unit}</strong></span>
                        <span>Min: {item.minLevel} {item.unit}</span>
                        <span>Expires: {item.expirationDate}</span>
                        <span>Supplier: {item.supplier}</span>
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
                      <div className={`text-xs p-2 rounded ${
                        item.trend === "critical" ? "bg-destructive/10 text-destructive" :
                        item.trend === "decreasing" ? "bg-warning/10 text-warning" : 
                        "bg-primary/10 text-primary"
                      }`}>
                        🤖 {item.aiRecommendation}
                      </div>
                    )}
                  </div>
                </div>
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