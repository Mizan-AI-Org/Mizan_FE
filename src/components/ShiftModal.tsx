import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

interface Task {
    id: string;
    title: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
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
                tasks: [...(prev.tasks || []), { id: Date.now().toString(), ...newTask }],
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

    const nonAdminStaffMembers = staffMembers.filter(
        staff => staff.role && staff.role.toLowerCase() !== 'admin'
    );

    const filteredStaff = staffSearch.trim()
        ? nonAdminStaffMembers.filter(staff =>
            `${staff.first_name} ${staff.last_name}`.toLowerCase().includes(staffSearch.toLowerCase())
        )
        : nonAdminStaffMembers;

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
                        <div className="col-span-3 space-y-2">
                            <Input
                                placeholder="Search staff..."
                                value={staffSearch}
                                onChange={(e) => setStaffSearch(e.target.value)}
                                className="text-sm"
                            />
                            <Select value={shiftData.staffId} onValueChange={(value) => handleSelectChange(value, 'staffId')}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Assign staff" />
                                </SelectTrigger>
                                <SelectContent>
                                    {filteredStaff.map(staff => (
                                        <SelectItem key={staff.id} value={staff.id}>
                                            {staff.first_name} {staff.last_name} ({staff.role})
                                        </SelectItem>
                                    ))}
                                    {filteredStaff.length === 0 && (
                                        <div className="p-2 text-sm text-gray-500">No staff members found</div>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="color" className="text-right">Color</Label>
                        <Input id="color" type="color" value={shiftData.color} onChange={handleChange} className="col-span-3 h-8" />
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        <Label className="text-right pt-2">Tasks</Label>
                        <div className="col-span-3 space-y-3">
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Task title..."
                                        value={newTask.title}
                                        onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                                        className="flex-1"
                                    />
                                    <Select value={newTask.priority} onValueChange={(value) => setNewTask(prev => ({ ...prev, priority: value as any }))}>
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
