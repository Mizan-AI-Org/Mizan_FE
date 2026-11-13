/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from '@/hooks/use-auth';
import { AuthContextType } from '../../contexts/AuthContext.types';
import { format, parseISO, addDays, addWeeks, addMonths, isBefore, isEqual } from 'date-fns';
import { API_BASE } from "@/lib/api";
import { useLanguage } from "@/hooks/use-language";
import { Search, Calendar as CalendarIcon, X, Check, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { shiftTaskPriorityLabel, shiftTaskPriorityStyles } from "@/lib/shiftTaskPriority";
import { Task, TaskPriority } from '@/types/schedule';
import { useBusinessLocations } from "@/hooks/use-business-locations";

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
    primary_location?: string | null;
    primary_location_data?: { id: string; name: string } | null;
}

interface AssignedShift {
    id?: string;
    schedule?: string; // WeeklySchedule ID, if applicable
    staff: string; // User ID
    staff_info?: {
        id: string;
        first_name: string;
        last_name: string;
        email: string;
    };
    shift_date: string;
    start_time: string;
    end_time: string;
    break_duration?: string; // ISO 8601 duration string, e.g., "PT30M"
    role: string;
    notes: string | null;
    staff_members?: string[];
    staff_members_details?: { id: string; first_name: string; last_name: string; }[];
    task_templates?: string[]; // Array of task template IDs
    task_templates_details?: { id: string; name?: string; title?: string; }[]; // From API after save
    tasks?: Task[];
    location?: string | null;
    location_data?: { id: string; name: string } | null;
}

interface AssignedShiftModalProps {
    isOpen: boolean;
    onClose: () => void;
    shift?: AssignedShift | null;
    weeklyScheduleId?: string;
    initialDate?: Date;
}


