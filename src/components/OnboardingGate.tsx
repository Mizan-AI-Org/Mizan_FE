import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';

/**
 * Redirect owners/admins to the first-run wizard until it's complete.
 *
 * Staff roles (CHEF, WAITER, CLEANER, …) and users whose tenant has already
 * finished setup pass through unchanged. We deliberately wrap only the
 * dashboard root(s), so deep links into sub-pages still work for existing
 * tenants and the wizard itself (`/onboarding`) is not affected.
 */
const OnboardingGate: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const { user } = useAuth();
    if (!user) return <>{children}</>;

    const role = String(user.role || '').toUpperCase();
    const isOwnerLike = ['SUPER_ADMIN', 'OWNER', 'ADMIN'].includes(role);
    if (!isOwnerLike) return <>{children}</>;

    const completedAt = user.restaurant_data?.onboarding_completed_at;
    if (completedAt) return <>{children}</>;

    return <Navigate to="/onboarding" replace />;
};

export default OnboardingGate;
