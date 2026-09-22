import { useState, useRef } from "react";
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
    Upload,
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

import { useLanguage } from "@/hooks/use-language";
import { PAGE_SHELL } from "@/lib/page-shell";

function parseInventoryCsv(text: string) {
    const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return [];
    const split = (line: string) =>
        (line.includes("\t") ? line.split("\t") : line.split(",")).map((cell) => cell.trim().replace(/^"|"$/g, ""));
    const header = split(lines[0]).map((cell) => cell.toLowerCase());
    const idx = (aliases: string[]) => header.findIndex((cell) => aliases.includes(cell));
    const nameI = idx(["name", "item", "item name", "product"]);
    const unitI = idx(["unit", "uom", "units"]);
    const qtyI = idx(["count", "quantity", "qty", "current_stock", "stock", "on hand", "on_hand"]);
    const minI = idx(["min", "min_stock", "min_stock_level", "reorder", "reorder_point", "par"]);
    const skuI = idx(["sku", "code"]);
    const start = nameI >= 0 ? 1 : 0;
    const rows: Array<{ name: string; unit: string; quantity: number; reorderPoint: number; sku: string }> = [];
    for (const line of lines.slice(start)) {
        const cols = split(line);
        const name = ((nameI >= 0 ? cols[nameI] : cols[0]) || "").trim();
        if (!name || name.toLowerCase() === "name") continue;
        rows.push({
            name,
            unit: (unitI >= 0 ? cols[unitI] : cols[1]) || "unit",
            quantity: Number(qtyI >= 0 ? cols[qtyI] : cols[2]) || 0,
            reorderPoint: Number(minI >= 0 ? cols[minI] : cols[3]) || 0,
            sku: (skuI >= 0 ? cols[skuI] : "") || "",
        });
    }
    return rows;
}

