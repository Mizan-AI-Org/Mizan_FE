import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import DeleteStaffConfirmation from "@/components/staff/DeleteStaffConfirmation";
import EditStaffModal from "@/components/staff/EditStaffModal";
import InviteStaffModal from "@/components/staff/InviteStaffModal";
import { useAuth } from "@/hooks/use-auth";
import { AuthContextType } from "@/contexts/AuthContext.types";

const API_BASE =
    import.meta.env.VITE_REACT_APP_API_URL || "http://localhost:8000/api";

interface StaffMember {
    id: string;
    user: {
        id: string;
        first_name: string;
        last_name: string;
        email: string;
        role: string;
        is_active: boolean;
    };
    employee_id: string;
    date_joined: string;
    is_active: boolean;
    department: string | null;
}

const StaffManagement: React.FC = () => {
    const { user, logout } = useAuth() as AuthContextType;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [staffToDelete, setStaffToDelete] = useState<{
        id: string;
        name: string;
    } | null>(null);

    const {
        data: staff,
        isLoading,
        error,
        refetch,
    } = useQuery<StaffMember[]>({
        queryKey: ["staff-list"],
        queryFn: async () => {
            const response = await fetch(`${API_BASE}/staff/`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    logout();
                    throw new Error("Session expired");
                }
                throw new Error("Failed to fetch staff data");
            }
            return response.json();
        },
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="ml-2 text-gray-600">Loading staff data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-red-500">Error: {error.message}</p>
                <Button onClick={() => refetch()} className="ml-4">
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Staff Management</h1>
                <Button onClick={() => setIsModalOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Staff
                </Button>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Employee ID</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {staff?.map((member) => (
                            <TableRow key={member.id}>
                                <TableCell>{`${member.user.first_name} ${member.user.last_name}`}</TableCell>
                                <TableCell>{member.user.email}</TableCell>
                                <TableCell className="capitalize">
                                    {member.user.role?.toLowerCase().replace(/_/g, " ")}
                                </TableCell>
                                <TableCell>{member.employee_id || "N/A"}</TableCell>
                                <TableCell>
                                    <span
                                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${member.user.is_active
                                            ? "bg-green-100 text-green-800"
                                            : "bg-red-100 text-red-800"
                                            }`}
                                    >
                                        {member.user.is_active ? "Active" : "Inactive"}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="mr-2"
                                        onClick={() => {
                                            setSelectedStaff(member);
                                            setIsEditModalOpen(true);
                                        }}
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => {
                                            setStaffToDelete({
                                                id: member.user.id,
                                                name: `${member.user.first_name} ${member.user.last_name}`,
                                            });
                                            setIsDeleteModalOpen(true);
                                        }}
                                    >
                                        Remove
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            <InviteStaffModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={refetch}
            />
            <EditStaffModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                staffMember={selectedStaff}
            />
            <DeleteStaffConfirmation
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                staffId={staffToDelete?.id || null}
                staffName={staffToDelete?.name || null}
            />
        </div>
    );
};

export default StaffManagement;

