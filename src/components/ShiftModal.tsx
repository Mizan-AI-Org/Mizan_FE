import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Shift {
    id: string;
    title: string;
    start: string;
    end: string;
    type: 'confirmed' | 'pending' | 'tentative';
    day: number;
    staffId: string; // Changed to be mandatory
    color?: string;
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
            title: "New Shift",
            start: `${startHour}:00`,
            end: `${endHour}:00`,
            type: 'pending',
            day: dayIndex !== undefined ? dayIndex : 0,
            staffId: staffMembers.length > 0 ? staffMembers[0].id : "", // Assign first staff member by default
            color: "#6b7280",
        };
    });

    useEffect(() => {
        if (initialShift) {
            setShiftData(initialShift);
        } else if (isOpen) {
            const startHour = hour !== undefined ? String(hour).padStart(2, '0') : '09';
            const endHour = hour !== undefined ? String(hour + 1).padStart(2, '0') : '10';

            setShiftData({
                id: Date.now().toString(),
                title: "New Shift",
                start: `${startHour}:00`,
                end: `${endHour}:00`,
                type: 'pending',
                day: dayIndex !== undefined ? dayIndex : 0,
                staffId: staffMembers.length > 0 ? staffMembers[0].id : "", // Assign first staff member by default
                color: "#6b7280",
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

    const handleSubmit = () => {
        onSave(shiftData);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{initialShift ? "Edit Shift" : "Create New Shift"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="title" className="text-right">Title</Label>
                        <Input id="title" value={shiftData.title} onChange={handleChange} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="start" className="text-right">Start</Label>
                        <Input id="start" type="time" value={shiftData.start} onChange={handleChange} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="end" className="text-right">End</Label>
                        <Input id="end" type="time" value={shiftData.end} onChange={handleChange} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">Type</Label>
                        <Select value={shiftData.type} onValueChange={(value) => handleSelectChange(value, 'type')}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="tentative">Tentative</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="staffId" className="text-right">Staff <span className="text-red-500">*</span></Label>
                        <Select value={shiftData.staffId} onValueChange={(value) => handleSelectChange(value, 'staffId')}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Assign staff" />
                            </SelectTrigger>
                            <SelectContent>
                                {staffMembers.map(staff => (
                                    <SelectItem key={staff.id} value={staff.id}>{staff.first_name} {staff.last_name} ({staff.role})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="color" className="text-right">Color</Label>
                        <Input id="color" type="color" value={shiftData.color} onChange={handleChange} className="col-span-3 h-8" />
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
