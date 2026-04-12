import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, FileText, BarChart2, Users, Package, Clock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { API_BASE } from "@/lib/api";


interface Report {
    id: string;
    report_type: string;
    generated_at: string;
    data: any; // JSON data for the report
    generated_by_info: { first_name: string; last_name: string; };
}

const ReportTypes = [
    { value: 'SALES_SUMMARY', label: 'Sales Summary' },
    { value: 'ATTENDANCE_OVERVIEW', label: 'Attendance Overview' },
    { value: 'INVENTORY_STATUS', label: 'Inventory Status' },
    { value: 'SHIFT_PERFORMANCE', label: 'Shift Performance' },
];

const ReportsPage: React.FC = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const queryClient = useQueryClient();
    const [selectedReportType, setSelectedReportType] = useState<string>(ReportTypes[0].value);
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [viewingReport, setViewingReport] = useState<Report | null>(null);

    const { data: reports = [], isLoading, error } = useQuery<Report[]>({
        queryKey: ['reports', user?.restaurant?.id],
        queryFn: async () => {
            if (!user?.restaurant?.id) return [];
            const response = await fetch(`${API_BASE}/reporting/reports/`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });
            if (!response.ok) {
                throw new Error('Failed to fetch reports');
            }
            return response.json();
        },
        enabled: !!user?.restaurant?.id && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'MANAGER' || user.role === 'OWNER'),
    });

    const generateReportMutation = useMutation({
        mutationFn: async (data: { report_type: string; start_date: string; end_date: string; }) => {
            const response = await fetch(`${API_BASE}/reporting/reports/generate/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate report');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reports'] });
            toast.success("Report generated successfully.");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to generate report.");
        },
    });

    const handleGenerateReport = () => {
        generateReportMutation.mutate({ report_type: selectedReportType, start_date: startDate, end_date: endDate });
    };

    const renderReportData = (report: Report) => {
        switch (report.report_type) {
            case 'SALES_SUMMARY':
                return (
                    <div className="space-y-2">
                        <p><strong>Total Sales:</strong> ${report.data.total_sales.toFixed(2)}</p>
                        <p><strong>Total Orders:</strong> {report.data.total_orders}</p>
                        <p><strong>Average Order Value:</strong> ${report.data.average_order_value.toFixed(2)}</p>
                        <h4 className="font-semibold mt-3">Top 5 Products:</h4>
                        <ul className="list-disc pl-5">
                            {report.data.top_products.map((item: any, index: number) => (
                                <li key={index}>{item.product__name} ({item.total_quantity} units)</li>
                            ))}
                        </ul>
                    </div>
                );
            case 'ATTENDANCE_OVERVIEW':
                return (
                    <div className="space-y-2">
                        {report.data.attendance_summary.map((staff: any, index: number) => (
                            <Card key={index} className="p-2 shadow-sm">
                                <p><strong>{staff.staff_name}</strong> ({staff.staff_role})</p>
                                <p>Total Hours Worked: {staff.total_hours_worked.toFixed(2)}</p>
                            </Card>
                        ))}
                    </div>
                );
            case 'INVENTORY_STATUS':
                return (
                    <div className="space-y-2">
                        <p className="text-muted-foreground italic">{report.data.note}</p>
                        <h4 className="font-semibold mt-3">Active Products:</h4>
                        <ul className="list-disc pl-5">
                            {report.data.product_list.map((prod: any, index: number) => (
                                <li key={index}>{prod.name} (${prod.base_price.toFixed(2)}) - Category: {prod.category__name}</li>
                            ))}
                        </ul>
                    </div>
                );
            case 'SHIFT_PERFORMANCE':
                return (
                    <div className="space-y-2">
                        {report.data.shift_performance_summary.map((shift: any, index: number) => (
                            <Card key={index} className="p-2 shadow-sm">
                                <p><strong>{shift.staff_name}</strong> ({shift.role})</p>
                                <p>Date: {shift.shift_date}</p>
                                <p>Time: {shift.start_time} - {shift.end_time}</p>
                                <p>Scheduled Hours: {shift.scheduled_hours.toFixed(2)}</p>
                            </Card>
                        ))}
                    </div>
                );
            default:
                return <pre>{JSON.stringify(report.data, null, 2)}</pre>;
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (error) {
        return <div className="text-center py-8 text-red-500">Error: {error.message}</div>;
    }

    if (!user || (!['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OWNER'].includes(user.role))) {
        return <div className="text-center py-8 text-gray-500">You do not have permission to view this page.</div>;
    }

    const hubLinks = [
        { to: "/dashboard/reports/sales/daily", titleKey: "reporting.sections.daily.title", descKey: "reporting.sections.daily.description", icon: BarChart2, color: "text-sky-600" },
        { to: "/dashboard/reports/attendance", titleKey: "reporting.sections.attendance.title", descKey: "reporting.sections.attendance.description", icon: Users, color: "text-emerald-600" },
        { to: "/dashboard/reports/inventory", titleKey: "reporting.sections.inventory.title", descKey: "reporting.sections.inventory.description", icon: Package, color: "text-violet-600" },
        { to: "/dashboard/reports/labor-attendance", titleKey: "reporting.sections.laborAttendance.title", descKey: "reporting.sections.laborAttendance.description", icon: Clock, color: "text-amber-600" },
    ];

    return (
        <div className="min-h-screen bg-slate-50/90 dark:bg-[#0f1419]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                <FileText className="h-6 w-6" aria-hidden />
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                                    {t("reporting.title")}
                                </h1>
                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
                                    {t("reporting.description")}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                        {t("reportsPage.hub_section")}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {hubLinks.map((item) => (
                            <Link key={item.to} to={item.to} className="group block">
                                <Card className="h-full border-slate-200/80 dark:border-slate-800 shadow-sm transition-all duration-200 hover:shadow-md hover:border-emerald-500/30">
                                    <CardContent className="p-5 flex flex-col gap-3 h-full">
                                        <div className="flex items-start gap-3 min-w-0">
                                            <item.icon className={`h-8 w-8 shrink-0 mt-0.5 ${item.color}`} aria-hidden />
                                            <div className="min-w-0 flex-1 space-y-1">
                                                <p className="font-semibold text-slate-900 dark:text-white leading-snug">{t(item.titleKey)}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t(item.descKey)}</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-end pt-0.5">
                                            <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-emerald-600 shrink-0 transition-colors" aria-hidden />
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </div>

            <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
                <CardHeader>
                    <CardTitle>{t("reportsPage.generate_title")}</CardTitle>
                    <CardDescription>{t("reportsPage.generate_desc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="report-type">{t("reportsPage.report_type")}</Label>
                            <Select value={selectedReportType} onValueChange={setSelectedReportType}>
                                <SelectTrigger id="report-type">
                                    <SelectValue placeholder="Select a report type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ReportTypes.map(type => (
                                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="start-date">{t("reportsPage.start_date")}</Label>
                            <Input
                                id="start-date"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="end-date">{t("reportsPage.end_date")}</Label>
                            <Input
                                id="end-date"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <Button
                        onClick={handleGenerateReport}
                        disabled={generateReportMutation.isPending}
                        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        {generateReportMutation.isPending ? t("reportsPage.generating") : t("reportsPage.generate_cta")}
                    </Button>
                </CardContent>
            </Card>

            <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{t("reportsPage.generated_list_title")}</h3>
            <div className="space-y-4">
                {reports.length === 0 ? (
                    <Card className="border-dashed border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/40">
                        <CardContent className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm">
                            {t("reportsPage.empty")}
                        </CardContent>
                    </Card>
                ) : (
                    reports.map(report => (
                        <Card key={report.id} className="shadow-sm border-slate-200/80 dark:border-slate-800">
                            <CardHeader className="flex-row items-center justify-between">
                                <CardTitle>{ReportTypes.find(type => type.value === report.report_type)?.label || report.report_type}</CardTitle>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setViewingReport(report)}>
                                        <FileText className="w-4 h-4 mr-2" /> {t("reportsPage.view_details")}
                                    </Button>
                                    {/* Optional: Add download functionality */}
                                    {/* <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" /> Download</Button> */}
                                </div>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground">
                                <p>{t("reportsPage.generated_by")} {report.generated_by_info.first_name} {report.generated_by_info.last_name}</p>
                                <p>{t("reportsPage.generated_on")} {format(new Date(report.generated_at), 'PPP p')}</p>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
            </div>

            {/* Report Detail Dialog */}
            <Dialog open={!!viewingReport} onOpenChange={(open) => !open && setViewingReport(null)}>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto z-[3100]">
                    <DialogHeader>
                        <DialogTitle>
                            {(ReportTypes.find(type => type.value === viewingReport?.report_type)?.label || viewingReport?.report_type) + " — " + t("reportsPage.detail_title_suffix")}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-100 dark:border-slate-800">
                        {viewingReport ? renderReportData(viewingReport) : <p>{t("reportsPage.select_report")}</p>}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setViewingReport(null)}>{t("reportsPage.close")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            </div>
        </div>
    );
};

export default ReportsPage;
