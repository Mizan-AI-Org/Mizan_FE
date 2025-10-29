/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from '@/hooks/use-auth';
import { AuthContextType } from "../../contexts/AuthContext.types";

interface InviteStaffModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const InviteStaffModal: React.FC<InviteStaffModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { inviteStaff } = useAuth() as AuthContextType;
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);

    const handleInviteStaff = async () => {
        if (!email || !role) {
            toast.error("Please fill in email and role.");
            return;
        }
        

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toast.error("Please enter a valid email address.");
            return;
        }

        setIsLoading(true);
        try {
            const accessToken = localStorage.getItem("access_token");
            if (!accessToken) {
                throw new Error("No access token found");
            }

            await inviteStaff(accessToken, { email, role });
            toast.success("Staff invitation sent successfully!");
            onSuccess();
            onClose();
            setEmail("");
            setRole("");
        } catch (error: any) {
            const errorMessage = error?.message || error?.error || "Failed to send invitation";
            toast.error(errorMessage);
            console.error("Invitation error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Invite New Staff</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">
                            Email
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="col-span-3"
                            placeholder="staff@example.com"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="role" className="text-right">
                            Role
                        </Label>
                        <Select value={role} onValueChange={setRole}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ADMIN">Admin</SelectItem>
                                <SelectItem value="CHEF">Chef</SelectItem>
                                <SelectItem value="WAITER">Waiter</SelectItem>
                                <SelectItem value="CLEANER">Cleaner</SelectItem>
                                <SelectItem value="CASHIER">Cashier</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleInviteStaff} disabled={isLoading}>
                        {isLoading ? "Sending..." : "Send Invitation"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default InviteStaffModal;