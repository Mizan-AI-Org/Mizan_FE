import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/use-auth';
import { AssignedShift } from './WeeklyScheduleView'; // Reuse interface from WeeklyScheduleView

const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:8000/api';

interface ShiftSwapRequest {
    id: string;
    shift_to_swap: string; // ID of the shift being swapped
    shift_to_swap_info: AssignedShift; // Nested shift info
    requester: string; // ID of the requester
    requester_info: {
        id: string;
        first_name: string;
        last_name: string;
        email: string;
    };
    receiver: string | null; // ID of the receiver (optional)
    receiver_info: {
        id: string;
        first_name: string;
        last_name: string;
        email: string;
    } | null;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
    request_message: string | null;
    created_at: string;
}

const ManagerSwapRequests: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: swapRequests, isLoading, error } = useQuery<ShiftSwapRequest[]>({ // Specify the type of data expected
        queryKey: ['managerShiftSwapRequests', user?.restaurant?.id],
        queryFn: async () => {
            if (!user?.restaurant?.id) return [];
            const response = await fetch(`${API_BASE}/schedule/manager-shift-swap-requests/`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });
            if (!response.ok) throw new Error('Failed to fetch swap requests');
            return response.json();
        },
        enabled: !!user?.restaurant?.id && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN'),
        refetchInterval: 15000, // Refetch every 15 seconds
    });

    const handleActionMutation = useMutation({
        mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'reject' }) => {
            const response = await fetch(`${API_BASE}/schedule/shift-swap-requests/${id}/${action}/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to ${action} swap request`);
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['managerShiftSwapRequests'] });
            queryClient.invalidateQueries({ queryKey: ['myShifts'] }); // Invalidate staff's shifts too
            queryClient.invalidateQueries({ queryKey: ['weeklySchedule'] }); // Invalidate weekly schedule
            toast.success("Shift swap request updated successfully.");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to update shift swap request.");
        },
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

    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
        return <div className="text-center py-8 text-gray-500">You do not have permission to view this page.</div>;
    }

    return (
        <div className="container mx-auto p-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Shift Swap Requests</h2>

            <div className="space-y-4">
                {swapRequests?.length === 0 ? (
                    <p className="text-center text-gray-500">No pending shift swap requests.</p>
                ) : (
                    swapRequests?.map(request => (
                        <Card key={request.id} className="shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex justify-between items-center">
                                    <span>Request from {request.requester_info.first_name} {request.requester_info.last_name}</span>
                                    <span className={`text-sm font-medium ${request.status === 'PENDING' ? 'text-yellow-600' : request.status === 'APPROVED' ? 'text-green-600' : 'text-red-600'}`}>
                                        {request.status}
                                    </span>
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">Requested on {format(new Date(request.created_at), 'PPP p')}</p>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div>
                                    <p className="font-semibold">Shift to Swap:</p>
                                    <p className="text-sm text-gray-700">
                                        {format(new Date(request.shift_to_swap_info.shift_date), 'PPP')} {format(new Date(`2000-01-01T${request.shift_to_swap_info.start_time}`), 'hh:mm a')} - {format(new Date(`2000-01-01T${request.shift_to_swap_info.end_time}`), 'hh:mm a')}
                                        ({request.shift_to_swap_info.role})
                                    </p>
                                    <p className="text-sm text-gray-600">Original Staff: {request.shift_to_swap_info.staff_info.first_name} {request.shift_to_swap_info.staff_info.last_name}</p>
                                </div>
                                {request.receiver_info && (
                                    <div>
                                        <p className="font-semibold">Suggested Receiver:</p>
                                        <p className="text-sm text-gray-700">{request.receiver_info.first_name} {request.receiver_info.last_name} ({request.receiver_info.email})</p>
                                    </div>
                                )}
                                {request.request_message && (
                                    <div>
                                        <p className="font-semibold">Message:</p>
                                        <p className="text-sm text-gray-700 italic">"{request.request_message}"</p>
                                    </div>
                                )}

                                {request.status === 'PENDING' && (
                                    <div className="flex gap-3 mt-4">
                                        <Button
                                            onClick={() => handleActionMutation.mutate({ id: request.id, action: 'approve' })}
                                            disabled={handleActionMutation.isPending}
                                            className="bg-green-600 hover:bg-green-700"
                                        >
                                            <CheckCircle className="w-4 h-4 mr-2" /> Approve
                                        </Button>
                                        <Button
                                            onClick={() => handleActionMutation.mutate({ id: request.id, action: 'reject' })}
                                            disabled={handleActionMutation.isPending}
                                            variant="destructive"
                                        >
                                            <XCircle className="w-4 h-4 mr-2" /> Reject
                                        </Button>
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

export default ManagerSwapRequests;
