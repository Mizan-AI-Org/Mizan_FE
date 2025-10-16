import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

type AppRole = 'owner' | 'manager' | 'server' | 'chef' | 'cleaner';

interface RoleGateProps {
  children: React.ReactNode;
  allowedRoles: AppRole[];
  fallback?: React.ReactNode;
}

export const RoleGate: React.FC<RoleGateProps> = ({ 
  children, 
  allowedRoles,
  fallback 
}) => {
  const { userRoles, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  const hasAccess = userRoles.some(ur => allowedRoles.includes(ur.role));

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <Alert variant="destructive" className="m-4">
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to access this feature.
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
};
