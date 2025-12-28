import React, { useState, useEffect } from 'react';
import { useAuth } from "../contexts/AuthContext";
import { AuthContextType } from "../contexts/AuthContext.types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

import { API_BASE } from "@/lib/api";

const ProfileSettings: React.FC = () => {
    const { user, updateUser } = useAuth() as AuthContextType;
    const { toast } = useToast();

    const [firstName, setFirstName] = useState(user?.first_name || "");
    const [lastName, setLastName] = useState(user?.last_name || "");
    const [email, setEmail] = useState(user?.email || "");
    const [phone, setPhone] = useState(user?.phone || "");
    const [emergencyContactName, setEmergencyContactName] = useState(user?.profile?.emergency_contact_name || "");
    const [emergencyContactPhone, setEmergencyContactPhone] = useState(user?.profile?.emergency_contact_phone || "");
    const [isLoading, setIsLoading] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Update form when user data changes
    useEffect(() => {
        if (user) {
            setFirstName(user.first_name || "");
            setLastName(user.last_name || "");
            setEmail(user.email || "");
            setPhone(user.phone || "");
            setEmergencyContactName(user.profile?.emergency_contact_name || "");
            setEmergencyContactPhone(user.profile?.emergency_contact_phone || "");
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            setFirstName(user.first_name || "");
            setLastName(user.last_name || "");
            setEmail(user.email || "");
            setPhone(user.phone || "");
            setEmergencyContactName(user.profile?.emergency_contact_name || "");
            setEmergencyContactPhone(user.profile?.emergency_contact_phone || "");
        }
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Basic client-side validation for password change
            if (newPassword || confirmPassword || currentPassword) {
                if (!newPassword || !confirmPassword || !currentPassword) {
                    throw new Error("Please fill current, new, and confirm password.");
                }
                if (newPassword !== confirmPassword) {
                    throw new Error("New password and confirmation do not match.");
                }
                if (newPassword.length < 8) {
                    throw new Error("Password must be at least 8 characters.");
                }
            }

            const response = await fetch(`${API_BASE}/auth/me/`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                },
                body: JSON.stringify({
                    first_name: firstName,
                    last_name: lastName,
                    phone: phone,
                    ...(newPassword ? {
                        current_password: currentPassword,
                        new_password: newPassword,
                        confirm_password: confirmPassword,
                    } : {}),
                    profile: {
                        emergency_contact_name: emergencyContactName,
                        emergency_contact_phone: emergencyContactPhone,
                    },
                }),
            });

            let responseData;
            try {
                responseData = await response.json();
            } catch (error) {
                throw new Error("Invalid response from server");
            }

            if (!response.ok) {
                throw new Error(responseData.detail || responseData.message || "Failed to update profile");
            }

            // Update user in auth context so UI reflects latest profile details
            if (typeof updateUser === "function") {
                updateUser(responseData);
            } else {
                // Fallback: persist to localStorage and let periodic refresh sync
                localStorage.setItem("user", JSON.stringify(responseData));
            }
            toast({
                title: "Profile updated successfully!",
                description: newPassword ? "Your password and profile have been updated." : "Your personal information has been saved.",
            });
        } catch (error: unknown) {
            console.error("Profile update error:", error);
            const message =
                error instanceof Error
                    ? error.message
                    : typeof error === "string"
                        ? error
                        : "An unexpected error occurred.";
            toast({
                title: "Profile update failed.",
                description: message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </div>
                <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                </div>
            </div>

            <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} disabled />
            </div>

            <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>

            <div className="space-y-4">
                <div>
                    <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
                    <Input id="emergencyContactName" value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} />
                </div>
                <div>
                    <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
                    <Input id="emergencyContactPhone" type="tel" value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} />
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <Label>Role</Label>
                    <Input value={user?.role?.replace(/_/g, " ") || "N/A"} disabled />
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Change Password</h3>
                <div>
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                </div>
                <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <div>
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
            </Button>
        </form>
    );
};

export default ProfileSettings;
