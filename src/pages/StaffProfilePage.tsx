import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ArrowLeft,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Clock,
    Shield,
    BadgeCheck,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    FileText,
    MoreVertical,
    Download,
    Edit,
    LogIn,
    LogOut,
    Loader2
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { API_BASE, api } from "@/lib/api";
import { useAuth, AuthContextType } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";

interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

interface StaffMember {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    role_display: string;
    phone: string;
    created_at: string;
    is_active: boolean;
}

interface StaffProfile {
    id: string;
    position: string;
    hire_date: string;
    hourly_rate: number;
    emergency_contact_name: string;
    emergency_contact_phone: string;
    skills: string[];
    certifications: string[];
    notes: string;
}

interface AttendanceRecord {
    date: string;
    clock_in: string;
    clock_out: string | null;
    total_hours: number;
    status: string;
    breaks: any[];
}

interface PerformanceMetric {
    id: string;
    metric_type: string;
    value: number;
    date: string;
    notes: string;
}

const StaffProfilePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user: authUser, logout } = useAuth() as AuthContextType;
    const queryClient = useQueryClient();
    const [dateRange, setDateRange] = useState({
        start: format(subMonths(new Date(), 1), "yyyy-MM-dd"),
        end: format(new Date(), "yyyy-MM-dd")
    });

    const token = localStorage.getItem("access_token");

    // Fetch basic user info
    const { data: staffMember, isLoading: isStaffLoading } = useQuery<StaffMember>({
        queryKey: ["staff-member", id],
        queryFn: async () => {
            const response = await fetch(`${API_BASE}/users/${id}/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                if (response.status === 401) logout();
                throw new Error("Failed to fetch staff member info");
            }
            return response.json();
        },
    });

    // Fetch detailed profile
    const { data: profile, isLoading: isProfileLoading } = useQuery<StaffProfile>({
        queryKey: ["staff-profile", id],
        queryFn: async () => {
            const response = await fetch(`${API_BASE}/staff/profiles/${id}/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) return null;
            return response.json();
        },
    });

    // Fetch attendance history
    const { data: attendance, isLoading: isAttendanceLoading } = useQuery<AttendanceRecord[]>({
        queryKey: ["staff-attendance", id, dateRange.start, dateRange.end],
        queryFn: async () => {
            const response = await fetch(
                `${API_BASE}/timeclock/attendance-history/${id}/?start_date=${dateRange.start}&end_date=${dateRange.end}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!response.ok) return [];
            return response.json();
        },
    });

    // Fetch performance metrics
    const { data: metrics, isLoading: isMetricsLoading } = useQuery<PaginatedResponse<PerformanceMetric>>({
        queryKey: ["staff-metrics", id],
        queryFn: async () => {
            const response = await fetch(`${API_BASE}/staff/performance/?staff_id=${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) return { count: 0, next: null, previous: null, results: [] };
            return response.json();
        },
    });

    // Calculate stats
    const stats = React.useMemo(() => {
        if (!attendance) return { rate: "0%", hours: 0, shifts: 0 };
        const totalShifts = attendance.length;
        const completedShifts = attendance.filter(r => r.status === 'completed').length;
        const totalHours = attendance.reduce((acc, curr) => acc + (curr.total_hours || 0), 0);
        const rate = totalShifts > 0 ? `${Math.round((completedShifts / totalShifts) * 100)}%` : "N/A";

        return {
            rate,
            hours: totalHours.toFixed(1),
            shifts: totalShifts
        };
    }, [attendance]);

    const handleDownloadReport = async () => {
        try {
            const response = await fetch(`${API_BASE}/staff/profiles/${id}/report/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error("Failed to generate report");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `report_${staffMember?.last_name || 'staff'}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to download performance report",
                variant: "destructive"
            });
        }
    };

    // Manager clock-in/clock-out (for staff who lost phone)
    const isManager = authUser?.role && ['SUPER_ADMIN', 'ADMIN', 'OWNER', 'MANAGER'].includes(authUser.role);
    const isViewingOtherStaff = id && authUser?.id && String(id) !== String(authUser.id);
    const isClockedIn = attendance?.some(r => r.status === 'active') ?? false;

    const managerClockInMutation = useMutation({
        mutationFn: () => api.managerClockIn(id!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff-attendance', id] });
            toast({ title: "Success", description: "Staff clocked in successfully (manager override)" });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message || "Failed to clock in", variant: "destructive" });
        },
    });
    const managerClockOutMutation = useMutation({
        mutationFn: () => api.managerClockOut(id!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff-attendance', id] });
            toast({ title: "Success", description: "Staff clocked out successfully (manager override)" });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message || "Failed to clock out", variant: "destructive" });
        },
    });

    if (isStaffLoading) {
        return (
            <div className="p-8 space-y-6">
                <Skeleton className="h-12 w-48" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                </div>
                <Skeleton className="h-[400px]" />
            </div>
        );
    }

    if (!staffMember) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h2 className="text-xl font-bold">Staff member not found</h2>
                <Button variant="link" onClick={() => navigate(-1)}>Go back</Button>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-8 bg-slate-50 dark:bg-slate-950 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <Avatar className="h-16 w-16 border-2 border-white shadow-sm">
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                            {staffMember.first_name[0]}{staffMember.last_name[0]}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                            {staffMember.first_name} {staffMember.last_name}
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="font-medium">
                                {staffMember.role_display}
                            </Badge>
                            <span className="text-sm text-slate-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Joined {format(new Date(staffMember.created_at), "MMM yyyy")}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleDownloadReport}>
                        <Download className="w-4 h-4 mr-2" />
                        Download Report
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon">
                                <MoreVertical className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/dashboard/staff-app?edit=${id}`)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Profile
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-none shadow-sm bg-white dark:bg-slate-900">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Attendance Rate</p>
                                <p className="text-2xl font-bold">{stats.rate}</p>
                            </div>
                            <div className="p-2 bg-emerald-100 rounded-lg">
                                <BadgeCheck className="w-6 h-6 text-emerald-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-white dark:bg-slate-900">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Hours This Month</p>
                                <p className="text-2xl font-bold">{stats.hours}</p>
                            </div>
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Clock className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-white dark:bg-slate-900">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Total Shifts</p>
                                <p className="text-2xl font-bold">{stats.shifts}</p>
                            </div>
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <Calendar className="w-6 h-6 text-amber-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-white dark:bg-slate-900">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Hourly Rate</p>
                                <p className="text-2xl font-bold">
                                    {profile?.hourly_rate ? `$${profile.hourly_rate}` : "N/A"}
                                </p>
                            </div>
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <TrendingUp className="w-6 h-6 text-purple-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Contact & Info Column */}
                <div className="space-y-6">
                    <Card className="border-none shadow-sm bg-white dark:bg-slate-900">
                        <CardHeader>
                            <CardTitle className="text-lg">Contact Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Mail className="w-4 h-4 text-slate-400" />
                                <span className="text-sm font-medium">{staffMember.email}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Phone className="w-4 h-4 text-slate-400" />
                                <span className="text-sm font-medium">{staffMember.phone || "No phone added"}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Shield className="w-4 h-4 text-slate-400" />
                                <div className="text-sm">
                                    <p className="font-medium">{profile?.emergency_contact_name || "No emergency contact"}</p>
                                    <p className="text-slate-500">{profile?.emergency_contact_phone}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {isManager && isViewingOtherStaff && (
                        <Card className="border-none shadow-sm bg-white dark:bg-slate-900">
                            <CardHeader>
                                <CardTitle className="text-lg">Manager Actions</CardTitle>
                                <CardDescription>Clock in/out on behalf of staff (e.g. lost phone)</CardDescription>
                            </CardHeader>
                            <CardContent className="flex gap-2">
                                {isClockedIn ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => managerClockOutMutation.mutate()}
                                        disabled={managerClockOutMutation.isPending}
                                    >
                                        {managerClockOutMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
                                        Clock Out (Manager)
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => managerClockInMutation.mutate()}
                                        disabled={managerClockInMutation.isPending}
                                    >
                                        {managerClockInMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogIn className="w-4 h-4 mr-2" />}
                                        Clock In (Manager)
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    )}
                    <Card className="border-none shadow-sm bg-white dark:bg-slate-900">
                        <CardHeader>
                            <CardTitle className="text-lg">Skills & Certifications</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Skills</p>
                                <div className="flex flex-wrap gap-2">
                                    {profile?.skills && profile.skills.length > 0 ? (
                                        profile.skills.map(skill => (
                                            <Badge key={skill} variant="outline" className="bg-slate-50">
                                                {skill}
                                            </Badge>
                                        ))
                                    ) : (
                                        <span className="text-sm text-slate-400 italic">No skills listed</span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Certifications</p>
                                <div className="flex flex-wrap gap-2">
                                    {profile?.certifications && profile.certifications.length > 0 ? (
                                        profile.certifications.map(cert => (
                                            <Badge key={cert} variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                                {cert}
                                            </Badge>
                                        ))
                                    ) : (
                                        <span className="text-sm text-slate-400 italic">No certifications</span>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* History Column */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-none shadow-sm bg-white dark:bg-slate-900">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-lg">Recent Attendance</CardTitle>
                                <CardDescription>Last 30 days of activity</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isAttendanceLoading ? (
                                <div className="space-y-3">
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                            ) : attendance && attendance.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Clock In</TableHead>
                                            <TableHead>Clock Out</TableHead>
                                            <TableHead>Duration</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {attendance.slice(0, 10).map((record, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="font-medium">
                                                    {format(new Date(record.date), "MMM d, yyyy")}
                                                </TableCell>
                                                <TableCell>
                                                    {format(new Date(record.clock_in), "h:mm a")}
                                                </TableCell>
                                                <TableCell>
                                                    {record.clock_out ? format(new Date(record.clock_out), "h:mm a") : "-"}
                                                </TableCell>
                                                <TableCell>{record.total_hours}h</TableCell>
                                                <TableCell>
                                                    <Badge variant={record.status === 'completed' ? 'secondary' : 'outline'} className={record.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}>
                                                        {record.status}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-12 text-slate-500">
                                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p>No attendance records found for this period</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-white dark:bg-slate-900">
                        <CardHeader>
                            <CardTitle className="text-lg">Performance Metrics</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isMetricsLoading ? (
                                <Skeleton className="h-40 w-full" />
                            ) : metrics?.results && metrics.results.length > 0 ? (
                                <div className="space-y-4">
                                    {metrics.results.map(metric => (
                                        <div key={metric.id} className="flex items-center justify-between p-3 border rounded-lg">
                                            <div>
                                                <p className="font-medium">{metric.metric_type}</p>
                                                <p className="text-xs text-slate-500">{format(new Date(metric.date), "MMM d, yyyy")}</p>
                                                {metric.notes && <p className="text-sm mt-1 text-slate-600">{metric.notes}</p>}
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold">{metric.value}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-slate-500">
                                    <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p>No performance metrics recorded yet</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default StaffProfilePage;
