import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, UtensilsCrossed } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';

const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:8000/api';

interface Table {
    id: string;
    number: string;
    capacity: number;
    status: 'AVAILABLE' | 'OCCUPIED' | 'NEEDS_CLEANING' | 'OUT_OF_SERVICE';
}

const CleaningTasks: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: tablesNeedingCleaning = [], isLoading, error } = useQuery<Table[]>({
        queryKey: ['tablesNeedingCleaning', user?.restaurant?.id],
        queryFn: async () => {
            if (!user?.restaurant?.id) return [];
            const response = await fetch(`${API_BASE}/staff/tables/needing-cleaning/`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });
            if (!response.ok) {
                throw new Error('Failed to fetch tables needing cleaning');
            }
            return response.json();
        },
        enabled: !!user?.restaurant?.id && user.role === 'CLEANER',
        refetchInterval: 10000, // Refetch every 10 seconds to get latest status
    });

    const markTableCleanMutation = useMutation({
        mutationFn: async (tableId: string) => {
            const response = await fetch(`${API_BASE}/staff/tables/${tableId}/mark-clean/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to mark table as clean');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tablesNeedingCleaning'] });
            toast.success("Table marked as clean.");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to mark table as clean.");
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

    if (!user || user.role !== 'CLEANER') {
        return <div className="text-center py-8 text-gray-500">You do not have permission to view this page.</div>;
    }

    return (
        <div className="container mx-auto p-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
                <UtensilsCrossed className="w-8 h-8 mr-3 text-blue-600" />
                Cleaning Tasks
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tablesNeedingCleaning.length === 0 ? (
                    <p className="text-center text-gray-500 col-span-full">No tables currently need cleaning. Good job!</p>
                ) : (
                    tablesNeedingCleaning.map(table => (
                        <Card key={table.id} className="shadow-sm bg-yellow-50 border-yellow-200">
                            <CardHeader>
                                <CardTitle className="text-xl">Table {table.number}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex justify-between items-center">
                                <p className="text-muted-foreground">Capacity: {table.capacity}</p>
                                <Button
                                    size="sm"
                                    onClick={() => markTableCleanMutation.mutate(table.id)}
                                    disabled={markTableCleanMutation.isPending}
                                >
                                    Mark as Clean
                                </Button>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};

export default CleaningTasks;
