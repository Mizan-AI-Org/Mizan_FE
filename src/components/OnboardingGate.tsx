import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { restaurantOnboardingComplete } from '@/lib/onboarding-gate';

/**
 * Redirect owners/admins to the first-run wizard until it's complete.
 *
 * Staff roles (CHEF, WAITER, CLEANER, …) and users whose tenant has already
 * finished setup pass through unchanged. Completion is determined solely from
 * ``restaurant_data.onboarding_completed_at`` (set by skip-all / complete /
 * finishing required steps) — never from a sticky browser-local flag.
 */
const OnboardingGate: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const { user } = useAuth();
    if (!user) return <>{children}</>;

    const role = String(user.role || '').toUpperCase();
    const isOwnerLike = ['SUPER_ADMIN', 'OWNER', 'ADMIN'].includes(role);
    if (!isOwnerLike) return <>{children}</>;

    if (restaurantOnboardingComplete(user)) return <>{children}</>;

    return <Navigate to="/onboarding" replace />;
};

export default OnboardingGate;
