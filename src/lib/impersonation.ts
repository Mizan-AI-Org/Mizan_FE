/** Impersonation token swap for platform ops support sessions. */

const OPS_ACCESS = "ops_access_token";
const OPS_REFRESH = "ops_refresh_token";
const IMPERSONATION = "platform_impersonation";

export type ImpersonationState = {
  restaurant: { id: string; name: string };
  returnTo: string;
};

export function startImpersonation(opts: {
  access: string;
  refresh: string;
  restaurant: { id: string; name: string };
  returnTo: string;
}) {
  const currentAccess = localStorage.getItem("access_token");
  const currentRefresh = localStorage.getItem("refresh_token");
  if (currentAccess) localStorage.setItem(OPS_ACCESS, currentAccess);
  if (currentRefresh) localStorage.setItem(OPS_REFRESH, currentRefresh);

  localStorage.setItem("access_token", opts.access);
  localStorage.setItem("refresh_token", opts.refresh);
  localStorage.setItem(
    IMPERSONATION,
    JSON.stringify({
      restaurant: opts.restaurant,
      returnTo: opts.returnTo,
    } satisfies ImpersonationState),
  );
}

export function getImpersonation(): ImpersonationState | null {
  try {
    const raw = localStorage.getItem(IMPERSONATION);
    if (!raw) return null;
    return JSON.parse(raw) as ImpersonationState;
  } catch {
    return null;
  }
}

export function exitImpersonation(): string {
  const state = getImpersonation();
  const opsAccess = localStorage.getItem(OPS_ACCESS);
  const opsRefresh = localStorage.getItem(OPS_REFRESH);

  if (opsAccess) localStorage.setItem("access_token", opsAccess);
  if (opsRefresh) localStorage.setItem("refresh_token", opsRefresh);

  localStorage.removeItem(OPS_ACCESS);
  localStorage.removeItem(OPS_REFRESH);
  localStorage.removeItem(IMPERSONATION);

  return state?.returnTo || "/admin/tenants";
}

export function isImpersonating(): boolean {
  return !!localStorage.getItem(IMPERSONATION);
}
