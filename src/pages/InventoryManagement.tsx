import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
    Package,
    AlertTriangle,
    ShoppingCart,
    BarChart3,
    ChevronRight,
    Users,
    DollarSign,
    TrendingDown,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { PAGE_SHELL } from "@/lib/page-shell";
import { DailyKPI } from "../lib/types";
import { cn } from "@/lib/utils";

const INVENTORY_SECTIONS = [
    {
        title: "Manage Inventory Items",
        description: "Add, edit, or remove individual stock items.",
        icon: Package,
        color: "text-blue-500",
        href: "/dashboard/inventory/items",
    },
    {
        title: "Suppliers",
        description: "View and manage your list of suppliers.",
        icon: Users,
        color: "text-purple-500",
        href: "/dashboard/inventory/suppliers",
    },
    {
        title: "Purchase Orders",
        description: "Create and track incoming purchase orders.",
        icon: ShoppingCart,
        color: "text-green-500",
        href: "/dashboard/inventory/purchase-orders",
    },
    {
        title: "Stock Adjustments",
        description: "Record waste and other stock-level changes.",
        icon: AlertTriangle,
        color: "text-red-500",
        href: "/dashboard/inventory/adjustments",
    },
];

export default function InventoryManagement() {
    const { accessToken } = useAuth();

    const { data: dailyKpis, isLoading: isLoadingKpis, isError: isErrorKpis } = useQuery<DailyKPI[]>({
        queryKey: ["dailyKpis", accessToken],
        queryFn: () => api.getDailyKpis(accessToken!),
        enabled: !!accessToken,
    });

    const kpiRows = Array.isArray(dailyKpis) ? dailyKpis : [];
    const inventoryValue = kpiRows.reduce((acc, kpi) => acc + (kpi.inventory_value || 0), 0);
    const foodWasteCost = kpiRows.reduce((acc, kpi) => acc + (kpi.food_waste_cost || 0), 0);
    const revenueLostToStockouts = kpiRows.reduce((acc, kpi) => acc + (kpi.revenue_lost_to_stockouts || 0), 0);

    if (isLoadingKpis) {
        return <div className={`${PAGE_SHELL} py-8`}>Loading inventory KPIs...</div>;
    }

    if (isErrorKpis) {
        return <div className={`${PAGE_SHELL} py-8`}>Could not load inventory KPIs. Open items, suppliers, or purchase orders from the tiles below.</div>;
    }

    return (
        <div className="min-h-screen pb-8 pt-4 font-sans text-foreground antialiased">
            <div className={`${PAGE_SHELL} py-6 md:py-8 space-y-6`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Inventory Overview</h1>
                        <p className="text-gray-500 mt-1 font-medium italic text-sm">Centralized hub for all your restaurant's inventory needs</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card className="border-slate-100 shadow-sm bg-card rounded-2xl hover:shadow-md transition-all">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-6 pt-6">
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Total Value</p>
                            <DollarSign className="h-4 w-4 text-slate-300" />
                        </CardHeader>
                        <CardContent className="px-6 pb-6">
                            <div className="text-2xl font-black text-slate-900 tracking-tight">${inventoryValue.toFixed(2)}</div>
                            <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-tighter">Current Stock Sum</p>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-100 shadow-sm bg-card rounded-2xl hover:shadow-md transition-all">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-6 pt-6">
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Food Waste Cost</p>
                            <BarChart3 className="h-4 w-4 text-slate-300" />
                        </CardHeader>
                        <CardContent className="px-6 pb-6">
                            <div className="text-2xl font-black text-slate-900 tracking-tight">${foodWasteCost.toFixed(2)}</div>
                            <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-tighter">(Last 30 Days)</p>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-100 shadow-sm bg-card rounded-2xl hover:shadow-md transition-all">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-6 pt-6">
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Lost Revenue</p>
                            <TrendingDown className="h-4 w-4 text-slate-300" />
                        </CardHeader>
                        <CardContent className="px-6 pb-6">
                            <div className="text-2xl font-black text-slate-900 tracking-tight">${revenueLostToStockouts.toFixed(2)}</div>
                            <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-tighter">Due to Stockouts</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
                    {INVENTORY_SECTIONS.map((section) => (
                        <Link
                            key={section.href}
                            to={section.href}
                            className="block w-full text-left rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                        >
                            <Card className="border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1 bg-card flex items-center justify-between p-7 rounded-2xl group cursor-pointer border-l-4 border-l-transparent hover:border-l-indigo-600">
                                <div className="flex items-center gap-6">
                                    <div className={cn("w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center transition-transform duration-500 group-hover:scale-110", section.color)}>
                                        <section.icon className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 tracking-tight">{section.title}</h3>
                                        <p className="text-sm font-medium text-slate-500 mt-1">{section.description}</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
