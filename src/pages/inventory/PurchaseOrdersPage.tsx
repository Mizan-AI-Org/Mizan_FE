import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Search,
    Plus,
    Edit,
    Trash2,
    ArrowUpDown,
    MoreHorizontal,
    CalendarIcon,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { PurchaseOrder, Supplier, PurchaseOrderItem, InventoryItem } from "../../lib/types";
import {
    Table,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export default function PurchaseOrdersPage() {
    const { accessToken } = useAuth();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [sortColumn, setSortColumn] = useState<keyof PurchaseOrder>("order_date");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isViewItemsDialogOpen, setIsViewItemsDialogOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
    const [newOrder, setNewOrder] = useState<Omit<PurchaseOrder, 'id' | 'restaurant' | 'created_at' | 'updated_at' | 'supplier_info'>>({
        supplier: "",
        order_date: format(new Date(), "yyyy-MM-dd"),
        expected_delivery_date: undefined,
        delivery_date: undefined,
        status: "PENDING",
        total_amount: 0,
    });
    const [newOrderItems, setNewOrderItems] = useState<Omit<PurchaseOrderItem, 'id' | 'purchase_order' | 'created_at' | 'updated_at' | 'inventory_item_info'>[]>(
        [{ inventory_item: "", quantity: 0, unit_price: 0, total_price: 0 }]
    );

    const { data: purchaseOrders, isLoading, isError, error } = useQuery<PurchaseOrder[]>({ 
        queryKey: ["purchaseOrders", accessToken],
        queryFn: () => api.getPurchaseOrders(accessToken!),
        enabled: !!accessToken,
    });

    const { data: suppliers } = useQuery<Supplier[]>({ 
        queryKey: ["suppliers", accessToken],
        queryFn: () => api.getSuppliers(accessToken!),
        enabled: !!accessToken,
    });

    const { data: inventoryItems } = useQuery<InventoryItem[]>({ 
        queryKey: ["inventoryItems", accessToken],
        queryFn: () => api.getInventoryItems(accessToken!),
        enabled: !!accessToken,
    });

    const { data: selectedOrderItems, isLoading: isLoadingOrderItems, isError: isErrorOrderItems } = useQuery<PurchaseOrderItem[]>({ 
        queryKey: ["purchaseOrderItems", selectedOrder?.id, accessToken],
        queryFn: () => api.getPurchaseOrderItems(accessToken!, selectedOrder!.id),
        enabled: !!accessToken && !!selectedOrder?.id && isViewItemsDialogOpen,
    });

    const createOrderMutation = useMutation({
        mutationFn: (order: Omit<PurchaseOrder, 'id' | 'restaurant' | 'created_at' | 'updated_at' | 'supplier_info'>) => api.createPurchaseOrder(accessToken!, order),
        onSuccess: (createdOrder) => {
            // Create purchase order items after the order is created
            const itemPromises = newOrderItems.map(item => 
                api.createPurchaseOrderItem(accessToken!, createdOrder.id, item)
            );
            Promise.all(itemPromises).then(() => {
                queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
                toast.success("Purchase order created successfully!");
                setIsCreateDialogOpen(false);
                setNewOrder({
                    supplier: "",
                    order_date: format(new Date(), "yyyy-MM-dd"),
                    expected_delivery_date: undefined,
                    delivery_date: undefined,
                    status: "PENDING",
                    total_amount: 0,
                });
                setNewOrderItems([{
                    inventory_item: "", quantity: 0, unit_price: 0, total_price: 0
                }]);
            }).catch((err) => {
                toast.error(`Failed to create purchase order items: ${err.message}`);
            });
        },
        onError: (err) => {
            toast.error(`Failed to create purchase order: ${err.message}`);
        },
    });

    const updateOrderMutation = useMutation({
        mutationFn: ({ id, order }: { id: string; order: Partial<Omit<PurchaseOrder, 'id' | 'restaurant' | 'created_at' | 'updated_at' | 'supplier_info'>> }) => api.updatePurchaseOrder(accessToken!, id, order),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
            toast.success("Purchase order updated successfully!");
            setIsEditDialogOpen(false);
            setSelectedOrder(null);
        },
        onError: (err) => {
            toast.error(`Failed to update purchase order: ${err.message}`);
        },
    });

    const deleteOrderMutation = useMutation({
        mutationFn: (id: string) => api.deletePurchaseOrder(accessToken!, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
            toast.success("Purchase order deleted successfully!");
        },
        onError: (err) => {
            toast.error(`Failed to delete purchase order: ${err.message}`);
        },
    });

    const handleSort = (column: keyof PurchaseOrder) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortColumn(column);
            setSortDirection("asc");
        }
    };

    const sortedAndFilteredOrders = (purchaseOrders || [])
        .filter((order) =>
            order.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.supplier_info?.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
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
        createOrderMutation.mutate(newOrder);
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedOrder) {
            updateOrderMutation.mutate({ id: selectedOrder.id, order: selectedOrder });
        }
    };

    const handleAddItem = () => {
        setNewOrderItems([...newOrderItems, { inventory_item: "", quantity: 0, unit_price: 0, total_price: 0 }]);
    };

    const handleUpdateItem = (index: number, field: keyof Omit<PurchaseOrderItem, 'id' | 'purchase_order' | 'created_at' | 'updated_at' | 'inventory_item_info'>, value: any) => {
        const updatedItems = [...newOrderItems];
        updatedItems[index] = { ...updatedItems[index], [field]: value };
        if (field === "quantity" || field === "unit_price") {
            updatedItems[index].total_price = updatedItems[index].quantity * updatedItems[index].unit_price;
        }
        setNewOrderItems(updatedItems);
        setNewOrder(prev => ({
            ...prev, 
            total_amount: updatedItems.reduce((sum, item) => sum + item.total_price, 0)
        }));
    };

    const handleRemoveItem = (index: number) => {
        const updatedItems = newOrderItems.filter((_, i) => i !== index);
        setNewOrderItems(updatedItems);
        setNewOrder(prev => ({
            ...prev, 
            total_amount: updatedItems.reduce((sum, item) => sum + item.total_price, 0)
        }));
    };


    if (isLoading) return <div>Loading purchase orders...</div>;
    if (isError) return <div>Error: {error?.message}</div>;

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Purchase Orders</h1>
                    <p className="text-muted-foreground">Manage incoming inventory orders from suppliers.</p>
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
                                    placeholder="Search orders by status or supplier..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <Select onValueChange={(value) => {
                            setNewOrder(prev => ({ ...prev, status: value as PurchaseOrder["status"] }));
                        }} value={newOrder.status}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by Status" />
                            </SelectTrigger>
                            <SelectContent>
                                {["PENDING", "ORDERED", "RECEIVED", "CANCELLED"].map((status) => (
                                    <SelectItem key={status} value={status}>
                                        {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead onClick={() => handleSort("supplier")}>
                                    <div className="flex items-center">
                                        Supplier <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("order_date")}>
                                    <div className="flex items-center">
                                        Order Date <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("expected_delivery_date")}>
                                    <div className="flex items-center">
                                        Expected Delivery <ArrowUpDown className="ml-2 h-4 w-4" />
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
                                    <TableCell className="font-medium">{order.supplier_info?.name || "N/A"}</TableCell>
                                    <TableCell>{format(new Date(order.order_date), "PPP")}</TableCell>
                                    <TableCell>{order.expected_delivery_date ? format(new Date(order.expected_delivery_date), "PPP") : "N/A"}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                order.status === "PENDING" ? "secondary" :
                                                    order.status === "ORDERED" ? "outline" :
                                                        order.status === "RECEIVED" ? "default" :
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
                                                    <Edit className="mr-2 h-4 w-4" /> Edit
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
                    </Table>
                </CardContent>
            </Card>

            {/* Create Order Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create New Purchase Order</DialogTitle>
                        <DialogDescription>Fill in the details for the new purchase order.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="supplier" className="text-right">Supplier</Label>
                                <Select onValueChange={(value) => setNewOrder({ ...newOrder, supplier: value })} value={newOrder.supplier || ""}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select a supplier" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {suppliers?.map((supplier) => (
                                            <SelectItem key={supplier.id} value={supplier.id}>
                                                {supplier.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="order_date" className="text-right">Order Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={`w-[240px] pl-3 text-left font-normal ${
                                                !newOrder.order_date && "text-muted-foreground"
                                            }`}
                                        >
                                            {newOrder.order_date ? (
                                                format(new Date(newOrder.order_date), "PPP")
                                            ) : (
                                                <span>Pick a date</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={newOrder.order_date ? new Date(newOrder.order_date) : undefined}
                                            onSelect={(date) => setNewOrder({ ...newOrder, order_date: date ? format(date, "yyyy-MM-dd") : undefined })} // eslint-disable-line @typescript-eslint/ban-ts-comment
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="expected_delivery_date" className="text-right">Expected Delivery Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={`w-[240px] pl-3 text-left font-normal ${
                                                !newOrder.expected_delivery_date && "text-muted-foreground"
                                            }`}
                                        >
                                            {newOrder.expected_delivery_date ? (
                                                format(new Date(newOrder.expected_delivery_date), "PPP")
                                            ) : (
                                                <span>Pick a date</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={newOrder.expected_delivery_date ? new Date(newOrder.expected_delivery_date) : undefined}
                                            onSelect={(date) => setNewOrder({ ...newOrder, expected_delivery_date: date ? format(date, "yyyy-MM-dd") : undefined })} // eslint-disable-line @typescript-eslint/ban-ts-comment
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="status" className="text-right">Status</Label>
                                <Select onValueChange={(value) => setNewOrder({ ...newOrder, status: value as PurchaseOrder["status"] })} value={newOrder.status}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {["PENDING", "ORDERED", "RECEIVED", "CANCELLED"].map((status) => (
                                            <SelectItem key={status} value={status}>
                                                {status}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Separator className="my-4" />
                            <h3 className="text-lg font-semibold col-span-4">Order Items</h3>
                            {newOrderItems.map((item, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-4 items-center gap-4 border p-4 rounded-md">
                                    <Label htmlFor={`item-${index}`} className="text-right md:col-span-1">Item</Label>
                                    <Select onValueChange={(value) => handleUpdateItem(index, "inventory_item", value)} value={item.inventory_item || ""}>
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder="Select an inventory item" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {inventoryItems?.map((invItem) => (
                                                <SelectItem key={invItem.id} value={invItem.id}>
                                                    {invItem.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Label htmlFor={`quantity-${index}`} className="text-right md:col-span-1">Quantity</Label>
                                    <Input id={`quantity-${index}`} type="number" value={item.quantity} onChange={(e) => handleUpdateItem(index, "quantity", parseFloat(e.target.value))} className="col-span-3" />
                                    <Label htmlFor={`unit_price-${index}`} className="text-right md:col-span-1">Unit Price</Label>
                                    <Input id={`unit_price-${index}`} type="number" step="0.01" value={item.unit_price} onChange={(e) => handleUpdateItem(index, "unit_price", parseFloat(e.target.value))} className="col-span-3" />
                                    <Label className="text-right md:col-span-1">Total Price</Label>
                                    <Input value={item.total_price.toFixed(2)} readOnly className="col-span-3 bg-gray-100" />
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

            {/* Edit Order Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Edit Purchase Order</DialogTitle>
                        <DialogDescription>Update the details for the purchase order.</DialogDescription>
                    </DialogHeader>
                    {selectedOrder && (
                        <form onSubmit={handleEditSubmit}>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-supplier" className="text-right">Supplier</Label>
                                    <Select onValueChange={(value) => setSelectedOrder({ ...selectedOrder, supplier: value })} value={selectedOrder.supplier || ""}>
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder="Select a supplier" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {suppliers?.map((supplier) => (
                                                <SelectItem key={supplier.id} value={supplier.id}>
                                                    {supplier.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-order_date" className="text-right">Order Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={`w-[240px] pl-3 text-left font-normal ${
                                                    !selectedOrder.order_date && "text-muted-foreground"
                                                }`}
                                            >
                                                {selectedOrder.order_date ? (
                                                    format(new Date(selectedOrder.order_date), "PPP")
                                                ) : (
                                                    <span>Pick a date</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={selectedOrder.order_date ? new Date(selectedOrder.order_date) : undefined}
                                                onSelect={(date) => setSelectedOrder({ ...selectedOrder, order_date: date ? format(date, "yyyy-MM-dd") : undefined })} // eslint-disable-line @typescript-eslint/ban-ts-comment
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-expected_delivery_date" className="text-right">Expected Delivery Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={`w-[240px] pl-3 text-left font-normal ${
                                                    !selectedOrder.expected_delivery_date && "text-muted-foreground"
                                                }`}
                                            >
                                                {selectedOrder.expected_delivery_date ? (
                                                    format(new Date(selectedOrder.expected_delivery_date), "PPP")
                                                ) : (
                                                    <span>Pick a date</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={selectedOrder.expected_delivery_date ? new Date(selectedOrder.expected_delivery_date) : undefined}
                                                onSelect={(date) => setSelectedOrder({ ...selectedOrder, expected_delivery_date: date ? format(date, "yyyy-MM-dd") : undefined })} // eslint-disable-line @typescript-eslint/ban-ts-comment
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-status" className="text-right">Status</Label>
                                    <Select onValueChange={(value) => setSelectedOrder({ ...selectedOrder, status: value as PurchaseOrder["status"] })} value={selectedOrder.status}>
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {["PENDING", "ORDERED", "RECEIVED", "CANCELLED"].map((status) => (
                                                <SelectItem key={status} value={status}>
                                                    {status}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-total_amount" className="text-right">Total Amount</Label>
                                    <Input id="edit-total_amount" type="number" step="0.01" value={selectedOrder.total_amount} readOnly className="col-span-3 bg-gray-100" />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={updateOrderMutation.isPending}>
                                    {updateOrderMutation.isPending ? "Saving..." : "Save Changes"}
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
                        <DialogTitle>Items for Purchase Order: {selectedOrder?.id}</DialogTitle>
                        <DialogDescription>List of items included in this purchase order.</DialogDescription>
                    </DialogHeader>
                    {isLoadingOrderItems ? (
                        <div>Loading order items...</div>
                    ) : isErrorOrderItems ? (
                        <div>Error loading order items.</div>
                    ) : (selectedOrderItems && selectedOrderItems.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Quantity</TableHead>
                                    <TableHead>Unit Price</TableHead>
                                    <TableHead className="text-right">Total Price</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {selectedOrderItems.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>{item.inventory_item_info?.name || "N/A"}</TableCell>
                                        <TableCell>{item.quantity}</TableCell>
                                        <TableCell>${item.unit_price.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">${item.total_price.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div>No items found for this purchase order.</div>
                    ))}
                    <DialogFooter>
                        <Button onClick={() => setIsViewItemsDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
