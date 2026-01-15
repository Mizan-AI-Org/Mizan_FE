import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Users,
    UserCheck,
    Clock,
    ClipboardCheck,
    TrendingUp,
    Search,
    Coffee,
    LogOut,
    AlertCircle,
    CheckCircle,
    PlusCircle,
    Edit,
    MoreHorizontal,
    Eye,
    Calendar,
    Activity,
    X,
    Phone,
    Mail,
    Shield,
    Key,
    CheckCircle2,
    XCircle,
    MapPin,
    Briefcase,
    ExternalLink,
    Settings,
    MessageCircle,
    Upload,
    Download,
    FileText,
    Plus,
    FilePlus,
    Loader2,
    Send,
    Trash2,
    RefreshCw
} from "lucide-react";
import { API_BASE, BackendService, api } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { AuthContextType } from "@/contexts/AuthContext.types";
import { format } from "date-fns";

// Types
interface StaffMember {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    is_active: boolean;
    phone?: string;
    join_date?: string;
}

interface Invitation {
    id: string;
    email: string;
    role: string;
    first_name?: string;
    last_name?: string;
    is_accepted: boolean;
    created_at: string;
    expires_at: string;
    extra_data?: {
        phone?: string;
        department?: string;
    };
}

interface AttendanceRecord {
    id: string;
    staff_id: string;
    staff_name: string;
    clock_in: string;
    clock_out: string | null;
    status: "checked_in" | "on_break" | "checked_out";
    late: boolean;
}

interface AttendanceSummary {
    staff_id: string;
    staff_name: string;
    clock_in: string | null;
    clock_out: string | null;
    status: "checked_in" | "on_break" | "checked_out" | "not_started";
    late: boolean;
}

// Pagination Response Interface
interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

// Reusable Pagination Controls Component
const PaginationControls: React.FC<{
    currentPage: number;
    count: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    isLoading?: boolean;
}> = ({ currentPage, count, pageSize, onPageChange, isLoading }) => {
    const totalPages = Math.ceil(count / pageSize);
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-between px-2 py-4 border-t border-slate-100 dark:border-slate-800">
            <div className="text-sm text-slate-500">
                Found {count} items • Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1 || isLoading}
                >
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || isLoading}
                >
                    Next
                </Button>
            </div>
        </div>
    );
};

