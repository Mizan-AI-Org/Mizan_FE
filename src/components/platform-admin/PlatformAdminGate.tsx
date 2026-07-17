import React, { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { platformApi } from "@/lib/platformApi";
import { isImpersonating } from "@/lib/impersonation";
import { Loader2 } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import PlatformAdminLogin from "@/components/platform-admin/PlatformAdminLogin";

/** Gates /admin to explicit platform operators. Shows ops login on this URL. */
export default function PlatformAdminGate() {
  const queryClient = useQueryClient();
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const impersonating = typeof window !== "undefined" && isImpersonating();

  // Support session uses a restaurant JWT — never wipe it; bounce back to the app.
  useEffect(() => {
    if (!impersonating) return;
    window.location.replace("/dashboard");
  }, [impersonating]);

  const { data, isLoading, error, isFetched } = useQuery({
    queryKey: ["platform-me"],
    queryFn: () => platformApi.me(),
    enabled: !!token && !impersonating,
    retry: false,
    staleTime: 60_000,
  });

  const status = (error as Error & { status?: number })?.status;
  const allowed = !!data?.is_platform_operator;
  const denied =
    !impersonating && !!token && isFetched && (status === 403 || status === 401 || !allowed);

  useEffect(() => {
    if (!denied) return;
    // Only clear the active session when it is not an ops support impersonation.
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
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

  if (!token || denied) {
    return (
      <PlatformAdminLogin
        deniedMessage={
          denied
            ? "This account is not a platform operator. Sign in with an ops account."
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
