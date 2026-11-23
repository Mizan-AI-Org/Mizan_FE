import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { X, Search, Check, ChevronDown, Plus, Trash2, Pencil } from "lucide-react";
import { useTaskTemplates } from "@/hooks/useTaskTemplates";
import { useAuth } from "@/hooks/use-auth";
import { AuthContextType } from "@/contexts/AuthContext.types";
import type { Shift, TaskPriority } from "@/types/schedule";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

interface StaffMember {
    id: string;
    user?: {
        id: string;
        first_name: string;
        last_name: string;
    };
    first_name?: string;
    last_name?: string;
    role?: string;
    avatar_url?: string;
}

interface TemplateTask {
    title: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    estimated_duration?: number;
}

interface TaskTemplate {
    id: string;
    name: string;
    description?: string;
    template_type?: string;
    tasks?: TemplateTask[];
}

interface ShiftModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (shift: Shift) => void;
    onDelete?: (shiftId: string) => void;
    initialShift?: Shift | null;
    /** Default calendar date when opening an empty create flow (YYYY-MM-DD). */
    referenceDate?: string;
    dayIndex?: number;
    hour?: number;
    staffMembers: StaffMember[];
    testDefaultTemplateId?: string;
    /** Open persisted shifts in read-only view (e.g. list view card click). */
    opensInViewMode?: boolean;
    canEdit?: boolean;
}

import { format, parseISO } from "date-fns";
import { cn, getStaffColor } from "@/lib/utils";
import { isPersistedShift, resolveStaffForShiftId, staffDisplayName } from "@/lib/shiftDisplay";
import { shiftTaskPriorityLabel, shiftTaskPriorityStyles } from "@/lib/shiftTaskPriority";

/** Staff dropdown only — main modal uses a single scroll container. */
const STAFF_LIST_SCROLL =
    "max-h-[min(280px,42vh)] overflow-y-auto overflow-x-hidden overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch]";

const TEMPLATE_LIST_SCROLL =
    "max-h-[min(240px,30vh)] overflow-y-auto overflow-x-hidden overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch]";

function collectTemplateIds(shift?: Shift | null): string[] {
    if (!shift) return [];
    const ids: string[] = [];
    for (const id of shift.task_templates ?? []) {
        const s = String(id).trim();
        if (s) ids.push(s);
    }
    for (const row of shift.task_templates_details ?? []) {
        const s = String(row.id ?? "").trim();
        if (s) ids.push(s);
    }
    return [...new Set(ids)];
}

function templateIdSelected(selectedIds: string[], templateId: string): boolean {
    const norm = String(templateId).trim().toLowerCase();
    return selectedIds.some((id) => String(id).trim().toLowerCase() === norm);
}

/** When a nested list hits top/bottom, let the wheel event scroll the modal body. */
function handleNestedListWheel(e: React.WheelEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.scrollHeight <= el.clientHeight + 1) return;
    const atTop = el.scrollTop <= 0;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
    if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) return;
    e.stopPropagation();
}

const MODAL_BODY_SCROLL =
    "flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch] [scrollbar-gutter:stable]";

/** Full-field click opens the native date picker (not only the calendar icon). */
const SHIFT_DATE_INPUT_CLASS = cn(
    "relative h-12 cursor-pointer rounded-xl border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 focus:ring-[#106B4E] focus:border-[#106B4E]",
    "[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:left-0 [&::-webkit-calendar-picker-indicator]:top-0",
    "[&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full",
    "[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0",
);

function openNativeDatePicker(input: HTMLInputElement) {
    if (typeof input.showPicker === "function") {
        try {
            input.showPicker();
            return;
        } catch {
            /* picker may already be open */
        }
    }
    input.focus();
}

