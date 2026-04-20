import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { API_BASE } from '@/lib/api';

interface Table {
    id: string;
    table_number: number;
    capacity: number;
    section?: string | null;
    status:
        | 'AVAILABLE'
        | 'OCCUPIED'
        | 'RESERVED'
        | 'NEEDS_CLEANING'
        | 'MAINTENANCE';
    updated_at?: string;
}

const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem('access_token') || ''}`,
});

const CleaningTasks: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const canView =
        !!user &&
        ['CLEANER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN', 'OWNER'].includes(
            String(user.role || '').toUpperCase()
        );

    const { data: tables = [], isLoading, error } = useQuery<Table[]>({
        queryKey: ['tables-needing-cleaning', user?.restaurant],
        queryFn: async () => {
            const res = await fetch(
                `${API_BASE}/pos/tables/needing-cleaning/`,
                { headers: authHeader() }
            );
            if (!res.ok) {
                throw new Error('Failed to load cleaning queue.');
            }
            const data = await res.json();
            return Array.isArray(data) ? data : data.results || [];
        },
        enabled: canView,
        // Cleaning queue does not need sub-minute freshness — managers
        // glance and act, they don't watch it like a stock ticker.
        refetchInterval: 90_000,
        staleTime: 60_000,
    });

    const markClean = useMutation({
        mutationFn: async (tableId: string) => {
            const res = await fetch(
                `${API_BASE}/pos/tables/${tableId}/mark-clean/`,
                { method: 'POST', headers: authHeader() }
            );
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(
                    (body as { detail?: string }).detail ||
                        'Could not mark table clean.'
                );
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['tables-needing-cleaning'],
            });
            toast.success('Table marked clean.');
        },
        onError: (err: unknown) => {
            toast.error(err instanceof Error ? err.message : 'Action failed.');
        },
    });

    if (!canView) {
        return (
            <div className="max-w-2xl mx-auto px-6 py-16 text-center text-muted-foreground">
                You do not have permission to view the cleaning queue.
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                            <Sparkles className="h-6 w-6 text-emerald-600" />
                            Cleaning queue
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground max-w-xl">
                            Tables flip here after a dine-in order completes.
                            Wipe them down and tap{' '}
                            <span className="font-medium">Mark clean</span> so
                            guests can be seated again.
                        </p>
                    </div>
                    <Badge variant="secondary" className="h-7">
                        {tables.length} waiting
                    </Badge>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center h-48">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : error ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 p-4 text-sm text-red-700 dark:text-red-300">
                        {error instanceof Error
                            ? error.message
                            : 'Failed to load cleaning queue.'}
                    </div>
                ) : tables.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">
                            <Sparkles className="h-8 w-8 mx-auto mb-3 text-emerald-500" />
                            <p className="font-medium text-slate-800 dark:text-slate-200">
                                No tables need cleaning right now.
                            </p>
                            <p className="text-sm mt-1">
                                Good job keeping the floor ready.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {tables.map((table) => (
                            <Card
                                key={table.id}
                                className="border-amber-200/80 dark:border-amber-900/50"
                            >
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center justify-between text-lg">
                                        <span>Table {table.table_number}</span>
                                        <Badge
                                            variant="outline"
                                            className="border-amber-300 text-amber-700 dark:text-amber-300"
                                        >
                                            needs cleaning
                                        </Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <span className="inline-flex items-center gap-1.5">
                                            <Users className="h-4 w-4" />
                                            {table.capacity} seats
                                        </span>
                                        {table.section && (
                                            <span className="truncate">
                                                {table.section}
                                            </span>
                                        )}
                                    </div>
                                    <Button
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                        onClick={() =>
                                            markClean.mutate(table.id)
                                        }
                                        disabled={markClean.isPending}
                                    >
                                        {markClean.isPending
                                            ? 'Working…'
                                            : 'Mark clean'}
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CleaningTasks;
