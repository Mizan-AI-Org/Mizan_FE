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
import TaskTemplateSelector from "@/components/schedule/TaskTemplateSelector";
import { useTaskTemplates } from "@/hooks/useTaskTemplates";
import type { Shift, Task } from "@/types/schedule";

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

// Use shared Task and Shift interfaces from types/schedule

interface ShiftModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (shift: Shift) => void;
    initialShift?: Shift | null;
    dayIndex?: number;
    hour?: number;
    staffMembers: StaffMember[];
    // Testing-only: allow preselecting a template to avoid brittle UI interaction
    testDefaultTemplateId?: string;
}

const ShiftModal: React.FC<ShiftModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialShift,
    dayIndex,
    hour,
    staffMembers,
    testDefaultTemplateId,
}) => {
    // Helpers for date handling
    const toYMD = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const getWeekStart = (d: Date) => {
        const date = new Date(d);
        const day = date.getDay(); // 0=Sun, 1=Mon
        const diff = day === 0 ? -6 : 1 - day; // Monday as start
        date.setDate(date.getDate() + diff);
        date.setHours(0, 0, 0, 0);
        return date;
    };
    const [shiftData, setShiftData] = useState<Shift>(() => {
        if (initialShift && initialShift.date) return initialShift;

        const startHour = hour !== undefined ? String(hour).padStart(2, '0') : '09';
        const endHour = hour !== undefined ? String(hour + 1).padStart(2, '0') : '10';

        // Default date based on dayIndex within current week, or today
        const today = new Date();
        const monday = getWeekStart(today);
        const base = new Date(monday);
        base.setDate(monday.getDate() + (dayIndex !== undefined ? dayIndex : 0));

        return {
            id: Date.now().toString(),
            title: "",
            start: `${startHour}:00`,
            end: `${endHour}:00`,
            date: toYMD(base),
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
    const {
        templates,
        loading: templatesLoading,
        error: templatesError,
        selectedId: selectedTemplateIdFromHook,
        setSelectedId: setSelectedTemplateIdFromHook,
    } = useTaskTemplates({ pollIntervalMs: 10000 });
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
    // Multi-select template management and persistence
    const MAX_SELECTION = 10;
    const STORAGE_KEY = 'shiftModalTemplateSelections';
    const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
    const [templateSelectionError, setTemplateSelectionError] = useState<string | null>(null);
    const [persistingSelections, setPersistingSelections] = useState<boolean>(false);
    const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Preselect a template in tests to avoid interacting with Radix Select
    useEffect(() => {
        if (testDefaultTemplateId) {
            setSelectedTemplateId(String(testDefaultTemplateId));
        }
    }, [testDefaultTemplateId]);
    const [assignmentFrequency, setAssignmentFrequency] = useState<'ONE_TIME' | 'DAILY' | 'WEEKLY' | 'CUSTOM'>("ONE_TIME");
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    useEffect(() => {
        if (initialShift) {
            // If editing and date missing for some reason, derive from day index
            if (!initialShift.date) {
                const today = new Date();
                const monday = getWeekStart(today);
                const base = new Date(monday);
                base.setDate(monday.getDate() + (initialShift.day ?? 0));
                setShiftData({ ...initialShift, date: toYMD(base) });
            } else {
                setShiftData(initialShift);
            }
        } else if (isOpen) {
            const startHour = hour !== undefined ? String(hour).padStart(2, '0') : '09';
            const endHour = hour !== undefined ? String(hour + 1).padStart(2, '0') : '10';

            const today = new Date();
            const monday = getWeekStart(today);
            const base = new Date(monday);
            base.setDate(monday.getDate() + (dayIndex !== undefined ? dayIndex : 0));

            setShiftData({
                id: Date.now().toString(),
                title: "",
                start: `${startHour}:00`,
                end: `${endHour}:00`,
                date: toYMD(base),
                day: dayIndex !== undefined ? dayIndex : 0,
                staffId: staffMembers.length > 0 ? staffMembers[0].id : "",
                color: "#6b7280",
                tasks: [],
            });
        }
    }, [initialShift, isOpen, dayIndex, hour, staffMembers]);

    // Load persisted template selections per staff when modal opens
    useEffect(() => {
        if (!isOpen) return;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const map = JSON.parse(raw) as Record<string, string[]>;
                const ids = map[String(shiftData.staffId)] || [];
                setSelectedTemplateIds(ids.map(String));
            }
        } catch (_: unknown) {
            // ignore
        }
    }, [isOpen, shiftData.staffId]);

    // Cache staff members locally to improve subsequent openings
    useEffect(() => {
        if (isOpen) {
            if (staffMembers && staffMembers.length > 0) {
                try {
                    localStorage.setItem('shiftModalStaffCache', JSON.stringify({ ts: Date.now(), staff: staffMembers }));
                    setCachedStaff(staffMembers);
                } catch (_: unknown) {
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
                } catch (_: unknown) {
                    // ignore
                }
            }
        }
    }, [isOpen, staffMembers]);

    useEffect(() => {
        if (!isOpen) return;
        if (testDefaultTemplateId) {
            setSelectedTemplateId(String(testDefaultTemplateId));
            setSelectedTemplateIdFromHook(String(testDefaultTemplateId));
        } else if (!selectedTemplateId && selectedTemplateIdFromHook) {
            setSelectedTemplateId(String(selectedTemplateIdFromHook));
        }
    }, [isOpen, testDefaultTemplateId, selectedTemplateIdFromHook]);

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

    const updateTemplateSelectionStorage = (ids: string[]) => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const map = raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
            map[String(shiftData.staffId)] = ids.map(String);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
        } catch (_: unknown) {
            // ignore storage errors
        }
    };

    const handleTemplateIdsChange = (ids: string[]) => {
        if (ids.length > MAX_SELECTION) {
            setTemplateSelectionError(`You can select up to ${MAX_SELECTION} templates`);
            return;
        }
        setTemplateSelectionError(null);
        setSelectedTemplateIds(ids.map(String));
        updateTemplateSelectionStorage(ids);
    };

    const persistTemplateSelections = async () => {
        setPersistingSelections(true);
        setSaveFeedback(null);
        try {
            const res = await fetch('/api/shift-template-selections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ staffId: shiftData.staffId, templateIds: selectedTemplateIds }),
            });
            if (!res.ok) throw new Error(`Failed to save selections (${res.status})`);
            setSaveFeedback({ type: 'success', message: 'Template selections saved' });
        } catch (e: unknown) {
            const errMsg = e instanceof Error ? e.message : 'Failed to save template selections';
            setSaveFeedback({ type: 'error', message: errMsg });
        } finally {
            setPersistingSelections(false);
        }
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

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            // Basic validation: require date
            if (!shiftData.date || String(shiftData.date).trim() === "") {
                setSaveFeedback({ type: 'error', message: 'Please select a date for the shift.' });
                setIsSubmitting(false);
                return;
            }
            // Persist selections before saving the shift
            await persistTemplateSelections();
            // Support both synchronous and Promise returns without truthiness checks
            await Promise.resolve(onSave(shiftData));
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    const nonAdminStaffMembers = staffMembers.filter((staff) => {
        const r = (staff.role || '').toLowerCase();
        return r !== 'admin' && r !== 'super_admin' && r !== 'super-admin';
    });

    // Use cached staff if available, otherwise fall back to prop
    const sourceStaff: StaffMember[] = (cachedStaff && cachedStaff.length > 0)
        ? cachedStaff
        : staffMembers;

    // Exclude admin/super-admin from assignment list
    const allStaffMembers: StaffMember[] = sourceStaff.filter((staff) => {
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
                        <Label htmlFor="date" className="text-right">Date <span className="text-red-500">*</span></Label>
                        <Input id="date" type="date" value={shiftData.date} onChange={handleChange} className="col-span-3" />
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
                            <div className="space-y-2" aria-busy={persistingSelections}>
                                <Label className="text-xs text-gray-600">Templates</Label>
                                {selectedTemplateIds.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {(templates || []).filter(t => selectedTemplateIds.includes(String(t.id))).map(t => (
                                            <Badge key={String(t.id)} variant="secondary" className="text-xs">
                                                {t.name}
                                                <button
                                                    type="button"
                                                    className="ml-2 inline-flex items-center"
                                                    onClick={() => handleTemplateIdsChange(selectedTemplateIds.filter(x => x !== String(t.id)))}
                                                    aria-label={`Remove ${t.name}`}
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                )}

                                <TaskTemplateSelector
                                    multiselect
                                    selectedIds={selectedTemplateIds}
                                    onChangeSelected={handleTemplateIdsChange}
                                    showFilters
                                />

                                {templatesLoading && (
                                    <div className="space-y-1">
                                        <Skeleton className="h-6 w-full" />
                                        <Skeleton className="h-6 w-3/4" />
                                    </div>
                                )}
                                {templatesError && (
                                    <div className="mt-2">
                                        <Alert variant="destructive" role="alert">
                                            <AlertTitle>Failed to load templates</AlertTitle>
                                            <AlertDescription>{templatesError}</AlertDescription>
                                        </Alert>
                                    </div>
                                )}
                                {templateSelectionError && (
                                    <div className="mt-2">
                                        <Alert variant="destructive" role="alert">
                                            <AlertTitle>Selection limit reached</AlertTitle>
                                            <AlertDescription>{templateSelectionError}</AlertDescription>
                                        </Alert>
                                    </div>
                                )}
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
                                    <Button size="sm" onClick={handleAddTask} aria-label="Add manual task">Add</Button>
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
                                                aria-label={`Remove task ${task.title}`}
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
                    <Button variant="outline" onClick={onClose} aria-label="Cancel and close">Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting} aria-busy={isSubmitting} aria-label="Save shift changes">
                        {isSubmitting ? 'Saving…' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ShiftModal;