const ShiftModal: React.FC<ShiftModalProps> = ({
    isOpen,
    onClose,
    onSave,
    onDelete,
    initialShift,
    referenceDate,
    dayIndex,
    hour,
    staffMembers,
    testDefaultTemplateId,
    opensInViewMode = false,
    canEdit = true,
}) => {
    const editingPersistedShift = isPersistedShift(initialShift);
    const [isViewMode, setIsViewMode] = useState(false);
    const { user } = useAuth() as AuthContextType;
    const { t } = useLanguage();

    const toYMD = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const getWeekStart = (d: Date) => {
        const date = new Date(d);
        const day = date.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        date.setDate(date.getDate() + diff);
        date.setHours(0, 0, 0, 0);
        return date;
    };

    const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
    const [isRecurring, setIsRecurring] = useState(false);
    const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM'>('WEEKLY');
    const [daysOfWeek, setDaysOfWeek] = useState<number[]>([0, 2, 4]); // Mon, Wed, Fri default for Custom (0=Mon, 6=Sun)
    const [recurringEndDate, setRecurringEndDate] = useState<string>('');
    const [isStaffPopoverOpen, setIsStaffPopoverOpen] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>("MEDIUM");
    const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
    const [staffSearch, setStaffSearch] = useState("");
    const [templateSearch, setTemplateSearch] = useState("");
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const buildEmptyShift = (draft?: Shift | null): Shift => {
        const startHour = draft?.start?.slice(0, 2) ?? (hour !== undefined ? String(hour).padStart(2, "0") : "09");
        const endHour = draft?.end?.slice(0, 2) ?? (hour !== undefined ? String(hour + 1).padStart(2, "0") : "17");
        const start = draft?.start ?? `${startHour}:00`;
        const end = draft?.end ?? `${endHour}:00`;
        let date = draft?.date;
        if (!date) {
            if (referenceDate) {
                date = referenceDate;
            } else {
                const today = new Date();
                const monday = getWeekStart(today);
                const base = new Date(monday);
                base.setDate(monday.getDate() + (dayIndex !== undefined ? dayIndex : draft?.day ?? 0));
                date = toYMD(base);
            }
        }
        return {
            id: draft?.id || `temp-${Date.now()}`,
            title: draft?.title ?? "",
            start,
            end,
            date,
            day: draft?.day ?? (dayIndex !== undefined ? dayIndex : 0),
            staffId: "",
            color: "#6b7280",
            tasks: draft?.tasks ?? [],
            task_templates: draft?.task_templates ?? [],
            task_templates_details: draft?.task_templates_details,
            staff_members: draft?.staff_members ?? [],
            staff_members_details: draft?.staff_members_details,
            role: draft?.role,
            location: draft?.location,
            location_data: draft?.location_data,
            isRecurring: false,
            frequency: "WEEKLY",
        };
    };

    const [shiftData, setShiftData] = useState<Shift>(() => {
        if (initialShift && isPersistedShift(initialShift) && initialShift.date) return initialShift;
        if (initialShift?.date) return buildEmptyShift(initialShift);
        return buildEmptyShift();
    });

    useEffect(() => {
        if (!isOpen) {
            setIsViewMode(false);
            return;
        }

        if (initialShift && isPersistedShift(initialShift)) {
            let finalShift = initialShift;
            if (!initialShift.date) {
                const today = new Date();
                const monday = getWeekStart(today);
                const base = new Date(monday);
                base.setDate(monday.getDate() + (initialShift.day ?? 0));
                finalShift = { ...initialShift, date: toYMD(base) };
            }
            setShiftData(finalShift);
            setSelectedStaffIds(
                finalShift.staff_members?.length
                    ? finalShift.staff_members
                    : finalShift.staffId
                      ? [finalShift.staffId]
                      : [],
            );
            setSelectedTemplateIds(collectTemplateIds(finalShift));
            setIsRecurring(finalShift.isRecurring || false);
            setFrequency(finalShift.frequency || "WEEKLY");
            setDaysOfWeek(finalShift.days_of_week ?? [0, 2, 4]);
            setRecurringEndDate(finalShift.recurringEndDate || "");
            setIsViewMode(Boolean(opensInViewMode));
            return;
        }

        const draft = buildEmptyShift(initialShift);
        setShiftData(draft);
        setSelectedStaffIds(initialShift?.staff_members?.length ? initialShift.staff_members : []);
        setSelectedTemplateIds(collectTemplateIds(initialShift));
        setIsRecurring(false);
        setFrequency("WEEKLY");
        setDaysOfWeek([0, 2, 4]);
        setRecurringEndDate("");
        setStaffSearch("");
        setIsViewMode(false);
    }, [initialShift, isOpen, dayIndex, hour, referenceDate, opensInViewMode]);

    const {
        templates,
        loading: templatesLoading,
    } = useTaskTemplates({ pollIntervalMs: 30_000 });

    useEffect(() => {
        if (!isOpen) return;
        const source = initialShift ?? shiftData;
        const ids = collectTemplateIds(source);
        if (!ids.length) return;
        setSelectedTemplateIds((prev) => {
            const merged = [...new Set([...prev, ...ids])];
            if (merged.length === prev.length && merged.every((id, i) => id === prev[i])) {
                return prev;
            }
            return merged;
        });
    }, [isOpen, initialShift, shiftData.id, shiftData.task_templates, shiftData.task_templates_details, templatesLoading]);

    const toggleStaffSelection = (staffId: string) => {
        setSelectedStaffIds(prev =>
            prev.includes(staffId)
                ? prev.filter(id => id !== staffId)
                : [...prev, staffId]
        );
    };

    const handleAddManualTask = () => {
        if (!newTaskTitle.trim()) {
            toast.error(t("generic.toast.task_title_cannot_be_empty"));
            return;
        }
        const newTask = {
            title: newTaskTitle.trim(),
            priority: newTaskPriority,
        };
        setShiftData({
            ...shiftData,
            tasks: [...(shiftData.tasks || []), newTask]
        });
        setNewTaskTitle("");
        setNewTaskPriority("MEDIUM");
    };

    const handleRemoveManualTask = (index: number) => {
        setShiftData({
            ...shiftData,
            tasks: (shiftData.tasks || []).filter((_, i) => i !== index)
        });
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            if (!(shiftData.title ?? '').trim()) {
                toast.error(t("shift_modal.err_title_required"));
                setIsSubmitting(false);
                return;
            }
            if (!shiftData.date || String(shiftData.date).trim() === "") {
                toast.error(t("shift_modal.err_date_required"));
                setIsSubmitting(false);
                return;
            }
            if (selectedStaffIds.length === 0) {
                toast.error(t("shift_modal.err_staff_required"));
                setIsSubmitting(false);
                return;
            }
            const hasTemplates = selectedTemplateIds.length > 0;
            const pendingTaskTitle = (typeof newTaskTitle === 'string' ? newTaskTitle : '').trim();
            const effectiveTasks = pendingTaskTitle
                ? [...(shiftData.tasks || []), { title: pendingTaskTitle, priority: newTaskPriority }]
                : (shiftData.tasks || []);
            const hasCustomTasks = effectiveTasks.length > 0;
            if (!hasTemplates && !hasCustomTasks) {
                toast.error(t("shift_modal.err_tasks_required"));
                setIsSubmitting(false);
                return;
            }
            if (isRecurring && !recurringEndDate) {
                toast.error(t("shift_modal.err_end_date_required"));
                setIsSubmitting(false);
                return;
            }
            if (isRecurring && frequency === 'CUSTOM' && daysOfWeek.length === 0) {
                toast.error(t("shift_modal.err_custom_days_required"));
                setIsSubmitting(false);
                return;
            }

            const shiftWithTemplates = {
                ...shiftData,
                staffId: selectedStaffIds[0] ?? "",
                color: getStaffColor(selectedStaffIds[0]),
                staffIds: selectedStaffIds,
                staff_members: selectedStaffIds, // So save uses all selected staff
                isRecurring: isRecurring === true,
                frequency: isRecurring ? frequency : undefined,
                ...(isRecurring && frequency === "CUSTOM" && daysOfWeek.length > 0
                    ? { days_of_week: daysOfWeek }
                    : {}),
                recurringEndDate: isRecurring ? recurringEndDate : undefined,
                task_templates: selectedTemplateIds,
                tasks: effectiveTasks // manual tasks (includes pending input if user didn't click +)
            };
            await Promise.resolve(onSave(shiftWithTemplates));
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatClock12 = (timeStr: string) => {
        if (!timeStr) return "—";
        const [hours, minutes] = timeStr.split(":");
        const h = parseInt(hours, 10);
        if (Number.isNaN(h)) return timeStr;
        const ampm = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 || 12;
        return `${h12}:${minutes || "00"} ${ampm}`;
    };

    const viewStaffRows = useMemo(() => {
        const details = initialShift?.staff_members_details;
        return selectedStaffIds.map((id) => {
            const staff = resolveStaffForShiftId(id, staffMembers, details);
            return {
                id,
                name: staffDisplayName(staff),
                role: staff?.role || initialShift?.role,
            };
        });
    }, [selectedStaffIds, staffMembers, initialShift]);

    const viewTasks = useMemo(
        () => (shiftData.tasks?.length ? shiftData.tasks : initialShift?.tasks) ?? [],
        [shiftData.tasks, initialShift?.tasks],
    );

    const linkedTemplateDetails = useMemo(() => {
        const fromApi =
            initialShift?.task_templates_details?.length
                ? initialShift.task_templates_details
                : shiftData.task_templates_details;
        if (fromApi?.length) return fromApi;
        if (!selectedTemplateIds.length || !templates?.length) return [];
        return selectedTemplateIds
            .map((id) => templates.find((tpl) => templateIdSelected([String(tpl.id)], id)))
            .filter((tpl): tpl is TaskTemplate => Boolean(tpl))
            .map((tpl) => ({ id: String(tpl.id), name: tpl.name, title: tpl.name }));
    }, [
        initialShift?.task_templates_details,
        shiftData.task_templates_details,
        selectedTemplateIds,
        templates,
    ]);

    const viewTemplateDetails = linkedTemplateDetails;

    const viewLocationName =
        shiftData.location_data?.name ||
        initialShift?.location_data?.name ||
        null;

  return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent className="flex max-h-[min(92vh,920px)] min-h-0 flex-col gap-0 overflow-hidden border-none bg-card p-6 shadow-2xl sm:max-w-[700px] sm:rounded-3xl">
                <DialogHeader className="pb-2 shrink-0">
                    <DialogTitle className="text-xl font-bold text-[#1F2937] dark:text-gray-100">
                        {isViewMode
                            ? t("common.view_schedule")
                            : editingPersistedShift
                              ? t("schedule.edit_schedule")
                              : t("schedule.create_schedule")}
                    </DialogTitle>
                </DialogHeader>

                {isViewMode ? (
                    <div className={cn("mt-4 min-w-0 flex-1 space-y-5 pr-1 pb-1", MODAL_BODY_SCROLL)}>
                        <section className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                {t("schedule.shift_title")}
                            </p>
                            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                {(shiftData.title || "").trim() || "—"}
                            </p>
                        </section>

                        <section className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                {t("schedule.assigned_staff", "Assigned staff")}
                            </p>
                            {viewStaffRows.length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400">—</p>
                            ) : (
                                <ul className="space-y-2">
                                    {viewStaffRows.map((row) => (
                                        <li
                                            key={row.id}
                                            className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50"
                                        >
                                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                {row.name}
                                            </span>
                                            {row.role ? (
                                                <span className="shrink-0 rounded-md bg-green-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-800 dark:bg-green-900/40 dark:text-green-300">
                                                    {row.role}
                                                </span>
                                            ) : null}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>

                        {viewLocationName ? (
                            <section className="space-y-1">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    {t("common.location", "Location")}
                                </p>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{viewLocationName}</p>
                            </section>
                        ) : null}

                        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="rounded-xl border border-gray-100 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/40">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{t("common.date")}</p>
                                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    {shiftData.date
                                        ? format(parseISO(shiftData.date), "EEE, MMM d, yyyy")
                                        : "—"}
                                </p>
                            </div>
                            <div className="rounded-xl border border-gray-100 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/40">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{t("common.start")}</p>
                                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    {formatClock12(shiftData.start)}
                                </p>
                            </div>
                            <div className="rounded-xl border border-gray-100 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/40">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{t("common.end")}</p>
                                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    {formatClock12(shiftData.end)}
                                </p>
                            </div>
                        </section>

                        <section className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{t("generic.recurring")}</p>
                            <p className="mt-1 text-sm font-medium text-gray-800 dark:text-gray-200">
                                {isRecurring
                                    ? `${t(`shift_modal.freq_${String(frequency).toLowerCase()}`, String(frequency))}${recurringEndDate ? ` · ${t("shift_modal.until_date", { date: format(parseISO(recurringEndDate), "MMM d, yyyy") })}` : ""}`
                                    : t("common.no", "No")}
                            </p>
                        </section>

                        <section className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                {t("shift_modal.templates_label")}
                            </p>
                            {viewTemplateDetails.length === 0 ? (
                                <p className="rounded-xl border border-dashed border-gray-200 px-3 py-4 text-center text-sm text-gray-500 dark:border-slate-600 dark:text-gray-400">
                                    {t("schedule.no_templates_linked", "No templates linked to this shift.")}
                                </p>
                            ) : (
                                <ul className="space-y-2">
                                    {viewTemplateDetails.map((tpl) => (
                                        <li
                                            key={tpl.id}
                                            className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-sm font-semibold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
                                        >
                                            {tpl.name || tpl.title}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>

                        <section className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                {t("shift_modal.custom_tasks")}
                            </p>
                            {viewTasks.length === 0 ? (
                                <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-3">
                                    {t("schedule.no_custom_tasks_yet", "No custom tasks added yet.")}
                                </p>
                            ) : (
                                <ul className="space-y-2">
                                    {viewTasks.map((task, index) => {
                                        const priority = (task.priority || "MEDIUM") as TaskPriority;
                                        const styles = shiftTaskPriorityStyles(priority);
                                        return (
                                            <li
                                                key={`${task.title}-${index}`}
                                                className={cn(
                                                    "flex items-center justify-between gap-3 rounded-xl border border-l-4 bg-white p-3 dark:bg-slate-900/60",
                                                    styles.row,
                                                    styles.accent,
                                                )}
                                            >
                                                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                    {task.title}
                                                </span>
                                                <span
                                                    className={cn(
                                                        "shrink-0 rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
                                                        styles.badge,
                                                    )}
                                                >
                                                    {shiftTaskPriorityLabel(priority, t)}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </section>
                    </div>
                ) : (
                <div
                    className={cn(
                        "mt-4 min-w-0 flex-1",
                        MODAL_BODY_SCROLL,
                        "space-y-5 pr-1 pb-1",
                    )}
                >
                    <div className="space-y-1">
                        <Label className="text-sm font-semibold text-[#1F2937] dark:text-gray-100">{t("schedule.shift_title")}</Label>
                        <Input
                            id="title"
                            placeholder={t("schedule.shift_title_placeholder")}
                            value={shiftData.title}
                            onChange={(e) => setShiftData(prev => ({ ...prev, title: e.target.value }))}
                            className="h-12 rounded-xl border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 focus:ring-[#106B4E] focus:border-[#106B4E]"
                        />
                    </div>

                    {/* Multi-Staff Selection */}
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-[#1F2937] dark:text-gray-100">{t("shift_modal.assign_staff_count", { count: selectedStaffIds.length })}</Label>
                        <Popover modal={false} open={isStaffPopoverOpen} onOpenChange={setIsStaffPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full h-12 bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/40 text-orange-900 dark:text-orange-200 border-none rounded-xl px-4 flex justify-between items-center text-base font-medium transition-colors shadow-sm"
                                >
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        {selectedStaffIds.length > 0 ? (
                                            <span className="truncate">
                                                {selectedStaffIds.length === 1
                                                    ? staffDisplayName(
                                                          resolveStaffForShiftId(
                                                              selectedStaffIds[0],
                                                              staffMembers,
                                                              initialShift?.staff_members_details,
                                                          ),
                                                      )
                                                    : t("shift_modal.members_selected", { count: selectedStaffIds.length })}
                                            </span>
                                        ) : (
                                            <span className="text-orange-900/50 dark:text-orange-300/50">{t("shift_modal.select_staff_members")}</span>
                                        )}
                                    </div>
                                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl shadow-2xl border-gray-100 dark:border-slate-700 dark:bg-slate-900 overflow-hidden z-[9999]" align="start">
                                <Command className="rounded-xl border-none">
                                    <CommandInput
                                        placeholder={t("common.search_staff")}
                                        className="h-12 border-none focus:ring-0"
                                        value={staffSearch}
                                        onValueChange={setStaffSearch}
                                    />
                                    <CommandList
                                        className={STAFF_LIST_SCROLL}
                                        onWheel={handleNestedListWheel}
                                    >
                                        <CommandEmpty className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">{t("shift_modal.no_staff_found")}</CommandEmpty>
                                        <CommandGroup>
                                            {staffMembers
                                                .filter(s => String(s.user?.id) !== String(user?.id))
                                                .map((s) => (
                                                    <CommandItem
                                                        key={s.id}
                                                        value={`${s.user?.first_name || s.first_name || ""} ${s.user?.last_name || s.last_name || ""} ${s.role || ""}`}
                                                        onSelect={() => toggleStaffSelection(s.id)}
                                                        className="flex items-center gap-2 p-3 aria-selected:bg-orange-50 dark:aria-selected:bg-orange-900/20 cursor-pointer"
                                                    >
                                                        <div className={cn(
                                                            "w-5 h-5 rounded-md border flex items-center justify-center transition-colors",
                                                            selectedStaffIds.includes(s.id)
                                                                ? "bg-orange-500 border-orange-500"
                                                                : "border-orange-200 dark:border-slate-600 bg-surface-raised"
                                                        )}>
                                                            {selectedStaffIds.includes(s.id) && <Check className="h-3 w-3 text-white" />}
                                                        </div>
                                                        <Avatar className="h-8 w-8 ml-1">
                                                            <AvatarFallback className="text-xs bg-orange-100 text-orange-700">
                                                                {`${(s.user?.first_name || s.first_name || "")[0] || ""}${(s.user?.last_name || s.last_name || "")[0] || ""}`}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                                {`${s.user?.first_name || s.first_name || ""} ${s.user?.last_name || s.last_name || ""}`}
                                                            </span>
                                                            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">{s.role}</span>
                                                        </div>
                                                    </CommandItem>
                                                ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-sm font-semibold text-[#1F2937] dark:text-gray-100">{t("common.date")}</Label>
                            <div className="relative">
                                <Input
                                    type="date"
                                    value={shiftData.date}
                                    onChange={(e) => setShiftData((prev) => ({ ...prev, date: e.target.value }))}
                                    onClick={(e) => openNativeDatePicker(e.currentTarget)}
                                    onKeyDown={(e) => {
                                        if (e.key === " " || e.key === "Enter") {
                                            e.preventDefault();
                                            openNativeDatePicker(e.currentTarget);
                                        }
                                    }}
                                    className={SHIFT_DATE_INPUT_CLASS}
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label className="text-sm font-semibold text-[#1F2937] dark:text-gray-100">{t("common.start")}</Label>
                                <Select
                                    value={shiftData.start}
                                    onValueChange={(value) => setShiftData(prev => ({ ...prev, start: value }))}
                                >
                                    <SelectTrigger className="h-12 rounded-xl border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100">
                                        <SelectValue placeholder={t("common.start")} />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[200px] z-[9999]">
                                        {Array.from({ length: 48 }, (_, i) => {
                                            const hour24 = Math.floor(i / 2);
                                            const min = i % 2 === 0 ? '00' : '30';
                                            const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
                                            const ampm = hour24 < 12 ? 'AM' : 'PM';
                                            const value = `${String(hour24).padStart(2, '0')}:${min}`;
                                            return (
                                                <SelectItem key={value} value={value}>
                                                    {hour12}:{min} {ampm}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-sm font-semibold text-[#1F2937] dark:text-gray-100">{t("common.end")}</Label>
                                <Select
                                    value={shiftData.end}
                                    onValueChange={(value) => setShiftData(prev => ({ ...prev, end: value }))}
                                >
                                    <SelectTrigger className="h-12 rounded-xl border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100">
                                        <SelectValue placeholder={t("common.end")} />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[200px] z-[9999]">
                                        {Array.from({ length: 48 }, (_, i) => {
                                            const hour24 = Math.floor(i / 2);
                                            const min = i % 2 === 0 ? '00' : '30';
                                            const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
                                            const ampm = hour24 < 12 ? 'AM' : 'PM';
                                            const value = `${String(hour24).padStart(2, '0')}:${min}`;
                                            return (
                                                <SelectItem key={value} value={value}>
                                                    {hour12}:{min} {ampm}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Recurring Shift Section */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl space-y-4 border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <Label className="text-sm font-bold text-slate-900 dark:text-gray-100 leading-none">{t("shift_modal.recurring_shift")}</Label>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{t("shift_modal.recurring_hint")}</p>
                            </div>
                            <div
                                onClick={() => setIsRecurring(!isRecurring)}
                                className={cn(
                                    "h-6 w-11 rounded-full p-1 cursor-pointer transition-colors duration-200",
                                    isRecurring ? "bg-[#106B4E]" : "bg-slate-300"
                                )}
                            >
                                <div className={cn(
                                    "h-4 w-4 rounded-full bg-white transition-transform duration-200",
                                    isRecurring ? "translate-x-5" : "translate-x-0"
                                )} />
                            </div>
                        </div>

                        {isRecurring && (
                            <div className="pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">{t("shift_modal.repeat")}</Label>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2">{t("shift_modal.repeat_help")}</p>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        variant={frequency === 'DAILY' ? 'default' : 'outline'}
                                        onClick={() => setFrequency('DAILY')}
                                        className={cn(
                                            "h-10 rounded-xl text-xs font-bold transition-all",
                                            frequency === 'DAILY' ? "bg-[#106B4E] hover:bg-[#0D5A41] text-white" : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                        )}
                                    >
                                        {t("shift_modal.freq_daily")}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={frequency === 'WEEKLY' ? 'default' : 'outline'}
                                        onClick={() => setFrequency('WEEKLY')}
                                        className={cn(
                                            "h-10 rounded-xl text-xs font-bold transition-all",
                                            frequency === 'WEEKLY' ? "bg-[#106B4E] hover:bg-[#0D5A41] text-white" : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                        )}
                                    >
                                        {t("shift_modal.freq_weekly")}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={frequency === 'MONTHLY' ? 'default' : 'outline'}
                                        onClick={() => setFrequency('MONTHLY')}
                                        className={cn(
                                            "h-10 rounded-xl text-xs font-bold transition-all",
                                            frequency === 'MONTHLY' ? "bg-[#106B4E] hover:bg-[#0D5A41] text-white" : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                        )}
                                    >
                                        {t("shift_modal.freq_monthly")}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={frequency === 'CUSTOM' ? 'default' : 'outline'}
                                        onClick={() => setFrequency('CUSTOM')}
                                        className={cn(
                                            "h-10 rounded-xl text-xs font-bold transition-all",
                                            frequency === 'CUSTOM' ? "bg-[#106B4E] hover:bg-[#0D5A41] text-white" : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                        )}
                                    >
                                        {t("shift_modal.freq_custom")}
                                    </Button>
                                </div>
                                {frequency === 'CUSTOM' && (
                                    <div className="mt-3">
                                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">{t("common.repeat_on")}</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const).map((label, i) => {
                                                const isSelected = daysOfWeek.includes(i);
                                                return (
                                                    <button
                                                        key={label}
                                                        type="button"
                                                        onClick={() => {
                                                            if (isSelected) setDaysOfWeek(daysOfWeek.filter(d => d !== i));
                                                            else setDaysOfWeek([...daysOfWeek, i].sort((a, b) => a - b));
                                                        }}
                                                        className={cn(
                                                            "w-10 h-10 rounded-xl text-xs font-bold transition-all border",
                                                            isSelected ? "bg-[#106B4E] text-white border-[#106B4E]" : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                                        )}
                                                    >
                                                        {t(`process.schedule.day_${label.toLowerCase()}`, label)}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {daysOfWeek.length === 0 && <p className="text-[10px] text-amber-600 mt-1">{t("shift_modal.select_one_day")}</p>}
                                    </div>
                                )}
                                <div className="mt-4">
                                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">{t("shift_modal.end_date")}</Label>
                                    <div className="relative">
                                        <Input
                                            type="date"
                                            value={recurringEndDate}
                                            onChange={(e) => setRecurringEndDate(e.target.value)}
                                            onClick={(e) => openNativeDatePicker(e.currentTarget)}
                                            onKeyDown={(e) => {
                                                if (e.key === " " || e.key === "Enter") {
                                                    e.preventDefault();
                                                    openNativeDatePicker(e.currentTarget);
                                                }
                                            }}
                                            min={shiftData.date}
                                            className={cn(SHIFT_DATE_INPUT_CLASS, "h-10")}
                                        />
                                    </div>
                                    {!recurringEndDate && <p className="text-[10px] text-amber-600 mt-1">{t("shift_modal.err_end_date_required")}</p>}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold text-[#1F2937] dark:text-gray-100">{t("shift_modal.templates_label")}</Label>
                            {!isViewMode ? (
                                <div className="relative w-48">
                                    <Input
                                        placeholder={t("common.search_templates")}
                                        value={templateSearch}
                                        onChange={(e) => setTemplateSearch(e.target.value)}
                                        className="h-8 rounded-lg border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 pl-8 pr-2 text-xs focus:ring-[#106B4E]"
                                    />
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                </div>
                            ) : null}
                        </div>
                        {!isViewMode && linkedTemplateDetails.length > 0 ? (
                            <div className="mb-2 flex flex-wrap gap-2">
                                {linkedTemplateDetails.map((tpl) => (
                                    <span
                                        key={tpl.id}
                                        className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                                    >
                                        {tpl.name || tpl.title}
                                    </span>
                                ))}
                            </div>
                        ) : null}
                        <div
                            className={cn(
                                "space-y-1 rounded-xl border border-gray-100 bg-[#F9FAFB] p-2 dark:border-slate-700 dark:bg-slate-800/50",
                                TEMPLATE_LIST_SCROLL,
                            )}
                            onWheel={handleNestedListWheel}
                        >
                            {templatesLoading ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">{t("shift_modal.loading_templates")}</p>
                            ) : (() => {
                                const pool = templates || [];
                                const filtered = isViewMode
                                    ? pool.filter((tpl) => templateIdSelected(selectedTemplateIds, String(tpl.id)))
                                    : pool.filter(
                                          (tpl) =>
                                              !templateSearch ||
                                              tpl.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
                                              (tpl.description || "").toLowerCase().includes(templateSearch.toLowerCase()),
                                      );
                                if (filtered.length === 0) {
                                    return (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                                            {isViewMode
                                                ? t("schedule.no_templates_linked", "No templates linked to this shift.")
                                                : t("shift_modal.no_templates_found")}
                                        </p>
                                    );
                                }
                                return filtered.map((template) => {
                                    const isSelected = templateIdSelected(selectedTemplateIds, String(template.id));
                                    return (
                                        <div
                                            key={template.id}
                                            className={cn(
                                                "flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-all border",
                                                isSelected
                                                    ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700 shadow-sm"
                                                    : "bg-surface-raised border-transparent hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-gray-200 dark:hover:border-slate-600"
                                            )}
                                            onClick={() => {
                                                const current = selectedTemplateIds;
                                                const id = String(template.id);
                                                const newIds = templateIdSelected(current, id)
                                                    ? current.filter((x) => !templateIdSelected([x], id))
                                                    : [...current, id];
                                                setSelectedTemplateIds(newIds);
                                            }}
                                        >
                                            <div className={cn(
                                                "mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0",
                                                isSelected
                                                    ? "bg-[#106B4E] border-[#106B4E]"
                                                    : "border-gray-300 dark:border-slate-600 bg-surface-raised"
                                            )}>
                                                {isSelected && (
                                                    <Check className="w-2.5 h-2.5 text-white" />
                                                )}
                                            </div>
                                            <div className="space-y-0.5 min-w-0">
                                                <p className={cn(
                                                    "text-sm font-bold leading-none",
                                                    isSelected ? "text-emerald-900 dark:text-emerald-300" : "text-[#1F2937] dark:text-gray-100"
                                                )}>
                                                    {template.name}
                                                </p>
                                                <p className={cn(
                                                    "text-[11px] line-clamp-1",
                                                    isSelected ? "text-emerald-700/80 dark:text-emerald-400/80" : "text-gray-500 dark:text-gray-400"
                                                )}>
                                                    {template.description || t("shift_modal.template_default_desc")}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                        {!isViewMode ? (
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 pt-1">
                                {t("shift_modal.templates_hint")}
                            </p>
                        ) : null}
                    </div>

                    {/* Manual Task Creation Section */}
                    <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-slate-700">
                        <Label className="text-sm font-semibold text-[#1F2937] dark:text-gray-100">{t("shift_modal.custom_tasks")}</Label>

                        {!isViewMode ? (
                        <div className="flex gap-2 items-center">
                            <Input
                                placeholder={t("common.add_custom_task")}
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleAddManualTask();
                                    }
                                }}
                                className="flex-1 min-w-0 h-12 rounded-xl border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 text-sm focus:ring-[#106B4E] focus:border-[#106B4E]"
                            />
                            <Select
                                value={newTaskPriority}
                                onValueChange={(v: TaskPriority) => setNewTaskPriority(v)}
                            >
                                <SelectTrigger className="w-[7.25rem] shrink-0 h-12 rounded-xl border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100">
                                    <SelectValue placeholder={t("common.priority")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="LOW">{shiftTaskPriorityLabel("LOW", t)}</SelectItem>
                                    <SelectItem value="MEDIUM">{shiftTaskPriorityLabel("MEDIUM", t)}</SelectItem>
                                    <SelectItem value="HIGH">{shiftTaskPriorityLabel("HIGH", t)}</SelectItem>
                                    <SelectItem value="URGENT">{shiftTaskPriorityLabel("URGENT", t)}</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleAddManualTask}
                                aria-label={t("common.add_custom_task")}
                                className="h-12 w-12 shrink-0 rounded-xl border-2 border-[#106B4E] bg-[#106B4E] p-0 text-white shadow-sm hover:border-[#0D5A41] hover:bg-[#0D5A41] hover:text-white"
                            >
                                <Plus className="h-5 w-5 shrink-0" strokeWidth={2.5} />
                            </Button>
                        </div>
                        ) : null}

                        {/* List of Manual Tasks */}
                        <div className="space-y-2">
                            {(shiftData.tasks || []).length === 0 && (
                                <p className="text-xs text-center text-gray-400 dark:text-gray-500 py-3">
                                    {t("schedule.no_custom_tasks_yet", "No custom tasks added yet.")}
                                </p>
                            )}
                            {(shiftData.tasks || []).map((task, index) => {
                                const priority = (task.priority || "MEDIUM") as TaskPriority;
                                const styles = shiftTaskPriorityStyles(priority);
                                return (
                                    <div
                                        key={`${task.title}-${index}`}
                                        className={cn(
                                            "group flex items-center justify-between gap-3 rounded-xl border border-l-4 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:bg-slate-900/60",
                                            styles.row,
                                            styles.accent,
                                        )}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                {task.title}
                                            </span>
                                        </div>
                                        <span
                                            className={cn(
                                                "shrink-0 rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
                                                styles.badge,
                                            )}
                                        >
                                            {shiftTaskPriorityLabel(priority, t)}
                                        </span>
                                        {!isViewMode ? (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveManualTask(index)}
                                                aria-label={t("common.remove", "Remove")}
                                                className="h-9 w-9 shrink-0 rounded-lg text-gray-400 opacity-70 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-950/40 sm:opacity-0"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 mt-2 border-t border-gray-50 dark:border-slate-700 shrink-0">
                    {isViewMode ? (
                        <>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={onClose}
                                className="h-12 px-8 rounded-xl text-gray-600 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-slate-800"
                            >
                                {t("common.close")}
                            </Button>
                            {canEdit ? (
                                <Button
                                    type="button"
                                    onClick={() => setIsViewMode(false)}
                                    className="h-12 gap-2 px-8 rounded-xl bg-[#106B4E] hover:bg-[#0D5A41] text-white font-bold text-base shadow-md active:scale-[0.98]"
                                >
                                    <Pencil className="h-4 w-4" />
                                    {t("schedule.edit_schedule")}
                                </Button>
                            ) : null}
                        </>
                    ) : (
                        <>
                            {editingPersistedShift && onDelete && initialShift && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        if (confirm(t("common.are_you_sure"))) {
                                            onDelete(initialShift.id);
                                            onClose();
                                        }
                                    }}
                                    className="mr-auto h-12 rounded-xl border border-red-300 bg-white px-5 font-semibold text-red-600 hover:border-red-400 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/40"
                                >
                                    {t("schedule.delete_shift")}
                                </Button>
                            )}
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={onClose}
                                className="h-12 px-8 rounded-xl text-gray-600 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-slate-800"
                            >
                                {t("common.cancel")}
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="h-12 px-10 rounded-xl bg-[#106B4E] hover:bg-[#0D5A41] text-white font-bold text-base transition-all shadow-md active:scale-[0.98]"
                            >
                                {isSubmitting ? t("schedule.saving") : editingPersistedShift ? t("profile.save_changes") : t("schedule.create")}
                            </Button>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ShiftModal;
