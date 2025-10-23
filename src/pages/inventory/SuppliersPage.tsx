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

export default function SuppliersPage() {
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
    });

    const { data: suppliers, isLoading, isError, error } = useQuery<Supplier[]>({ 
        queryKey: ["suppliers", accessToken],
        queryFn: () => api.getSuppliers(accessToken!),
        enabled: !!accessToken,
    });

    const createMutation = useMutation({
        mutationFn: (supplier: Omit<Supplier, 'id' | 'restaurant' | 'created_at' | 'updated_at'>) => api.createSupplier(accessToken!, supplier),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["suppliers"] });
            toast.success("Supplier created successfully!");
            setIsCreateDialogOpen(false);
            setNewSupplier({
                name: "",
                contact_person: "",
                email: "",
                phone: "",
                address: "",
            });
        },
        onError: (err) => {
            toast.error(`Failed to create supplier: ${err.message}`);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, supplier }: { id: string; supplier: Partial<Omit<Supplier, 'id' | 'restaurant' | 'created_at' | 'updated_at'>> }) => api.updateSupplier(accessToken!, id, supplier),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["suppliers"] });
            toast.success("Supplier updated successfully!");
            setIsEditDialogOpen(false);
            setSelectedSupplier(null);
        },
        onError: (err) => {
            toast.error(`Failed to update supplier: ${err.message}`);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.deleteSupplier(accessToken!, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["suppliers"] });
            toast.success("Supplier deleted successfully!");
        },
        onError: (err) => {
            toast.error(`Failed to delete supplier: ${err.message}`);
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

    if (isLoading) return <div>Loading suppliers...</div>;
    if (isError) return <div>Error: {error?.message}</div>;

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Suppliers</h1>
                    <p className="text-muted-foreground">Manage your restaurant's suppliers.</p>
                </div>
                <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-gradient-primary hover:bg-primary/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Supplier
                </Button>
            </div>

            <Card className="shadow-soft">
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search suppliers by name, contact, or email..."
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
                                        Supplier Name <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("contact_person")}>
                                    <div className="flex items-center">
                                        Contact Person <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("email")}>
                                    <div className="flex items-center">
                                        Email <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("phone")}>
                                    <div className="flex items-center">
                                        Phone <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead className="text-right">Actions</TableHead>
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
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => {
                                                    setSelectedSupplier(supplier);
                                                    setIsEditDialogOpen(true);
                                                }}>
                                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => deleteMutation.mutate(supplier.id)} className="text-destructive focus:text-destructive">
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

            {/* Create Supplier Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Add New Supplier</DialogTitle>
                        <DialogDescription>Fill in the details for the new supplier.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Name</Label>
                                <Input id="name" value={newSupplier.name} onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })} className="col-span-3" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="contact_person" className="text-right">Contact Person</Label>
                                <Input id="contact_person" value={newSupplier.contact_person || ""} onChange={(e) => setNewSupplier({ ...newSupplier, contact_person: e.target.value })} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="email" className="text-right">Email</Label>
                                <Input id="email" type="email" value={newSupplier.email || ""} onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="phone" className="text-right">Phone</Label>
                                <Input id="phone" type="tel" value={newSupplier.phone || ""} onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="address" className="text-right">Address</Label>
                                <Input id="address" value={newSupplier.address || ""} onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })} className="col-span-3" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={createMutation.isPending}>
                                {createMutation.isPending ? "Creating..." : "Create Supplier"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Supplier Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Edit Supplier</DialogTitle>
                        <DialogDescription>Update the details for the supplier.</DialogDescription>
                    </DialogHeader>
                    {selectedSupplier && (
                        <form onSubmit={handleEditSubmit}>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-name" className="text-right">Name</Label>
                                    <Input id="edit-name" value={selectedSupplier.name} onChange={(e) => setSelectedSupplier({ ...selectedSupplier, name: e.target.value })} className="col-span-3" required />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-contact_person" className="text-right">Contact Person</Label>
                                    <Input id="edit-contact_person" value={selectedSupplier.contact_person || ""} onChange={(e) => setSelectedSupplier({ ...selectedSupplier, contact_person: e.target.value })} className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-email" className="text-right">Email</Label>
                                    <Input id="edit-email" type="email" value={selectedSupplier.email || ""} onChange={(e) => setSelectedSupplier({ ...selectedSupplier, email: e.target.value })} className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-phone" className="text-right">Phone</Label>
                                    <Input id="edit-phone" type="tel" value={selectedSupplier.phone || ""} onChange={(e) => setSelectedSupplier({ ...selectedSupplier, phone: e.target.value })} className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-address" className="text-right">Address</Label>
                                    <Input id="edit-address" value={selectedSupplier.address || ""} onChange={(e) => setSelectedSupplier({ ...selectedSupplier, address: e.target.value })} className="col-span-3" />
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
