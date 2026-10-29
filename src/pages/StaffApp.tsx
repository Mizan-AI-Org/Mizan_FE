import React, { useState, useEffect, useMemo } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { unwrapEnvelope } from "@/lib/envelope";
import { AddPeopleDialog } from "@/components/staff/AddPeopleDialog";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
    Clock,
    ClipboardCheck,
    TrendingUp,
    Search,
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
    ArrowRightLeft,
} from "lucide-react";
import { API_BASE, BACKEND_URL, BackendService, api, authFetch } from "@/lib/api";
import { PAGE_SHELL_PADDED } from "@/lib/page-shell";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { AuthContextType } from "@/contexts/AuthContext.types";
import { useLanguage } from "@/hooks/use-language";
import { format, parseISO } from "date-fns";
import DeleteStaffConfirmation from "@/components/staff/DeleteStaffConfirmation";
import DeactivateStaffConfirmation from "@/components/staff/DeactivateStaffConfirmation";
import MoveStaffBranchDialog from "@/components/staff/MoveStaffBranchDialog";
import StaffHRFile from "@/components/staff/StaffHRFile";
import { StaffMemberAvatar } from "@/components/staff/StaffMemberAvatar";
import { Checkbox } from "@/components/ui/checkbox";
import { splitInviteRoleSelection, useBusinessVertical } from "@/hooks/use-business-vertical";
import { useBusinessLocations } from "@/hooks/use-business-locations";
import {
  defaultRoleForVertical,
  getStaffInviteRoleGroups,
  isRoleAllowedForVertical,
  type BusinessVertical,
} from "@/config/staffInviteRolesByVertical";
import { t } from "i18next";
import { WEB_APP_ROLES } from "@/lib/operationalCommandRoles";

const STAFF_MODAL_INPUT =
    "h-9 rounded-lg bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 font-medium [color-scheme:light] dark:[color-scheme:dark]";

const STAFF_MODAL_SELECT =
    "w-full h-9 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 focus:ring-emerald-500 focus:border-emerald-500 font-medium px-3 text-sm [color-scheme:light] dark:[color-scheme:dark]";

const STAFF_MODAL_SALARY_INPUT =
    "h-9 rounded-lg bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-600 text-emerald-600 dark:text-emerald-400 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 font-semibold";

const STAFF_MODAL_SALARY_TYPE_SELECT =
    "h-9 min-w-[4.5rem] rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-bold text-[10px] px-2 text-slate-600 dark:text-slate-200 uppercase tracking-widest shrink-0 [color-scheme:light] dark:[color-scheme:dark]";

const STAFF_MODAL_SECTION_TITLE =
    "text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]";

const STAFF_MODAL_SECTION_TITLE_SM =
    "text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]";

const STAFF_MODAL_FIELD_LABEL =
    "text-xs font-bold text-slate-600 dark:text-slate-300 ml-1";

const STAFF_MODAL_DIVIDER =
    "border-slate-200/60 dark:border-slate-700/60";

const STAFF_MODAL_EMPTY =
    "py-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-center bg-slate-50/30 dark:bg-slate-800/30";

const STAFF_MODAL_EMPTY_TEXT =
    "text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest";

const STAFF_MODAL_EMPTY_TEXT_SM =
    "text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest";

const STAFF_MODAL_FOOTER =
    "p-5 bg-slate-50/80 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 flex gap-3";

const STAFF_MODAL_CANCEL_BTN =
    "flex-1 rounded-xl font-black border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 bg-white/60 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700";

const STAFF_MODAL_ICON_BOX =
    "w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors";

const STAFF_MODAL_OVERLAY =
    "fixed inset-0 z-[3000] overflow-y-auto";

const STAFF_MODAL_OVERLAY_INNER =
    "flex min-h-full items-center justify-center p-4 sm:p-6 bg-black/50 dark:bg-black/70 backdrop-blur-sm";

const STAFF_MODAL_SHELL =
    "relative w-full max-w-2xl max-h-[min(90dvh,calc(100vh-2rem))] flex flex-col border border-slate-200/50 dark:border-slate-700/50 shadow-2xl rounded-[1.75rem] sm:rounded-[2rem] overflow-hidden";

const STAFF_MODAL_BODY =
    "flex-1 min-h-0 overflow-y-auto custom-scrollbar";

// Types
interface StaffMember {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    /** Human-readable role; use for CUSTOM titles */
    role_display?: string;
    avatar_url?: string | null;
    is_active: boolean;
    phone?: string;
    primary_location?: string | null;
    primary_location_data?: { id: string; name: string; is_primary?: boolean } | null;
    profile?: {
        join_date?: string;
        hourly_rate?: number;
        salary_type?: 'HOURLY' | 'MONTHLY';
        promotion_history?: { role: string; date: string; note?: string }[];
        department?: string;
        /** Operational department tags (KITCHEN, SERVICE, …). */
        tags?: string[];
    };
    stats?: {
        hours_weekly: number;
        hours_monthly: number;
        hours_yearly: number;
    };
}

function staffRoleLabel(m: Pick<StaffMember, "role" | "role_display">): string {
    if (m.role_display) return m.role_display;
    return m.role?.toLowerCase().replace(/_/g, " ") ?? "";
}

/** Translated label for a role code in the edit/promote selects. */
function roleOptionLabel(code: string): string {
    return t(`staff.roles.${code.toLowerCase()}`);
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
    phone_number?: string;
    status?: "pending" | "expired" | "accepted";
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

function phoneDigitsOnly(value: string | null | undefined): string {
    return (value || "").replace(/\D/g, "");
}

/** Loose match for pending-record phone vs profile phone (handles missing country code). */
function phonesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
    const da = phoneDigitsOnly(a);
    const db = phoneDigitsOnly(b);
    if (!da || !db) return false;
    if (da === db) return true;
    const tail = Math.min(da.length, db.length, 9);
    return da.slice(-tail) === db.slice(-tail);
}

/** Added on WhatsApp, not joined yet (/staff/invites/pending/). */
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

type StaffDocument = {
    id: string;
    title: string;
    file: string;
    uploaded_at: string;
};

