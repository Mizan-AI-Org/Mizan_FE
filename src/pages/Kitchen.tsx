import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, ChefHat } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  notes: string | null;
  status: string;
  products: {
    name: string;
  };
}

interface Order {
  id: string;
  order_number: string;
  order_type: string;
  status: string;
  created_at: string;
  tables: {
    name: string;
  } | null;
  order_items: OrderItem[];
}

export default function Kitchen() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    loadOrders();
    
    // Subscribe to real-time order updates
    const channel = supabase
      .channel('kitchen-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          loadOrders();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_items',
        },
        () => {
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadOrders = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", user.user.id)
      .single();

    if (restaurant) {
      const { data } = await supabase
        .from("orders")
        .select(`
          *,
          tables (name),
          order_items (
            *,
            products (name)
          )
        `)
        .eq("restaurant_id", restaurant.id)
        .in("status", ["pending", "confirmed", "preparing"])
        .order("created_at", { ascending: true });

      setOrders(data || []);
    }
  };

  const updateOrderStatus = async (orderId: string, status: "pending" | "confirmed" | "preparing" | "ready" | "served" | "completed" | "cancelled") => {
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Status Updated",
        description: `Order marked as ${status}`,
      });
      loadOrders();
    }
  };

  const updateItemStatus = async (itemId: string, status: "pending" | "confirmed" | "preparing" | "ready" | "served" | "completed" | "cancelled") => {
    const { error } = await supabase
      .from("order_items")
      .update({ status })
      .eq("id", itemId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update item status",
        variant: "destructive",
      });
    } else {
      loadOrders();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-500";
      case "confirmed": return "bg-blue-500";
      case "preparing": return "bg-orange-500";
      case "ready": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getTimeSince = (date: string) => {
    const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    return `${minutes} min ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChefHat className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">Kitchen Display</h1>
            <p className="text-muted-foreground">Real-time order tracking and management</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-lg">
            {orders.length} Active Orders
          </Badge>
        </div>
      </div>

      {orders.length === 0 ? (
        <Card className="p-12 text-center shadow-soft">
          <ChefHat className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground text-lg">No active orders</p>
          <p className="text-sm text-muted-foreground mt-2">New orders will appear here in real-time</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map(order => (
            <Card key={order.id} className="p-4 shadow-soft hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold">{order.order_number}</h3>
                  <p className="text-sm text-muted-foreground">
                    {order.tables?.name || order.order_type}
                  </p>
                </div>
                <Badge className={getStatusColor(order.status)}>
                  {order.status}
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <Clock className="h-4 w-4" />
                <span>{getTimeSince(order.created_at)}</span>
              </div>

              <div className="space-y-2 mb-4">
                {order.order_items.map(item => (
                  <div key={item.id} className="flex justify-between items-center p-2 bg-muted rounded">
                    <div>
                      <span className="font-medium">{item.quantity}x {item.products.name}</span>
                      {item.notes && (
                        <p className="text-sm text-muted-foreground">{item.notes}</p>
                      )}
                    </div>
                    <Badge variant="outline" className={getStatusColor(item.status)}>
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                {order.status === "pending" && (
                  <Button 
                    className="flex-1"
                    onClick={() => updateOrderStatus(order.id, "confirmed")}
                  >
                    Accept
                  </Button>
                )}
                {order.status === "confirmed" && (
                  <Button 
                    className="flex-1"
                    onClick={() => updateOrderStatus(order.id, "preparing")}
                  >
                    Start Cooking
                  </Button>
                )}
                {order.status === "preparing" && (
                  <Button 
                    className="flex-1"
                    onClick={() => updateOrderStatus(order.id, "ready")}
                  >
                    Mark Ready
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
