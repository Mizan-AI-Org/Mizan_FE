// import React, { useState, useEffect } from 'react';
// import { useMutation, useQueryClient } from '@tanstack/react-query';
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
// import { Button } from "@/components/ui/button";
// import { Label } from "@/components/ui/label";
// import { Input } from "@/components/ui/input";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Switch } from "@/components/ui/switch";
// import { toast } from "@/components/ui/use-toast";
// import { useAuth } from '@/hooks/use-auth';
// import { AuthContextType } from '../../contexts/AuthContext.types';

// interface StaffMember {
//     id: string;
//     user: {
//         id: string;
//         first_name: string;
//         last_name: string;
//         email: string;
//         role: string;
//         is_active: boolean;
//     };
//     employee_id: string;
//     date_joined: string;
//     is_active: boolean;
//     department: string | null;
// }

// interface EditStaffModalProps {
//     isOpen: boolean;
//     onClose: () => void;
//     staffMember: StaffMember | null;
// }

// const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:8000/api';

// const EditStaffModal: React.FC<EditStaffModalProps> = ({ isOpen, onClose, staffMember }) => {
//     const queryClient = useQueryClient();
//     const { user, logout } = useAuth() as AuthContextType;

//     const [firstName, setFirstName] = useState(staffMember?.user.first_name || '');
//     const [lastName, setLastName] = useState(staffMember?.user.last_name || '');
//     const [email, setEmail] = useState(staffMember?.user.email || '');
//     const [phone, setPhone] = useState(staffMember?.user.phone || '');
//     const [employeeId, setEmployeeId] = useState(staffMember?.employee_id || '');
//     const [role, setRole] = useState(staffMember?.user.role || '');
//     const [isActive, setIsActive] = useState(staffMember?.user.is_active || false);
//     const [password, setPassword] = useState(''); // Password not pre-filled for security
//     const [pinCode, setPinCode] = useState(''); // PIN code not pre-filled for security

//     useEffect(() => {
//         if (staffMember) {
//             setFirstName(staffMember.user.first_name || '');
//             setLastName(staffMember.user.last_name || '');
//             setEmail(staffMember.user.email || '');
//             setPhone(staffMember.user.phone || '');
//             setEmployeeId(staffMember.employee_id || '');
//             setRole(staffMember.user.role || '');
//             setIsActive(staffMember.user.is_active);
//             setPassword('');
//             setPinCode('');
//         }
//     }, [staffMember]);

//     const staffRoles = [
//         { value: 'SUPER_ADMIN', label: 'Super Admin' },
//         { value: 'ADMIN', label: 'Admin' },
//         { value: 'CHEF', label: 'Chef' },
//         { value: 'WAITER', label: 'Waiter' },
//         { value: 'CLEANER', label: 'Cleaner' },
//         { value: 'CASHIER', label: 'Cashier' },
//     ];

//     const updateStaffMutation = useMutation({
//         mutationFn: async (updatedStaffData: any) => {
//             const response = await fetch(`${API_BASE}/staff/${staffMember?.user.id}/`, {
//                 method: 'PUT',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
//                 },
//                 body: JSON.stringify(updatedStaffData),
//             });

//             if (!response.ok) {
//                 if (response.status === 401) {
//                     logout();
//                     throw new Error('Session expired');
//                 }
//                 const errorData = await response.json();
//                 throw new Error(errorData.detail || errorData.message || 'Failed to update staff');
//             }
//             return response.json();
//         },
//         onSuccess: () => {
//             queryClient.invalidateQueries(['staff-list']);
//             toast({
//                 title: "Staff member updated successfully!",
//                 description: "The staff member's information has been saved.",
//             });
//             onClose();
//         },
//         onError: (error: any) => {
//             toast({
//                 title: "Failed to update staff member.",
//                 description: error.message || "An unexpected error occurred.",
//                 variant: "destructive",
//             });
//         },
//     });

//     const handleSubmit = (e: React.FormEvent) => {
//         e.preventDefault();
//         if (!staffMember) return;

//         const updatedStaffData = {
//             user: {
//                 first_name: firstName,
//                 last_name: lastName,
//                 email: email,
//                 phone: phone,
//                 role: role,
//                 is_active: isActive,
//                 ...(password && { password }), // Only send password if it's not empty
//                 ...(pinCode && { pin_code: pinCode }), // Only send pin_code if it's not empty
//             },
//             employee_id: employeeId,
//         };
//         updateStaffMutation.mutate(updatedStaffData);
//     };

