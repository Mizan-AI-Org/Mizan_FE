import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/use-auth';
import { AuthContextType } from '../contexts/AuthContext.types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { CustomUser } from '../../mizan-backend/accounts/models'; // Assuming CustomUser model structure

const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:8000/api';

const ProfileSettings: React.FC = () => {
    const { user, updateUser } = useAuth() as AuthContextType;

    const [firstName, setFirstName] = useState(user?.first_name || '');
    const [lastName, setLastName] = useState(user?.last_name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [emergencyContactName, setEmergencyContactName] = useState(user?.profile?.emergency_contact_name || '');
    const [emergencyContactPhone, setEmergencyContactPhone] = useState(user?.profile?.emergency_contact_phone || '');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setFirstName(user.first_name || '');
            setLastName(user.last_name || '');
            setEmail(user.email || '');
            setPhone(user.phone || '');
            setEmergencyContactName(user.profile?.emergency_contact_name || '');
            setEmergencyContactPhone(user.profile?.emergency_contact_phone || '');
        }
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE}/auth/users/me/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify({
                    first_name: firstName,
                    last_name: lastName,
                    phone: phone,
                    profile: {
                        emergency_contact_name: emergencyContactName,
                        emergency_contact_phone: emergencyContactPhone,
                    },
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // Assuming the backend returns the updated user object
                updateUser(data);
                toast({
                    title: "Profile updated successfully!",
                    description: "Your personal information has been saved.",
                });
            } else {
                throw new Error(data.detail || data.message || 'Failed to update profile');
            }
        } catch (error: any) {
            console.error('Profile update error:', error);
            toast({
                title: "Profile update failed.",
                description: error.message || "An unexpected error occurred.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-8">
            <Card className="max-w-3xl mx-auto">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold">Profile Settings</CardTitle>
                    <CardDescription>Manage your personal and emergency contact information.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="firstName">First Name</Label>
                                <Input
                                    id="firstName"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="lastName">Last Name</Label>
                                <Input
                                    id="lastName"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                disabled // Email is typically not editable by the user
                            />
                        </div>

                        <div>
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                                id="phone"
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                            />
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Emergency Contact</h3>
                            <div>
                                <Label htmlFor="emergencyContactName">Name</Label>
                                <Input
                                    id="emergencyContactName"
                                    value={emergencyContactName}
                                    onChange={(e) => setEmergencyContactName(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label htmlFor="emergencyContactPhone">Phone Number</Label>
                                <Input
                                    id="emergencyContactPhone"
                                    type="tel"
                                    value={emergencyContactPhone}
                                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Role Information</h3>
                            <div>
                                <Label>Role</Label>
                                <Input value={user?.role?.replace(/_/g, ' ') || 'N/A'} disabled />
                            </div>
                            <div>
                                <Label>Restaurant</Label>
                                <Input value={user?.restaurant?.name || 'N/A'} disabled />
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default ProfileSettings;
