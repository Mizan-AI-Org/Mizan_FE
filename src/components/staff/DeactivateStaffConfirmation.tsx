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
                    throw new Error("Session expired");
                }
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    (errorData as { detail?: string })?.detail || "Failed to deactivate staff member"
                );
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["staff-list"] });
            queryClient.invalidateQueries({ queryKey: ["staff-members"] });
            onSuccess?.();
            toast({
                title: "Staff deactivated",
                description: `${staffName} has been deactivated and can no longer sign in.`,
            });
            onClose();
        },
        onError: (error: Error) => {
            toast({
                title: "Deactivate failed",
                description: error.message || "An unexpected error occurred.",
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
                    <DialogTitle>Deactivate staff member</DialogTitle>
                    <DialogDescription>
                        Deactivate <span className="font-semibold">{staffName}</span>? They will no
                        longer be able to sign in. You can reactivate them later if needed.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={deactivateMutation.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={handleDeactivate}
                        disabled={deactivateMutation.isPending}
                    >
                        {deactivateMutation.isPending ? "Deactivating…" : "Deactivate"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default DeactivateStaffConfirmation;
