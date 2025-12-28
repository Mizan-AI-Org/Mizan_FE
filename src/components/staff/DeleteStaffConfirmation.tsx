/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from "@/components/ui/use-toast";
import { useAuth } from '@/hooks/use-auth';
import { AuthContextType } from '../../contexts/AuthContext.types';
import { API_BASE } from "@/lib/api";

interface DeleteStaffConfirmationProps {
    isOpen: boolean;
    onClose: () => void;
    staffId: string | null;
    staffName: string | null;
}


const DeleteStaffConfirmation: React.FC<DeleteStaffConfirmationProps> = ({ isOpen, onClose, staffId, staffName }) => {
    const queryClient = useQueryClient();
    const { logout } = useAuth() as AuthContextType;

    const deleteStaffMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`${API_BASE}/staff/${id}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    logout();
                    throw new Error('Session expired');
                }
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to remove staff member');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['staff-list']);
            toast({
                title: "Staff member removed successfully!",
                description: `${staffName} has been removed.`,
            });
            onClose();
        },
        onError: (error: any) => {
            toast({
                title: "Failed to remove staff member.",
                description: error.message || "An unexpected error occurred.",
                variant: "destructive",
            });
        },
    });

    const handleDelete = () => {
        if (staffId) {
            deleteStaffMutation.mutate(staffId);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Confirm Removal</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to remove <span className="font-semibold">{staffName}</span>?
                        This action will deactivate their account and cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={deleteStaffMutation.isLoading}>Cancel</Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={deleteStaffMutation.isLoading}
                    >
                        {deleteStaffMutation.isLoading ? 'Removing...' : 'Remove'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default DeleteStaffConfirmation;
