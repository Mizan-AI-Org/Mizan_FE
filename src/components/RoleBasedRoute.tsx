import { useAuth } from "../hooks/use-auth";
import React from "react";
import { Navigate } from "react-router-dom";
import { usePermissions } from "@/hooks/use-permissions";
import { isPrivilegedRole, roleAllowed } from "@/lib/operationalCommandRoles";

interface RoleBasedRouteProps {
    children: React.ReactNode;
    allowedRoles: string[];
    /**
     * Optional RBAC app id. When provided, the current user must also have
     * the corresponding app in their effective permissions. Privileged roles
     * (SUPER_ADMIN / ADMIN / OWNER) always pass this check.
     */
    appId?: string;
}

const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({
    children,
    allowedRoles,
    appId,
}) => {
    const { user, isLoading } = useAuth();
    const { canApp, isLoading: permsLoading } = usePermissions();

    if (isLoading || (appId && permsLoading)) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/auth" replace />;
    }

    if (!roleAllowed(user.role, allowedRoles)) {
        return <Navigate to="/unauthorized" replace />;
    }

    if (appId && !isPrivilegedRole(user.role) && !canApp(appId)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return <>{children}</>;
};

export default RoleBasedRoute;
