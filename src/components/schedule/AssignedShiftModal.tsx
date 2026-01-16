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
import { toast } from "@/components/ui/use-toast";
import { useAuth } from '@/hooks/use-auth';
import { AuthContextType } from '../../contexts/AuthContext.types';
import { format, parseISO } from 'date-fns';
import { API_BASE } from "@/lib/api";
import { Search, Calendar as CalendarIcon, X, Check } from 'lucide-react';

interface StaffMember {
    id: string;
    user?: {
        id: string;
        first_name: string;
        last_name: string;
    };
    first_name?: string;
    last_name?: string;
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
    task_templates?: string[]; // Array of task template IDs
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

    const [selectedStaffId, setSelectedStaffId] = useState(shift?.staff || '');
    const [shiftDate, setShiftDate] = useState(shift?.shift_date || (initialDate ? format(initialDate, 'yyyy-MM-dd') : ''));
    const [startTime, setStartTime] = useState(shift?.start_time?.substring(0, 5) || '09:00');
    const [endTime, setEndTime] = useState(shift?.end_time?.substring(0, 5) || '17:00');
    const [role, setRole] = useState(shift?.role || '');
    const [notes, setNotes] = useState(shift?.notes || '');
    const [selectedTemplates, setSelectedTemplates] = useState<string[]>(shift?.task_templates || []);
    const [templateSearch, setTemplateSearch] = useState('');
    const [isStaffPopoverOpen, setIsStaffPopoverOpen] = useState(false);