const AssignedShiftModal: React.FC<AssignedShiftModalProps> = ({ isOpen, onClose, shift, weeklyScheduleId, initialDate }) => {
    const queryClient = useQueryClient();
    const { t } = useLanguage();
    const { user, logout } = useAuth() as AuthContextType;

    const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>(shift?.staff_members || (shift?.staff ? [shift.staff] : []));
    const [shiftDate, setShiftDate] = useState(shift?.shift_date || (initialDate ? format(initialDate, 'yyyy-MM-dd') : ''));
    const [startTime, setStartTime] = useState(shift?.start_time?.substring(0, 5) || '09:00');
    const [endTime, setEndTime] = useState(shift?.end_time?.substring(0, 5) || '17:00');
    const [role, setRole] = useState(shift?.role || '');
    const [notes, setNotes] = useState(shift?.notes || '');
    const [selectedTemplates, setSelectedTemplates] = useState<string[]>(shift?.task_templates || []);
    const [templateSearch, setTemplateSearch] = useState('');
    const [isStaffPopoverOpen, setIsStaffPopoverOpen] = useState(false);
    // Multi-location: which branch this shift is scheduled at. Empty string
    // means "let the backend default to the staff member's primary branch"
    // (single-site tenants also hit this path transparently).
    const [locationId, setLocationId] = useState<string>(shift?.location || shift?.location_data?.id || '');
    // True once the user explicitly edits the branch; once touched we stop
    // silently overriding it when the staff selection changes.
    const [locationTouched, setLocationTouched] = useState<boolean>(false);

    // Recurrence states
    const [isRecurring, setIsRecurring] = useState(false);
    const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('WEEKLY');
    const [recurringEndDate, setRecurringEndDate] = useState<string>('');

    // Manual tasks state
    const [manualTasks, setManualTasks] = useState<Task[]>(shift?.tasks || []);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>("MEDIUM");

    useEffect(() => {
        if (shift) {
            setSelectedStaffIds(shift.staff_members || (shift.staff ? [shift.staff] : []));
            setShiftDate(shift.shift_date || '');
            setStartTime(shift.start_time?.substring(0, 5) || '');
            setEndTime(shift.end_time?.substring(0, 5) || '');
            setRole(shift.role || '');
            setNotes(shift.notes || '');
            setSelectedTemplates(shift.task_templates || []);
            setManualTasks(shift.tasks || []);
            setIsRecurring(false); // Reset recurrence on edit for safety
            setLocationId(shift.location || shift.location_data?.id || '');
            setLocationTouched(true); // editing an existing shift: don't auto-replace
        } else {
            setSelectedStaffIds([]);
            setShiftDate(initialDate ? format(initialDate, 'yyyy-MM-dd') : '');
            setStartTime('09:00');
            setEndTime('17:00');
            setRole('');
            setNotes('');
            setSelectedTemplates([]);
            setManualTasks([]);
            setIsRecurring(false);
            setLocationId('');
            setLocationTouched(false);
        }
        setTemplateSearch('');
    }, [shift, initialDate]);

    const handleAddManualTask = () => {
        if (!newTaskTitle.trim()) {
            toast({
                title: t("shift_modal.toast_error"),
                description: t("generic.toast.task_title_cannot_be_empty"),
                variant: "destructive",
            });
            return;
        }
        const newTask: Task = {
            title: newTaskTitle.trim(),
            priority: newTaskPriority,
        };
        setManualTasks([...manualTasks, newTask]);
        setNewTaskTitle("");
        setNewTaskPriority("MEDIUM");
    };

    const handleRemoveManualTask = (index: number) => {
        setManualTasks(manualTasks.filter((_, i) => i !== index));
    };

    const roleOptions = [
        { value: 'SUPER_ADMIN', label: t("staff.roles.super_admin") },
        { value: 'ADMIN', label: t("staff.roles.admin") },
        { value: 'MANAGER', label: t("staff.roles.manager") },
        { value: 'CHEF', label: t("staff.roles.chef") },
        { value: 'WAITER', label: t("staff.roles.waiter") },
        { value: 'CLEANER', label: t("staff.roles.cleaner") },
        { value: 'CASHIER', label: t("staff.roles.cashier") },
    ];

    const { data: staffMembers, isLoading: isLoadingStaff, error: staffError } = useQuery<StaffMember[]>({
        queryKey: ['staff-list-short'],
        queryFn: async () => {
            const response = await fetch(`${API_BASE}/staff/`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    logout();
                    throw new Error(t("shift_modal.session_expired"));
                }
                throw new Error(t("shift_modal.failed_fetch_staff"));
            }
            const data = await response.json();
            return (Array.isArray(data) ? data : []).map((s: any) => ({
                id: s.id || s.user?.id,
                user: s.user || {
                    id: s.id,
                    first_name: s.first_name || '',
                    last_name: s.last_name || ''
                },
                first_name: s.first_name,
                last_name: s.last_name,
                role: s.role
            }));
        },
    });

    const { data: businessLocations = [] } = useBusinessLocations();
    const isMultiLocation = businessLocations.length > 1;

    useEffect(() => {
        if (locationTouched || !isMultiLocation) return;
        if (locationId) return;
        const firstStaff = staffMembers?.find((s) => s.id === selectedStaffIds[0]);
        const staffPrimary = firstStaff?.primary_location || firstStaff?.primary_location_data?.id;
        if (staffPrimary) {
            setLocationId(String(staffPrimary));
            return;
        }
        const primaryBranch = businessLocations.find((b) => b.is_primary);
        if (primaryBranch) setLocationId(primaryBranch.id);
    }, [selectedStaffIds, staffMembers, businessLocations, isMultiLocation, locationId, locationTouched]);

    const { data: taskTemplates, isLoading: isLoadingTemplates } = useQuery<any[]>({
        queryKey: ['task-templates'],
        queryFn: async () => {
            const response = await fetch(`${API_BASE}/scheduling/task-templates/`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    logout();
                    throw new Error(t("shift_modal.session_expired"));
                }
                throw new Error(t("shift_modal.failed_fetch_templates"));
            }
            return response.json();
        },
    });

    const createUpdateShiftMutation = useMutation({
        mutationFn: async (data: AssignedShift & { multi_staff?: string[], is_recurring?: boolean, frequency?: string, recurring_end_date?: string }) => {
            const token = localStorage.getItem('access_token');
            if (!token) throw new Error(t("shift_modal.session_expired"));

            const withSeconds = (t: string) => (t?.length === 5 ? `${t}:00` : t);
            const makeISO = (dateStr: string, timeStr: string) => {
                const ts = withSeconds(timeStr);
                const d = new Date(`${dateStr}T${ts}`);
                const offsetMin = -d.getTimezoneOffset();
                const sign = offsetMin >= 0 ? '+' : '-';
                const abs = Math.abs(offsetMin);
                const hh = String(Math.floor(abs / 60)).padStart(2, '0');
                const mm = String(abs % 60).padStart(2, '0');
                return `${dateStr}T${ts}${sign}${hh}:${mm}`;
            };
            const toYMD = (d: Date) => d.toISOString().slice(0, 10);
            const getWeekStart = (dateStr: string) => {
                const d = new Date(dateStr);
                const day = d.getDay();
                const start = new Date(d);
                start.setDate(d.getDate() - day);
                return start;
            };

            const staffIds = data.staff_members || data.multi_staff || [data.staff];
            const baseShiftDate = data.shift_date;
            const recurrenceGroupId = data.is_recurring ? crypto.randomUUID() : undefined;

            const scheduleDates = [baseShiftDate];
            const isUpdate = !!shift?.id;

            if (data.is_recurring && data.frequency && data.recurring_end_date) {
                const base = parseISO(baseShiftDate);
                const endDate = parseISO(data.recurring_end_date);
                let currentDate = base;
                let iterations = 0;
                const maxIterations = 365;

                while (iterations < maxIterations) {
                    let nextDate: Date;
                    if (data.frequency === 'DAILY') {
                        nextDate = addDays(currentDate, 1);
                    } else if (data.frequency === 'MONTHLY') {
                        nextDate = addMonths(currentDate, 1);
                    } else { // WEEKLY
                        nextDate = addWeeks(currentDate, 1);
                    }

                    if (isBefore(nextDate, endDate) || isEqual(nextDate, endDate)) {
                        scheduleDates.push(toYMD(nextDate));
                        currentDate = nextDate;
                        iterations++;
                    } else {
                        break;
                    }
                }
            }

            const results = [];
            let originalShiftConsumed = false;
            for (const dStr of scheduleDates) {
                const payloadISO = {
                    ...data,
                    staff: staffIds[0],
                    staff_members: staffIds,
                    shift_date: dStr,
                    start_time: makeISO(dStr, data.start_time),
                    end_time: makeISO(dStr, data.end_time),
                    break_duration: data.break_duration ?? '00:30:00',
                    is_recurring: data.is_recurring,
                    recurrence_group_id: recurrenceGroupId
                };

                const isFirstEntryOriginalDate = dStr === baseShiftDate;
                const method = (shift?.id && isFirstEntryOriginalDate && !originalShiftConsumed) ? 'PUT' : 'POST';
                if (method === 'PUT') originalShiftConsumed = true;

                // Determine targeting URL
                let url = `${API_BASE}/scheduling/weekly-schedules/${weeklyScheduleId}/assigned-shifts/`;
                if (method === 'PUT') {
                    url = `${API_BASE}/scheduling/assigned-shifts-v2/${shift!.id}/`;
                }

                // Create flows
                let scheduleId = weeklyScheduleId;
                const weekStart = getWeekStart(dStr);
                const weekStartStr = toYMD(weekStart);
                const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
                const weekEndStr = toYMD(weekEnd);

                const contextWeekStart = getWeekStart(baseShiftDate);
                if (toYMD(weekStart) !== toYMD(contextWeekStart)) {
                    const listRes = await fetch(`${API_BASE}/scheduling/weekly-schedules/?week_start=${weekStartStr}`, { headers: { Authorization: `Bearer ${token}` } });
                    if (listRes.ok) {
                        const listJson = await listRes.json();
                        const arr = Array.isArray(listJson?.results) ? listJson.results : listJson;
                        const existing = Array.isArray(arr) ? arr.find((s: any) => s.week_start === weekStartStr) : undefined;
                        if (existing) scheduleId = existing.id;
                    }
                    if (!scheduleId) {
                        const createRes = await fetch(`${API_BASE}/scheduling/weekly-schedules/`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ week_start: weekStartStr, week_end: weekEndStr, is_published: false }) });
                        if (createRes.ok) { const created = await createRes.json(); scheduleId = created.id; }
                    }
                }

                if (!scheduleId) throw new Error(t("schedule.could_not_resolve_schedule"));

                if (method === 'POST') {
                    url = `${API_BASE}/scheduling/weekly-schedules/${scheduleId}/assigned-shifts/`;
                }

                const res = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ ...payloadISO, schedule: scheduleId })
                });
                if (!res.ok) {
                    const errBody = await res.json().catch(() => null);
                    const msg = errBody?.detail ?? errBody?.message ?? res.statusText;
                    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(errBody ?? await res.text()));
                }
                results.push(await res.json());
            }
            return results;
        },
        onSuccess: (results) => {
            queryClient.invalidateQueries({ queryKey: ['weekly-schedule'] });
            queryClient.invalidateQueries({ queryKey: ['shifts'] });
            queryClient.invalidateQueries({ queryKey: ['assigned-shifts'] });
            toast({
                title: t("shift_modal.toast_success"),
                description: shift?.id
                    ? t("shift_modal.shifts_saved", { count: results.length })
                    : t("shift_modal.shifts_created", { count: results.length }),
            });
            onClose();
        },
        onError: (error: any) => {
            toast({
                title: t("shift_modal.operation_failed"),
                description: error?.message || t("profile.errors.unexpected"),
                variant: "destructive",
            });
        },
    });

    const deleteShiftMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`${API_BASE}/scheduling/assigned-shifts-v2/${id}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    logout();
                    throw new Error(t("shift_modal.session_expired"));
                }
                const errorData = await response.json();
                throw new Error(errorData.detail || errorData.message || t("schedule.failed_delete_shift"));
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['weekly-schedule'] });
            queryClient.invalidateQueries({ queryKey: ['shifts'] });
            toast({
                title: t("shift_modal.shift_deleted"),
                description: t("shift_modal.shift_deleted_desc"),
            });
            onClose();
        },
        onError: (error: any) => {
            toast({
                title: t("schedule.failed_delete_shift"),
                description: error.message || t("profile.errors.unexpected"),
                variant: "destructive",
            });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const toMinutes = (t: string) => {
            const [h, m] = t.split(':').map(Number);
            return h * 60 + m;
        };
        if (selectedStaffIds.length === 0 || !shiftDate || !startTime || !endTime || !role) {
            toast({ title: t("shift_modal.missing_fields"), description: t("shift_modal.missing_fields_desc"), variant: 'destructive' });
            return;
        }
        const pendingTaskTitle = newTaskTitle?.trim() ?? '';
        const effectiveManualTasks = pendingTaskTitle
            ? [...(manualTasks || []), { title: pendingTaskTitle, priority: newTaskPriority }]
            : (manualTasks || []);
        if (selectedTemplates.length === 0 && effectiveManualTasks.length === 0) {
            toast({
                title: t("shift_modal.tasks_required_title"),
                description: t("shift_modal.err_tasks_required"),
                variant: 'destructive',
            });
            return;
        }
        const startM = toMinutes(startTime);
        const endM = toMinutes(endTime);
        // Overnight (e.g. 22:00-01:30) is allowed - backend bumps end to next day.
        if (Number.isNaN(startM) || Number.isNaN(endM)) {
            toast({ title: t("shift_modal.invalid_time"), description: t("shift_modal.invalid_time_desc"), variant: 'destructive' });
            return;
        }
        if (isRecurring && !recurringEndDate) {
            toast({ title: t("shift_modal.end_date_required_title"), description: t("shift_modal.err_end_date_required"), variant: 'destructive' });
            return;
        }

        const shiftData: any = {
            staff_members: selectedStaffIds,
            shift_date: shiftDate,
            start_time: startTime,
            end_time: endTime,
            role: role,
            notes: notes,
            task_templates: selectedTemplates,
            tasks: effectiveManualTasks, // Include manual tasks (and pending input if any) for nested creation/update
            is_recurring: isRecurring,
            frequency: frequency,
            recurring_end_date: isRecurring ? recurringEndDate : undefined,
            // Only send `location` when the tenant has multiple branches; for
            // single-site tenants it's a no-op and we'd rather let the backend
            // serializer pick the default via `effective_shift_location`.
            ...(isMultiLocation && locationId ? { location: locationId } : {}),
            ...(weeklyScheduleId && { schedule: weeklyScheduleId }),
        };

        createUpdateShiftMutation.mutate(shiftData);
    };

    const toggleStaffSelection = (staffId: string) => {
        setSelectedStaffIds(prev =>
            prev.includes(staffId)
                ? prev.filter(id => id !== staffId)
                : [...prev, staffId]
        );
    };

    const filteredTemplates = taskTemplates?.filter(t =>
        t.name.toLowerCase().includes(templateSearch.toLowerCase())
    );

    const toggleTemplate = (templateId: string) => {
        if (selectedTemplates.includes(templateId)) {
            setSelectedTemplates(selectedTemplates.filter(id => id !== templateId));
        } else {
            setSelectedTemplates([...selectedTemplates, templateId]);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] bg-card rounded-3xl p-8 max-h-[90vh] overflow-y-auto">
                <DialogHeader className="pb-2">
                    <DialogTitle className="text-xl font-bold text-[#1F2937]">{shift ? t("schedule.edit_schedule") : t("schedule.create_schedule")}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                    {/* Shift Title */}
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-[#1F2937]">{t("schedule.shift_title")}</Label>
                        <Input
                            placeholder={t("schedule.shift_title_placeholder")}
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="h-12 rounded-xl border-gray-200"
                            required
                        />
                    </div>

                    {/* Multi-Staff Selection */}
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-[#1F2937]">{t("shift_modal.assign_staff_count", { count: selectedStaffIds.length })}</Label>
                        <Popover open={isStaffPopoverOpen} onOpenChange={setIsStaffPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full h-12 bg-orange-100 hover:bg-orange-200 text-orange-900 border-none rounded-xl px-4 flex justify-between items-center text-base font-medium transition-colors shadow-sm"
                                >
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        {selectedStaffIds.length > 0 ? (
                                            <span className="truncate">
                                                {selectedStaffIds.length === 1
                                                    ? staffMembers?.find(s => s.id === selectedStaffIds[0])?.user?.first_name
                                                    : t("shift_modal.members_selected", { count: selectedStaffIds.length })}
                                            </span>
                                        ) : (
                                            t("shift_modal.select_staff_members")
                                        )}
                                    </div>
                                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl shadow-2xl border-gray-100 overflow-hidden" align="start">
                                <Command className="rounded-xl border-none">
                                    <CommandInput placeholder={t("common.search_staff")} className="h-12 border-none focus:ring-0" />
                                    <CommandList className="max-h-[300px] overflow-y-auto">
                                        <CommandEmpty className="py-6 text-center text-sm text-gray-500">{t("shift_modal.no_staff_found")}</CommandEmpty>
                                        <CommandGroup>
                                            {staffMembers?.map((s) => (
                                                <CommandItem
                                                    key={s.id}
                                                    onSelect={() => toggleStaffSelection(s.id)}
                                                    className="flex items-center gap-2 p-3 aria-selected:bg-orange-50 cursor-pointer"
                                                >
                                                    <Checkbox checked={selectedStaffIds.includes(s.id)} className="rounded-md border-orange-200 data-[state=checked]:bg-orange-500" />
                                                    <Avatar className="h-8 w-8 ml-1">
                                                        <AvatarFallback className="text-xs bg-orange-100 text-orange-700">
                                                            {`${(s.user?.first_name || s.first_name || "")[0] || ""}${(s.user?.last_name || s.last_name || "")[0] || ""}`}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibold text-gray-900">
                                                            {`${s.user?.first_name || s.first_name || ""} ${s.user?.last_name || s.last_name || ""}`}
                                                        </span>
                                                        <span className="text-xs text-gray-500 uppercase">{s.role}</span>
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Date and Time Pickers */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-[#1F2937]">{t("shift_modal.start_time")}</Label>
                            <div className="relative">
                                <Input
                                    type="datetime-local"
                                    value={`${shiftDate}T${startTime}`}
                                    onChange={(e) => {
                                        const [date, time] = e.target.value.split('T');
                                        setShiftDate(date);
                                        setStartTime(time);
                                    }}
                                    className="h-12 rounded-xl border-gray-200 pl-4 pr-10 focus:ring-[#106B4E]"
                                    required
                                />
                                <CalendarIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-[#1F2937]">{t("shift_modal.end_time")}</Label>
                            <div className="relative">
                                <Input
                                    type="datetime-local"
                                    value={`${shiftDate}T${endTime}`}
                                    onChange={(e) => {
                                        const [_, time] = e.target.value.split('T');
                                        setEndTime(time);
                                    }}
                                    className="h-12 rounded-xl border-gray-200 pl-4 pr-10"
                                    required
                                />
                                <CalendarIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Branch picker (multi-location tenants only) */}
                    {isMultiLocation && (
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-[#1F2937]">
                                {t("schedule.branch") || "Branch"}
                            </Label>
                            <Select
                                value={locationId || "__default__"}
                                onValueChange={(v) => {
                                    setLocationTouched(true);
                                    setLocationId(v === "__default__" ? "" : v);
                                }}
                            >
                                <SelectTrigger className="h-12 rounded-xl border-gray-200">
                                    <SelectValue placeholder={t("schedule.branch_placeholder") || "Select a branch..."} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__default__">
                                        {t("schedule.branch_default") || "Staff's primary branch (default)"}
                                    </SelectItem>
                                    {businessLocations.map((loc) => (
                                        <SelectItem key={loc.id} value={loc.id}>
                                            {loc.name}{loc.is_primary ? ` • ${t("schedule.branch_primary") || "primary"}` : ""}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-[10px] text-slate-500">
                                {t("schedule.branch_help") || "Where this shift is worked. Defaults to the selected staff member's home branch."}
                            </p>
                        </div>
                    )}

                    {/* Recurring Shift Section */}
                    <div className="bg-slate-50 p-4 rounded-2xl space-y-4 border border-slate-100">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <Label className="text-sm font-bold text-slate-900 leading-none">{t("shift_modal.recurring_shift")}</Label>
                                <p className="text-[10px] text-slate-500 mt-1">{t("shift_modal.recurring_hint")}</p>
                            </div>
                            <Checkbox
                                checked={isRecurring}
                                onCheckedChange={(checked) => setIsRecurring(!!checked)}
                                className="h-5 w-5 rounded-md border-slate-300 data-[state=checked]:bg-[#106B4E] data-[state=checked]:border-[#106B4E]"
                            />
                        </div>

                        {isRecurring && (
                            <div className="pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                <Label className="text-xs font-semibold text-slate-700 block mb-2">{t("shift_modal.repeat_frequency")}</Label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={frequency === 'DAILY' ? 'default' : 'outline'}
                                        onClick={() => setFrequency('DAILY')}
                                        className={cn(
                                            "flex-1 h-10 rounded-xl text-xs font-bold transition-all",
                                            frequency === 'DAILY' ? "bg-[#106B4E] hover:bg-[#0D5A41] text-white" : "border-slate-200 text-slate-600 hover:bg-slate-100"
                                        )}
                                    >
                                        {t("shift_modal.freq_daily")}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={frequency === 'WEEKLY' ? 'default' : 'outline'}
                                        onClick={() => setFrequency('WEEKLY')}
                                        className={cn(
                                            "flex-1 h-10 rounded-xl text-xs font-bold transition-all",
                                            frequency === 'WEEKLY' ? "bg-[#106B4E] hover:bg-[#0D5A41] text-white" : "border-slate-200 text-slate-600 hover:bg-slate-100"
                                        )}
                                    >
                                        {t("shift_modal.freq_weekly")}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={frequency === 'MONTHLY' ? 'default' : 'outline'}
                                        onClick={() => setFrequency('MONTHLY')}
                                        className={cn(
                                            "flex-1 h-10 rounded-xl text-xs font-bold transition-all",
                                            frequency === 'MONTHLY' ? "bg-[#106B4E] hover:bg-[#0D5A41] text-white" : "border-slate-200 text-slate-600 hover:bg-slate-100"
                                        )}
                                    >
                                        {t("shift_modal.freq_monthly")}
                                    </Button>
                                </div>
                                <div className="mt-4">
                                    <Label className="text-xs font-semibold text-slate-700 block mb-2">{t("shift_modal.end_date")}</Label>
                                    <Input
                                        type="date"
                                        value={recurringEndDate}
                                        onChange={(e) => setRecurringEndDate(e.target.value)}
                                        min={shiftDate}
                                        className="h-10 rounded-xl border-slate-200 focus:ring-[#106B4E] focus:border-[#106B4E]"
                                    />
                                    {!recurringEndDate && <p className="text-[10px] text-amber-600 mt-1">{t("shift_modal.err_end_date_required")}</p>}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Process & Task Templates (required: templates OR custom tasks) */}
                    <div className="space-y-4 pt-4 border-t border-gray-100">
                        <div>
                            <Label className="text-sm font-semibold text-[#1F2937]">{t("shift_modal.templates_label")}</Label>
                            <p className="text-[10px] text-slate-500 mt-0.5">{t("shift_modal.templates_or_tasks_hint")}</p>
                        </div>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full h-11 rounded-xl border-slate-200 text-left justify-between font-normal"
                                >
                                    <span>
                                        {selectedTemplates.length > 0
                                            ? t("shift_modal.templates_selected", { count: selectedTemplates.length })
                                            : t("shift_modal.select_templates")}
                                    </span>
                                    <ChevronDown className="h-4 w-4 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl" align="start">
                                <Command className="rounded-xl border-none">
                                    <CommandInput
                                        placeholder={t("common.search_templates")}
                                        value={templateSearch}
                                        onValueChange={setTemplateSearch}
                                        className="h-10"
                                    />
                                    <CommandList className="max-h-[220px] overflow-y-auto">
                                        <CommandEmpty>{t("shift_modal.no_templates_found")}</CommandEmpty>
                                        <CommandGroup>
                                            {(filteredTemplates || []).map((t) => (
                                                <CommandItem
                                                    key={t.id}
                                                    onSelect={() => toggleTemplate(String(t.id))}
                                                    className="flex items-center gap-2 p-2 cursor-pointer"
                                                >
                                                    <Checkbox
                                                        checked={selectedTemplates.includes(String(t.id))}
                                                        className="rounded border-slate-300 data-[state=checked]:bg-[#106B4E]"
                                                    />
                                                    <span className="text-sm truncate">{t.name || t.title || String(t.id)}</span>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        {selectedTemplates.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {selectedTemplates.map((id) => {
                                    const t = taskTemplates?.find((x) => String(x.id) === id)
                                        ?? shift?.task_templates_details?.find((x) => String(x.id) === id);
                                    return (
                                        <span
                                            key={id}
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-medium"
                                        >
                                            {t?.name || t?.title || id}
                                            <button
                                                type="button"
                                                onClick={() => setSelectedTemplates(selectedTemplates.filter((x) => x !== id))}
                                                className="hover:bg-emerald-100 rounded p-0.5"
                                                aria-label={t("common.remove")}
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Manual Task Creation Section */}
                    <div className="space-y-4 pt-4 border-t border-gray-100">
                        <Label className="text-sm font-semibold text-[#1F2937]">{t("shift_modal.custom_tasks")}</Label>

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
                                className="flex-1 min-w-0 h-12 rounded-xl border-gray-200 text-sm focus:border-[#106B4E] focus:ring-[#106B4E]"
                            />
                            <Select
                                value={newTaskPriority}
                                onValueChange={(v: TaskPriority) => setNewTaskPriority(v)}
                            >
                                <SelectTrigger className="h-12 w-[7.25rem] shrink-0 rounded-xl border-gray-200 text-sm">
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
                                aria-label={t("shift_modal.add_custom_task_aria")}
                                className="h-12 w-12 shrink-0 rounded-xl border-2 border-[#106B4E] bg-[#106B4E] p-0 text-white shadow-sm hover:border-[#0D5A41] hover:bg-[#0D5A41] hover:text-white"
                            >
                                <Plus className="h-5 w-5 shrink-0" strokeWidth={2.5} />
                            </Button>
                        </div>

                        {/* List of Manual Tasks */}
                        <div className="space-y-2 max-h-[180px] overflow-y-auto pr-2">
                            {(manualTasks || []).map((task, index) => {
                                const priority = task.priority || "MEDIUM";
                                const styles = shiftTaskPriorityStyles(priority);
                                return (
                                    <div
                                        key={`${task.title}-${index}`}
                                        className={cn(
                                            "group flex items-center justify-between gap-3 rounded-xl border border-l-4 bg-white p-3 shadow-sm transition-shadow hover:shadow-md",
                                            styles.row,
                                            styles.accent,
                                        )}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-semibold text-gray-900">
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
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveManualTask(index)}
                                            aria-label={t("common.remove", "Remove")}
                                            className="h-9 w-9 shrink-0 rounded-lg text-gray-400 opacity-70 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 sm:opacity-0"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                );
                            })}
                            {manualTasks.length === 0 && (
                                <p className="text-xs text-gray-400 text-center py-4">{t("schedule.no_custom_tasks_yet")}</p>
                            )}
                        </div>
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-50 mt-8">
                        {shift && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => deleteShiftMutation.mutate(shift.id as string)}
                                disabled={deleteShiftMutation.isPending}
                                className="mr-auto h-12 rounded-xl border border-red-300 bg-white px-5 font-semibold text-red-600 hover:border-red-400 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/40"
                            >
                                {deleteShiftMutation.isPending ? t("schedule.deleting") : t("schedule.delete_shift")}
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="h-12 px-8 rounded-xl text-gray-600 font-semibold hover:bg-gray-100"
                        >
                            {t("schedule.cancel")}
                        </Button>
                        <Button
                            type="submit"
                            disabled={createUpdateShiftMutation.isPending}
                            className="h-12 px-10 rounded-xl bg-[#106B4E] hover:bg-[#0D5A41] text-white font-bold text-base transition-all shadow-md active:scale-[0.98]"
                        >
                            {createUpdateShiftMutation.isPending ? (shift ? t("schedule.saving") : t("schedule.creating")) : (shift ? t("schedule.save") : t("schedule.create"))}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default AssignedShiftModal;
