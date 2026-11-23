/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toast } from "@/components/ui/use-toast";
import { useAuth } from '@/hooks/use-auth';
import { AuthContextType } from '../../contexts/AuthContext.types';
import { API_BASE } from "@/lib/api";
import { useLanguage } from "@/hooks/use-language";

interface DeleteStaffConfirmationProps {
    isOpen: boolean;
    onClose: () => void;
    staffId: string | null;
    staffName: string | null;
    onSuccess?: () => void;
}


const DeleteStaffConfirmation: React.FC<DeleteStaffConfirmationProps> = ({ isOpen, onClose, staffId, staffName, onSuccess }) => {
    const { t } = useLanguage();
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
                    throw new Error(t('staffconfirm.session_expired'));
                }
                const errorData = await response.json().catch(() => ({}));
                throw new Error((errorData as { detail?: string })?.detail || errorData.message || t('staffconfirm.remove_failed_title'));
            }
            if (response.status === 204) return null;
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff-list'] });
            queryClient.invalidateQueries({ queryKey: ['staff-members'] });
            onSuccess?.();
            toast({
                title: t('staffconfirm.remove_success_title'),
                description: t('staffconfirm.remove_success_desc', { name: staffName ?? '' }),
            });
            onClose();
        },
        onError: (error: any) => {
            toast({
                title: t('staffconfirm.remove_failed_title'),
                description: error.message || t('staffconfirm.unexpected_error'),
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
                    <DialogTitle>{t('staffconfirm.remove_title')}</DialogTitle>
                    <DialogDescription>
                        {t('staffconfirm.remove_desc_prefix')} <span className="font-semibold">{staffName}</span>
                        {t('staffconfirm.remove_desc_suffix')}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={deleteStaffMutation.isPending}>{t('common.cancel')}</Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={deleteStaffMutation.isPending}
                    >
                        {deleteStaffMutation.isPending ? t('staffconfirm.removing') : t('common.remove')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default DeleteStaffConfirmation;
