import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Search,
    Plus,
    Edit,
    Trash2,
    ArrowUpDown,
    MoreHorizontal,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { Order, OrderItem, Table, MenuItem } from "../../lib/types";
import {
    Table as ShadcnTable,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";

export default function OrdersPage() {
    const { accessToken } = useAuth();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [sortColumn, setSortColumn] = useState<keyof Order>("order_time");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isViewItemsDialogOpen, setIsViewItemsDialogOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [newOrder, setNewOrder] = useState<Omit<Order, 'id' | 'restaurant' | 'order_time' | 'total_amount' | 'is_paid' | 'created_at' | 'updated_at' | 'ordered_by_info' | 'table_info' | 'items'>>({
        table: undefined,
        ordered_by: undefined,
        status: "PENDING",
    });
    const [newOrderItems, setNewOrderItems] = useState<Omit<OrderItem, 'id' | 'order' | 'created_at' | 'updated_at' | 'menu_item_info'>[]>(
        [{ menu_item: "", quantity: 1, unit_price: 0, total_price: 0 }]
    );

    const { data: orders, isLoading, isError, error } = useQuery<Order[]>({
        queryKey: ["orders", accessToken],
        queryFn: () => api.getOrders(accessToken!),
        enabled: !!accessToken,
    });

    const { data: tables } = useQuery<Table[]>({
        queryKey: ["tables", accessToken],
        queryFn: () => api.getTables(accessToken!),
        enabled: !!accessToken,
    });

    const { data: menuItems } = useQuery<MenuItem[]>({
        queryKey: ["menuItems", accessToken],
        queryFn: () => api.getMenuItems(accessToken!),
        enabled: !!accessToken,
    });

    const { data: selectedOrderItems, isLoading: isLoadingOrderItems, isError: isErrorOrderItems } = useQuery<OrderItem[]>({
        queryKey: ["orderItems", selectedOrder?.id, accessToken],
        queryFn: () => api.getOrderItems(accessToken!, selectedOrder!.id),
        enabled: !!accessToken && !!selectedOrder?.id && isViewItemsDialogOpen,
    });

    const createOrderMutation = useMutation({
        mutationFn: (orderData: Omit<Order, 'id' | 'restaurant' | 'order_time' | 'total_amount' | 'is_paid' | 'created_at' | 'updated_at' | 'ordered_by_info' | 'table_info' | 'items'> & { items?: Omit<OrderItem, 'id' | 'order' | 'created_at' | 'updated_at' | 'menu_item_info'>[] }) => api.createOrder(accessToken!, orderData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            toast.success("Order created successfully!");
            setIsCreateDialogOpen(false);
            setNewOrder({
                table: undefined,
                ordered_by: undefined,
                status: "PENDING",
            });
            setNewOrderItems([{
                menu_item: "", quantity: 1, unit_price: 0, total_price: 0
            }]);
        },
        onError: (err) => {
            toast.error(`Failed to create order: ${err.message}`);
        },
    });

    const updateOrderMutation = useMutation({
        mutationFn: ({ id, order }: { id: string; order: Partial<Omit<Order, 'id' | 'restaurant' | 'order_time' | 'total_amount' | 'is_paid' | 'created_at' | 'updated_at' | 'ordered_by_info' | 'table_info' | 'items'>> }) => api.updateOrder(accessToken!, id, order),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            toast.success("Order updated successfully!");
            setIsEditDialogOpen(false);
            setSelectedOrder(null);
        },
        onError: (err) => {
            toast.error(`Failed to update order: ${err.message}`);
        },
    });

    const deleteOrderMutation = useMutation({
        mutationFn: (id: string) => api.deleteOrder(accessToken!, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            toast.success("Order deleted successfully!");
        },
        onError: (err) => {
            toast.error(`Failed to delete order: ${err.message}`);
        },
    });

    const updateOrderStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: Order['status'] }) => api.updateOrderStatus(accessToken!, id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            toast.success("Order status updated successfully!");
            setIsEditDialogOpen(false);
        },
        onError: (err) => {
            toast.error(`Failed to update order status: ${err.message}`);
        },
    });

    const handleSort = (column: keyof Order) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortColumn(column);
            setSortDirection("asc");
        }
    };

    const sortedAndFilteredOrders = (orders || [])
        .filter((order) =>
            order.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.table_info?.table_number.toString().includes(searchTerm.toLowerCase()) ||
            (order.ordered_by_info && `${order.ordered_by_info.first_name} ${order.ordered_by_info.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .filter((order) => filterStatus === "all" || order.status === filterStatus)
        .sort((a, b) => {
            const aValue = a[sortColumn];
            const bValue = b[sortColumn];

            if (typeof aValue === "string" && typeof bValue === "string") {
                return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            } else if (typeof aValue === "number" && typeof bValue === "number") {
                return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
            }
            return 0;
        });

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createOrderMutation.mutate({ ...newOrder, items: newOrderItems.filter(item => item.menu_item !== "") });
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedOrder) {
            updateOrderMutation.mutate({ id: selectedOrder.id, order: selectedOrder });
        }
    };

    const handleAddItem = () => {
        setNewOrderItems([...newOrderItems, { menu_item: "", quantity: 1, unit_price: 0, total_price: 0 }]);
    };

    const handleUpdateItem = (index: number, field: keyof Omit<OrderItem, 'id' | 'order' | 'created_at' | 'updated_at' | 'menu_item_info'>, value: any) => {
        const updatedItems = [...newOrderItems];
        updatedItems[index] = { ...updatedItems[index], [field]: value };

        if (field === "menu_item") {
            const selectedMenuItem = menuItems?.find(item => item.id === value);
            if (selectedMenuItem) {
                updatedItems[index].unit_price = selectedMenuItem.price;
                updatedItems[index].total_price = updatedItems[index].quantity * selectedMenuItem.price;
            }
        } else if (field === "quantity" || field === "unit_price") {
            updatedItems[index].total_price = updatedItems[index].quantity * updatedItems[index].unit_price;
        }

        setNewOrderItems(updatedItems);
        // Update total amount of the new order
        const newTotalAmount = updatedItems.reduce((sum, item) => sum + item.total_price, 0);
        setNewOrder(prev => ({ ...prev, total_amount: newTotalAmount }));
    };

    const handleRemoveItem = (index: number) => {
        const updatedItems = newOrderItems.filter((_, i) => i !== index);
        setNewOrderItems(updatedItems);
        // Update total amount of the new order
        const newTotalAmount = updatedItems.reduce((sum, item) => sum + item.total_price, 0);
        setNewOrder(prev => ({ ...prev, total_amount: newTotalAmount }));
    };


    if (isLoading) return <div>Loading orders...</div>;
    if (isError) return <div>Error: {error?.message}</div>;

    const orderStatusOptions = ["all", "PENDING", "PREPARING", "READY", "SERVED", "PAID", "CANCELLED"];

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Orders</h1>
                    <p className="text-muted-foreground">Manage customer orders in your restaurant.</p>
                </div>
                <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-gradient-primary hover:bg-primary/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Order
                </Button>
            </div>

            <Card className="shadow-soft">
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search orders by status, table, or staff..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <Select onValueChange={(value) => setFilterStatus(value)} value={filterStatus}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by Status" />
                            </SelectTrigger>
                            <SelectContent>
                                {orderStatusOptions.map((status) => (
                                    <SelectItem key={status} value={status}>
                                        {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase().replace("_", " ")}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <ShadcnTable>
                        <TableHeader>
                            <TableRow>
                                <TableHead onClick={() => handleSort("order_time")}>
                                    <div className="flex items-center">
                                        Order Time <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("table")}>
                                    <div className="flex items-center">
                                        Table <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("ordered_by")}>
                                    <div className="flex items-center">
                                        Ordered By <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("status")}>
                                    <div className="flex items-center">
                                        Status <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("total_amount")}>
                                    <div className="flex items-center justify-end">
                                        Total Amount <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedAndFilteredOrders.map((order) => (
                                <TableRow key={order.id}>
                                    <TableCell className="font-medium">{format(new Date(order.order_time), "PPP p")}</TableCell>
                                    <TableCell>{order.table_info?.table_number || "N/A"}</TableCell>
                                    <TableCell>{order.ordered_by_info ? `${order.ordered_by_info.first_name} ${order.ordered_by_info.last_name}` : "N/A"}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                order.status === "PENDING" ? "secondary" :
                                                    order.status === "PREPARING" ? "outline" :
                                                        order.status === "READY" ? "info" :
                                                            order.status === "SERVED" ? "default" :
                                                                order.status === "PAID" ? "success" :
                                                                    "destructive"
                                            }
                                        >
                                            {order.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">${order.total_amount.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => {
                                                    setSelectedOrder(order);
                                                    setIsEditDialogOpen(true);
                                                }}>
                                                    <Edit className="mr-2 h-4 w-4" /> Edit Status
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => {
                                                    setSelectedOrder(order);
                                                    setIsViewItemsDialogOpen(true);
                                                }}>
                                                    View Items
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => deleteOrderMutation.mutate(order.id)} className="text-destructive focus:text-destructive">
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </ShadcnTable>
                </CardContent>
            </Card>

            {/* Create Order Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create New Order</DialogTitle>
                        <DialogDescription>Fill in the details for the new order.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="table" className="text-right">Table</Label>
                                <Select onValueChange={(value) => setNewOrder({ ...newOrder, table: value })} value={newOrder.table || ""}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select a table (optional)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {tables?.filter(t => t.is_available).map((table) => (
                                            <SelectItem key={table.id} value={table.id}>
                                                Table {table.table_number} (Capacity: {table.capacity})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="status" className="text-right">Status</Label>
                                <Select onValueChange={(value) => setNewOrder({ ...newOrder, status: value as Order["status"] })} value={newOrder.status}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {["PENDING", "PREPARING", "READY", "SERVED", "PAID", "CANCELLED"].map((status) => (
                                            <SelectItem key={status} value={status}>
                                                {status}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <h3 className="text-lg font-semibold col-span-4">Order Items</h3>
                            {newOrderItems.map((item, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-4 items-center gap-4 border p-4 rounded-md">
                                    <Label htmlFor={`menu_item-${index}`} className="text-right md:col-span-1">Menu Item</Label>
                                    <Select onValueChange={(value) => handleUpdateItem(index, "menu_item", value)} value={item.menu_item || ""}>
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder="Select a menu item" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {menuItems?.map((menuItem) => (
                                                <SelectItem key={menuItem.id} value={menuItem.id}>
                                                    {menuItem.name} (${menuItem.price.toFixed(2)})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Label htmlFor={`quantity-${index}`} className="text-right md:col-span-1">Quantity</Label>
                                    <Input id={`quantity-${index}`} type="number" value={item.quantity} onChange={(e) => handleUpdateItem(index, "quantity", parseFloat(e.target.value))} className="col-span-3" min="1" />
                                    <Label htmlFor={`unit_price-${index}`} className="text-right md:col-span-1">Unit Price</Label>
                                    <Input id={`unit_price-${index}`} type="number" step="0.01" value={item.unit_price.toFixed(2)} onChange={(e) => handleUpdateItem(index, "unit_price", parseFloat(e.target.value))} className="col-span-3" readOnly />
                                    <Label className="text-right md:col-span-1">Total Price</Label>
                                    <Input value={item.total_price.toFixed(2)} readOnly className="col-span-3 bg-gray-100" />
                                    <Label htmlFor={`notes-${index}`} className="text-right md:col-span-1">Notes</Label>
                                    <Textarea id={`notes-${index}`} value={item.notes || ""} onChange={(e) => handleUpdateItem(index, "notes", e.target.value)} className="col-span-3" placeholder="Add special requests or notes" />
                                    <div className="col-span-4 flex justify-end">
                                        <Button type="button" variant="destructive" size="sm" onClick={() => handleRemoveItem(index)}>
                                            Remove Item
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            <Button type="button" variant="outline" onClick={handleAddItem} className="w-full">
                                <Plus className="w-4 h-4 mr-2" /> Add Another Item
                            </Button>
                        </div>

                        <DialogFooter>
                            <Button type="submit" disabled={createOrderMutation.isPending}>
                                {createOrderMutation.isPending ? "Creating..." : "Create Order"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Order Status Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Update Order Status</DialogTitle>
                        <DialogDescription>Change the status of the order.</DialogDescription>
                    </DialogHeader>
                    {selectedOrder && (
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            if (selectedOrder) {
                                updateOrderStatusMutation.mutate({ id: selectedOrder.id, status: selectedOrder.status });
                            }
                        }}>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-status" className="text-right">Status</Label>
                                    <Select onValueChange={(value) => setSelectedOrder({ ...selectedOrder, status: value as Order["status"] })} value={selectedOrder.status}>
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {["PENDING", "PREPARING", "READY", "SERVED", "PAID", "CANCELLED"].map((status) => (
                                                <SelectItem key={status} value={status}>
                                                    {status}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={updateOrderStatusMutation.isPending}>
                                    {updateOrderStatusMutation.isPending ? "Updating..." : "Update Status"}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* View Order Items Dialog */}
            <Dialog open={isViewItemsDialogOpen} onOpenChange={setIsViewItemsDialogOpen}>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Items for Order: {selectedOrder?.table_info?.table_number ? `Table ${selectedOrder.table_info.table_number}` : selectedOrder?.id}</DialogTitle>
                        <DialogDescription>List of items included in this order.</DialogDescription>
                    </DialogHeader>
                    {isLoadingOrderItems ? (
                        <div>Loading order items...</div>
                    ) : isErrorOrderItems ? (
                        <div>Error loading order items.</div>
                    ) : (selectedOrderItems && selectedOrderItems.length > 0 ? (
                        <ShadcnTable>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Quantity</TableHead>
                                    <TableHead>Unit Price</TableHead>
                                    <TableHead>Notes</TableHead>
                                    <TableHead className="text-right">Total Price</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {selectedOrderItems.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>{item.menu_item_info?.name || "N/A"}</TableCell>
                                        <TableCell>{item.quantity}</TableCell>
                                        <TableCell>${item.unit_price.toFixed(2)}</TableCell>
                                        <TableCell>{item.notes || "-"}</TableCell>
                                        <TableCell className="text-right">${item.total_price.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </ShadcnTable>
                    ) : (
                        <div>No items found for this order.</div>
                    ))}
                    <DialogFooter>
                        <Button onClick={() => setIsViewItemsDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
