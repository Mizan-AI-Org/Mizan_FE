import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ChefHat, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../../hooks/use-auth';
import { toast as sonnerToast } from 'sonner';

const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:8000/api';
const WS_BASE = import.meta.env.VITE_REACT_APP_WS_URL || 'ws://localhost:8000/ws';

interface Product {
    id: string;
    name: string;
    base_price: number;
}

interface OrderItem {
    id: string;
    product: string;
    product_info: Product;
    quantity: number;
    unit_price: number;
    total_price: number;
    notes: string | null;
}

interface Order {
    id: string;
    order_type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
    status: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
    table_number: string | null;
    customer_name: string | null;
    total_amount: number;
    created_at: string;
    items: OrderItem[];
}

interface WebSocketMessage {
    type: string;
    order: Order;
}

const KitchenDisplay: React.FC = () => {
    const { user, logout } = useAuth();
    const queryClient = useQueryClient();
    const ws = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    const { data: orders = [], isLoading, error } = useQuery<Order[]>({
        queryKey: ['kitchenOrders', user?.restaurant?.id],
        queryFn: async () => {
            if (!user?.restaurant?.id) return [];
            const response = await fetch(`${API_BASE}/staff/my-orders/?status=PENDING,PREPARING,READY`, { // Fetch orders relevant to kitchen 
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });

            if (!response.ok) {
                if (response.status === 401) logout();
                throw new Error('Failed to fetch kitchen orders');
            }
            return response.json();
        },
        enabled: !!user?.restaurant?.id,
    });

    const updateOrderStatusMutation = useMutation({
        mutationFn: async ({ orderId, status }: { orderId: string; status: Order['status'] }) => {
            const response = await fetch(`${API_BASE}/staff/orders/${orderId}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify({ status }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update order status');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['kitchenOrders'] });
            sonnerToast.success("Order status updated.");
        },
        onError: (error) => {
            sonnerToast.error(error.message || "Failed to update order status.");
        },
    });

    useEffect(() => {
        if (!user) {
            if (ws.current) {
                ws.current.close();
                ws.current = null;
            }
            return;
        }

        if (!ws.current) {
            ws.current = new WebSocket(`${WS_BASE}/ws/kitchen/?token=${localStorage.getItem('access_token')}`);

            ws.current.onopen = () => {
                console.log('Kitchen WebSocket Connected');
                setIsConnected(true);
            };

            ws.current.onmessage = (event) => {
                const data: WebSocketMessage = JSON.parse(event.data);
                if (data.type === 'order_update') {
                    queryClient.invalidateQueries({ queryKey: ['kitchenOrders'] });
                }
            };

            ws.current.onerror = (error) => {
                console.error('Kitchen WebSocket Error:', error);
                setIsConnected(false);
            };

            ws.current.onclose = () => {
                console.log('Kitchen WebSocket Disconnected');
                setIsConnected(false);
                setTimeout(() => {
                    if (user) {
                        ws.current = null;
                        queryClient.invalidateQueries({ queryKey: ['kitchenOrders'] });
                    }
                }, 5000);
            };
        }

        return () => {
            if (ws.current) {
                ws.current.close();
                ws.current = null;
            }
        };
    }, [user, queryClient]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="ml-2 text-gray-600">Loading orders...</p>
            </div>
        );
    }

    if (error) {
        return <div className="text-center py-8 text-red-500">Error: {error.message}</div>;
    }

    const pendingOrders = React.useMemo(() => orders.filter(order => order.status === 'PENDING'), [orders]);
    const preparingOrders = React.useMemo(() => orders.filter(order => order.status === 'PREPARING'), [orders]);
    const readyOrders = React.useMemo(() => orders.filter(order => order.status === 'READY'), [orders]);

    return (
        <div className="container mx-auto p-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
                <ChefHat className="w-8 h-8 mr-3 text-orange-600" />
                Kitchen Display System ({isConnected ? "Connected" : "Disconnected"})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Pending Orders */}
                <div className="col-span-1">
                    <h3 className="text-2xl font-semibold text-gray-700 mb-4">New Orders ({pendingOrders.length})</h3>
                    <div className="space-y-4">
                        {pendingOrders.length === 0 ? (
                            <p className="text-gray-500">No new orders.</p>
                        ) : (
                            pendingOrders.map(order => (
                                <OrderCard
                                    key={order.id}
                                    order={order}
                                    onUpdateStatus={updateOrderStatusMutation.mutate}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Preparing Orders */}
                <div className="col-span-1">
                    <h3 className="text-2xl font-semibold text-gray-700 mb-4">Preparing ({preparingOrders.length})</h3>
                    <div className="space-y-4">
                        {preparingOrders.length === 0 ? (
                            <p className="text-gray-500">No orders being prepared.</p>
                        ) : (
                            preparingOrders.map(order => (
                                <OrderCard
                                    key={order.id}
                                    order={order}
                                    onUpdateStatus={updateOrderStatusMutation.mutate}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Ready Orders */}
                <div className="col-span-1">
                    <h3 className="text-2xl font-semibold text-gray-700 mb-4">Ready ({readyOrders.length})</h3>
                    <div className="space-y-4">
                        {readyOrders.length === 0 ? (
                            <p className="text-gray-500">No orders ready for pickup.</p>
                        ) : (
                            readyOrders.map(order => (
                                <OrderCard
                                    key={order.id}
                                    order={order}
                                    onUpdateStatus={updateOrderStatusMutation.mutate}
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

interface OrderCardProps {
    order: Order;
    onUpdateStatus: ({ orderId, status }: { orderId: string; status: Order['status'] }) => void;
}

const OrderCard = React.memo(({
    order,
    onUpdateStatus
}: OrderCardProps) => {
    const timeSinceOrder = (new Date().getTime() - parseISO(order.created_at).getTime()) / (1000 * 60); // minutes

    const getStatusColor = (status: Order['status']) => {
        switch (status) {
            case 'PENDING': return 'bg-red-100 text-red-800';
            case 'PREPARING': return 'bg-yellow-100 text-yellow-800';
            case 'READY': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <Card className="shadow-md">
            <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-xl">Order #{order.id.substring(0, 8)}</CardTitle>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                    {order.status.replace(/_/g, ' ')}
                </span>
            </CardHeader>
            <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                    <Clock className="inline-block w-4 h-4 mr-1" />
                    {format(parseISO(order.created_at), 'MMM d, hh:mm a')} ({Math.round(timeSinceOrder)} mins ago)
                </p>
                {order.table_number && (
                    <p className="text-md font-medium">Table: {order.table_number}</p>
                )}
                {order.customer_name && (
                    <p className="text-md font-medium">Customer: {order.customer_name}</p>
                )}

                <div className="border-t pt-3 mt-3">
                    <p className="font-semibold mb-2">Items:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        {order.items.map(item => (
                            <li key={item.id} className="text-sm">
                                {item.quantity} x {item.product_info.name} (Notes: {item.notes || 'None'})
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    {order.status === 'PENDING' && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onUpdateStatus({ orderId: order.id, status: 'PREPARING' })}
                        >
                            <ChefHat className="w-4 h-4 mr-2" /> Start Preparing
                        </Button>
                    )}
                    {order.status === 'PREPARING' && (
                        <Button
                            size="sm"
                            onClick={() => onUpdateStatus({ orderId: order.id, status: 'READY' })}
                        >
                            <CheckCircle className="w-4 h-4 mr-2" /> Mark as Ready
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
});

export default KitchenDisplay;
