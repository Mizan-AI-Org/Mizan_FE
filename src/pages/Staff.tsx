import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar,
  Clock,
  Users,
  Plus,
  UserCheck,
  AlertCircle,
  TrendingUp
} from "lucide-react";

const staffMembers = [
  {
    id: 1,
    name: "Maria Rodriguez",
    role: "Head Chef",
    avatar: "MR",
    schedule: "Mon-Fri 10am-6pm",
    status: "active",
    hoursThisWeek: 40,
    rating: 4.8,
    phone: "+1 (555) 123-4567"
  },
  {
    id: 2,
    name: "James Wilson", 
    role: "Sous Chef",
    avatar: "JW",
    schedule: "Tue-Sat 2pm-10pm",
    status: "active", 
    hoursThisWeek: 38,
    rating: 4.6,
    phone: "+1 (555) 234-5678"
  },
  {
    id: 3,
    name: "Sarah Kim",
    role: "Server",
    avatar: "SK", 
    schedule: "Wed-Sun 5pm-11pm",
    status: "scheduled",
    hoursThisWeek: 35,
    rating: 4.9,
    phone: "+1 (555) 345-6789"
  },
  {
    id: 4,
    name: "Mike Thompson",
    role: "Prep Cook",
    avatar: "MT",
    schedule: "Available",
    status: "available",
    hoursThisWeek: 0,
    rating: 4.3,
    phone: "+1 (555) 456-7890"
  }
];

const weeklySchedule = [
  { day: "Monday", date: "Jan 8", shifts: [
    { name: "Maria R.", role: "Head Chef", time: "10am-6pm", status: "confirmed" },
    { name: "James W.", role: "Prep Cook", time: "8am-4pm", status: "confirmed" }
  ]},
  { day: "Tuesday", date: "Jan 9", shifts: [
    { name: "Maria R.", role: "Head Chef", time: "10am-6pm", status: "confirmed" },
    { name: "Sarah K.", role: "Server", time: "5pm-11pm", status: "pending" },
    { name: "James W.", role: "Sous Chef", time: "2pm-10pm", status: "confirmed" }
  ]},
  { day: "Wednesday", date: "Jan 10", shifts: [
    { name: "NEED STAFF", role: "Server", time: "5pm-11pm", status: "urgent" },
    { name: "Maria R.", role: "Head Chef", time: "10am-6pm", status: "confirmed" }
  ]}
];

const aiRecommendations = [
  "Schedule +2 servers for Friday dinner (expected 40% increase)",
  "Add prep cook shift Saturday morning (large catering order)",
  "Consider cross-training Mike T. as backup server"
];

export default function Staff() {
  const [selectedWeek, setSelectedWeek] = useState("This Week");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-success text-success-foreground">Confirmed</Badge>;
      case "pending":
        return <Badge className="bg-warning text-warning-foreground">Pending</Badge>;
      case "urgent":
        return <Badge variant="destructive">URGENT</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Staff Management</h1>
          <p className="text-muted-foreground">Manage schedules and AI-optimized staffing</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <UserCheck className="w-4 h-4 mr-2" />
            Clock In/Out
          </Button>
          <Button className="bg-gradient-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Add Staff
          </Button>
        </div>
      </div>

      {/* AI Staff Insights */}
      <Card className="bg-gradient-warm border-accent/20 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center">
            🤖 AI Staffing Recommendations
          </CardTitle>
          <CardDescription>Optimized scheduling based on demand forecasting</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {aiRecommendations.map((rec, index) => (
            <div key={index} className="flex items-center p-3 bg-card rounded-lg">
              <AlertCircle className="w-4 h-4 text-accent mr-3" />
              <span className="text-sm">{rec}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Staff Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Total Staff</p>
                <p className="text-2xl font-bold">12</p>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">On Duty Today</p>
                <p className="text-2xl font-bold">8</p>
              </div>
              <UserCheck className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Labor Cost %</p>
                <p className="text-2xl font-bold">28.5%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Avg Rating</p>
                <p className="text-2xl font-bold">4.7⭐</p>
              </div>
              <Clock className="w-8 h-8 text-accent" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Staff List */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>Current staff roster and availability</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {staffMembers.map(staff => (
              <div key={staff.id} className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-white font-medium">{staff.avatar}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">{staff.name}</h3>
                    <p className="text-sm text-muted-foreground">{staff.role}</p>
                    <p className="text-xs text-muted-foreground">{staff.schedule}</p>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <Badge variant={staff.status === "active" ? "default" : "outline"}>
                    {staff.status}
                  </Badge>
                  <div className="text-xs text-muted-foreground">
                    {staff.hoursThisWeek}h this week
                  </div>
                  <div className="text-xs">⭐ {staff.rating}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Weekly Schedule */}
        <Card className="shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Weekly Schedule</CardTitle>
                <CardDescription>Current and upcoming shifts</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Calendar className="w-4 h-4 mr-2" />
                View Calendar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {weeklySchedule.map(day => (
              <div key={day.day} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">{day.day}</h4>
                  <span className="text-sm text-muted-foreground">{day.date}</span>
                </div>
                <div className="space-y-2 ml-4">
                  {day.shifts.map((shift, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div>
                        <span className="text-sm font-medium">{shift.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">({shift.role})</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs">{shift.time}</span>
                        {getStatusBadge(shift.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common staff management tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-16">
              <Clock className="w-5 h-5 mr-2" />
              Generate Auto-Schedule
            </Button>
            <Button variant="outline" className="h-16">
              <Users className="w-5 h-5 mr-2" />
              Send Shift Notifications
            </Button>
            <Button variant="outline" className="h-16">
              <UserCheck className="w-5 h-5 mr-2" />
              View Timesheets
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}