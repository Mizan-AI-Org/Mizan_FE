import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Users, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  DollarSign
} from "lucide-react";

const kpis = [
  {
    title: "Food Waste",
    value: "12.3%",
    change: "-2.1%",
    trend: "down",
    icon: TrendingDown,
    description: "vs last week"
  },
  {
    title: "Labor Cost",
    value: "28.5%",
    change: "+1.2%", 
    trend: "up",
    icon: Users,
    description: "of total revenue"
  },
  {
    title: "Inventory Value",
    value: "$15,420",
    change: "+5.3%",
    trend: "up", 
    icon: Package,
    description: "current stock"
  },
  {
    title: "Revenue Lost",
    value: "$320",
    change: "-45%",
    trend: "down",
    icon: DollarSign,
    description: "to stockouts"
  }
];

const todayTasks = [
  { task: "Order 50 lbs chicken breast", priority: "high", time: "2:00 PM", status: "pending" },
  { task: "Schedule weekend staff", priority: "medium", time: "3:30 PM", status: "pending" },
  { task: "Check freezer temperature logs", priority: "high", time: "4:00 PM", status: "completed" },
  { task: "Review tomorrow's prep list", priority: "medium", time: "5:00 PM", status: "pending" }
];

const alerts = [
  { message: "Tomato inventory running low (2 days left)", type: "warning" },
  { message: "Weekend staff shortage detected", type: "error" },
  { message: "New supplier discount available", type: "info" }
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* AI Insights Banner */}
      <Card className="bg-gradient-warm border-accent/20 shadow-soft">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">🤖 AI Insights for Today</CardTitle>
              <CardDescription>Based on weather, events, and historical data</CardDescription>
            </div>
            <Badge variant="secondary">Updated 5 min ago</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            <strong>Tomorrow is Friday:</strong> Expect 23% higher demand for pizza and pasta. 
            Recommend ordering +15 lbs mozzarella and +8 lbs ground beef. 
            Schedule 2 additional kitchen staff for dinner rush.
          </p>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => (
          <Card key={kpi.title} className="shadow-soft hover:shadow-strong transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <kpi.icon className="w-5 h-5 text-muted-foreground" />
                <Badge 
                  variant={kpi.trend === "up" ? "destructive" : "default"}
                  className={kpi.trend === "down" ? "bg-success text-success-foreground" : ""}
                >
                  {kpi.change}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold">{kpi.value}</h3>
                <p className="text-sm font-medium">{kpi.title}</p>
                <p className="text-xs text-muted-foreground">{kpi.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Tasks */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Today's Priority Tasks
            </CardTitle>
            <CardDescription>AI-generated recommendations for today</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {todayTasks.map((task, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                <div className="flex items-center space-x-3">
                  {task.status === "completed" ? (
                    <CheckCircle className="w-4 h-4 text-success" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-muted-foreground" />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                      {task.task}
                    </p>
                    <p className="text-xs text-muted-foreground">{task.time}</p>
                  </div>
                </div>
                <Badge variant={task.priority === "high" ? "destructive" : "secondary"}>
                  {task.priority}
                </Badge>
              </div>
            ))}
            <Button className="w-full mt-4" variant="outline">
              View All Tasks
            </Button>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              System Alerts
            </CardTitle>
            <CardDescription>Important notifications and warnings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert, index) => (
              <div key={index} className={`flex items-start space-x-3 p-3 rounded-lg ${
                alert.type === "error" ? "bg-destructive/10 border border-destructive/20" :
                alert.type === "warning" ? "bg-warning/10 border border-warning/20" :
                "bg-primary/10 border border-primary/20"
              }`}>
                <AlertTriangle className={`w-4 h-4 mt-0.5 ${
                  alert.type === "error" ? "text-destructive" :
                  alert.type === "warning" ? "text-warning" :
                  "text-primary"
                }`} />
                <p className="text-sm">{alert.message}</p>
              </div>
            ))}
            <Button className="w-full mt-4" variant="outline">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="h-16 bg-gradient-primary hover:bg-primary/90">
              Generate Tomorrow's Orders
            </Button>
            <Button variant="outline" className="h-16">
              Update Inventory Count
            </Button>
            <Button variant="outline" className="h-16">
              Schedule Emergency Staff
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}