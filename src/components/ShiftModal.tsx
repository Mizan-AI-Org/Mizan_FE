import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { X, Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTaskTemplates } from "@/hooks/useTaskTemplates";
import { useAuth } from "@/hooks/use-auth";
import { AuthContextType } from "@/contexts/AuthContext.types";
import type { Shift } from "@/types/schedule";

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
    dayIndex?: number;
    hour?: number;
    staffMembers: StaffMember[];
    testDefaultTemplateId?: string;
}

const getStaffColor = (staffId: string) => {
    const colors = [
        '#EF4444', '#F97316', '#F59E0B', '#10B981', '#3B82F6',
        '#6366F1', '#8B5CF6', '#EC4899', '#14B8A6', '#F43F5E'
    ];
    try {
        const idx = Number(BigInt('0x' + staffId.replace(/-/g, '')) % BigInt(colors.length));
        return colors[idx];
    } catch (e) {
        let hash = 0;
        for (let i = 0; i < staffId.length; i++) {
            hash = staffId.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % colors.length;
        return colors[index];
    }
};

const ShiftModal: React.FC<ShiftModalProps> = ({
    isOpen,
    onClose,
    onSave,
    onDelete,
    initialShift,
    dayIndex,
    hour,
    staffMembers,
    testDefaultTemplateId,
}) => {
    const { user } = useAuth() as AuthContextType;

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

    const [shiftData, setShiftData] = useState<Shift>(() => {
        if (initialShift && initialShift.date) return initialShift;
        const startHour = hour !== undefined ? String(hour).padStart(2, '0') : '09';
        const endHour = hour !== undefined ? String(hour + 1).padStart(2, '0') : '10';
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
            color: staffMembers.length > 0 ? getStaffColor(staffMembers[0].id) : "#6b7280",
            tasks: [],
        };
    });

    const [newTask, setNewTask] = useState<{ title: string; priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' }>({
        title: "",
        priority: "MEDIUM",
    });
    const {
        templates,
        loading: templatesLoading,
        selectedId: selectedTemplateIdFromHook,
        setSelectedId: setSelectedTemplateIdFromHook,
    } = useTaskTemplates({ pollIntervalMs: 10000 });

    const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
    const [staffSearch, setStaffSearch] = useState('');
    const [templateSearch, setTemplateSearch] = useState('');
    const [templateSelectionError, setTemplateSelectionError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        if (initialShift) {
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
                color: staffMembers.length > 0 ? getStaffColor(staffMembers[0].id) : "#6b7280",
                tasks: [],
            });
        }
    }, [initialShift, isOpen, dayIndex, hour, staffMembers]);

    const allStaffMembers: StaffMember[] = staffMembers;

    const handleSelectChange = (value: string, id: string) => {
        setShiftData(prev => {
            const updates: any = { [id]: value };
            if (id === 'staffId') {
                updates.color = getStaffColor(value);
            }
            return { ...prev, ...updates };
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setShiftData(prev => ({
            ...prev,
            [id]: value,
        }));
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            if (!shiftData.date || String(shiftData.date).trim() === "") {
                setSaveFeedback({ type: 'error', message: 'Please select a date for the shift.' });
                setIsSubmitting(false);
                return;
            }
            const shiftWithTemplates = {
                ...shiftData,
                task_templates: selectedTemplateIds
            };
            await Promise.resolve(onSave(shiftWithTemplates));
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] bg-white rounded-3xl p-5 border-none shadow-2xl overflow-hidden max-h-[85vh] overflow-y-auto">
                <DialogHeader className="pb-2">
                    <DialogTitle className="text-xl font-bold text-[#1F2937]">Create Schedule</DialogTitle>
                </DialogHeader>

                <div className="space-y-3 mt-2">
                    <div className="space-y-1">
                        <Label className="text-sm font-semibold text-[#1F2937]">Staff Member</Label>
                        <Select
                            value={shiftData.staffId}
                            onValueChange={(value) => handleSelectChange(value, 'staffId')}
                        >
                            <SelectTrigger className="w-full h-10 bg-[#F6AD55] hover:bg-[#ED8936] text-white border-none rounded-xl px-4 text-sm font-medium transition-colors shadow-sm [&>span]:text-white">
                                <SelectValue placeholder="Select staff member..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl shadow-2xl border-gray-100 z-[9999]">
                                <div className="p-2 border-b">
                                    <Input
                                        placeholder="Search staff..."
                                        value={staffSearch}
                                        onChange={(e) => setStaffSearch(e.target.value)}
                                        className="h-8 text-sm"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                                <div className="max-h-[200px] overflow-y-auto">
                                    {allStaffMembers
                                        .filter(s => String(s.user?.id) !== String(user?.id))
                                        .filter(s => {
                                            if (!staffSearch) return true;
                                            const name = `${s.user?.first_name || s.first_name || ''} ${s.user?.last_name || s.last_name || ''}`.toLowerCase();
                                            const role = (s.role || '').toLowerCase();
                                            return name.includes(staffSearch.toLowerCase()) || role.includes(staffSearch.toLowerCase());
                                        })
                                        .map((s) => (
                                            <SelectItem
                                                key={s.id}
                                                value={s.id}
                                                className="cursor-pointer"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-5 w-5">
                                                        <AvatarFallback className="text-[9px] bg-orange-100 text-orange-700">
                                                            {`${(s.user?.first_name || s.first_name || '')[0] || ''}${(s.user?.last_name || s.last_name || '')[0] || ''}`}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-sm">{`${s.user?.first_name || s.first_name || ''} ${s.user?.last_name || s.last_name || ''}`}</span>
                                                    {s.role && <span className="text-xs text-gray-500">• {s.role}</span>}
                                                </div>
                                            </SelectItem>
                                        ))}
                                </div>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1">
                        <Label className="text-sm font-semibold text-[#1F2937]">Shift Title</Label>
                        <Input
                            id="title"
                            placeholder="e.g. Morning Shift, Dinner Service"
                            value={shiftData.title}
                            onChange={handleChange}
                            className="h-10 rounded-xl border-gray-200 focus:ring-[#106B4E] focus:border-[#106B4E]"
                        />
                    </div>

                    <div className="space-y-1">
                        <Label className="text-sm font-semibold text-[#1F2937]">Description (Optional)</Label>
                        <textarea
                            id="notes"
                            placeholder="Additional notes for this shift..."
                            className="w-full min-h-[60px] rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#106B4E]/20 focus:border-[#106B4E] transition-all resize-none"
                            value={(shiftData as any).notes || ""}
                            onChange={(e) => setShiftData(prev => ({ ...prev, notes: e.target.value } as any))}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label className="text-sm font-semibold text-[#1F2937]">Date</Label>
                            <Input
                                type="date"
                                value={shiftData.date}
                                onChange={(e) => setShiftData(prev => ({ ...prev, date: e.target.value }))}
                                className="h-10 rounded-xl border-gray-200 focus:ring-[#106B4E]"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label className="text-sm font-semibold text-[#1F2937]">Start</Label>
                                <Select
                                    value={shiftData.start}
                                    onValueChange={(value) => setShiftData(prev => ({ ...prev, start: value }))}
                                >
                                    <SelectTrigger className="h-10 rounded-xl border-gray-200">
                                        <SelectValue placeholder="Start" />
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
                                <Label className="text-sm font-semibold text-[#1F2937]">End</Label>
                                <Select
                                    value={shiftData.end}
                                    onValueChange={(value) => setShiftData(prev => ({ ...prev, end: value }))}
                                >
                                    <SelectTrigger className="h-10 rounded-xl border-gray-200">
                                        <SelectValue placeholder="End" />
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

                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold text-[#1F2937]">Process & Task Templates</Label>
                            <div className="relative w-48">
                                <Input
                                    placeholder="Search templates..."
                                    value={templateSearch}
                                    onChange={(e) => setTemplateSearch(e.target.value)}
                                    className="h-8 rounded-lg border-gray-200 pl-8 pr-2 text-xs focus:ring-[#106B4E]"
                                />
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            </div>
                        </div>
                        <div className="bg-[#F9FAFB] border border-gray-100 rounded-xl p-2 max-h-[250px] overflow-y-auto space-y-1">
                            {templatesLoading ? (
                                <p className="text-sm text-gray-500 text-center py-4">Loading templates...</p>
                            ) : (templates || []).filter(t =>
                                !templateSearch || t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
                                (t.description || '').toLowerCase().includes(templateSearch.toLowerCase())
                            ).length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-4">No templates found.</p>
                            ) : (
                                (templates || []).filter(t =>
                                    !templateSearch || t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
                                    (t.description || '').toLowerCase().includes(templateSearch.toLowerCase())
                                ).map((template) => {
                                    const isSelected = selectedTemplateIds.includes(String(template.id));
                                    return (
                                        <div
                                            key={template.id}
                                            className={cn(
                                                "flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-all border",
                                                isSelected
                                                    ? "bg-emerald-50 border-emerald-200 shadow-sm"
                                                    : "bg-white border-transparent hover:bg-gray-50 hover:border-gray-200"
                                            )}
                                            onClick={() => {
                                                const current = selectedTemplateIds;
                                                const id = String(template.id);
                                                const newIds = current.includes(id)
                                                    ? current.filter(x => x !== id)
                                                    : [...current, id];
                                                setSelectedTemplateIds(newIds);
                                            }}
                                        >
                                            <div className={cn(
                                                "mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0",
                                                isSelected
                                                    ? "bg-[#106B4E] border-[#106B4E]"
                                                    : "border-gray-300 bg-white"
                                            )}>
                                                {isSelected && (
                                                    <Check className="w-2.5 h-2.5 text-white" />
                                                )}
                                            </div>
                                            <div className="space-y-0.5 min-w-0">
                                                <p className={cn(
                                                    "text-sm font-bold leading-none",
                                                    isSelected ? "text-emerald-900" : "text-[#1F2937]"
                                                )}>
                                                    {template.name}
                                                </p>
                                                <p className={cn(
                                                    "text-[11px] line-clamp-1",
                                                    isSelected ? "text-emerald-700/80" : "text-gray-500"
                                                )}>
                                                    {template.description || "Daily preparation and inventory check"}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        <p className="text-[10px] text-gray-400 pt-1">Select templates to automatically add tasks to this shift.</p>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-50">
                        {initialShift && onDelete && (
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    if (confirm("Are you sure?")) {
                                        onDelete(initialShift.id);
                                        onClose();
                                    }
                                }}
                                className="mr-auto text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                                Delete Shift
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
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="h-12 px-10 rounded-xl bg-[#106B4E] hover:bg-[#0D5A41] text-white font-bold text-base transition-all shadow-md active:scale-[0.98]"
                        >
                            {isSubmitting ? 'Saving...' : (initialShift ? 'Save Changes' : 'Create')}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ShiftModal;
