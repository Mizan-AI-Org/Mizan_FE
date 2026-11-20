/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from '@/hooks/use-auth';
import { AuthContextType } from '../../contexts/AuthContext.types';
import { API_BASE } from "@/lib/api";
import { useLanguage } from "@/hooks/use-language";
import { useBusinessLocations } from "@/hooks/use-business-locations";
import { StaffTagSelector } from "@/components/staff/StaffTagChips";
import type { StaffTag } from "@/lib/staff-tags";
import { normalizeStaffTags } from "@/lib/staff-tags";

interface StaffMember {
    id: string;
    user: {
        phone: string;
        id: string;
        first_name: string;
        last_name: string;
        email: string;
        role: string;
        is_active: boolean;
        primary_location?: string | null;
        allowed_locations?: string[];
        managed_locations?: string[];
    };
    employee_id: string;
    date_joined: string;
    is_active: boolean;
    department: string | null;
    /**
     * Operational department tags. Source of truth lives on
     * ``StaffProfile.tags`` (JSON array of UPPER_SNAKE strings). The
     * backend exposes them at the top level on the staff list payload
     * AND nested under ``profile.tags`` depending on which serializer
     * generated the row, so we accept both shapes here and let the
     * normaliser fold them into a clean set.
     */
    tags?: string[] | null;
    profile?: {
        tags?: string[] | null;
    } | null;
}

interface EditStaffModalProps {
    isOpen: boolean;
    onClose: () => void;
    staffMember: StaffMember | null;
}


