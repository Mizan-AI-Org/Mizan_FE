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

interface DeactivateStaffTarget {
    id: string;
    name: string;
}

interface DeactivateStaffConfirmationProps {
    isOpen: boolean;
    onClose: () => void;
    staffId: string | null;
    staffName: string | null;
    /** When set, deactivates every person in the list (bulk). */
    staffTargets?: DeactivateStaffTarget[];
    onSuccess?: () => void;
}

const DeactivateStaffConfirmation: React.FC<DeactivateStaffConfirmationProps> = ({
    isOpen,
    onClose,
    staffId,
    staffName,
    staffTargets,
    onSuccess,
}) => {
    const { t } = useLanguage();
    const queryClient = useQueryClient();
    const { logout } = useAuth() as AuthContextType;

    const targets: DeactivateStaffTarget[] =
        staffTargets && staffTargets.length > 0
            ? staffTargets
            : staffId
              ? [{ id: staffId, name: staffName ?? "" }]
              : [];
    const isBulk = targets.length > 1;

    const deactivateMutation = useMutation({
        mutationFn: async (people: DeactivateStaffTarget[]) => {
            const failures: string[] = [];
            for (const person of people) {
                const response = await fetch(`${API_BASE}/users/${person.id}/deactivate/`, {
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
                    failures.push(
                        `${person.name}: ${(errorData as { detail?: string })?.detail || t("staffconfirm.deactivate_failed_desc")}`,
                    );
                }
            }
            if (failures.length === people.length) {
                throw new Error(failures[0] || t("staffconfirm.deactivate_failed_desc"));
            }
            return { failed: failures, succeeded: people.length - failures.length };
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ["staff-list"] });
            queryClient.invalidateQueries({ queryKey: ["staff-members"] });
            onSuccess?.();
            toast({
                title: t("staffconfirm.deactivate_success_title"),
                description: isBulk
                    ? t("staffconfirm.deactivate_success_many", {
                          count: result.succeeded,
                          defaultValue: "{{count}} people have been deactivated and can no longer sign in.",
                      })
                    : t("staffconfirm.deactivate_success_desc", { name: targets[0]?.name ?? "" }),
            });
            if (result.failed.length > 0) {
                toast({
                    title: t("staffconfirm.deactivate_failed_title"),
                    description: result.failed.join(" "),
                    variant: "destructive",
                });
            }
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
        if (targets.length > 0) deactivateMutation.mutate(targets);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {isBulk
                            ? t("staffconfirm.deactivate_title_many", {
                                  count: targets.length,
                                  defaultValue: "Deactivate {{count}} people",
                              })
                            : t("staffconfirm.deactivate_title")}
                    </DialogTitle>
                    <DialogDescription>
                        {isBulk ? (
                            t("staffconfirm.deactivate_desc_many", {
                                count: targets.length,
                                names: targets.map((person) => person.name).join(", "),
                                defaultValue:
                                    "Deactivate {{count}} people ({{names}})? They will no longer be able to sign in. You can reactivate them later.",
                            })
                        ) : (
                            <>
                                {t("staffconfirm.deactivate_desc_prefix")}{" "}
                                <span className="font-semibold">{targets[0]?.name}</span>
                                {t("staffconfirm.deactivate_desc_suffix")}
                            </>
                        )}
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
                        disabled={deactivateMutation.isPending || targets.length === 0}
                    >
                        {deactivateMutation.isPending ? t("staffconfirm.deactivating") : t("staffconfirm.deactivate")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default DeactivateStaffConfirmation;
