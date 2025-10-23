import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Star,
  TrendingUp,
  DollarSign,
  Edit,
  Image,
  BarChart3,
  Users
} from "lucide-react";

const upcomingFeatures = [
  {
    title: "Dynamic Menu Builder",
    description: "Drag-and-drop menu creation with real-time preview",
    icon: Edit,
    status: "planned"
  },
  {
    title: "Smart Pricing Analytics",
    description: "AI-powered pricing recommendations based on demand",
    icon: DollarSign,
    status: "planned"
  },
  {
    title: "Menu Performance Insights",
    description: "Track popular items and optimize menu layout",
    icon: BarChart3,
    status: "planned"
  },
  {
    title: "Customer Preferences",
    description: "Analyze ordering patterns and menu preferences",
    icon: Users,
    status: "planned"
  }
];

const sampleMenuItems = [
  { item: "Margherita Pizza", price: "$18.99", popularity: "high", category: "Pizza" },
  { item: "Caesar Salad", price: "$12.99", popularity: "medium", category: "Salads" },
  { item: "Pasta Carbonara", price: "$16.99", popularity: "high", category: "Pasta" },
  { item: "Grilled Salmon", price: "$24.99", popularity: "low", category: "Mains" }
];

export default function MenuManagement() {
  return (
    <div className="min-h-screen bg-gradient-subtle p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Coming Soon Banner */}
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200/50 dark:border-green-800/50 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-green-600" />
                  Menu Management System
                </CardTitle>
                <CardDescription className="mt-1">
                  Coming Soon - Intelligent menu creation and optimization
                </CardDescription>
              </div>
              <Badge variant="secondary" className="w-fit bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                🚀 Coming Soon
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
          </CardContent>
        </Card>

        {/* Upcoming Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {upcomingFeatures.map((feature) => (
            <Card key={feature.title} className="shadow-soft hover:shadow-strong transition-all duration-300 hover:scale-[1.02]">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <feature.icon className="w-5 h-5 text-muted-foreground" />
                  <Badge variant="outline" className="text-xs">
                    Planned
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sample Menu Items */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Sample Menu Items
            </CardTitle>
            <CardDescription>Preview of menu management interface</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sampleMenuItems.map((menuItem, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {menuItem.popularity === "high" ? (
                    <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                  ) : menuItem.popularity === "medium" ? (
                    <TrendingUp className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{menuItem.item}</p>
                    <p className="text-xs text-muted-foreground">{menuItem.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={menuItem.popularity === "high" ? "default" : menuItem.popularity === "medium" ? "secondary" : "outline"}
                    className="flex-shrink-0"
                  >
                    {menuItem.popularity}
                  </Badge>
                  <span className="text-sm font-semibold">{menuItem.price}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Future Quick Actions</CardTitle>
            <CardDescription>Planned menu management features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Button className="h-16 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-soft hover:shadow-strong transition-all duration-300" disabled>
                <div className="text-center">
                  <div className="font-semibold">Create New Item</div>
                </div>
              </Button>
              <Button variant="outline" className="h-16 border-2 hover:bg-secondary/50 transition-all duration-300" disabled>
                <div className="text-center">
                  <div className="font-semibold">Menu Analytics</div>
                </div>
              </Button>
              <Button variant="outline" className="h-16 border-2 hover:bg-secondary/50 transition-all duration-300 sm:col-span-2 lg:col-span-1" disabled>
                <div className="text-center">
                  <div className="font-semibold">Update Pricing</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}