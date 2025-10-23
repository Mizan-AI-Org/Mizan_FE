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
    Clock,
    UserX,
    UserCheck,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { AttendanceReport } from "../../lib/types";
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

export default function AttendanceReportsPage() {
    const { accessToken } = useAuth();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [sortColumn, setSortColumn] = useState<keyof AttendanceReport>("date");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
    const [isViewDetailsDialogOpen, setIsViewDetailsDialogOpen] = useState(false);
    const [selectedReport, setSelectedReport] = useState<AttendanceReport | null>(null);

    const { data: reports, isLoading, isError, error } = useQuery<AttendanceReport[]>({
        queryKey: ["attendanceReports", accessToken],
        queryFn: () => api.getAttendanceReports(accessToken!),
        enabled: !!accessToken,
    });

    const handleSort = (column: keyof AttendanceReport) => {
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
            report.total_staff_hours.toString().includes(searchTerm.toLowerCase())
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

    if (isLoading) return <div>Loading attendance reports...</div>;
    if (isError) return <div>Error: {error?.message}</div>;

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Attendance Reports</h1>
                    <p className="text-muted-foreground">View and analyze staff attendance and labor hours.</p>
                </div>
            </div>

            <Card className="shadow-soft">
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search reports by date or hours..."
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
                                <TableHead onClick={() => handleSort("total_staff_hours")}>
                                    <div className="flex items-center justify-end">
                                        Total Staff Hours <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("staff_on_shift")}>
                                    <div className="flex items-center justify-end">
                                        Staff on Shift <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("late_arrivals")}>
                                    <div className="flex items-center justify-end">
                                        Late Arrivals <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("absences")}>
                                    <div className="flex items-center justify-end">
                                        Absences <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedAndFilteredReports.map((report) => (
                                <TableRow key={report.id}>
                                    <TableCell className="font-medium">{format(new Date(report.date), "PPP")}</TableCell>
                                    <TableCell className="text-right">{report.total_staff_hours.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">{report.staff_on_shift}</TableCell>
                                    <TableCell className="text-right">{report.late_arrivals}</TableCell>
                                    <TableCell className="text-right">{report.absences}</TableCell>
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
                        <DialogTitle>Attendance Report Details</DialogTitle>
                        <DialogDescription>Detailed information for {selectedReport ? format(new Date(selectedReport.date), "PPP") : ""}</DialogDescription>
                    </DialogHeader>
                    {selectedReport && (
                        <div className="grid gap-4 py-4">
                            <div className="flex justify-between items-center">
                                <Label className="font-semibold">Total Staff Hours:</Label>
                                <span>{selectedReport.total_staff_hours.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <Label className="font-semibold">Staff on Shift:</Label>
                                <span>{selectedReport.staff_on_shift}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <Label className="font-semibold">Late Arrivals:</Label>
                                <span>{selectedReport.late_arrivals}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <Label className="font-semibold">Absences:</Label>
                                <span>{selectedReport.absences}</span>
                            </div>

                            <h3 className="text-lg font-semibold mt-4">Attendance Details</h3>
                            {selectedReport.attendance_details && selectedReport.attendance_details.length > 0 ? (
                                <ul className="list-disc list-inside ml-4 space-y-1">
                                    {selectedReport.attendance_details.map((detail: any, index: number) => (
                                        <li key={index}>
                                            {detail.staff_name} - {detail.status} (Clock In: {detail.clock_in}, Clock Out: {detail.clock_out}, Hours: {detail.hours})
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-muted-foreground">No attendance details recorded.</p>
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
