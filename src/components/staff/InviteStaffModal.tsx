import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "../../hooks/use-auth";
import { AuthContextType, StaffRole } from "../../contexts/AuthContext.types";

interface InviteStaffModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const InviteStaffModal: React.FC<InviteStaffModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { inviteStaff, accessToken } = useAuth() as AuthContextType;
    const [email, setEmail] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [role, setRole] = useState<StaffRole | "">("");
    const [isLoading, setIsLoading] = useState(false);

    const handleInvite = async () => {
        if (!email || !firstName || !lastName || !role) {
            toast.error("Please fill in all fields.");
            return;
        }

        setIsLoading(true);
        try {
            await inviteStaff(accessToken!, { email, first_name: firstName, last_name: lastName, role: role as StaffRole });
            toast.success("Staff invitation sent successfully!");
            onSuccess();
            onClose();
            setEmail("");
            setFirstName("");
            setLastName("");
            setRole("");
        } catch (error: any) {
            toast.error(`Failed to send invitation: ${error.message}`);
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
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="first-name" className="text-right">
                            First Name
                        </Label>
                        <Input
                            id="first-name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="last-name" className="text-right">
                            Last Name
                        </Label>
                        <Input
                            id="last-name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="role" className="text-right">
                            Role
                        </Label>
                        <Select value={role} onValueChange={(value: StaffRole) => setRole(value)}>
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
                    <Button onClick={onClose} variant="outline">Cancel</Button>
                    <Button onClick={handleInvite} disabled={isLoading}>
                        {isLoading ? "Sending..." : "Send Invitation"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default InviteStaffModal; 