import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { X, Search, Check, ChevronDown, Plus, Trash2 } from "lucide-react";
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
    dayIndex?: number;
    hour?: number;
    staffMembers: StaffMember[];
    testDefaultTemplateId?: string;
}

import { cn, getStaffColor } from "@/lib/utils";

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
            staff_members: [],
            isRecurring: false,
            frequency: 'WEEKLY'
        };
    });

    useEffect(() => {
        if (initialShift) {
            let finalShift = initialShift;
            if (!initialShift.date) {
                const today = new Date();
                const monday = getWeekStart(today);
                const base = new Date(monday);
                base.setDate(monday.getDate() + (initialShift.day ?? 0));
                finalShift = { ...initialShift, date: toYMD(base) };
            }
            setShiftData(finalShift);
            setSelectedStaffIds(finalShift.staff_members || (finalShift.staffId ? [finalShift.staffId] : []));
            setSelectedTemplateIds(finalShift.task_templates || []);
            setIsRecurring(finalShift.isRecurring || false);
            setFrequency(finalShift.frequency || 'WEEKLY');
            setDaysOfWeek(finalShift.days_of_week ?? [0, 2, 4]);
            setRecurringEndDate(finalShift.recurringEndDate || '');
        } else if (isOpen) {
            const startHour = hour !== undefined ? String(hour).padStart(2, '0') : '09';
            const endHour = hour !== undefined ? String(hour + 1).padStart(2, '0') : '10';
            const today = new Date();
            const monday = getWeekStart(today);
            const base = new Date(monday);
            base.setDate(monday.getDate() + (dayIndex !== undefined ? dayIndex : 0));

            const firstStaffId = staffMembers.length > 0 ? staffMembers[0].id : "";
            setShiftData({
                id: Date.now().toString(),
                title: "",
                start: `${startHour}:00`,
                end: `${endHour}:00`,
                date: toYMD(base),
                day: dayIndex !== undefined ? dayIndex : 0,
                staffId: firstStaffId,
                color: firstStaffId ? getStaffColor(firstStaffId) : "#6b7280",
                tasks: [],
                staff_members: [],
                isRecurring: false,
                frequency: 'WEEKLY'
            });
            setSelectedStaffIds([]);
            setSelectedTemplateIds([]);
            setIsRecurring(false);
            setFrequency('WEEKLY');
            setDaysOfWeek([0, 2, 4]);
            setRecurringEndDate('');
        }
    }, [initialShift, isOpen, dayIndex, hour, staffMembers]);

    const {
        templates,
        loading: templatesLoading,
    } = useTaskTemplates({ pollIntervalMs: 10000 });

    const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
    const [staffSearch, setStaffSearch] = useState('');
    const [templateSearch, setTemplateSearch] = useState('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const toggleStaffSelection = (staffId: string) => {
        setSelectedStaffIds(prev =>
            prev.includes(staffId)
                ? prev.filter(id => id !== staffId)
                : [...prev, staffId]
        );
    };

    const handleAddManualTask = () => {
        if (!newTaskTitle.trim()) {
            toast.error("Task title cannot be empty");
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
                toast.error('Please enter a shift title.');
                setIsSubmitting(false);
                return;
            }
            if (!shiftData.date || String(shiftData.date).trim() === "") {
                toast.error('Please select a date for the shift.');
                setIsSubmitting(false);
                return;
            }
            if (selectedStaffIds.length === 0) {
                toast.error('Please select at least one staff member.');
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
                toast.error('Every shift must have at least one Process & Task Template or at least one Custom Task. Add a template or type a custom task and click +.');
                setIsSubmitting(false);
                return;
            }
            if (isRecurring && !recurringEndDate) {
                toast.error('Please select an end date for recurring shifts.');
                setIsSubmitting(false);
                return;
            }
            if (isRecurring && frequency === 'CUSTOM' && daysOfWeek.length === 0) {
                toast.error('Select at least one day for Custom repeat.');
                setIsSubmitting(false);
                return;
            }

            const shiftWithTemplates = {
                ...shiftData,
                staffId: selectedStaffIds[0], // Fallback for backward compatibility
                staffIds: selectedStaffIds,
                staff_members: selectedStaffIds, // So save uses all selected staff
                isRecurring,
                frequency,
                ...(frequency === 'CUSTOM' && daysOfWeek.length > 0 ? { days_of_week: daysOfWeek } : {}),
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

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] bg-white dark:bg-slate-900 rounded-3xl p-6 border-none shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                <DialogHeader className="pb-2">
                    <DialogTitle className="text-xl font-bold text-[#1F2937] dark:text-gray-100">
                        {initialShift ? t("schedule.edit_schedule") : t("schedule.create_schedule")}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-5 mt-4">
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
                        <Label className="text-sm font-semibold text-[#1F2937] dark:text-gray-100">Assign Staff ({selectedStaffIds.length} selected)</Label>
                        <Popover open={isStaffPopoverOpen} onOpenChange={setIsStaffPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full h-12 bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/40 text-orange-900 dark:text-orange-200 border-none rounded-xl px-4 flex justify-between items-center text-base font-medium transition-colors shadow-sm"
                                >
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        {selectedStaffIds.length > 0 ? (
                                            <span className="truncate">
                                                {selectedStaffIds.length === 1
                                                    ? `${staffMembers.find(s => s.id === selectedStaffIds[0])?.user?.first_name || staffMembers.find(s => s.id === selectedStaffIds[0])?.first_name || 'Staff'}`
                                                    : `${selectedStaffIds.length} members selected`}
                                            </span>
                                        ) : (
                                            <span className="text-orange-900/50 dark:text-orange-300/50">Select staff members...</span>
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
                                    <CommandList className="max-h-[300px] overflow-y-auto">
                                        <CommandEmpty className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">No staff found.</CommandEmpty>
                                        <CommandGroup>
                                            {staffMembers
                                                .filter(s => String(s.user?.id) !== String(user?.id))
                                                .map((s) => (
                                                    <CommandItem
                                                        key={s.id}
                                                        onSelect={() => toggleStaffSelection(s.id)}
                                                        className="flex items-center gap-2 p-3 aria-selected:bg-orange-50 dark:aria-selected:bg-orange-900/20 cursor-pointer"
                                                    >
                                                        <div className={cn(
                                                            "w-5 h-5 rounded-md border flex items-center justify-center transition-colors",
                                                            selectedStaffIds.includes(s.id)
                                                                ? "bg-orange-500 border-orange-500"
                                                                : "border-orange-200 dark:border-slate-600 bg-white dark:bg-slate-800"
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
                            <Label className="text-sm font-semibold text-[#1F2937] dark:text-gray-100">Date</Label>
                            <Input
                                type="date"
                                value={shiftData.date}
                                onChange={(e) => setShiftData(prev => ({ ...prev, date: e.target.value }))}
                                className="h-12 rounded-xl border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 focus:ring-[#106B4E]"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label className="text-sm font-semibold text-[#1F2937] dark:text-gray-100">Start</Label>
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
                                <Label className="text-sm font-semibold text-[#1F2937] dark:text-gray-100">End</Label>
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
                                <Label className="text-sm font-bold text-slate-900 dark:text-gray-100 leading-none">Recurring Shift</Label>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Create this shift repeatedly until the end date.</p>
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
                                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">Repeat</Label>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2">Daily = every day; Weekly = same day each week; Monthly = same date each month; Custom = pick specific weekdays (e.g. Mon, Wed, Fri).</p>
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
                                        Daily
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
                                        Weekly
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
                                        Monthly
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
                                        Custom
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
                                                        {label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {daysOfWeek.length === 0 && <p className="text-[10px] text-amber-600 mt-1">Select at least one day.</p>}
                                    </div>
                                )}
                                <div className="mt-4">
                                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">End Date</Label>
                                    <Input
                                        type="date"
                                        value={recurringEndDate}
                                        onChange={(e) => setRecurringEndDate(e.target.value)}
                                        min={shiftData.date}
                                        className="h-10 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 focus:ring-[#106B4E] focus:border-[#106B4E]"
                                    />
                                    {!recurringEndDate && <p className="text-[10px] text-amber-600 mt-1">Please select an end date for recurring shifts.</p>}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold text-[#1F2937] dark:text-gray-100">Process & Task Templates</Label>
                            <div className="relative w-48">
                                <Input
                                    placeholder={t("common.search_templates")}
                                    value={templateSearch}
                                    onChange={(e) => setTemplateSearch(e.target.value)}
                                    className="h-8 rounded-lg border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 pl-8 pr-2 text-xs focus:ring-[#106B4E]"
                                />
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            </div>
                        </div>
                        <div className="bg-[#F9FAFB] dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700 rounded-xl p-2 max-h-[250px] overflow-y-auto space-y-1">
                            {templatesLoading ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Loading templates...</p>
                            ) : (templates || []).filter(t =>
                                !templateSearch || t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
                                (t.description || '').toLowerCase().includes(templateSearch.toLowerCase())
                            ).length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No templates found.</p>
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
                                                    ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700 shadow-sm"
                                                    : "bg-white dark:bg-slate-800 border-transparent hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-gray-200 dark:hover:border-slate-600"
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
                                                    : "border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800"
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
                                                    {template.description || "Daily preparation and inventory check"}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 pt-1">Select templates to automatically add tasks to this shift.</p>
                    </div>

                    {/* Manual Task Creation Section */}
                    <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-slate-700">
                        <Label className="text-sm font-semibold text-[#1F2937] dark:text-gray-100">Custom Tasks</Label>

                        <div className="flex gap-2">
                            <Input
                                placeholder={t("common.add_custom_task")}
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                className="flex-1 h-10 rounded-xl border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 text-sm focus:ring-[#106B4E]"
                            />
                            <Select
                                value={newTaskPriority}
                                onValueChange={(v: TaskPriority) => setNewTaskPriority(v)}
                            >
                                <SelectTrigger className="w-[120px] h-10 rounded-xl border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100">
                                    <SelectValue placeholder={t("common.priority")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="LOW">Low</SelectItem>
                                    <SelectItem value="MEDIUM">Medium</SelectItem>
                                    <SelectItem value="HIGH">High</SelectItem>
                                    <SelectItem value="URGENT">Urgent</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button
                                type="button"
                                onClick={handleAddManualTask}
                                className="h-10 w-10 p-0 rounded-xl bg-emerald-50 text-[#106B4E] hover:bg-emerald-100 border border-emerald-100"
                            >
                                <Plus className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* List of Manual Tasks */}
                        <div className="space-y-2 max-h-[150px] overflow-y-auto">
                            {(shiftData.tasks || []).map((task, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-700 group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-2 h-2 rounded-full",
                                            task.priority === 'URGENT' ? "bg-red-500" :
                                                task.priority === 'HIGH' ? "bg-orange-500" :
                                                    task.priority === 'MEDIUM' ? "bg-blue-500" : "bg-gray-400"
                                        )} />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{task.title}</span>
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
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-50 dark:border-slate-700 mt-4">
                        {initialShift && onDelete && (
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    if (confirm("Are you sure?")) {
                                        onDelete(initialShift.id);
                                        onClose();
                                    }
                                }}
                                className="mr-auto text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
                            >
                                Delete Shift
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="h-12 px-8 rounded-xl text-gray-600 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-slate-800"
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
