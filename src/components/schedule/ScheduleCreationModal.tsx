import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { CalendarIcon, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { AuthContextType } from "@/contexts/AuthContext.types";
import type { StaffListItem } from "@/lib/types";

interface ScheduleDataPayload {
    staff_id: string;
    title: string;
    start_time: string;
    end_time: string;
    tasks: string[];
    is_recurring: boolean;
    recurrence_pattern: string | null;
    color: string;
}

interface ScheduleCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (schedule: ScheduleDataPayload) => void;
    initialData?: Partial<ScheduleDataPayload> & {
        staff?: { id: string };
    };
}

const ScheduleCreationModal: React.FC<ScheduleCreationModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialData,
}) => {
    const { user, accessToken } = useAuth() as AuthContextType;

    const [staffId, setStaffId] = useState<string>('');
    const [title, setTitle] = useState<string>(initialData?.title || 'Shift');
    const [startDate, setStartDate] = useState<Date | undefined>(initialData?.start_time ? new Date(initialData.start_time) : undefined);
    const [endDate, setEndDate] = useState<Date | undefined>(initialData?.end_time ? new Date(initialData.end_time) : undefined);
    const [startTime, setStartTime] = useState<string>(initialData?.start_time ? format(new Date(initialData.start_time), 'HH:mm') : '');
    const [endTime, setEndTime] = useState<string>(initialData?.end_time ? format(new Date(initialData.end_time), 'HH:mm') : '');
    const [tasks, setTasks] = useState<string[]>(initialData?.tasks || []);
    const [newTask, setNewTask] = useState<string>('');
    const [isRecurring, setIsRecurring] = useState<boolean>(initialData?.is_recurring || false);
    const [recurrencePattern, setRecurrencePattern] = useState<string>(initialData?.recurrence_pattern || '');
    const [color, setColor] = useState<string>(initialData?.color || '#3b82f6');
    const [staffList, setStaffList] = useState<StaffListItem[]>([]);
    const [isStaffPopoverOpen, setIsStaffPopoverOpen] = useState(false);

    useEffect(() => {
        const fetchStaffList = async () => {
            try {
                if (!accessToken) {
                    return;
                }
                const data = await api.getStaffList(accessToken);
                setStaffList(data);
            } catch (error) {
                console.error("Error fetching staff list:", error);
            }
        };

        if (isOpen) {
            fetchStaffList();
            if (initialData) {
                setStaffId(initialData.staff?.id || '');
                setTitle(initialData.title || 'Shift');
                setStartDate(initialData.start_time ? new Date(initialData.start_time) : undefined);
                setEndDate(initialData.end_time ? new Date(initialData.end_time) : undefined);
                setStartTime(initialData.start_time ? format(new Date(initialData.start_time), 'HH:mm') : '');
                setEndTime(initialData.end_time ? format(new Date(initialData.end_time), 'HH:mm') : '');
                setTasks(initialData.tasks || []);
                setIsRecurring(initialData.is_recurring || false);
                setRecurrencePattern(initialData.recurrence_pattern || '');
                setColor(initialData.color || '#3b82f6');
            } else {
                // Reset form when modal is opened without initial data
                setStaffId('');
                setTitle('Shift');
                setStartDate(undefined);
                setEndDate(undefined);
                setStartTime('');
                setEndTime('');
                setTasks([]);
                setNewTask('');
                setIsRecurring(false);
                setRecurrencePattern('');
                setColor('#3b82f6');
            }
        }
    }, [accessToken, initialData, isOpen]);

    const handleAddTask = () => {
        if (newTask.trim() !== '') {
            setTasks([...tasks, newTask.trim()]);
            setNewTask('');
        }
    };

    const handleRemoveTask = (index: number) => {
        setTasks(tasks.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        if (!staffId || !startDate || !endDate || !startTime || !endTime) {
            alert('Please fill in all required fields.');
            return;
        }

        const startDateTime = new Date(startDate);
        startDateTime.setHours(parseInt(startTime.split(':')[0]), parseInt(startTime.split(':')[1]));

        const endDateTime = new Date(endDate);
        endDateTime.setHours(parseInt(endTime.split(':')[0]), parseInt(endTime.split(':')[1]));

        const scheduleData = {
            staff_id: staffId,
            title,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            tasks,
            is_recurring: isRecurring,
            recurrence_pattern: isRecurring ? recurrencePattern : null,
            color,
        };
        onSave(scheduleData);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Edit Schedule' : 'Create Schedule'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="staff" className="text-right">
                            Staff
                        </Label>
                        <div className="col-span-3">
                            <Popover open={isStaffPopoverOpen} onOpenChange={setIsStaffPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="staff"
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={isStaffPopoverOpen}
                                        aria-haspopup="listbox"
                                        className="w-full justify-between"
                                    >
                                        {(() => {
                                            const visibleStaff = staffList.filter(s => String(s.id) !== String(user?.id));
                                            const selected = visibleStaff.find(s => s.id === staffId);
                                            if (selected) {
                                                const initials = `${selected.first_name?.[0] || ''}${selected.last_name?.[0] || ''}` || '?';
                                                return (
                                                    <>
                                                        <Avatar className="h-6 w-6 mr-2">
                                                            <AvatarFallback className="text-[10px]">
                                                                {initials}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="truncate">
                                                            {selected.first_name} {selected.last_name}
                                                            {selected.role ? ` • ${selected.role}` : ''}
                                                        </span>
                                                    </>
                                                );
                                            }
                                            return <span className="text-muted-foreground">Select staff member...</span>;
                                        })()}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                    <Command>
                                        <CommandInput
                                            placeholder="Search staff by name or role..."
                                            aria-label="Search staff"
                                        />
                                        <CommandList aria-label="Staff list">
                                            <CommandEmpty>No staff members found.</CommandEmpty>
                                            <CommandGroup>
                                                <CommandItem
                                                    value="__clear__"
                                                    onSelect={() => {
                                                        setStaffId('');
                                                        setIsStaffPopoverOpen(false);
                                                    }}
                                                >
                                                    Clear selection
                                                </CommandItem>
                                                {staffList
                                                    .filter(s => String(s.id) !== String(user?.id))
                                                    .map((staff) => {
                                                        const initials = `${staff.first_name?.[0] || ''}${staff.last_name?.[0] || ''}` || '?';
                                                        const isSelected = staffId === staff.id;
                                                        return (
                                                            <CommandItem
                                                                key={staff.id}
                                                                value={`${staff.first_name} ${staff.last_name} ${staff.role || ''}`}
                                                                onSelect={() => {
                                                                    setStaffId(staff.id);
                                                                    setIsStaffPopoverOpen(false);
                                                                }}
                                                                aria-selected={isSelected}
                                                                role="option"
                                                            >
                                                                <Avatar className="h-7 w-7 mr-2">
                                                                    <AvatarFallback className="text-[10px]">
                                                                        {initials}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm">
                                                                        {staff.first_name} {staff.last_name}
                                                                    </span>
                                                                    {staff.role && (
                                                                        <span className="text-xs text-muted-foreground">
                                                                            {staff.role}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </CommandItem>
                                                        );
                                                    })}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="title" className="text-right">
                            Title
                        </Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="startDate" className="text-right">
                            Start Date
                        </Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[240px] justify-start text-left font-normal",
                                        !startDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={startDate}
                                    onSelect={setStartDate}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="startTime" className="text-right">
                            Start Time
                        </Label>
                        <Input
                            id="startTime"
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="endDate" className="text-right">
                            End Date
                        </Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[240px] justify-start text-left font-normal",
                                        !endDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={endDate}
                                    onSelect={setEndDate}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="endTime" className="text-right">
                            End Time
                        </Label>
                        <Input
                            id="endTime"
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="color" className="text-right">
                            Color
                        </Label>
                        <Input
                            id="color"
                            type="color"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            className="col-span-3 h-8"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="tasks" className="text-right">
                            Tasks
                        </Label>
                        <div className="col-span-3 space-y-2">
                            {tasks.map((task, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                    <Input value={task} readOnly />
                                    <Button variant="destructive" size="sm" onClick={() => handleRemoveTask(index)}>
                                        Remove
                                    </Button>
                                </div>
                            ))}
                            <div className="flex items-center space-x-2">
                                <Input
                                    id="newTask"
                                    value={newTask}
                                    onChange={(e) => setNewTask(e.target.value)}
                                    placeholder="Add a task"
                                />
                                <Button onClick={handleAddTask}>Add</Button>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="isRecurring" className="text-right">
                            Recurring
                        </Label>
                        <Checkbox
                            id="isRecurring"
                            checked={isRecurring}
                            onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
                            className="col-span-3"
                        />
                    </div>
                    {isRecurring && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="recurrencePattern" className="text-right">
                                Recurrence
                            </Label>
                            <Select onValueChange={setRecurrencePattern} value={recurrencePattern}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select recurrence pattern" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="daily">Daily</SelectItem>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                    {/* Add custom recurrence options later */}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Save Schedule</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ScheduleCreationModal;
