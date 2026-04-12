/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { AuthContextType } from "../../contexts/AuthContext.types";
import { splitInviteRoleSelection, useBusinessVertical } from "@/hooks/use-business-vertical";
import {
  defaultRoleForVertical,
  getStaffInviteRoleGroups,
  isRoleAllowedForVertical,
  type BusinessVertical,
} from "@/config/staffInviteRolesByVertical";

interface InviteStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const InviteStaffModal: React.FC<InviteStaffModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useLanguage();
  const { inviteStaff } = useAuth() as AuthContextType;
  const { data: staffSettings } = useBusinessVertical();
  const businessVertical = staffSettings?.businessVertical ?? "RESTAURANT";
  const customStaffRoles = staffSettings?.customStaffRoles ?? [];
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("MANAGER");
  const [isLoading, setIsLoading] = useState(false);

  const inviteRoleGroups = useMemo(
    () => getStaffInviteRoleGroups(businessVertical as BusinessVertical),
    [businessVertical]
  );

  useEffect(() => {
    if (!isRoleAllowedForVertical(role, businessVertical as BusinessVertical)) {
      setRole(defaultRoleForVertical(businessVertical as BusinessVertical));
    }
  }, [businessVertical, role]);

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

      const rp = splitInviteRoleSelection(role);
      await inviteStaff(accessToken, {
        email,
        role: rp.role,
        ...(rp.custom_role_id ? { custom_role_id: rp.custom_role_id } : {}),
      });
      toast.success("Staff invitation sent successfully!");
      onSuccess();
      onClose();
      setEmail("");
      setRole(defaultRoleForVertical(businessVertical as BusinessVertical));
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
              <SelectContent className="max-h-[min(320px,60vh)]">
                {inviteRoleGroups.map((g) => (
                  <SelectGroup key={g.groupLabelKey}>
                    <SelectLabel>{t(g.groupLabelKey)}</SelectLabel>
                    {g.roles.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {t(r.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
                {customStaffRoles.length > 0 ? (
                  <SelectGroup>
                    <SelectLabel>{t("staff.invite.custom_roles_group")}</SelectLabel>
                    {customStaffRoles.map((cr) => (
                      <SelectItem key={cr.id} value={`CUSTOM:${cr.id}`}>
                        {cr.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ) : null}
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
