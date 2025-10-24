import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    TrendingDown,
    TrendingUp,
    Package,
    Users,
    AlertTriangle,
    CheckCircle,
    Clock,
    DollarSign,
    Info,
    Minus,
} from "lucide-react";

const KpisData = [
    {
        total_revenue: "",
        total_orders: "",
        staff_count: "",
        inventory_value: "",
        updated_at: new Date().toISOString()
    },
    {
        total_revenue: "",
        total_orders: "",
        staff_count: "",
        inventory_value: "",
        updated_at: new Date(Date.now() - 86400000).toISOString()
    }
];

const Tasks = [
    {
        title: "",
        priority: "",
        // Due Date Format,
        due_date: "",
        status: ""
    },
    {
        title: "",
        priority: "",
        // Due Date Format,
        due_date: "",
        status: ""
    },
    {
        title: "",
        priority: "",
        // Due Date Format,
        due_date: "",
        status: ""
    }
];

const Alerts = [
    {
        message: "",
        alert_type: ""
    },
    {
        message: "",
        alert_type: ""
    }
];

export default function AdminDashboard() {
    const kpisData = KpisData;
    const tasksData = Tasks;
    const alertsData = Alerts;

    // Improved trend calculation with null safety
    const getTrend = (currentValue, previousValue) => {
        if (previousValue === null || previousValue === 0) {
            return { change: "N/A", trend: "stable", percentageChange: 0 };
        }
        const percentageChange = ((currentValue - previousValue) / previousValue) * 100;
        let trend = "stable";

        if (Math.abs(percentageChange) < 0.01) {
            trend = "stable";
        } else if (percentageChange > 0) {
            trend = "up";
        } else {
            trend = "down";
        }

        const change = `${percentageChange > 0 ? '+' : ''}${percentageChange.toFixed(1)}%`;
        return { change, trend, percentageChange };
    };

    // Build KPIs with better data handling
    const kpis = kpisData && kpisData.length > 0 ? [
        {
            title: "Total Revenue",
            value: `$${kpisData[0].total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            ...getTrend(
                kpisData[0].total_revenue,
                kpisData.length > 1 ? kpisData[1].total_revenue : null
            ),
            icon: DollarSign,
            description: "today",
            color: "text-green-600"
        },
        {
            title: "Total Orders",
            value: kpisData[0].total_orders.toString(),
            ...getTrend(
                kpisData[0].total_orders,
                kpisData.length > 1 ? kpisData[1].total_orders : null
            ),
            icon: Package,
            description: "today",
            color: "text-blue-600"
        },
        {
            title: "Staff",
            value: kpisData[0].staff_count.toString(),
            change: "N/A",
            trend: "stable",
            percentageChange: 0,
            icon: Users,
            description: "currently active",
            color: "text-purple-600"
        },
        {
            title: "Inventory Value",
            value: `$${kpisData[0].inventory_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            ...getTrend(
                kpisData[0].inventory_value,
                kpisData.length > 1 ? kpisData[1].inventory_value : null
            ),
            icon: Package,
            description: "current stock",
            color: "text-orange-600"
        }
    ] : [];

    // Format tasks for today
    const todayTasks = tasksData ? tasksData.filter(task =>
        new Date(task.due_date).toDateString() === new Date().toDateString()
    ).map(task => ({
        task: task.title,
        priority: task.priority.toLowerCase(),
        time: task.due_date ? new Date(task.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
        status: task.status.toLowerCase()
    })) : [];

    // Format alerts
    const alerts = alertsData ? alertsData.map(alert => ({
        message: alert.message,
        type: alert.alert_type.toLowerCase(),
    })) : [];

    // Get last updated time
    const lastUpdated = kpisData && kpisData.length > 0
        ? new Date(kpisData[0].updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'N/A';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* AI Insights Banner */}
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-lg">
                    <CardHeader className="pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex-1">
                                <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                                    🤖 AI Insights for Today
                                </CardTitle>
                                <CardDescription className="mt-1">
                                    Based on weather, events, and historical data
                                </CardDescription>
                            </div>
                            <Badge variant="secondary" className="w-fit">
                                Updated {lastUpdated}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-white/50 rounded-lg p-4">
                            <p className="text-sm text-muted-foreground">
                                No AI recommendations available at this time. Check back later for insights based on your business data.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* KPIs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {kpis.map((kpi) => (
                        <Card key={kpi.title} className="shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 border-l-4 border-l-transparent hover:border-l-blue-500">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <div className={`p-2 rounded-lg bg-slate-100 ${kpi.color}`}>
                                        <kpi.icon className="w-5 h-5" />
                                    </div>
                                    {kpi.change !== "N/A" && (
                                        <Badge
                                            variant={kpi.trend === "down" ? "destructive" : kpi.trend === "up" ? "default" : "secondary"}
                                            className={`${kpi.trend === "up" ? "bg-green-100 text-green-700 border-green-200" :
                                                kpi.trend === "down" ? "bg-red-100 text-red-700 border-red-200" :
                                                    "bg-slate-100 text-slate-700 border-slate-200"
                                                }`}
                                        >
                                            <span className="flex items-center gap-1">
                                                {kpi.change}
                                                {kpi.trend === "up" && <TrendingUp className="h-3 w-3" />}
                                                {kpi.trend === "down" && <TrendingDown className="h-3 w-3" />}
                                                {kpi.trend === "stable" && <Minus className="h-3 w-3" />}
                                            </span>
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-1">
                                    <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">{kpi.value}</h3>
                                    <p className="text-sm font-medium text-slate-700">{kpi.title}</p>
                                    <p className="text-xs text-muted-foreground capitalize">{kpi.description}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Today's Tasks */}
                    <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="w-5 h-5" />
                                Today's Priority Tasks
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {todayTasks.length > 0 ? (
                                todayTasks.map((task, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border hover:bg-slate-100 transition-colors">
                                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                                            {task.status === "completed" ? (
                                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                                            ) : (
                                                <div className="w-5 h-5 rounded-full border-2 border-slate-400 flex-shrink-0" />
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className={`text-sm font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : "text-slate-900"}`}>
                                                    {task.task}
                                                </p>
                                                <p className="text-xs text-muted-foreground">{task.time}</p>
                                            </div>
                                        </div>
                                        <Badge
                                            variant={task.priority === "high" ? "destructive" : task.priority === "medium" ? "default" : "secondary"}
                                            className="ml-2 flex-shrink-0 capitalize"
                                        >
                                            {task.priority}
                                        </Badge>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <p>No tasks scheduled for today</p>
                                </div>
                            )}
                            <Button className="w-full mt-4" variant="outline">
                                View All Tasks
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Alerts */}
                    <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5" />
                                System Alerts
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {alerts.length > 0 ? (
                                alerts.map((alert, index) => (
                                    <div key={index} className={`flex items-start space-x-3 p-3 rounded-lg border ${alert.type === "error" ? "bg-red-50 border-red-200" :
                                        alert.type === "warning" ? "bg-orange-50 border-orange-200" :
                                            "bg-blue-50 border-blue-200"
                                        }`}>
                                        {alert.type === "error" ? (
                                            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0 text-red-600" />
                                        ) : alert.type === "warning" ? (
                                            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0 text-orange-600" />
                                        ) : (
                                            <Info className="w-5 h-5 mt-0.5 flex-shrink-0 text-blue-600" />
                                        )}
                                        <p className="text-sm leading-relaxed flex-1">{alert.message}</p>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500 opacity-50" />
                                    <p>No active alerts</p>
                                </div>
                            )}
                            <Button className="w-full mt-4" variant="outline">
                                Manage Alerts
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Actions */}
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                        <CardDescription>Frequently used restaurant operations</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <Button
                                variant="outline"
                                className="h-16 border-2 hover:bg-slate-50 transition-all duration-300"
                            >
                                <div className="text-center">
                                    <div className="font-semibold">Generate Tomorrow's Orders</div>
                                </div>
                            </Button>
                            <Button
                                variant="outline"
                                className="h-16 border-2 hover:bg-slate-50 transition-all duration-300"
                            >
                                <div className="text-center">
                                    <div className="font-semibold">Update Inventory Count</div>
                                </div>
                            </Button>
                            <Button
                                variant="outline"
                                className="h-16 border-2 hover:bg-slate-50 transition-all duration-300 sm:col-span-2 lg:col-span-1"
                            >
                                <div className="text-center">
                                    <div className="font-semibold">Schedule Emergency Staff</div>
                                </div>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}