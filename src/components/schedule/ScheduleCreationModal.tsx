import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StaffMember {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    // Add other relevant staff fields as needed
}

interface ScheduleCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (schedule: any) => void;
    initialData?: any; // For editing existing schedules
}

const ScheduleCreationModal: React.FC<ScheduleCreationModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialData,
}) => {
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
    const [staffList, setStaffList] = useState<StaffMember[]>([]); // New state for staff list

    useEffect(() => {
        const fetchStaffList = async () => {
            try {
                const response = await fetch('http://localhost:8000/accounts/staff/');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data: StaffMember[] = await response.json();
                setStaffList(data);
            } catch (error) {
                console.error("Error fetching staff list:", error);
                // Optionally show a toast notification here
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
    }, [initialData, isOpen]);

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
                        <Select onValueChange={setStaffId} value={staffId}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select a staff member" />
                            </SelectTrigger>
                            <SelectContent>
                                {staffList.map((staff) => (
                                    <SelectItem key={staff.id} value={staff.id}>
                                        {staff.first_name} {staff.last_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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
