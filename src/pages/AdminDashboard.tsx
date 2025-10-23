import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../hooks/use-auth";
import { DailyKPI, Alert, Task } from "../lib/types"; // Updated import path
import { api } from "../lib/api"; // Import the api instance
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { toast } from "sonner";

export default function AdminDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const accessToken = localStorage.getItem('access_token') || '';

    const { data: kpisData, isLoading: isLoadingKpis, error: kpisError } = useQuery<DailyKPI[]>(
        { queryKey: ['dailyKpis'], queryFn: () => api.getDailyKpis(accessToken), enabled: !!accessToken }
    );

    const { data: alertsData, isLoading: isLoadingAlerts, error: alertsError } = useQuery<Alert[]>(
        { queryKey: ['alerts'], queryFn: () => api.getAlerts(accessToken), enabled: !!accessToken }
    );

    const { data: tasksData, isLoading: isLoadingTasks, error: tasksError } = useQuery<Task[]>(
        { queryKey: ['tasks'], queryFn: () => api.getTasks(accessToken), enabled: !!accessToken }
    );

    if (isLoadingKpis || isLoadingAlerts || isLoadingTasks) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (kpisError || alertsError || tasksError) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center text-red-500">
                    Error loading dashboard data.
                    {kpisError && <p>KPIs: {kpisError.message}</p>}
                    {alertsError && <p>Alerts: {alertsError.message}</p>}
                    {tasksError && <p>Tasks: {tasksError.message}</p>}
                </div>
            </div>
        );
    }

    // Dummy trend calculation for demonstration. In a real app, this would compare with previous periods.
    const getTrend = (currentValue: number, previousValue: number) => {
        if (previousValue === 0) return { change: "N/A", trend: "" };
        const percentageChange = ((currentValue - previousValue) / previousValue) * 100;
        const trend = percentageChange > 0 ? "up" : percentageChange < 0 ? "down" : "stable";
        const change = `${percentageChange.toFixed(2)}%`;
        return { change, trend };
    };

    const kpis = kpisData && kpisData.length > 0 ? [
        {
            title: "Total Revenue",
            value: `$${kpisData[0].total_revenue.toFixed(2)}`,
            ...getTrend(kpisData[0].total_revenue, kpisData.length > 1 ? kpisData[1].total_revenue : kpisData[0].total_revenue),
            icon: DollarSign,
            description: "today"
        },
        {
            title: "Total Orders",
            value: kpisData[0].total_orders.toString(),
            ...getTrend(kpisData[0].total_orders, kpisData.length > 1 ? kpisData[1].total_orders : kpisData[0].total_orders),
            icon: Package,
            description: "today"
        },
        {
            title: "Staff Online",
            value: kpisData[0].staff_online_count.toString(),
            change: "N/A", // Real-time metric, trend not easily calculable this way
            trend: "",
            icon: Users,
            description: "currently"
        },
        {
            title: "Inventory Value",
            value: `$${kpisData[0].inventory_value.toFixed(2)}`,
            ...getTrend(kpisData[0].inventory_value, kpisData.length > 1 ? kpisData[1].inventory_value : kpisData[0].inventory_value),
            icon: Package,
            description: "current stock"
        }
    ] : [];

    // Placeholder for AI recommendations
    const aiRecommendations = [
        "Consider promoting high-margin items during peak hours to boost revenue.",
        "Review inventory levels for 'Fresh Tomatoes' - potential low stock risk based on upcoming demand.",
        "Schedule additional staff for Friday evening shift due to forecasted high customer traffic.",
    ];

    const todayTasks = tasksData ? tasksData.filter(task =>
        new Date(task.due_date).toDateString() === new Date().toDateString()
    ).map(task => ({
        task: task.title,
        priority: task.priority.toLowerCase(),
        time: task.due_date ? new Date(task.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
        status: task.status.toLowerCase()
    })) : [];

    const alerts = alertsData ? alertsData.map(alert => ({
        message: alert.message,
        type: alert.alert_type.toLowerCase(),
    })) : [];


    return (
        <div className="min-h-screen bg-gradient-subtle p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* AI Insights Banner */}
                <Card className="bg-gradient-warm border-accent/20 shadow-soft">
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
                                Updated {kpisData && kpisData.length > 0 ? new Date(kpisData[0].updated_at).toLocaleTimeString() : 'N/A'}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm sm:text-base leading-relaxed">
                            <strong>Recommendations:</strong>
                        </p>
                        <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                            {aiRecommendations.map((rec, index) => (
                                <li key={index}>{rec}</li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                {/* KPIs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {kpis.map((kpi) => (
                        <Card key={kpi.title} className="shadow-soft hover:shadow-strong transition-all duration-300 hover:scale-[1.02]">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <kpi.icon className="w-5 h-5 text-muted-foreground" />
                                    {kpi.change !== "N/A" && (
                                        <Badge
                                            variant={kpi.trend === "down" ? "destructive" : "default"}
                                            className={`${kpi.trend === "up" ? "bg-success text-success-foreground" : ""}`}
                                        >
                                            {kpi.change} {kpi.trend === "up" ? <TrendingUp className="h-4 w-4 inline-block ml-1" /> : kpi.trend === "down" ? <TrendingDown className="h-4 w-4 inline-block ml-1" /> : null}
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-1">
                                    <h3 className="text-xl sm:text-2xl font-bold">{kpi.value}</h3>
                                    <p className="text-sm font-medium">{kpi.title}</p>
                                    <p className="text-xs text-muted-foreground">{kpi.description}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Today's Tasks */}
                    <Card className="shadow-soft">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="w-5 h-5" />
                                Today's Priority Tasks
                            </CardTitle>
                            <CardDescription>AI-generated recommendations for today</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {todayTasks.length > 0 ? (
                                todayTasks.map((task, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border">
                                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                                            {task.status === "completed" ? (
                                                <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                                            ) : (
                                                <div className="w-4 h-4 rounded-full border-2 border-muted-foreground flex-shrink-0" />
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className={`text-sm font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                                                    {task.task}
                                                </p>
                                                <p className="text-xs text-muted-foreground">{task.time}</p>
                                            </div>
                                        </div>
                                        <Badge
                                            variant={task.priority === "high" ? "destructive" : "secondary"}
                                            className="ml-2 flex-shrink-0"
                                        >
                                            {task.priority}
                                        </Badge>
                                    </div>
                                ))
                            ) : (
                                <p className="text-muted-foreground">No tasks for today.</p>
                            )}
                            <Button className="w-full mt-4" variant="outline" onClick={() => navigate("/dashboard/tasks")}> {/* Placeholder route */}
                                View All Tasks
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Alerts */}
                    <Card className="shadow-soft">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5" />
                                System Alerts
                            </CardTitle>
                            <CardDescription>Important notifications and warnings</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {alerts.length > 0 ? (
                                alerts.map((alert, index) => (
                                    <div key={index} className={`flex items-start space-x-3 p-3 rounded-lg border ${alert.type === "error" ? "bg-destructive/10 border-destructive/20" :
                                        alert.type === "warning" ? "bg-orange-100 border-orange-200" :
                                            "bg-blue-100 border-blue-200"
                                        }`}>
                                        {alert.type === "error" ? (
                                            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-destructive" />
                                        ) : alert.type === "warning" ? (
                                            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-orange-500" />
                                        ) : (
                                            <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
                                        )}
                                        <p className="text-sm leading-relaxed">{alert.message}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-muted-foreground">No active alerts.</p>
                            )}
                            <Button className="w-full mt-4" variant="outline" onClick={() => navigate("/dashboard/alerts")}> {/* Placeholder route */}
                                Manage Alerts
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Actions */}
                <Card className="shadow-soft">
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                        <CardDescription>Frequently used restaurant operations</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <Button onClick={() => toast.info("Feature coming soon: Generating orders!")} className="h-16 bg-gradient-primary hover:bg-primary/90 text-white shadow-soft hover:shadow-strong transition-all duration-300">
                                <div className="text-center">
                                    <div className="font-semibold">Generate Tomorrow's Orders</div>
                                </div>
                            </Button>
                            <Button onClick={() => navigate("/dashboard/inventory") /* Example: navigate to inventory overview */} variant="outline" className="h-16 border-2 hover:bg-secondary/50 transition-all duration-300">
                                <div className="text-center">
                                    <div className="font-semibold">Update Inventory Count</div>
                                </div>
                            </Button>
                            <Button onClick={() => navigate("/dashboard/schedule-management") /* Example: navigate to schedule management */} variant="outline" className="h-16 border-2 hover:bg-secondary/50 transition-all duration-300 sm:col-span-2 lg:col-span-1">
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