type BulkInviteRow = {
    first_name: string;
    last_name: string;
    role: string;
    email?: string;
    phone_number?: string;
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4 mt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {count > 0
                    ? t("staff.pagination.range", {
                          from: (currentPage - 1) * pageSize + 1,
                          to: Math.min(currentPage * pageSize, count),
                          total: count,
                      })
                    : t("staff.pagination.no_results")}
            </p>
            <div className="flex flex-wrap items-center gap-2">
                {onPageSizeChange && (
                    <select
                        value={pageSize}
                        onChange={(e) => onPageSizeChange(Number(e.target.value))}
                        disabled={isLoading}
                        className="h-8 rounded-lg border border-border bg-card px-2 text-xs text-foreground"
                        aria-label={t("staff.pagination.items_per_page")}
                    >
                        {pageSizeOptions.map((n) => (
                            <option key={n} value={n}>{t("staff.pagination.per_page", { count: n })}</option>
                        ))}
                    </select>
                )}
                {showPaginationNumbers && (
                    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-card px-1 py-0.5">
                        <button
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage === 1 || isLoading}
                            aria-label={t("common.previous_page")}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 disabled:opacity-30 transition-colors rounded-md"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-0.5 px-0.5">
                            {pages.map((p, idx) => (
                                <React.Fragment key={idx}>
                                    {p === "..." ? (
                                        <span className="px-1 text-slate-400 text-xs">…</span>
                                    ) : (
                                        <button
                                            onClick={() => onPageChange(p as number)}
                                            disabled={isLoading}
                                            className={cn(
                                                "min-w-8 h-8 rounded-md text-xs font-semibold transition-colors",
                                                currentPage === p
                                                    ? "bg-emerald-600 text-white"
                                                    : "text-slate-500 hover:text-emerald-600 hover:bg-slate-50 dark:hover:bg-slate-800",
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
                            className="p-1.5 text-slate-400 hover:text-emerald-600 disabled:opacity-30 transition-colors rounded-md"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
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
    const [selectedMember, setSelectedMember] = useState<StaffMember | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [documents, setDocuments] = useState<StaffDocument[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
    const [staffToDelete, setStaffToDelete] = useState<{ id: string; name: string } | null>(null);
    const [staffToDeactivate, setStaffToDeactivate] = useState<{ id: string; name: string } | null>(null);
    const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
    const [selectedStaffById, setSelectedStaffById] = useState<Record<string, StaffMember>>({});
    const [branchFilter, setBranchFilter] = useState<string>("all");
    const [moveDialogOpen, setMoveDialogOpen] = useState(false);
    const [moveTargets, setMoveTargets] = useState<StaffMember[]>([]);
    const avatarInputRef = React.useRef<HTMLInputElement>(null);
    const [avatarUploadTargetId, setAvatarUploadTargetId] = useState<string | null>(null);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const { user } = useAuth() as AuthContextType;
    const queryClient = useQueryClient();
    const { data: tenantLocations = [] } = useBusinessLocations();
    const multiBranch = tenantLocations.length >= 2;

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
            toast.error(getErrorMessage(err, t("staff.errors.load_documents")));
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
        queryKey: ["staff-members", staffPage, staffPageSize, searchQuery, branchFilter],
        queryFn: async () => {
            const params = new URLSearchParams({
                is_active: "true",
                page: String(staffPage),
                page_size: String(staffPageSize),
                search: searchQuery,
            });
            if (branchFilter && branchFilter !== "all") {
                params.set("primary_location", branchFilter);
            }
            // authFetch refreshes an expired token instead of logging the manager out.
            const response = await authFetch(`${API_BASE}/users/?${params.toString()}`);
            if (!response.ok) throw new Error("Failed to fetch staff");
            return unwrapEnvelope(await response.json());
        },
    });

    const { data: activationPendingData, isLoading: isActivationPendingLoading, refetch: refetchActivationPending } = useQuery<{ pending: PendingActivation[]; count: number }>({
        queryKey: ["pending-activations"],
        queryFn: async () => {
            // WhatsApp-first: people added but not joined yet, with the welcome's delivery state.
            const response = await authFetch(`${API_BASE}/staff/invites/pending/`);
            if (!response.ok) throw new Error("Failed to fetch pending activations");
            const rows = (unwrapEnvelope(await response.json()) || []) as { id: string; name: string; phone: string; role: string; status: string; sentAt: string | null }[];
            const pending = rows.map((r) => ({ id: r.id, first_name: r.name, last_name: "", phone: r.phone, role: r.role, status: r.status, batch_id: "", created_at: r.sentAt }));
            return { pending, count: pending.length };
        },
    });

    const staff = Array.isArray(staffData) ? staffData : (staffData?.results || []);
    const pendingActivations: PendingActivation[] = activationPendingData?.pending ?? [];

    const filteredStaff = staff;

    const clearSelection = () => {
        setSelectedStaffIds([]);
        setSelectedStaffById({});
    };

    const toggleStaffSelected = (member: StaffMember) => {
        setSelectedStaffIds((prev) => {
            if (prev.includes(member.id)) {
                setSelectedStaffById((map) => {
                    const next = { ...map };
                    delete next[member.id];
                    return next;
                });
                return prev.filter((x) => x !== member.id);
            }
            setSelectedStaffById((map) => ({ ...map, [member.id]: member }));
            return [...prev, member.id];
        });
    };

    const toggleSelectAllVisible = () => {
        const ids = filteredStaff.map((m) => m.id);
        const allSelected = ids.length > 0 && ids.every((id) => selectedStaffIds.includes(id));
        if (allSelected) {
            setSelectedStaffIds((prev) => prev.filter((id) => !ids.includes(id)));
            setSelectedStaffById((map) => {
                const next = { ...map };
                ids.forEach((id) => delete next[id]);
                return next;
            });
        } else {
            setSelectedStaffIds((prev) => Array.from(new Set([...prev, ...ids])));
            setSelectedStaffById((map) => {
                const next = { ...map };
                filteredStaff.forEach((m) => {
                    next[m.id] = m;
                });
                return next;
            });
        }
    };

    const openMoveDialog = (members: StaffMember[]) => {
        if (members.length === 0) {
            toast.error(t("generic.toast.select_at_least_one_staff_member"));
            return;
        }
        setMoveTargets(members);
        setMoveDialogOpen(true);
    };

    const handleResendWelcome = async (staffId: string) => {
        try {
            const response = await authFetch(`${API_BASE}/staff/invites/${staffId}/resend/`, {
                method: "POST",
            });
            const body = unwrapEnvelope(await response.json().catch(() => ({}))) as { error?: string; status?: string } | null;
            if (!response.ok) throw new Error(body?.error || t("staff.pending.resend_failed"));
            toast[body?.status === "sent" ? "success" : "warning"](
                body?.status === "sent" ? t("staff.pending.resent") : t("staff.add_people.not_delivered"),
            );
            refetchActivationPending();
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, t("staff.pending.resend_failed")));
        }
    };

    const handleDeletePendingActivation = async (activationId: string) => {
        if (!confirm(t("staff.pending.delete_confirm"))) return;
        try {
            const response = await authFetch(`${API_BASE}/staff/invites/${activationId}/`, {
                method: "DELETE",
            });
            if (!response.ok) throw new Error(t("staff.errors.remove_pending"));
            toast.success(t("staff.pending.deleted"));
            refetchActivationPending();
            void queryClient.invalidateQueries({ queryKey: ["nav-attention", "counts"] });
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, t("staff.errors.remove_pending")));
        }
    };

    const refetch = () => {
        refetchStaff();
        refetchActivationPending();
    };


    const handleViewProfile = (member: StaffMember) => {
        setSelectedMember(member);
        setIsViewModalOpen(true);
    };

    const handleEditProfile = (member: StaffMember) => {
        setSelectedMember(member);
        setIsEditModalOpen(true);
    };

    const openAvatarUpload = (memberId: string) => {
        setAvatarUploadTargetId(memberId);
        avatarInputRef.current?.click();
    };

    const applyMemberAvatar = (memberId: string, avatarUrl: string | null | undefined) => {
        const patch = (m: StaffMember) =>
            m.id === memberId ? { ...m, avatar_url: avatarUrl ?? m.avatar_url } : m;
        queryClient.setQueriesData<PaginatedResponse<StaffMember>>(
            { queryKey: ["staff-members"] },
            (old) => (old?.results ? { ...old, results: old.results.map(patch) } : old),
        );
        setSelectedMember((prev) => (prev && prev.id === memberId ? patch(prev) : prev));
        setSelectedStaffById((prev) => {
            const row = prev[memberId];
            if (!row) return prev;
            return { ...prev, [memberId]: patch(row) };
        });
    };

    const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        const staffId = avatarUploadTargetId;
        e.target.value = "";
        setAvatarUploadTargetId(null);
        if (!file || !staffId) return;
        if (!file.type.startsWith("image/")) {
            toast.error(t("staff.avatar.invalid_type", { defaultValue: "Please choose an image file." }));
            return;
        }
        setAvatarUploading(true);
        try {
            const token = localStorage.getItem("access_token") || "";
            const data = await api.uploadStaffAvatar(token, staffId, file);
            const url = (data.avatar_url as string | undefined) ?? null;
            applyMemberAvatar(staffId, url);
            toast.success(t("staff.avatar.updated", { defaultValue: "Profile photo updated." }));
            refetchStaff();
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, t("staff.errors.upload_photo")));
        } finally {
            setAvatarUploading(false);
        }
    };

    // View Profile Modal
    const ViewProfileModal = () => {
        const [isGeneratingReport, setIsGeneratingReport] = useState(false);
        const [isCopyingWaLink, setIsCopyingWaLink] = useState(false);

        // Use selectedMember directly as it contains the most up-to-date information (including manual updates after save)
        // logic that preferred "staff" list was causing stale data to be shown until refetch completed
        if (!selectedMember) return null;

        const waPhone =
            selectedMember.phone ||
            phoneFromWhatsAppEmail(selectedMember.email) ||
            "";

        const handleGenerateReport = async () => {
            // Open the tab inside the click so popup blockers allow it; the report prints itself (Save as PDF).
            const reportWindow = window.open("", "_blank");
            setIsGeneratingReport(true);
            try {
                const token = localStorage.getItem("access_token") || "";
                const html = await api.generateStaffReport(token, selectedMember.id);
                if (!reportWindow) throw new Error(t("staff.report.popup_blocked"));
                reportWindow.document.open();
                reportWindow.document.write(html);
                reportWindow.document.close();
                toast.success(t("toasts.report_generated"));
            } catch (err: unknown) {
                reportWindow?.close();
                toast.error(getErrorMessage(err, t("staff.errors.generate_report")));
            } finally {
                setIsGeneratingReport(false);
            }
        };

        const profileNeedsActivationLink =
            !selectedMember.is_active &&
            pendingActivations.some((pa) => phonesMatch(pa.phone, waPhone));
        const profileCanCopyWhatsAppLink = phoneDigitsOnly(waPhone).length >= 6;
        const profilePhoneMissingCountryCode =
            profileCanCopyWhatsAppLink && phoneDigitsOnly(waPhone).length < 11;


        return (
            <div className={STAFF_MODAL_OVERLAY}>
                <div className={STAFF_MODAL_OVERLAY_INNER}>
                    <Card className={cn(STAFF_MODAL_SHELL, "bg-card")}>
                        <CardHeader className="shrink-0 pt-5 pb-2 px-6 sm:px-8 flex flex-row items-center justify-between gap-4">
                            <CardTitle className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{t("staff.staff_profile")}</CardTitle>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="shrink-0 rounded-full bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                onClick={() => setIsViewModalOpen(false)}
                                aria-label={t("common.close")}
                            >
                                <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                            </Button>
                        </CardHeader>
                        <CardContent className={cn(STAFF_MODAL_BODY, "space-y-8 px-6 sm:px-8 pb-6")}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <StaffMemberAvatar
                                    size="xl"
                                    firstName={selectedMember.first_name}
                                    lastName={selectedMember.last_name}
                                    avatarUrl={selectedMember.avatar_url}
                                    onUploadClick={() => openAvatarUpload(selectedMember.id)}
                                    uploadLabel={t("staff.avatar.change", { defaultValue: "Change photo" })}
                                />
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight tracking-tight">
                                        {selectedMember.first_name} {selectedMember.last_name}
                                    </h3>
                                    <Badge variant="outline" className="capitalize mt-2 border-emerald-100 bg-emerald-50/50 text-emerald-600 dark:bg-emerald-900/10 dark:text-emerald-400 font-bold text-[11px] px-3 py-0.5 rounded-lg border-none">
                                        {staffRoleLabel(selectedMember)}
                                    </Badge>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-emerald-100 text-emerald-600 hover:bg-emerald-50 rounded-xl font-bold h-11 px-6 shadow-sm ring-offset-background transition-all hover:shadow-md"
                                onClick={handleGenerateReport}
                                disabled={isGeneratingReport}
                            >
                                {isGeneratingReport ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                                {t("staff.pdf_report")}
                            </Button>
                            </div>
                        </div>

                        {/* Performance Analytics */}
                        <div className="grid grid-cols-3 gap-3 py-4">
                            <div className="bg-slate-50/50 dark:bg-slate-800/40 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 flex flex-col items-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t("generic.weekly")}</p>
                                <p className="text-xl font-black text-slate-900 dark:text-white">{t("staff.hours_value", { count: selectedMember.stats?.hours_weekly || 0 })}</p>
                            </div>
                            <div className="bg-emerald-50/30 dark:bg-emerald-900/10 p-5 rounded-[1.5rem] border border-emerald-100/50 dark:border-emerald-900/30 flex flex-col items-center shadow-sm">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">{t("billing.monthly")}</p>
                                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{t("staff.hours_value", { count: selectedMember.stats?.hours_monthly || 0 })}</p>
                            </div>
                            <div className="bg-slate-50/50 dark:bg-slate-800/40 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 flex flex-col items-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t("billing.yearly")}</p>
                                <p className="text-xl font-black text-slate-900 dark:text-white">{t("staff.hours_value", { count: selectedMember.stats?.hours_yearly || 0 })}</p>
                            </div>
                        </div>

                        <div className={cn("grid grid-cols-2 gap-12 py-8 border-t", STAFF_MODAL_DIVIDER)}>
                            <div className="space-y-6">
                                <h4 className={STAFF_MODAL_SECTION_TITLE}>{t("staff.contact_info")}</h4>
                                <div className="space-y-4">
                                    {isWhatsAppActivationEmail(selectedMember.email) ? (
                                        <div className="flex items-center gap-3 group">
                                            <div className={STAFF_MODAL_ICON_BOX}>
                                                <Phone className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t("staff.whatsapp_phone")}</p>
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                                    {waPhone || t("common.not_provided")}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-3 group">
                                                <div className={STAFF_MODAL_ICON_BOX}>
                                                    <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t("staff.email_address")}</p>
                                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                                        {selectedMember.email || t("common.not_provided")}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 group">
                                                <div className={STAFF_MODAL_ICON_BOX}>
                                                    <Phone className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t("staff.invite.whatsapp_number")}</p>
                                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                                        {waPhone || t("common.not_provided")}
                                                    </p>
                                                    {!waPhone && (
                                                        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                                                            {t("staff.profile.whatsapp_add_phone_hint")}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {profileCanCopyWhatsAppLink ? (
                                    <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 p-3 space-y-2">
                                        <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                                            {t("staff.profile.whatsapp_activation_title")}
                                        </p>
                                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                            {t("staff.profile.whatsapp_activation_hint")}
                                        </p>
                                        {profilePhoneMissingCountryCode ? (
                                            <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-relaxed">
                                                {t("staff.profile.whatsapp_country_code_hint")}
                                            </p>
                                        ) : null}
                                        {!selectedMember.is_active ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-semibold"
                                            onClick={async () => {
                                                setIsCopyingWaLink(true);
                                                try {
                                                    await handleResendWelcome(selectedMember.id);
                                                } finally {
                                                    setIsCopyingWaLink(false);
                                                }
                                            }}
                                            disabled={isCopyingWaLink}
                                        >
                                            {isCopyingWaLink ? (
                                                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                            ) : (
                                                <Send className="w-3.5 h-3.5 mr-1.5" />
                                            )}
                                            {t("staff.pending.resend")}
                                        </Button>
                                        ) : null}
                                    </div>
                                    ) : (
                                    <div className="rounded-xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 p-3 space-y-1.5">
                                        <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                                            {t("staff.profile.whatsapp_missing_title")}
                                        </p>
                                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                            {t("staff.profile.whatsapp_missing_hint")}
                                        </p>
                                    </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h4 className={STAFF_MODAL_SECTION_TITLE}>{t("staff.employment_details")}</h4>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 group">
                                        <div className={STAFF_MODAL_ICON_BOX}>
                                            <Briefcase className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t("staff.department")}</p>
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{selectedMember.profile?.department || t("common.unassigned")}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 group">
                                        <div className={STAFF_MODAL_ICON_BOX}>
                                            <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t("staff.join_date")}</p>
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{selectedMember.profile?.join_date ? format(new Date(selectedMember.profile.join_date), 'PPP') : t("staff.not_available")}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 group">
                                        <div className={STAFF_MODAL_ICON_BOX}>
                                            <TrendingUp className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t("staff.salary_wage")}</p>
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                                ${selectedMember.profile?.hourly_rate || 0}
                                                <span className="text-xs text-slate-500 dark:text-slate-400 font-normal ml-1">
                                                    {selectedMember.profile?.salary_type === 'MONTHLY' ? t("staff.per_month_short") : t("staff.per_hour_short")}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Promotion History */}
                        <div className={cn("space-y-6 pt-4 border-t", STAFF_MODAL_DIVIDER)}>
                            <h4 className={STAFF_MODAL_SECTION_TITLE}>{t("staff.promotion_history")}</h4>
                            <div className="space-y-3">
                                {selectedMember.profile?.promotion_history && selectedMember.profile.promotion_history.length > 0 ? (
                                    selectedMember.profile.promotion_history.map((p, i) => (
                                        <div key={i} className="flex items-start gap-3 bg-slate-50/50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                                            <div className="bg-card p-2 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                                                <Briefcase className="w-4 h-4 text-emerald-500" />
                                            </div>
                                            <div>
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="text-sm font-black text-slate-700 dark:text-slate-200">{p.role}</p>
                                                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{p.date}</p>
                                                </div>
                                                {p.note && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">"{p.note}"</p>}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className={STAFF_MODAL_EMPTY}>
                                        <p className={STAFF_MODAL_EMPTY_TEXT}>{t("staff.no_promotion_history")}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={cn("space-y-4 pt-4 border-t", STAFF_MODAL_DIVIDER)}>
                            <h4 className={STAFF_MODAL_SECTION_TITLE}>{t("hr.file_title")}</h4>
                            <StaffHRFile staffId={selectedMember.id} />
                        </div>
                        </CardContent>

                        <div className={cn(STAFF_MODAL_FOOTER, "shrink-0 px-6 sm:px-8")}>
                            <Button
                                variant="outline"
                                className={cn(STAFF_MODAL_CANCEL_BTN, "h-12 sm:h-14 text-base active:scale-[0.98] transition-all")}
                                onClick={() => setIsViewModalOpen(false)}
                            >
                                <X className="w-5 h-5 mr-3" /> {t("common.cancel")}
                            </Button>
                            <Button
                                className="flex-1 h-12 sm:h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black tracking-tight text-base shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all"
                                onClick={() => { setIsViewModalOpen(false); handleEditProfile(selectedMember); }}
                            >
                                <Edit className="w-5 h-5 mr-3" /> {t("common.edit_profile")}
                            </Button>
                        </div>
                    </Card>
                </div>
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
            // The API already blanks addresses Mizan generated for phone-only people; older ones are cleared here.
            const normalizeEmail = (email: string | null | undefined) => {
                const value = email || "";
                if (/^\d+@mizan\.ai$/i.test(value) || isWhatsAppActivationEmail(value)) {
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
                toast.error(getErrorMessage(err, t("staff.errors.update_profile")));
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
                toast.error(getErrorMessage(err, t("staff.errors.reset_password")));
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
            toast.success(t("staff.promoted_toast", { role: roleOptionLabel(promoRole) }));
        };

        return (
            <div className={STAFF_MODAL_OVERLAY}>
                <div className={STAFF_MODAL_OVERLAY_INNER}>
                    <Card className={cn(STAFF_MODAL_SHELL, "bg-card")}>
                        <CardHeader className="shrink-0 pt-5 pb-1 px-5 sm:px-6 flex flex-row items-center justify-between gap-4">
                            <div className="min-w-0">
                                <CardTitle className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{t("staff.edit_staff_profile")}</CardTitle>
                                <CardDescription className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">{t("staff.manage_staff_info")}</CardDescription>
                            </div>
                            <Button variant="ghost" size="icon" className="shrink-0 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setIsEditModalOpen(false)} aria-label={t("common.close")}>
                                <X className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                            </Button>
                        </CardHeader>

                        <CardContent className={cn(STAFF_MODAL_BODY, "px-5 sm:px-6 pb-5")}>
                        <div className="flex flex-col items-center gap-2 pb-4 border-b border-border/60">
                            <StaffMemberAvatar
                                size="xl"
                                firstName={formData.first_name}
                                lastName={formData.last_name}
                                avatarUrl={selectedMember.avatar_url}
                                onUploadClick={
                                    avatarUploading ? undefined : () => openAvatarUpload(selectedMember.id)
                                }
                                uploadLabel={t("staff.avatar.change", { defaultValue: "Change photo" })}
                            />
                            <p className="text-xs text-muted-foreground text-center max-w-xs">
                                {t("staff.avatar.hint", {
                                    defaultValue: "Add a clear face photo so managers recognize them on cards and in ops.",
                                })}
                            </p>
                        </div>
                        <div className="space-y-3 py-2">
                            {/* Personal Information */}
                            <div className="space-y-3">
                                <h4 className={STAFF_MODAL_SECTION_TITLE_SM}>{t("staff.personal_info")}</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <label className={STAFF_MODAL_FIELD_LABEL}>{t("staff.first_name")}</label>
                                        <Input
                                            value={formData.first_name}
                                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                            className={STAFF_MODAL_INPUT}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className={STAFF_MODAL_FIELD_LABEL}>{t("staff.last_name")}</label>
                                        <Input
                                            value={formData.last_name}
                                            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                            className={STAFF_MODAL_INPUT}
                                        />
                                    </div>
                                    {/* Staff work on WhatsApp with Miya and never sign in: only dashboard roles have an email. */}
                                    {(WEB_APP_ROLES as readonly string[]).includes(formData.role) && (
                                        <div className="space-y-2 col-span-2">
                                            <label className={STAFF_MODAL_FIELD_LABEL}>{t("staff.email_optional")}</label>
                                            <Input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                placeholder={t("staff.email_optional_hint")}
                                                className={STAFF_MODAL_INPUT}
                                            />
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <label className={STAFF_MODAL_FIELD_LABEL}>{t("staff.invite.whatsapp_number")}</label>
                                        <Input
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder={t("staff.whatsapp_phone_placeholder")}
                                            className={STAFF_MODAL_INPUT}
                                        />
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                            {t("staff.whatsapp_phone_hint")}
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className={STAFF_MODAL_FIELD_LABEL}>{t("staff.join_date")}</label>
                                        <Input
                                            type="date"
                                            value={formData.join_date}
                                            onChange={(e) => setFormData({ ...formData, join_date: e.target.value })}
                                            className={STAFF_MODAL_INPUT}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Role & Compensation */}
                            <div className={cn("space-y-4 pt-4 border-t", STAFF_MODAL_DIVIDER)}>
                                <h4 className={STAFF_MODAL_SECTION_TITLE_SM}>{t("staff.role_compensation")}</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <label className={STAFF_MODAL_FIELD_LABEL}>{t("staff.current_role")}</label>
                                        <select
                                            value={formData.role}
                                            onChange={(e) => {
                                                const newRole = e.target.value;
                                                // Automatically set department if mapping exists
                                                const newDept = roleToDepartment[newRole] || formData.department;
                                                setFormData({ ...formData, role: newRole, department: newDept });
                                            }}
                                            className={STAFF_MODAL_SELECT}
                                        >
                                            <option value="SUPER_ADMIN">{roleOptionLabel("SUPER_ADMIN")}</option>
                                            <option value="ADMIN">{roleOptionLabel("ADMIN")}</option>
                                            <option value="OWNER">{roleOptionLabel("OWNER")}</option>
                                            <option value="MANAGER">{roleOptionLabel("MANAGER")}</option>
                                            <option value="CHEF">{roleOptionLabel("CHEF")}</option>
                                            <option value="WAITER">{roleOptionLabel("WAITER")}</option>
                                            <option value="KITCHEN_HELP">{roleOptionLabel("KITCHEN_HELP")}</option>
                                            <option value="BARTENDER">{roleOptionLabel("BARTENDER")}</option>
                                            <option value="RECEPTIONIST">{roleOptionLabel("RECEPTIONIST")}</option>
                                            <option value="CLEANER">{roleOptionLabel("CLEANER")}</option>
                                            <option value="SECURITY">{roleOptionLabel("SECURITY")}</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className={STAFF_MODAL_FIELD_LABEL}>{t("staff.department")}</label>
                                        <select
                                            value={formData.department}
                                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                            className={STAFF_MODAL_SELECT}
                                        >
                                            <option value="">{t("common.unassigned")}</option>
                                            <option value="Management">{t("staff.departments.management")}</option>
                                            <option value="Kitchen">{t("staff.departments.kitchen")}</option>
                                            <option value="Front of House">{t("staff.departments.front_of_house")}</option>
                                            <option value="Operations">{t("staff.departments.operations")}</option>
                                            <option value="Service">{t("staff.departments.service")}</option>
                                            <option value="Bar">{t("staff.departments.bar")}</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className={STAFF_MODAL_FIELD_LABEL}>{t("staff.salary_wage")}</label>
                                        <div className="flex gap-2">
                                            <Input
                                                type="number"
                                                value={formData.hourly_rate}
                                                onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) })}
                                                className={STAFF_MODAL_SALARY_INPUT}
                                            />
                                            <select
                                                value={formData.salary_type}
                                                onChange={(e) => setFormData({ ...formData, salary_type: e.target.value as 'HOURLY' | 'MONTHLY' })}
                                                className={STAFF_MODAL_SALARY_TYPE_SELECT}
                                            >
                                                <option value="HOURLY">{t("staff.per_hour_short")}</option>
                                                <option value="MONTHLY">{t("staff.per_month_short")}</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Promotion History */}
                            <div className={cn("space-y-4 pt-4 border-t", STAFF_MODAL_DIVIDER)}>
                                <div className="flex items-center justify-between">
                                    <h4 className={STAFF_MODAL_SECTION_TITLE_SM}>{t("staff.promotion_history")}</h4>
                                    {!isPromoting && (
                                        <Button variant="ghost" size="sm" className="text-emerald-600 dark:text-emerald-400 font-black text-[9px] uppercase tracking-widest hover:bg-emerald-50 dark:hover:bg-emerald-900/20" onClick={() => setIsPromoting(true)}>
                                            <TrendingUp className="w-3 h-3 mr-1" /> {t("staff.promote_staff")}
                                        </Button>
                                    )}
                                </div>

                                {isPromoting && (
                                    <div className="p-6 bg-emerald-50/50 dark:bg-emerald-900/20 rounded-3xl border border-emerald-100 dark:border-emerald-800/50 space-y-4 animate-in fade-in slide-in-from-top-2">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <label className={STAFF_MODAL_FIELD_LABEL}>{t("staff.new_role")}</label>
                                                <select
                                                    value={promoRole}
                                                    onChange={(e) => setPromoRole(e.target.value)}
                                                    className={STAFF_MODAL_SELECT}
                                                >
                                                    <option value="SUPER_ADMIN">{roleOptionLabel("SUPER_ADMIN")}</option>
                                                    <option value="ADMIN">{roleOptionLabel("ADMIN")}</option>
                                                    <option value="OWNER">{roleOptionLabel("OWNER")}</option>
                                                    <option value="MANAGER">{roleOptionLabel("MANAGER")}</option>
                                                    <option value="CHEF">{roleOptionLabel("CHEF")}</option>
                                                    <option value="WAITER">{roleOptionLabel("WAITER")}</option>
                                                    <option value="KITCHEN_HELP">{roleOptionLabel("KITCHEN_HELP")}</option>
                                                    <option value="BARTENDER">{roleOptionLabel("BARTENDER")}</option>
                                                    <option value="CLEANER">{roleOptionLabel("CLEANER")}</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className={STAFF_MODAL_FIELD_LABEL}>{t("staff.effective_date")}</label>
                                                <Input disabled value={format(new Date(), "PPP")} className={cn(STAFF_MODAL_INPUT, "opacity-70 cursor-not-allowed")} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className={STAFF_MODAL_FIELD_LABEL}>{t("staff.promotion_notes")}</label>
                                            <textarea
                                                value={promoNote}
                                                onChange={(e) => setPromoNote(e.target.value)}
                                                placeholder={t("staff.promotion_reason_placeholder")}
                                                className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 focus:ring-emerald-500 focus:border-emerald-500 font-medium text-sm min-h-[100px] placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" className="flex-1 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setIsPromoting(false)}>{t("common.cancel")}</Button>
                                            <Button className="flex-2 h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg px-8" onClick={handlePromote}>{t("staff.confirm_promotion")}</Button>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {promotions.length > 0 ? promotions.map((p, i) => (
                                        <div key={i} className="flex items-start gap-3 bg-slate-50/50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                                            <div className="bg-card p-2 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                                                <Briefcase className="w-4 h-4 text-emerald-500" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-black text-slate-700 dark:text-slate-200">{p.role}</p>
                                                    <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{p.date}</p>
                                                </div>
                                                {p.note && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">"{p.note}"</p>}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 h-6 w-6"
                                                onClick={() => setPromotions(promotions.filter((_, idx) => idx !== i))}
                                                aria-label={t("staff.remove_promotion")}
                                            >
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    )) : (
                                        <div className={STAFF_MODAL_EMPTY}>
                                            <p className={STAFF_MODAL_EMPTY_TEXT_SM}>{t("staff.no_promotion_records")}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Documents Section */}
                            <div className={cn("space-y-4 pt-4 border-t", STAFF_MODAL_DIVIDER)}>
                                <div className="flex items-center justify-between">
                                    <h4 className={STAFF_MODAL_SECTION_TITLE_SM}>{t("staff.documents")}</h4>
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
                                                    toast.error(getErrorMessage(err, t("staff.errors.upload_document")));
                                                } finally {
                                                    setIsUploading(false);
                                                }
                                            }}
                                            disabled={isUploading}
                                        />
                                        <div className="flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors uppercase tracking-widest">
                                            {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-4 h-4" />}
                                            {t("staff.upload_document")}
                                        </div>
                                    </label>
                                </div>
                                <div className="space-y-3">
                                    {documents.length > 0 ? (
                                        documents.map((doc, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 transition-all hover:bg-slate-100/80 dark:hover:bg-slate-800/80">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="w-8 h-8 rounded-lg bg-card flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-700">
                                                        <FileText className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{doc.title}</span>
                                                        <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400">{format(new Date(doc.uploaded_at), "PPP")}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <a
                                                        href={getDocumentUrl(doc.file)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        aria-label={t("staff.download_document", { title: doc.title })}
                                                        title={t("staff.download_document", { title: doc.title })}
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-slate-900 transition-all"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </a>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="w-8 h-8 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-white dark:hover:bg-slate-900 transition-all"
                                                        aria-label={t("staff.delete_document", { title: doc.title })}
                                                        title={t("staff.delete_document", { title: doc.title })}
                                                        onClick={async () => {
                                                            if (!confirm(t("errors.confirm_delete_document"))) return;
                                                            try {
                                                                const token = localStorage.getItem("access_token") || "";
                                                                await api.deleteStaffDocument(token, doc.id);
                                                                toast.success(t("toasts.document_deleted"));
                                                                fetchDocuments(selectedMember.id);
                                                            } catch (err: unknown) {
                                                                toast.error(getErrorMessage(err, t("staff.errors.delete_document")));
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className={cn(STAFF_MODAL_EMPTY, "flex flex-col items-center justify-center py-8")}>
                                            <p className={cn(STAFF_MODAL_EMPTY_TEXT_SM, "text-center")}>{t("staff.no_documents")}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Password Security */}
                            <div className={cn("space-y-3 pt-4 border-t", STAFF_MODAL_DIVIDER)}>
                                <div className="flex items-center justify-between">
                                    <h4 className={STAFF_MODAL_SECTION_TITLE_SM}>{t("staff.security")}</h4>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={cn(
                                            "rounded-xl font-bold transition-all h-9 px-4 uppercase tracking-widest text-[9px]",
                                            showPasswordReset
                                                ? "border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20"
                                                : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 bg-white/60 dark:bg-slate-800/60"
                                        )}
                                        onClick={() => setShowPasswordReset(!showPasswordReset)}
                                    >
                                        {showPasswordReset ? t("common.cancel_reset") : t("common.reset_password")}
                                    </Button>
                                </div>
                                {showPasswordReset && (
                                    <div className="p-6 bg-slate-50/80 dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-3 animate-in fade-in slide-in-from-top-2">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Key className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                <label className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">{t("staff.new_password")}</label>
                                            </div>
                                            <div className="flex gap-3">
                                                <Input
                                                    type="password"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    placeholder={t("common.enter_password")}
                                                    className={STAFF_MODAL_INPUT}
                                                />
                                                <Button
                                                    className="h-9 bg-slate-900 dark:bg-slate-700 text-white font-bold rounded-lg px-8 hover:bg-slate-800 dark:hover:bg-slate-600 transition-all shadow-lg"
                                                    onClick={handleResetPassword}
                                                    disabled={isResetting}
                                                >
                                                    {isResetting ? <Loader2 className="w-4 h-4 animate-spin" /> : t("common.update")}
                                                </Button>
                                            </div>
                                            <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium ml-1">{t("staff.password_reset_hint")}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Danger zone: Deactivate / Remove - only for Owner or Super Admin, not for self */}
                            {(user?.role === "OWNER" || user?.role === "SUPER_ADMIN") && selectedMember && selectedMember.id !== user?.id && (
                                <div className={cn("space-y-3 pt-4 border-t", STAFF_MODAL_DIVIDER)}>
                                    <h4 className={STAFF_MODAL_SECTION_TITLE_SM}>{t("staff.danger_zone")}</h4>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" className="text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-900/20" onClick={() => { setStaffToDeactivate({ id: selectedMember.id, name: `${selectedMember.first_name} ${selectedMember.last_name}` }); setIsDeactivateModalOpen(true); }}>
                                            {t("staff.deactivate_staff")}
                                        </Button>
                                        <Button variant="outline" size="sm" className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => { setStaffToDelete({ id: selectedMember.id, name: `${selectedMember.first_name} ${selectedMember.last_name}` }); setIsDeleteModalOpen(true); }}>
                                            {t("staff.remove_staff")}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                        </CardContent>

                        <div className={cn(STAFF_MODAL_FOOTER, "shrink-0")}>
                            <Button variant="outline" className={STAFF_MODAL_CANCEL_BTN} onClick={() => setIsEditModalOpen(false)}>
                                {t("staff.cancel_changes")}
                            </Button>
                            <Button className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs shadow-lg shadow-emerald-600/20 dark:shadow-emerald-900/30" onClick={handleSave}>
                                {t("staff.save_information")}
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={handleAvatarFileChange}
            />
            {/* Modals */}
            {isViewModalOpen && <ViewProfileModal />}
            {isEditModalOpen && <EditProfileModal />}
            <AddPeopleDialog
                open={isInviteModalOpen}
                onOpenChange={setIsInviteModalOpen}
                locations={tenantLocations}
                onAdded={() => { refetchStaff(); refetchActivationPending(); }}
            />
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
            <MoveStaffBranchDialog
                open={moveDialogOpen}
                onOpenChange={(open) => {
                    setMoveDialogOpen(open);
                    if (!open) setMoveTargets([]);
                }}
                staff={moveTargets}
                locations={tenantLocations}
                onMoved={() => {
                    refetchStaff();
                    clearSelection();
                    setMoveTargets([]);
                }}
            />

            {/* Search & Actions */}
            <div className="flex w-full flex-wrap items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-card p-3">
                <div className="relative flex-1 min-w-[200px] sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder={t("staff.search")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-muted/50 border-border"
                    />
                </div>
                {multiBranch ? (
                    <select
                        value={branchFilter}
                        onChange={(e) => {
                            setBranchFilter(e.target.value);
                            setStaffPage(1);
                            clearSelection();
                        }}
                        className="h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-card px-3 text-sm text-slate-700 dark:text-slate-200"
                        aria-label={t("generic.from_branch")}
                    >
                        <option value="all">{t("generic.all_branches")}</option>
                        {tenantLocations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                                {loc.name}
                            </option>
                        ))}
                    </select>
                ) : null}
                <div className="flex items-center bg-muted p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={cn(
                            "p-1.5 rounded-md transition-all",
                            viewMode === 'grid'
                                ? "bg-card text-emerald-600 dark:text-emerald-400 shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                        title={t("common.grid_view")}
                        aria-label={t("common.grid_view")}
                        aria-pressed={viewMode === 'grid'}
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={cn(
                            "p-1.5 rounded-md transition-all",
                            viewMode === 'list'
                                ? "bg-card text-emerald-600 dark:text-emerald-400 shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                        title={t("common.list_view")}
                        aria-label={t("common.list_view")}
                        aria-pressed={viewMode === 'list'}
                    >
                        <List className="w-4 h-4" />
                    </button>
                </div>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white ml-auto" onClick={() => setIsInviteModalOpen(true)}>
                    <PlusCircle className="w-4 h-4 mr-2" />
                    {t("staff.add")}
                </Button>
            </div>

            {multiBranch && selectedStaffIds.length > 0 ? (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900 px-4 py-3">
                    <span className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                        {t("staff.selected_count", { count: selectedStaffIds.length })}
                        {branchFilter !== "all"
                            ? ` · ${tenantLocations.find((l) => l.id === branchFilter)?.name || ""}`
                            : ""}
                    </span>
                    <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => {
                            const targets = selectedStaffIds
                                .map((id) => selectedStaffById[id])
                                .filter(Boolean) as StaffMember[];
                            openMoveDialog(targets);
                        }}
                    >
                        <ArrowRightLeft className="w-4 h-4 mr-1.5" />
                        {t("generic.move_to_branch")}
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={clearSelection}
                    >
                        {t("staff.clear_selection")}
                    </Button>
                </div>
            ) : null}

            {/* Staff Directory */}
            <Card className="border border-border bg-card">
                <CardContent className="pt-6">
                    {isLoading ? (
                        viewMode === 'list' ? (
                            <TableSkeleton rowCount={6} colCount={multiBranch ? 6 : 5} />
                        ) : (
                            <CardGridSkeleton count={8} columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" />
                        )
                    ) : error ? (
                        <div className="text-center py-8 text-red-500">{t("staff.error_loading_staff")}</div>
                    ) : (
                        <>
                            {filteredStaff && filteredStaff.length > 0 ? (
                                viewMode === 'list' ? (
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-slate-100 dark:border-slate-800">
                                                {multiBranch ? (
                                                    <TableHead className="w-10">
                                                        <Checkbox
                                                            checked={
                                                                filteredStaff.length > 0 &&
                                                                filteredStaff.every((m) => selectedStaffIds.includes(m.id))
                                                            }
                                                            onCheckedChange={() => toggleSelectAllVisible()}
                                                            aria-label={t("staff.select_all_on_page")}
                                                        />
                                                    </TableHead>
                                                ) : null}
                                                <TableHead className="text-slate-500 dark:text-slate-400">{t("staff.table_name")}</TableHead>
                                                <TableHead className="text-slate-500 dark:text-slate-400">{t("staff.table_contact")}</TableHead>
                                                <TableHead className="text-slate-500 dark:text-slate-400">{t("staff.table_role")}</TableHead>
                                                {multiBranch ? (
                                                    <TableHead className="text-slate-500 dark:text-slate-400">{t("staff.add_people.branch")}</TableHead>
                                                ) : null}
                                                <TableHead className="text-slate-500 dark:text-slate-400">{t("staff.table_status")}</TableHead>
                                                <TableHead className="text-slate-500 dark:text-slate-400">{t("staff.table_actions")}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredStaff.map((member) => (
                                                <TableRow key={member.id} className="border-slate-100 dark:border-slate-800">
                                                    {multiBranch ? (
                                                        <TableCell>
                                                            <Checkbox
                                                                checked={selectedStaffIds.includes(member.id)}
                                                                onCheckedChange={() => toggleStaffSelected(member)}
                                                                aria-label={t("staff.select_member", { name: member.first_name })}
                                                            />
                                                        </TableCell>
                                                    ) : null}
                                                    <TableCell className="font-medium text-slate-900 dark:text-white">
                                                        <div className="flex items-center gap-3">
                                                            <StaffMemberAvatar
                                                                size="sm"
                                                                firstName={member.first_name}
                                                                lastName={member.last_name}
                                                                avatarUrl={member.avatar_url}
                                                            />
                                                            <span>
                                                                {member.first_name} {member.last_name}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-slate-600 dark:text-slate-300">
                                                        {isWhatsAppActivationEmail(member.email)
                                                            ? (member.phone || phoneFromWhatsAppEmail(member.email) || "-")
                                                            : (member.email || "-")}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="capitalize">
                                                            {staffRoleLabel(member)}
                                                        </Badge>
                                                    </TableCell>
                                                    {multiBranch ? (
                                                        <TableCell className="text-slate-600 dark:text-slate-300 text-sm">
                                                            <span className="inline-flex items-center gap-1">
                                                                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                                {member.primary_location_data?.name || "-"}
                                                            </span>
                                                        </TableCell>
                                                    ) : null}
                                                    <TableCell>
                                                        <Badge className={member.is_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700"}>
                                                            {member.is_active ? t("common.active") : t("common.inactive")}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1">
                                                            {multiBranch ? (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8"
                                                                    onClick={() => openMoveDialog([member])}
                                                                    title={t("generic.move_to_branch")}
                                                                    aria-label={t("generic.move_to_branch")}
                                                                >
                                                                    <ArrowRightLeft className="h-4 w-4" />
                                                                </Button>
                                                            ) : null}
                                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditProfile(member)} title={t("common.edit_profile")} aria-label={t("common.edit_profile")}>
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewProfile(member)} title={t("common.view_profile")} aria-label={t("common.view_profile")}>
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                        {filteredStaff.map((member) => {
                                            const isSelected = selectedStaffIds.includes(member.id);
                                            const contactLine = (() => {
                                                const email = member.email || "";
                                                const phone = member.phone || phoneFromWhatsAppEmail(email);
                                                const isWhatsApp =
                                                    isWhatsAppActivationEmail(email) ||
                                                    /^\d+@mizan\.ai$/i.test(email);
                                                if (isWhatsApp && phone) {
                                                    return { icon: MessageCircle, text: phone };
                                                }
                                                if (email && !isWhatsAppActivationEmail(email)) {
                                                    return { icon: Mail, text: email };
                                                }
                                                if (phone) {
                                                    return { icon: Phone, text: phone };
                                                }
                                                return { icon: Mail, text: t("common.not_provided") };
                                            })();
                                            const ContactIcon = contactLine.icon;
                                            return (
                                            <Card
                                                key={member.id}
                                                className={cn(
                                                    "staff-directory-card group relative overflow-hidden rounded-[1.4rem] border border-border/70",
                                                    isSelected && "staff-directory-card--selected",
                                                )}
                                            >
                                                <div className="staff-directory-card__band" aria-hidden />
                                                <div
                                                    className="staff-directory-card__actions absolute right-3 top-3 z-10 flex items-center gap-0.5 rounded-full p-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 max-sm:opacity-100"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                                        onClick={() => handleViewProfile(member)}
                                                        title={t("common.view_profile")}
                                                        aria-label={t("common.view_profile")}
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                                        onClick={() => handleEditProfile(member)}
                                                        title={t("common.edit_profile")}
                                                        aria-label={t("common.edit_profile")}
                                                    >
                                                        <Edit className="h-3.5 w-3.5" />
                                                    </Button>
                                                    {multiBranch ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                                            onClick={() => openMoveDialog([member])}
                                                            title={t("generic.move_to_branch")}
                                                                    aria-label={t("generic.move_to_branch")}
                                                        >
                                                            <ArrowRightLeft className="h-3.5 w-3.5" />
                                                        </Button>
                                                    ) : null}
                                                </div>
                                                <CardContent className="relative z-[1] flex flex-col items-center px-5 pb-5 pt-8 text-center">
                                                    {multiBranch ? (
                                                        <div className="absolute left-3 top-3 z-[2]">
                                                            <Checkbox
                                                                checked={isSelected}
                                                                onCheckedChange={() => toggleStaffSelected(member)}
                                                                aria-label={t("staff.select_member", { name: member.first_name })}
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        </div>
                                                    ) : null}
                                                    <button
                                                        type="button"
                                                        className="flex w-full flex-col items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                                        onClick={() => handleViewProfile(member)}
                                                    >
                                                        <div className="staff-directory-avatar-wrap">
                                                            <StaffMemberAvatar
                                                                size="lg"
                                                                firstName={member.first_name}
                                                                lastName={member.last_name}
                                                                avatarUrl={member.avatar_url}
                                                                onUploadClick={() => openAvatarUpload(member.id)}
                                                                uploadLabel={t("staff.avatar.change", { defaultValue: "Change photo" })}
                                                            />
                                                        </div>
                                                        <div className="min-w-0 w-full space-y-1">
                                                            <h3 className="truncate px-1 text-[1.05rem] font-semibold tracking-tight text-foreground">
                                                                {member.first_name} {member.last_name}
                                                            </h3>
                                                            <p className="truncate text-xs font-medium capitalize text-primary">
                                                                {staffRoleLabel(member)}
                                                            </p>
                                                        </div>
                                                    </button>
                                                    <p className="mt-3 flex w-full min-w-0 items-center justify-center gap-1.5 px-1 text-xs text-muted-foreground">
                                                        <ContactIcon className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                                                        <span className="truncate">{contactLine.text}</span>
                                                    </p>
                                                    {multiBranch && member.primary_location_data?.name ? (
                                                        <p className="mt-1 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                                                            <MapPin className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
                                                            <span className="truncate">{member.primary_location_data.name}</span>
                                                        </p>
                                                    ) : null}
                                                    <div
                                                        className={cn(
                                                            "mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
                                                            member.is_active
                                                                ? "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"
                                                                : "bg-red-500/10 text-red-700 dark:bg-red-400/10 dark:text-red-300",
                                                        )}
                                                    >
                                                        <span
                                                            className={cn(
                                                                "h-1.5 w-1.5 rounded-full",
                                                                member.is_active ? "bg-emerald-500 shadow-[0_0_0_3px_hsl(152_60%_45%/0.18)] dark:bg-emerald-400" : "bg-red-500 dark:bg-red-400",
                                                            )}
                                                            aria-hidden
                                                        />
                                                        {member.is_active ? t("common.active") : t("common.inactive")}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                            );
                                        })}
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
                                count={
                                    staffData?.count ??
                                    (filteredStaff.length > 0 ? filteredStaff.length : 0)
                                }
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
            <Card className="border-slate-100 dark:border-slate-800 bg-card">
                <CardHeader>
                    <CardTitle className="text-slate-900 dark:text-white">{t("staff.pending.title")}</CardTitle>
                    <CardDescription className="text-slate-500 dark:text-slate-400">{t("staff.pending.subtitle")}</CardDescription>
                </CardHeader>
                <CardContent>
                    {isActivationPendingLoading && !activationPendingData ? (
                        <TableSkeleton rowCount={4} colCount={5} />
                    ) : pendingActivations.length > 0 ? (
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
                                                {pa.first_name || "-"} {pa.last_name || ""}
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
                                                <Badge className={pa.status === "not_delivered" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"}>
                                                    {t(`staff.pending.wa_status.${pa.status === "sent" || pa.status === "not_delivered" ? pa.status : "pending"}`)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button variant="outline" size="sm" className="text-emerald-600 hover:text-emerald-700 border-emerald-200" onClick={() => handleResendWelcome(pa.id)}>
                                                        <Send className="w-3.5 h-3.5 mr-1.5" />
                                                        {t("staff.pending.resend")}
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700" onClick={() => handleDeletePendingActivation(pa.id)} title={t("staff.pending.delete")} aria-label={t("staff.pending.delete")}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </>
                    ) : (
                        <div className="text-center py-8 text-slate-500">{t("staff.pending.none")}</div>
                    )}
                </CardContent>
            </Card>
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
    const { t } = useLanguage();
    const [searchParams] = useSearchParams();

    // Legacy People deep-links.
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl === "attendance") {
        return <Navigate to="/dashboard/employees/attendance" replace />;
    }
    if (tabFromUrl === "requests") {
        return <Navigate to="/dashboard/staff-requests" replace />;
    }
    if (tabFromUrl === "presence" || tabFromUrl === "insights" || tabFromUrl === "team") {
        return <Navigate to="/dashboard/employees/people" replace />;
    }

    return (
        <div className={`${PAGE_SHELL_PADDED} space-y-6 min-w-0`}>
            <header className="space-y-1">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t("staff.page.title")}</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                    {t("staff.page.subtitle")}
                </p>
            </header>

            <TeamTab />
        </div>
    );
}
