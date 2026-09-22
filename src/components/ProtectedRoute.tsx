import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/use-auth";
import { Loader2 } from "lucide-react";
import { isWhatsAppOnlyRole } from "@/lib/operationalCommandRoles";
import { isTenantUserSession } from "@/lib/platformApi";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole = [],
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Platform-only ops accounts use /admin — never tenant dashboards.
  // Tenant owners may still carry legacy is_platform_operator flags; restaurant_id wins.
  if (user.is_platform_operator === true && !isTenantUserSession(user)) {
    return <Navigate to="/admin" replace />;
  }

  // CHEF / WAITER / STAFF / etc. work on WhatsApp only.
  if (isWhatsAppOnlyRole(user.role)) {
    return <Navigate to="/staff-whatsapp" replace state={{ role: user.role }} />;
  }

  if (requiredRole.length > 0) {
    const role = String(user.role || "").toUpperCase();
    const allowed = requiredRole.map((r) => String(r).toUpperCase());
    if (!allowed.includes(role)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
