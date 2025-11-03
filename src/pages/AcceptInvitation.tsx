import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

const AcceptInvitation: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { acceptInvitation } = useAuth();
    const { toast } = useToast();
    const token = searchParams.get('token');

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    // PIN the staff will use to log in (4 digits)
    const [pinCode, setPinCode] = useState<string>('');
    // Invitation verification PIN from email (4 digits)
    const [invitationPin, setInvitationPin] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) {
            toast({ title: "Error", description: "Invitation token is missing.", variant: "destructive" });
            return;
        }

        // Basic client-side validations (PIN-only for staff)
        if (!/^[0-9]{4}$/.test(invitationPin)) {
            toast({ title: "Invalid Invitation PIN", description: "Invitation PIN must be 4 digits.", variant: "destructive" });
            return;
        }
        if (!/^[0-9]{4}$/.test(pinCode)) {
            toast({ title: "Invalid Login PIN", description: "Login PIN must be 4 digits.", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            await acceptInvitation(token, firstName, lastName, undefined, pinCode, invitationPin);
            toast({ title: "Success", description: "Invitation accepted! You are now logged in." });
            // Redirection handled by AuthContext
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to accept invitation.";
            toast({ title: "Error", description: message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Invalid Invitation</CardTitle>
                        <CardDescription>No invitation token found in the URL. Please check your invitation link.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => navigate('/auth')}>Go to Login</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Accept Invitation</CardTitle>
                    <CardDescription>Set up your account to join the restaurant.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input
                                id="firstName"
                                type="text"
                                placeholder="John"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input
                                id="lastName"
                                type="text"
                                placeholder="Doe"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                required
                            />
                        </div>
                        {/* Password is not required for staff invitations */}
                        <div className="grid gap-2">
                            <Label htmlFor="invitationPin">Invitation PIN (from email)</Label>
                            <Input
                                id="invitationPin"
                                type="text"
                                placeholder="XXXX"
                                value={invitationPin}
                                onChange={(e) => setInvitationPin(e.target.value)}
                                maxLength={4}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="pinCode">Set Your Login PIN</Label>
                            <Input
                                id="pinCode"
                                type="text"
                                placeholder="XXXX"
                                value={pinCode}
                                onChange={(e) => setPinCode(e.target.value)}
                                maxLength={4}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Accepting..." : "Accept Invitation"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default AcceptInvitation;