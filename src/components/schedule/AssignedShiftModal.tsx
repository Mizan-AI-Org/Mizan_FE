/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from '@/hooks/use-auth';
import { AuthContextType } from '../../contexts/AuthContext.types';
import { format } from 'date-fns';
import { API_BASE } from "@/lib/api";

interface StaffMember {
    id: string;
    user: {
        id: string;
        first_name: string;
        last_name: string;
    };
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
    const { logout } = useAuth() as AuthContextType;

    const [selectedStaffId, setSelectedStaffId] = useState(shift?.staff || '');
    const [shiftDate, setShiftDate] = useState(shift?.shift_date || (initialDate ? format(initialDate, 'yyyy-MM-dd') : ''));
    const [startTime, setStartTime] = useState(shift?.start_time?.substring(0, 5) || '09:00');
    const [endTime, setEndTime] = useState(shift?.end_time?.substring(0, 5) || '17:00');
    const [role, setRole] = useState(shift?.role || '');
    const [notes, setNotes] = useState(shift?.notes || '');
    const [selectedTemplates, setSelectedTemplates] = useState<string[]>(shift?.task_templates || []);

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
            return data.map((s: any) => ({ id: s.user.id, user: { id: s.user.id, first_name: s.user.first_name, last_name: s.user.last_name } }));
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
            queryClient.invalidateQueries(['weekly-schedule']);
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
            queryClient.invalidateQueries(['weekly-schedule']);
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

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{shift ? 'Edit Assigned Shift' : 'Assign New Shift'}</DialogTitle>
                    <DialogDescription>
                        {shift ? 'Modify the details of this assigned shift.' : 'Assign a new shift to a staff member.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="staff" className="text-right">Staff Member</Label>
                        <Select onValueChange={setSelectedStaffId} value={selectedStaffId} required>
                            <SelectTrigger className="col-span-3" id="staff">
                                <SelectValue placeholder="Select a staff member" />
                            </SelectTrigger>
                            <SelectContent>
                                {isLoadingStaff ? (
                                    <SelectItem value="__loading_staff__" disabled>Loading staff...</SelectItem>
                                ) : staffError ? (
                                    <SelectItem value="__staff_error__" disabled>Error loading staff</SelectItem>
                                ) : (
                                    staffMembers?.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>{`${s.user.first_name} ${s.user.last_name}`}</SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="shiftDate" className="text-right">Shift Date</Label>
                        <Input
                            id="shiftDate"
                            type="date"
                            value={shiftDate}
                            onChange={(e) => setShiftDate(e.target.value)}
                            className="col-span-3"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="startTime" className="text-right">Start Time</Label>
                        <Input
                            id="startTime"
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="col-span-3"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="endTime" className="text-right">End Time</Label>
                        <Input
                            id="endTime"
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="col-span-3"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="role" className="text-right">Role</Label>
                        <Select onValueChange={setRole} value={role} required>
                            <SelectTrigger className="col-span-3" id="role">
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                                {roleOptions.map((r) => (
                                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label htmlFor="templates" className="text-right pt-2">Task Templates</Label>
                        <div className="col-span-3">
                            <Select
                                value={selectedTemplates.length > 0 ? selectedTemplates[0] : undefined}
                                onValueChange={(value) => {
                                    if (!selectedTemplates.includes(value)) {
                                        setSelectedTemplates([...selectedTemplates, value]);
                                    }
                                }}
                            >
                                <SelectTrigger id="templates">
                                    <SelectValue placeholder={selectedTemplates.length > 0 ? `${selectedTemplates.length} template(s) selected` : "Select task templates"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {isLoadingTemplates ? (
                                        <SelectItem value="__loading_templates__" disabled>Loading templates...</SelectItem>
                                    ) : (
                                        taskTemplates?.map((template) => (
                                            <SelectItem
                                                key={template.id}
                                                value={template.id}
                                                disabled={selectedTemplates.includes(template.id)}
                                            >
                                                {template.name}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                            {selectedTemplates.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {selectedTemplates.map((templateId) => {
                                        const template = taskTemplates?.find(t => t.id === templateId);
                                        return (
                                            <div key={templateId} className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm">
                                                <span>{template?.name || 'Unknown'}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedTemplates(selectedTemplates.filter(id => id !== templateId))}
                                                    className="hover:text-destructive ml-1"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label htmlFor="notes" className="text-right">Notes (Optional)</Label>
                        <Textarea
                            id="notes"
                            value={notes || ''}
                            onChange={(e) => setNotes(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                    <DialogFooter className="mt-4 w-full flex items-center gap-8">
                        {shift && (
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={() => deleteShiftMutation.mutate(shift.id as string)}
                                disabled={deleteShiftMutation.isLoading}
                            >
                                {deleteShiftMutation.isLoading ? 'Deleting...' : 'Delete Shift'}
                            </Button>
                        )}
                        <div className="flex-1" />
                        <div className="flex gap-2 justify-end">
                            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                            <Button type="submit" disabled={createUpdateShiftMutation.isLoading}>
                                {createUpdateShiftMutation.isLoading ? 'Saving...' : 'Save Shift'}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default AssignedShiftModal;
