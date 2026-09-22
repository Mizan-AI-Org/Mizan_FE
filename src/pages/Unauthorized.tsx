import React, { useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import BrandLogo from "@/components/BrandLogo";
import { tenantHomePath } from "@/lib/platformApi";
import { restaurantOnboardingComplete } from "@/lib/onboarding-gate";
import { useAuth } from "@/hooks/use-auth";

const Unauthorized: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const storedUser = useMemo(() => {
    if (user) return user;
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [user]);

  const home = tenantHomePath(storedUser);
  const isRestaurantOwner = Boolean(
    storedUser &&
      !storedUser.is_platform_operator &&
      (storedUser.restaurant_id || storedUser.restaurant || storedUser.role),
  );
  // Signup/setup must never show Wrong door / “Go to my business”.
  const setupInProgress =
    isRestaurantOwner && !restaurantOnboardingComplete(storedUser);

  // Completed restaurant owners who land here after /admin confusion:
  // brief Wrong door, then continue to the business dashboard.
  useEffect(() => {
    if (!isRestaurantOwner || setupInProgress) return;
    const t = window.setTimeout(() => navigate(home, { replace: true }), 2200);
    return () => window.clearTimeout(t);
  }, [isRestaurantOwner, setupInProgress, home, navigate]);

  if (setupInProgress) {
    return <Navigate to={home} replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <div className="flex justify-center mb-3">
            <BrandLogo size="sm" />
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-600" />
            {isRestaurantOwner ? "Wrong door" : "Access Denied"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isRestaurantOwner ? (
            <p className="text-sm text-muted-foreground text-center">
              You&apos;re signed in to your business account. This screen usually means
              you opened a platform-only area by mistake — we&apos;re sending you to
              your dashboard…
            </p>
          ) : (
            <p className="text-sm text-muted-foreground text-center">
              You don&apos;t have access to this page. If you manage a restaurant,
              sign in at <code className="text-xs">/auth</code>. Platform Admin (
              <code className="text-xs">/admin</code>) is only for dedicated Mizan
              operators.
            </p>
          )}
          <div className="flex gap-2 justify-center">
            <Button asChild variant="secondary">
              <Link to={isRestaurantOwner ? home : "/dashboard"}>
                {isRestaurantOwner ? "Go to my business" : "Go to Dashboard"}
              </Link>
            </Button>
            {!isRestaurantOwner && (
              <Button asChild variant="outline">
                <Link to="/auth">Sign In</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Unauthorized;
