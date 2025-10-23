import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    UtensilsCrossed,
    Clock,
    ChefHat,
    AlertTriangle,
    CheckCircle,
    Users,
    Timer
} from "lucide-react";

const upcomingFeatures = [
    {
        title: "Real-time Order Management",
        description: "Live order tracking and kitchen workflow optimization",
        icon: Clock,
        status: "planned"
    },
    {
        title: "Smart Prep Recommendations",
        description: "AI-powered prep suggestions based on order patterns",
        icon: ChefHat,
        status: "planned"
    },
    {
        title: "Staff Performance Analytics",
        description: "Track cooking times and efficiency metrics",
        icon: Users,
        status: "planned"
    },
    {
        title: "Automated Timing Alerts",
        description: "Smart notifications for cooking times and order priorities",
        icon: Timer,
        status: "planned"
    }
];

const sampleOrders = [
    { order: "Table 5 - Margherita Pizza", time: "12:30 PM", status: "preparing", priority: "high" },
    { order: "Table 3 - Caesar Salad", time: "12:25 PM", status: "ready", priority: "medium" },
    { order: "Table 7 - Pasta Carbonara", time: "12:35 PM", status: "pending", priority: "high" },
    { order: "Table 2 - Grilled Salmon", time: "12:20 PM", status: "ready", priority: "medium" }
];

export default function KitchenDisplay() {
    return (
        <div className="min-h-screen bg-gradient-subtle p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Coming Soon Banner */}
                <Card className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-orange-200/50 dark:border-orange-800/50 shadow-lg">
                    <CardHeader className="pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex-1">
                                <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                                    <UtensilsCrossed className="w-6 h-6 text-orange-600" />
                                    Kitchen Display System
                                </CardTitle>
                                <CardDescription className="mt-1">
                                    Coming Soon - Advanced kitchen management and order tracking
                                </CardDescription>
                            </div>
                            <Badge variant="secondary" className="w-fit bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
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

                {/* Sample Kitchen Orders */}
                <Card className="shadow-soft">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UtensilsCrossed className="w-5 h-5" />
                            Sample Kitchen Orders
                        </CardTitle>
                        <CardDescription>Preview of how orders will be displayed</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {sampleOrders.map((order, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border">
                                <div className="flex items-center space-x-3 flex-1 min-w-0">
                                    {order.status === "ready" ? (
                                        <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                                    ) : order.status === "preparing" ? (
                                        <Clock className="w-4 h-4 text-warning flex-shrink-0" />
                                    ) : (
                                        <AlertTriangle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium">{order.order}</p>
                                        <p className="text-xs text-muted-foreground">{order.time}</p>
                                    </div>
                                </div>
                                <Badge
                                    variant={order.priority === "high" ? "destructive" : "secondary"}
                                    className="ml-2 flex-shrink-0"
                                >
                                    {order.priority}
                                </Badge>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="shadow-soft">
                    <CardHeader>
                        <CardTitle>Future Quick Actions</CardTitle>
                        <CardDescription>Planned kitchen management features</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <Button className="h-16 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-soft hover:shadow-strong transition-all duration-300" disabled>
                                <div className="text-center">
                                    <div className="font-semibold">Start Prep Mode</div>
                                </div>
                            </Button>
                            <Button variant="outline" className="h-16 border-2 hover:bg-secondary/50 transition-all duration-300" disabled>
                                <div className="text-center">
                                    <div className="font-semibold">Update Order Status</div>
                                </div>
                            </Button>
                            <Button variant="outline" className="h-16 border-2 hover:bg-secondary/50 transition-all duration-300 sm:col-span-2 lg:col-span-1" disabled>
                                <div className="text-center">
                                    <div className="font-semibold">Kitchen Analytics</div>
                                </div>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}