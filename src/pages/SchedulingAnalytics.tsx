import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { BarChart, LineChart, PieChart, Download, Calendar } from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";

const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || "http://localhost:8000/api";

// Mock chart components - in a real app, you'd use a charting library like recharts
const BarChartComponent = ({ data }: { data: any }) => (
  <div className="h-80 flex items-center justify-center bg-muted/20 rounded-md">
    <div className="text-center">
      <BarChart className="h-10 w-10 mx-auto text-muted-foreground" />
      <p className="mt-2">Bar Chart Visualization</p>
      <p className="text-sm text-muted-foreground">Data points: {data?.length || 0}</p>
    </div>
  </div>
);

const LineChartComponent = ({ data }: { data: any }) => (
  <div className="h-80 flex items-center justify-center bg-muted/20 rounded-md">
    <div className="text-center">
      <LineChart className="h-10 w-10 mx-auto text-muted-foreground" />
      <p className="mt-2">Line Chart Visualization</p>
      <p className="text-sm text-muted-foreground">Data points: {data?.length || 0}</p>
    </div>
  </div>
);

const PieChartComponent = ({ data }: { data: any }) => (
  <div className="h-80 flex items-center justify-center bg-muted/20 rounded-md">
    <div className="text-center">
      <PieChart className="h-10 w-10 mx-auto text-muted-foreground" />
      <p className="mt-2">Pie Chart Visualization</p>
      <p className="text-sm text-muted-foreground">Data points: {data?.length || 0}</p>
    </div>
  </div>
);

const SchedulingAnalytics: React.FC = () => {
  const [dateRange, setDateRange] = useState<string>("week");
  const [reportType, setReportType] = useState<string>("pdf");
  
  // Calculate date range for queries
  const today = new Date();
  const startDate = dateRange === "week" 
    ? startOfWeek(today).toISOString().split('T')[0]
    : dateRange === "month" 
      ? new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
      : subDays(today, 90).toISOString().split('T')[0];
  
  const endDate = dateRange === "week"
    ? endOfWeek(today).toISOString().split('T')[0]
    : dateRange === "month"
      ? new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]
      : today.toISOString().split('T')[0];

  // Fetch staff performance data
  const { data: staffPerformance, isLoading: staffLoading } = useQuery({
    queryKey: ["staff-performance", dateRange],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/analytics/staff-performance/?start_date=${startDate}&end_date=${endDate}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!response.ok) return [];
      return await response.json();
    },
  });

  // Fetch task completion data
  const { data: taskCompletion, isLoading: taskLoading } = useQuery({
    queryKey: ["task-completion", dateRange],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/analytics/task-completion/?start_date=${startDate}&end_date=${endDate}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!response.ok) return [];
      return await response.json();
    },
  });

  // Fetch labor cost data
  const { data: laborCosts, isLoading: laborLoading } = useQuery({
    queryKey: ["labor-costs", dateRange],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/analytics/labor-costs/?start_date=${startDate}&end_date=${endDate}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!response.ok) return [];
      return await response.json();
    },
  });

  // Handle export report
  const handleExportReport = () => {
    alert(`Exporting ${reportType.toUpperCase()} report for ${dateRange} data`);
    // In a real implementation, this would trigger a backend API call to generate the report
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Scheduling & Task Analytics</h1>
        <div className="flex space-x-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Report Format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="excel">Excel</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={handleExportReport}>
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
        </div>
      </div>

      {/* Date Range Display */}
      <div className="flex items-center justify-center">
        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {format(new Date(startDate), "MMMM d, yyyy")} - {format(new Date(endDate), "MMMM d, yyyy")}
        </span>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="staff" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="staff">Staff Performance</TabsTrigger>
          <TabsTrigger value="tasks">Task Completion</TabsTrigger>
          <TabsTrigger value="labor">Labor Costs</TabsTrigger>
        </TabsList>
        
        <TabsContent value="staff" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Staff Performance Metrics</CardTitle>
              <CardDescription>
                Track staff performance based on task completion rates and shift attendance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <BarChartComponent data={staffPerformance} />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <Card>
                  <CardHeader className="py-2">
                    <CardTitle className="text-sm">Top Performer</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{staffLoading ? "..." : "Alex Chen"}</div>
                    <p className="text-xs text-muted-foreground">98% task completion rate</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="py-2">
                    <CardTitle className="text-sm">Average Completion Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{staffLoading ? "..." : "87%"}</div>
                    <p className="text-xs text-muted-foreground">Across all staff</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="py-2">
                    <CardTitle className="text-sm">Staff Requiring Attention</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{staffLoading ? "..." : "2"}</div>
                    <p className="text-xs text-muted-foreground">Below 70% completion</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Task Completion Analytics</CardTitle>
              <CardDescription>
                Analyze task completion rates by category and priority.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <LineChartComponent data={taskCompletion} />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <Card>
                  <CardHeader className="py-2">
                    <CardTitle className="text-sm">Completion Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{taskLoading ? "..." : "82%"}</div>
                    <p className="text-xs text-muted-foreground">Tasks completed on time</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="py-2">
                    <CardTitle className="text-sm">Most Efficient Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{taskLoading ? "..." : "Cleaning"}</div>
                    <p className="text-xs text-muted-foreground">95% completion rate</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="py-2">
                    <CardTitle className="text-sm">Overdue Tasks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{taskLoading ? "..." : "7"}</div>
                    <p className="text-xs text-muted-foreground">Require immediate attention</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="labor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Labor Cost Analysis</CardTitle>
              <CardDescription>
                Analyze labor costs by shift and task type.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <PieChartComponent data={laborCosts} />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <Card>
                  <CardHeader className="py-2">
                    <CardTitle className="text-sm">Total Labor Cost</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{laborLoading ? "..." : "$12,450"}</div>
                    <p className="text-xs text-muted-foreground">For selected period</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="py-2">
                    <CardTitle className="text-sm">Cost per Hour</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{laborLoading ? "..." : "$18.75"}</div>
                    <p className="text-xs text-muted-foreground">Average hourly rate</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="py-2">
                    <CardTitle className="text-sm">Most Expensive Shift</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{laborLoading ? "..." : "Friday Dinner"}</div>
                    <p className="text-xs text-muted-foreground">$2,340 total cost</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SchedulingAnalytics;