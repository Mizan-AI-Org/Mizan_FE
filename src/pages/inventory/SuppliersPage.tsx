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
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { Supplier } from "../../lib/types";
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

import { useLanguage } from "@/hooks/use-language";
export default function SuppliersPage() {
    const { t } = useLanguage();
    const { accessToken } = useAuth();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [sortColumn, setSortColumn] = useState<keyof Supplier>("name");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [newSupplier, setNewSupplier] = useState<Omit<Supplier, 'id' | 'restaurant' | 'created_at' | 'updated_at'>>({
        name: "",
        contact_person: "",
        email: "",
        phone: "",
        address: "",
        lead_time_days: 2,
    });

    const { data: suppliers, isLoading } = useQuery<Supplier[]>({ 
        queryKey: ["suppliers", accessToken],
        queryFn: () => api.getSuppliers(accessToken!),
        enabled: !!accessToken,
    });

    const createMutation = useMutation({
        mutationFn: (supplier: Omit<Supplier, 'id' | 'restaurant' | 'created_at' | 'updated_at'>) => api.createSupplier(accessToken!, supplier),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["suppliers"] });
            toast.success(t("generic.toast.supplier_created_successfully"));
            setIsCreateDialogOpen(false);
            setNewSupplier({
                name: "",
                contact_person: "",
                email: "",
                phone: "",
                address: "",
                lead_time_days: 2,
            });
        },
        onError: (err) => {
            toast.error(t("suppliers.directory.create_failed", { message: err.message }));
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, supplier }: { id: string; supplier: Partial<Omit<Supplier, 'id' | 'restaurant' | 'created_at' | 'updated_at'>> }) => api.updateSupplier(accessToken!, id, supplier),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["suppliers"] });
            toast.success(t("generic.toast.supplier_updated_successfully"));
            setIsEditDialogOpen(false);
            setSelectedSupplier(null);
        },
        onError: (err) => {
            toast.error(t("suppliers.directory.update_failed", { message: err.message }));
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.deleteSupplier(accessToken!, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["suppliers"] });
            toast.success(t("generic.toast.supplier_deleted_successfully"));
        },
        onError: (err) => {
            toast.error(t("suppliers.directory.delete_failed", { message: err.message }));
        },
    });

    const handleSort = (column: keyof Supplier) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortColumn(column);
            setSortDirection("asc");
        }
    };

    const sortedAndFilteredSuppliers = (suppliers || [])
        .filter((supplier) =>
            supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (supplier.contact_person && supplier.contact_person.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (supplier.email && supplier.email.toLowerCase().includes(searchTerm.toLowerCase()))
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
        createMutation.mutate(newSupplier);
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedSupplier) {
            updateMutation.mutate({ id: selectedSupplier.id, supplier: selectedSupplier });
        }
    };

    if (isLoading) return <div className="p-6 text-muted-foreground">{t("suppliers.directory.loading")}</div>;

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">{t("nav.suppliers")}</h1>
                    <p className="text-muted-foreground">{t("suppliers.directory.subtitle")}</p>
                </div>
                <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-gradient-primary hover:bg-primary/90">
                    <Plus className="w-4 h-4 mr-2" />
                    {t("suppliers.directory.add")}
                </Button>
            </div>

            <Card className="shadow-soft">
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder={t("suppliers.directory.search")}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead onClick={() => handleSort("name")}>
                                    <div className="flex items-center">
                                        {t("suppliers.directory.col_name")} <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("contact_person")}>
                                    <div className="flex items-center">
                                        {t("suppliers.directory.col_contact")} <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("email")}>
                                    <div className="flex items-center">
                                        {t("suppliers.directory.col_email")} <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("phone")}>
                                    <div className="flex items-center">
                                        {t("suppliers.directory.col_phone")} <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead className="text-right">{t("common.actions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedAndFilteredSuppliers.map((supplier) => (
                                <TableRow key={supplier.id}>
                                    <TableCell className="font-medium">{supplier.name}</TableCell>
                                    <TableCell>{supplier.contact_person}</TableCell>
                                    <TableCell>{supplier.email}</TableCell>
                                    <TableCell>{supplier.phone}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">{t("suppliers.directory.open_menu")}</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>{t("common.actions")}</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => {
                                                    setSelectedSupplier(supplier);
                                                    setIsEditDialogOpen(true);
                                                }}>
                                                    <Edit className="mr-2 h-4 w-4" /> {t("common.edit")}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => deleteMutation.mutate(supplier.id)} className="text-destructive focus:text-destructive">
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

            {/* Create Supplier Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{t("suppliers.directory.add")}</DialogTitle>
                        <DialogDescription>{t("suppliers.directory.dialog_add_desc")}</DialogDescription>
                    </DialogHeader>
                    <form autoComplete="off" onSubmit={handleCreateSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="supplier-name" className="text-right">{t("suppliers.directory.name")}</Label>
                                <Input id="supplier-name" name="supplier-company-name" autoComplete="off" data-1p-ignore data-lpignore="true" data-form-type="other" value={newSupplier.name} onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })} className="col-span-3" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="supplier-contact" className="text-right">{t("suppliers.directory.contact")}</Label>
                                <Input id="supplier-contact" name="supplier-contact-name" autoComplete="off" data-1p-ignore data-lpignore="true" data-form-type="other" value={newSupplier.contact_person || ""} onChange={(e) => setNewSupplier({ ...newSupplier, contact_person: e.target.value })} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="supplier-email" className="text-right">{t("suppliers.directory.col_email")}</Label>
                                <Input id="supplier-email" name="supplier-work-email" type="text" inputMode="email" autoComplete="off" data-1p-ignore data-lpignore="true" data-form-type="other" value={newSupplier.email || ""} onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="supplier-phone" className="text-right">{t("suppliers.directory.col_phone")}</Label>
                                <Input id="supplier-phone" name="supplier-work-phone" type="text" inputMode="tel" autoComplete="off" data-1p-ignore data-lpignore="true" data-form-type="other" value={newSupplier.phone || ""} onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="supplier-address" className="text-right">{t("suppliers.directory.address")}</Label>
                                <Input id="supplier-address" name="supplier-work-location" autoComplete="off" data-1p-ignore data-lpignore="true" data-form-type="other" value={newSupplier.address || ""} onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-start gap-4">
                                <Label htmlFor="lead_time_days" className="text-right pt-2">{t("suppliers.directory.lead_time")}</Label>
                                <div className="col-span-3 space-y-1">
                                    <Input
                                        id="lead_time_days"
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={newSupplier.lead_time_days ?? 2}
                                        onChange={(e) => setNewSupplier({ ...newSupplier, lead_time_days: e.target.value === "" ? 0 : parseInt(e.target.value, 10) })}
                                    />
                                    <p className="text-[11px] text-muted-foreground">{t("suppliers.directory.lead_time_hint")}</p>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={createMutation.isPending}>
                                {createMutation.isPending ? t("suppliers.directory.creating") : t("suppliers.directory.create")}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Supplier Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{t("suppliers.directory.edit_title")}</DialogTitle>
                        <DialogDescription>{t("suppliers.directory.edit_desc")}</DialogDescription>
                    </DialogHeader>
                    {selectedSupplier && (
                        <form autoComplete="off" onSubmit={handleEditSubmit}>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-supplier-name" className="text-right">{t("suppliers.directory.name")}</Label>
                                    <Input id="edit-supplier-name" name="edit-supplier-company-name" autoComplete="off" data-1p-ignore data-lpignore="true" data-form-type="other" value={selectedSupplier.name} onChange={(e) => setSelectedSupplier({ ...selectedSupplier, name: e.target.value })} className="col-span-3" required />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-supplier-contact" className="text-right">{t("suppliers.directory.contact")}</Label>
                                    <Input id="edit-supplier-contact" name="edit-supplier-contact-name" autoComplete="off" data-1p-ignore data-lpignore="true" data-form-type="other" value={selectedSupplier.contact_person || ""} onChange={(e) => setSelectedSupplier({ ...selectedSupplier, contact_person: e.target.value })} className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-supplier-email" className="text-right">{t("suppliers.directory.col_email")}</Label>
                                    <Input id="edit-supplier-email" name="edit-supplier-work-email" type="text" inputMode="email" autoComplete="off" data-1p-ignore data-lpignore="true" data-form-type="other" value={selectedSupplier.email || ""} onChange={(e) => setSelectedSupplier({ ...selectedSupplier, email: e.target.value })} className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-supplier-phone" className="text-right">{t("suppliers.directory.col_phone")}</Label>
                                    <Input id="edit-supplier-phone" name="edit-supplier-work-phone" type="text" inputMode="tel" autoComplete="off" data-1p-ignore data-lpignore="true" data-form-type="other" value={selectedSupplier.phone || ""} onChange={(e) => setSelectedSupplier({ ...selectedSupplier, phone: e.target.value })} className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-supplier-address" className="text-right">{t("suppliers.directory.address")}</Label>
                                    <Input id="edit-supplier-address" name="edit-supplier-work-location" autoComplete="off" data-1p-ignore data-lpignore="true" data-form-type="other" value={selectedSupplier.address || ""} onChange={(e) => setSelectedSupplier({ ...selectedSupplier, address: e.target.value })} className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-start gap-4">
                                    <Label htmlFor="edit-lead_time_days" className="text-right pt-2">{t("suppliers.directory.lead_time")}</Label>
                                    <div className="col-span-3 space-y-1">
                                        <Input
                                            id="edit-lead_time_days"
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={selectedSupplier.lead_time_days ?? 2}
                                            onChange={(e) => setSelectedSupplier({ ...selectedSupplier, lead_time_days: e.target.value === "" ? 0 : parseInt(e.target.value, 10) })}
                                        />
                                        <p className="text-[11px] text-muted-foreground">{t("suppliers.directory.lead_time_hint")}</p>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={updateMutation.isPending}>
                                    {updateMutation.isPending ? t("suppliers.directory.saving") : t("common.save")}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
