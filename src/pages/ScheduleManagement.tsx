import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/use-auth';
import { AuthContextType } from '../contexts/AuthContext.types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Loader2, Plus } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import ScheduleTemplateModal from '../components/schedule/ScheduleTemplateModal';
import GenerateScheduleModal from '../components/schedule/GenerateScheduleModal';
import AssignedShiftModal from '../components/schedule/AssignedShiftModal';
import { API_BASE } from "@/lib/api";


interface AssignedShift {
    id: string;
    staff: string; // User ID
    staff_info: {
        id: string;
        first_name: string;
        last_name: string;
        email: string;
    };
    shift_date: string;
    start_time: string;
    end_time: string;
    role: string;
    notes: string | null;
}

interface WeeklyScheduleData {
    id: string;
    week_start: string;
    week_end: string;
    is_published: boolean;
    assigned_shifts: AssignedShift[];
}

const ScheduleManagement: React.FC = () => {
    const { user, logout } = useAuth() as AuthContextType;
    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 })); // Monday
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<ScheduleTemplate | null>(null);
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [selectedShift, setSelectedShift] = useState<AssignedShift | null>(null);
    const [currentShiftDate, setCurrentShiftDate] = useState<Date | null>(null);

    const { data: weeklySchedule, isLoading, error, refetch } = useQuery<WeeklyScheduleData>({
        queryKey: ['weekly-schedule', format(currentWeekStart, 'yyyy-MM-dd')],
        queryFn: async () => {
            const response = await fetch(`${API_BASE}/schedule/weekly-schedules/${format(currentWeekStart, 'yyyy-MM-dd')}/`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    logout();
                    throw new Error('Session expired');
                }
                throw new Error('Failed to fetch weekly schedule');
            }
            return response.json();
        },
    });

    const goToPreviousWeek = () => {
        setCurrentWeekStart((prev) => addDays(prev, -7));
    };

    const goToNextWeek = () => {
        setCurrentWeekStart((prev) => addDays(prev, 7));
    };

    const daysOfWeek = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="ml-2 text-gray-600">Loading schedule...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-red-500">Error: {error.message}</p>
                <Button onClick={() => refetch()} className="ml-4">Retry</Button>
            </div>
        );
    }

    // Group shifts by staff member and then by day
    const shiftsByStaffAndDay: { [staffId: string]: { [day: string]: AssignedShift[] } } = {};
    weeklySchedule?.assigned_shifts.forEach(shift => {
        if (!shiftsByStaffAndDay[shift.staff]) {
            shiftsByStaffAndDay[shift.staff] = {};
        }
        const shiftDay = format(new Date(shift.shift_date), 'yyyy-MM-dd');
        if (!shiftsByStaffAndDay[shift.staff][shiftDay]) {
            shiftsByStaffAndDay[shift.staff][shiftDay] = [];
        }
        shiftsByStaffAndDay[shift.staff][shiftDay].push(shift);
    });

    const allStaffIdsInSchedule = Array.from(new Set(weeklySchedule?.assigned_shifts.map(shift => shift.staff)));
    const uniqueStaffMembers = weeklySchedule?.assigned_shifts.reduce((acc, shift) => {
        if (!acc.find(s => s.id === shift.staff_info.id)) {
            acc.push(shift.staff_info);
        }
        return acc;
    }, [] as AssignedShift['staff_info'][]).sort((a, b) => a.first_name.localeCompare(b.first_name));

    return (
        <div className="container mx-auto py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Schedule Management</h1>
                <div className="flex gap-2">
                    <Button onClick={() => setIsGenerateModalOpen(true)}>
                        Generate Schedule
                    </Button>
                    <Button onClick={() => {
                        setSelectedTemplate(null); // For creating a new template
                        setIsTemplateModalOpen(true);
                    }}>
                        <Plus className="mr-2 h-4 w-4" /> Create Template
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <CardTitle className="text-xl font-semibold">
                        Week of {format(currentWeekStart, 'MMM dd, yyyy')}
                    </CardTitle>
                    <Button variant="outline" size="icon" onClick={goToNextWeek}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[150px]">Staff</TableHead>
                                {daysOfWeek.map((day) => (
                                    <TableHead key={day.toISOString()}>{format(day, 'EEE, MMM d')}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {uniqueStaffMembers?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center text-muted-foreground py-4">
                                        No shifts assigned for this week.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                uniqueStaffMembers?.map((staffMember) => (
                                    <TableRow key={staffMember.id}>
                                        <TableCell className="font-medium">
                                            {`${staffMember.first_name} ${staffMember.last_name}`}
                                        </TableCell>
                                        {daysOfWeek.map((day) => {
                                            const dayKey = format(day, 'yyyy-MM-dd');
                                            const shiftsForDay = shiftsByStaffAndDay[staffMember.id]?.[dayKey] || [];
                                            return (
                                                <TableCell key={dayKey} className="w-[150px]">
                                                    {shiftsForDay.length > 0 ? (
                                                        <div className="space-y-1">
                                                            {shiftsForDay.map(shift => (
                                                                <div
                                                                    key={shift.id}
                                                                    className="text-xs bg-blue-100 text-blue-800 rounded-md px-2 py-1 cursor-pointer hover:bg-blue-200"
                                                                    onClick={() => {
                                                                        setSelectedShift(shift);
                                                                        setIsShiftModalOpen(true);
                                                                    }}
                                                                >
                                                                    {`${shift.start_time.substring(0, 5)} - ${shift.end_time.substring(0, 5)} (${shift.role})`}
                                                                </div>
                                                            ))}
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="w-full mt-2"
                                                                onClick={() => {
                                                                    setSelectedShift(null);
                                                                    setCurrentShiftDate(day);
                                                                    setIsShiftModalOpen(true);
                                                                }}
                                                            >
                                                                <Plus className="h-3 w-3 mr-1" /> Add Shift
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-full"
                                                            onClick={() => {
                                                                setSelectedShift(null);
                                                                setCurrentShiftDate(day);
                                                                setIsShiftModalOpen(true);
                                                            }}
                                                        >
                                                            <Plus className="h-3 w-3 mr-1" /> Add Shift
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <ScheduleTemplateModal
                isOpen={isTemplateModalOpen}
                onClose={() => setIsTemplateModalOpen(false)}
                template={selectedTemplate}
            />
            <GenerateScheduleModal
                isOpen={isGenerateModalOpen}
                onClose={() => setIsGenerateModalOpen(false)}
            />
            <AssignedShiftModal
                isOpen={isShiftModalOpen}
                onClose={() => setIsShiftModalOpen(false)}
                shift={selectedShift}
                weeklyScheduleId={weeklySchedule?.id}
                initialDate={currentShiftDate || undefined}
            />
        </div>
    );
};

export default ScheduleManagement;