// Presence Tab Component
const PresenceTab: React.FC = () => {
    const { logout } = useAuth() as AuthContextType;

    // Fetch today's attendance events
    const { data: attendanceResponse, isLoading: isAttendanceLoading } = useQuery<PaginatedResponse<any>>({
        queryKey: ["today-attendance"],
        queryFn: async () => {
            const response = await fetch(`${API_BASE}/timeclock/attendance/today/?page_size=100`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                },
            });
            if (!response.ok) {
                if (response.status === 401) logout();
                throw new Error("Failed to fetch attendance");
            }
            return response.json();
        },
        refetchInterval: 30000,
    });

    // Fetch all active staff to ensure everyone is visible
    const { data: staffResponse, isLoading: isStaffLoading } = useQuery<PaginatedResponse<StaffMember>>({
        queryKey: ["active-staff-presence"],
        queryFn: async () => {
            const response = await fetch(`${API_BASE}/users/?is_active=true&page_size=1000`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                },
            });
            if (!response.ok) throw new Error("Failed to fetch staff");
            return response.json();
        },
    });

    const attendanceData = Array.isArray(attendanceResponse) ? attendanceResponse : (attendanceResponse?.results || []);
    const staffData = Array.isArray(staffResponse) ? staffResponse : (staffResponse?.results || []);
    const isLoading = isAttendanceLoading || isStaffLoading;

    // Transform events into per-staff status
    const staffStatusMap = React.useMemo(() => {
        const map: Record<string, AttendanceSummary> = {};

        // Initialize map with all active staff to ensure everyone is visible
        staffData.forEach((staff) => {
            map[staff.id] = {
                staff_id: staff.id,
                staff_name: `${staff.first_name} ${staff.last_name}`,
                clock_in: null,
                clock_out: null,
                status: "not_started",
                late: false,
            };
        });

        // Overlay latest attendance events
        // Events are often ordered by timestamp desc, so we process oldest to newest to let latest win,
        // or just process newest to oldest and skip if already set.
        const sortedAttendance = [...attendanceData].sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        sortedAttendance.forEach(event => {
            const staffId = event.staff;
            if (!map[staffId]) return; // Skip if not in active staff list

            const time = format(new Date(event.timestamp), "HH:mm");

            // Minimal status logic
            if (event.event_type === "in" || event.event_type === "CLOCK_IN") {
                map[staffId].status = "checked_in";
                map[staffId].clock_in = time;
            } else if (event.event_type === "out" || event.event_type === "CLOCK_OUT") {
                map[staffId].status = "checked_out";
                map[staffId].clock_out = time;
            } else if (event.event_type === "break_start" || event.event_type === "BREAK_START") {
                map[staffId].status = "on_break";
            } else if (event.event_type === "break_end" || event.event_type === "BREAK_END") {
                map[staffId].status = "checked_in";
            }
        });

        return Object.values(map);
    }, [attendanceData, staffData]);

    const checkedIn = staffStatusMap.filter(s => s.status === "checked_in");
    const onBreak = staffStatusMap.filter(s => s.status === "on_break");
    const checkedOut = staffStatusMap.filter(s => s.status === "checked_out");
    const notStarted = staffStatusMap.filter(s => s.status === "not_started");

    const StatusBadge = ({ status }: { status: string }) => {
        const styles = {
            checked_in: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
            on_break: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
            checked_out: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
            not_started: "bg-slate-50 text-slate-400 dark:bg-slate-800/50 dark:text-slate-500 border-dashed",
        };
        const labels = {
            checked_in: "Checked In",
            on_break: "On Break",
            checked_out: "Checked Out",
            not_started: "Not Started",
        };
        return (
            <Badge variant="outline" className={styles[status as keyof typeof styles] || styles.checked_out}>
                {labels[status as keyof typeof labels] || status}
            </Badge>
        );
    };

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{checkedIn.length}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Checked In</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <Coffee className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{onBreak.length}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">On Break</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <LogOut className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{checkedOut.length}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Checked Out</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center">
                                <Users className="w-5 h-5 text-slate-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{notStarted.length}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Not Started</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Live Staff List */}
            <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <CardHeader>
                    <CardTitle className="text-slate-900 dark:text-white">Staff On Duty</CardTitle>
                    <CardDescription className="text-slate-500 dark:text-slate-400">Real-time presence overview</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-100 dark:border-slate-800">
                                <TableHead className="text-slate-500 dark:text-slate-400">Name</TableHead>
                                <TableHead className="text-slate-500 dark:text-slate-400">Clock In</TableHead>
                                <TableHead className="text-slate-500 dark:text-slate-400">Status</TableHead>
                                <TableHead className="text-slate-500 dark:text-slate-400">Late</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500" />
                                        <p className="text-sm text-slate-500 mt-2">Loading presence data...</p>
                                    </TableCell>
                                </TableRow>
                            ) : staffStatusMap.length > 0 ? (
                                staffStatusMap.map((record) => (
                                    <TableRow key={record.staff_id} className="border-slate-100 dark:border-slate-800">
                                        <TableCell className="font-medium text-slate-900 dark:text-white">{record.staff_name}</TableCell>
                                        <TableCell className="text-slate-600 dark:text-slate-300">{record.clock_in || "-"}</TableCell>
                                        <TableCell><StatusBadge status={record.status} /></TableCell>
                                        <TableCell>
                                            {record.late ? (
                                                <Badge variant="destructive" className="text-xs">Late</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-xs text-slate-500">On Time</Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                                        No staff attendance recorded today
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

// Team Tab Component
const TeamTab: React.FC = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    const [staffPage, setStaffPage] = useState(1);
    const [invitesPage, setInvitesPage] = useState(1);
    const [selectedMember, setSelectedMember] = useState<StaffMember | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const { logout } = useAuth() as AuthContextType;

    const { data: staffData, isLoading, error, refetch: refetchStaff } = useQuery<PaginatedResponse<StaffMember>>({
        queryKey: ["staff-members", staffPage],
        queryFn: async () => {
            const response = await fetch(`${API_BASE}/users/?is_active=true&page=${staffPage}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                },
            });
            if (!response.ok) {
                if (response.status === 401) {
                    logout();
                    throw new Error("Session expired");
                }
                throw new Error("Failed to fetch staff");
            }
            return response.json();
        },
    });

    const { data: invitesData, isLoading: isInvitesLoading, refetch: refetchInvites } = useQuery<PaginatedResponse<Invitation>>({
        queryKey: ["pending-invitations", invitesPage],
        queryFn: async () => {
            const response = await fetch(`${API_BASE}/invitations/?is_accepted=false&page=${invitesPage}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                },
            });
            if (!response.ok) throw new Error("Failed to fetch invitations");
            return response.json();
        },
    });

    const staff = Array.isArray(staffData) ? staffData : (staffData?.results || []);
    const invitations = Array.isArray(invitesData) ? invitesData : (invitesData?.results || []);

    const handleResendInvite = async (inviteId: string) => {
        try {
            const response = await fetch(`${API_BASE}/invitations/${inviteId}/resend/`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                },
            });
            if (!response.ok) throw new Error("Failed to resend invitation");
            toast.success("Invitation resent successfully");
        } catch (err: any) {
            toast.error(err.message || "Failed to resend invitation");
        }
    };

    const handleCancelInvite = async (inviteId: string) => {
        if (!confirm("Are you sure you want to cancel this invitation?")) return;
        try {
            const response = await fetch(`${API_BASE}/invitations/${inviteId}/`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                },
            });
            if (!response.ok) throw new Error("Failed to cancel invitation");
            toast.success("Invitation cancelled");
            refetchInvites();
        } catch (err: any) {
            toast.error(err.message || "Failed to cancel invitation");
        }
    };

    const refetch = () => {
        refetchStaff();
        refetchInvites();
    };

    const filteredStaff = staff?.filter(s =>
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleViewProfile = (member: StaffMember) => {
        navigate(`/dashboard/staff/${member.id}`);
    };

    const handleEditProfile = (member: StaffMember) => {
        setSelectedMember(member);
        setIsEditModalOpen(true);
    };

    // View Profile Modal
    const ViewProfileModal = () => {
        if (!selectedMember) return null;
        const [documents, setDocuments] = useState<any[]>([]);
        const [isUploading, setIsUploading] = useState(false);
        const [isGeneratingReport, setIsGeneratingReport] = useState(false);
        const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
        const [newPassword, setNewPassword] = useState("");
        const [isResetting, setIsResetting] = useState(false);

        const fetchDocuments = async () => {
            try {
                const token = localStorage.getItem("access_token") || "";
                const docs = await api.getStaffDocuments(token, selectedMember.id);
                setDocuments(docs);
            } catch (err) {
                console.error("Failed to fetch documents", err);
            }
        };

        React.useEffect(() => {
            if (isViewModalOpen) {
                fetchDocuments();
            }
        }, [isViewModalOpen, selectedMember.id]);

        const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;

            setIsUploading(true);
            try {
                const token = localStorage.getItem("access_token") || "";
                await api.uploadStaffDocument(token, selectedMember.id, file, file.name);
                toast.success("Document uploaded successfully");
                fetchDocuments();
            } catch (err: any) {
                toast.error(err.message || "Failed to upload document");
            } finally {
                setIsUploading(false);
            }
        };

        const handleGenerateReport = async () => {
            setIsGeneratingReport(true);
            try {
                const token = localStorage.getItem("access_token") || "";
                const blob = await api.generateStaffReport(token, selectedMember.id);
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `report_${selectedMember.first_name}_${selectedMember.last_name}.pdf`;
                a.click();
                window.URL.revokeObjectURL(url);
                toast.success("Report generated successfully");
            } catch (err: any) {
                toast.error(err.message || "Failed to generate report");
            } finally {
                setIsGeneratingReport(false);
            }
        };

        const handleResetPassword = async () => {
            if (!newPassword) {
                toast.error("Please enter a new password");
                return;
            }
            setIsResetting(true);
            try {
                const token = localStorage.getItem("access_token") || "";
                await api.resetStaffPassword(token, selectedMember.id, newPassword);
                toast.success("Password reset successfully");
                setIsResetPasswordOpen(false);
                setNewPassword("");
            } catch (err: any) {
                toast.error(err.message || "Failed to reset password");
            } finally {
                setIsResetting(false);
            }
        };

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <Card className="w-full max-w-2xl mx-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-slate-900 dark:text-white">Staff Profile</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setIsViewModalOpen(false)}>
                            <X className="w-4 h-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                    <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                        {selectedMember.first_name?.[0]}{selectedMember.last_name?.[0]}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                                        {selectedMember.first_name} {selectedMember.last_name}
                                    </h3>
                                    <Badge variant="outline" className="capitalize mt-1 border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400">
                                        {selectedMember.role?.toLowerCase().replace(/_/g, " ")}
                                    </Badge>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                onClick={handleGenerateReport}
                                disabled={isGeneratingReport}
                            >
                                {isGeneratingReport ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                                Detailed Report
                            </Button>
                        </div>

                        {/* Reset Password Section */}
                        {isResetPasswordOpen && (
                            <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-100 dark:border-amber-900/30 space-y-3 animate-in fade-in slide-in-from-top-2">
                                <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-400 flex items-center gap-2">
                                    <Key className="w-4 h-4" /> Reset Password for {selectedMember.first_name}
                                </h4>
                                <div className="flex gap-2">
                                    <Input
                                        type="password"
                                        placeholder="Enter new password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="h-9 bg-white dark:bg-slate-900"
                                    />
                                    <Button
                                        size="sm"
                                        className="bg-amber-600 hover:bg-amber-700 text-white"
                                        onClick={handleResetPassword}
                                        disabled={isResetting}
                                    >
                                        {isResetting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Update"}
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setIsResetPasswordOpen(false)}>Cancel</Button>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Contact Info</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <Mail className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm text-slate-600 dark:text-slate-300">{selectedMember.email}</span>
                                    </div>
                                    {selectedMember.phone && (
                                        <div className="flex items-center gap-3">
                                            <Phone className="w-4 h-4 text-slate-400" />
                                            <span className="text-sm text-slate-600 dark:text-slate-300">{selectedMember.phone}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3">
                                        <Shield className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm text-slate-600 dark:text-slate-300 capitalize">{selectedMember.role?.toLowerCase().replace(/_/g, " ")}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Clock className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm text-slate-600 dark:text-slate-300">Joined: {selectedMember.join_date || "N/A"}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Documents</h4>
                                    <label className="cursor-pointer">
                                        <Input type="file" className="hidden" onChange={handleUploadDocument} disabled={isUploading} />
                                        <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700">
                                            {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                            Add
                                        </div>
                                    </label>
                                </div>
                                <div className="space-y-2 max-h-[120px] overflow-y-auto pr-2">
                                    {documents.length > 0 ? (
                                        documents.map((doc, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-2 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <FileText className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                                    <span className="text-xs text-slate-600 dark:text-slate-300 truncate">{doc.title}</span>
                                                </div>
                                                <a href={doc.document} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-emerald-500">
                                                    <Download className="w-3 h-3" />
                                                </a>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-4 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-lg">
                                            <p className="text-xs text-slate-400">No documents uploaded</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200 dark:shadow-none" onClick={() => { setIsViewModalOpen(false); handleEditProfile(selectedMember); }}>
                                <Edit className="w-4 h-4 mr-2" /> Edit Profile
                            </Button>
                            <Button
                                variant="outline"
                                className="flex-1 border-slate-200 dark:border-slate-700"
                                onClick={() => setIsResetPasswordOpen(!isResetPasswordOpen)}
                            >
                                <Key className="w-4 h-4 mr-2" /> Reset Password
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    // Edit Profile Modal
    const EditProfileModal = () => {
        if (!selectedMember) return null;
        const [formData, setFormData] = useState({
            first_name: selectedMember.first_name,
            last_name: selectedMember.last_name,
            email: selectedMember.email,
            phone: selectedMember.phone || "",
            role: selectedMember.role,
        });

        const handleSave = async () => {
            try {
                const token = localStorage.getItem("access_token") || "";
                await api.updateStaffProfile(token, selectedMember.id, formData);
                toast.success("Profile updated successfully");
                setIsEditModalOpen(false);
                refetch();
            } catch (err: any) {
                toast.error(err.message || "Failed to update profile");
            }
        };

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <Card className="w-full max-w-md mx-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-slate-900 dark:text-white">Edit Staff Profile</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setIsEditModalOpen(false)}>
                            <X className="w-4 h-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">First Name</label>
                            <Input value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} className="bg-white dark:bg-slate-800" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Last Name</label>
                            <Input value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} className="bg-white dark:bg-slate-800" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                            <Input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="bg-white dark:bg-slate-800" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone</label>
                            <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="bg-white dark:bg-slate-800" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
                            <select
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                <optgroup label="Management">
                                    <option value="MANAGER">Manager</option>
                                    <option value="ADMIN">Admin</option>
                                    <option value="SUPER_ADMIN">Super Admin</option>
                                </optgroup>
                                <optgroup label="Kitchen">
                                    <option value="CHEF">Chef</option>
                                    <option value="SOUS_CHEF">Sous Chef</option>
                                    <option value="PASTRY_CHEF">Pastry Chef</option>
                                    <option value="KITCHEN_STAFF">Kitchen Staff</option>
                                    <option value="DISHWASHER">Dishwasher</option>
                                </optgroup>
                                <optgroup label="Front of House">
                                    <option value="WAITER">Waiter</option>
                                    <option value="WAITRESS">Waitress</option>
                                    <option value="HOST">Host</option>
                                    <option value="HOSTESS">Hostess</option>
                                    <option value="BARTENDER">Bartender</option>
                                    <option value="SOMMELIER">Sommelier</option>
                                    <option value="RUNNER">Runner</option>
                                    <option value="BUSSER">Busser</option>
                                    <option value="CASHIER">Cashier</option>
                                </optgroup>
                                <optgroup label="Other">
                                    <option value="BARISTA">Barista</option>
                                    <option value="CLEANER">Cleaner</option>
                                    <option value="SECURITY">Security</option>
                                </optgroup>
                            </select>
                        </div>
                        <div className="flex gap-2 pt-4">
                            <Button variant="outline" className="flex-1" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSave}>Save Changes</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    // Invite Staff Modal
    const InviteStaffModal = () => {
        const [inviteMethod, setInviteMethod] = useState<"email" | "whatsapp">("email");
        const [isBulkMode, setIsBulkMode] = useState(false);
        const [bulkData, setBulkData] = useState<any[]>([]);
        const [formData, setFormData] = useState({
            email: "",
            first_name: "",
            last_name: "",
            role: "MANAGER",
            phone_number: "",
        });

        const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                const lines = text.split("\n");
                const headers = lines[0].split(",").map(h => h.trim().toLowerCase());

                const parsed = lines.slice(1).map(line => {
                    const values = line.split(",").map(v => v.trim());
                    if (values.length < 4) return null;
                    return {
                        first_name: values[0],
                        last_name: values[1],
                        role: values[2],
                        contact: values[3]
                    };
                }).filter(Boolean);

                if (parsed.length === 0) {
                    toast.error("No valid data found in CSV. Please check the format.");
                    return;
                }
                setBulkData(parsed);
                toast.success(`Parsed ${parsed.length} staff members from CSV`);
            };
            reader.readAsText(file);
        };

        const downloadTemplate = () => {
            const content = "First Name,Last Name,Role,Email or WhatsApp\nJohn,Doe,CHEF,john@example.com\nJane,Smith,WAITER,+212600000000";
            const blob = new Blob([content], { type: "text/csv" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "staff_invite_template.csv";
            a.click();
            window.URL.revokeObjectURL(url);
        };

        const handleInvite = async () => {
            if (isBulkMode) {
                if (bulkData.length === 0) {
                    toast.error("Please upload a CSV file with staff data first");
                    return;
                }

                try {
                    const token = localStorage.getItem("access_token") || "";
                    const response = await fetch(`${API_BASE}/staff/invite-bulk-csv/`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            staff_list: bulkData,
                            invitation_method: inviteMethod
                        }),
                    });
                    if (!response.ok) throw new Error("Failed to send bulk invitations");
                    toast.success(`Invitations sent to ${bulkData.length} staff members successfully`);
                    setIsInviteModalOpen(false);
                    refetch();
                } catch (err: any) {
                    toast.error(err.message || "Failed to send bulk invitations");
                }
                return;
            }

            if (inviteMethod === "email" && !formData.email) {
                toast.error("Email is required for email invitation");
                return;
            }
            if (inviteMethod === "whatsapp" && !formData.phone_number) {
                toast.error("Phone number is required for WhatsApp invitation");
                return;
            }

            try {
                const token = localStorage.getItem("access_token") || "";
                const response = await fetch(`${API_BASE}/staff/invite/`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        ...formData,
                        invitation_method: inviteMethod
                    }),
                });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || errorData.detail || "Failed to send invitation");
                }
                toast.success(`Invitation sent successfully via ${inviteMethod === "email" ? "Email" : "WhatsApp"}`);
                setIsInviteModalOpen(false);
                refetch();
            } catch (err: any) {
                toast.error(err.message || "Failed to send invitation");
            }
        };

        return (
            <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
                <DialogContent className="sm:max-w-3xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="text-slate-900 dark:text-white">Invite Staff Member</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 pt-4">
                        {/* Mode Selector */}
                        <div className="flex justify-center mb-2">
                            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-full max-w-sm">
                                <button
                                    onClick={() => setIsBulkMode(false)}
                                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${!isBulkMode
                                        ? "bg-white dark:bg-slate-700 text-emerald-600 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                                        }`}
                                >
                                    Individual
                                </button>
                                <button
                                    onClick={() => setIsBulkMode(true)}
                                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${isBulkMode
                                        ? "bg-white dark:bg-slate-700 text-emerald-600 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                                        }`}
                                >
                                    Bulk Invite
                                </button>
                            </div>
                        </div>

                        {/* Invitation Method Selector */}
                        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                            <button
                                onClick={() => setInviteMethod("email")}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${inviteMethod === "email"
                                    ? "bg-white dark:bg-slate-700 text-emerald-600 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                                    }`}
                            >
                                <Mail className="w-4 h-4" />
                                Email
                            </button>
                            <button
                                onClick={() => setInviteMethod("whatsapp")}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${inviteMethod === "whatsapp"
                                    ? "bg-white dark:bg-slate-700 text-emerald-600 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                                    }`}
                            >
                                <Phone className="w-4 h-4" />
                                WhatsApp
                            </button>
                        </div>

                        {!isBulkMode ? (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">First Name</label>
                                        <Input value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} placeholder="John" className="bg-white dark:bg-slate-800" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Last Name</label>
                                        <Input value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} placeholder="Doe" className="bg-white dark:bg-slate-800" />
                                    </div>
                                </div>

                                {inviteMethod === "email" ? (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Address <span className="text-red-500">*</span></label>
                                        <Input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="john.doe@example.com" className="bg-white dark:bg-slate-800" />
                                        <p className="text-xs text-slate-500">We'll send an invitation link to this email.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">WhatsApp Number <span className="text-red-500">*</span></label>
                                        <Input value={formData.phone_number} onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })} placeholder="+1234567890" className="bg-white dark:bg-slate-800" />
                                        <p className="text-xs text-slate-500">We'll send an invitation via WhatsApp to this number.</p>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    >
                                        <optgroup label="Management">
                                            <option value="MANAGER">Manager</option>
                                            <option value="ADMIN">Admin</option>
                                            <option value="SUPER_ADMIN">Super Admin</option>
                                        </optgroup>
                                        <optgroup label="Kitchen">
                                            <option value="CHEF">Chef</option>
                                            <option value="SOUS_CHEF">Sous Chef</option>
                                            <option value="PASTRY_CHEF">Pastry Chef</option>
                                            <option value="KITCHEN_STAFF">Kitchen Staff</option>
                                            <option value="DISHWASHER">Dishwasher</option>
                                        </optgroup>
                                        <optgroup label="Front of House">
                                            <option value="WAITER">Waiter</option>
                                            <option value="WAITRESS">Waitress</option>
                                            <option value="HOST">Host</option>
                                            <option value="HOSTESS">Hostess</option>
                                            <option value="BARTENDER">Bartender</option>
                                            <option value="SOMMELIER">Sommelier</option>
                                            <option value="RUNNER">Runner</option>
                                            <option value="BUSSER">Busser</option>
                                            <option value="CASHIER">Cashier</option>
                                        </optgroup>
                                        <optgroup label="Other">
                                            <option value="BARISTA">Barista</option>
                                            <option value="CLEANER">Cleaner</option>
                                            <option value="SECURITY">Security</option>
                                        </optgroup>
                                    </select>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-4">
                                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center bg-slate-50/50 dark:bg-slate-800/50">
                                    <Upload className="w-10 h-10 text-slate-400 mx-auto mb-4" />
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Upload CSV File</h3>
                                    <p className="text-xs text-slate-500 mb-4">Columns: First Name, Last Name, Role, Email or WhatsApp Number</p>
                                    <Input
                                        type="file"
                                        accept=".csv"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        id="csv-upload"
                                    />
                                    <label
                                        htmlFor="csv-upload"
                                        className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg cursor-pointer transition-colors"
                                    >
                                        Select CSV File
                                    </label>
                                    {bulkData.length > 0 && (
                                        <p className="mt-3 text-sm font-medium text-emerald-600">
                                            {bulkData.length} staff members ready to invite
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={downloadTemplate}
                                    className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-all"
                                >
                                    <Download className="w-4 h-4" />
                                    Download CSV Template
                                </button>

                                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                                    <p className="text-[11px] text-amber-800 dark:text-amber-400">
                                        <strong>Tip:</strong> WhatsApp numbers should include country code (e.g., +212 for Morocco). Roles must match standard restaurant labels (Manager, Chef, Waiter, etc.).
                                    </p>
                                </div>
                            </div>
                        )}
                        <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-4" onClick={handleInvite}>
                            Send Invitation
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        );
    };

    return (
        <div className="space-y-6">
            {/* Modals */}
            {isViewModalOpen && <ViewProfileModal />}
            {isEditModalOpen && <EditProfileModal />}
            {isInviteModalOpen && <InviteStaffModal />}

            {/* Search & Actions */}
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search staff..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    />
                </div>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setIsInviteModalOpen(true)}>
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Add Staff
                </Button>
            </div>

            {/* Staff Directory */}
            <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <CardContent className="pt-6">
                    {isLoading ? (
                        <div className="text-center py-8 text-slate-500">Loading staff...</div>
                    ) : error ? (
                        <div className="text-center py-8 text-red-500">Error loading staff</div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-slate-100 dark:border-slate-800">
                                        <TableHead className="text-slate-500 dark:text-slate-400">Name</TableHead>
                                        <TableHead className="text-slate-500 dark:text-slate-400">Email</TableHead>
                                        <TableHead className="text-slate-500 dark:text-slate-400">Role</TableHead>
                                        <TableHead className="text-slate-500 dark:text-slate-400">Status</TableHead>
                                        <TableHead className="text-slate-500 dark:text-slate-400">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredStaff?.map((member) => (
                                        <TableRow key={member.id} className="border-slate-100 dark:border-slate-800">
                                            <TableCell className="font-medium text-slate-900 dark:text-white">
                                                {member.first_name} {member.last_name}
                                            </TableCell>
                                            <TableCell className="text-slate-600 dark:text-slate-300">{member.email}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="capitalize">
                                                    {member.role?.toLowerCase().replace(/_/g, " ")}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={member.is_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700"}>
                                                    {member.is_active ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditProfile(member)} title="Edit Profile">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewProfile(member)} title="View Profile">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <PaginationControls
                                currentPage={staffPage}
                                count={staffData?.count || 0}
                                pageSize={20}
                                onPageChange={setStaffPage}
                                isLoading={isLoading}
                            />
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Pending Invitations */}
            <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-slate-900 dark:text-white">Pending Invitations</CardTitle>
                        <CardDescription className="text-slate-500 dark:text-slate-400">Staff members who haven't joined yet</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => refetchInvites()} disabled={isInvitesLoading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${isInvitesLoading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                </CardHeader>
                <CardContent>
                    {isInvitesLoading ? (
                        <div className="text-center py-8 text-slate-500">Loading invitations...</div>
                    ) : invitations && invitations.length > 0 ? (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-slate-100 dark:border-slate-800">
                                        <TableHead className="text-slate-500 dark:text-slate-400">Name</TableHead>
                                        <TableHead className="text-slate-500 dark:text-slate-400">Email/Phone</TableHead>
                                        <TableHead className="text-slate-500 dark:text-slate-400">Role</TableHead>
                                        <TableHead className="text-slate-500 dark:text-slate-400">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invitations.map((invite) => (
                                        <TableRow key={invite.id} className="border-slate-100 dark:border-slate-800">
                                            <TableCell className="font-medium text-slate-900 dark:text-white">
                                                {invite.first_name || "New"} {invite.last_name || "Member"}
                                            </TableCell>
                                            <TableCell className="text-slate-600 dark:text-slate-300">
                                                <div className="flex items-center gap-2">
                                                    {invite.email ? <Mail className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                                                    {invite.email || (invite.extra_data?.phone || "N/A")}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="capitalize">
                                                    {invite.role?.toLowerCase().replace(/_/g, " ")}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-700" onClick={() => handleResendInvite(invite.id)} title="Resend Invitation">
                                                        <Send className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700" onClick={() => handleCancelInvite(invite.id)} title="Cancel Invitation">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <PaginationControls
                                currentPage={invitesPage}
                                count={invitesData?.count || 0}
                                pageSize={20}
                                onPageChange={setInvitesPage}
                                isLoading={isInvitesLoading}
                            />
                        </>
                    ) : (
                        <div className="text-center py-8 text-slate-500">No pending invitations</div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

// Attendance Tab Component
const AttendanceTab: React.FC = () => {
    const [page, setPage] = useState(1);
    const { logout } = useAuth() as AuthContextType;

    const { data: paginatedData, isLoading } = useQuery<PaginatedResponse<any>>({
        queryKey: ["today-attendance", page],
        queryFn: async () => {
            const response = await fetch(`${API_BASE}/timeclock/attendance/today/?page=${page}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                },
            });
            if (!response.ok) {
                if (response.status === 401) logout();
                throw new Error("Failed to fetch attendance");
            }
            return response.json();
        },
    });

    const attendanceData = Array.isArray(paginatedData) ? paginatedData : (paginatedData?.results || []);

    const stats = React.useMemo(() => {
        if (!attendanceData) return { present: 0, late: 0, absent: 0 };
        const uniqueStaff = new Set(attendanceData.map(e => e.staff)).size;
        // In a real scenario, we'd compare with total staff count and shifts
        return {
            present: uniqueStaff,
            late: 0, // Needs shift data
            absent: 0, // Needs shift data
        };
    }, [attendanceData]);

    return (
        <div className="space-y-6">
            {/* Date Filter */}
            <div className="flex items-center gap-4">
                <Button variant="outline" className="border-slate-200 dark:border-slate-800">
                    <Calendar className="w-4 h-4 mr-2" />
                    Today
                </Button>
            </div>

            {/* Attendance Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Present Today</p>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white uppercase">{stats.present}</p>
                            </div>
                            <CheckCircle className="w-8 h-8 text-emerald-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Late Arrivals</p>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.late}</p>
                            </div>
                            <Clock className="w-8 h-8 text-amber-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Attendance History Table */}
            <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <CardHeader>
                    <CardTitle className="text-slate-900 dark:text-white">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-100 dark:border-slate-800">
                                <TableHead className="text-slate-500 dark:text-slate-400">Staff</TableHead>
                                <TableHead className="text-slate-500 dark:text-slate-400">Event</TableHead>
                                <TableHead className="text-slate-500 dark:text-slate-400">Time</TableHead>
                                <TableHead className="text-slate-500 dark:text-slate-400">Location</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500" />
                                    </TableCell>
                                </TableRow>
                            ) : attendanceData && attendanceData.length > 0 ? (
                                attendanceData.map((record) => (
                                    <TableRow key={record.id} className="border-slate-100 dark:border-slate-800">
                                        <TableCell className="font-medium text-slate-900 dark:text-white">{record.staff_name}</TableCell>
                                        <TableCell className="capitalize text-slate-600 dark:text-slate-300">
                                            {record.event_type.replace("_", " ")}
                                        </TableCell>
                                        <TableCell className="text-slate-600 dark:text-slate-300">
                                            {format(new Date(record.timestamp), "HH:mm")}
                                        </TableCell>
                                        <TableCell className="text-slate-600 dark:text-slate-300">
                                            {record.location_name || "Device"}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                                        No recent activity
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    <PaginationControls
                        currentPage={page}
                        count={paginatedData?.count || 0}
                        pageSize={20}
                        onPageChange={setPage}
                        isLoading={isLoading}
                    />
                </CardContent>
            </Card>
        </div>
    );
};

// Tasks Tab Component
const TasksTab: React.FC = () => {
    const [page, setPage] = useState(1);
    const { logout } = useAuth() as AuthContextType;

    const { data: paginatedData, isLoading } = useQuery<PaginatedResponse<any>>({
        queryKey: ["manager-tasks", page],
        queryFn: async () => {
            const response = await fetch(`${API_BASE}/scheduling/tasks/?page=${page}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                },
            });
            if (!response.ok) {
                if (response.status === 401) logout();
                throw new Error("Failed to fetch tasks");
            }
            return response.json();
        },
    });

    const tasks = Array.isArray(paginatedData) ? paginatedData : (paginatedData?.results || []);

    const stats = {
        total: tasks?.length || 0,
        completed: tasks?.filter(t => t.status === "COMPLETED").length || 0,
        inProgress: tasks?.filter(t => t.status === "IN_PROGRESS").length || 0,
        overdue: tasks?.filter(t => t.status === "TODO" && new Date(t.due_date) < new Date()).length || 0,
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
            in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
            overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
            pending: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
        };
        return <Badge className={styles[status as keyof typeof styles]}>{status.replace("_", " ")}</Badge>;
    };

    return (
        <div className="space-y-6">
            {/* Task Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <CardContent className="pt-6 text-center">
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Total Tasks</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <CardContent className="pt-6 text-center">
                        <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Completed</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <CardContent className="pt-6 text-center">
                        <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">In Progress</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <CardContent className="pt-6 text-center">
                        <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Overdue</p>
                    </CardContent>
                </Card>
            </div>

            {/* Actions */}
            <div className="flex justify-end">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Create Task
                </Button>
            </div>

            {/* Task List */}
            <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <CardHeader>
                    <CardTitle className="text-slate-900 dark:text-white">Today's Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-100 dark:border-slate-800">
                                <TableHead className="text-slate-500 dark:text-slate-400">Task</TableHead>
                                <TableHead className="text-slate-500 dark:text-slate-400">Assigned To</TableHead>
                                <TableHead className="text-slate-500 dark:text-slate-400">Due Time</TableHead>
                                <TableHead className="text-slate-500 dark:text-slate-400">Priority</TableHead>
                                <TableHead className="text-slate-500 dark:text-slate-400">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500" />
                                    </TableCell>
                                </TableRow>
                            ) : tasks && tasks.length > 0 ? (
                                tasks.map((task) => (
                                    <TableRow key={task.id} className="border-slate-100 dark:border-slate-800">
                                        <TableCell className="font-medium text-slate-900 dark:text-white">{task.title}</TableCell>
                                        <TableCell className="text-slate-600 dark:text-slate-300">
                                            {task.assigned_to_names?.join(", ") || "Unassigned"}
                                        </TableCell>
                                        <TableCell className="text-slate-600 dark:text-slate-300">
                                            {task.due_time || format(new Date(task.due_date), "HH:mm")}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={task.priority === "HIGH" || task.priority === "URGENT" ? "border-red-200 text-red-600" : ""}>
                                                {task.priority || "MEDIUM"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(task.status)}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                        No tasks found
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    <PaginationControls
                        currentPage={page}
                        count={paginatedData?.count || 0}
                        pageSize={20}
                        onPageChange={setPage}
                        isLoading={isLoading}
                    />
                </CardContent>
            </Card>
        </div>
    );
};

// Insights Tab Component
const InsightsTab: React.FC = () => {
    return (
        <div className="space-y-6">
            <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <CardHeader>
                    <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                        Staff Intelligence
                    </CardTitle>
                    <CardDescription className="text-slate-500 dark:text-slate-400">
                        Insights are being generated based on team performance.
                    </CardDescription>
                </CardHeader>
                <CardContent className="py-12 text-center">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Activity className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Gathering Data</h3>
                    <p className="text-sm text-slate-500 max-w-sm mx-auto mt-2">
                        Collect more attendance and task data to see AI-powered staff insights and performance trends.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};

// Main Staff App Component
export default function StaffApp() {
    const [activeTab, setActiveTab] = useState("presence");

    return (
        <div className="min-h-screen p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <header className="mb-6">
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Staff</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Add and manage your team
                    </p>
                </header>

                {/* Tabbed Interface */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl mb-6">
                        <TabsTrigger value="presence" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white rounded-lg px-4">
                            <UserCheck className="w-4 h-4 mr-2" />
                            Presence
                        </TabsTrigger>
                        <TabsTrigger value="team" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white rounded-lg px-4">
                            <Users className="w-4 h-4 mr-2" />
                            Team
                        </TabsTrigger>
                        <TabsTrigger value="attendance" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white rounded-lg px-4">
                            <Clock className="w-4 h-4 mr-2" />
                            Attendance
                        </TabsTrigger>
                        <TabsTrigger value="insights" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white rounded-lg px-4">
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Insights
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="presence"><PresenceTab /></TabsContent>
                    <TabsContent value="team"><TeamTab /></TabsContent>
                    <TabsContent value="attendance"><AttendanceTab /></TabsContent>
                    <TabsContent value="insights"><InsightsTab /></TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
