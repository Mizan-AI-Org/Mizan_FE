import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../hooks/use-auth';

const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:8000/api';

interface AssignedShift {
    id: string;
    shift_date: string;
    start_time: string;
    end_time: string;
    break_duration: number;
    role: string;
    notes: string | null;
    staff_info: {
        id: string;
        first_name: string;
        last_name: string;
        email: string;
    };
    actual_hours: number;
}

const ShiftDetailView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const { data: shift, isLoading, error } = useQuery<AssignedShift>({
        queryKey: ['shiftDetail', id],
        queryFn: async () => {
            if (!user) return Promise.reject('No user');
            const response = await fetch(`${API_BASE}/schedule/assigned-shifts/${id}/`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch shift details');
            }
            return response.json();
        },
        enabled: !!user && !!id,
    });

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

    if (!shift) {
        return <div className="text-center py-8 text-gray-500">Shift not found.</div>;
    }

    const formattedDate = format(new Date(shift.shift_date), 'PPP');
    const startTime = format(new Date(`2000-01-01T${shift.start_time}`), 'hh:mm a');
    const endTime = format(new Date(`2000-01-01T${shift.end_time}`), 'hh:mm a');

    return (
        <div className="container mx-auto p-6">
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Schedule
            </Button>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Shift Details</span>
                        {/* Add edit button here for admin/manager roles */}
                        {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
                            <Button variant="outline" size="sm" onClick={() => alert('Edit functionality coming soon!')}>
                                Edit Shift
                            </Button>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-lg"><span className="font-semibold">Staff:</span> {shift.staff_info.first_name} {shift.staff_info.last_name}</p>
                    <p className="text-lg"><span className="font-semibold">Role:</span> {shift.role}</p>
                    <p className="text-lg"><span className="font-semibold">Date:</span> {formattedDate}</p>
                    <p className="text-lg"><span className="font-semibold">Time:</span> {startTime} - {endTime}</p>
                    <p className="text-lg"><span className="font-semibold">Scheduled Hours:</span> {shift.actual_hours?.toFixed(2)}</p>
                    <p className="text-lg"><span className="font-semibold">Break Duration:</span> {shift.break_duration / 60} minutes</p>
                    {shift.notes && <p className="text-lg"><span className="font-semibold">Notes:</span> {shift.notes}</p>}
                </CardContent>
            </Card>
        </div>
    );
};

export default ShiftDetailView;
