import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, CheckSquare, BarChart, Settings } from "lucide-react";
import EnhancedScheduleView from "@/components/schedule/EnhancedScheduleView";
import TaskManagementBoard from "@/components/schedule/TaskManagementBoard";
import { useQuery } from "@tanstack/react-query";

const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || "http://localhost:8000/api";

const StaffSchedulingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("schedule");

  // Fetch restaurant stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["restaurant-stats"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/analytics/restaurant-stats/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!response.ok) return {
        total_staff: 0,
        scheduled_shifts: 0,
        open_tasks: 0,
        completed_tasks: 0,
      };
      return await response.json();
    },
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Staff Scheduling & Task Management</h1>
        <Button variant="outline">
          <Settings className="h-4 w-4 mr-2" /> Settings
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? "..." : stats?.total_staff || 0}</div>
            <p className="text-xs text-muted-foreground">Active team members</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Shifts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? "..." : stats?.scheduled_shifts || 0}</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? "..." : stats?.open_tasks || 0}</div>
            <p className="text-xs text-muted-foreground">Tasks to be completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? "..." : stats?.completed_tasks || 0}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="schedule">
            <Calendar className="h-4 w-4 mr-2" /> Staff Scheduling
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <CheckSquare className="h-4 w-4 mr-2" /> Task Management
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Staff Schedule</CardTitle>
              <CardDescription>
                Manage your staff schedules, assign shifts, and track availability.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <EnhancedScheduleView />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Task Management</CardTitle>
              <CardDescription>
                Create and assign tasks, track completion, and manage task templates.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <TaskManagementBoard />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StaffSchedulingPage;