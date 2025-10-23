import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Search,
    ArrowUpDown,
    MoreHorizontal,
    Eye,
    DollarSign,
    Package,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { DailySalesReport } from "../../lib/types";
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
import { format } from "date-fns";
import { Label } from "@/components/ui/label";

export default function DailySalesReportsPage() {
    const { accessToken } = useAuth();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [sortColumn, setSortColumn] = useState<keyof DailySalesReport>("date");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
    const [isViewDetailsDialogOpen, setIsViewDetailsDialogOpen] = useState(false);
    const [selectedReport, setSelectedReport] = useState<DailySalesReport | null>(null);

    const { data: reports, isLoading, isError, error } = useQuery<DailySalesReport[]>({
        queryKey: ["dailySalesReports", accessToken],
        queryFn: () => api.getDailySalesReports(accessToken!),
        enabled: !!accessToken,
    });

    const handleSort = (column: keyof DailySalesReport) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortColumn(column);
            setSortDirection("asc");
        }
    };

    const sortedAndFilteredReports = (reports || [])
        .filter((report) =>
            format(new Date(report.date), "PPP").toLowerCase().includes(searchTerm.toLowerCase()) ||
            report.total_revenue.toString().includes(searchTerm.toLowerCase())
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

    if (isLoading) return <div>Loading daily sales reports...</div>;
    if (isError) return <div>Error: {error?.message}</div>;

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Daily Sales Reports</h1>
                    <p className="text-muted-foreground">View and analyze your restaurant's daily sales performance.</p>
                </div>
            </div>

            <Card className="shadow-soft">
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search reports by date or revenue..."
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
                                <TableHead onClick={() => handleSort("date")}>
                                    <div className="flex items-center">
                                        Date <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("total_revenue")}>
                                    <div className="flex items-center justify-end">
                                        Total Revenue <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("total_orders")}>
                                    <div className="flex items-center justify-end">
                                        Total Orders <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("avg_order_value")}>
                                    <div className="flex items-center justify-end">
                                        Avg Order Value <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedAndFilteredReports.map((report) => (
                                <TableRow key={report.id}>
                                    <TableCell className="font-medium">{format(new Date(report.date), "PPP")}</TableCell>
                                    <TableCell className="text-right">${report.total_revenue.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">{report.total_orders}</TableCell>
                                    <TableCell className="text-right">${report.avg_order_value.toFixed(2)}</TableCell>
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
                                                    setSelectedReport(report);
                                                    setIsViewDetailsDialogOpen(true);
                                                }}>
                                                    <Eye className="mr-2 h-4 w-4" /> View Details
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

            {/* View Report Details Dialog */}
            <Dialog open={isViewDetailsDialogOpen} onOpenChange={setIsViewDetailsDialogOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Daily Sales Report Details</DialogTitle>
                        <DialogDescription>Detailed information for {selectedReport ? format(new Date(selectedReport.date), "PPP") : ""}</DialogDescription>
                    </DialogHeader>
                    {selectedReport && (
                        <div className="grid gap-4 py-4">
                            <div className="flex justify-between items-center">
                                <Label className="font-semibold">Total Revenue:</Label>
                                <span>${selectedReport.total_revenue.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <Label className="font-semibold">Total Orders:</Label>
                                <span>{selectedReport.total_orders}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <Label className="font-semibold">Average Order Value:</Label>
                                <span>${selectedReport.avg_order_value.toFixed(2)}</span>
                            </div>

                            <h3 className="text-lg font-semibold mt-4">Top Selling Items</h3>
                            {selectedReport.top_selling_items && selectedReport.top_selling_items.length > 0 ? (
                                <ul className="list-disc list-inside ml-4 space-y-1">
                                    {selectedReport.top_selling_items.map((item: any, index: number) => (
                                        <li key={index}>{item.name} (Qty: {item.quantity}, Revenue: ${item.revenue.toFixed(2)})</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-muted-foreground">No top selling items recorded.</p>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setIsViewDetailsDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
