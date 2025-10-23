import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Search,
    Package,
    Plus,
    Edit,
    Trash2,
    ArrowUpDown,
    MoreHorizontal,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { InventoryItem } from "../../lib/types";
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

export default function InventoryItemsPage() {
    const { accessToken } = useAuth();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [filterCategory, setFilterCategory] = useState("all");
    const [sortColumn, setSortColumn] = useState<keyof InventoryItem>("name");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [newItem, setNewItem] = useState<Omit<InventoryItem, 'id' | 'restaurant' | 'created_at' | 'updated_at' | 'supplier_info' | 'inventory_item_info' | 'adjusted_by_info'>>({
        name: "",
        description: "",
        category: "",
        unit: "",
        current_stock: 0,
        min_stock_level: 0,
        cost_per_unit: 0,
        supplier: undefined,
        last_restock_date: undefined,
    });

    const { data: inventoryItems, isLoading, isError, error } = useQuery<InventoryItem[]>({
        queryKey: ["inventoryItems", accessToken],
        queryFn: () => api.getInventoryItems(accessToken!),
        enabled: !!accessToken,
    });

    const { data: suppliers } = useQuery({
        queryKey: ["suppliers", accessToken],
        queryFn: () => api.getSuppliers(accessToken!),
        enabled: !!accessToken,
    });

    const createMutation = useMutation({
        mutationFn: (item: Omit<InventoryItem, 'id' | 'restaurant' | 'created_at' | 'updated_at' | 'supplier_info' | 'inventory_item_info' | 'adjusted_by_info'>) => api.createInventoryItem(accessToken!, item),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
            toast.success("Inventory item created successfully!");
            setIsCreateDialogOpen(false);
            setNewItem({
                name: "",
                description: "",
                category: "",
                unit: "",
                current_stock: 0,
                min_stock_level: 0,
                cost_per_unit: 0,
                supplier: undefined,
                last_restock_date: undefined,
            });
        },
        onError: (err) => {
            toast.error(`Failed to create item: ${err.message}`);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, item }: { id: string; item: Partial<Omit<InventoryItem, 'id' | 'restaurant' | 'created_at' | 'updated_at' | 'supplier_info' | 'inventory_item_info' | 'adjusted_by_info'>> }) => api.updateInventoryItem(accessToken!, id, item),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
            toast.success("Inventory item updated successfully!");
            setIsEditDialogOpen(false);
            setSelectedItem(null);
        },
        onError: (err) => {
            toast.error(`Failed to update item: ${err.message}`);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.deleteInventoryItem(accessToken!, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
            toast.success("Inventory item deleted successfully!");
        },
        onError: (err) => {
            toast.error(`Failed to delete item: ${err.message}`);
        },
    });

    const handleSort = (column: keyof InventoryItem) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortColumn(column);
            setSortDirection("asc");
        }
    };

    const sortedAndFilteredItems = (inventoryItems || [])
        .filter((item) =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.category.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .filter((item) => filterCategory === "all" || item.category === filterCategory)
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
        createMutation.mutate(newItem);
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedItem) {
            updateMutation.mutate({ id: selectedItem.id, item: selectedItem });
        }
    };

    if (isLoading) return <div>Loading inventory items...</div>;
    if (isError) return <div>Error: {error?.message}</div>;

    const categories = Array.from(new Set(inventoryItems?.map(item => item.category)));

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Inventory Items</h1>
                    <p className="text-muted-foreground">Manage all inventory items in your restaurant.</p>
                </div>
                <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-gradient-primary hover:bg-primary/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Item
                </Button>
            </div>

            <Card className="shadow-soft">
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search items by name or category..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <Select onValueChange={(value) => setFilterCategory(value)} value={filterCategory}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories.map((category) => (
                                    <SelectItem key={category} value={category}>
                                        {category}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead onClick={() => handleSort("name")}>
                                    <div className="flex items-center">
                                        Item Name <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("category")}>
                                    <div className="flex items-center">
                                        Category <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("current_stock")}>
                                    <div className="flex items-center">
                                        Current Stock <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("min_stock_level")}>
                                    <div className="flex items-center">
                                        Min Stock <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedAndFilteredItems.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell>{item.category}</TableCell>
                                    <TableCell>
                                        {item.current_stock} {item.unit}
                                        {item.current_stock <= item.min_stock_level && (
                                            <Badge variant="destructive" className="ml-2">Low Stock</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>{item.min_stock_level} {item.unit}</TableCell>
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
                                                    setSelectedItem(item);
                                                    setIsEditDialogOpen(true);
                                                }}>
                                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => deleteMutation.mutate(item.id)} className="text-destructive focus:text-destructive">
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

            {/* Create Item Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Add New Inventory Item</DialogTitle>
                        <DialogDescription>Fill in the details for the new inventory item.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Name</Label>
                                <Input id="name" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} className="col-span-3" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="description" className="text-right">Description</Label>
                                <Input id="description" value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="category" className="text-right">Category</Label>
                                <Input id="category" value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })} className="col-span-3" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="unit" className="text-right">Unit</Label>
                                <Input id="unit" value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} className="col-span-3" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="current_stock" className="text-right">Current Stock</Label>
                                <Input id="current_stock" type="number" value={newItem.current_stock} onChange={(e) => setNewItem({ ...newItem, current_stock: parseFloat(e.target.value) })} className="col-span-3" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="min_stock_level" className="text-right">Min Stock Level</Label>
                                <Input id="min_stock_level" type="number" value={newItem.min_stock_level} onChange={(e) => setNewItem({ ...newItem, min_stock_level: parseFloat(e.target.value) })} className="col-span-3" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="cost_per_unit" className="text-right">Cost Per Unit</Label>
                                <Input id="cost_per_unit" type="number" step="0.01" value={newItem.cost_per_unit} onChange={(e) => setNewItem({ ...newItem, cost_per_unit: parseFloat(e.target.value) })} className="col-span-3" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="supplier" className="text-right">Supplier</Label>
                                <Select onValueChange={(value) => setNewItem({ ...newItem, supplier: value })} value={newItem.supplier || ""}>
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
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={createMutation.isPending}>
                                {createMutation.isPending ? "Creating..." : "Create Item"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Item Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Edit Inventory Item</DialogTitle>
                        <DialogDescription>Update the details for the inventory item.</DialogDescription>
                    </DialogHeader>
                    {selectedItem && (
                        <form onSubmit={handleEditSubmit}>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-name" className="text-right">Name</Label>
                                    <Input id="edit-name" value={selectedItem.name} onChange={(e) => setSelectedItem({ ...selectedItem, name: e.target.value })} className="col-span-3" required />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-description" className="text-right">Description</Label>
                                    <Input id="edit-description" value={selectedItem.description || ""} onChange={(e) => setSelectedItem({ ...selectedItem, description: e.target.value })} className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-category" className="text-right">Category</Label>
                                    <Input id="edit-category" value={selectedItem.category} onChange={(e) => setSelectedItem({ ...selectedItem, category: e.target.value })} className="col-span-3" required />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-unit" className="text-right">Unit</Label>
                                    <Input id="edit-unit" value={selectedItem.unit} onChange={(e) => setSelectedItem({ ...selectedItem, unit: e.target.value })} className="col-span-3" required />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-current_stock" className="text-right">Current Stock</Label>
                                    <Input id="edit-current_stock" type="number" value={selectedItem.current_stock} onChange={(e) => setSelectedItem({ ...selectedItem, current_stock: parseFloat(e.target.value) })} className="col-span-3" required />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-min_stock_level" className="text-right">Min Stock Level</Label>
                                    <Input id="edit-min_stock_level" type="number" value={selectedItem.min_stock_level} onChange={(e) => setSelectedItem({ ...selectedItem, min_stock_level: parseFloat(e.target.value) })} className="col-span-3" required />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-cost_per_unit" className="text-right">Cost Per Unit</Label>
                                    <Input id="edit-cost_per_unit" type="number" step="0.01" value={selectedItem.cost_per_unit} onChange={(e) => setSelectedItem({ ...selectedItem, cost_per_unit: parseFloat(e.target.value) })} className="col-span-3" required />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-supplier" className="text-right">Supplier</Label>
                                    <Select onValueChange={(value) => setSelectedItem({ ...selectedItem, supplier: value })} value={selectedItem.supplier || ""}>
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
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={updateMutation.isPending}>
                                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
