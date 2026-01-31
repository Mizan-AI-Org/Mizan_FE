import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, FileText, Download, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
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

    return (
        <div className="container mx-auto p-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
                <FileText className="w-8 h-8 mr-3 text-purple-600" />
                Reporting & Analytics
            </h2>

            <Card className="mb-6 shadow-sm">
                <CardHeader>
                    <CardTitle>Generate New Report</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="report-type">Report Type</Label>
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
                            <Label htmlFor="start-date">Start Date</Label>
                            <Input
                                id="start-date"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="end-date">End Date</Label>
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
                        className="w-full"
                    >
                        {generateReportMutation.isPending ? 'Generating...' : 'Generate Report'}
                    </Button>
                </CardContent>
            </Card>

            <h3 className="text-2xl font-bold text-gray-800 mb-4">Generated Reports</h3>
            <div className="space-y-4">
                {reports.length === 0 ? (
                    <p className="text-center text-gray-500">No reports generated yet.</p>
                ) : (
                    reports.map(report => (
                        <Card key={report.id} className="shadow-sm">
                            <CardHeader className="flex-row items-center justify-between">
                                <CardTitle>{ReportTypes.find(type => type.value === report.report_type)?.label || report.report_type}</CardTitle>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setViewingReport(report)}>
                                        <FileText className="w-4 h-4 mr-2" /> View Details
                                    </Button>
                                    {/* Optional: Add download functionality */}
                                    {/* <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" /> Download</Button> */}
                                </div>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground">
                                <p>Generated by: {report.generated_by_info.first_name} {report.generated_by_info.last_name}</p>
                                <p>On: {format(new Date(report.generated_at), 'PPP p')}</p>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Report Detail Dialog */}
            <Dialog open={!!viewingReport} onOpenChange={() => setViewingReport(null)}>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {ReportTypes.find(type => type.value === viewingReport?.report_type)?.label || viewingReport?.report_type} Details
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-4 bg-gray-50 rounded-md">
                        {viewingReport ? renderReportData(viewingReport) : <p>Select a report to view.</p>}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setViewingReport(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ReportsPage;
