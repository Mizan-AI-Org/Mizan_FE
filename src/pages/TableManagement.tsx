import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, Utensils, CheckCircle, XCircle, Wrench, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/use-auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:8000/api';

interface Order {
    id: string;
    order_type: string;
    status: string;
    total_amount: number;
}

interface Table {
    id: string;
    number: string;
    capacity: number;
    status: 'AVAILABLE' | 'OCCUPIED' | 'NEEDS_CLEANING' | 'OUT_OF_SERVICE';
    current_order: string | null; // Order ID
    current_order_info: Order | null; // Nested order info
}

const createTableSchema = z.object({
    number: z.string().min(1, "Table number is required"),
    capacity: z.coerce.number().min(1, "Capacity must be at least 1"),
});

type CreateTableFormValues = z.infer<typeof createTableSchema>;

const TableManagement: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showAssignOrderDialog, setShowAssignOrderDialog] = useState(false);
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const [orderIdToAssign, setOrderIdToAssign] = useState<string>('');

    const form = useForm<CreateTableFormValues>({
        resolver: zodResolver(createTableSchema),
        defaultValues: {
            number: '',
            capacity: 2,
        },
    });

    const { data: tables, isLoading, error, refetch } = useQuery<Table[]>({ // Specify the type of data expected
        queryKey: ['tables', user?.restaurant?.id],
        queryFn: async () => {
            if (!user?.restaurant?.id) return [];
            const response = await fetch(`${API_BASE}/staff/tables/`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });
            if (!response.ok) {
                if (response.status === 401) { /* logout(); */ }
                throw new Error('Failed to fetch tables');
            }
            return response.json();
        },
        enabled: !!user?.restaurant?.id && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN'),
        refetchInterval: 10000, // Refetch every 10 seconds to keep statuses updated
    });

    // Fetch pending orders to assign
    const { data: pendingOrders, isLoading: isLoadingPendingOrders } = useQuery<Order[]>({ // Specify the type of data expected
        queryKey: ['pendingOrders', user?.restaurant?.id],
        queryFn: async () => {
            if (!user?.restaurant?.id) return [];
            const response = await fetch(`${API_BASE}/staff/orders/?status=PENDING`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });
            if (!response.ok) {
                if (response.status === 401) { /* logout(); */ }
                throw new Error('Failed to fetch pending orders');
            }
            return response.json();
        },
        enabled: !!user?.restaurant?.id && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') && showAssignOrderDialog, // Only fetch when dialog is open
    });

    const createTableMutation = useMutation({
        mutationFn: async (data: CreateTableFormValues) => {
            const response = await fetch(`${API_BASE}/staff/tables/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.number || 'Failed to create table');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tables'] });
            toast.success("Table created successfully.");
            setShowCreateDialog(false);
            form.reset();
        },
        onError: (error) => {
            toast.error(error.message || "Failed to create table.");
        },
    });

    const updateTableStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: Table['status'] }) => {
            const response = await fetch(`${API_BASE}/staff/tables/${id}/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify({ status }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.status || 'Failed to update table status');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tables'] });
            toast.success("Table status updated successfully.");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to update table status.");
        },
    });

    const assignOrderMutation = useMutation({
        mutationFn: async ({ tableId, orderId }: { tableId: string; orderId: string }) => {
            const response = await fetch(`${API_BASE}/staff/tables/${tableId}/assign-order/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify({ order_id: orderId }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to assign order');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tables'] });
            queryClient.invalidateQueries({ queryKey: ['pendingOrders'] });
            toast.success("Order assigned to table successfully.");
            setShowAssignOrderDialog(false);
            setOrderIdToAssign('');
            setSelectedTableId(null);
        },
        onError: (error) => {
            toast.error(error.message || "Failed to assign order.");
        },
    });

    const clearOrderMutation = useMutation({
        mutationFn: async (tableId: string) => {
            const response = await fetch(`${API_BASE}/staff/tables/${tableId}/clear-order/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to clear order');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tables'] });
            queryClient.invalidateQueries({ queryKey: ['pendingOrders'] });
            toast.success("Order cleared from table successfully.");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to clear order.");
        },
    });

    const onCreateTableSubmit = (values: CreateTableFormValues) => {
        createTableMutation.mutate(values);
    };

    const handleAssignOrderClick = (tableId: string) => {
        setSelectedTableId(tableId);
        setShowAssignOrderDialog(true);
    };

    const handleConfirmAssignOrder = () => {
        if (selectedTableId && orderIdToAssign) {
            assignOrderMutation.mutate({ tableId: selectedTableId, orderId: orderIdToAssign });
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

    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
        return <div className="text-center py-8 text-gray-500">You do not have permission to view this page.</div>;
    }

    return (
        <div className="container mx-auto p-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Table Management</h2>

            <Button onClick={() => setShowCreateDialog(true)} className="mb-6">
                <PlusCircle className="w-4 h-4 mr-2" /> Create New Table
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {tables?.map(table => (
                    <Card
                        key={table.id}
                        className={`shadow-md ${table.status === 'OCCUPIED' ? 'border-red-400' : table.status === 'NEEDS_CLEANING' ? 'border-yellow-400' : 'border-green-400'}`}
                    >
                        <CardHeader>
                            <CardTitle>Table {table.number}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <p>Capacity: {table.capacity}</p>
                            <p>
                                Status:
                                <span className={`font-semibold ${table.status === 'OCCUPIED' ? 'text-red-600' : table.status === 'NEEDS_CLEANING' ? 'text-yellow-600' : 'text-green-600'}`}>
                                    {table.status.replace(/_/g, ' ')}
                                </span>
                            </p>
                            {table.current_order_info && (
                                <div>
                                    <p className="font-semibold">Current Order:</p>
                                    <p className="text-sm">ID: {table.current_order_info.id.substring(0, 8)}</p>
                                    <p className="text-sm">Type: {table.current_order_info.order_type.replace(/_/g, ' ')}</p>
                                    <p className="text-sm">Status: {table.current_order_info.status}</p>
                                    <p className="text-sm">Total: ${table.current_order_info.total_amount.toFixed(2)}</p>
                                </div>
                            )}

                            <div className="flex gap-2 mt-4 flex-wrap">
                                {table.status === 'AVAILABLE' && (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
                                    <Button variant="outline" size="sm" onClick={() => handleAssignOrderClick(table.id)}>
                                        <Utensils className="w-4 h-4 mr-2" /> Assign Order
                                    </Button>
                                )}
                                {table.status === 'OCCUPIED' && (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
                                    <Button variant="outline" size="sm" onClick={() => clearOrderMutation.mutate(table.id)} disabled={clearOrderMutation.isPending}>
                                        <CheckCircle className="w-4 h-4 mr-2" /> Clear Order
                                    </Button>
                                )}
                                {table.status === 'NEEDS_CLEANING' && (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
                                    <Button variant="outline" size="sm" onClick={() => updateTableStatusMutation.mutate({ id: table.id, status: 'AVAILABLE' })} disabled={updateTableStatusMutation.isPending}>
                                        <CheckCircle className="w-4 h-4 mr-2" /> Mark Clean
                                    </Button>
                                )}
                                {table.status !== 'OUT_OF_SERVICE' && (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
                                    <Button variant="outline" size="sm" onClick={() => updateTableStatusMutation.mutate({ id: table.id, status: 'OUT_OF_SERVICE' })} disabled={updateTableStatusMutation.isPending}>
                                        <XCircle className="w-4 h-4 mr-2" /> Out of Service
                                    </Button>
                                )}
                                {table.status === 'OUT_OF_SERVICE' && (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
                                    <Button variant="outline" size="sm" onClick={() => updateTableStatusMutation.mutate({ id: table.id, status: 'AVAILABLE' })} disabled={updateTableStatusMutation.isPending}>
                                        <Wrench className="w-4 h-4 mr-2" /> Mark Serviceable
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Create Table Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Create New Table</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onCreateTableSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="number"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Table Number</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., T1, Bar 3" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="capacity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Capacity</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} onChange={event => field.onChange(+event.target.value)} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full" disabled={createTableMutation.isPending}>
                                {createTableMutation.isPending ? 'Creating...' : 'Create Table'}
                            </Button>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Assign Order Dialog */}
            <Dialog open={showAssignOrderDialog} onOpenChange={setShowAssignOrderDialog}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Assign Order to Table {tables?.find(t => t.id === selectedTableId)?.number}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="order-to-assign">Select Order</Label>
                            <Select onValueChange={setOrderIdToAssign} value={orderIdToAssign}>
                                <SelectTrigger id="order-to-assign">
                                    <SelectValue placeholder="Select a pending order" />
                                </SelectTrigger>
                                <SelectContent>
                                    {isLoadingPendingOrders ? (
                                        <SelectItem value="" disabled>Loading orders...</SelectItem>
                                    ) : pendingOrders?.length === 0 ? (
                                        <SelectItem value="" disabled>No pending orders</SelectItem>
                                    ) : (
                                        pendingOrders?.map(order => (
                                            <SelectItem key={order.id} value={order.id}>
                                                Order {order.id.substring(0, 8)} - {order.order_type.replace(/_/g, ' ')} (${order.total_amount.toFixed(2)}) - Status: {order.status}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAssignOrderDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleConfirmAssignOrder} disabled={assignOrderMutation.isPending || !orderIdToAssign}>
                            {assignOrderMutation.isPending ? 'Assigning...' : 'Assign Order'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TableManagement;
