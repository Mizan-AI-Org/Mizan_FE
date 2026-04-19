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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { AuthContextType } from "../../contexts/AuthContext.types";
import { splitInviteRoleSelection, useBusinessVertical } from "@/hooks/use-business-vertical";
import { useBusinessLocations } from "@/hooks/use-business-locations";
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
  const { data: locations = [] } = useBusinessLocations();
  const businessVertical = staffSettings?.businessVertical ?? "RESTAURANT";
  const customStaffRoles = staffSettings?.customStaffRoles ?? [];
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("MANAGER");
  const [primaryLocation, setPrimaryLocation] = useState<string>("");
  const [allowedLocations, setAllowedLocations] = useState<string[]>([]);
  const [managedLocations, setManagedLocations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Only show branch pickers when the tenant has more than one location;
  // single-site tenants shouldn't see new fields they don't care about.
  const multiLocation = locations.length >= 2;
  const isManagerRole = role === "MANAGER";

  const inviteRoleGroups = useMemo(
    () => getStaffInviteRoleGroups(businessVertical as BusinessVertical),
    [businessVertical]
  );

  useEffect(() => {
    if (!isRoleAllowedForVertical(role, businessVertical as BusinessVertical)) {
      setRole(defaultRoleForVertical(businessVertical as BusinessVertical));
    }
  }, [businessVertical, role]);

  // Default the primary-location picker to the tenant's primary branch as
  // soon as locations load, so the common case requires zero clicks.
  useEffect(() => {
    if (!primaryLocation && locations.length > 0) {
      const def = locations.find((l) => l.is_primary) || locations[0];
      setPrimaryLocation(def.id);
    }
  }, [locations, primaryLocation]);

  const toggleInArray = (arr: string[], id: string) =>
    arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];

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
        ...(multiLocation && primaryLocation ? { primary_location: primaryLocation } : {}),
        ...(multiLocation && allowedLocations.length ? { allowed_locations: allowedLocations } : {}),
        ...(multiLocation && isManagerRole && managedLocations.length
          ? { managed_locations: managedLocations }
          : {}),
      });
      toast.success("Staff invitation sent successfully!");
      onSuccess();
      onClose();
      setEmail("");
      setRole(defaultRoleForVertical(businessVertical as BusinessVertical));
      setAllowedLocations([]);
      setManagedLocations([]);
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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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

          {multiLocation && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="primary-location" className="text-right">
                  {t("staff.invite.primary_location") || "Primary location"}
                </Label>
                <Select value={primaryLocation} onValueChange={setPrimaryLocation}>
                  <SelectTrigger className="col-span-3" id="primary-location">
                    <SelectValue
                      placeholder={
                        t("staff.invite.primary_location_placeholder") ||
                        "Select their home branch"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                        {loc.is_primary ? " ★" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">
                  {t("staff.invite.allowed_locations") || "Also allowed at"}
                </Label>
                <div className="col-span-3 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {t("staff.invite.allowed_locations_hint") ||
                      "Leave all unchecked to allow this staff at any branch."}
                  </p>
                  {locations.map((loc) => {
                    const id = `allow-${loc.id}`;
                    return (
                      <label
                        key={loc.id}
                        htmlFor={id}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <Checkbox
                          id={id}
                          checked={allowedLocations.includes(loc.id)}
                          onCheckedChange={() =>
                            setAllowedLocations((prev) => toggleInArray(prev, loc.id))
                          }
                        />
                        <span>
                          {loc.name}
                          {loc.is_primary ? " ★" : ""}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {isManagerRole && (
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label className="text-right pt-2">
                    {t("staff.invite.managed_locations") || "Manages branches"}
                  </Label>
                  <div className="col-span-3 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {t("staff.invite.managed_locations_hint") ||
                        "Leave unchecked for a manager of the whole business."}
                    </p>
                    {locations.map((loc) => {
                      const id = `manage-${loc.id}`;
                      return (
                        <label
                          key={loc.id}
                          htmlFor={id}
                          className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                          <Checkbox
                            id={id}
                            checked={managedLocations.includes(loc.id)}
                            onCheckedChange={() =>
                              setManagedLocations((prev) => toggleInArray(prev, loc.id))
                            }
                          />
                          <span>
                            {loc.name}
                            {loc.is_primary ? " ★" : ""}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
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
