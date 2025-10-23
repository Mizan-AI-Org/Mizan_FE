import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Coffee } from 'lucide-react';
import { useAuth } from '../../hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:8000/api';

interface Break {
    start: string;
    end: string | null;
    duration_minutes: number;
}

interface AttendanceRecord {
    date: string;
    clock_in: string;
    clock_out: string | null;
    total_hours: number;
    breaks: Break[];
    status: 'completed' | 'incomplete' | 'active';
    staff_info?: {
        first_name: string;
        last_name: string;
    };
}

const AttendanceHistory: React.FC = () => {
    const { user_id } = useParams<{ user_id?: string }>(); // Optional user_id for managers
    const { user } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());

    const isManagerView = !!user_id && (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN');
    const targetUserId = isManagerView ? user_id : user?.id;

    const formattedStartDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
    const formattedEndDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');

    const { data: attendanceHistory, isLoading, error } = useQuery<AttendanceRecord[]>({ // Specify the type of data expected
        queryKey: ['attendanceHistory', targetUserId, formattedStartDate, formattedEndDate],
        queryFn: async () => {
            if (!targetUserId) return Promise.reject('No user ID available');
            const endpoint = user_id
                ? `${API_BASE}/timeloss/attendance-history/${user_id}/?start_date=${formattedStartDate}&end_date=${formattedEndDate}`
                : `${API_BASE}/timeloss/attendance-history/?start_date=${formattedStartDate}&end_date=${formattedEndDate}`;

            const response = await fetch(endpoint, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch attendance history');
            }
            return response.json();
        },
        enabled: !!targetUserId,
    });

    const goToPreviousMonth = () => {
        setCurrentDate((prev) => subMonths(prev, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate((prev) => addMonths(prev, 1));
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

    if (!user) {
        return <div className="text-center py-8 text-gray-500">Please log in to view attendance history.</div>;
    }

    const totalHoursMonth = attendanceHistory?.reduce((sum, record) => sum + record.total_hours, 0) || 0;

    return (
        <div className="container mx-auto p-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
                <CalendarDays className="w-8 h-8 mr-3 text-blue-600" />
                Attendance History {isManagerView && user_id ? `for ${attendanceHistory?.[0]?.staff_info?.first_name || 'Staff'}` : ''}
            </h2>

            <div className="flex justify-between items-center mb-6 bg-gray-100 p-3 rounded-lg">
                <Button onClick={goToPreviousMonth} variant="ghost" size="icon">
                    <ChevronLeft className="w-6 h-6 text-gray-700" />
                </Button>
                <h3 className="text-xl font-semibold text-gray-700">
                    {format(currentDate, 'MMMM yyyy')}
                </h3>
                <Button onClick={goToNextMonth} variant="ghost" size="icon">
                    <ChevronRight className="w-6 h-6 text-gray-700" />
                </Button>
            </div>

            <Card className="mb-6 shadow-sm">
                <CardHeader>
                    <CardTitle>Monthly Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold text-gray-900 mb-2">{totalHoursMonth.toFixed(2)} Hours</p>
                    <Progress value={(totalHoursMonth / 160) * 100} className="w-full" /> {/* Assuming 160 hours for full-time */}
                    <p className="text-sm text-muted-foreground mt-1">{((totalHoursMonth / 160) * 100).toFixed(1)}% of typical full-time hours</p>
                </CardContent>
            </Card>

            <div className="space-y-4">
                {attendanceHistory?.length === 0 ? (
                    <p className="text-center text-gray-500">No attendance records for this period.</p>
                ) : (
                    attendanceHistory?.map((record) => (
                        <Card key={record.clock_in} className="shadow-sm">
                            <CardHeader className="flex-row items-center justify-between">
                                <CardTitle className="text-lg">{format(parseISO(record.date), 'PPP')}</CardTitle>
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${record.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                    {record.status === 'active' ? 'Clocked In' : record.status}
                                </span>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <p className="flex items-center text-gray-700"><Clock className="w-4 h-4 mr-2" /> Clock In:</p>
                                    <p>{format(parseISO(record.clock_in), 'hh:mm:ss a')}</p>
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="flex items-center text-gray-700"><Clock className="w-4 h-4 mr-2" /> Clock Out:</p>
                                    <p>{record.clock_out ? format(parseISO(record.clock_out), 'hh:mm:ss a') : '-'}</p>
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between font-semibold">
                                    <p>Total Hours:</p>
                                    <p>{record.total_hours.toFixed(2)}</p>
                                </div>

                                {record.breaks.length > 0 && (
                                    <div className="mt-4">
                                        <p className="font-semibold mb-2 flex items-center"><Coffee className="w-4 h-4 mr-2" /> Breaks:</p>
                                        <div className="space-y-1 ml-6">
                                            {record.breaks.map((b, idx) => (
                                                <div key={idx} className="flex justify-between text-sm text-gray-600">
                                                    <span>
                                                        {format(parseISO(b.start), 'hh:mm a')} -
                                                        {b.end ? format(parseISO(b.end), 'hh:mm a') : 'Active'}
                                                    </span>
                                                    <span>({b.duration_minutes.toFixed(1)} mins)</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};

export default AttendanceHistory;