//     return (
//         <Dialog open={isOpen} onOpenChange={onClose}>
//             <DialogContent className="sm:max-w-[425px]">
//                 <DialogHeader>
//                     <DialogTitle>Edit Staff Member</DialogTitle>
//                     <DialogDescription>
//                         Update the details for {staffMember?.user.first_name} {staffMember?.user.last_name}.
//                     </DialogDescription>
//                 </DialogHeader>
//                 <form onSubmit={handleSubmit} className="grid gap-4 py-4">
//                     <div className="grid grid-cols-4 items-center gap-4">
//                         <Label htmlFor="firstName" className="text-right">First Name</Label>
//                         <Input
//                             id="firstName"
//                             value={firstName}
//                             onChange={(e) => setFirstName(e.target.value)}
//                             className="col-span-3"
//                             required
//                         />
//                     </div>
//                     <div className="grid grid-cols-4 items-center gap-4">
//                         <Label htmlFor="lastName" className="text-right">Last Name</Label>
//                         <Input
//                             id="lastName"
//                             value={lastName}
//                             onChange={(e) => setLastName(e.target.value)}
//                             className="col-span-3"
//                             required
//                         />
//                     </div>
//                     <div className="grid grid-cols-4 items-center gap-4">
//                         <Label htmlFor="email" className="text-right">Email</Label>
//                         <Input
//                             id="email"
//                             type="email"
//                             value={email}
//                             onChange={(e) => setEmail(e.target.value)}
//                             className="col-span-3"
//                             required
//                         />
//                     </div>
//                     <div className="grid grid-cols-4 items-center gap-4">
//                         <Label htmlFor="phone" className="text-right">Phone</Label>
//                         <Input
//                             id="phone"
//                             type="tel"
//                             value={phone}
//                             onChange={(e) => setPhone(e.target.value)}
//                             className="col-span-3"
//                         />
//                     </div>
//                     <div className="grid grid-cols-4 items-center gap-4">
//                         <Label htmlFor="employeeId" className="text-right">Employee ID</Label>
//                         <Input
//                             id="employeeId"
//                             value={employeeId}
//                             onChange={(e) => setEmployeeId(e.target.value)}
//                             className="col-span-3"
//                         />
//                     </div>
//                     <div className="grid grid-cols-4 items-center gap-4">
//                         <Label htmlFor="role" className="text-right">Role</Label>
//                         <Select onValueChange={setRole} value={role} required>
//                             <SelectTrigger className="col-span-3" id="role">
//                                 <SelectValue placeholder="Select a role" />
//                             </SelectTrigger>
//                             <SelectContent>
//                                 {staffRoles.map((r) => (
//                                     <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
//                                 ))}
//                             </SelectContent>
//                         </Select>
//                     </div>
//                     <div className="grid grid-cols-4 items-center gap-4">
//                         <Label htmlFor="isActive" className="text-right">Active</Label>
//                         <Switch
//                             id="isActive"
//                             checked={isActive}
//                             onCheckedChange={setIsActive}
//                             className="col-span-3 justify-self-start"
//                         />
//                     </div>
//                     <div className="grid grid-cols-4 items-center gap-4">
//                         <Label htmlFor="password" className="text-right">New Password (Optional)</Label>
//                         <Input
//                             id="password"
//                             type="password"
//                             value={password}
//                             onChange={(e) => setPassword(e.target.value)}
//                             className="col-span-3"
//                             placeholder="Leave blank to keep current password"
//                         />
//                     </div>
//                     <div className="grid grid-cols-4 items-center gap-4">
//                         <Label htmlFor="pinCode" className="text-right">New PIN Code (Optional)</Label>
//                         <Input
//                             id="pinCode"
//                             type="password"
//                             value={pinCode}
//                             onChange={(e) => setPinCode(e.target.value)}
//                             className="col-span-3"
//                             maxLength={6}
//                             placeholder="Leave blank to keep current PIN"
//                         />
//                     </div>
//                     <DialogFooter>
//                         <Button type="submit" disabled={updateStaffMutation.isLoading}>
//                             {updateStaffMutation.isLoading ? 'Saving Changes...' : 'Save Changes'}
//                         </Button>
//                     </DialogFooter>
//                 </form>
//             </DialogContent>
//         </Dialog>
//     );
// };

// export default EditStaffModal;
