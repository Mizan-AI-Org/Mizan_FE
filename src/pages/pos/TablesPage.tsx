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
import { Table } from "../../lib/types";
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
import { Checkbox } from "@/components/ui/checkbox";

export default function TablesPage() {
    const { accessToken } = useAuth();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [sortColumn, setSortColumn] = useState<keyof Table>("table_number");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [newTable, setNewTable] = useState<Omit<Table, 'id' | 'restaurant' | 'created_at' | 'updated_at'>>({
        table_number: 0,
        capacity: 0,
        is_available: true,
    });

    const { data: tables, isLoading, isError, error } = useQuery<Table[]>({
        queryKey: ["tables", accessToken],
        queryFn: () => api.getTables(accessToken!),
        enabled: !!accessToken,
    });

    const createMutation = useMutation({
        mutationFn: (table: Omit<Table, 'id' | 'restaurant' | 'created_at' | 'updated_at'>) => api.createTable(accessToken!, table),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tables"] });
            toast.success("Table created successfully!");
            setIsCreateDialogOpen(false);
            setNewTable({
                table_number: 0,
                capacity: 0,
                is_available: true,
            });
        },
        onError: (err) => {
            toast.error(`Failed to create table: ${err.message}`);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, table }: { id: string; table: Partial<Omit<Table, 'id' | 'restaurant' | 'created_at' | 'updated_at'>> }) => api.updateTable(accessToken!, id, table),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tables"] });
            toast.success("Table updated successfully!");
            setIsEditDialogOpen(false);
            setSelectedTable(null);
        },
        onError: (err) => {
            toast.error(`Failed to update table: ${err.message}`);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.deleteTable(accessToken!, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tables"] });
            toast.success("Table deleted successfully!");
        },
        onError: (err) => {
            toast.error(`Failed to delete table: ${err.message}`);
        },
    });

    const handleSort = (column: keyof Table) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortColumn(column);
            setSortDirection("asc");
        }
    };

    const sortedAndFilteredTables = (tables || [])
        .filter((table) =>
            table.table_number.toString().includes(searchTerm.toLowerCase()) ||
            table.capacity.toString().includes(searchTerm.toLowerCase())
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
        createMutation.mutate(newTable);
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedTable) {
            updateMutation.mutate({ id: selectedTable.id, table: selectedTable });
        }
    };

    if (isLoading) return <div>Loading tables...</div>;
    if (isError) return <div>Error: {error?.message}</div>;

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Tables</h1>
                    <p className="text-muted-foreground">Manage your restaurant's tables.</p>
                </div>
                <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-gradient-primary hover:bg-primary/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Table
                </Button>
            </div>

            <Card className="shadow-soft">
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search tables by number or capacity..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                    </div>

                    <ShadcnTable>
                        <TableHeader>
                            <TableRow>
                                <TableHead onClick={() => handleSort("table_number")}>
                                    <div className="flex items-center">
                                        Table Number <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("capacity")}>
                                    <div className="flex items-center">
                                        Capacity <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("is_available")}>
                                    <div className="flex items-center">
                                        Available <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedAndFilteredTables.map((table) => (
                                <TableRow key={table.id}>
                                    <TableCell className="font-medium">{table.table_number}</TableCell>
                                    <TableCell>{table.capacity}</TableCell>
                                    <TableCell>
                                        <Badge variant={table.is_available ? "default" : "secondary"}>
                                            {table.is_available ? "Yes" : "No"}
                                        </Badge>
                                    </TableCell>
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
                                                    setSelectedTable(table);
                                                    setIsEditDialogOpen(true);
                                                }}>
                                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => deleteMutation.mutate(table.id)} className="text-destructive focus:text-destructive">
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

            {/* Create Table Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Add New Table</DialogTitle>
                        <DialogDescription>Fill in the details for the new table.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="table_number" className="text-right">Table Number</Label>
                                <Input id="table_number" type="number" value={newTable.table_number} onChange={(e) => setNewTable({ ...newTable, table_number: parseFloat(e.target.value) })} className="col-span-3" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="capacity" className="text-right">Capacity</Label>
                                <Input id="capacity" type="number" value={newTable.capacity} onChange={(e) => setNewTable({ ...newTable, capacity: parseFloat(e.target.value) })} className="col-span-3" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="is_available" className="text-right">Available</Label>
                                <Checkbox
                                    id="is_available"
                                    checked={newTable.is_available}
                                    onCheckedChange={(checked) => setNewTable({ ...newTable, is_available: checked as boolean })}
                                    className="col-span-3 my-2"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={createMutation.isPending}>
                                {createMutation.isPending ? "Creating..." : "Create Table"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Table Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Edit Table</DialogTitle>
                        <DialogDescription>Update the details for the table.</DialogDescription>
                    </DialogHeader>
                    {selectedTable && (
                        <form onSubmit={handleEditSubmit}>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-table_number" className="text-right">Table Number</Label>
                                    <Input id="edit-table_number" type="number" value={selectedTable.table_number} onChange={(e) => setSelectedTable({ ...selectedTable, table_number: parseFloat(e.target.value) })} className="col-span-3" required />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-capacity" className="text-right">Capacity</Label>
                                    <Input id="edit-capacity" type="number" value={selectedTable.capacity} onChange={(e) => setSelectedTable({ ...selectedTable, capacity: parseFloat(e.target.value) })} className="col-span-3" required />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-is_available" className="text-right">Available</Label>
                                    <Checkbox
                                        id="edit-is_available"
                                        checked={selectedTable.is_available}
                                        onCheckedChange={(checked) => setSelectedTable({ ...selectedTable, is_available: checked as boolean })}
                                        className="col-span-3 my-2"
                                    />
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
