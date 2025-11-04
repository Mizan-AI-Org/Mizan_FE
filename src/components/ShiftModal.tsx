import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { X } from "lucide-react";

interface StaffMember {
    id: string;
    first_name: string;
    last_name: string;
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

interface Task {
    id: string;
    title: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    frequency?: 'ONE_TIME' | 'DAILY' | 'WEEKLY' | 'CUSTOM';
}

interface Shift {
    id: string;
    title: string;
    start: string;
    end: string;
    day: number;
    staffId: string;
    color?: string;
    tasks?: Task[];
}

interface ShiftModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (shift: Shift) => void;
    initialShift?: Shift | null;
    dayIndex?: number;
    hour?: number;
    staffMembers: StaffMember[];
}

const ShiftModal: React.FC<ShiftModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialShift,
    dayIndex,
    hour,
    staffMembers,
}) => {
    const [shiftData, setShiftData] = useState<Shift>(() => {
        if (initialShift) return initialShift;

        const startHour = hour !== undefined ? String(hour).padStart(2, '0') : '09';
        const endHour = hour !== undefined ? String(hour + 1).padStart(2, '0') : '10';

        return {
            id: Date.now().toString(),
            title: "",
            start: `${startHour}:00`,
            end: `${endHour}:00`,
            day: dayIndex !== undefined ? dayIndex : 0,
            staffId: staffMembers.length > 0 ? staffMembers[0].id : "",
            color: "#6b7280",
            tasks: [],
        };
    });

    const [newTask, setNewTask] = useState<{ title: string; priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' }>({
        title: "",
        priority: "MEDIUM",
    });
    const [staffSearch, setStaffSearch] = useState("");
    const [isFiltering, setIsFiltering] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 50;
    const [selectedIndex, setSelectedIndex] = useState<number>(0);
    const [cachedStaff, setCachedStaff] = useState<StaffMember[]>([]);
    const [templates, setTemplates] = useState<TaskTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
    const [assignmentFrequency, setAssignmentFrequency] = useState<'ONE_TIME' | 'DAILY' | 'WEEKLY' | 'CUSTOM'>("ONE_TIME");

    useEffect(() => {
        if (initialShift) {
            setShiftData(initialShift);
        } else if (isOpen) {
            const startHour = hour !== undefined ? String(hour).padStart(2, '0') : '09';
            const endHour = hour !== undefined ? String(hour + 1).padStart(2, '0') : '10';

            setShiftData({
                id: Date.now().toString(),
                title: "",
                start: `${startHour}:00`,
                end: `${endHour}:00`,
                day: dayIndex !== undefined ? dayIndex : 0,
                staffId: staffMembers.length > 0 ? staffMembers[0].id : "",
                color: "#6b7280",
                tasks: [],
            });
        }
    }, [initialShift, isOpen, dayIndex, hour, staffMembers]);

    // Cache staff members locally to improve subsequent openings
    useEffect(() => {
        if (isOpen) {
            if (staffMembers && staffMembers.length > 0) {
                try {
                    localStorage.setItem('shiftModalStaffCache', JSON.stringify({ ts: Date.now(), staff: staffMembers }));
                    setCachedStaff(staffMembers);
                } catch (_) {
                    setCachedStaff(staffMembers);
                }
            } else {
                try {
                    const raw = localStorage.getItem('shiftModalStaffCache');
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        // 10 minute TTL
                        if (parsed.ts && (Date.now() - parsed.ts) < 10 * 60 * 1000 && Array.isArray(parsed.staff)) {
                            setCachedStaff(parsed.staff as StaffMember[]);
                        }
                    }
                } catch (_) {
                    // ignore
                }
            }
        }
    }, [isOpen, staffMembers]);

    useEffect(() => {
        const loadTemplates = async () => {
            try {
                const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:8000/api';
                const res = await fetch(`${API_BASE}/scheduling/task-templates/`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
                });
                if (!res.ok) return;
                const data = await res.json();
                setTemplates((data.results || data || []) as TaskTemplate[]);
            } catch (e) {
                // silently ignore for now
            }
        };
        if (isOpen) loadTemplates();
    }, [isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setShiftData(prev => ({
            ...prev,
            [id]: value,
        }));
    };

    const handleSelectChange = (value: string, id: string) => {
        setShiftData(prev => ({
            ...prev,
            [id]: value,
        }));
    };

    const handleAddTask = () => {
        if (newTask.title.trim()) {
            setShiftData(prev => ({
                ...prev,
                tasks: [...(prev.tasks || []), { id: Date.now().toString(), ...newTask, frequency: assignmentFrequency }],
            }));
            setNewTask({ title: "", priority: "MEDIUM" });
        }
    };

    const handleRemoveTask = (taskId: string) => {
        setShiftData(prev => ({
            ...prev,
            tasks: (prev.tasks || []).filter(t => t.id !== taskId),
        }));
    };

    const handleSubmit = () => {
        onSave(shiftData);
        onClose();
    };

    const nonAdminStaffMembers = staffMembers.filter((staff) => {
        const r = (staff.role || '').toLowerCase();
        return r !== 'admin' && r !== 'super_admin' && r !== 'super-admin';
    });

    const filteredStaff = staffSearch.trim()
        ? allStaffMembers.filter(staff => {
            const q = staffSearch.toLowerCase();
            const name = `${staff.first_name} ${staff.last_name}`.toLowerCase();
            const role = (staff.role || '').toLowerCase();
            return name.includes(q) || role.includes(q);
        })
        : allStaffMembers;

    const totalPages = Math.max(1, Math.ceil(filteredStaff.length / PAGE_SIZE));
    const paginatedStaff = filteredStaff.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    useEffect(() => {
        // Reset pagination and selection when search changes
        setCurrentPage(1);
        setSelectedIndex(0);
    }, [staffSearch]);

    // Debounced filtering indicator
    useEffect(() => {
        if (!isOpen) return;
        setIsFiltering(true);
        const t = setTimeout(() => setIsFiltering(false), 150);
        return () => clearTimeout(t);
    }, [staffSearch, isOpen]);

    const handleStaffKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (paginatedStaff.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, paginatedStaff.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const staff = paginatedStaff[selectedIndex];
            if (staff) {
                handleSelectChange(staff.id, 'staffId');
            }
        } else if (e.key === 'PageDown') {
            e.preventDefault();
            setCurrentPage(prev => Math.min(prev + 1, totalPages));
            setSelectedIndex(0);
        } else if (e.key === 'PageUp') {
            e.preventDefault();
            setCurrentPage(prev => Math.max(prev - 1, 1));
            setSelectedIndex(0);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{initialShift ? "Edit Shift" : "Create New Shift"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="title" className="text-right">Title</Label>
                        <Input id="title" placeholder="New Shift" value={shiftData.title} onChange={handleChange} className="col-span-3" />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Time</Label>
                        <div className="col-span-3 flex gap-2">
                            <div className="flex-1">
                                <Label htmlFor="start" className="text-xs text-gray-600">Start</Label>
                                <Input id="start" type="time" value={shiftData.start} onChange={handleChange} />
                            </div>
                            <div className="flex-1">
                                <Label htmlFor="end" className="text-xs text-gray-600">End</Label>
                                <Input id="end" type="time" value={shiftData.end} onChange={handleChange} />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label htmlFor="staffId" className="text-right pt-2">Staff <span className="text-red-500">*</span></Label>
                        <div className="col-span-3 space-y-3">
                            <div className="flex items-center gap-2">
                                <Input
                                    placeholder="Search by name or role..."
                                    value={staffSearch}
                                    onChange={(e) => setStaffSearch(e.target.value)}
                                    className="text-sm"
                                    aria-label="Search staff"
                                />
                                {isFiltering && (
                                    <Badge variant="outline" className="text-xs">Filtering…</Badge>
                                )}
                            </div>

                            {/* Staff list with single selection, keyboard navigation, pagination */}
                            <div
                                className="border rounded-md p-2 max-h-64 overflow-y-auto focus:outline-none"
                                tabIndex={0}
                                onKeyDown={handleStaffKeyDown}
                                aria-label="Staff selection list"
                                role="listbox"
                            >
                                {sourceStaff.length === 0 && staffSearch.trim() === "" && (
                                    <div className="mb-2">
                                        <Alert variant="destructive">
                                            <AlertTitle>Failed to load staff</AlertTitle>
                                            <AlertDescription>
                                                Unable to load staff members. Please check your connection and try again.
                                            </AlertDescription>
                                        </Alert>
                                    </div>
                                )}
                                {paginatedStaff.length === 0 && (
                                    <div className="p-3 text-sm text-muted-foreground">No staff members found</div>
                                )}

                                {paginatedStaff.length === 0 && sourceStaff.length === 0 && (
                                    <div className="space-y-2">
                                        <Skeleton className="h-8 w-full" />
                                        <Skeleton className="h-8 w-full" />
                                        <Skeleton className="h-8 w-full" />
                                    </div>
                                )}

                                {paginatedStaff.map((staff, idx) => {
                                    const isSelected = String(shiftData.staffId) === String(staff.id);
                                    const isActive = selectedIndex === idx;
                                    return (
                                        <button
                                            key={staff.id}
                                            type="button"
                                            onClick={() => handleSelectChange(staff.id, 'staffId')}
                                            className={`w-full flex items-center gap-3 px-2 py-2 rounded-md text-left mb-1 ${
                                                isSelected ? 'bg-primary/10 border border-primary' : 'hover:bg-muted'
                                            } ${isActive ? 'ring-2 ring-primary' : ''}`}
                                            role="option"
                                            aria-selected={isSelected}
                                        >
                                            <Avatar className="h-8 w-8">
                                                {staff.avatar_url ? (
                                                    <AvatarImage src={staff.avatar_url} alt={`${staff.first_name} ${staff.last_name}`} />
                                                ) : (
                                                    <AvatarFallback>
                                                        {`${staff.first_name?.[0] || ''}${staff.last_name?.[0] || ''}`}
                                                    </AvatarFallback>
                                                )}
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">
                                                    {staff.first_name} {staff.last_name}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate capitalize">{staff.role || 'Staff'}</p>
                                            </div>
                                            {isSelected && (
                                                <Badge variant="secondary" className="text-xs">Selected</Badge>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {filteredStaff.length > PAGE_SIZE && (
                                <div className="flex items-center justify-between mt-2">
                                    <p className="text-xs text-muted-foreground">
                                        Page {currentPage} of {totalPages} • {filteredStaff.length} staff
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                        >
                                            Prev
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="color" className="text-right">Color</Label>
                        <Input id="color" type="color" value={shiftData.color} onChange={handleChange} className="col-span-3 h-8" />
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        <Label className="text-right pt-2">Tasks</Label>
                        <div className="col-span-3 space-y-3">
                            {/* Templates and Frequency */}
                            <div className="space-y-2">
                                <div className="grid grid-cols-3 gap-2 items-center">
                                    <div className="col-span-2">
                                        <Label className="text-xs text-gray-600">Template</Label>
                                        <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select task template" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {templates.map(t => (
                                                    <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-gray-600">Frequency</Label>
                                        <Select value={assignmentFrequency} onValueChange={(v) => setAssignmentFrequency(v as 'ONE_TIME' | 'DAILY' | 'WEEKLY' | 'CUSTOM')}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Frequency" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ONE_TIME">One time</SelectItem>
                                                <SelectItem value="DAILY">Every day</SelectItem>
                                                <SelectItem value="WEEKLY">Weekly</SelectItem>
                                                <SelectItem value="CUSTOM">Custom</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => {
                                        const tpl = templates.find(t => String(t.id) === selectedTemplateId);
                                        if (!tpl) return;
                                        const items: TemplateTask[] = (tpl.tasks || []).length > 0 ? (tpl.tasks as TemplateTask[]) : [{ title: tpl.name, priority: 'MEDIUM', estimated_duration: 30 }];
                                        setShiftData(prev => ({
                                            ...prev,
                                            tasks: [
                                                ...(prev.tasks || []),
                                                ...items.map((t) => ({
                                                    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                                                    title: t.title || tpl.name,
                                                    priority: ((t.priority || 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'),
                                                    frequency: assignmentFrequency,
                                                })),
                                            ],
                                        }));
                                    }}
                                    disabled={!selectedTemplateId}
                                >
                                    Add from Template
                                </Button>
                            </div>

                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Task title..."
                                        value={newTask.title}
                                        onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                                        className="flex-1"
                                    />
                                    <Select value={newTask.priority} onValueChange={(value) => setNewTask(prev => ({ ...prev, priority: value as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' }))}>
                                        <SelectTrigger className="w-24">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="LOW">Low</SelectItem>
                                            <SelectItem value="MEDIUM">Medium</SelectItem>
                                            <SelectItem value="HIGH">High</SelectItem>
                                            <SelectItem value="URGENT">Urgent</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button size="sm" onClick={handleAddTask}>Add</Button>
                                </div>
                            </div>

                            {shiftData.tasks && shiftData.tasks.length > 0 && (
                                <div className="space-y-2 bg-gray-50 p-3 rounded">
                                    {shiftData.tasks.map(task => (
                                        <div key={task.id} className="flex items-center justify-between bg-white p-2 rounded border border-gray-200">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{task.title}</p>
                                                <p className="text-xs text-gray-500">
                                                    {task.priority === 'LOW' && 'Low Priority'}
                                                    {task.priority === 'MEDIUM' && 'Medium Priority'}
                                                    {task.priority === 'HIGH' && 'High Priority'}
                                                    {task.priority === 'URGENT' && 'Urgent'}
                                                    {task.frequency && ` • ${task.frequency}`}
                                                </p>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleRemoveTask(task.id)}
                                                className="ml-2 h-6 w-6 p-0"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ShiftModal;
