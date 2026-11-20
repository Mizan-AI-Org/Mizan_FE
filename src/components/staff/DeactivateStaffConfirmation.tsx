import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { AuthContextType } from "@/contexts/AuthContext.types";
import { API_BASE } from "@/lib/api";
import { useLanguage } from "@/hooks/use-language";

interface DeactivateStaffConfirmationProps {
    isOpen: boolean;
    onClose: () => void;
    staffId: string | null;
    staffName: string | null;
    onSuccess?: () => void;
}

const DeactivateStaffConfirmation: React.FC<DeactivateStaffConfirmationProps> = ({
    isOpen,
    onClose,
    staffId,
    staffName,
    onSuccess,
}) => {
    const { t } = useLanguage();
    const queryClient = useQueryClient();
    const { logout } = useAuth() as AuthContextType;

    const deactivateMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`${API_BASE}/users/${id}/deactivate/`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                },
            });
            if (!response.ok) {
                if (response.status === 401) {
                    logout();
                    throw new Error(t("staffconfirm.session_expired"));
                }
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    (errorData as { detail?: string })?.detail || t("staffconfirm.deactivate_failed_desc")
                );
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["staff-list"] });
            queryClient.invalidateQueries({ queryKey: ["staff-members"] });
            onSuccess?.();
            toast({
                title: t("staffconfirm.deactivate_success_title"),
                description: t("staffconfirm.deactivate_success_desc", { name: staffName ?? "" }),
            });
            onClose();
        },
        onError: (error: Error) => {
            toast({
                title: t("staffconfirm.deactivate_failed_title"),
                description: error.message || t("staffconfirm.unexpected_error"),
                variant: "destructive",
            });
        },
    });

    const handleDeactivate = () => {
        if (staffId) deactivateMutation.mutate(staffId);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("staffconfirm.deactivate_title")}</DialogTitle>
                    <DialogDescription>
                        {t("staffconfirm.deactivate_desc_prefix")} <span className="font-semibold">{staffName}</span>
                        {t("staffconfirm.deactivate_desc_suffix")}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={deactivateMutation.isPending}
                    >
                        {t("common.cancel")}
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={handleDeactivate}
                        disabled={deactivateMutation.isPending}
                    >
                        {deactivateMutation.isPending ? t("staffconfirm.deactivating") : t("staffconfirm.deactivate")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default DeactivateStaffConfirmation;
