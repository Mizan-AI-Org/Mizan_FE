import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, LayoutDashboard, ShoppingCart, Utensils } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { API_BASE } from "@/lib/api";


interface OrderItem {
    id: string;
    product_info: { name: string; };
    quantity: number;
}

interface Order {
    id: string;
    order_type: string;
    status: string;
    table_number: string | null;
    customer_name: string | null;
    total_amount: number;
    created_at: string;
    items: OrderItem[];
}

interface Table {
    id: string;
    number: string;
    capacity: number;
    status: 'AVAILABLE' | 'OCCUPIED' | 'NEEDS_CLEANING' | 'OUT_OF_SERVICE';
    current_order_info: Order | null;
}

const SupervisorDashboard: React.FC = () => {
    const { user } = useAuth();

    const { data: restaurantOrders = [], isLoading: isLoadingOrders, error: ordersError } = useQuery<Order[]>({
        queryKey: ['restaurantOrders', user?.restaurant?.id],
        queryFn: async () => {
            if (!user?.restaurant?.id) return [];
            const response = await fetch(`${API_BASE}/staff/restaurant-orders/`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });
            if (!response.ok) {
                throw new Error('Failed to fetch restaurant orders');
            }
            return response.json();
        },
        enabled: !!user?.restaurant?.id && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'MANAGER'),
        refetchInterval: 15000, // Refresh data every 15 seconds 
    });

    const { data: tables = [], isLoading: isLoadingTables, error: tablesError } = useQuery<Table[]>({
        queryKey: ['tables', user?.restaurant?.id],
        queryFn: async () => {
            if (!user?.restaurant?.id) return [];
            const response = await fetch(`${API_BASE}/staff/tables/`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });
            if (!response.ok) {
                throw new Error('Failed to fetch tables');
            }
            return response.json();
        },
        enabled: !!user?.restaurant?.id && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'MANAGER'),
        refetchInterval: 15000, // Refresh data every 15 seconds 
    });

    if (isLoadingOrders || isLoadingTables) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (ordersError || tablesError) {
        return <div className="text-center py-8 text-red-500">Error: {ordersError?.message || tablesError?.message}</div>;
    }

    if (!user || (!['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role))) {
        return <div className="text-center py-8 text-gray-500">You do not have permission to view this page.</div>;
    }

    const getOrderStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-red-100 text-red-800';
            case 'PREPARING': return 'bg-yellow-100 text-yellow-800';
            case 'READY': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getTableStatusColor = (status: Table['status']) => {
        switch (status) {
            case 'AVAILABLE': return 'bg-green-100 text-green-800';
            case 'OCCUPIED': return 'bg-red-100 text-red-800';
            case 'NEEDS_CLEANING': return 'bg-yellow-100 text-yellow-800';
            case 'OUT_OF_SERVICE': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="container mx-auto p-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
                <LayoutDashboard className="w-8 h-8 mr-3 text-purple-600" />
                Supervisor Dashboard
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Active Orders Overview */}
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <ShoppingCart className="w-6 h-6 mr-2 text-blue-600" /> Active Orders ({restaurantOrders.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {restaurantOrders.length === 0 ? (
                            <p className="text-gray-500">No active orders.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {restaurantOrders.map(order => (
                                    <Card key={order.id} className="shadow-sm">
                                        <CardHeader className="flex-row items-center justify-between p-3">
                                            <CardTitle className="text-md">Order #{order.id.substring(0, 8)}</CardTitle>
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getOrderStatusColor(order.status)}`}>
                                                {order.status.replace(/_/g, ' ')}
                                            </span>
                                        </CardHeader>
                                        <CardContent className="p-3 text-sm">
                                            <p>Type: {order.order_type.replace(/_/g, ' ')}</p>
                                            {order.table_number && <p>Table: {order.table_number}</p>}
                                            {order.customer_name && <p>Customer: {order.customer_name}</p>}
                                            <p className="font-bold">Total: ${order.total_amount.toFixed(2)}</p>
                                            <p className="text-xs text-muted-foreground">{format(parseISO(order.created_at), 'MMM d, hh:mm a')}</p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Table Status Overview */}
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Utensils className="w-6 h-6 mr-2 text-green-600" /> Table Status ({tables.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {tables.length === 0 ? (
                            <p className="text-gray-500">No tables configured.</p>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {tables.map(table => (
                                    <Card key={table.id} className="shadow-sm p-3 text-center">
                                        <h3 className="text-lg font-semibold">Table {table.number}</h3>
                                        <p className={`text-sm font-medium ${getTableStatusColor(table.status)} rounded-full px-2 py-1 mt-1`}>
                                            {table.status.replace(/_/g, ' ')}
                                        </p>
                                        {table.current_order_info && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Order: #{table.current_order_info.id.substring(0, 8)}
                                            </p>
                                        )}
                                    </Card>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default SupervisorDashboard;
