import React, { useEffect, useMemo } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { platformApi, tenantHomePath } from "@/lib/platformApi";
import { restaurantOnboardingComplete } from "@/lib/onboarding-gate";
import { exitImpersonation, isImpersonating } from "@/lib/impersonation";
import { Loader2 } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import PlatformAdminLogin from "@/components/platform-admin/PlatformAdminLogin";

type StoredTenantUser = {
  role?: string;
  is_platform_operator?: boolean;
  restaurant_id?: string | null;
  restaurant?: string | null;
  restaurant_data?: { onboarding_completed_at?: string | null } | null;
};

function readStoredTenantUser(): StoredTenantUser | null {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    return JSON.parse(raw) as StoredTenantUser;
  } catch {
    return null;
  }
}

/**
 * Gates /admin to explicit platform operators.
 *
 * Owners mid-signup/setup are sent straight to /onboarding (no Wrong door).
 * Completed restaurant sessions that open /admin keep their JWT and see
 * /unauthorized (“Wrong door”).
 */
export default function PlatformAdminGate() {
  const queryClient = useQueryClient();
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const impersonating = typeof window !== "undefined" && isImpersonating();
  const storedUser = useMemo(() => readStoredTenantUser(), []);

  const isRestaurantSession = Boolean(
    storedUser &&
      !storedUser.is_platform_operator &&
      (storedUser.restaurant_id || storedUser.restaurant || storedUser.role),
  );
  const setupInProgress =
    isRestaurantSession && storedUser && !restaurantOnboardingComplete(storedUser);

  // Leaving a tenant impersonation session: restore ops tokens and stay on /admin.
  useEffect(() => {
    if (!impersonating) return;
    exitImpersonation();
    window.location.replace("/admin");
  }, [impersonating]);

  const { data, isLoading, error, isFetched } = useQuery({
    queryKey: ["platform-me"],
    queryFn: () => platformApi.me(),
    enabled: !!token && !impersonating && !isRestaurantSession,
    retry: false,
    staleTime: 60_000,
  });

  const status = (error as Error & { status?: number })?.status;
  const allowed = !!data?.is_platform_operator;
  const denied =
    !impersonating &&
    !isRestaurantSession &&
    !!token &&
    isFetched &&
    (status === 403 || status === 401 || !allowed);

  useEffect(() => {
    if (!denied) return;
    // Only clear when this was an ops attempt that failed — never a restaurant session.
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    queryClient.removeQueries({ queryKey: ["platform-me"] });
  }, [denied, queryClient]);

  if (impersonating) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200">
        <BrandLogo size="md" />
        <Loader2 className="h-6 w-6 animate-spin text-[#00C853]" />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Leaving Platform Admin (support session)…
        </p>
      </div>
    );
  }

  // Mid-signup/setup: never show Wrong door — continue onboarding silently.
  if (setupInProgress) {
    return <Navigate to={tenantHomePath(storedUser)} replace />;
  }

  // Established restaurant JWT on /admin → Wrong door (session kept).
  if (isRestaurantSession) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (!token || denied) {
    return (
      <PlatformAdminLogin
        deniedMessage={
          denied
            ? "This account is not a platform operator. Sign in with an ops account, or use /auth for your restaurant login."
            : null
        }
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200">
        <BrandLogo size="md" />
        <Loader2 className="h-6 w-6 animate-spin text-[#00C853]" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Verifying operator access…</p>
      </div>
    );
  }

  return <Outlet context={{ me: data }} />;
}