const EditStaffModal: React.FC<EditStaffModalProps> = ({ isOpen, onClose, staffMember }) => {
    const { t } = useLanguage();
    const queryClient = useQueryClient();
    const { user, logout } = useAuth() as AuthContextType;

    const [firstName, setFirstName] = useState(staffMember?.user.first_name || '');
    const [lastName, setLastName] = useState(staffMember?.user.last_name || '');
    const [email, setEmail] = useState(staffMember?.user.email || '');
    const [phone, setPhone] = useState(staffMember?.user.phone || '');
    const [employeeId, setEmployeeId] = useState(staffMember?.employee_id || '');
    const [role, setRole] = useState(staffMember?.user.role || '');
    const [isActive, setIsActive] = useState(staffMember?.user.is_active || false);
    const [password, setPassword] = useState(''); // Password not pre-filled for security
    const [pinCode, setPinCode] = useState(''); // PIN code not pre-filled for security
    const [primaryLocation, setPrimaryLocation] = useState<string>('');
    const [allowedLocations, setAllowedLocations] = useState<string[]>([]);
    const [managedLocations, setManagedLocations] = useState<string[]>([]);
    const [tags, setTags] = useState<StaffTag[]>([]);

    const { data: locations = [] } = useBusinessLocations();
    const multiLocation = locations.length >= 2;
    const isManagerRole = role === 'MANAGER';

    useEffect(() => {
        if (staffMember) {
            setFirstName(staffMember.user.first_name || '');
            setLastName(staffMember.user.last_name || '');
            setEmail(staffMember.user.email || '');
            setPhone(staffMember.user.phone || '');
            setEmployeeId(staffMember.employee_id || '');
            setRole(staffMember.user.role || '');
            setIsActive(staffMember.user.is_active);
            setPassword('');
            setPinCode('');
            setPrimaryLocation(staffMember.user.primary_location || '');
            setAllowedLocations(staffMember.user.allowed_locations || []);
            setManagedLocations(staffMember.user.managed_locations || []);
            // Source ``tags`` from whichever shape the API sent - the
            // staff-list endpoint nests them under ``profile.tags``,
            // while some legacy rows carry them flat. Normalising
            // handles both.
            const rawTags = staffMember.tags ?? staffMember.profile?.tags ?? [];
            setTags(normalizeStaffTags(rawTags));
        }
    }, [staffMember]);

    const toggleInArray = (arr: string[], id: string) =>
        arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];

    const staffRoles = [
        { value: 'SUPER_ADMIN', label: t('staff.roles.super_admin') },
        { value: 'ADMIN', label: t('staff.roles.admin') },
        { value: 'CHEF', label: t('staff.roles.chef') },
        { value: 'WAITER', label: t('staff.roles.waiter') },
        { value: 'CLEANER', label: t('staff.roles.cleaner') },
        { value: 'CASHIER', label: t('staff.roles.cashier') },
    ];

    const updateStaffMutation = useMutation({
        mutationFn: async (updatedStaffData: any) => {
            const response = await fetch(`${API_BASE}/staff/${staffMember?.user.id}/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify(updatedStaffData),
            });

            if (!response.ok) {
                if (response.status === 401) {
                    logout();
                    throw new Error(t('staffconfirm.session_expired'));
                }
                const errorData = await response.json();
                throw new Error(errorData.detail || errorData.message || t('staff.edit.update_failed'));
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff-list'] });
            toast({
                title: t('staff.edit.updated_title'),
                description: t('staff.edit.updated_desc'),
            });
            onClose();
        },
        onError: (error: any) => {
            toast({
                title: t('staff.edit.failed_title'),
                description: error.message || t('staffconfirm.unexpected_error'),
                variant: "destructive",
            });
        },
    });

    const updateLocationsMutation = useMutation({
        mutationFn: async () => {
            if (!staffMember) return null;
            // ``StaffProfileUpdateView`` (PUT /api/staff/profile/<id>/update/)
            // uses ``CustomUserSerializer`` which knows how to deal with
            // both flat fields (location FKs / M2Ms) and the nested
            // ``profile`` blob in a single request. We bundle locations
            // AND department tags into one body so the manager sees a
            // single "Saved" toast instead of two.
            const body: Record<string, unknown> = {};
            if (multiLocation) {
                if (primaryLocation) body.primary_location = primaryLocation;
                body.allowed_locations = allowedLocations;
                body.managed_locations = isManagerRole ? managedLocations : [];
            }
            // Tags always go in the body so an edit-only-tags flow on
            // a single-location tenant still saves correctly.
            body.profile = { tags };

            const response = await fetch(
                `${API_BASE}/staff/profile/${staffMember.user.id}/update/`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
                    },
                    body: JSON.stringify(body),
                }
            );
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.detail || errorData.message || t('staff.edit.locations_failed')
                );
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff-list'] });
            queryClient.invalidateQueries({ queryKey: ['staff-list-escalate-modal'] });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!staffMember) return;

        const updatedStaffData = {
            user: {
                first_name: firstName,
                last_name: lastName,
                email: email,
                phone: phone,
                role: role,
                is_active: isActive,
                ...(password && { password }), // Only send password if it's not empty
                ...(pinCode && { pin_code: pinCode }), // Only send pin_code if it's not empty
            },
            employee_id: employeeId,
        };
        updateStaffMutation.mutate(updatedStaffData);
        // Always run the profile-update mutation so department tags
        // are persisted even on single-branch tenants. The endpoint
        // is a no-op for unchanged fields, so this is safe to fire
        // alongside the main staff update.
        updateLocationsMutation.mutate();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t('staff.edit.title')}</DialogTitle>
                    <DialogDescription>
                        {t('staff.edit.description', { name: `${staffMember?.user.first_name ?? ''} ${staffMember?.user.last_name ?? ''}`.trim() })}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="firstName" className="text-right">{t('staff.first_name')}</Label>
                        <Input
                            id="firstName"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="col-span-3"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="lastName" className="text-right">{t('staff.last_name')}</Label>
                        <Input
                            id="lastName"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="col-span-3"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">{t('generic.email')}</Label>
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
                        <Label htmlFor="phone" className="text-right">{t('generic.phone')}</Label>
                        <Input
                            id="phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="employeeId" className="text-right">{t('staff.edit.employee_id')}</Label>
                        <Input
                            id="employeeId"
                            value={employeeId}
                            onChange={(e) => setEmployeeId(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="role" className="text-right">{t('generic.role')}</Label>
                        <Select onValueChange={setRole} value={role} required>
                            <SelectTrigger className="col-span-3" id="role">
                                <SelectValue placeholder={t('generic.select_a_role')} />
                            </SelectTrigger>
                            <SelectContent>
                                {staffRoles.map((r) => (
                                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="isActive" className="text-right">{t('common.active')}</Label>
                        <Switch
                            id="isActive"
                            checked={isActive}
                            onCheckedChange={setIsActive}
                            className="col-span-3 justify-self-start"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="password" className="text-right">{t('staff.edit.new_password')}</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="col-span-3"
                            placeholder={t('staff.edit.password_placeholder')}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="pinCode" className="text-right">{t('staff.edit.new_pin')}</Label>
                        <Input
                            id="pinCode"
                            type="password"
                            value={pinCode}
                            onChange={(e) => setPinCode(e.target.value)}
                            className="col-span-3"
                            maxLength={4}
                            placeholder={t('staff.edit.pin_placeholder')}
                        />
                    </div>

                    {/* Department tags - operational context (KITCHEN /
                        SERVICE / PURCHASES / …). Drives smart task
                        routing on WhatsApp and the tag filter in
                        the escalate modal. Sits above the multi-branch
                        block because every tenant uses tags but only a
                        subset uses multi-location. */}
                    <div className="col-span-full border-t pt-4 mt-2">
                        <StaffTagSelector value={tags} onChange={setTags} />
                    </div>

                    {multiLocation && (
                        <>
                            <div className="col-span-full border-t pt-4 mt-2">
                                <p className="text-sm font-medium">{t('staff.edit.branch_assignment')}</p>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-primary-location" className="text-right">
                                    {t('staff.invite.primary_location')}
                                </Label>
                                <Select value={primaryLocation} onValueChange={setPrimaryLocation}>
                                    <SelectTrigger className="col-span-3" id="edit-primary-location">
                                        <SelectValue placeholder={t('staff.edit.home_branch_placeholder')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {locations.map((loc) => (
                                            <SelectItem key={loc.id} value={loc.id}>
                                                {loc.name}{loc.is_primary ? ' ★' : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-start gap-4">
                                <Label className="text-right pt-2">{t('staff.edit.also_allowed')}</Label>
                                <div className="col-span-3 space-y-2">
                                    <p className="text-xs text-muted-foreground">
                                        {t('staff.edit.allowed_hint')}
                                    </p>
                                    {locations.map((loc) => {
                                        const id = `edit-allow-${loc.id}`;
                                        return (
                                            <label
                                                key={loc.id}
                                                htmlFor={id}
                                                className="flex items-center gap-2 text-sm cursor-pointer"
                                            >
                                                <Checkbox
                                                    id={id}
                                                    checked={allowedLocations.includes(loc.id)}
                                                    onCheckedChange={() =>
                                                        setAllowedLocations((prev) => toggleInArray(prev, loc.id))
                                                    }
                                                />
                                                <span>{loc.name}{loc.is_primary ? ' ★' : ''}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                            {isManagerRole && (
                                <div className="grid grid-cols-4 items-start gap-4">
                                    <Label className="text-right pt-2">{t('staff.edit.manages_branches')}</Label>
                                    <div className="col-span-3 space-y-2">
                                        <p className="text-xs text-muted-foreground">
                                            {t('staff.edit.manages_hint')}
                                        </p>
                                        {locations.map((loc) => {
                                            const id = `edit-manage-${loc.id}`;
                                            return (
                                                <label
                                                    key={loc.id}
                                                    htmlFor={id}
                                                    className="flex items-center gap-2 text-sm cursor-pointer"
                                                >
                                                    <Checkbox
                                                        id={id}
                                                        checked={managedLocations.includes(loc.id)}
                                                        onCheckedChange={() =>
                                                            setManagedLocations((prev) => toggleInArray(prev, loc.id))
                                                        }
                                                    />
                                                    <span>{loc.name}{loc.is_primary ? ' ★' : ''}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                    <DialogFooter>
                        <Button type="submit" disabled={updateStaffMutation.isPending}>
                            {updateStaffMutation.isPending ? t('profile.saving_changes') : t('profile.save_changes')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default EditStaffModal;
