import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Users, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:8000/api';

interface AssignedShift {
    id: string;
    staff: { id: string; first_name: string; last_name: string; email: string };
    shift_date: string;
    start_time: string;
    end_time: string;
    role: string;
    status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
    is_confirmed: boolean;
    actual_hours: number;
    notes?: string;
}

interface WeeklySchedule {
    id: string;
    week_start: string;
    week_end: string;
    is_published: boolean;
    assigned_shifts: AssignedShift[];
}

interface ScheduleAnalytics {
    total_shifts: number;
    total_hours: number;
    average_shift_hours: number;
    unique_staff: number;
    by_role: Record<string, { count: number; total_hours: number }>;
    confirmation_rate: number;
}

interface CoverageData {
    total_required: number;
    total_assigned: number;
    coverage_percentage: number;
    uncovered_shifts: number;
}

export const SchedulingDashboard: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [activeTab, setActiveTab] = useState('calendar');

    const weekStart = format(currentWeek, 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(currentWeek), 'yyyy-MM-dd');

    // Fetch weekly schedule
    const { data: schedule, isLoading: scheduleLoading } = useQuery<WeeklySchedule>({
        queryKey: ['schedule', weekStart],
        queryFn: async () => {
            const response = await fetch(
                `${API_BASE}/schedule/weekly-schedules-v2/?date_from=${weekStart}&date_to=${weekEnd}`,
                { headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` } }
            );
            if (!response.ok) throw new Error('Failed to load schedule');
            const data = await response.json();
            return data.results?.[0] || data;
        },
    });

    // Fetch analytics
    const { data: analytics } = useQuery<ScheduleAnalytics>({
        queryKey: ['schedule-analytics', weekStart],
        queryFn: async () => {
            if (!schedule?.id) return null;
            const response = await fetch(
                `${API_BASE}/schedule/weekly-schedules-v2/${schedule.id}/analytics/`,
                { headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` } }
            );
            if (!response.ok) throw new Error('Failed to load analytics');
            return response.json();
        },
        enabled: !!schedule?.id,
    });

    // Fetch coverage
    const { data: coverage } = useQuery<CoverageData>({
        queryKey: ['schedule-coverage', weekStart],
        queryFn: async () => {
            if (!schedule?.id) return null;
            const response = await fetch(
                `${API_BASE}/schedule/weekly-schedules-v2/${schedule.id}/coverage/`,
                { headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` } }
            );
            if (!response.ok) throw new Error('Failed to load coverage');
            return response.json();
        },
        enabled: !!schedule?.id,
    });

    // Confirm shift mutation
    const confirmShiftMutation = useMutation({
        mutationFn: async (shiftId: string) => {
            const response = await fetch(
                `${API_BASE}/schedule/assigned-shifts-v2/${shiftId}/confirm/`,
                {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
                }
            );
            if (!response.ok) throw new Error('Failed to confirm shift');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedule'] });
            queryClient.invalidateQueries({ queryKey: ['schedule-analytics'] });
        },
    });

    const daysOfWeek = Array.from({ length: 7 }).map((_, i) => addDays(currentWeek, i));

    const getShiftsForDay = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return schedule?.assigned_shifts?.filter(shift => shift.shift_date === dateStr) || [];
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Schedule Management</h1>
                    <p className="text-gray-600">
                        Week of {format(currentWeek, 'MMM d')} - {format(endOfWeek(currentWeek), 'MMM d, yyyy')}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button 
                        variant="outline"
                        onClick={() => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                    >
                        Today
                    </Button>
                    <Button 
                        variant="outline"
                        onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Coverage Alert */}
            {coverage && coverage.coverage_percentage < 80 && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Low coverage: {coverage.coverage_percentage}% of shifts assigned
                        ({coverage.uncovered_shifts} shifts still need staff)
                    </AlertDescription>
                </Alert>
            )}

            {/* Analytics Cards */}
            {analytics && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">{analytics.total_shifts}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">{analytics.total_hours.toFixed(1)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">Staff Count</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">{analytics.unique_staff}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">Confirmation</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">{analytics.confirmation_rate}%</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Main Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList>
                    <TabsTrigger value="calendar">
                        <Calendar className="h-4 w-4 mr-2" /> Calendar View
                    </TabsTrigger>
                    <TabsTrigger value="table">
                        <Users className="h-4 w-4 mr-2" /> List View
                    </TabsTrigger>
                </TabsList>

                {/* Calendar View */}
                <TabsContent value="calendar" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-7 gap-2">
                        {daysOfWeek.map((date) => {
                            const shifts = getShiftsForDay(date);
                            const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                            
                            return (
                                <Card 
                                    key={format(date, 'yyyy-MM-dd')}
                                    className={`cursor-pointer transition ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                                    onClick={() => setSelectedDate(date)}
                                >
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm">
                                            {format(date, 'EEE')}
                                            <br />
                                            {format(date, 'd MMM')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <p className="text-xs text-gray-600">
                                            {shifts.length} shifts
                                        </p>
                                        <div className="space-y-1">
                                            {shifts.slice(0, 3).map(shift => (
                                                <div
                                                    key={shift.id}
                                                    className="text-xs p-1 bg-blue-100 text-blue-900 rounded truncate"
                                                    title={`${shift.staff.first_name} ${shift.staff.last_name}`}
                                                >
                                                    {shift.start_time} - {shift.end_time}
                                                </div>
                                            ))}
                                            {shifts.length > 3 && (
                                                <p className="text-xs text-gray-500">+{shifts.length - 3} more</p>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Selected Day Details */}
                    {selectedDate && (
                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    Shifts for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {getShiftsForDay(selectedDate).length > 0 ? (
                                        getShiftsForDay(selectedDate).map(shift => (
                                            <div
                                                key={shift.id}
                                                className="flex items-center justify-between p-3 border rounded"
                                            >
                                                <div>
                                                    <p className="font-medium">
                                                        {shift.staff.first_name} {shift.staff.last_name}
                                                    </p>
                                                    <p className="text-sm text-gray-600">
                                                        {shift.start_time} - {shift.end_time}
                                                        ({shift.actual_hours} hours)
                                                    </p>
                                                    <span className="inline-block mt-1 text-xs px-2 py-1 bg-gray-100 rounded">
                                                        {shift.role}
                                                    </span>
                                                </div>
                                                <div className="text-right space-y-2">
                                                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                                        shift.is_confirmed 
                                                            ? 'bg-green-100 text-green-800' 
                                                            : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                        {shift.status}
                                                    </span>
                                                    {!shift.is_confirmed && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => confirmShiftMutation.mutate(shift.id)}
                                                        >
                                                            Confirm
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-gray-500 text-center py-4">No shifts scheduled for this day</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Table View */}
                <TabsContent value="table">
                    <Card>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-medium">Staff</th>
                                            <th className="px-4 py-3 text-left font-medium">Date</th>
                                            <th className="px-4 py-3 text-left font-medium">Time</th>
                                            <th className="px-4 py-3 text-left font-medium">Role</th>
                                            <th className="px-4 py-3 text-left font-medium">Hours</th>
                                            <th className="px-4 py-3 text-left font-medium">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {schedule?.assigned_shifts?.map(shift => (
                                            <tr key={shift.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3">
                                                    {shift.staff.first_name} {shift.staff.last_name}
                                                </td>
                                                <td className="px-4 py-3">{shift.shift_date}</td>
                                                <td className="px-4 py-3">
                                                    {shift.start_time} - {shift.end_time}
                                                </td>
                                                <td className="px-4 py-3">{shift.role}</td>
                                                <td className="px-4 py-3">{shift.actual_hours}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                        shift.is_confirmed 
                                                            ? 'bg-green-100 text-green-800' 
                                                            : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                        {shift.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default SchedulingDashboard;