    useEffect(() => {
        if (shift) {
            setSelectedStaffId(shift.staff || '');
            setShiftDate(shift.shift_date || '');
            setStartTime(shift.start_time?.substring(0, 5) || '');
            setEndTime(shift.end_time?.substring(0, 5) || '');
            setRole(shift.role || '');
            setNotes(shift.notes || '');
            setSelectedTemplates(shift.task_templates || []);
        } else {
            setSelectedStaffId('');
            setShiftDate(initialDate ? format(initialDate, 'yyyy-MM-dd') : '');
            setStartTime('09:00');
            setEndTime('17:00');
            setRole('');
            setNotes('');
            setSelectedTemplates([]);
        }
        setTemplateSearch(''); // Reset search when modal opens/shift changes
    }, [shift, initialDate]);

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
            // Map data safely, handling both nested and flat structures
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
        mutationFn: async (data: AssignedShift) => {
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

            const dateStr = data.shift_date;
            const payloadISO = { ...data, start_time: makeISO(dateStr, data.start_time), end_time: makeISO(dateStr, data.end_time), break_duration: data.break_duration ?? '00:30:00' };
            const payloadTime = { ...data, start_time: withSeconds(data.start_time), end_time: withSeconds(data.end_time), break_duration: data.break_duration ?? '00:30:00' };

            if (shift?.id) {
                const url = `${API_BASE}/scheduling/assigned-shifts-v2/${shift.id}/`;
                let response = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payloadISO) });
                if (!response.ok) {
                    if (response.status === 401) { logout(); throw new Error('Session expired'); }
                    let errText = ''; try { errText = await response.text(); } catch { }
                    const needsTime = /combine\(\) argument 2 must be datetime\.time/.test(errText);
                    const needsDatetime = /Datetime has wrong format/.test(errText) || /datetime/i.test(errText);
                    let retried = false;
                    if (needsTime) { response = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payloadTime) }); retried = true; }
                    else if (needsDatetime && response.status === 400) { response = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payloadISO) }); retried = true; }
                    if (!response.ok) { let finalText = ''; try { finalText = retried ? await response.text() : errText; } catch { } throw new Error(finalText || 'Failed to update shift'); }
                }
                return response.json();
            }

            let scheduleId = weeklyScheduleId;
            if (!scheduleId) {
                const weekStart = getWeekStart(dateStr);
                const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
                const weekStartStr = toYMD(weekStart);
                const weekEndStr = toYMD(weekEnd);
                const listRes = await fetch(`${API_BASE}/scheduling/weekly-schedules/`, { headers: { Authorization: `Bearer ${token}` } });
                if (listRes.ok) {
                    const listJson = await listRes.json();
                    const arr = Array.isArray(listJson?.results) ? listJson.results : listJson;
                    const existing = Array.isArray(arr) ? arr.find((s: any) => s.week_start === weekStartStr) : undefined;
                    if (existing) scheduleId = existing.id;
                }
                if (!scheduleId) {
                    const createRes = await fetch(`${API_BASE}/scheduling/weekly-schedules/`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ week_start: weekStartStr, week_end: weekEndStr, is_published: false }) });
                    if (createRes.ok) {
                        const created = await createRes.json(); scheduleId = created.id;
                    } else if (createRes.status === 400) {
                        const retryListRes = await fetch(`${API_BASE}/scheduling/weekly-schedules/`, { headers: { Authorization: `Bearer ${token}` } });
                        if (retryListRes.ok) { const retryJson = await retryListRes.json(); const arr = Array.isArray(retryJson?.results) ? retryJson.results : retryJson; const existing = Array.isArray(arr) ? arr.find((s: any) => s.week_start === weekStartStr) : undefined; if (existing) scheduleId = existing.id; }
                    } else {
                        throw new Error(`Failed to ensure weekly schedule (${createRes.status})`);
                    }
                }
            }
            if (!scheduleId) throw new Error('No weekly schedule available');

            let response = await fetch(`${API_BASE}/scheduling/weekly-schedules/${scheduleId}/assigned-shifts/`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...payloadISO, schedule: scheduleId }) });
            if (!response.ok) {
                let errText = ''; try { errText = await response.text(); } catch { }
                const needsTime = /combine\(\) argument 2 must be datetime\.time/.test(errText);
                const needsDatetime = /Datetime has wrong format/.test(errText) || /datetime/i.test(errText);
                let retried = false;
                if (needsTime) { response = await fetch(`${API_BASE}/scheduling/weekly-schedules/${scheduleId}/assigned-shifts/`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...payloadTime, schedule: scheduleId }) }); retried = true; }
                else if (needsDatetime && response.status === 400) { response = await fetch(`${API_BASE}/scheduling/weekly-schedules/${scheduleId}/assigned-shifts/`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...payloadISO, schedule: scheduleId }) }); retried = true; }
                if (!response.ok) { let finalText = ''; try { finalText = retried ? await response.text() : errText; } catch { } throw new Error(finalText || 'Failed to create shift'); }
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['weekly-schedule', weeklyScheduleId] });
            queryClient.invalidateQueries({ queryKey: ['shifts'] });
            queryClient.invalidateQueries({ queryKey: ['assigned-shifts'] });
            toast({
                title: `Shift ${shift?.id ? 'updated' : 'created'} successfully!`,
                description: `The shift has been ${shift?.id ? 'updated' : 'created'}.`,
            });
            onClose();
        },
        onError: (error: any) => {
            toast({
                title: `Failed to ${shift?.id ? 'update' : 'create'} shift.`,
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
        if (!selectedStaffId || !shiftDate || !startTime || !endTime || !role) {
            toast({ title: 'Missing required fields', description: 'Please select staff, date, start, end, and role.', variant: 'destructive' });
            return;
        }
        const startM = toMinutes(startTime);
        const endM = toMinutes(endTime);
        if (endM <= startM) {
            toast({ title: 'Invalid time range', description: 'End time must be after start time for the same day.', variant: 'destructive' });
            return;
        }
        const durationH = (endM - startM) / 60;
        if (durationH < 1 || durationH > 12) {
            toast({ title: 'Invalid shift duration', description: 'Shift must be between 1 and 12 hours per company policy.', variant: 'destructive' });
            return;
        }

        const shiftData: AssignedShift = {
            staff: selectedStaffId,
            shift_date: shiftDate,
            start_time: startTime,
            end_time: endTime,
            role: role,
            notes: notes,
            task_templates: selectedTemplates,
            ...(weeklyScheduleId && { schedule: weeklyScheduleId }),
        };

        const token = localStorage.getItem('access_token');
        const params = new URLSearchParams({ staff_id: selectedStaffId, shift_date: shiftDate, start_time: `${startTime}:00`, end_time: `${endTime}:00` });
        fetch(`${API_BASE}/scheduling/assigned-shifts-v2/detect_conflicts/?${params.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } })
            .then(async (res) => {
                if (!res.ok) throw new Error(await res.text());
                return res.json();
            })
            .then((conf) => {
                if (conf?.has_conflicts) {
                    toast({ title: 'Scheduling conflict', description: 'This staff has overlapping shifts at the selected time.', variant: 'destructive' });
                } else {
                    createUpdateShiftMutation.mutate(shiftData);
                }
            })
            .catch(() => createUpdateShiftMutation.mutate(shiftData));
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
            <DialogContent className="sm:max-w-[700px] bg-white rounded-3xl p-8">
                <DialogHeader className="pb-2">
                    <DialogTitle className="text-xl font-bold text-[#1F2937]">Create Schedule</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                    {/* Staff Member */}
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-[#1F2937]">Staff Member</Label>
                        <Popover open={isStaffPopoverOpen} onOpenChange={setIsStaffPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={isStaffPopoverOpen}
                                    className="w-full h-12 bg-[#F6AD55] hover:bg-[#ED8936] text-white border-none rounded-xl px-4 flex justify-between items-center text-base font-medium transition-colors shadow-sm"
                                >
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        {selectedStaffId ? (
                                            <>
                                                <Avatar className="h-6 w-6 border border-white/20">
                                                    <AvatarFallback className="text-[10px] bg-white/20 text-white">
                                                        {(() => {
                                                            const s = staffMembers?.find(st => st.id === selectedStaffId);
                                                            return `${(s?.user?.first_name || s?.first_name || "")[0] || ""}${(s?.user?.last_name || s?.last_name || "")[0] || ""}`;
                                                        })()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="truncate">
                                                    {(() => {
                                                        const s = staffMembers?.find(st => st.id === selectedStaffId);
                                                        return s ? `${s.user?.first_name || s.first_name || ""} ${s.user?.last_name || s.last_name || ""}` : "Select staff member...";
                                                    })()}
                                                </span>
                                            </>
                                        ) : (
                                            "Select staff member..."
                                        )}
                                    </div>
                                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl shadow-2xl border-gray-100 overflow-hidden" align="start">
                                <Command className="rounded-xl border-none">
                                    <CommandInput placeholder="Search staff by name..." className="h-12 border-none focus:ring-0" />
                                    <CommandList className="max-h-[300px]">
                                        <CommandEmpty className="py-6 text-center text-sm text-gray-500">No staff found.</CommandEmpty>
                                        <CommandGroup>
                                            {isLoadingStaff ? (
                                                <div className="p-4 text-center text-sm text-gray-500 italic">Loading staff...</div>
                                            ) : staffError ? (
                                                <div className="p-4 text-center text-sm text-red-500 font-medium italic">Error loading staff</div>
                                            ) : (
                                                staffMembers?.filter(s => String(s.user?.id) !== String(user?.id)).map((s) => (
                                                    <CommandItem
                                                        key={s.id}
                                                        value={`${s.user?.first_name || s.first_name || ""} ${s.user?.last_name || s.last_name || ""}`}
                                                        onSelect={() => {
                                                            setSelectedStaffId(s.id);
                                                            setIsStaffPopoverOpen(false);
                                                        }}
                                                        className="flex items-center gap-2 p-3 aria-selected:bg-orange-50 cursor-pointer"
                                                    >
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarFallback className="text-xs bg-orange-100 text-orange-700">
                                                                {`${(s.user?.first_name || s.first_name || "")[0] || ""}${(s.user?.last_name || s.last_name || "")[0] || ""}`}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-semibold text-gray-900">
                                                                {`${s.user?.first_name || s.first_name || ""} ${s.user?.last_name || s.last_name || ""}`}
                                                            </span>
                                                            {s.role && <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">{s.role}</span>}
                                                        </div>
                                                        {selectedStaffId === s.id && (
                                                            <Check className="ml-auto h-4 w-4 text-[#106B4E]" />
                                                        )}
                                                    </CommandItem>
                                                ))
                                            )}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

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

                    {/* Description */}
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-[#1F2937]">Description (Optional)</Label>
                        <Textarea
                            placeholder="Additional notes for this shift..."
                            value={notes || ''}
                            onChange={(e) => setNotes(e.target.value)}
                            className="min-h-[100px] rounded-xl border-gray-200 resize-none"
                        />
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
                            <p className="text-[10px] text-gray-500 mt-1">
                                Selected: {startTime ? new Date(`2000-01-01T${startTime}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }) : '--'}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-[#1F2937]">End Time</Label>
                            <div className="relative">
                                <Input
                                    type="datetime-local"
                                    value={`${shiftDate}T${endTime}`}
                                    onChange={(e) => {
                                        const [date, time] = e.target.value.split('T');
                                        // We keep the start date for both for now, as shifts are usually single day
                                        setEndTime(time);
                                    }}
                                    className="h-12 rounded-xl border-gray-200 pl-4 pr-10"
                                    required
                                />
                                <CalendarIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1">
                                Selected: {endTime ? new Date(`2000-01-01T${endTime}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }) : '--'}
                            </p>
                        </div>
                    </div>

                    {/* Process & Task Templates */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold text-[#1F2937]">Process & Task Templates</Label>
                            <div className="relative w-48">
                                <Input
                                    placeholder="Search templates..."
                                    value={templateSearch}
                                    onChange={(e) => setTemplateSearch(e.target.value)}
                                    className="h-8 rounded-lg border-gray-200 pl-8 pr-2 text-xs"
                                />
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            </div>
                        </div>
                        <div className="bg-[#F9FAFB] border border-gray-100 rounded-2xl p-4 max-h-[200px] overflow-y-auto space-y-4">
                            {isLoadingTemplates ? (
                                <p className="text-sm text-gray-500 text-center py-4">Loading templates...</p>
                            ) : filteredTemplates?.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-4">No templates found</p>
                            ) : (
                                filteredTemplates?.map((template) => (
                                    <div
                                        key={template.id}
                                        className="flex items-start gap-3 group cursor-pointer"
                                        onClick={() => toggleTemplate(template.id)}
                                    >
                                        <Checkbox
                                            id={template.id}
                                            checked={selectedTemplates.includes(template.id)}
                                            onCheckedChange={() => toggleTemplate(template.id)}
                                            className="mt-1 rounded-md border-gray-300 data-[state=checked]:bg-[#106B4E] data-[state=checked]:border-[#106B4E]"
                                        />
                                        <div className="space-y-0.5">
                                            <Label htmlFor={template.id} className="text-sm font-bold text-[#1F2937] leading-none cursor-pointer">
                                                {template.name}
                                            </Label>
                                            <p className="text-xs text-gray-500 line-clamp-1">
                                                {template.description || "Automatically add tasks to this shift."}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <p className="text-[10px] text-gray-400 pt-1">Select templates to automatically add tasks to this shift.</p>
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
