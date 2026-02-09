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
    const [inviteLoadError, setInviteLoadError] = useState<{ type: 'not_found' | 'expired'; message: string } | null>(null);

    const isAdminOrManagerRole = (role?: string | null) => {
        if (!role) return false;
        return ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OWNER'].includes(role);
    };

    useEffect(() => {
        if (!token) return;
        let cancelled = false;

        const fetchInviteMeta = async () => {
            try {
                setInviteLoadError(null);
                const res = await fetch(`${API_BASE}/invitations/by-token/?token=${encodeURIComponent(token)}`);
                let data: any = {};
                try {
                    data = await res.json();
                } catch {
                    // non-JSON or empty body
                }
                if (cancelled) return;

                if (!res.ok) {
                    const detail = data.detail || (typeof data === 'string' ? data : 'Invalid invitation');
                    if (res.status === 404 || (detail && String(detail).toLowerCase().includes('not found'))) {
                        setInviteLoadError({ type: 'not_found', message: t('auth.accept.error_not_found') || 'Invitation not found.' });
                        return;
                    }
                    if (data.is_expired || (detail && String(detail).toLowerCase().includes('expired'))) {
                        setInviteLoadError({ type: 'expired', message: t('auth.accept.error_expired') || 'This invitation has expired.' });
                        return;
                    }
                    setInviteLoadError({ type: 'expired', message: detail });
                    return;
                }

                // User already accepted – redirect to login with a friendly message
                if (data.is_accepted) {
                    toast({
                        title: t('auth.accept.toast_already_accepted_title') || 'Already accepted',
                        description: t('auth.accept.toast_already_accepted_desc') || "You've already accepted this invitation. Please log in.",
                        variant: 'default',
                    });
                    navigate('/auth', { replace: true });
                    return;
                }

                setInviteRole(data.role || null);
                setInviteEmail(data.email || null);
                setRequireEmail(!data.email);
                if (data.restaurant_name) setRestaurantName(data.restaurant_name);

                // Pre-fill name fields if present
                if (data.first_name && !firstName) setFirstName(data.first_name);
                if (data.last_name && !lastName) setLastName(data.last_name);
            } catch {
                setInviteLoadError({ type: 'not_found', message: t('auth.accept.error_load_failed') || 'Could not load invitation. Please check the link.' });
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
            if (requireEmail && (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
                toast({
                    title: t("auth.accept.toast_error"),
                    description: t("auth.accept.toast_email_required") || "Email is required for this invitation.",
                    variant: "destructive",
                });
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
            if (message === 'already_accepted' || message.toLowerCase().includes('already accepted')) {
                toast({
                    title: t('auth.accept.toast_already_accepted_title') || 'Already accepted',
                    description: t('auth.accept.toast_already_accepted_desc') || "You've already accepted this invitation. Please log in.",
                    variant: 'default',
                });
                navigate('/auth', { replace: true });
                return;
            }
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

    if (inviteLoadError) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>{t("auth.accept.invalid_title")}</CardTitle>
                        <CardDescription>{inviteLoadError.message}</CardDescription>
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
                                    <Label htmlFor="email">{requireEmail ? t("auth.accept.email_required") || "Email" : t("auth.accept.email_optional")}</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder={t("auth.accept.email_placeholder")}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required={requireEmail}
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
