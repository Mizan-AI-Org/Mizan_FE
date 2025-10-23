import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClockInOut } from "@/components/ClockInOut";
import {
  Calendar,
  Clock,
  Users,
  UserCheck,
  AlertCircle,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Copy,
  Repeat,
  Plus,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Grid
} from "lucide-react";

const staffMembers = [];

const weeklySchedule = [];

const aiRecommendations = [];

// New Google Calendar-like Scheduler Component
const GoogleCalendarScheduler = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"week" | "day" | "month">("week");
  const [selectedShift, setSelectedShift] = useState<any>(null);
  const [showRecurringModal, setShowRecurringModal] = useState(false);

  const hours = Array.from({ length: 14 }, (_, i) => i + 6); // 6 AM to 8 PM
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const shifts = [];

  const getShiftPosition = (shift: any) => {
    const [startHour, startMinute] = shift.start.split(":").map(Number);
    const [endHour, endMinute] = shift.end.split(":").map(Number);

    const startPosition = ((startHour - 6) * 60 + startMinute) / 60 * 80; // 80px per hour
    const duration = ((endHour - startHour) * 60 + (endMinute - startMinute)) / 60 * 80;

    return { top: startPosition, height: duration };
  };

  const handleCopyShift = (shift: any) => {
    // Implementation for copying shift
    console.log("Copying shift:", shift);
  };

  const handleSetRecurring = (shift: any) => {
    setSelectedShift(shift);
    setShowRecurringModal(true);
  };

  const RecurringModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">Set Recurring Schedule</h3>

        <div className="space-y-4">
          <div>
            <label htmlFor="repeat-every" className="text-sm font-medium">Repeat every</label>
            <select id="repeat-every" className="w-full p-2 border rounded mt-1">
              <option>Week</option>
              <option>2 Weeks</option>
              <option>Month</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">On days</label>
            <div className="grid grid-cols-7 gap-1 mt-2">
              {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                <button key={i} className="w-8 h-8 border rounded text-sm hover:bg-gray-50">
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="end-date" className="text-sm font-medium">End date</label>
            <input id="end-date" type="date" className="w-full p-2 border rounded mt-1" />
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="outline" onClick={() => setShowRecurringModal(false)}>
            Cancel
          </Button>
          <Button onClick={() => setShowRecurringModal(false)}>
            Set Recurring
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg border shadow-sm h-[600px] flex flex-col">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm">
            Today
          </Button>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="p-2">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="p-2">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <h2 className="text-xl font-semibold">
            January 2024
          </h2>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex border rounded">
            <Button
              variant={view === "day" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("day")}
              className="px-3"
            >
              Day
            </Button>
            <Button
              variant={view === "week" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("week")}
              className="px-3"
            >
              Week
            </Button>
            <Button
              variant={view === "month" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("month")}
              className="px-3"
            >
              Month
            </Button>
          </div>

          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Create
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto">
        <div className="flex min-w-full">
          {/* Time Column */}
          <div className="w-16 flex-shrink-0">
            <div className="h-12 border-b"></div>
            {hours.map(hour => (
              <div key={hour} className="h-20 border-b text-xs text-gray-500 p-1">
                {hour <= 12 ? `${hour} AM` : `${hour - 12} PM`}
              </div>
            ))}
          </div>

          {/* Days Columns */}
          <div className="flex-1 grid grid-cols-7 min-w-0">
            {days.map((day, dayIndex) => (
              <div key={day} className="border-l">
                {/* Day Header */}
                <div className="h-12 border-b flex flex-col items-center justify-center">
                  <div className="text-sm font-medium">{day}</div>
                  <div className="text-xs text-gray-500">Jan {8 + dayIndex}</div>
                </div>

                {/* Time Slots */}
                <div className="relative">
                  {hours.map(hour => (
                    <div key={hour} className="h-20 border-b"></div>
                  ))}

                  {/* Shifts */}
                  {shifts
                    .filter(shift => shift.day === dayIndex)
                    .map(shift => {
                      const position = getShiftPosition(shift);
                      return (
                        <div
                          key={shift.id}
                          className={`absolute left-1 right-1 rounded p-2 cursor-pointer shadow-sm
                            ${shift.type === 'confirmed' ? 'bg-blue-100 border-blue-300' :
                              shift.type === 'pending' ? 'bg-yellow-100 border-yellow-300' :
                                'bg-green-100 border-green-300'}`}
                          style={{
                            top: `${position.top}px`,
                            height: `${position.height}px`,
                          }}
                          onClick={() => setSelectedShift(shift)}
                        >
                          <div className="text-xs font-medium truncate">{shift.title}</div>
                          <div className="text-xs text-gray-600">
                            {shift.start} - {shift.end}
                          </div>

                          {selectedShift?.id === shift.id && (
                            <div className="absolute top-1 right-1 flex space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyShift(shift);
                                }}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSetRecurring(shift);
                                }}
                              >
                                <Repeat className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showRecurringModal && <RecurringModal />}
    </div>
  );
};

export default function Staff() {
  const [selectedWeek, setSelectedWeek] = useState("This Week");
  const [showAIRecommendations, setShowAIRecommendations] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-success text-success-foreground text-xs">Confirmed</Badge>;
      case "pending":
        return <Badge className="bg-warning text-warning-foreground text-xs">Pending</Badge>;
      case "urgent":
        return <Badge variant="destructive" className="text-xs">URGENT</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Staff Management</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Manage schedules and AI-optimized staffing</p>
        </div>
        <div className="flex space-x-3">
          <ClockInOut />
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schedule">Schedule Staff</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Minimal AI Staff Insights */}
          <Card className="border-accent/20 shadow-soft">
            <CardHeader className="pb-3 cursor-pointer" onClick={() => setShowAIRecommendations(!showAIRecommendations)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-accent" />
                  <CardTitle className="text-lg">AI Insights</CardTitle>
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  {showAIRecommendations ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>
              <CardDescription>{aiRecommendations.length} recommendations available</CardDescription>
            </CardHeader>
            {showAIRecommendations && (
              <CardContent className="pt-0 space-y-3">
                {aiRecommendations.map((rec, index) => (
                  <div key={index} className="flex items-start p-3 bg-muted/30 rounded-lg border-l-2 border-accent">
                    <AlertCircle className="w-4 h-4 text-accent mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-sm leading-relaxed">{rec}</span>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>

          {/* Staff Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            <Card className="shadow-soft">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium">Total Staff</p>
                    <p className="text-xl sm:text-2xl font-bold">12</p>
                  </div>
                  <Users className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium">On Duty Today</p>
                    <p className="text-xl sm:text-2xl font-bold">8</p>
                  </div>
                  <UserCheck className="w-6 h-6 sm:w-8 sm:h-8 text-success" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium">Labor Cost %</p>
                    <p className="text-xl sm:text-2xl font-bold">28.5%</p>
                  </div>
                  <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-warning" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium">Avg Rating</p>
                    <p className="text-xl sm:text-2xl font-bold">4.7⭐</p>
                  </div>
                  <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Staff List */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Current staff roster and availability</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {staffMembers.map(staff => (
                  <div key={staff.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-foreground font-medium text-sm">{staff.avatar}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm sm:text-base truncate">{staff.name}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">{staff.role}</p>
                        <p className="text-xs text-muted-foreground truncate">{staff.schedule}</p>
                      </div>
                    </div>
                    <div className="text-right space-y-1 ml-2">
                      <Badge variant={staff.status === "active" ? "default" : "outline"} className="text-xs">
                        {staff.status}
                      </Badge>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle>Weekly Schedule</CardTitle>
                    <CardDescription>Current and upcoming shifts</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    <Calendar className="w-4 h-4 mr-2" />
                    View Calendar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
                {weeklySchedule.map(day => (
                  <div key={day.day} className="space-y-2">
                    <div className="flex items-center justify-between sticky top-0 bg-background py-1">
                      <h4 className="font-semibold text-sm sm:text-base">{day.day}</h4>
                      <span className="text-xs sm:text-sm text-muted-foreground">{day.date}</span>
                    </div>
                    <div className="space-y-2">
                      {day.shifts.map((shift, index) => (
                        <div key={index} className="flex items-center justify-between p-2 sm:p-3 bg-muted/50 rounded">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-1 sm:space-x-2">
                              <span className="text-sm font-medium truncate">{shift.name}</span>
                              <span className="text-xs text-muted-foreground hidden sm:inline">({shift.role})</span>
                            </div>
                            <span className="text-xs text-muted-foreground sm:hidden">{shift.role}</span>
                          </div>
                          <div className="flex items-center space-x-2 ml-2">
                            <span className="text-xs whitespace-nowrap">{shift.time}</span>
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button variant="outline" className="h-14 sm:h-16 flex flex-col gap-1 p-2">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs sm:text-sm text-center">Auto-Schedule</span>
                </Button>
                <Button variant="outline" className="h-14 sm:h-16 flex flex-col gap-1 p-2">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs sm:text-sm text-center">Shift Notifications</span>
                </Button>
                <Button variant="outline" className="h-14 sm:h-16 flex flex-col gap-1 p-2">
                  <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs sm:text-sm text-center">Timesheets</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <GoogleCalendarScheduler />
        </TabsContent>
      </Tabs>
    </div>
  );
}