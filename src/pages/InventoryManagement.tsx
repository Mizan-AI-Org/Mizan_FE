import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Package,
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    ShoppingCart,
    BarChart3,
    Calendar,
    ChevronRight,
    Users,
    Truck,
    DollarSign,
    TrendingDown
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { DailyKPI } from "../lib/types";

export default function InventoryManagement() {
    const { accessToken } = useAuth();

    const { data: dailyKpis, isLoading: isLoadingKpis, isError: isErrorKpis } = useQuery<DailyKPI[]>({
        queryKey: ["dailyKpis", accessToken],
        queryFn: () => api.getDailyKpis(accessToken!),
        enabled: !!accessToken,
    });

    const inventoryValue = dailyKpis?.reduce((acc, kpi) => acc + (kpi.inventory_value || 0), 0) || 0;
    const foodWasteCost = dailyKpis?.reduce((acc, kpi) => acc + (kpi.food_waste_cost || 0), 0) || 0;
    const revenueLostToStockouts = dailyKpis?.reduce((acc, kpi) => acc + (kpi.revenue_lost_to_stockouts || 0), 0) || 0;

    if (isLoadingKpis) {
        return <div>Loading Inventory KPIs...</div>;
    }

    if (isErrorKpis) {
        return <div>Error loading Inventory KPIs.</div>;
    }

    const inventorySections = [
        {
            title: "Manage Inventory Items",
            description: "Add, edit, or remove individual stock items.",
            icon: Package,
            link: "/dashboard/inventory/items",
            color: "text-blue-500",
        },
        {
            title: "Suppliers",
            description: "View and manage your list of suppliers.",
            icon: Users,
            link: "/dashboard/inventory/suppliers",
            color: "text-purple-500",
        },
        {
            title: "Purchase Orders",
            description: "Create and track incoming purchase orders.",
            icon: ShoppingCart,
            link: "/dashboard/inventory/purchase-orders",
            color: "text-green-500",
        },
        {
            title: "Stock Adjustments",
            description: "Record changes in stock levels due to waste, theft, etc.",
            icon: AlertTriangle,
            link: "/dashboard/inventory/adjustments",
            color: "text-red-500",
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-subtle p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200/50 dark:border-blue-800/50 shadow-lg">
                    <CardHeader className="pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex-1">
                                <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                                    <Package className="w-6 h-6 text-blue-600" />
                                    Inventory Management Overview
                                </CardTitle>
                                <CardDescription className="mt-1">
                                    Centralized hub for all your restaurant's inventory needs.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                {/* Inventory KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                    <Card className="shadow-soft">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">${inventoryValue.toFixed(2)}</div>
                            <p className="text-xs text-muted-foreground">
                                Sum of all items currently in stock.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-soft">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Food Waste Cost (Last 30 Days)</CardTitle>
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">${foodWasteCost.toFixed(2)}</div>
                            <p className="text-xs text-muted-foreground">
                                Estimated cost of wasted food.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-soft">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Revenue Lost to Stockouts</CardTitle>
                            <TrendingDown className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">${revenueLostToStockouts.toFixed(2)}</div>
                            <p className="text-xs text-muted-foreground">
                                Estimated revenue lost due to unavailable items.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Inventory Sections Navigation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-6">
                    {inventorySections.map((section) => (
                        <Link to={section.link} key={section.title}>
                            <Card className="shadow-soft hover:shadow-strong transition-all duration-300 hover:scale-[1.02] flex items-center justify-between p-6">
                                <div className="flex items-center gap-4">
                                    <section.icon className={`w-8 h-8 ${section.color}`} />
                                    <div>
                                        <CardTitle className="text-lg">{section.title}</CardTitle>
                                        <CardDescription>{section.description}</CardDescription>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
