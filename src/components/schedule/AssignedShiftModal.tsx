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
import { Search, Calendar as CalendarIcon, X, Check, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Task, TaskPriority } from '@/types/schedule';

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
    tasks?: Task[];
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
        }
        setTemplateSearch('');
    }, [shift, initialDate]);

    const handleAddManualTask = () => {
        if (!newTaskTitle.trim()) {
            toast({
                title: "Error",
                description: "Task title cannot be empty",
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
        { value: 'SUPER_ADMIN', label: 'Super Admin' },
        { value: 'ADMIN', label: 'Admin' },
        { value: 'MANAGER', label: 'Manager' },
        { value: 'CHEF', label: 'Chef' },
        { value: 'WAITER', label: 'Waiter' },
        { value: 'CLEANER', label: 'Cleaner' },
        { value: 'CASHIER', label: 'Cashier' },
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
                    throw new Error('Session expired');
                }
                throw new Error('Failed to fetch staff data');
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
                    throw new Error('Session expired');
                }
                throw new Error('Failed to fetch task templates');
            }
            return response.json();
        },
    });

    const createUpdateShiftMutation = useMutation({
        mutationFn: async (data: AssignedShift & { multi_staff?: string[], is_recurring?: boolean, frequency?: string }) => {
            const token = localStorage.getItem('access_token');
            if (!token) throw new Error('No access token');

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

                if (!scheduleId) throw new Error('Could not resolve weekly schedule');

                if (method === 'POST') {
                    url = `${API_BASE}/scheduling/weekly-schedules/${scheduleId}/assigned-shifts/`;
                }

                const res = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ ...payloadISO, schedule: scheduleId })
                });
                if (!res.ok) throw new Error(await res.text());
                results.push(await res.json());
            }
            return results;
        },
        onSuccess: (results) => {
            queryClient.invalidateQueries({ queryKey: ['weekly-schedule'] });
            queryClient.invalidateQueries({ queryKey: ['shifts'] });
            queryClient.invalidateQueries({ queryKey: ['assigned-shifts'] });
            toast({
                title: `Success`,
                description: `${results.length} shift(s) ${shift?.id ? 'processed' : 'created'}.`,
            });
            onClose();
        },
        onError: (error: any) => {
            toast({
                title: `Operation failed`,
                description: error?.message || "An unexpected error occurred.",
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
                    throw new Error('Session expired');
                }
                const errorData = await response.json();
                throw new Error(errorData.detail || errorData.message || 'Failed to delete shift');
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['weekly-schedule'] });
            queryClient.invalidateQueries({ queryKey: ['shifts'] });
            toast({
                title: "Shift deleted successfully!",
                description: "The assigned shift has been removed.",
            });
            onClose();
        },
        onError: (error: any) => {
            toast({
                title: "Failed to delete shift.",
                description: error.message || "An unexpected error occurred.",
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
            toast({ title: 'Missing required fields', description: 'Please select staff, date, start, end, and role.', variant: 'destructive' });
            return;
        }
        const startM = toMinutes(startTime);
        const endM = toMinutes(endTime);
        if (endM <= startM) {
            toast({ title: 'Invalid time range', description: 'End time must be after start time.', variant: 'destructive' });
            return;
        }
        if (isRecurring && !recurringEndDate) {
            toast({ title: 'End date required', description: 'Please select an end date for recurring shifts.', variant: 'destructive' });
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
            tasks: manualTasks, // Include manual tasks for nested creation/update
            is_recurring: isRecurring,
            frequency: frequency,
            recurring_end_date: isRecurring ? recurringEndDate : undefined,
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
            <DialogContent className="sm:max-w-[700px] bg-white rounded-3xl p-8 max-h-[90vh] overflow-y-auto">
                <DialogHeader className="pb-2">
                    <DialogTitle className="text-xl font-bold text-[#1F2937]">{shift ? 'Edit Schedule' : 'Create Schedule'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                    {/* Shift Title */}
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-[#1F2937]">Shift Title</Label>
                        <Input
                            placeholder="e.g. Morning Shift, Dinner Service"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="h-12 rounded-xl border-gray-200"
                            required
                        />
                    </div>

                    {/* Multi-Staff Selection */}
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-[#1F2937]">Assign Staff ({selectedStaffIds.length} selected)</Label>
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
                                                    : `${selectedStaffIds.length} members selected`}
                                            </span>
                                        ) : (
                                            "Select staff members..."
                                        )}
                                    </div>
                                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl shadow-2xl border-gray-100 overflow-hidden" align="start">
                                <Command className="rounded-xl border-none">
                                    <CommandInput placeholder="Search staff..." className="h-12 border-none focus:ring-0" />
                                    <CommandList className="max-h-[300px] overflow-y-auto">
                                        <CommandEmpty className="py-6 text-center text-sm text-gray-500">No staff found.</CommandEmpty>
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
                            <Label className="text-sm font-semibold text-[#1F2937]">Start Time</Label>
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
                            <Label className="text-sm font-semibold text-[#1F2937]">End Time</Label>
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

                    {/* Recurring Shift Section */}
                    <div className="bg-slate-50 p-4 rounded-2xl space-y-4 border border-slate-100">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <Label className="text-sm font-bold text-slate-900 leading-none">Recurring Shift</Label>
                                <p className="text-[10px] text-slate-500 mt-1">Create this shift repeatedly until the end date.</p>
                            </div>
                            <Checkbox
                                checked={isRecurring}
                                onCheckedChange={(checked) => setIsRecurring(!!checked)}
                                className="h-5 w-5 rounded-md border-slate-300 data-[state=checked]:bg-[#106B4E] data-[state=checked]:border-[#106B4E]"
                            />
                        </div>

                        {isRecurring && (
                            <div className="pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                <Label className="text-xs font-semibold text-slate-700 block mb-2">Repeat Frequency</Label>
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
                                        Daily
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
                                        Weekly
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
                                        Monthly
                                    </Button>
                                </div>
                                <div className="mt-4">
                                    <Label className="text-xs font-semibold text-slate-700 block mb-2">End Date</Label>
                                    <Input
                                        type="date"
                                        value={recurringEndDate}
                                        onChange={(e) => setRecurringEndDate(e.target.value)}
                                        min={shiftDate}
                                        className="h-10 rounded-xl border-slate-200 focus:ring-[#106B4E] focus:border-[#106B4E]"
                                    />
                                    {!recurringEndDate && <p className="text-[10px] text-amber-600 mt-1">Please select an end date for recurring shifts.</p>}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Manual Task Creation Section */}
                    <div className="space-y-4 pt-4 border-t border-gray-100">
                        <Label className="text-sm font-semibold text-[#1F2937]">Custom Tasks</Label>

                        <div className="flex gap-2">
                            <Input
                                placeholder="Add a custom task..."
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                className="flex-1 h-12 rounded-xl border-gray-200 text-sm focus:ring-[#106B4E]"
                            />
                            <div className="w-[140px]">
                                <Select
                                    value={newTaskPriority}
                                    onValueChange={(v: TaskPriority) => setNewTaskPriority(v)}
                                >
                                    <SelectTrigger className="h-12 rounded-xl border-gray-200 text-sm">
                                        <SelectValue placeholder="Priority" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="LOW">Low</SelectItem>
                                        <SelectItem value="MEDIUM">Medium</SelectItem>
                                        <SelectItem value="HIGH">High</SelectItem>
                                        <SelectItem value="URGENT">Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                type="button"
                                onClick={handleAddManualTask}
                                className="h-12 w-12 p-0 rounded-xl bg-emerald-50 text-[#106B4E] hover:bg-emerald-100 border border-emerald-100"
                            >
                                <Plus className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* List of Manual Tasks */}
                        <div className="space-y-2 max-h-[180px] overflow-y-auto pr-2">
                            {(manualTasks || []).map((task, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 group transition-all hover:bg-white hover:shadow-sm"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-2 h-2 rounded-full",
                                            task.priority === 'URGENT' ? "bg-red-500" :
                                                task.priority === 'HIGH' ? "bg-orange-500" :
                                                    task.priority === 'MEDIUM' ? "bg-blue-500" : "bg-gray-400"
                                        )} title={task.priority} />
                                        <span className="text-sm font-medium text-gray-700">{task.title}</span>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveManualTask(index)}
                                        className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                            {manualTasks.length === 0 && (
                                <p className="text-xs text-gray-400 text-center py-4">No custom tasks added yet.</p>
                            )}
                        </div>
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-50 mt-8">
                        {shift && (
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={() => deleteShiftMutation.mutate(shift.id as string)}
                                disabled={deleteShiftMutation.isPending}
                                className="mr-auto rounded-xl"
                            >
                                {deleteShiftMutation.isPending ? 'Deleting...' : 'Delete Shift'}
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="h-12 px-8 rounded-xl text-gray-600 font-semibold hover:bg-gray-100"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={createUpdateShiftMutation.isPending}
                            className="h-12 px-10 rounded-xl bg-[#106B4E] hover:bg-[#0D5A41] text-white font-bold text-base transition-all shadow-md active:scale-[0.98]"
                        >
                            {createUpdateShiftMutation.isPending ? (shift ? 'Saving...' : 'Creating...') : (shift ? 'Save' : 'Create')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default AssignedShiftModal;
