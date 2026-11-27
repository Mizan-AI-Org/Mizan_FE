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
import { StockAdjustment, InventoryItem, StaffListItem } from "../../lib/types";
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
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

import { useLanguage } from "@/hooks/use-language";
import { dateFnsLocale } from "@/lib/localeTag";
export default function StockAdjustmentsPage() {
    const { t, language } = useLanguage();
    const { accessToken } = useAuth();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [sortColumn, setSortColumn] = useState<keyof StockAdjustment>("created_at");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedAdjustment, setSelectedAdjustment] = useState<StockAdjustment | null>(null);
    const [newAdjustment, setNewAdjustment] = useState<Omit<StockAdjustment, 'id' | 'restaurant' | 'created_at' | 'updated_at' | 'inventory_item_info' | 'adjusted_by_info'>>({
        inventory_item: "",
        adjustment_type: "ADD",
        quantity: 0,
        reason: "",
        adjusted_by: "", // This will be set by the backend based on the authenticated user
    });

    const { data: stockAdjustments, isLoading } = useQuery<StockAdjustment[]>({
        queryKey: ["stockAdjustments", accessToken],
        queryFn: () => api.getStockAdjustments(accessToken!),
        enabled: !!accessToken,
    });

    const { data: inventoryItems } = useQuery<InventoryItem[]>({
        queryKey: ["inventoryItems", accessToken],
        queryFn: () => api.getInventoryItems(accessToken!),
        enabled: !!accessToken,
    });

    const { data: users } = useQuery<StaffListItem[]>({ // Assuming an API to get users for the 'adjusted_by' field
        queryKey: ["users", accessToken],
        queryFn: () => api.getStaffList(accessToken!),
        enabled: !!accessToken,
    });

    const createMutation = useMutation({
        mutationFn: (adjustment: Omit<StockAdjustment, 'id' | 'restaurant' | 'created_at' | 'updated_at' | 'inventory_item_info' | 'adjusted_by_info'>) => api.createStockAdjustment(accessToken!, adjustment),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["stockAdjustments"] });
            queryClient.invalidateQueries({ queryKey: ["inventoryItems"] }); // Invalidate inventory items to reflect stock changes
            toast.success(t("generic.toast.stock_adjustment_created_successfully"));
            setIsCreateDialogOpen(false);
            setNewAdjustment({
                inventory_item: "",
                adjustment_type: "ADD",
                quantity: 0,
                reason: "",
                adjusted_by: "",
            });
        },
        onError: (err) => {
            toast.error(`${t("inventory.adjustments.err_create")}: ${err.message}`);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, adjustment }: { id: string; adjustment: Partial<Omit<StockAdjustment, 'id' | 'restaurant' | 'created_at' | 'updated_at' | 'inventory_item_info' | 'adjusted_by_info'>> }) => api.updateStockAdjustment(accessToken!, id, adjustment),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["stockAdjustments"] });
            queryClient.invalidateQueries({ queryKey: ["inventoryItems"] }); // Invalidate inventory items to reflect stock changes
            toast.success(t("generic.toast.stock_adjustment_updated_successfully"));
            setIsEditDialogOpen(false);
            setSelectedAdjustment(null);
        },
        onError: (err) => {
            toast.error(`${t("inventory.adjustments.err_update")}: ${err.message}`);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.deleteStockAdjustment(accessToken!, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["stockAdjustments"] });
            queryClient.invalidateQueries({ queryKey: ["inventoryItems"] }); // Invalidate inventory items to reflect stock changes
            toast.success(t("generic.toast.stock_adjustment_deleted_successfully"));
        },
        onError: (err) => {
            toast.error(`${t("inventory.adjustments.err_delete")}: ${err.message}`);
        },
    });

    const handleSort = (column: keyof StockAdjustment) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortColumn(column);
            setSortDirection("asc");
        }
    };

    const sortedAndFilteredAdjustments = (stockAdjustments || [])
        .filter((adjustment) =>
            adjustment.inventory_item_info?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            adjustment.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            adjustment.adjustment_type.toLowerCase().includes(searchTerm.toLowerCase())
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
        createMutation.mutate(newAdjustment);
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedAdjustment) {
            updateMutation.mutate({ id: selectedAdjustment.id, adjustment: selectedAdjustment });
        }
    };

    if (isLoading) return <div>{t("inventory.adjustments.loading")}</div>;
    if (isLoading) return <div className="p-6 text-muted-foreground">{t("inventory.adjustments.loading")}</div>;

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">{t("inventory.adjustments.title")}</h1>
                    <p className="text-muted-foreground">{t("inventory.adjustments.subtitle")}</p>
                </div>
                <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-gradient-primary hover:bg-primary/90">
                    <Plus className="w-4 h-4 mr-2" />
                    {t("inventory.adjustments.add_new")}
                </Button>
            </div>

            <Card className="shadow-soft">
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder={t("inventory.adjustments.search")}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <Select onValueChange={(value) => setNewAdjustment({ ...newAdjustment, adjustment_type: value as StockAdjustment["adjustment_type"] })} value={newAdjustment.adjustment_type}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder={t("inventory.adjustments.filter_type")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ADD">{t("inventory.adjustments.type_add")}</SelectItem>
                                <SelectItem value="REMOVE">{t("inventory.adjustments.type_remove")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead onClick={() => handleSort("inventory_item")}>
                                    <div className="flex items-center">
                                        {t("inventory.adjustments.col_item")} <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("adjustment_type")}>
                                    <div className="flex items-center">
                                        {t("inventory.adjustments.col_type")} <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("quantity")}>
                                    <div className="flex items-center justify-end">
                                        {t("inventory.adjustments.col_quantity")} <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("reason")}>
                                    <div className="flex items-center">
                                        {t("inventory.adjustments.col_reason")} <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("adjusted_by")}>
                                    <div className="flex items-center">
                                        {t("inventory.adjustments.col_by")} <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("created_at")}>
                                    <div className="flex items-center">
                                        {t("inventory.adjustments.col_date")} <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead className="text-right">{t("inventory.adjustments.col_actions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedAndFilteredAdjustments.map((adjustment) => (
                                <TableRow key={adjustment.id}>
                                    <TableCell className="font-medium">{adjustment.inventory_item_info?.name || "N/A"}</TableCell>
                                    <TableCell>
                                        <Badge variant={adjustment.adjustment_type === "ADD" ? "default" : "secondary"}>
                                            {adjustment.adjustment_type === "ADD" ? t("inventory.adjustments.type_add") : adjustment.adjustment_type === "REMOVE" ? t("inventory.adjustments.type_remove") : adjustment.adjustment_type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">{adjustment.quantity}</TableCell>
                                    <TableCell>{adjustment.reason}</TableCell>
                                    <TableCell>{adjustment.adjusted_by_info?.first_name} {adjustment.adjusted_by_info?.last_name}</TableCell>
                                    <TableCell>{format(new Date(adjustment.created_at), "PPP", { locale: dateFnsLocale(language) })}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">{t("inventory.adjustments.open_menu")}</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>{t("inventory.adjustments.col_actions")}</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => {
                                                    setSelectedAdjustment(adjustment);
                                                    setIsEditDialogOpen(true);
                                                }}>
                                                    <Edit className="mr-2 h-4 w-4" /> {t("inventory.adjustments.edit")}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => deleteMutation.mutate(adjustment.id)} className="text-destructive focus:text-destructive">
                                                    <Trash2 className="mr-2 h-4 w-4" /> {t("inventory.adjustments.delete")}
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

            {/* Create Adjustment Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{t("inventory.adjustments.dialog_add_title")}</DialogTitle>
                        <DialogDescription>{t("inventory.adjustments.dialog_add_desc")}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="inventory_item" className="text-right">{t("inventory.adjustments.col_item_long")}</Label>
                                <Select onValueChange={(value) => setNewAdjustment({ ...newAdjustment, inventory_item: value })} value={newAdjustment.inventory_item || ""}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder={t("inventory.adjustments.select_item")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {inventoryItems?.map((item) => (
                                            <SelectItem key={item.id} value={item.id}>
                                                {item.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="adjustment_type" className="text-right">{t("inventory.adjustments.col_type_long")}</Label>
                                <Select onValueChange={(value) => setNewAdjustment({ ...newAdjustment, adjustment_type: value as StockAdjustment["adjustment_type"] })} value={newAdjustment.adjustment_type}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder={t("inventory.adjustments.select_type")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ADD">{t("inventory.adjustments.type_add")}</SelectItem>
                                        <SelectItem value="REMOVE">{t("inventory.adjustments.type_remove")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="quantity" className="text-right">{t("inventory.adjustments.col_quantity")}</Label>
                                <Input id="quantity" type="number" value={newAdjustment.quantity} onChange={(e) => setNewAdjustment({ ...newAdjustment, quantity: parseFloat(e.target.value) })} className="col-span-3" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="reason" className="text-right">{t("inventory.adjustments.col_reason")}</Label>
                                <Textarea id="reason" value={newAdjustment.reason || ""} onChange={(e) => setNewAdjustment({ ...newAdjustment, reason: e.target.value })} className="col-span-3" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={createMutation.isPending}>
                                {createMutation.isPending ? t("inventory.adjustments.creating") : t("inventory.adjustments.create")}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Adjustment Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{t("inventory.adjustments.dialog_edit_title")}</DialogTitle>
                        <DialogDescription>{t("inventory.adjustments.dialog_edit_desc")}</DialogDescription>
                    </DialogHeader>
                    {selectedAdjustment && (
                        <form onSubmit={handleEditSubmit}>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-inventory_item" className="text-right">{t("inventory.adjustments.col_item_long")}</Label>
                                    <Select onValueChange={(value) => setSelectedAdjustment({ ...selectedAdjustment, inventory_item: value })} value={selectedAdjustment.inventory_item || ""}>
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder={t("inventory.adjustments.select_item")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {inventoryItems?.map((item) => (
                                                <SelectItem key={item.id} value={item.id}>
                                                    {item.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-adjustment_type" className="text-right">{t("inventory.adjustments.col_type_long")}</Label>
                                    <Select onValueChange={(value) => setSelectedAdjustment({ ...selectedAdjustment, adjustment_type: value as StockAdjustment["adjustment_type"] })} value={selectedAdjustment.adjustment_type}>
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder={t("inventory.adjustments.select_type")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ADD">{t("inventory.adjustments.type_add")}</SelectItem>
                                            <SelectItem value="REMOVE">{t("inventory.adjustments.type_remove")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-quantity" className="text-right">{t("inventory.adjustments.col_quantity")}</Label>
                                    <Input id="edit-quantity" type="number" value={selectedAdjustment.quantity} onChange={(e) => setSelectedAdjustment({ ...selectedAdjustment, quantity: parseFloat(e.target.value) })} className="col-span-3" required />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-reason" className="text-right">{t("inventory.adjustments.col_reason")}</Label>
                                    <Textarea id="edit-reason" value={selectedAdjustment.reason || ""} onChange={(e) => setSelectedAdjustment({ ...selectedAdjustment, reason: e.target.value })} className="col-span-3" />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={updateMutation.isPending}>
                                    {updateMutation.isPending ? t("inventory.adjustments.saving") : t("inventory.adjustments.save")}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
