import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
import { TableSkeleton, CardGridSkeleton, DashboardSkeleton, ListSkeleton, BlockSkeleton } from "@/components/skeletons";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Users,
    UserCheck,
    Clock,
    ClipboardCheck,
    TrendingUp,
    Inbox,
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
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    ChevronDown,
    LayoutGrid,
    List,
    Award,
    Zap,
    BarChart3,
    Trophy,
    Star,
    Flame,
    ShieldAlert,
    Sparkles,
    PieChart,
    Copy,
    Check,
    Share2,
} from "lucide-react";
import { API_BASE, BACKEND_URL, BackendService, api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { AuthContextType } from "@/contexts/AuthContext.types";
import { useLanguage } from "@/hooks/use-language";
import { format, parseISO } from "date-fns";
import StaffRequestsTab from "@/components/staff/StaffRequestsTab";
import DeleteStaffConfirmation from "@/components/staff/DeleteStaffConfirmation";
import DeactivateStaffConfirmation from "@/components/staff/DeactivateStaffConfirmation";

// Types
interface StaffMember {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    is_active: boolean;
    phone?: string;
    profile?: {
        join_date?: string;
        hourly_rate?: number;
        salary_type?: 'HOURLY' | 'MONTHLY';
        promotion_history?: { role: string; date: string; note?: string }[];
        department?: string;
    };
    stats?: {
        hours_weekly: number;
        hours_monthly: number;
        hours_yearly: number;
    };
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

/** Detect WhatsApp-activated staff (auto-generated email) and optionally get phone from it */
const WA_ACTIVATION_EMAIL = /^wa_(\d+)@mizan\.activation$/i;
function isWhatsAppActivationEmail(email: string | null | undefined): boolean {
    return !!email && WA_ACTIVATION_EMAIL.test(email);
}
function phoneFromWhatsAppEmail(email: string | null | undefined): string {
    if (!email) return "";
    const m = email.match(WA_ACTIVATION_EMAIL);
    return m ? m[1] : "";
}

/** ONE-TAP activation pending (StaffActivationRecord) */
interface PendingActivation {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    role: string;
    status: string;
    batch_id: string;
    created_at: string | null;
}

interface AttendanceRecord {
    id: string;
    staff_id: string;
    staff_name: string;
    clock_in: string;
    clock_out: string | null;
    status: "clocked_in" | "on_break" | "clocked_out";
    late: boolean;
}

interface AttendanceSummary {
    staff_id: string;
    staff_name: string;
    clock_in: string | null;
    clock_out: string | null;
    status: "clocked_in" | "on_break" | "clocked_out" | "not_started";
    late: boolean;
}

// Pagination Response Interface
interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

// Small helpers to keep TS strict + UI resilient
const getErrorMessage = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback;

type AttendanceEvent = {
    staff: string;
    event_type: string;
    timestamp: string;
    latitude?: number | null;
    longitude?: number | null;
};

type AssignedShiftLite = {
    shift_date: string;
    staff: string | null;
    /** When multiple staff are assigned to one shift (e.g. "Iftar Prep") */
    staff_members?: string[];
};

type WeeklyScheduleLite = {
    week_start: string;
    assigned_shifts?: AssignedShiftLite[];
};

type StaffDocument = {
    id: string;
    title: string;
    file: string;
    uploaded_at: string;
};

type AttendanceDashboardSummary = {
    present: { count: number; percentage: number; total: number };
    late: { count: number; avg_minutes: number };
    absent: { count: number; reason: string };
    on_leave: { count: number; subtitle: string };
};

type AttendanceListItem = {
    staff: { id: string; name: string; role?: string | null };
    shift: { start?: string | null; end?: string | null };
    clock_in?: string | null;
    clock_out?: string | null;
    status: string;
    late_minutes?: number;
    signals?: string[];
};

type AttendanceActivityEvent = {
    id: string;
    time: string;
    staff_name: string;
    event: string;
};

type AttendanceDashboardData = {
    summary?: AttendanceDashboardSummary;
    attendance_list?: AttendanceListItem[];
    recent_activity?: AttendanceActivityEvent[];
};

type ManagerTask = {
    id: string;
    title: string;
    status: string;
    due_date: string;
    due_time?: string | null;
    priority?: string | null;
    assigned_to_names?: string[];
};

type BulkInviteRow = {
    first_name: string;
    last_name: string;
    role: string;
    email?: string;
    phone_number?: string;
};

type MiyaRecommendation = {
    title: string;
    body: string;
    action_label?: string;
};

type StaffInsightsData = {
    summary: { tasks_completed: number; tasks_trend: number; team_reliability: number; active_workers: number };
    star_performers: { name: string; role?: string; tasks: number; score: number }[];
    attendance_health: { on_time_arrival: number; no_show_rate: number };
    signals: { color: "emerald" | "amber"; text: string }[];
    alerts: { level: "Critical" | "Warning" | string; type?: string; title: string; description?: string }[];
    miya_recommendation?: MiyaRecommendation | null;
};

// Reusable Pagination Controls Component
const PaginationControls: React.FC<{
    currentPage: number;
    count: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
    pageSizeOptions?: number[];
    isLoading?: boolean;
}> = ({ currentPage, count, pageSize, onPageChange, onPageSizeChange, pageSizeOptions = [8, 10, 20, 50, 100], isLoading }) => {
    const { t } = useLanguage();
    const totalPages = Math.ceil(count / pageSize);
    const showPaginationNumbers = totalPages > 1;

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 4) {
                for (let i = 1; i <= 5; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 3) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                pages.push(currentPage - 1);
                pages.push(currentPage);
                pages.push(currentPage + 1);
                pages.push('...');
                pages.push(totalPages);
            }
        }
        return pages;
    };

    const pages = getPageNumbers();


    return (
        <div className="flex items-center justify-center py-10 mt-6">
            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-5 py-2.5 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300">
                {showPaginationNumbers && (
                    <>
                        <button
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage === 1 || isLoading}
                            aria-label={t("common.previous_page")}
                            title={t("common.previous_page")}
                            className="p-1 px-2 text-slate-400 hover:text-indigo-600 disabled:opacity-30 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-1.5 px-2">
                            {pages.map((p, idx) => (
                                <React.Fragment key={idx}>
                                    {p === '...' ? (
                                        <span className="px-1 text-slate-400 font-medium">...</span>
                                    ) : (
                                        <button
                                            onClick={() => onPageChange(p as number)}
                                            disabled={isLoading}
                                            className={cn(
                                                "w-8 h-8 rounded-full text-sm font-semibold transition-all flex items-center justify-center",
                                                currentPage === p
                                                    ? "bg-indigo-50 text-indigo-600 border border-indigo-200 shadow-sm"
                                                    : "text-slate-500 hover:text-indigo-600 hover:bg-white/50 dark:hover:bg-slate-700/50"
                                            )}
                                        >
                                            {p}
                                        </button>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>

                        <button
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage === totalPages || isLoading}
                            aria-label={t("common.next_page")}
                            title={t("common.next_page")}
                            className="p-1 px-2 text-slate-400 hover:text-indigo-600 disabled:opacity-30 transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </>
                )}

                {onPageSizeChange && (
                    <div className={cn("flex items-center", showPaginationNumbers ? "ml-2 pl-4 border-l border-slate-100 dark:border-slate-800" : "")}>
                        <div className="relative group">
                            <select
                                value={pageSize}
                                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                                disabled={isLoading}
                                className="appearance-none bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-4 pr-9 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer transition-all min-w-[100px]"
                            >
                                {pageSizeOptions.map(size => (
                                    <option key={size} value={size}>{size} / page</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none transition-transform group-hover:translate-y-[-40%]" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Today's shift for manager override (start_time/end_time can be ISO datetime strings)
type TodayShiftOption = { id: string; shift_date: string; start_time: string | null; end_time: string | null; role?: string };

function formatShiftTime(isoOrTime: string | null): string {
    if (!isoOrTime) return "—";
    if (/^\d{2}:\d{2}/.test(isoOrTime)) return isoOrTime.slice(0, 5);
    try {
        return format(parseISO(isoOrTime), "HH:mm");
    } catch {
        return isoOrTime;
    }
}

// Presence Tab Component
const PresenceTab: React.FC = () => {
    const { logout } = useAuth() as AuthContextType;
    const { t } = useLanguage();
    const queryClient = useQueryClient();
    const [presenceModalOpen, setPresenceModalOpen] = useState(false);
    const [selectedPresenceRecord, setSelectedPresenceRecord] = useState<AttendanceSummary | null>(null);
    const [overrideReason, setOverrideReason] = useState("");
    const [overrideShiftId, setOverrideShiftId] = useState<string>("");

    // Date helpers
    const toYMD = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    const getWeekStart = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    };

    const todayStr = toYMD(new Date());
    const weekStartStr = toYMD(getWeekStart(new Date()));

    // Fetch today's attendance events
    const { data: attendanceResponse, isLoading: isAttendanceLoading } = useQuery<PaginatedResponse<AttendanceEvent>>({
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

    // Fetch weekly schedule to filter for scheduled staff
    const { data: scheduleResponse, isLoading: isScheduleLoading } = useQuery<WeeklyScheduleLite | undefined>({
        queryKey: ["weekly-schedule", weekStartStr],
        queryFn: async () => {
            const token = localStorage.getItem("access_token");
            const response = await fetch(`${API_BASE}/scheduling/weekly-schedules/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error("Failed to fetch schedules");
            const listJson = await response.json();
            const raw = (listJson?.results ?? listJson) as unknown;
            const listData: unknown[] = Array.isArray(raw) ? raw : [];
            const isWeeklySchedule = (v: unknown): v is WeeklyScheduleLite => {
                if (!v || typeof v !== "object") return false;
                return "week_start" in v && typeof (v as { week_start?: unknown }).week_start === "string";
            };
            const match = listData.find(
                (s): s is WeeklyScheduleLite => isWeeklySchedule(s) && s.week_start === weekStartStr
            );
            return match;
        },
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

    const attendanceData = React.useMemo<AttendanceEvent[]>(
        () => (Array.isArray(attendanceResponse) ? attendanceResponse : (attendanceResponse?.results || [])),
        [attendanceResponse]
    );
    const staffDataRaw = React.useMemo<StaffMember[]>(
        () => (Array.isArray(staffResponse) ? staffResponse : (staffResponse?.results || [])),
        [staffResponse]
    );
    const scheduleData = React.useMemo<AssignedShiftLite[]>(
        () => (scheduleResponse?.assigned_shifts || []),
        [scheduleResponse]
    );

    // Filter staff: Include if (Scheduled Today) OR (Has Attendance Record Today)
    const staffData = React.useMemo(() => {
        if (!staffDataRaw.length) return [];

        // simple caching of staff IDs who have attendance
        const staffWithAttendance = new Set(attendanceData.map((a) => a.staff));

        // simple caching of staff IDs who have a shift today (include both single staff and staff_members)
        const staffWithShift = new Set<string>();
        scheduleData
            .filter((s) => s.shift_date === todayStr)
            .forEach((s) => {
                if (s.staff) staffWithShift.add(s.staff);
                (s.staff_members || []).forEach((id) => staffWithShift.add(id));
            });

        return staffDataRaw.filter((staff) =>
            staffWithShift.has(staff.id) || staffWithAttendance.has(staff.id)
        );
    }, [staffDataRaw, attendanceData, scheduleData, todayStr]);

    const isLoading = isAttendanceLoading || isStaffLoading || isScheduleLoading;

    // Transform events into per-staff status
    const staffStatusMap = React.useMemo(() => {
        const map: Record<string, AttendanceSummary> = {};

        // Initialize map with filtered staff list
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
                map[staffId].status = "clocked_in";
                map[staffId].clock_in = time;
            } else if (event.event_type === "out" || event.event_type === "CLOCK_OUT") {
                map[staffId].status = "clocked_out";
                map[staffId].clock_out = time;
            } else if (event.event_type === "break_start" || event.event_type === "BREAK_START") {
                map[staffId].status = "on_break";
            } else if (event.event_type === "break_end" || event.event_type === "BREAK_END") {
                map[staffId].status = "clocked_in";
            }
        });

        return Object.values(map);
    }, [attendanceData, staffData]);

    const clockedIn = staffStatusMap.filter(s => s.status === "clocked_in");
    const onBreak = staffStatusMap.filter(s => s.status === "on_break");
    const clockedOut = staffStatusMap.filter(s => s.status === "clocked_out");
    const notStarted = staffStatusMap.filter(s => s.status === "not_started");

    // Today's shifts for selected staff (when modal is open)
    const todayStrForShifts = toYMD(new Date());
    const { data: todayShiftsResponse } = useQuery<{ results?: TodayShiftOption[] }>({
        queryKey: ["today-shifts", selectedPresenceRecord?.staff_id, todayStrForShifts],
        queryFn: async () => {
            if (!selectedPresenceRecord?.staff_id) return { results: [] };
            const res = await fetch(
                `${API_BASE}/scheduling/assigned-shifts-v2/?staff_id=${selectedPresenceRecord.staff_id}&date_from=${todayStrForShifts}&date_to=${todayStrForShifts}`,
                { headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` } }
            );
            if (!res.ok) throw new Error("Failed to fetch shifts");
            return res.json();
        },
        enabled: presenceModalOpen && !!selectedPresenceRecord?.staff_id,
    });
    const todayShifts = (todayShiftsResponse?.results ?? []) as TodayShiftOption[];

    const managerClockInMutation = useMutation({
        mutationFn: ({ staffId, reason, shiftId }: { staffId: string; reason: string; shiftId?: string }) =>
            api.managerClockIn(staffId, { reason, shift_id: shiftId || undefined }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["today-attendance"] });
            setPresenceModalOpen(false);
            setSelectedPresenceRecord(null);
            setOverrideReason("");
            setOverrideShiftId("");
            toast.success(t("staff.clocked_in_success"));
        },
        onError: (err: Error) => {
            toast.error(err.message || "Failed to clock in staff.");
        },
    });

    const handleOpenPresenceDetail = (record: AttendanceSummary) => {
        setSelectedPresenceRecord(record);
        setOverrideReason("");
        setOverrideShiftId("");
        setPresenceModalOpen(true);
    };

    useEffect(() => {
        if (todayShifts.length === 1 && presenceModalOpen) setOverrideShiftId(todayShifts[0].id);
    }, [todayShifts.length, todayShifts, presenceModalOpen]);

    const handleManagerClockInSubmit = () => {
        if (!selectedPresenceRecord?.staff_id) return;
        const reason = overrideReason.trim();
        if (!reason) {
            toast.error(t("staff.provide_reason_clock_in"));
            return;
        }
        managerClockInMutation.mutate({
            staffId: selectedPresenceRecord.staff_id,
            reason,
            shiftId: overrideShiftId || undefined,
        });
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const styles = {
            clocked_in: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
            on_break: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
            clocked_out: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
            not_started: "bg-slate-50 text-slate-400 dark:bg-slate-800/50 dark:text-slate-500 border-dashed",
        };
        const labels = {
            clocked_in: t("staff.presence.status.clocked_in"),
            on_break: t("staff.presence.status.on_break"),
            clocked_out: t("staff.presence.status.clocked_out"),
            not_started: t("staff.presence.status.not_started"),
        };
        return (
            <Badge variant="outline" className={styles[status as keyof typeof styles] || styles.clocked_out}>
                {labels[status as keyof typeof labels] || status}
            </Badge>
        );
    };

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{clockedIn.length}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{t("staff.presence.cards.clocked_in")}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <Coffee className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{onBreak.length}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{t("staff.presence.cards.on_break")}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <LogOut className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{clockedOut.length}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{t("staff.presence.cards.clocked_out")}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-9 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center">
                                <Users className="w-5 h-5 text-slate-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{notStarted.length}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{t("staff.presence.cards.not_started")}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Live Staff List */}
            <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <CardHeader>
                    <CardTitle className="text-slate-900 dark:text-white">{t("staff.presence.title")}</CardTitle>
                    <CardDescription className="text-slate-500 dark:text-slate-400">{t("staff.presence.subtitle")}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-100 dark:border-slate-800">
                                <TableHead className="text-slate-500 dark:text-slate-400">{t("staff.presence.table.name")}</TableHead>
                                <TableHead className="text-slate-500 dark:text-slate-400">{t("staff.presence.table.clock_in")}</TableHead>
                                <TableHead className="text-slate-500 dark:text-slate-400">{t("staff.presence.table.status")}</TableHead>
                                <TableHead className="text-slate-500 dark:text-slate-400">{t("staff.presence.table.late")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <>
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-14" /></TableCell>
                                        </TableRow>
                                    ))}
                                </>
                            ) : staffStatusMap.length > 0 ? (
                                staffStatusMap.map((record) => (
                                    <TableRow
                                        key={record.staff_id}
                                        className="border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                        onClick={() => handleOpenPresenceDetail(record)}
                                    >
                                        <TableCell className="font-medium text-slate-900 dark:text-white">{record.staff_name}</TableCell>
                                        <TableCell className="text-slate-600 dark:text-slate-300">{record.clock_in || "-"}</TableCell>
                                        <TableCell><StatusBadge status={record.status} /></TableCell>
                                        <TableCell>
                                            {record.late ? (
                                                <Badge variant="destructive" className="text-xs">{t("staff.presence.badges.late")}</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-xs text-slate-500">{t("staff.presence.badges.on_time")}</Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                                        {t("staff.presence.none")}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Staff detail & manager clock-in modal */}
            <Dialog open={presenceModalOpen} onOpenChange={setPresenceModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-slate-900 dark:text-white">
                            {selectedPresenceRecord?.staff_name ?? "Staff"}
                        </DialogTitle>
                    </DialogHeader>
                    {selectedPresenceRecord && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-slate-500 dark:text-slate-400">{t("staff.presence.table.clock_in")}</span>
                                    <p className="font-medium text-slate-900 dark:text-white">{selectedPresenceRecord.clock_in ?? "—"}</p>
                                </div>
                                <div>
                                    <span className="text-slate-500 dark:text-slate-400">{t("staff.presence.table.status")}</span>
                                    <p className="mt-0.5"><StatusBadge status={selectedPresenceRecord.status} /></p>
                                </div>
                            </div>
                            {todayShifts.length > 0 && (
                                <div className="text-sm">
                                    <Label className="text-slate-500 dark:text-slate-400">{t("staff.todays_shifts")}</Label>
                                    <ul className="mt-1 space-y-1">
                                        {todayShifts.map((s) => (
                                            <li key={s.id} className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                                                <span>
                                                    {formatShiftTime(s.start_time)} – {formatShiftTime(s.end_time)}
                                                    {s.role && ` (${s.role})`}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {selectedPresenceRecord.status !== "clocked_in" && (
                                <div className="space-y-3 border-t border-slate-200 dark:border-slate-700 pt-4">
                                    <Label className="text-slate-900 dark:text-white">{t("staff.manager_override_clock_in")}</Label>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Use when the staff cannot clock in (e.g. device or location issue). Reason is required.
                                    </p>
                                    <Textarea
                                        placeholder={t("staff.manager_override_reason_placeholder")}
                                        value={overrideReason}
                                        onChange={(e) => setOverrideReason(e.target.value)}
                                        rows={3}
                                        className="resize-none"
                                    />
                                    {todayShifts.length > 1 && (
                                        <div>
                                            <Label className="text-slate-500 dark:text-slate-400 text-xs">{t("staff.assign_shift_optional")}</Label>
                                            <select
                                                className="mt-1 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                                                value={overrideShiftId}
                                                onChange={(e) => setOverrideShiftId(e.target.value)}
                                            >
                                                <option value="">— Select shift —</option>
                                                {todayShifts.map((s) => (
                                                    <option key={s.id} value={s.id}>
                                                        {formatShiftTime(s.start_time)} – {formatShiftTime(s.end_time)}
                                                        {s.role ? ` ${s.role}` : ""}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    <Button
                                        onClick={handleManagerClockInSubmit}
                                        disabled={!overrideReason.trim() || managerClockInMutation.isPending}
                                        className="w-full"
                                    >
                                        {managerClockInMutation.isPending ? (
                                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Clocking in...</>
                                        ) : (
                                            t("staff.clock_in_for_staff_btn")
                                        )}
                                    </Button>
                                </div>
                            )}
                            {selectedPresenceRecord.status === "clocked_in" && (
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    This staff member is already clocked in. No override needed.
                                </p>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

// Team Tab Component
const TeamTab: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [searchQuery, setSearchQuery] = useState("");
    const [staffPage, setStaffPage] = useState(1);
    const [staffPageSize, setStaffPageSize] = useState(8);
    const [invitesPage, setInvitesPage] = useState(1);
    const [selectedMember, setSelectedMember] = useState<StaffMember | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [documents, setDocuments] = useState<StaffDocument[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
    const [staffToDelete, setStaffToDelete] = useState<{ id: string; name: string } | null>(null);
    const [staffToDeactivate, setStaffToDeactivate] = useState<{ id: string; name: string } | null>(null);
    const { user, logout } = useAuth() as AuthContextType;
    const queryClient = useQueryClient();

    const fetchDocuments = async (staffId: string) => {
        try {
            const token = localStorage.getItem("access_token") || "";
            const response = await api.getStaffDocuments(token, staffId);
            // Handle both direct array and paginated response { results: [] }
            const docs = Array.isArray(response)
                ? (response as StaffDocument[])
                : (response && typeof response === "object" && "results" in response
                    ? ((response as { results: StaffDocument[] }).results || [])
                    : []);
            setDocuments(docs);
        } catch (err: unknown) {
            console.error("Failed to fetch documents", err);
            toast.error(getErrorMessage(err, "Failed to load documents"));
        }
    };

    // Reset pagination when search query changes
    React.useEffect(() => {
        setStaffPage(1);
    }, [searchQuery]);

    const selectedMemberId = selectedMember?.id;
    React.useEffect(() => {
        if ((isViewModalOpen || isEditModalOpen) && selectedMemberId) {
            fetchDocuments(selectedMemberId);
        }
    }, [isViewModalOpen, isEditModalOpen, selectedMemberId]);

    const { data: staffData, isLoading, error, refetch: refetchStaff } = useQuery<PaginatedResponse<StaffMember>>({
        queryKey: ["staff-members", staffPage, staffPageSize, searchQuery],
        queryFn: async () => {
            const response = await fetch(`${API_BASE}/users/?is_active=true&page=${staffPage}&page_size=${staffPageSize}&search=${encodeURIComponent(searchQuery)}`, {
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

    const { data: activationPendingData, isLoading: isActivationPendingLoading, refetch: refetchActivationPending } = useQuery<{ pending: PendingActivation[]; count: number }>({
        queryKey: ["pending-activations"],
        queryFn: async () => {
            const response = await fetch(`${API_BASE}/staff/activation/pending/`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                },
            });
            if (!response.ok) throw new Error("Failed to fetch pending activations");
            return response.json();
        },
    });

    const staff = Array.isArray(staffData) ? staffData : (staffData?.results || []);
    const invitations = Array.isArray(invitesData) ? invitesData : (invitesData?.results || []);
    const pendingActivations: PendingActivation[] = activationPendingData?.pending ?? [];

    const handleResendInvite = async (inviteId: string) => {
        try {
            const response = await fetch(`${API_BASE}/invitations/${inviteId}/resend/`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                },
            });
            if (!response.ok) throw new Error("Failed to resend invitation");
            toast.success(t("toasts.invitation_resent"));
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, "Failed to resend invitation"));
        }
    };

    const handleCancelInvite = async (inviteId: string) => {
        if (!confirm(t("errors.confirm_cancel_invitation"))) return;
        try {
            const response = await fetch(`${API_BASE}/invitations/${inviteId}/`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                },
            });
            if (!response.ok) throw new Error("Failed to cancel invitation");
            toast.success(t("toasts.invitation_cancelled"));
            refetchInvites();
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, "Failed to cancel invitation"));
        }
    };

    const handleCopyActivationLink = async () => {
        try {
            const response = await fetch(`${API_BASE}/staff/activation/invite-link/`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
            });
            if (!response.ok) throw new Error("Failed to get link");
            const data = await response.json().catch(() => ({}));
            const link = data.invite_short_link || data.invite_link;
            if (link) {
                await navigator.clipboard.writeText(link);
                toast.success(t("toasts.invite_copied"));
                setLastInviteLink(link);
            } else {
                toast.error(t("errors.no_invite_link"));
            }
        } catch {
            toast.error(t("errors.failed_to_copy"));
        }
    };

    const handleDeletePendingActivation = async (activationId: string) => {
        if (!confirm(t("staff.pending.delete_confirm"))) return;
        try {
            const response = await fetch(`${API_BASE}/staff/activation/pending/${activationId}/`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
            });
            if (!response.ok) throw new Error("Failed to remove pending invitation");
            toast.success(t("staff.pending.deleted"));
            refetchInvites();
            refetchActivationPending();
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, "Failed to remove pending invitation"));
        }
    };

    const refetch = () => {
        refetchStaff();
        refetchInvites();
    };


    const handleViewProfile = (member: StaffMember) => {
        setSelectedMember(member);
        setIsViewModalOpen(true);
    };

    const handleEditProfile = (member: StaffMember) => {
        setSelectedMember(member);
        setIsEditModalOpen(true);
    };

    // View Profile Modal
    const ViewProfileModal = () => {
        const [isGeneratingReport, setIsGeneratingReport] = useState(false);

        // Use selectedMember directly as it contains the most up-to-date information (including manual updates after save)
        // logic that preferred "staff" list was causing stale data to be shown until refetch completed
        if (!selectedMember) return null;

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
                toast.success(t("toasts.report_generated"));
            } catch (err: unknown) {
                toast.error(getErrorMessage(err, "Failed to generate report"));
            } finally {
                setIsGeneratingReport(false);
            }
        };

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <Card className="w-full max-w-2xl mx-4 bg-white dark:bg-slate-900 border-none shadow-2xl rounded-[2rem] overflow-hidden max-h-[85vh] flex flex-col">
                    <div className="relative">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-6 top-6 rounded-full bg-slate-100/50 hover:bg-slate-100 transition-colors z-10"
                            onClick={() => setIsViewModalOpen(false)}
                        >
                            <X className="w-4 h-4 text-slate-500" />
                        </Button>
                    </div>
                    <CardHeader className="pt-10 pb-2 px-10">
                        <CardTitle className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Staff Profile</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-8 px-10 pb-12 overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 rounded-[1.5rem] bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center border border-emerald-100/50">
                                    <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">
                                        {selectedMember.first_name?.[0]}{selectedMember.last_name?.[0]}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight tracking-tight">
                                        {selectedMember.first_name} {selectedMember.last_name}
                                    </h3>
                                    <Badge variant="outline" className="capitalize mt-2 border-emerald-100 bg-emerald-50/50 text-emerald-600 dark:bg-emerald-900/10 dark:text-emerald-400 font-bold text-[11px] px-3 py-0.5 rounded-lg border-none">
                                        {selectedMember.role?.toLowerCase().replace(/_/g, " ")}
                                    </Badge>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-emerald-100 text-emerald-600 hover:bg-emerald-50 rounded-xl font-bold h-11 px-6 shadow-sm ring-offset-background transition-all hover:shadow-md"
                                onClick={handleGenerateReport}
                                disabled={isGeneratingReport}
                            >
                                {isGeneratingReport ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                                PDF Report
                            </Button>
                        </div>

                        {/* Performance Analytics */}
                        <div className="grid grid-cols-3 gap-3 py-4">
                            <div className="bg-slate-50/50 dark:bg-slate-800/40 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 flex flex-col items-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Weekly</p>
                                <p className="text-xl font-black text-slate-900 dark:text-white">{selectedMember.stats?.hours_weekly || 0}h</p>
                            </div>
                            <div className="bg-emerald-50/30 dark:bg-emerald-900/10 p-5 rounded-[1.5rem] border border-emerald-100/50 dark:border-emerald-900/30 flex flex-col items-center shadow-sm">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Monthly</p>
                                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{selectedMember.stats?.hours_monthly || 0}h</p>
                            </div>
                            <div className="bg-slate-50/50 dark:bg-slate-800/40 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 flex flex-col items-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Yearly</p>
                                <p className="text-xl font-black text-slate-900 dark:text-white">{selectedMember.stats?.hours_yearly || 0}h</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-12 py-8 border-t border-slate-100/60 dark:border-slate-800/60">
                            <div className="space-y-6">
                                <h4 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Contact Info</h4>
                                <div className="space-y-4">
                                    {isWhatsAppActivationEmail(selectedMember.email) ? (
                                        <div className="flex items-center gap-3 group">
                                            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                                                <Phone className="w-4 h-4 text-slate-400" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">WhatsApp / Phone</p>
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                    {selectedMember.phone || phoneFromWhatsAppEmail(selectedMember.email) || t("common.not_provided")}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-3 group">
                                                <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                                                    <Mail className="w-4 h-4 text-slate-400" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address</p>
                                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                        {selectedMember.email || t("common.not_provided")}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 group">
                                                <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                                                    <Phone className="w-4 h-4 text-slate-400" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone Number</p>
                                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{selectedMember.phone || t("common.not_provided")}</p>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h4 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Employment Details</h4>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 group">
                                        <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                                            <Briefcase className="w-4 h-4 text-slate-400" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Department</p>
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{selectedMember.profile?.department || t("common.unassigned")}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 group">
                                        <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                                            <Clock className="w-4 h-4 text-slate-400" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Join Date</p>
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{selectedMember.profile?.join_date ? format(new Date(selectedMember.profile.join_date), 'PPP') : "N/A"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 group">
                                        <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                                            <TrendingUp className="w-4 h-4 text-slate-400" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Salary / Wage</p>
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                ${selectedMember.profile?.hourly_rate || 0}
                                                <span className="text-xs text-slate-400 font-normal ml-1">
                                                    {selectedMember.profile?.salary_type === 'MONTHLY' ? '/mo' : '/hr'}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Promotion History */}
                        <div className="space-y-6 pt-4 border-t border-slate-100/60 dark:border-slate-800/60">
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Promotion History</h4>
                            <div className="space-y-3">
                                {selectedMember.profile?.promotion_history && selectedMember.profile.promotion_history.length > 0 ? (
                                    selectedMember.profile.promotion_history.map((p, i) => (
                                        <div key={i} className="flex items-start gap-3 bg-slate-50/50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <div className="bg-white dark:bg-slate-900 p-2 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800">
                                                <Briefcase className="w-4 h-4 text-emerald-500" />
                                            </div>
                                            <div>
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="text-sm font-black text-slate-700 dark:text-slate-200">{p.role}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.date}</p>
                                                </div>
                                                {p.note && <p className="text-xs text-slate-500 mt-1 italic">"{p.note}"</p>}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-6 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl text-center">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No promotion history</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-100/60">
                            <h4 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Documents</h4>
                        </div>
                        <div className="space-y-3 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                            {documents.length > 0 ? (
                                documents.map((doc, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100/50 dark:border-slate-800 transition-all hover:bg-slate-100/50 hover:shadow-sm">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
                                                <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                            </div>
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate">{doc.title}</span>
                                        </div>
                                        <a
                                            href={getDocumentUrl(doc.file)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label={`Download document: ${doc.title}`}
                                            title={`Download ${doc.title}`}
                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-white dark:hover:bg-slate-800 transition-all"
                                        >
                                            <Download className="w-4 h-4" />
                                        </a>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-slate-100 dark:border-slate-800/60 rounded-[1.5rem] bg-slate-50/30">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">No documents uploaded</p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 pt-1">
                            <Button
                                variant="outline"
                                className="flex-1 h-14 border-slate-200 dark:border-slate-700 rounded-xl font-black text-slate-700 dark:text-slate-200 text-base active:scale-[0.98] transition-all"
                                onClick={() => setIsViewModalOpen(false)}
                            >
                                <X className="w-5 h-5 mr-3" /> Cancel
                            </Button>
                            <Button
                                className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black tracking-tight text-base shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all"
                                onClick={() => { setIsViewModalOpen(false); handleEditProfile(selectedMember); }}
                            >
                                <Edit className="w-5 h-5 mr-3" /> Edit Profile
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    // Edit Profile Modal
    const EditProfileModal = () => {
        type EditFormData = {
            first_name: string;
            last_name: string;
            email: string;
            phone: string;
            role: string;
            hourly_rate: number | string;
            salary_type: "HOURLY" | "MONTHLY";
            department: string;
            join_date: string;
        };

        const [formData, setFormData] = useState<EditFormData>(() => ({
            first_name: "",
            last_name: "",
            email: "",
            phone: "",
            role: "STAFF",
            hourly_rate: 0,
            salary_type: "HOURLY",
            department: "",
            join_date: format(new Date(), "yyyy-MM-dd"),
        }));

        const [promotions, setPromotions] = useState<{ role: string; date: string; note?: string }[]>([]);
        const [showPasswordReset, setShowPasswordReset] = useState(false);
        const [newPassword, setNewPassword] = useState("");
        const [isResetting, setIsResetting] = useState(false);

        // Promotion Sub-form state
        const [isPromoting, setIsPromoting] = useState(false);
        const [promoRole, setPromoRole] = useState("");
        const [promoNote, setPromoNote] = useState("");

        React.useEffect(() => {
            if (!isEditModalOpen || !selectedMember) return;
            const normalizeEmail = (email: string | null | undefined) => {
                const value = email || "";
                if (/^\d+@mizan\.ai$/i.test(value)) {
                    return "";
                }
                return value;
            };
            setFormData({
                first_name: selectedMember.first_name,
                last_name: selectedMember.last_name,
                email: normalizeEmail(selectedMember.email),
                phone: selectedMember.phone || "",
                role: selectedMember.role,
                hourly_rate: selectedMember.profile?.hourly_rate || 0,
                salary_type: selectedMember.profile?.salary_type || "HOURLY",
                department: selectedMember.profile?.department || "",
                join_date: selectedMember.profile?.join_date || format(new Date(), "yyyy-MM-dd"),
            });
            setPromotions(selectedMember.profile?.promotion_history || []);
            setShowPasswordReset(false);
            setNewPassword("");
            setIsResetting(false);
            setIsPromoting(false);
            setPromoRole(selectedMember.role);
            setPromoNote("");
        }, [isEditModalOpen, selectedMember?.id]);

        if (!selectedMember) return null;

        const handleSave = async () => {
            try {
                const token = localStorage.getItem("access_token") || "";

                // Separate CustomUser fields from profile fields for a cleaner payload
                const { hourly_rate, salary_type, join_date, department, ...userFields } = formData;

                const updatedProfileData = {
                    ...userFields,
                    profile: {
                        join_date: join_date || null, // Convert empty string to null for backend DateField
                        hourly_rate: typeof hourly_rate === 'string' ? parseFloat(hourly_rate) : hourly_rate,
                        salary_type,
                        promotion_history: promotions,
                        department: department || null,
                        emergency_contact_name: "",
                        emergency_contact_phone: ""
                    }
                };

                await api.updateStaffProfile(token, selectedMember.id, updatedProfileData);

                const updatedMember = {
                    ...selectedMember,
                    ...userFields,
                    profile: {
                        ...selectedMember.profile,
                        ...updatedProfileData.profile
                    }
                };

                // Update query cache to ensure list view is fresh immediately
                queryClient.setQueryData(["staff-members", staffPage], (old: PaginatedResponse<StaffMember> | undefined) => {
                    if (!old) return old;
                    return {
                        ...old,
                        results: old.results.map(member =>
                            member.id === selectedMember.id ? updatedMember : member
                        )
                    };
                });

                // Manually update selectedMember to reflect changes immediately in the UI
                setSelectedMember(updatedMember);

                toast.success(t("toasts.profile_updated"));
                setIsEditModalOpen(false);
                refetchStaff();
            } catch (err: unknown) {
                toast.error(getErrorMessage(err, "Failed to update profile"));
            }
        };

        const handleResetPassword = async () => {
            if (!newPassword) {
                toast.error(t("errors.please_enter_password"));
                return;
            }
            setIsResetting(true);
            try {
                const token = localStorage.getItem("access_token") || "";
                await api.resetStaffPassword(token, selectedMember.id, newPassword);
                toast.success(t("toasts.password_reset"));
                setShowPasswordReset(false);
                setNewPassword("");
            } catch (err: unknown) {
                toast.error(getErrorMessage(err, "Failed to reset password"));
            } finally {
                setIsResetting(false);
            }
        };

        const handlePromote = () => {
            if (!promoRole) {
                toast.error(t("errors.select_role_promotion"));
                return;
            }
            const newPromotion = {
                role: promoRole,
                date: format(new Date(), "yyyy-MM-dd"),
                note: promoNote
            };
            const newDept = roleToDepartment[promoRole] || formData.department;
            setPromotions([newPromotion, ...promotions]);
            setFormData({ ...formData, role: promoRole, department: newDept });
            setIsPromoting(false);
            setPromoNote("");
            toast.success(`Staff promoted to ${promoRole}`);
        };

        return (
            <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                <Card className="w-full max-w-2xl bg-white dark:bg-slate-900 border-none shadow-2xl rounded-[1.75rem] overflow-hidden">
                    <CardHeader className="pt-5 pb-1 px-5 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Edit Staff Profile</CardTitle>
                            <CardDescription className="text-slate-500 font-medium text-[11px]">Manage detailed staff information</CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100" onClick={() => setIsEditModalOpen(false)}>
                            <X className="w-5 h-5 text-slate-400" />
                        </Button>
                    </CardHeader>

                    <CardContent className="px-5 pb-5 max-h-[85vh] overflow-y-auto custom-scrollbar">
                        <div className="space-y-3 py-2">
                            {/* Personal Information */}
                            <div className="space-y-3">
                                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Personal Information</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1">First Name</label>
                                        <Input
                                            value={formData.first_name}
                                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                            className="h-9 rounded-lg bg-slate-50 border-slate-100 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1">Last Name</label>
                                        <Input
                                            value={formData.last_name}
                                            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                            className="h-9 rounded-lg bg-slate-50 border-slate-100 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1">Email Address</label>
                                        <Input
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="h-9 rounded-lg bg-slate-50 border-slate-100 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1">Phone Number</label>
                                        <Input
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="h-9 rounded-lg bg-slate-50 border-slate-100 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1">Join Date</label>
                                        <Input
                                            type="date"
                                            value={formData.join_date}
                                            onChange={(e) => setFormData({ ...formData, join_date: e.target.value })}
                                            className="h-9 rounded-lg bg-slate-50 border-slate-100 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Role & Compensation */}
                            <div className="space-y-4 pt-4 border-t border-slate-100/60">
                                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Role & Compensation</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1">Current Role</label>
                                        <select
                                            value={formData.role}
                                            onChange={(e) => {
                                                const newRole = e.target.value;
                                                // Automatically set department if mapping exists
                                                const newDept = roleToDepartment[newRole] || formData.department;
                                                setFormData({ ...formData, role: newRole, department: newDept });
                                            }}
                                            className="w-full h-9 rounded-lg bg-slate-50 border-slate-100 focus:ring-emerald-500 focus:border-emerald-500 font-medium px-3 text-sm"
                                        >
                                            <option value="SUPER_ADMIN">Super Admin</option>
                                            <option value="ADMIN">Admin</option>
                                            <option value="OWNER">Owner</option>
                                            <option value="MANAGER">Manager</option>
                                            <option value="CHEF">Chef</option>
                                            <option value="WAITER">Waiter</option>
                                            <option value="KITCHEN_HELP">Kitchen Help</option>
                                            <option value="BARTENDER">Bartender</option>
                                            <option value="RECEPTIONIST">Receptionist</option>
                                            <option value="CLEANER">Cleaner</option>
                                            <option value="SECURITY">Security</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1">Department</label>
                                        <select
                                            value={formData.department}
                                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                            className="w-full h-9 rounded-lg bg-slate-50 border-slate-100 focus:ring-emerald-500 focus:border-emerald-500 font-medium px-3 text-sm"
                                        >
                                            <option value="">Unassigned</option>
                                            <option value="Management">{t("staff.departments.management")}</option>
                                            <option value="Kitchen">{t("staff.departments.kitchen")}</option>
                                            <option value="Front of House">{t("staff.departments.front_of_house")}</option>
                                            <option value="Operations">{t("staff.departments.operations")}</option>
                                            <option value="Service">{t("staff.departments.service")}</option>
                                            <option value="Bar">{t("staff.departments.bar")}</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1">Salary / Wage</label>
                                        <div className="flex gap-2">
                                            <Input
                                                type="number"
                                                value={formData.hourly_rate}
                                                onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) })}
                                                className="h-9 rounded-lg bg-slate-50 border-slate-100 focus:ring-emerald-500 focus:border-emerald-500 font-black text-emerald-600"
                                            />
                                            <select
                                                value={formData.salary_type}
                                                onChange={(e) => setFormData({ ...formData, salary_type: e.target.value as 'HOURLY' | 'MONTHLY' })}
                                                className="h-9 rounded-lg bg-slate-100/50 border-none font-black text-[9px] px-2 text-slate-500 uppercase tracking-widest"
                                            >
                                                <option value="HOURLY">/HR</option>
                                                <option value="MONTHLY">/MO</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Promotion History */}
                            <div className="space-y-4 pt-4 border-t border-slate-100/60">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Promotion History</h4>
                                    {!isPromoting && (
                                        <Button variant="ghost" size="sm" className="text-emerald-600 font-black text-[9px] uppercase tracking-widest" onClick={() => setIsPromoting(true)}>
                                            <TrendingUp className="w-3 h-3 mr-1" /> Promote Staff
                                        </Button>
                                    )}
                                </div>

                                {isPromoting && (
                                    <div className="p-6 bg-emerald-50/50 rounded-3xl border border-emerald-100 space-y-4 animate-in fade-in slide-in-from-top-2">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-700 ml-1">New Role</label>
                                                <select
                                                    value={promoRole}
                                                    onChange={(e) => setPromoRole(e.target.value)}
                                                    className="w-full h-9 rounded-lg bg-white border-emerald-100 focus:ring-emerald-500 focus:border-emerald-500 font-medium px-3 text-sm"
                                                >
                                                    <option value="SUPER_ADMIN">Super Admin</option>
                                                    <option value="ADMIN">Admin</option>
                                                    <option value="OWNER">Owner</option>
                                                    <option value="MANAGER">Manager</option>
                                                    <option value="CHEF">Chef</option>
                                                    <option value="WAITER">Waiter</option>
                                                    <option value="KITCHEN_HELP">Kitchen Help</option>
                                                    <option value="BARTENDER">Bartender</option>
                                                    <option value="CLEANER">Cleaner</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-700 ml-1">Effective Date</label>
                                                <Input disabled value={format(new Date(), "PPP")} className="h-9 rounded-lg bg-white border-emerald-50 text-slate-400 font-medium" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-700 ml-1">Promotion Notes</label>
                                            <textarea
                                                value={promoNote}
                                                onChange={(e) => setPromoNote(e.target.value)}
                                                placeholder={t("staff.promotion_reason_placeholder")}
                                                className="w-full p-4 rounded-xl bg-white border-emerald-100 focus:ring-emerald-500 focus:border-emerald-500 font-medium text-sm min-h-[100px]"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" className="flex-1 rounded-xl font-bold" onClick={() => setIsPromoting(false)}>Cancel</Button>
                                            <Button className="flex-2 h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg px-8" onClick={handlePromote}>Confirm Promotion</Button>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {promotions.length > 0 ? promotions.map((p, i) => (
                                        <div key={i} className="flex items-start gap-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
                                            <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-100">
                                                <Briefcase className="w-4 h-4 text-emerald-500" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-black text-slate-700">{p.role}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{p.date}</p>
                                                </div>
                                                {p.note && <p className="text-xs text-slate-500 mt-1 italic">"{p.note}"</p>}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-slate-300 hover:text-red-500 h-6 w-6"
                                                onClick={() => setPromotions(promotions.filter((_, idx) => idx !== i))}
                                            >
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    )) : (
                                        <div className="py-6 border-2 border-dashed border-slate-50 rounded-2xl text-center">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">No promotion records found</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Documents Section */}
                            <div className="space-y-4 pt-4 border-t border-slate-100/60">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Documents</h4>
                                    <label className="cursor-pointer group">
                                        <Input
                                            type="file"
                                            className="hidden"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                setIsUploading(true);
                                                try {
                                                    const token = localStorage.getItem("access_token") || "";
                                                    await api.uploadStaffDocument(token, selectedMember.id, file, file.name);
                                                    toast.success(t("toasts.document_uploaded"));
                                                    fetchDocuments(selectedMember.id);
                                                } catch (err: unknown) {
                                                    toast.error(getErrorMessage(err, "Failed to upload document"));
                                                } finally {
                                                    setIsUploading(false);
                                                }
                                            }}
                                            disabled={isUploading}
                                        />
                                        <div className="flex items-center gap-1.5 text-xs font-black text-emerald-600 hover:text-emerald-700 transition-colors uppercase tracking-widest">
                                            {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-4 h-4" />}
                                            Upload Document
                                        </div>
                                    </label>
                                </div>
                                <div className="space-y-3">
                                    {documents.length > 0 ? (
                                        documents.map((doc, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 transition-all hover:bg-slate-100/50">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                                                        <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-700 truncate">{doc.title}</span>
                                                        <span className="text-[9px] font-medium text-slate-400">{format(new Date(doc.uploaded_at), "PPP")}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <a
                                                        href={getDocumentUrl(doc.file)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        aria-label={`Download document: ${doc.title}`}
                                                        title={`Download ${doc.title}`}
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-white transition-all"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </a>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="w-8 h-8 text-slate-400 hover:text-red-500 hover:bg-white transition-all"
                                                        onClick={async () => {
                                                            if (!confirm(t("errors.confirm_delete_document"))) return;
                                                            try {
                                                                const token = localStorage.getItem("access_token") || "";
                                                                await api.deleteStaffDocument(token, doc.id);
                                                                toast.success(t("toasts.document_deleted"));
                                                                fetchDocuments(selectedMember.id);
                                                            } catch (err: unknown) {
                                                                toast.error(getErrorMessage(err, "Failed to delete document"));
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/30">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">No documents uploaded</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Password Security */}
                            <div className="space-y-3 pt-4 border-t border-slate-100/60">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Security</h4>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={cn(
                                            "rounded-xl font-bold transition-all h-9 px-4 uppercase tracking-widest text-[9px]",
                                            showPasswordReset ? "border-red-100 text-red-500 bg-red-50" : "border-slate-100 text-slate-600"
                                        )}
                                        onClick={() => setShowPasswordReset(!showPasswordReset)}
                                    >
                                        {showPasswordReset ? t("common.cancel_reset") : t("common.reset_password")}
                                    </Button>
                                </div>
                                {showPasswordReset && (
                                    <div className="p-6 bg-slate-50/80 rounded-3xl border border-slate-100 space-y-3 animate-in fade-in slide-in-from-top-2">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Key className="w-4 h-4 text-emerald-600" />
                                                <label className="text-xs font-black text-slate-700 uppercase tracking-widest">New Password</label>
                                            </div>
                                            <div className="flex gap-3">
                                                <Input
                                                    type="password"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    placeholder={t("common.enter_password")}
                                                    className="h-9 rounded-lg bg-white border-slate-200 focus:ring-emerald-500"
                                                />
                                                <Button
                                                    className="h-9 bg-slate-900 text-white font-bold rounded-lg px-8 hover:bg-slate-800 transition-all shadow-lg"
                                                    onClick={handleResetPassword}
                                                    disabled={isResetting}
                                                >
                                                    {isResetting ? <Loader2 className="w-4 h-4 animate-spin" /> : t("common.update")}
                                                </Button>
                                            </div>
                                            <p className="text-[9px] text-slate-400 font-medium ml-1">Staff can use this to login via PIN or password.</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Danger zone: Deactivate / Remove — only for Owner or Super Admin, not for self */}
                            {(user?.role === "OWNER" || user?.role === "SUPER_ADMIN") && selectedMember && selectedMember.id !== user?.id && (
                                <div className="space-y-3 pt-4 border-t border-slate-100/60">
                                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{t("staff.danger_zone")}</h4>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" className="text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => { setStaffToDeactivate({ id: selectedMember.id, name: `${selectedMember.first_name} ${selectedMember.last_name}` }); setIsDeactivateModalOpen(true); }}>
                                            Deactivate staff
                                        </Button>
                                        <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => { setStaffToDelete({ id: selectedMember.id, name: `${selectedMember.first_name} ${selectedMember.last_name}` }); setIsDeleteModalOpen(true); }}>
                                            Remove staff
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>

                    <div className="p-5 bg-slate-50/50 border-t border-slate-100 flex gap-3">
                        <Button variant="outline" className="flex-1 h-9 rounded-xl font-black text-xs border-slate-200" onClick={() => setIsEditModalOpen(false)}>
                            Cancel Changes
                        </Button>
                        <Button className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs shadow-lg shadow-emerald-200" onClick={handleSave}>
                            Save Information
                        </Button>
                    </div>
                </Card>
            </div>
        );
    };

    // Invite Staff Modal
    const InviteStaffModal = () => {
        const [inviteMethod, setInviteMethod] = useState<"email" | "whatsapp">("email");
        const [isBulkMode, setIsBulkMode] = useState(false);
        const [bulkData, setBulkData] = useState<BulkInviteRow[]>([]);
        const [isInviteLoading, setIsInviteLoading] = useState(false);
        const [formData, setFormData] = useState({
            email: "",
            first_name: "",
            last_name: "",
            role: "MANAGER",
            phone_number: "",
        });

        const splitDelimitedRow = (row: string, delimiter: string) => {
            const out: string[] = [];
            let cur = "";
            let inQuotes = false;
            for (let i = 0; i < row.length; i++) {
                const ch = row[i];
                if (ch === '"') {
                    // handle escaped quotes ""
                    const next = row[i + 1];
                    if (inQuotes && next === '"') {
                        cur += '"';
                        i++;
                        continue;
                    }
                    inQuotes = !inQuotes;
                    continue;
                }
                if (ch === delimiter && !inQuotes) {
                    out.push(cur.trim());
                    cur = "";
                    continue;
                }
                cur += ch;
            }
            out.push(cur.trim());
            return out;
        };

        const detectDelimiter = (headerLine: string) => {
            const commaCount = (headerLine.match(/,/g) || []).length;
            const semiCount = (headerLine.match(/;/g) || []).length;
            const tabCount = (headerLine.match(/\t/g) || []).length;
            if (tabCount > commaCount && tabCount > semiCount) return "\t";
            if (semiCount > commaCount) return ";";
            return ",";
        };

        const parseStaffCsvText = (text: string, method: "email" | "whatsapp") => {
            const rawLines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
            const lines = rawLines.map(l => l.trim()).filter(Boolean);

            // Excel directive line support: "sep=,"
            const dataLines = (lines[0] || "").toLowerCase().startsWith("sep=") ? lines.slice(1) : lines;
            if (dataLines.length < 2) return [];

            const delimiter = detectDelimiter(dataLines[0]);
            const parsed = dataLines.slice(1).map((line) => {
                const values = splitDelimitedRow(line, delimiter).map(v => v.trim());
                if (values.length < 4) return null;
                const base: BulkInviteRow = {
                    first_name: values[0] || "",
                    last_name: values[1] || "",
                    role: values[2] || "",
                };
                if (method === "email") {
                    base.email = values[3] || "";
                } else {
                    base.phone_number = values[3] || "";
                }
                return base;
            }).filter(Boolean);

            return parsed as BulkInviteRow[];
        };

        const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                const parsed = parseStaffCsvText(text, inviteMethod);

                if (parsed.length === 0) {
                    toast.error(t("staff.csv_no_valid_data"));
                    return;
                }
                setBulkData(parsed);
                toast.success(`Parsed ${parsed.length} staff members from CSV`);
            };
            reader.readAsText(file);
        };

        const downloadTemplate = () => {
            // "sep=," ensures Excel splits into columns even on locales that default to ';'
            const lastCol = inviteMethod === "email" ? "Email Address" : "WhatsApp Number";
            const sample1 = inviteMethod === "email" ? "john@example.com" : "212600000000";
            const sample2 = inviteMethod === "email" ? "jane@example.com" : "212700000000";
            const content =
                "sep=,\n" +
                `First Name,Last Name,Role,${lastCol}\n` +
                `John,Doe,CHEF,${sample1}\n` +
                `Jane,Smith,WAITER,${sample2}\n`;
            const blob = new Blob([content], { type: "text/csv" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "staff_invite_template.csv";
            a.click();
            window.URL.revokeObjectURL(url);
        };

        const handleCloseInviteModal = () => {
            setIsInviteModalOpen(false);
        };

        const handleInvite = async () => {
            if (isBulkMode) {
                if (bulkData.length === 0) {
                    toast.error(t("staff.upload_csv_first"));
                    return;
                }

                setIsInviteLoading(true);
                try {
                    const token = localStorage.getItem("access_token") || "";

                    if (inviteMethod === "whatsapp") {
                        // ONE-TAP: upload creates profiles (Not activated). Manager shares the link; staff click → message Miya → backend activates account, Miya replies via WhatsApp.
                        const staffList = bulkData.map((r) => ({
                            phone: r.phone_number || "",
                            first_name: r.first_name || "",
                            last_name: r.last_name || "",
                            role: r.role || "WAITER",
                        }));
                        const response = await fetch(`${API_BASE}/staff/activation/upload/`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ staff_list: staffList }),
                        });
                        const data = await response.json().catch(() => ({}));
                        if (!response.ok)
                            throw new Error(data.error || data.detail || data.errors?.[0] || "Failed to create staff records");
                        if (data.created > 0 && (data.invite_short_link || data.invite_link)) {
                            setLastInviteLink(data.invite_short_link || data.invite_link);
                            handleCloseInviteModal();
                            toast.success(`${data.created} staff members ready. Copy and share the link—when they click it and message Miya, their account will be activated and Miya will reply via WhatsApp.`);
                            refetch();
                            refetchActivationPending();
                        } else {
                            toast.error(data.errors?.[0] || "No records created");
                        }
                        setIsInviteLoading(false);
                        return;
                    }

                    // Email bulk: use existing invite endpoint
                    const response = await fetch(`${API_BASE}/staff/invite-bulk-csv/`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            staff_list: bulkData,
                            invitation_method: inviteMethod,
                        }),
                    });
                    const data = await response.json().catch(() => ({}));
                    if (!response.ok) throw new Error(data.error || data.detail || "Failed to send bulk invitations");
                    toast.success(`Emails sent for ${data.created ?? bulkData.length} staff members`);
                    handleCloseInviteModal();
                    refetch();
                } catch (err: unknown) {
                    toast.error(getErrorMessage(err, "Failed to send bulk invitations"));
                } finally {
                    setIsInviteLoading(false);
                }
                return;
            }

            if (inviteMethod === "email" && !formData.email) {
                toast.error(t("staff.email_required_invite"));
                return;
            }
            if (inviteMethod === "whatsapp" && !formData.phone_number) {
                toast.error(t("staff.phone_required_whatsapp_invite"));
                return;
            }

            setIsInviteLoading(true);
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
                        send_whatsapp: inviteMethod === "whatsapp"
                    }),
                });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || errorData.detail || "Failed to send invitation");
                }
                const data = await response.json().catch(() => ({}));
                const link = data.invite_short_link || data.invite_link || null;
                if (link) setLastInviteLink(link);
                toast.success(data.message || `Invitation sent successfully via ${inviteMethod === "email" ? "Email" : "WhatsApp"}`);
                handleCloseInviteModal();
                refetch();
                refetchInvites();
                if (inviteMethod === "whatsapp") refetchActivationPending();
            } catch (err: unknown) {
                toast.error(getErrorMessage(err, "Failed to send invitation"));
            } finally {
                setIsInviteLoading(false);
            }
        };

        return (
            <Dialog
                open={isInviteModalOpen}
                onOpenChange={(open) => setIsInviteModalOpen(open)}
            >
                <DialogContent className="sm:max-w-3xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="text-slate-900 dark:text-white">
                            {t("staff.invite.title")}
                        </DialogTitle>
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
                                    {t("staff.invite.individual")}
                                </button>
                                <button
                                    onClick={() => {
                                        setIsBulkMode(true);
                                        // Keep current method, but bulk supports both email and WhatsApp.
                                        // If the user changes method, they should download the matching template.
                                    }}
                                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${isBulkMode
                                        ? "bg-white dark:bg-slate-700 text-emerald-600 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                                        }`}
                                >
                                    {t("staff.invite.bulk")}
                                </button>
                            </div>
                        </div>

                        {/* Invitation Method Selector */}
                        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                            <button
                                onClick={() => {
                                    setInviteMethod("email");
                                    if (isBulkMode) {
                                        setBulkData([]);
                                        toast.message("Switched to Email bulk invite. Please upload an Email CSV.");
                                    }
                                }}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${inviteMethod === "email"
                                    ? "bg-white dark:bg-slate-700 text-emerald-600 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                                    }`}
                            >
                                <Mail className="w-4 h-4" />
                                {t("staff.invite.email")}
                            </button>
                            <button
                                onClick={() => {
                                    setInviteMethod("whatsapp");
                                    if (isBulkMode) {
                                        setBulkData([]);
                                        toast.message("Switched to WhatsApp bulk invite. Please upload a WhatsApp CSV.");
                                    }
                                }}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${inviteMethod === "whatsapp"
                                    ? "bg-white dark:bg-slate-700 text-emerald-600 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                                    }`}
                            >
                                <Phone className="w-4 h-4" />
                                {t("staff.invite.whatsapp")}
                            </button>
                        </div>

                        {!isBulkMode ? (
                            <>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("staff.invite.first_name")}</label>
                                        <Input value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} placeholder="Hamza" className="bg-white dark:bg-slate-800" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("staff.invite.last_name")}</label>
                                        <Input value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} placeholder="Yassine" className="bg-white dark:bg-slate-800" />
                                    </div>
                                </div>

                                {inviteMethod === "email" ? (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("staff.invite.email_address")} <span className="text-red-500">*</span></label>
                                        <Input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="john.doe@example.com" className="bg-white dark:bg-slate-800" />
                                        <p className="text-xs text-slate-500">{t("staff.invite.email_hint")}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("staff.invite.whatsapp_number")} <span className="text-red-500">*</span></label>
                                        <Input value={formData.phone_number} onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })} placeholder="212774567890" className="bg-white dark:bg-slate-800" />
                                        <p className="text-xs text-slate-500">{t("staff.invite.whatsapp_hint")}</p>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("staff.invite.role")}</label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    >
                                        <optgroup label={t("staff.invite.management")}>
                                            <option value="OWNER">{t("staff.roles.owner")}</option>
                                            <option value="SUPER_ADMIN">{t("staff.roles.super_admin")}</option>
                                            <option value="ADMIN">{t("staff.roles.admin")}</option>
                                            <option value="MANAGER">{t("staff.roles.manager")}</option>
                                        </optgroup>
                                        <optgroup label={t("staff.invite.kitchen")}>
                                            <option value="CHEF">{t("staff.roles.chef")}</option>
                                            <option value="SOUS_CHEF">{t("staff.roles.sous_chef")}</option>
                                            <option value="PASTRY_CHEF">{t("staff.roles.pastry_chef")}</option>
                                            <option value="KITCHEN_STAFF">{t("staff.roles.kitchen_staff")}</option>
                                            <option value="DISHWASHER">{t("staff.roles.dishwasher")}</option>
                                        </optgroup>
                                        <optgroup label={t("staff.invite.front_of_house")}>
                                            <option value="WAITER">{t("staff.roles.waiter")}</option>
                                            <option value="WAITRESS">{t("staff.roles.waitress")}</option>
                                            <option value="HOST">{t("staff.roles.host")}</option>
                                            <option value="HOSTESS">{t("staff.roles.hostess")}</option>
                                            <option value="BARTENDER">{t("staff.roles.bartender")}</option>
                                            <option value="SOMMELIER">{t("staff.roles.sommelier")}</option>
                                            <option value="RUNNER">{t("staff.roles.runner")}</option>
                                            <option value="BUSSER">{t("staff.roles.busser")}</option>
                                            <option value="CASHIER">{t("staff.roles.cashier")}</option>
                                        </optgroup>
                                        <optgroup label={t("staff.invite.other")}>
                                            <option value="BARISTA">{t("staff.roles.barista")}</option>
                                            <option value="CLEANER">{t("staff.roles.cleaner")}</option>
                                            <option value="SECURITY">{t("staff.roles.security")}</option>
                                        </optgroup>
                                    </select>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-4">
                                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center bg-slate-50/50 dark:bg-slate-800/50">
                                    <Upload className="w-10 h-9 text-slate-400 mx-auto mb-4" />
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{t("staff.invite.upload_csv")}</h3>
                                    <p className="text-xs text-slate-500 mb-4">
                                        {t("staff.invite.csv_columns", { method: inviteMethod === "email" ? t("staff.invite.email_address") : t("staff.invite.whatsapp_number") })}
                                    </p>
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
                                        {t("staff.invite.select_csv")}
                                    </label>
                                    {bulkData.length > 0 && (
                                        <p className="mt-3 text-sm font-medium text-emerald-600">
                                            {t("staff.invite.staff_ready", { count: bulkData.length })}
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={downloadTemplate}
                                    className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-all"
                                >
                                    <Download className="w-4 h-4" />
                                    {t("staff.invite.download_template")}
                                </button>

                                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                                    <p className="text-[11px] text-amber-800 dark:text-amber-400">
                                        <strong>Tip:</strong>{" "}
                                        {inviteMethod === "email"
                                            ? "Use valid email addresses. Roles should match the role codes (MANAGER, CHEF, WAITER, etc.)."
                                            : <>Use WhatsApp numbers in international format (digits only), e.g. <code>2126XXXXXXXX</code> for Morocco. After upload, copy and share the invite link with staff—when they click it and send the message to Miya, their account is activated and Miya replies via WhatsApp.</>
                                        }
                                    </p>
                                </div>
                            </div>
                        )}
                        <Button
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-4"
                            onClick={handleInvite}
                            disabled={isInviteLoading}
                        >
                            {isInviteLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    {t("staff.invite.sending")}
                                </>
                            ) : (
                                t("staff.invite.send")
                            )}
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
            <DeleteStaffConfirmation
                isOpen={isDeleteModalOpen}
                onClose={() => { setIsDeleteModalOpen(false); setStaffToDelete(null); }}
                staffId={staffToDelete?.id ?? null}
                staffName={staffToDelete?.name ?? null}
                onSuccess={() => { refetchStaff(); setIsEditModalOpen(false); setSelectedMember(null); }}
            />
            <DeactivateStaffConfirmation
                isOpen={isDeactivateModalOpen}
                onClose={() => { setIsDeactivateModalOpen(false); setStaffToDeactivate(null); }}
                staffId={staffToDeactivate?.id ?? null}
                staffName={staffToDeactivate?.name ?? null}
                onSuccess={() => { refetchStaff(); setIsEditModalOpen(false); setSelectedMember(null); }}
            />

            {/* Invite link ready (after sending invite – modal is closed) */}
            {lastInviteLink && (
                <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 shrink-0">{t("staff.invite_link_ready")}</p>
                    <div className="flex flex-1 min-w-0 items-center gap-2">
                        <Input
                            readOnly
                            value={lastInviteLink}
                            className="font-mono text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 flex-1 min-w-0"
                        />
                        <Button
                            size="sm"
                            className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={async () => {
                                try {
                                    await navigator.clipboard.writeText(lastInviteLink);
                                    toast.success(t("toasts.link_copied"));
                                } catch {
                                    toast.error(t("errors.no_invite_link"));
                                }
                            }}
                        >
                            <Copy className="w-4 h-4 mr-1.5" />
                            {t("common.copy")}
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="shrink-0"
                            onClick={async () => {
                                try {
                                    if (navigator.share) {
                                        await navigator.share({ url: lastInviteLink, title: t("staff.invite_link_ready") });
                                        toast.success(t("toasts.invite_shared"));
                                    } else {
                                        await navigator.clipboard.writeText(lastInviteLink);
                                        toast.success(t("toasts.copied_share_unsupported"));
                                    }
                                } catch (e: unknown) {
                                    if ((e as Error)?.name !== "AbortError") toast.error(t("errors.failed_to_share"));
                                }
                            }}
                        >
                            <Share2 className="w-4 h-4 mr-1.5" />
                            {t("common.share")}
                        </Button>
                        <Button size="sm" variant="ghost" className="shrink-0" onClick={() => setLastInviteLink(null)}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Search & Actions */}
            <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder={t("staff.search")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    />
                </div>
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={cn(
                            "p-1.5 rounded-md transition-all",
                            viewMode === 'grid'
                                ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm"
                                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        )}
                        title={t("common.grid_view")}
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={cn(
                            "p-1.5 rounded-md transition-all",
                            viewMode === 'list'
                                ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm"
                                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        )}
                        title={t("common.list_view")}
                    >
                        <List className="w-4 h-4" />
                    </button>
                </div>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setIsInviteModalOpen(true)}>
                    <PlusCircle className="w-4 h-4 mr-2" />
                    {t("staff.add")}
                </Button>
            </div>

            {/* Staff Directory */}
            <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <CardContent className="pt-6">
                    {isLoading ? (
                        viewMode === 'list' ? (
                            <TableSkeleton rowCount={6} colCount={5} />
                        ) : (
                            <CardGridSkeleton count={8} columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" />
                        )
                    ) : error ? (
                        <div className="text-center py-8 text-red-500">{t("staff.error_loading_staff")}</div>
                    ) : (
                        <>
                            {staff && staff.length > 0 ? (
                                viewMode === 'list' ? (
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-slate-100 dark:border-slate-800">
                                                <TableHead className="text-slate-500 dark:text-slate-400">{t("staff.table_name")}</TableHead>
                                                <TableHead className="text-slate-500 dark:text-slate-400">{t("staff.table_contact")}</TableHead>
                                                <TableHead className="text-slate-500 dark:text-slate-400">{t("staff.table_role")}</TableHead>
                                                <TableHead className="text-slate-500 dark:text-slate-400">{t("staff.table_status")}</TableHead>
                                                <TableHead className="text-slate-500 dark:text-slate-400">{t("staff.table_actions")}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {staff.map((member) => (
                                                <TableRow key={member.id} className="border-slate-100 dark:border-slate-800">
                                                    <TableCell className="font-medium text-slate-900 dark:text-white">
                                                        {member.first_name} {member.last_name}
                                                    </TableCell>
                                                    <TableCell className="text-slate-600 dark:text-slate-300">
                                                        {isWhatsAppActivationEmail(member.email)
                                                            ? (member.phone || phoneFromWhatsAppEmail(member.email) || "—")
                                                            : (member.email || "—")}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="capitalize">
                                                            {member.role?.toLowerCase().replace(/_/g, " ")}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={member.is_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700"}>
                                                            {member.is_active ? t("common.active") : t("common.inactive")}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditProfile(member)} title={t("common.edit_profile")}>
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewProfile(member)} title={t("common.view_profile")}>
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {staff.map((member) => (
                                            <Card key={member.id} className="group relative border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-lg transition-all duration-300 overflow-hidden rounded-2xl">
                                                <div className="h-24 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity z-10" />
                                                    <Avatar className="h-14 w-14 border-2 border-white dark:border-slate-700 shadow-lg transition-transform duration-500 group-hover:scale-105">
                                                        <AvatarFallback className="text-lg bg-indigo-50 text-indigo-600 font-bold">
                                                            {member.first_name[0]}{member.last_name[0]}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="absolute inset-0 z-20 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/20 backdrop-blur-[2px]">
                                                        <Button
                                                            size="sm"
                                                            className="h-8 bg-white hover:bg-white text-indigo-600 rounded-lg shadow-sm"
                                                            onClick={() => handleViewProfile(member)}
                                                        >
                                                            <Eye className="w-3.5 h-3.5 mr-1" />
                                                            View
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            className="h-8 bg-white hover:bg-white text-emerald-600 rounded-lg shadow-sm"
                                                            onClick={() => handleEditProfile(member)}
                                                        >
                                                            <Edit className="w-3.5 h-3.5 mr-1" />
                                                            Edit
                                                        </Button>
                                                    </div>
                                                </div>
                                                <CardContent className="p-3 text-center">
                                                    <h3 className="font-bold text-slate-900 dark:text-white truncate">
                                                        {member.first_name} {member.last_name}
                                                    </h3>
                                                    <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:indigo-400 mt-1 mb-2">
                                                        {member.role?.toLowerCase().replace(/_/g, " ")}
                                                    </p>
                                                    <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-3">
                                                        {(() => {
                                                            const email = member.email || "";
                                                            const phone = member.phone || phoneFromWhatsAppEmail(email);
                                                            const isWhatsApp = isWhatsAppActivationEmail(email) || /^\d+@mizan\.ai$/i.test(email);
                                                            if (isWhatsApp && phone) {
                                                                return (
                                                                    <>
                                                                        <MessageCircle className="w-3 h-3" />
                                                                        <span className="truncate">{phone}</span>
                                                                    </>
                                                                );
                                                            }
                                                            if (email && !isWhatsAppActivationEmail(email)) {
                                                                return (
                                                                    <>
                                                                        <Mail className="w-3 h-3" />
                                                                        <span className="truncate">{email}</span>
                                                                    </>
                                                                );
                                                            }
                                                            if (phone) {
                                                                return (
                                                                    <>
                                                                        <Phone className="w-3 h-3" />
                                                                        <span className="truncate">{phone}</span>
                                                                    </>
                                                                );
                                                            }
                                                            return (
                                                                <>
                                                                    <Mail className="w-3 h-3" />
                                                                    <span className="truncate">{t("common.not_provided")}</span>
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                    <Badge className={cn(
                                                        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest",
                                                        member.is_active
                                                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                            : "bg-red-50 text-red-600 border-red-100"
                                                    )}>
                                                        {member.is_active ? t("common.active") : t("common.inactive")}
                                                    </Badge>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )
                            ) : (
                                <div className="text-center py-20 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{t("staff.no_staff_found")}</h3>
                                    <p className="text-sm text-slate-500">{t("staff.try_adjust_search")}</p>
                                </div>
                            )}

                            <PaginationControls
                                currentPage={staffPage}
                                count={staffData?.count || 0}
                                pageSize={staffPageSize}
                                onPageChange={setStaffPage}
                                onPageSizeChange={(size) => {
                                    setStaffPageSize(size);
                                    setStaffPage(1);
                                }}
                                pageSizeOptions={[8, 10, 20, 50, 100]}
                                isLoading={isLoading}
                            />
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Pending Invitations */}
            <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <CardHeader>
                    <CardTitle className="text-slate-900 dark:text-white">{t("staff.pending.title")}</CardTitle>
                    <CardDescription className="text-slate-500 dark:text-slate-400">{t("staff.pending.subtitle")}</CardDescription>
                </CardHeader>
                <CardContent>
                    {isInvitesLoading && !activationPendingData ? (
                        <TableSkeleton rowCount={4} colCount={5} />
                    ) : (invitations && invitations.length > 0) || (pendingActivations && pendingActivations.length > 0) ? (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-slate-100 dark:border-slate-800">
                                        <TableHead className="text-slate-500 dark:text-slate-400">{t("staff.pending.name")}</TableHead>
                                        <TableHead className="text-slate-500 dark:text-slate-400">{t("staff.invite.email_address")} / {t("staff.invite.whatsapp_number")}</TableHead>
                                        <TableHead className="text-slate-500 dark:text-slate-400">{t("staff.invite.role")}</TableHead>
                                        <TableHead className="text-slate-500 dark:text-slate-400">{t("staff.pending.type")}</TableHead>
                                        <TableHead className="text-slate-500 dark:text-slate-400">{t("common.actions")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendingActivations.map((pa) => (
                                        <TableRow key={`act-${pa.id}`} className="border-slate-100 dark:border-slate-800">
                                            <TableCell className="font-medium text-slate-900 dark:text-white">
                                                {pa.first_name || "—"} {pa.last_name || ""}
                                            </TableCell>
                                            <TableCell className="text-slate-600 dark:text-slate-300">
                                                <div className="flex items-center gap-2">
                                                    <Phone className="w-3 h-3" />
                                                    {pa.phone}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="capitalize">
                                                    {pa.role?.toLowerCase().replace(/_/g, " ")}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                    WhatsApp
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button variant="outline" size="sm" className="text-emerald-600 hover:text-emerald-700 border-emerald-200" onClick={handleCopyActivationLink}>
                                                        <Copy className="w-3.5 h-3.5 mr-1.5" />
                                                        {t("staff.pending.copy_link")}
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700" onClick={() => handleDeletePendingActivation(pa.id)} title={t("staff.pending.delete")}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {invitations.map((invite) => (
                                        <TableRow key={invite.id} className="border-slate-100 dark:border-slate-800">
                                            <TableCell className="font-medium text-slate-900 dark:text-white">
                                                {invite.first_name || t("staff.new")} {invite.last_name || t("staff.member")}
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
                                                <Badge variant="outline">{invite.email ? "Email" : "WhatsApp"}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-700" onClick={() => handleResendInvite(invite.id)} title={t("common.resend_invitation")}>
                                                        <Send className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700" onClick={() => handleCancelInvite(invite.id)} title={t("common.cancel_invitation")}>
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
                                count={typeof invitesData?.count === "number" ? invitesData.count : (Array.isArray(invitesData) ? invitesData.length : invitations.length)}
                                pageSize={20}
                                onPageChange={setInvitesPage}
                                isLoading={isInvitesLoading}
                            />
                        </>
                    ) : (
                        <div className="text-center py-8 text-slate-500">{t("staff.pending.none")}</div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

// Attendance Tab Component
// Attendance Tab Component
const AttendanceTab: React.FC = () => {
    const { logout } = useAuth() as AuthContextType;
    const { t } = useLanguage();
    const [liveSearch, setLiveSearch] = useState("");
    const [livePage, setLivePage] = useState(1);
    const [livePageSize, setLivePageSize] = useState(25);
    const { data: dashboardData, isLoading, refetch } = useQuery<AttendanceDashboardData>({
        queryKey: ["attendance-dashboard"],
        queryFn: async () => {
            const response = await fetch(`${API_BASE}/dashboard/analytics/attendance_dashboard/`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                },
            });
            if (!response.ok) {
                if (response.status === 401) logout();
                throw new Error("Failed to fetch attendance dashboard");
            }
            return response.json();
        },
        refetchInterval: 30000,
    });

    const summary: AttendanceDashboardSummary = dashboardData?.summary || {
        present: { count: 0, percentage: 0, total: 0 }, // added total to avoid NaN
        late: { count: 0, avg_minutes: 0 },
        absent: { count: 0, reason: '' },
        on_leave: { count: 0, subtitle: '' }
    };

    const attendanceList: AttendanceListItem[] = dashboardData?.attendance_list || [];
    const recentActivity: AttendanceActivityEvent[] = dashboardData?.recent_activity || [];

    // Live list: filter by search, then paginate (ready for 100+ staff)
    const liveSearchLower = (liveSearch || "").trim().toLowerCase();
    const filteredLiveList = liveSearchLower
        ? attendanceList.filter(
            (item) =>
                item.staff.name?.toLowerCase().includes(liveSearchLower) ||
                (item.staff.role && item.staff.role.replace(/_/g, " ").toLowerCase().includes(liveSearchLower))
        )
        : attendanceList;
    const totalLive = filteredLiveList.length;
    const liveFrom = (livePage - 1) * livePageSize;
    const liveTo = Math.min(liveFrom + livePageSize, totalLive);
    const paginatedLiveList = filteredLiveList.slice(liveFrom, liveTo);

    // Helper for timeline width calculation (08:00 to 22:00 window = 14 hours)
    const getTimelinePosition = (timeStr: string | null) => {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        const minutes = (h * 60) + m;
        const startMinutes = 8 * 60; // 08:00
        const endMinutes = 22 * 60; // 22:00
        const totalWindow = endMinutes - startMinutes;

        // Clamp
        const relative = Math.max(0, Math.min(minutes - startMinutes, totalWindow));
        return (relative / totalWindow) * 100;
    };

    return (
        <div className="space-y-8">
            {/* 1. Top Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                    <CardContent className="pt-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <UserCheck className="w-24 h-24 text-emerald-600" />
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                                <UserCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {summary.present.count} <span className="text-lg text-slate-400 font-medium">/ {summary.present.total}</span>
                                </div>
                                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-1">
                                    {summary.present.percentage}{t("staff.attendance.pct_attendance")}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                    <CardContent className="pt-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <Clock className="w-24 h-24 text-amber-500" />
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                                <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {summary.late.count} <span className="text-lg text-slate-400 font-medium">{t("staff.attendance.late")}</span>
                                </div>
                                <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mt-1">
                                    {t("staff.attendance.avg_min", { count: summary.late.avg_minutes })}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                    <CardContent className="pt-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <XCircle className="w-24 h-24 text-red-500" />
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {summary.absent.count} <span className="text-lg text-slate-400 font-medium">{t("staff.attendance.absent")}</span>
                                </div>
                                <p className="text-xs font-bold text-red-600 uppercase tracking-widest mt-1">
                                    {summary.absent.reason}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                    <CardContent className="pt-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <Coffee className="w-24 h-24 text-blue-500" />
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                                <Coffee className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {summary.on_leave.count} <span className="text-lg text-slate-400 font-medium">{t("staff.attendance.on_leave")}</span>
                                </div>
                                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-1">
                                    {summary.on_leave.subtitle}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 2. Shift Timeline */}
            <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hidden md:block">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">{t("staff.attendance.shift_timeline")}</CardTitle>
                        <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> {t("staff.attendance.on_time")}</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div> {t("staff.attendance.late")}</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> {t("staff.attendance.absent")}</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-400"></div> {t("staff.attendance.shift_over")}</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="relative h-16 pt-6">
                        {/* Time Markers */}
                        <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            <span>08:00</span>
                            <span>12:00</span>
                            <span>16:00</span>
                            <span>20:00</span>
                            <span>22:00</span>
                        </div>
                        {/* Axis Line */}
                        <div className="absolute top-6 left-0 w-full h-px bg-slate-100 dark:bg-slate-800"></div>

                        {/* Dots */}
                        {attendanceList.map((item) => {
                            if (!item.clock_in && item.status !== 'absent') return null;

                            let colorClass = "bg-slate-300";
                            if (item.status === 'on_time') colorClass = "bg-emerald-500";
                            if (item.status === 'late') colorClass = "bg-amber-500";
                            if (item.status === 'absent') colorClass = "bg-red-500";
                            if (item.status === 'clocked_out') colorClass = "bg-slate-400";

                            // If absent, use shift start time for position
                            const timeToUse = item.clock_in ? item.clock_in : (item.shift?.start || "09:00");
                            const leftPos = getTimelinePosition(timeToUse);

                            return (
                                <div
                                    key={item.staff.id}
                                    className={cn("absolute top-5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 shadow-sm transform -translate-x-1/2 transition-all hover:scale-125 z-10", colorClass)}
                                    style={{ left: `${leftPos}%` }}
                                    title={`${item.staff.name}: ${item.status === 'clocked_out' ? 'Shift Over' : item.status}`}
                                ></div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                {/* 3. Live Attendance Table - scalable for 100+ staff */}
                <div className="space-y-4 flex flex-col">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-slate-500" />
                        {t("staff.attendance.live_list")}
                    </h3>
                    <div className="flex flex-col gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder={t("staff.attendance.search_placeholder")}
                                value={liveSearch}
                                onChange={(e) => { setLiveSearch(e.target.value); setLivePage(1); }}
                                className="pl-9 h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                            />
                        </div>
                        <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                            <span>{t("staff.attendance.showing", { from: totalLive === 0 ? 0 : liveFrom + 1, to: liveTo, total: totalLive })}</span>
                            <div className="flex items-center gap-2">
                                <Label htmlFor="live-page-size" className="text-slate-500 whitespace-nowrap">{t("staff.attendance.page_size")}</Label>
                                <select
                                    id="live-page-size"
                                    value={livePageSize}
                                    onChange={(e) => { setLivePageSize(Number(e.target.value)); setLivePage(1); }}
                                    className="h-8 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs px-2"
                                >
                                    {[25, 50, 100].map((n) => (
                                        <option key={n} value={n}>{n}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex-1 min-h-[320px] flex flex-col">
                        <div className="overflow-auto flex-1">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800">
                                    <TableHead className="font-bold text-slate-500 text-xs uppercase tracking-wider">{t("staff.page.title")}</TableHead>
                                    <TableHead className="font-bold text-slate-500 text-xs uppercase tracking-wider hidden sm:table-cell">{t("staff.invite.role")}</TableHead>
                                    <TableHead className="font-bold text-slate-500 text-xs uppercase tracking-wider">{t("staff.attendance.shift")}</TableHead>
                                    <TableHead className="font-bold text-slate-500 text-xs uppercase tracking-wider">{t("staff.attendance.clock_in")}</TableHead>
                                    <TableHead className="font-bold text-slate-500 text-xs uppercase tracking-wider">{t("staff.attendance.status")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <>
                                        {Array.from({ length: 6 }).map((_, i) => (
                                            <TableRow key={i}>
                                                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                                                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                            </TableRow>
                                        ))}
                                    </>
                                ) : attendanceList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12">
                                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                                <Calendar className="w-8 h-8 text-slate-300" />
                                            </div>
                                            <p className="text-lg font-bold text-slate-900 dark:text-white">{t("staff.attendance.no_shifts")}</p>
                                            <p className="text-slate-500 text-sm">{t("staff.attendance.free_day")}</p>
                                        </TableCell>
                                    </TableRow>
                                ) : paginatedLiveList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                            {t("staff.attendance.search_placeholder")} — no match.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedLiveList.map((item) => (
                                        <TableRow key={item.staff.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors border-slate-100 dark:border-slate-800">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="w-9 h-9 border border-slate-100">
                                                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${item.staff.name}`} />
                                                        <AvatarFallback>{item.staff.name.substring(0, 2)}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white text-sm">{item.staff.name}</p>
                                                        {/* Inline Signals */}
                                                        {item.signals && item.signals.length > 0 && (
                                                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                                                {item.signals.map((sig: string, idx: number) => (
                                                                    <span key={idx} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                                                                        {sig}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell">
                                                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider border-slate-200 text-slate-500">
                                                    {item.staff.role?.replace('_', ' ')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                                {item.shift.start ? `${item.shift.start} - ${item.shift.end}` : <span className="text-slate-400 italic">{t("staff.attendance.unscheduled")}</span>}
                                            </TableCell>
                                            <TableCell className="text-sm font-bold text-slate-900 dark:text-white">
                                                {item.clock_in || <span className="text-slate-300">—</span>}
                                            </TableCell>
                                            <TableCell>
                                                {/* Status Badges */}
                                                {item.status === 'on_time' && (
                                                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none px-2 py-1 gap-1.5 flex w-fit">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        {t("staff.attendance.on_time")}
                                                    </Badge>
                                                )}
                                                {item.status === 'late' && (
                                                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-none px-2 py-1 gap-1.5 flex w-fit">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                        {t("staff.attendance.late")} ({item.late_minutes}m)
                                                    </Badge>
                                                )}
                                                {item.status === 'absent' && (
                                                    <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-none px-2 py-1 gap-1.5 flex w-fit">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                        {t("staff.attendance.absent")}
                                                    </Badge>
                                                )}
                                                {(item.status === 'present' || item.status === 'scheduled') && (
                                                    <Badge variant="outline" className="text-slate-500 border-slate-300">
                                                        {item.status === 'scheduled' ? t("staff.attendance.scheduled") : t("staff.attendance.present")}
                                                    </Badge>
                                                )}
                                                {(item.status === 'clocked_out') && (
                                                    <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 border-none px-2 py-1 gap-1.5 flex w-fit">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                                        {t("staff.attendance.shift_over")}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                        </div>
                        {totalLive > livePageSize && (
                            <div className="border-t border-slate-100 dark:border-slate-800 p-2 flex justify-center">
                                <PaginationControls
                                    currentPage={livePage}
                                    count={totalLive}
                                    pageSize={livePageSize}
                                    onPageChange={setLivePage}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* 4. Attendance Events Feed */}
                <div className="space-y-4 flex flex-col">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Activity className="w-5 h-5 text-slate-500" />
                        {t("staff.attendance.events")}
                    </h3>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-0 overflow-hidden flex-1">
                        <div className="h-full overflow-y-auto p-4 space-y-0 min-h-[400px]">
                            {recentActivity.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-slate-400 text-sm">{t("staff.attendance.no_events")}</p>
                                </div>
                            ) : (
                                recentActivity.map((event, i: number) => (
                                    <div key={event.id} className="relative pl-6 pb-6 last:pb-0 border-l border-slate-100 dark:border-slate-800">
                                        <div className={cn(
                                            "absolute -left-1.5 top-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900",
                                            event.event.includes("In") ? "bg-emerald-500" :
                                                event.event.includes("Out") ? "bg-slate-400" : "bg-blue-400"
                                        )} />
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-400 mb-0.5">{event.time}</span>
                                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                <span className="font-bold">{event.staff_name}</span> {event.event.toLowerCase()}
                                            </p>
                                            {event.event.includes("Late") && (
                                                <span className="text-[10px] text-amber-600 font-bold mt-1">{t("staff.attendance.late_arrival")}</span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Tasks Tab Component
const TasksTab: React.FC = () => {
    const [page, setPage] = useState(1);
    const { logout } = useAuth() as AuthContextType;

    const { data: paginatedData, isLoading } = useQuery<PaginatedResponse<ManagerTask>>({
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

    const tasks: ManagerTask[] = Array.isArray(paginatedData) ? paginatedData : (paginatedData?.results || []);

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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                                <>
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                        </TableRow>
                                    ))}
                                </>
                            ) : tasks && tasks.length > 0 ? (
                                tasks.map((task) => (
                                    <TableRow key={task.id} className="border-slate-100 dark:border-slate-800">
                                        <TableCell className="font-medium text-slate-900 dark:text-white">{task.title}</TableCell>
                                        <TableCell className="text-slate-600 dark:text-slate-300">
                                            {task.assigned_to_names?.join(", ") || t("common.unassigned")}
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
    const { logout } = useAuth() as AuthContextType;
    const { t } = useLanguage();

    const { data: insightsData, isLoading } = useQuery<StaffInsightsData>({
        queryKey: ["staff-insights"],
        queryFn: async () => {
            const response = await fetch(`${API_BASE}/dashboard/analytics/staff_insights/`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                },
            });
            if (!response.ok) {
                if (response.status === 401) logout();
                throw new Error("Failed to fetch insights");
            }
            return response.json();
        },
        refetchInterval: 60_000,
        refetchOnWindowFocus: true,
    });

    if (isLoading) {
        return (
            <div className="space-y-6 p-4">
                <BlockSkeleton className="mb-6" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <BlockSkeleton />
                    <BlockSkeleton />
                </div>
                <ListSkeleton rowCount={4} />
            </div>
        );
    }

    const { summary, star_performers, attendance_health, signals, alerts, miya_recommendation } = insightsData || {
        summary: { tasks_completed: 0, tasks_trend: 0, team_reliability: 0, active_workers: 0 },
        star_performers: [],
        attendance_health: { on_time_arrival: 0, no_show_rate: 0 },
        signals: [],
        alerts: [],
        miya_recommendation: null
    };

    const openMiyaChat = () => {
        const host = document.querySelector("#lua-shadow-root");
        const btn = host?.shadowRoot?.querySelector?.("button.lua-pop-button, button");
        if (btn) (btn as HTMLButtonElement).click();
    };

    return (
        <div className="space-y-8 pb-10">
            {/* Top Section: Weekly Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="relative overflow-hidden border-none bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-xl shadow-indigo-100 dark:shadow-none">
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                                <Zap className="w-5 h-5 text-indigo-50" />
                            </div>
                            <Badge className="bg-white/20 text-white border-none backdrop-blur-md">{summary.tasks_trend === 0 ? t("staff.insights.same_as_last") : t("staff.insights.week_trend", { sign: summary.tasks_trend > 0 ? '+' : '', pct: summary.tasks_trend })}</Badge>
                        </div>
                        <h3 className="text-3xl font-bold mb-1">{summary.tasks_completed}</h3>
                        <p className="text-indigo-100 text-sm font-medium">{t("staff.insights.tasks_completed")}</p>
                        <div className="mt-4 pt-4 border-t border-white/10 flex items-center text-xs text-indigo-50">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            <span>{summary.tasks_trend === 0 ? t("staff.insights.same_as_last") : summary.tasks_trend > 0 ? t("staff.insights.more_than_last", { pct: summary.tasks_trend }) : t("staff.insights.less_than_last", { pct: Math.abs(summary.tasks_trend) })}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-none bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-xl shadow-emerald-100 dark:shadow-none">
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                                <CheckCircle2 className="w-5 h-5 text-emerald-50" />
                            </div>
                            <Badge className="bg-white/20 text-white border-none backdrop-blur-md">{t("staff.insights.top_tier")}</Badge>
                        </div>
                        <h3 className="text-3xl font-bold mb-1">{summary.team_reliability}%</h3>
                        <p className="text-emerald-100 text-sm font-medium">{t("staff.insights.team_reliability")}</p>
                        <div className="mt-4 pt-4 border-t border-white/10 flex items-center text-xs text-emerald-50">
                            <Sparkles className="w-3 h-3 mr-1" />
                            <span>{t("staff.insights.based_on_30d")}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-none bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-xl shadow-amber-100 dark:shadow-none">
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                                <Users className="w-5 h-5 text-amber-50" />
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold mb-1">{summary.active_workers}</h3>
                        <p className="text-amber-100 text-sm font-medium">{t("staff.insights.active_workers")}</p>
                        <div className="mt-4 pt-4 border-t border-white/10 flex items-center text-xs text-amber-50">
                            <Activity className="w-3 h-3 mr-1" />
                            <span>{t("staff.insights.live_count")}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Middle Section: Performance & Attendance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Leaderboard */}
                <Card className="border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle className="text-xl font-bold flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-amber-500" />
                                {t("staff.insights.star_performers")}
                            </CardTitle>
                            <CardDescription>{t("staff.insights.top_contributors")}</CardDescription>
                        </div>
                        <Award className="w-8 h-8 text-slate-200 dark:text-slate-800" />
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="space-y-5">
                            {star_performers.length === 0 ? (
                                <div className="py-10 text-center">
                                    <p className="text-slate-500 text-sm italic">{t("staff.insights.no_task_data")}</p>
                                </div>
                            ) : (
                                star_performers.map((p, i: number) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                                                i === 0 ? "bg-amber-100 text-amber-600" :
                                                    i === 1 ? "bg-slate-200 text-slate-600" :
                                                        "bg-orange-100 text-orange-600"
                                            )}>
                                                {i + 1}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white text-sm">{p.name}</p>
                                                <p className="text-xs text-slate-500">{p.role}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-slate-900 dark:text-white">{p.tasks} {t("staff.insights.tasks")}</p>
                                            <Badge variant="outline" className="text-[10px] uppercase font-bold text-emerald-500 p-0 pointer-events-none border-none">
                                                {p.score}{t("staff.insights.success")}
                                            </Badge>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {star_performers[0] && (
                            <div className="mt-8 p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                                        <Star className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-indigo-900 dark:text-indigo-100 italic">"{t("staff.insights.rising_star")}"</p>
                                        <p className="text-xs text-slate-500 dark:text-indigo-300">{t("staff.insights.above_average", { name: star_performers[0].name })}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Attendance Trends */}
                <Card className="border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle className="text-xl font-bold flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-indigo-500" />
                                {t("staff.insights.attendance_health")}
                            </CardTitle>
                            <CardDescription>{t("staff.insights.reliability_patterns")}</CardDescription>
                        </div>
                        <Activity className="w-8 h-8 text-slate-200 dark:text-slate-800" />
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                <p className="text-xs text-slate-500 mb-1">{t("staff.insights.on_time_arrival")}</p>
                                <p className="text-xl font-bold text-emerald-600">{attendance_health.on_time_arrival}%</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                <p className="text-xs text-slate-500 mb-1">{t("staff.insights.no_show_rate")}</p>
                                <p className="text-xl font-bold text-red-600">{attendance_health.no_show_rate}%</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <p className="text-sm font-bold text-slate-900 dark:text-white mb-3">{t("staff.insights.recent_signals")}</p>
                            {signals.length === 0 ? (
                                <p className="text-xs text-slate-500 italic py-4">{t("staff.insights.no_signals")}</p>
                            ) : (
                                signals.map((sig, idx: number) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                        <div className={cn("w-2 h-2 rounded-full", sig.color === 'emerald' ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]")} />
                                        <p className="text-xs text-slate-600 dark:text-slate-300" dangerouslySetInnerHTML={{ __html: sig.text }} />
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Row: Alerts & AI Recommendations */}
            <div className="space-y-6">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-red-500" />
                        {t("staff.insights.managerial_action")}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t("staff.insights.managerial_action_subtitle") || "Based on this week's data — burnout, punctuality, no-shows."}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {alerts.length === 0 ? (
                        <div className="col-span-2 py-8 text-center bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl">
                            <p className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center justify-center gap-2">
                                <CheckCircle2 className="w-5 h-5" />
                                {t("staff.insights.no_critical")}
                            </p>
                        </div>
                    ) : (
                        alerts.map((alert, i: number) => (
                            <Card key={i} className={cn(
                                "overflow-hidden group",
                                alert.level === 'Critical' ? "border-red-100 dark:border-red-900/30 bg-red-50/30 dark:bg-red-950/10" : "border-amber-100 dark:border-amber-900/30 bg-amber-50/30 dark:bg-amber-950/10"
                            )}>
                                <CardContent className="p-5 flex gap-4">
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform",
                                        alert.level === 'Critical' ? "bg-red-100 dark:bg-red-900/30" : "bg-amber-100 dark:bg-amber-900/30"
                                    )}>
                                        {alert.type === 'Burnout Risk' ? (
                                            <Flame className={cn("w-6 h-6", alert.level === 'Critical' ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400")} />
                                        ) : (
                                            <AlertCircle className={cn("w-6 h-6", alert.level === 'Critical' ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400")} />
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={cn("text-xs font-black uppercase tracking-widest", alert.level === 'Critical' ? "text-red-600" : "text-amber-600")}>{alert.type}</span>
                                            <Badge variant="outline" className={cn(
                                                "text-[10px] px-1.5 h-4 border-none",
                                                alert.level === 'Critical' ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                                            )}>{alert.level}</Badge>
                                        </div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">{alert.title}</p>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            {alert.description}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>

                <div className="p-6 bg-slate-900 dark:bg-slate-800 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Sparkles className="w-24 h-24 text-white" />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="max-w-xl">
                            <p className="text-emerald-400 text-xs font-black uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                <Zap className="w-3 h-3" />
                                {t("staff.insights.ai_recommendation")}
                            </p>
                            <h3 className="text-xl font-bold text-white mb-2">{miya_recommendation?.title ?? t("staff.insights.optimize_shifts")}</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                {miya_recommendation?.body ? (
                                    <span dangerouslySetInnerHTML={{ __html: miya_recommendation.body.replace(/\*\*(.*?)\*\*/g, "<strong class='text-white font-medium'>$1</strong>") }} />
                                ) : (
                                    <>Based on last month's data, reassigning shifts during peak hours and using Miya's clock-in reminders can reduce late arrivals. <strong className="text-white font-medium">Chat with Miya</strong> for a tailored plan.</>
                                )}
                            </p>
                        </div>
                        <div className="flex flex-shrink-0 gap-3">
                            <Button
                                type="button"
                                onClick={openMiyaChat}
                                variant="outline"
                                className="bg-emerald-500 hover:bg-emerald-600 border-emerald-400 text-white font-bold rounded-xl px-6 shadow-lg whitespace-nowrap"
                            >
                                {miya_recommendation?.action_label ?? (t("ai.chat_button") || "Chat with Miya")}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Main Staff App Component
const roleToDepartment: Record<string, string> = {
    'SUPER_ADMIN': 'Management',
    'ADMIN': 'Management',
    'MANAGER': 'Management',
    'CHEF': 'Kitchen',
    'KITCHEN_HELP': 'Kitchen',
    'WAITER': 'Front of House',
    'BARTENDER': 'Front of House',
    'RECEPTIONIST': 'Front of House',
    'CASHIER': 'Operations',
    'CLEANER': 'Operations',
    'SECURITY': 'Operations',
};

const getDocumentUrl = (path: string) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    // Prepend BACKEND_URL if it's a relative path
    const baseUrl = BACKEND_URL.endsWith('/') ? BACKEND_URL.slice(0, -1) : BACKEND_URL;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${normalizedPath}`;
};

export default function StaffApp() {
    const { user } = useAuth() as AuthContextType;
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState("team");
    const showRequestsTab = Boolean(user?.role && ["SUPER_ADMIN", "ADMIN", "MANAGER", "OWNER"].includes(user.role));

    return (
        <div className="min-h-screen p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <header className="mb-6">
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">{t("staff.page.title")}</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        {t("staff.page.subtitle")}
                    </p>
                </header>

                {/* Tabbed Interface */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className={`w-full grid ${showRequestsTab ? "grid-cols-5" : "grid-cols-4"} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl mb-6`}>
                        <TabsTrigger value="team" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white rounded-lg px-4 py-2 text-sm font-semibold transition-all">
                            <Users className="w-4 h-4 mr-2" />
                            {t("staff.tabs.team")}
                        </TabsTrigger>
                        <TabsTrigger value="presence" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white rounded-lg px-4 py-2 text-sm font-semibold transition-all">
                            <UserCheck className="w-4 h-4 mr-2" />
                            {t("staff.tabs.presence")}
                        </TabsTrigger>
                        <TabsTrigger value="attendance" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white rounded-lg px-4 py-2 text-sm font-semibold transition-all">
                            <Clock className="w-4 h-4 mr-2" />
                            {t("staff.tabs.attendance")}
                        </TabsTrigger>
                        {showRequestsTab && (
                            <TabsTrigger value="requests" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white rounded-lg px-4 py-2 text-sm font-semibold transition-all">
                                <Inbox className="w-4 h-4 mr-2" />
                                {t("staff.tabs.requests")}
                            </TabsTrigger>
                        )}
                        <TabsTrigger value="insights" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white rounded-lg px-4 py-2 text-sm font-semibold transition-all">
                            <TrendingUp className="w-4 h-4 mr-2" />
                            {t("staff.tabs.insights")}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="presence"><PresenceTab /></TabsContent>
                    <TabsContent value="team"><TeamTab /></TabsContent>
                    <TabsContent value="attendance"><AttendanceTab /></TabsContent>
                    {showRequestsTab && (
                        <TabsContent value="requests"><StaffRequestsTab /></TabsContent>
                    )}
                    <TabsContent value="insights"><InsightsTab /></TabsContent>
                </Tabs>
            </div>
        </div>
    );
}