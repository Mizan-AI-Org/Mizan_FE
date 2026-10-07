import React, { useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import BrandLogo from "@/components/BrandLogo";
import { tenantHomePath } from "@/lib/platformApi";
import { restaurantOnboardingComplete } from "@/lib/onboarding-gate";
import { useAuth } from "@/hooks/use-auth";

const Unauthorized: React.FC = () => {
  const { t } = useTranslation();
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
  const setupInProgress =
    isRestaurantOwner && !restaurantOnboardingComplete(storedUser);

  useEffect(() => {
    if (!isRestaurantOwner || setupInProgress) return;
    const timer = window.setTimeout(() => navigate(home, { replace: true }), 2200);
    return () => window.clearTimeout(timer);
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
            {isRestaurantOwner
              ? t("errors.unauthorized.wrong_door")
              : t("errors.unauthorized.denied")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isRestaurantOwner ? (
            <p className="text-sm text-muted-foreground text-center">
              {t("errors.unauthorized.restaurant_redirect")}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground text-center">
              {t("errors.unauthorized.platform_hint")}
            </p>
          )}
          <div className="flex gap-2 justify-center">
            <Button asChild variant="secondary">
              <Link to={isRestaurantOwner ? home : "/dashboard"}>
                {isRestaurantOwner
                  ? t("errors.unauthorized.go_business")
                  : t("errors.unauthorized.go_dashboard")}
              </Link>
            </Button>
            {!isRestaurantOwner && (
              <Button asChild variant="outline">
                <Link to="/auth">{t("errors.unauthorized.sign_in")}</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Unauthorized;
