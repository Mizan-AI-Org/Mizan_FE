import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useLanguage } from '@/hooks/use-language';

import { API_BASE } from '@/lib/api';

const AcceptInvitation: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { acceptInvitation } = useAuth();
    const { toast } = useToast();
    const { t } = useLanguage();
    const token = searchParams.get('token');

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [password, setPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    // PIN the staff will use to log in (4 digits) – for frontline staff only
    const [pinCode, setPinCode] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [inviteEmail, setInviteEmail] = useState<string | null>(null);
    const [restaurantName, setRestaurantName] = useState<string | null>(null);
    const [inviteRole, setInviteRole] = useState<string | null>(null);
    const [requireEmail, setRequireEmail] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isAdminOrManagerRole = (role?: string | null) => {
        if (!role) return false;
        return ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OWNER'].includes(role);
    };

    useEffect(() => {
        if (!token) return;
        let cancelled = false;

        const fetchInviteMeta = async () => {
            try {
                const res = await fetch(`${API_BASE}/invitations/by-token/?token=${encodeURIComponent(token)}`);
                if (!res.ok) {
                    // If this fails, we still let the user proceed with defaults
                    return;
                }
                const data: any = await res.json();
                if (cancelled) return;

                setInviteRole(data.role || null);
                setInviteEmail(data.email || null);
                setRequireEmail(!data.email);
                if (data.restaurant_name) setRestaurantName(data.restaurant_name);

                // Pre-fill name fields if present
                if (data.first_name && !firstName) setFirstName(data.first_name);
                if (data.last_name && !lastName) setLastName(data.last_name);
            } catch {
                // Silent failure – user can still complete the form manually
            }
        };

        fetchInviteMeta();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!token) {
            toast({ title: t("auth.accept.toast_error"), description: t("auth.accept.toast_token_missing"), variant: "destructive" });
            return;
        }

        const isAdminFlow = isAdminOrManagerRole(inviteRole);

        if (isAdminFlow) {
            if (!password || password.length < 8) {
                toast({
                    title: t("auth.accept.toast_invalid_password"),
                    description: t("auth.accept.toast_password_min"),
                    variant: "destructive"
                });
                return;
            }
            if (password !== confirmPassword) {
                toast({
                    title: t("auth.accept.toast_passwords_match"),
                    description: t("auth.accept.toast_passwords_match_desc"),
                    variant: "destructive"
                });
                return;
            }
        } else {
            // Basic client-side validations (Login PIN only for frontline staff)
            if (!/^[0-9]{4}$/.test(pinCode)) {
                toast({ title: t("auth.accept.toast_invalid_pin"), description: t("auth.accept.toast_pin_desc"), variant: "destructive" });
                return;
            }
        }

        setLoading(true);
        try {
            if (isAdminFlow) {
                await acceptInvitation(token, firstName, lastName, password, null);
            } else {
                await acceptInvitation(
                    token,
                    firstName,
                    lastName,
                    undefined,
                    pinCode,
                    null,
                    requireEmail ? email : undefined
                );
            }
            toast({ title: t("auth.accept.toast_success"), description: t("auth.accept.toast_success_desc") });
            // Redirection handled by AuthContext
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to accept invitation.";
            setError(message);
            toast({ title: t("auth.accept.toast_error"), description: message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>{t("auth.accept.invalid_title")}</CardTitle>
                        <CardDescription>{t("auth.accept.invalid_desc")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => navigate('/auth')}>{t("auth.accept.go_login")}</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>{t("auth.accept.title")}</CardTitle>
                    <CardDescription>
                        {restaurantName
                            ? t("auth.accept.desc_join").replace("{{restaurant}}", restaurantName)
                            : t("auth.accept.desc_generic")}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error && (
                        <p className="mb-2 text-sm text-red-600">
                            {error}
                        </p>
                    )}
                    <form onSubmit={handleSubmit} className="grid gap-4">
                        {/* Always show a summary of who this invite is for */}
                        <div className="rounded-md bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm">
                            <p className="font-medium">
                                {firstName || lastName ? `${firstName} ${lastName}`.trim() : t("auth.accept.guest")}
                            </p>
                            {inviteRole && (
                                <p className="text-xs text-gray-600 dark:text-gray-300">
                                    {t("auth.accept.role")}: {inviteRole.replace('_', ' ')}
                                </p>
                            )}
                            {(inviteEmail || email) && (
                                <p className="text-xs text-gray-600 dark:text-gray-300">
                                    {t("auth.accept.email_label")}: {inviteEmail || email}
                                </p>
                            )}
                        </div>

                        {/* Keep name fields visible only when backend did not provide them */}
                        {!(firstName && lastName) && (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="firstName">{t("auth.accept.first_name")}</Label>
                                    <Input
                                        id="firstName"
                                        type="text"
                                        placeholder={t("auth.accept.placeholder_first")}
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="lastName">{t("auth.accept.last_name")}</Label>
                                    <Input
                                        id="lastName"
                                        type="text"
                                        placeholder={t("auth.accept.placeholder_last")}
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        required
                                    />
                                </div>
                            </>
                        )}
                        {isAdminOrManagerRole(inviteRole) ? (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="password">{t("auth.accept.set_password")}</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder={t("auth.accept.password_placeholder")}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        minLength={8}
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="confirmPassword">{t("auth.accept.confirm_password")}</Label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder={t("auth.accept.confirm_placeholder")}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        minLength={8}
                                        required
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Password is not required for frontline staff invitations; they use a Login PIN */}
                                <div className="grid gap-2">
                                    <Label htmlFor="pinCode">{t("auth.accept.set_pin")}</Label>
                                    <Input
                                        id="pinCode"
                                        type="text"
                                        placeholder={t("auth.accept.pin_placeholder")}
                                        value={pinCode}
                                        onChange={(e) => setPinCode(e.target.value)}
                                        maxLength={4}
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="email">{t("auth.accept.email_optional")}</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder={t("auth.accept.email_placeholder")}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </>
                        )}
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? t("auth.accept.submitting") : t("auth.accept.submit")}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default AcceptInvitation;
