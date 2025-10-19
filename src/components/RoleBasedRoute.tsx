import { useAuth } from "../hooks/use-auth";
import React from "react";
import { Navigate } from "react-router-dom";

interface RoleBasedRouteProps {
    children: React.ReactNode;
    allowedRoles: string[];
}

const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({
    children,
    allowedRoles,
}) => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/auth" replace />;
    }

    if (!allowedRoles.includes(user.role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return <>{children}</>;
};

export default RoleBasedRoute;
