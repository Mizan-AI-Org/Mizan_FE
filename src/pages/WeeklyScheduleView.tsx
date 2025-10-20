import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays, PlusCircle } from 'lucide-react';
import { useAuth } from '../hooks/use-auth'; // Corrected import path
import { User } from '../contexts/AuthContext.types';
import { Button } from '@/components/ui/button';

const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:8000/api';

interface AssignedShift {
    id: string;
    shift_date: string;
    start_time: string;
    end_time: string;
    break_duration: number;
    role: string;
    notes: string | null;
    staff_info: { // Assuming UserSerializer provides this
        id: string;
        first_name: string;
        last_name;
        email: string;
    };
    actual_hours: number; // From the @property in Django model
}

interface WeeklyScheduleData {
    id: string;
    week_start: string;
    week_end: string;
    is_published: boolean;
    assigned_shifts: AssignedShift[];
}

const WeeklyScheduleView: React.FC = () => {
    const { user } = useAuth() as { user: User | null };
    const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 })); // Monday as start of week

    const formattedWeekStart = format(currentWeek, 'yyyy-MM-dd');

    const { data: scheduleData, isLoading, error } = useQuery<WeeklyScheduleData>({ // Specify the type of data expected
        queryKey: ['weeklySchedule', formattedWeekStart],
        queryFn: async () => {
            if (!user) return Promise.reject('No user');
            const response = await fetch(`${API_BASE}/schedule/weekly-schedule/?week_start=${formattedWeekStart}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch weekly schedule');
            }
            const data = await response.json();
            return data; // Assuming data directly contains WeeklyScheduleData or is wrapped
        },
        enabled: !!user, // Only fetch if user is logged in
    });

    const daysOfWeek = Array.from({ length: 7 }).map((_, i) =>
        startOfWeek(currentWeek, { weekStartsOn: 1 }).setDate(currentWeek.getDate() + i)
    );

    const goToPreviousWeek = () => {
        setCurrentWeek((prev) => subWeeks(prev, 1));
    };

    const goToNextWeek = () => {
        setCurrentWeek((prev) => addWeeks(prev, 1));
    };

    if (isLoading) return <div className="text-center py-8">Loading schedule...</div>;
    if (error) return <div className="text-center py-8 text-red-500">Error: {error.message}</div>;
    if (!user) return <div className="text-center py-8 text-gray-500">Please log in to view schedules.</div>;

    const shiftsByDay: { [key: string]: AssignedShift[] } = {};
    scheduleData?.assigned_shifts.forEach(shift => {
        const dateKey = format(new Date(shift.shift_date), 'yyyy-MM-dd');
        if (!shiftsByDay[dateKey]) {
            shiftsByDay[dateKey] = [];
        }
        shiftsByDay[dateKey].push(shift);
    });

    return (
        <div className="container mx-auto p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
                <CalendarDays className="w-8 h-8 mr-3 text-blue-600" />
                Weekly Schedule
            </h2>

            <div className="flex justify-between items-center mb-6 bg-gray-100 p-3 rounded-lg">
                <button onClick={goToPreviousWeek} className="p-2 rounded-full hover:bg-gray-200" aria-label="Previous Week">
                    <ChevronLeft className="w-6 h-6 text-gray-700" />
                </button>
                <h3 className="text-xl font-semibold text-gray-700">
                    {format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'MMM d, yyyy')} - {format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'MMM d, yyyy')}
                </h3>
                <button onClick={goToNextWeek} className="p-2 rounded-full hover:bg-gray-200" aria-label="Next Week">
                    <ChevronRight className="w-6 h-6 text-gray-700" />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
                {Array.from({ length: 7 }).map((_, i) => {
                    const date = startOfWeek(currentWeek, { weekStartsOn: 1 });
                    date.setDate(date.getDate() + i);
                    const dateKey = format(date, 'yyyy-MM-dd');
                    const dayShifts = shiftsByDay[dateKey] || [];

                    return (
                        <div key={dateKey} className="border rounded-lg p-4 bg-gray-50">
                            <h4 className="text-lg font-bold text-gray-800 mb-3">
                                {format(date, 'EEE, MMM d')}
                            </h4>
                            {
                                dayShifts.length > 0 ? (
                                    dayShifts.map(shift => (
                                        <div key={shift.id} className="bg-white rounded-md shadow-sm p-3 mb-3 border border-gray-200">
                                            <p className="font-semibold text-gray-900">{shift.staff_info.first_name} {shift.staff_info.last_name}</p>
                                            <p className="text-sm text-gray-600">{format(new Date(`2000-01-01T${shift.start_time}`), 'hh:mm a')} - {format(new Date(`2000-01-01T${shift.end_time}`), 'hh:mm a')}</p>
                                            <p className="text-xs text-gray-500">Role: {shift.role}</p>
                                            {shift.actual_hours && <p className="text-xs text-gray-500">Hours: {shift.actual_hours.toFixed(2)}</p>}
                                            {shift.notes && <p className="text-xs text-gray-500 italic">{shift.notes}</p>}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-500">No shifts</p>
                                )
                            }
                            <Button variant="ghost" className="w-full mt-2 text-blue-600 hover:bg-blue-50">
                                <PlusCircle className="w-4 h-4 mr-2" /> Add Shift
                            </Button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default WeeklyScheduleView;