export default function InventoryItemsPage() {
    const { t } = useLanguage();
    const { accessToken } = useAuth();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
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
        pack_size: null,
        min_order_qty: null,
        shelf_life_days: null,
    });

    const { data: inventoryItems, isLoading } = useQuery<InventoryItem[]>({
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
            toast.success(t("generic.toast.inventory_item_created_successfully"));
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
                pack_size: null,
                min_order_qty: null,
                shelf_life_days: null,
            });
        },
        onError: (err) => {
            toast.error(t("inventory.create_failed", { message: err.message }));
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, item }: { id: string; item: Partial<Omit<InventoryItem, 'id' | 'restaurant' | 'created_at' | 'updated_at' | 'supplier_info' | 'inventory_item_info' | 'adjusted_by_info'>> }) => api.updateInventoryItem(accessToken!, id, item),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
            toast.success(t("generic.toast.inventory_item_updated_successfully"));
            setIsEditDialogOpen(false);
            setSelectedItem(null);
        },
        onError: (err) => {
            toast.error(t("inventory.update_failed", { message: err.message }));
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.deleteInventoryItem(accessToken!, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
            toast.success(t("generic.toast.inventory_item_deleted_successfully"));
        },
        onError: (err) => {
            toast.error(t("inventory.delete_failed", { message: err.message }));
        },
    });

    const importMutation = useMutation({
        mutationFn: (items: Array<{ name: string; unit: string; quantity: number; reorderPoint: number; sku: string }>) =>
            api.bulkImportInventoryItems(accessToken!, items),
        onSuccess: (rows) => {
            queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
            toast.success(t("inventory.imported", { count: rows.length }));
        },
        onError: (err: Error) => toast.error(err.message),
    });

    const handleCsvUpload = async (file?: File) => {
        if (!file) return;
        const text = await file.text();
        const rows = parseInventoryCsv(text);
        if (!rows.length) {
            toast.error(t("inventory.csv_empty"));
            return;
        }
        importMutation.mutate(rows);
    };

    const downloadTemplate = () => {
        const csv = "name,unit,count,min\nTomatoes,kg,12,4\nChicken breast,kg,8,2\nOlive oil,L,6,2\n";
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "inventory-template.csv";
        link.click();
        URL.revokeObjectURL(url);
    };

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
            (item.category || "").toLowerCase().includes(searchTerm.toLowerCase())
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

    const categories = Array.from(new Set((inventoryItems || []).map((item) => item.category).filter(Boolean)));

    return (
        <div className={`${PAGE_SHELL} py-8 space-y-6`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">{t("inventory.title")}</h1>
                    <p className="text-muted-foreground">{t("inventory.subtitle")}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.tsv,.txt"
                        className="hidden"
                        onChange={(e) => {
                            void handleCsvUpload(e.target.files?.[0]);
                            e.target.value = "";
                        }}
                    />
                    <Button variant="outline" onClick={downloadTemplate}>
                        {t("inventory.template")}
                    </Button>
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importMutation.isPending}>
                        <Upload className="w-4 h-4 mr-2" />
                        {importMutation.isPending ? t("inventory.uploading") : t("inventory.upload")}
                    </Button>
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        {t("inventory.add")}
                    </Button>
                </div>
            </div>

            <Card className="shadow-soft">
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder={t("inventory.search")}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <Select onValueChange={(value) => setFilterCategory(value)} value={filterCategory}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder={t("inventory.filter_category")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t("inventory.all_categories")}</SelectItem>
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
                                        {t("inventory.col.name")} <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("category")}>
                                    <div className="flex items-center">
                                        {t("inventory.col.category")} <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("current_stock")}>
                                    <div className="flex items-center">
                                        {t("inventory.col.stock")} <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("min_stock_level")}>
                                    <div className="flex items-center">
                                        {t("inventory.col.min")} <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead className="text-right">{t("common.actions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">{t("inventory.loading")}</TableCell>
                                </TableRow>
                            ) : sortedAndFilteredItems.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                        {t("inventory.empty")}
                                    </TableCell>
                                </TableRow>
                            ) : sortedAndFilteredItems.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell>{item.category}</TableCell>
                                    <TableCell>
                                        {item.current_stock} {item.unit}
                                        {item.current_stock <= item.min_stock_level && (
                                            <Badge variant="destructive" className="ml-2">{t("inventory.low_stock")}</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>{item.min_stock_level} {item.unit}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">{t("inventory.open_menu")}</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>{t("common.actions")}</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => {
                                                    setSelectedItem(item);
                                                    setIsEditDialogOpen(true);
                                                }}>
                                                    <Edit className="mr-2 h-4 w-4" /> {t("common.edit")}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => deleteMutation.mutate(item.id)} className="text-destructive focus:text-destructive">
                                                    <Trash2 className="mr-2 h-4 w-4" /> {t("common.delete")}
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
                        <DialogTitle>{t("inventory.add")}</DialogTitle>
                        <DialogDescription>{t("inventory.add_desc")}</DialogDescription>
                    </DialogHeader>
                    <form autoComplete="off" onSubmit={handleCreateSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="inventory-item-name" className="text-right">{t("inventory.field.name")}</Label>
                                <Input id="inventory-item-name" name="inventory-item-name" autoComplete="off" data-1p-ignore data-lpignore="true" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} className="col-span-3" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="inventory-description" className="text-right">{t("common.description")}</Label>
                                <Input id="inventory-description" name="inventory-description" autoComplete="off" value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="inventory-category" className="text-right">{t("inventory.field.category")}</Label>
                                <Input id="inventory-category" name="inventory-category" autoComplete="off" value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="inventory-unit" className="text-right">{t("inventory.field.unit")}</Label>
                                <Input id="inventory-unit" name="inventory-unit" autoComplete="off" value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} className="col-span-3" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="current_stock" className="text-right">{t("inventory.field.stock")}</Label>
                                <Input id="current_stock" type="number" value={newItem.current_stock} onChange={(e) => setNewItem({ ...newItem, current_stock: parseFloat(e.target.value) })} className="col-span-3" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="min_stock_level" className="text-right">{t("inventory.field.min")}</Label>
                                <Input id="min_stock_level" type="number" value={newItem.min_stock_level} onChange={(e) => setNewItem({ ...newItem, min_stock_level: parseFloat(e.target.value) })} className="col-span-3" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="cost_per_unit" className="text-right">{t("inventory.field.cost")}</Label>
                                <Input id="cost_per_unit" type="number" step="0.01" value={newItem.cost_per_unit} onChange={(e) => setNewItem({ ...newItem, cost_per_unit: parseFloat(e.target.value) })} className="col-span-3" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="supplier" className="text-right">{t("inventory.field.supplier")}</Label>
                                <Select onValueChange={(value) => setNewItem({ ...newItem, supplier: value })} value={newItem.supplier || ""}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder={t("inventory.field.supplier_placeholder")} />
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
                            <div className="grid grid-cols-4 items-start gap-4">
                                <Label htmlFor="pack_size" className="text-right pt-2">{t("inventory.field.pack")}</Label>
                                <div className="col-span-3 space-y-1">
                                    <Input
                                        id="pack_size"
                                        type="number"
                                        step="0.001"
                                        min="0"
                                        value={newItem.pack_size ?? ""}
                                        onChange={(e) => setNewItem({ ...newItem, pack_size: e.target.value === "" ? null : parseFloat(e.target.value) })}
                                        placeholder={t("inventory.field.pack_placeholder")}
                                    />
                                    <p className="text-[11px] text-muted-foreground">{t("inventory.field.pack_hint")}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 items-start gap-4">
                                <Label htmlFor="min_order_qty" className="text-right pt-2">{t("inventory.field.min_order")}</Label>
                                <div className="col-span-3 space-y-1">
                                    <Input
                                        id="min_order_qty"
                                        type="number"
                                        step="0.001"
                                        min="0"
                                        value={newItem.min_order_qty ?? ""}
                                        onChange={(e) => setNewItem({ ...newItem, min_order_qty: e.target.value === "" ? null : parseFloat(e.target.value) })}
                                        placeholder={t("inventory.field.min_order_placeholder")}
                                    />
                                    <p className="text-[11px] text-muted-foreground">{t("inventory.field.min_order_hint")}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 items-start gap-4">
                                <Label htmlFor="shelf_life_days" className="text-right pt-2">{t("inventory.field.shelf")}</Label>
                                <div className="col-span-3 space-y-1">
                                    <Input
                                        id="shelf_life_days"
                                        type="number"
                                        step="1"
                                        min="0"
                                        value={newItem.shelf_life_days ?? ""}
                                        onChange={(e) => setNewItem({ ...newItem, shelf_life_days: e.target.value === "" ? null : parseInt(e.target.value, 10) })}
                                        placeholder={t("inventory.field.shelf_placeholder")}
                                    />
                                    <p className="text-[11px] text-muted-foreground">{t("inventory.field.shelf_hint")}</p>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={createMutation.isPending}>
                                {createMutation.isPending ? t("inventory.creating") : t("inventory.create")}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Item Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{t("inventory.edit")}</DialogTitle>
                        <DialogDescription>{t("inventory.edit_desc")}</DialogDescription>
                    </DialogHeader>
                    {selectedItem && (
                        <form autoComplete="off" onSubmit={handleEditSubmit}>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-inventory-name" className="text-right">{t("inventory.field.name")}</Label>
                                    <Input id="edit-inventory-name" name="edit-inventory-name" autoComplete="off" data-1p-ignore data-lpignore="true" value={selectedItem.name} onChange={(e) => setSelectedItem({ ...selectedItem, name: e.target.value })} className="col-span-3" required />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-inventory-description" className="text-right">{t("common.description")}</Label>
                                    <Input id="edit-inventory-description" autoComplete="off" value={selectedItem.description || ""} onChange={(e) => setSelectedItem({ ...selectedItem, description: e.target.value })} className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-inventory-category" className="text-right">{t("inventory.field.category")}</Label>
                                    <Input id="edit-inventory-category" autoComplete="off" value={selectedItem.category} onChange={(e) => setSelectedItem({ ...selectedItem, category: e.target.value })} className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-inventory-unit" className="text-right">{t("inventory.field.unit")}</Label>
                                    <Input id="edit-inventory-unit" autoComplete="off" value={selectedItem.unit} onChange={(e) => setSelectedItem({ ...selectedItem, unit: e.target.value })} className="col-span-3" required />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-current_stock" className="text-right">{t("inventory.field.stock")}</Label>
                                    <Input id="edit-current_stock" type="number" value={selectedItem.current_stock} onChange={(e) => setSelectedItem({ ...selectedItem, current_stock: parseFloat(e.target.value) })} className="col-span-3" required />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-min_stock_level" className="text-right">{t("inventory.field.min")}</Label>
                                    <Input id="edit-min_stock_level" type="number" value={selectedItem.min_stock_level} onChange={(e) => setSelectedItem({ ...selectedItem, min_stock_level: parseFloat(e.target.value) })} className="col-span-3" required />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-cost_per_unit" className="text-right">{t("inventory.field.cost")}</Label>
                                    <Input id="edit-cost_per_unit" type="number" step="0.01" value={selectedItem.cost_per_unit} onChange={(e) => setSelectedItem({ ...selectedItem, cost_per_unit: parseFloat(e.target.value) })} className="col-span-3" required />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-supplier" className="text-right">{t("inventory.field.supplier")}</Label>
                                    <Select onValueChange={(value) => setSelectedItem({ ...selectedItem, supplier: value })} value={selectedItem.supplier || ""}>
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder={t("inventory.field.supplier_placeholder")} />
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
                                <div className="grid grid-cols-4 items-start gap-4">
                                    <Label htmlFor="edit-pack_size" className="text-right pt-2">{t("inventory.field.pack")}</Label>
                                    <div className="col-span-3 space-y-1">
                                        <Input
                                            id="edit-pack_size"
                                            type="number"
                                            step="0.001"
                                            min="0"
                                            value={selectedItem.pack_size ?? ""}
                                            onChange={(e) => setSelectedItem({ ...selectedItem, pack_size: e.target.value === "" ? null : parseFloat(e.target.value) })}
                                            placeholder={t("inventory.field.pack_placeholder")}
                                        />
                                        <p className="text-[11px] text-muted-foreground">{t("inventory.field.pack_hint")}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 items-start gap-4">
                                    <Label htmlFor="edit-min_order_qty" className="text-right pt-2">{t("inventory.field.min_order")}</Label>
                                    <div className="col-span-3 space-y-1">
                                        <Input
                                            id="edit-min_order_qty"
                                            type="number"
                                            step="0.001"
                                            min="0"
                                            value={selectedItem.min_order_qty ?? ""}
                                            onChange={(e) => setSelectedItem({ ...selectedItem, min_order_qty: e.target.value === "" ? null : parseFloat(e.target.value) })}
                                            placeholder={t("inventory.field.min_order_placeholder")}
                                        />
                                        <p className="text-[11px] text-muted-foreground">{t("inventory.field.min_order_hint")}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 items-start gap-4">
                                    <Label htmlFor="edit-shelf_life_days" className="text-right pt-2">{t("inventory.field.shelf")}</Label>
                                    <div className="col-span-3 space-y-1">
                                        <Input
                                            id="edit-shelf_life_days"
                                            type="number"
                                            step="1"
                                            min="0"
                                            value={selectedItem.shelf_life_days ?? ""}
                                            onChange={(e) => setSelectedItem({ ...selectedItem, shelf_life_days: e.target.value === "" ? null : parseInt(e.target.value, 10) })}
                                            placeholder={t("inventory.field.shelf_placeholder")}
                                        />
                                        <p className="text-[11px] text-muted-foreground">{t("inventory.field.shelf_hint")}</p>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={updateMutation.isPending}>
                                    {updateMutation.isPending ? t("common.saving") : t("common.save")}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
