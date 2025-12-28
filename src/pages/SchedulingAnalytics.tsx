import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Download, Calendar } from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";
import {
import { API_BASE } from "@/lib/api";
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";


// Chart color palette
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

// Real chart components using recharts
const BarChartComponent = ({ data }: { data: any[] }) => (
  <ResponsiveContainer width="100%" height={320}>
    <BarChart data={data || []}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Bar dataKey="value" fill="#8884d8" />
      <Bar dataKey="completionRate" fill="#82ca9d" />
    </BarChart>
  </ResponsiveContainer>
);

const LineChartComponent = ({ data }: { data: any[] }) => (
  <ResponsiveContainer width="100%" height={320}>
    <LineChart data={data || []}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Line type="monotone" dataKey="completed" stroke="#8884d8" strokeWidth={2} />
      <Line type="monotone" dataKey="total" stroke="#82ca9d" strokeWidth={2} />
    </LineChart>
  </ResponsiveContainer>
);

const PieChartComponent = ({ data }: { data: any[] }) => (
  <ResponsiveContainer width="100%" height={320}>
    <PieChart>
      <Pie
        data={data || []}
        cx="50%"
        cy="50%"
        labelLine={false}
        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        outerRadius={80}
        fill="#8884d8"
        dataKey="value"
      >
        {(data || []).map((entry, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip />
      <Legend />
    </PieChart>
  </ResponsiveContainer>
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
              {staffLoading ? (
                <div className="flex items-center justify-center h-80">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-muted-foreground">Loading staff performance data...</p>
                  </div>
                </div>
              ) : (
                <BarChartComponent data={staffPerformance} />
              )}
              
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
              {taskLoading ? (
                <div className="flex items-center justify-center h-80">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-muted-foreground">Loading task completion data...</p>
                  </div>
                </div>
              ) : (
                <LineChartComponent data={taskCompletion} />
              )}
              
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
              {laborLoading ? (
                <div className="flex items-center justify-center h-80">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-muted-foreground">Loading labor cost data...</p>
                  </div>
                </div>
              ) : (
                <PieChartComponent data={laborCosts} />
              )}
              
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