import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from '../../hooks/use-auth';
import { AuthContextType } from '../../contexts/AuthContext.types';

interface AddStaffModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:8000/api';

const AddStaffModal: React.FC<AddStaffModalProps> = ({ isOpen, onClose }) => {
    const queryClient = useQueryClient();
    const { user, logout } = useAuth() as AuthContextType;

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [employeeId, setEmployeeId] = useState('');
    const [role, setRole] = useState('');
    const [password, setPassword] = useState('');
    const [pinCode, setPinCode] = useState('');

    const staffRoles = [
        { value: 'SUPER_ADMIN', label: 'Super Admin' },
        { value: 'ADMIN', label: 'Admin' },
        { value: 'CHEF', label: 'Chef' },
        { value: 'WAITER', label: 'Waiter' },
        { value: 'CLEANER', label: 'Cleaner' },
        { value: 'CASHIER', label: 'Cashier' },
    ];

    const addStaffMutation = useMutation({
        mutationFn: async (newStaffData: any) => {
            const response = await fetch(`${API_BASE}/staff/create/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify(newStaffData),
            });

            if (!response.ok) {
                if (response.status === 401) {
                    logout();
                    throw new Error('Session expired');
                }
                const errorData = await response.json();
                throw new Error(errorData.detail || errorData.message || 'Failed to add staff');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['staff-list']);
            toast({
                title: "Staff member added successfully!",
                description: "The new staff member has been created.",
            });
            onClose();
            // Reset form fields
            setFirstName('');
            setLastName('');
            setEmail('');
            setPhone('');
            setEmployeeId('');
            setRole('');
            setPassword('');
            setPinCode('');
        },
        onError: (error: any) => {
            toast({
                title: "Failed to add staff member.",
                description: error.message || "An unexpected error occurred.",
                variant: "destructive",
            });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newStaffData = {
            user: {
                first_name: firstName,
                last_name: lastName,
                email: email,
                phone: phone,
                role: role,
                password: password,
                pin_code: pinCode,
            },
            employee_id: employeeId,
        };
        addStaffMutation.mutate(newStaffData);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New Staff Member</DialogTitle>
                    <DialogDescription>
                        Fill in the details to add a new staff member to your restaurant.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="firstName" className="text-right">First Name</Label>
                        <Input
                            id="firstName"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="col-span-3"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="lastName" className="text-right">Last Name</Label>
                        <Input
                            id="lastName"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="col-span-3"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="col-span-3"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="phone" className="text-right">Phone</Label>
                        <Input
                            id="phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="employeeId" className="text-right">Employee ID</Label>
                        <Input
                            id="employeeId"
                            value={employeeId}
                            onChange={(e) => setEmployeeId(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="role" className="text-right">Role</Label>
                        <Select onValueChange={setRole} value={role} required>
                            <SelectTrigger className="col-span-3" id="role">
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                                {staffRoles.map((r) => (
                                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="password" className="text-right">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="col-span-3"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="pinCode" className="text-right">PIN Code (Optional)</Label>
                        <Input
                            id="pinCode"
                            type="password"
                            value={pinCode}
                            onChange={(e) => setPinCode(e.target.value)}
                            className="col-span-3"
                            maxLength={6}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={addStaffMutation.isLoading}>
                            {addStaffMutation.isLoading ? 'Adding Staff...' : 'Add Staff'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default AddStaffModal;
