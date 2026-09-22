import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Download, Calendar } from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";
import { arSA, enUS, fr } from "date-fns/locale";
import { useLanguage } from "@/hooks/use-language";
import { API_BASE } from "@/lib/api";
import { unwrapEnvelope } from "@/lib/envelope";
import { PAGE_SHELL_PADDED } from "@/lib/page-shell";
import {
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

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

type StaffChartRow = {
  name: string;
  value: number;
  completionRate: number;
  total?: number;
};

type StaffPerformancePayload = {
  chart: StaffChartRow[];
  summary: {
    top_performer: { name: string; completion_rate: number } | null;
    average_completion_rate: number;
    below_threshold_count: number;
    threshold: number;
    staff_with_tasks: number;
  };
};

type TaskChartRow = { date: string; completed: number; total: number };

type TaskCompletionPayload = {
  chart: TaskChartRow[];
  summary: {
    completion_rate: number;
    on_time_rate: number;
    most_efficient_category: { name: string; completion_rate: number } | null;
    overdue_count: number;
    total_tasks: number;
    completed_tasks: number;
  };
};

type LaborCostsPayload = {
  chart_data: Array<{ name: string; value: number }>;
  total_cost: number;
  total_hours: number;
  currency: string;
  budget?: { target_amount?: number } | null;
};

type SalesLaborRec = {
  week_start: string;
  week_end: string;
  currency: string;
  estimated_revenue: number;
  labor_target_percent: number;
  recommended_labor_budget: number;
};

async function fetchAnalyticsJson<T>(path: string): Promise<T | null> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
  });
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  const raw = await response.json();
  return (unwrapEnvelope(raw) ?? raw) as T;
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-80 rounded-xl border border-dashed border-border">
      <p className="text-sm text-muted-foreground text-center px-4">{message}</p>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  loading,
}: {
  title: string;
  value: string;
  subtitle: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="py-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{loading ? "…" : value}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

const BarChartComponent = ({
  data,
  completedName,
  rateName,
}: {
  data: StaffChartRow[];
  completedName: string;
  rateName: string;
}) => (
  <ResponsiveContainer width="100%" height={320}>
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Bar dataKey="value" name={completedName} fill="#8884d8" />
      <Bar dataKey="completionRate" name={rateName} fill="#82ca9d" />
    </BarChart>
  </ResponsiveContainer>
);

const LineChartComponent = ({
  data,
  completedName,
  createdName,
}: {
  data: TaskChartRow[];
  completedName: string;
  createdName: string;
}) => (
  <ResponsiveContainer width="100%" height={320}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" />
      <YAxis allowDecimals={false} />
      <Tooltip />
      <Legend />
      <Line type="monotone" dataKey="completed" name={completedName} stroke="#8884d8" strokeWidth={2} />
      <Line type="monotone" dataKey="total" name={createdName} stroke="#82ca9d" strokeWidth={2} />
    </LineChart>
  </ResponsiveContainer>
);

const PieChartComponent = ({ data }: { data: Array<{ name: string; value: number }> }) => (
  <ResponsiveContainer width="100%" height={320}>
    <PieChart>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        labelLine={false}
        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        outerRadius={80}
        fill="#8884d8"
        dataKey="value"
      >
        {data.map((_, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip />
      <Legend />
    </PieChart>
  </ResponsiveContainer>
);

const SchedulingAnalytics: React.FC = () => {
  const { t, language } = useLanguage();
  const dateLocale = language === "fr" ? fr : language === "ar" ? arSA : enUS;
  const numberLocale = language === "ar" ? "ar" : language;
  const [dateRange, setDateRange] = useState<string>("week");
  const [reportType, setReportType] = useState<string>("pdf");

  const today = new Date();
  const startDate =
    dateRange === "week"
      ? startOfWeek(today).toISOString().split("T")[0]
      : dateRange === "month"
        ? new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0]
        : subDays(today, 90).toISOString().split("T")[0];

  const endDate =
    dateRange === "week"
      ? endOfWeek(today).toISOString().split("T")[0]
      : dateRange === "month"
        ? new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0]
        : today.toISOString().split("T")[0];

  const rangeQs = `start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`;

  const { data: staffPayload, isLoading: staffLoading, isError: staffError } = useQuery({
    queryKey: ["staff-performance", startDate, endDate],
    queryFn: () => fetchAnalyticsJson<StaffPerformancePayload>(`/analytics/staff-performance/?${rangeQs}`),
  });

  const { data: taskPayload, isLoading: taskLoading, isError: taskError } = useQuery({
    queryKey: ["task-completion", startDate, endDate],
    queryFn: () => fetchAnalyticsJson<TaskCompletionPayload>(`/analytics/task-completion/?${rangeQs}`),
  });

  const { data: laborCostsData, isLoading: laborLoading, isError: laborError } = useQuery({
    queryKey: ["labor-costs", startDate, endDate],
    queryFn: () => fetchAnalyticsJson<LaborCostsPayload>(`/analytics/labor-costs/?${rangeQs}`),
  });

  const { data: salesLaborRec, isLoading: salesLaborLoading } = useQuery({
    queryKey: ["sales-labor-recommendation", startDate],
    queryFn: () =>
      fetchAnalyticsJson<SalesLaborRec>(
        `/reporting/labor/sales-recommendation/?week_start=${encodeURIComponent(startDate)}`,
      ),
  });

  const staffChart = useMemo(() => {
    if (!staffPayload) return [];
    if (Array.isArray(staffPayload)) return staffPayload as StaffChartRow[];
    return staffPayload.chart ?? [];
  }, [staffPayload]);

  const staffSummary = !staffPayload || Array.isArray(staffPayload) ? null : staffPayload.summary;

  const taskChart = useMemo(() => {
    if (!taskPayload) return [];
    if (Array.isArray(taskPayload)) return taskPayload as TaskChartRow[];
    return taskPayload.chart ?? [];
  }, [taskPayload]);

  const taskSummary = !taskPayload || Array.isArray(taskPayload) ? null : taskPayload.summary;

  const laborChartData = laborCostsData?.chart_data ?? [];
  const laborTotalCost = laborCostsData?.total_cost ?? 0;
  const laborTotalHours = laborCostsData?.total_hours ?? 0;
  const laborCurrency = laborCostsData?.currency ?? "USD";
  const laborBudget = laborCostsData?.budget;
  const costPerHour = laborTotalHours > 0 ? laborTotalCost / laborTotalHours : 0;
  const topRoleCost = laborChartData.length
    ? Math.max(...laborChartData.map((d) => d.value))
    : 0;
  const topRoleName = laborChartData.length
    ? laborChartData.find((d) => d.value === topRoleCost)?.name ?? "—"
    : "—";

  const handleExportReport = () => {
    // Export generation is not wired yet — avoid fake success.
    window.alert(
      t("analytics.export_unavailable", {
        format: reportType.toUpperCase(),
        range: t(`analytics.range.${dateRange}`),
      }),
    );
  };

  const dash = "—";

  return (
    <div className={`${PAGE_SHELL_PADDED} space-y-6 min-w-0`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("analytics.title")}</h1>
        <div className="flex flex-wrap gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("analytics.range_placeholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">{t("analytics.range.week")}</SelectItem>
              <SelectItem value="month">{t("analytics.range.month")}</SelectItem>
              <SelectItem value="quarter">{t("analytics.range.quarter")}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder={t("analytics.format_placeholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="excel">Excel</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleExportReport}>
            <Download className="h-4 w-4 mr-2" /> {t("analytics.export")}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-center">
        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {format(new Date(startDate), "d MMMM yyyy", { locale: dateLocale })} – {format(new Date(endDate), "d MMMM yyyy", { locale: dateLocale })}
        </span>
      </div>

      <Tabs defaultValue="staff" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 gap-3 bg-transparent p-0">
          <TabsTrigger value="staff">{t("analytics.tab.staff")}</TabsTrigger>
          <TabsTrigger value="tasks">{t("analytics.tab.tasks")}</TabsTrigger>
          <TabsTrigger value="labor">{t("analytics.tab.labor")}</TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("analytics.staff.title")}</CardTitle>
              <CardDescription>{t("analytics.staff.desc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {staffLoading ? (
                <div className="flex items-center justify-center h-80">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
                    <p className="text-muted-foreground">{t("analytics.staff.loading")}</p>
                  </div>
                </div>
              ) : staffError ? (
                <ChartEmpty message={t("analytics.staff.error")} />
              ) : staffChart.length === 0 ? (
                <ChartEmpty message={t("analytics.staff.empty")} />
              ) : (
                <BarChartComponent
                  data={staffChart}
                  completedName={t("analytics.chart.tasks_completed")}
                  rateName={t("analytics.chart.completion_pct")}
                />
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <MetricCard
                  title={t("analytics.staff.top")}
                  loading={staffLoading}
                  value={staffSummary?.top_performer?.name ?? dash}
                  subtitle={
                    staffSummary?.top_performer
                      ? t("analytics.staff.completion_rate_value", { rate: staffSummary.top_performer.completion_rate })
                      : t("analytics.staff.no_staff")
                  }
                />
                <MetricCard
                  title={t("analytics.staff.average")}
                  loading={staffLoading}
                  value={
                    staffSummary && staffSummary.staff_with_tasks > 0
                      ? `${staffSummary.average_completion_rate}%`
                      : dash
                  }
                  subtitle={t("analytics.staff.average_hint")}
                />
                <MetricCard
                  title={t("analytics.staff.attention")}
                  loading={staffLoading}
                  value={
                    staffSummary
                      ? String(staffSummary.below_threshold_count)
                      : dash
                  }
                  subtitle={t("analytics.staff.below", { threshold: staffSummary?.threshold ?? 70 })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("analytics.tasks.title")}</CardTitle>
              <CardDescription>{t("analytics.tasks.desc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {taskLoading ? (
                <div className="flex items-center justify-center h-80">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
                    <p className="text-muted-foreground">{t("analytics.tasks.loading")}</p>
                  </div>
                </div>
              ) : taskError ? (
                <ChartEmpty message={t("analytics.tasks.error")} />
              ) : taskChart.every((d) => d.completed === 0 && d.total === 0) ? (
                <ChartEmpty message={t("analytics.tasks.empty")} />
              ) : (
                <LineChartComponent
                  data={taskChart}
                  completedName={t("analytics.chart.completed")}
                  createdName={t("analytics.chart.created")}
                />
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <MetricCard
                  title={t("analytics.tasks.rate")}
                  loading={taskLoading}
                  value={
                    taskSummary && taskSummary.total_tasks > 0
                      ? `${taskSummary.completion_rate}%`
                      : dash
                  }
                  subtitle={
                    taskSummary && taskSummary.total_tasks > 0
                      ? t("analytics.tasks.done_of", { done: taskSummary.completed_tasks, total: taskSummary.total_tasks })
                      : t("analytics.tasks.none")
                  }
                />
                <MetricCard
                  title={t("analytics.tasks.priority")}
                  loading={taskLoading}
                  value={taskSummary?.most_efficient_category?.name ?? dash}
                  subtitle={
                    taskSummary?.most_efficient_category
                      ? t("analytics.tasks.priority_rate", { rate: taskSummary.most_efficient_category.completion_rate })
                      : t("analytics.tasks.no_priority")
                  }
                />
                <MetricCard
                  title={t("analytics.tasks.overdue")}
                  loading={taskLoading}
                  value={taskSummary ? String(taskSummary.overdue_count) : dash}
                  subtitle={t("analytics.tasks.overdue_hint")}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="labor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("analytics.labor.title")}</CardTitle>
              <CardDescription>{t("analytics.labor.desc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {laborLoading ? (
                <div className="flex items-center justify-center h-80">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
                    <p className="text-muted-foreground">{t("analytics.labor.loading")}</p>
                  </div>
                </div>
              ) : laborError ? (
                <ChartEmpty message={t("analytics.labor.error")} />
              ) : laborChartData.length > 0 ? (
                <PieChartComponent data={laborChartData} />
              ) : (
                <ChartEmpty message={t("analytics.labor.empty")} />
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <Card>
                  <CardHeader className="py-2">
                    <CardTitle className="text-sm">{t("analytics.labor.total")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {laborLoading
                        ? "…"
                        : `${laborCurrency} ${Number(laborTotalCost).toLocaleString(numberLocale, {
                            minimumFractionDigits: 2,
                          })}`}
                    </div>
                    <p className="text-xs text-muted-foreground">{t("analytics.labor.period")}</p>
                    {laborBudget?.target_amount != null && (
                      <p className="text-xs mt-1">
                        {t("analytics.labor.budget")}: {laborCurrency}{" "}
                        {Number(laborBudget.target_amount).toLocaleString(numberLocale, {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                    )}
                  </CardContent>
                </Card>
                <MetricCard
                  title={t("analytics.labor.per_hour")}
                  loading={laborLoading}
                  value={`${laborCurrency} ${costPerHour.toFixed(2)}`}
                  subtitle={t("analytics.labor.hours", { hours: Number(laborTotalHours).toFixed(1) })}
                />
                <MetricCard
                  title={t("analytics.labor.top_role")}
                  loading={laborLoading}
                  value={laborChartData.length ? topRoleName : dash}
                  subtitle={
                    laborChartData.length
                      ? t("analytics.labor.role_total", {
                          amount: `${laborCurrency} ${Number(topRoleCost).toLocaleString(numberLocale, {
                            minimumFractionDigits: 2,
                          })}`,
                        })
                      : t("analytics.labor.no_roles")
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("analytics.labor.sales_title")}</CardTitle>
              <CardDescription>{t("analytics.labor.sales_desc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {salesLaborLoading ? (
                <p className="text-muted-foreground">{t("analytics.labor.sales_loading")}</p>
              ) : salesLaborRec ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">{t("analytics.labor.week")}</p>
                    <p className="text-muted-foreground">
                      {salesLaborRec.week_start} – {salesLaborRec.week_end}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t("analytics.labor.revenue")}</p>
                    <p className="text-lg font-semibold">
                      {salesLaborRec.currency}{" "}
                      {Number(salesLaborRec.estimated_revenue ?? 0).toLocaleString(numberLocale, {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t("analytics.labor.target")}</p>
                    <p className="text-muted-foreground">
                      {t("analytics.labor.target_of_sales", { pct: salesLaborRec.labor_target_percent })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t("analytics.labor.recommended")}</p>
                    <p className="text-lg font-semibold text-primary">
                      {salesLaborRec.currency}{" "}
                      {Number(salesLaborRec.recommended_labor_budget ?? 0).toLocaleString(numberLocale, {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  {t("analytics.labor.no_recommendation")}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SchedulingAnalytics;
