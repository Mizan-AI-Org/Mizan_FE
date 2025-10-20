import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from 'lucide-react';
import { toast } from "@/components/ui/use-toast";
import { useAuth } from '../../hooks/use-auth';
import { AuthContextType } from '../../contexts/AuthContext.types';
import { Card } from '@/components/ui/card';

interface TemplateShift {
    id?: string;
    role: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    required_staff: number;
}

interface ScheduleTemplate {
    id?: string;
    name: string;
    is_active: boolean;
    shifts: TemplateShift[];
}

interface ScheduleTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    template?: ScheduleTemplate | null;
}

const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:8000/api';

const ScheduleTemplateModal: React.FC<ScheduleTemplateModalProps> = ({ isOpen, onClose, template }) => {
    const queryClient = useQueryClient();
    const { logout } = useAuth() as AuthContextType;

    const [name, setName] = useState(template?.name || '');
    const [isActive, setIsActive] = useState(template?.is_active || false);
    const [shifts, setShifts] = useState<TemplateShift[]>(template?.shifts || []);

    useEffect(() => {
        if (template) {
            setName(template.name || '');
            setIsActive(template.is_active || false);
            setShifts(template.shifts || []);
        } else {
            setName('');
            setIsActive(false);
            setShifts([]);
        }
    }, [template]);

    const dayOptions = [
        { value: 0, label: 'Monday' },
        { value: 1, label: 'Tuesday' },
        { value: 2, label: 'Wednesday' },
        { value: 3, label: 'Thursday' },
        { value: 4, label: 'Friday' },
        { value: 5, label: 'Saturday' },
        { value: 6, label: 'Sunday' },
    ];

    const roleOptions = [
        { value: 'SUPER_ADMIN', label: 'Super Admin' },
        { value: 'ADMIN', label: 'Admin' },
        { value: 'MANAGER', label: 'Manager' },
        { value: 'CHEF', label: 'Chef' },
        { value: 'WAITER', label: 'Waiter' },
        { value: 'CLEANER', label: 'Cleaner' },
        { value: 'CASHIER', label: 'Cashier' },
    ];

    const handleAddShift = () => {
        setShifts((prev) => [
            ...prev,
            { id: Date.now().toString(), role: '', day_of_week: 0, start_time: '09:00', end_time: '17:00', required_staff: 1 },
        ]);
    };

    const handleRemoveShift = (idToRemove?: string) => {
        setShifts((prev) => prev.filter((shift) => shift.id !== idToRemove));
    };

    const handleShiftChange = (id: string | undefined, field: keyof TemplateShift, value: any) => {
        setShifts((prev) =>
            prev.map((shift) => (shift.id === id ? { ...shift, [field]: value } : shift))
        );
    };

    const createUpdateTemplateMutation = useMutation({
        mutationFn: async (data: ScheduleTemplate) => {
            const url = template?.id
                ? `${API_BASE}/schedule/templates/${template.id}/`
                : `${API_BASE}/schedule/templates/`;
            const method = template?.id ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                if (response.status === 401) {
                    logout();
                    throw new Error('Session expired');
                }
                const errorData = await response.json();
                throw new Error(errorData.detail || errorData.message || `Failed to ${template?.id ? 'update' : 'create'} template`);
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['schedule-templates']);
            queryClient.invalidateQueries(['weekly-schedule']);
            toast({
                title: `Template ${template?.id ? 'updated' : 'created'} successfully!`,
                description: `The schedule template "${name}" has been ${template?.id ? 'updated' : 'created'}.`,
            });
            onClose();
        },
        onError: (error: any) => {
            toast({
                title: `Failed to ${template?.id ? 'update' : 'create'} template.`,
                description: error.message || "An unexpected error occurred.",
                variant: "destructive",
            });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const templateData: ScheduleTemplate = {
            name,
            is_active: isActive,
            shifts: shifts.map(({ id, ...rest }) => rest), // Remove temporary frontend ID
        };
        createUpdateTemplateMutation.mutate(templateData);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{template ? 'Edit Schedule Template' : 'Create New Schedule Template'}</DialogTitle>
                    <DialogDescription>
                        {template ? 'Modify the details of this schedule template.' : 'Define a new reusable schedule template.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="templateName" className="text-right">Template Name</Label>
                        <Input
                            id="templateName"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="col-span-3"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="isActive" className="text-right">Active</Label>
                        <Switch
                            id="isActive"
                            checked={isActive}
                            onCheckedChange={setIsActive}
                            className="col-span-3 justify-self-start"
                        />
                    </div>

                    <h3 className="text-lg font-semibold mt-6">Shifts in Template</h3>
                    {shifts.length === 0 && (
                        <p className="text-muted-foreground text-sm">No shifts defined for this template. Click "Add Shift" to add one.</p>
                    )}
                    <div className="space-y-4">
                        {shifts.map((shift, index) => (
                            <Card key={shift.id || index} className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                                    <div className="col-span-2">
                                        <Label htmlFor={`shift-role-${shift.id}`}>Role</Label>
                                        <Select
                                            onValueChange={(value) => handleShiftChange(shift.id, 'role', value)}
                                            value={shift.role}
                                            required
                                        >
                                            <SelectTrigger id={`shift-role-${shift.id}`}>
                                                <SelectValue placeholder="Select a role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {roleOptions.map((r) => (
                                                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label htmlFor={`shift-day-${shift.id}`}>Day</Label>
                                        <Select
                                            onValueChange={(value) => handleShiftChange(shift.id, 'day_of_week', parseInt(value))}
                                            value={shift.day_of_week.toString()}
                                            required
                                        >
                                            <SelectTrigger id={`shift-day-${shift.id}`}>
                                                <SelectValue placeholder="Select Day" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {dayOptions.map((d) => (
                                                    <SelectItem key={d.value} value={d.value.toString()}>{d.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label htmlFor={`shift-start-${shift.id}`}>Start</Label>
                                        <Input
                                            id={`shift-start-${shift.id}`}
                                            type="time"
                                            value={shift.start_time}
                                            onChange={(e) => handleShiftChange(shift.id, 'start_time', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor={`shift-end-${shift.id}`}>End</Label>
                                        <Input
                                            id={`shift-end-${shift.id}`}
                                            type="time"
                                            value={shift.end_time}
                                            onChange={(e) => handleShiftChange(shift.id, 'end_time', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id={`shift-required-${shift.id}`}
                                            type="number"
                                            value={shift.required_staff}
                                            onChange={(e) => handleShiftChange(shift.id, 'required_staff', parseInt(e.target.value))}
                                            min="1"
                                            className="w-16"
                                        />
                                        <Label htmlFor={`shift-required-${shift.id}`} className="text-sm">Staff</Label>
                                    </div>
                                    <div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() => handleRemoveShift(shift.id)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                    <Button type="button" variant="outline" onClick={handleAddShift} className="mt-4">
                        <Plus className="mr-2 h-4 w-4" /> Add Shift
                    </Button>

                    <DialogFooter className="mt-6">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={createUpdateTemplateMutation.isLoading}>
                            {createUpdateTemplateMutation.isLoading ? 'Saving...' : 'Save Template'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default ScheduleTemplateModal;
