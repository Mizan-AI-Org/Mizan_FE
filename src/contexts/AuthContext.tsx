/// <reference types="vite/client" />
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { SignupData } from "../lib/types";
import { AuthContext } from "./AuthContext";
import { AuthContextType, User } from "./AuthContext.types";
import { api, API_BASE, authFetch, refreshAccessToken } from "../lib/api";
import i18n from "@/i18n";
import { accountErrorText } from "@/lib/accountErrors";
import { clearOnboardingSkipFlags, restaurantOnboardingComplete } from "@/lib/onboarding-gate";
import { roleAllowed } from "@/lib/operationalCommandRoles";
import { isTenantUserSession } from "@/lib/platformApi";
import { resolveUserLanguage } from "@/lib/userLanguage";

type AuthMeResult =
  | { status: "ok"; user: User }
  | { status: "unauthorized" }
  | { status: "unavailable" };

/** Coalesce parallel GET /auth/me/ and avoid hammering the API (exhausts local Postgres). */
const AUTH_ME_MIN_INTERVAL_MS = 15_000;
let currentUserFetch: Promise<AuthMeResult> | null = null;
let lastAuthMeAt = 0;
let lastAuthMeUser: User | null = null;

function readCachedUser(): User | null {
  try {
    const raw = localStorage.getItem("user");
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function resetAuthMeCache(): void {
  lastAuthMeAt = 0;
  lastAuthMeUser = null;
  currentUserFetch = null;
}

function markAuthenticatedUser(user: User): void {
  lastAuthMeUser = user;
  lastAuthMeAt = Date.now();
}

async function fetchCurrentUser(options?: { force?: boolean }): Promise<AuthMeResult> {
  const token = localStorage.getItem("access_token");
  if (!token) return { status: "unauthorized" };

  const now = Date.now();
  if (
    !options?.force &&
    lastAuthMeUser &&
    now - lastAuthMeAt < AUTH_ME_MIN_INTERVAL_MS
  ) {
    return { status: "ok", user: lastAuthMeUser };
  }

  if (currentUserFetch) return currentUserFetch;

  currentUserFetch = (async (): Promise<AuthMeResult> => {
    const fetchProfile = () =>
      fetch(`${API_BASE}/auth/me/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
    let response = await fetchProfile();
    if (response.status === 401 && (await refreshAccessToken())) {
      response = await fetchProfile();
    }
    if (response.status === 401) return { status: "unauthorized" };
    if (!response.ok) return { status: "unavailable" };
    const body = await response.json();
    const user = (body.user || body.data || body) as User;
    lastAuthMeUser = user;
    lastAuthMeAt = Date.now();
    return { status: "ok", user };
  })().finally(() => {
    currentUserFetch = null;
  });
  return currentUserFetch;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location.pathname);
  locationRef.current = location.pathname;
  /** Once per full page load (or after logout): avoid re-hitting /auth/me on every route change. */
  const sessionCheckedRef = useRef(false);
  const bootstrapInFlightRef = useRef(false);
  const userRef = useRef<User | null>(null);
  userRef.current = user;

  // API_BASE is now imported from ../lib/api

  const clearAuth = useCallback(() => {
    localStorage.removeItem("user");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    clearOnboardingSkipFlags();
    sessionCheckedRef.current = false;
    resetAuthMeCache();
    setUser(null);
  }, []);

  const applyLanguageForUser = useCallback((u: User | null) => {
    if (!u) return;
    // The person's own language drives the app (then the business default); never the business over a choice.
    const normalized = resolveUserLanguage(u, i18n.language);
    if (!normalized) return;
    try {
      localStorage.setItem("language", normalized);
    } catch {
      // ignore storage failures
    }
    // Change i18n immediately (no reload)
    if (i18n.language !== normalized) {
      i18n.changeLanguage(normalized).catch(() => {
        // ignore
      });
    }
  }, []);

  const resolvePostLoginPath = useCallback((userData: User) => {
    const role = String(userData.role || "").toUpperCase();
    const webRoles = ["SUPER_ADMIN", "OWNER", "ADMIN", "MANAGER", "SUPERVISOR"];
    if (!webRoles.includes(role)) {
      return "/staff-whatsapp";
    }

    const isOwnerLike =
      role === "SUPER_ADMIN" || role === "ADMIN" || role === "OWNER";
    if (isOwnerLike && !restaurantOnboardingComplete(userData)) {
      return "/onboarding";
    }
    return "/dashboard";
  }, []);

  const bootstrapSession = useCallback(async () => {
    if (sessionCheckedRef.current) {
      setIsLoading(false);
      return;
    }
    if (bootstrapInFlightRef.current) return;
    bootstrapInFlightRef.current = true;

    try {
      const pathname = locationRef.current;
      // Platform Admin (/admin) uses its own login + /api/platform/* - skip tenant bootstrap.
      if (pathname.startsWith("/admin")) {
        sessionCheckedRef.current = true;
        return;
      }

      const token = localStorage.getItem("access_token");
      const cachedUser = readCachedUser();

      if (token && cachedUser) {
        if (!userRef.current) {
          setUser(cachedUser);
          applyLanguageForUser(cachedUser);
        }

        const me = await fetchCurrentUser();
        if (me.status === "ok") {
          const userData = me.user;
          if (userData.is_platform_operator === true && !isTenantUserSession(userData)) {
            if (pathname === "/auth" || !pathname.startsWith("/admin")) {
              navigate("/admin", { replace: true });
            }
            sessionCheckedRef.current = true;
            return;
          }
          const sameAsCache =
            JSON.stringify(userData) === JSON.stringify(cachedUser);
          if (!sameAsCache || !userRef.current) {
            setUser(userData);
            applyLanguageForUser(userData);
            localStorage.setItem("user", JSON.stringify(userData));
          }
        } else if (me.status === "unauthorized") {
          clearAuth();
        }
        // unavailable: keep cached session (do not log out on DB blips)
      } else if (token && !cachedUser) {
        const me = await fetchCurrentUser({ force: true });
        if (me.status === "ok") {
          setUser(me.user);
          applyLanguageForUser(me.user);
          localStorage.setItem("user", JSON.stringify(me.user));
        } else if (me.status === "unauthorized") {
          clearAuth();
        }
      }
      sessionCheckedRef.current = true;
    } catch (error) {
      console.error("Auth initialization error:", error);
      sessionCheckedRef.current = true;
    } finally {
      bootstrapInFlightRef.current = false;
      setIsLoading(false);
    }
  }, [clearAuth, navigate, applyLanguageForUser]);

  useEffect(() => {
    clearOnboardingSkipFlags();
    void bootstrapSession();
  }, [bootstrapSession]);

  useEffect(() => {
    if (!user || location.pathname !== "/auth") return;
    navigate(resolvePostLoginPath(user), { replace: true });
  }, [user, location.pathname, navigate, resolvePostLoginPath]);

  // Periodically refresh user role and permissions for real-time UI updates.
  // Skip the call when the tab is hidden so background tabs don't hammer the API,
  // and bump the interval to 5 min on production-sized workspaces.
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    let cancelled = false;

    const refresh = async () => {
      if (cancelled) return;
      if (locationRef.current.startsWith("/admin")) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      try {
        const latest = await fetchCurrentUser();
        if (latest.status !== "ok") return;
        const prev = userRef.current ? JSON.stringify(userRef.current) : null;
        const next = JSON.stringify(latest.user);
        if (prev !== next) {
          setUser(latest.user);
          localStorage.setItem("user", JSON.stringify(latest.user));
          applyLanguageForUser(latest.user);
        }
      } catch (err) {
        console.warn("Periodic role refresh failed:", err);
      }
    };

    const refreshInterval = setInterval(refresh, 300_000);

    return () => {
      cancelled = true;
      clearInterval(refreshInterval);
    };
  }, [applyLanguageForUser]);

  // api.ts broadcasts this when a 401 survives a silent token-refresh attempt
  // (expired/blacklisted refresh token) so state clears and the user is sent
  // back to login instead of hammering the API with a dead access token.
  useEffect(() => {
    const onAuthExpired = () => {
      clearAuth();
      if (!location.pathname.startsWith("/admin")) {
        navigate("/auth", { replace: true });
      }
    };
    window.addEventListener("mizan:auth-expired", onAuthExpired);
    return () => window.removeEventListener("mizan:auth-expired", onAuthExpired);
  }, [clearAuth, navigate, location.pathname]);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE}/auth/login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const contentType = response.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      const rawText = await response.text();

      if (!response.ok) {
        let errorMsg = "Login failed";
        if (isJson && rawText) {
          try {
            const parsed = JSON.parse(rawText);
            if (parsed.code === "platform_ops_use_admin_login") {
              throw new Error(
                "Platform operator accounts sign in at /admin only. This page is for restaurant staff and managers.",
              );
            }
            if (parsed.code === "whatsapp_only") {
              const wa = parsed.data?.whatsapp_url as string | undefined;
              sessionStorage.setItem(
                "mizan_whatsapp_only",
                JSON.stringify({
                  role: parsed.data?.role,
                  whatsapp_url: wa,
                }),
              );
              navigate("/staff-whatsapp", {
                replace: true,
                state: { role: parsed.data?.role, whatsappUrl: wa },
              });
              throw new Error(
                parsed.error ||
                  "This role uses WhatsApp only. Open WhatsApp to work with Mizan.",
              );
            }
            errorMsg =
              parsed.message || parsed.error || `Login failed (${response.status})`;
          } catch (e) {
            if (e instanceof Error && (e.message.includes("WhatsApp") || e.message.includes("/admin"))) {
              throw e;
            }
            errorMsg = `Login failed (${response.status})`;
          }
        } else {
          if (response.status === 401) errorMsg = "Invalid email or password.";
          else if (response.status >= 500)
            errorMsg = "Server error during login. Please try again.";
          else errorMsg = "Backend unreachable or returned a non-JSON error.";
        }

        throw new Error(errorMsg);
      }

      const data = isJson ? JSON.parse(rawText) : {};
      if (data.user?.is_platform_operator === true || data.code === "platform_ops_use_admin_login") {
        clearAuth();
        throw new Error(
          "Platform operator accounts sign in at /admin only. This page is for restaurant staff and managers.",
        );
      }
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
      applyLanguageForUser(data.user);
      localStorage.setItem("access_token", data.tokens?.access || data.access);
      localStorage.setItem(
        "refresh_token",
        data.tokens?.refresh || data.refresh
      );
      markAuthenticatedUser(data.user as User);
      sessionCheckedRef.current = true;

      navigate(resolvePostLoginPath(data.user));
    } catch (err) {

      if (err instanceof Error) {
        const msg = (err.message || "").toLowerCase();
        if (msg.includes("failed to fetch") || msg.includes("network error") || msg.includes("load failed")) {
          throw new Error("Network error during login. Please check backend server.");
        }
        throw err;
      }
      throw new Error("Network error during login. Please check backend server.");
    }
  };

  const loginWithPin = async (
    pin: string,
    email: string | null = null,
    imageData: string | null = null,
    latitude: number | null = null,
    longitude: number | null = null
  ) => {
    try {
      const response = await fetch(`${API_BASE}/auth/pin-login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pin_code: pin,
          email: email,
          image_data: imageData ?? undefined,
          latitude: latitude ?? undefined,
          longitude: longitude ?? undefined,
        }),
      });

      const contentType = response.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      const rawText = await response.text();
      // PIN login debug logs removed


      if (!response.ok) {
        let errorMsg = "PIN login failed";
        if (isJson && rawText) {
          try {
            const parsed = JSON.parse(rawText);
            if (parsed.code === "whatsapp_only") {
              sessionStorage.setItem(
                "mizan_whatsapp_only",
                JSON.stringify({
                  role: parsed.data?.role,
                  whatsapp_url: parsed.data?.whatsapp_url,
                }),
              );
              navigate("/staff-whatsapp", {
                replace: true,
                state: {
                  role: parsed.data?.role,
                  whatsappUrl: parsed.data?.whatsapp_url,
                },
              });
              throw new Error(
                parsed.error ||
                  "This role uses WhatsApp only. Open WhatsApp to work with Mizan.",
              );
            }
            errorMsg = parsed.message || parsed.error || "PIN login failed";
          } catch (e) {
            if (e instanceof Error && e.message.includes("WhatsApp")) throw e;
            errorMsg = `PIN login failed (${response.status})`;
          }
        } else {
          if (response.status === 401) errorMsg = "Invalid PIN or user.";
          else if (response.status >= 500)
            errorMsg = "Server error during PIN login. Please try again.";
          else errorMsg = "Backend unreachable or returned a non-JSON error.";
        }

        throw new Error(errorMsg);
      }

      const data = isJson ? JSON.parse(rawText) : {};
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
      applyLanguageForUser(data.user);
      localStorage.setItem("access_token", data.tokens?.access || data.access);
      localStorage.setItem(
        "refresh_token",
        data.tokens?.refresh || data.refresh
      );
      markAuthenticatedUser(data.user as User);
      sessionCheckedRef.current = true;

      navigate(resolvePostLoginPath(data.user));
    } catch (err) {

      if (err instanceof Error) {
        const msg = (err.message || "").toLowerCase();
        if (msg.includes("failed to fetch") || msg.includes("network error") || msg.includes("load failed")) {
          throw new Error("Network error during PIN login. Please check backend server.");
        }
        throw err;
      }
      throw new Error("Network error during PIN login. Please check backend server.");
    }
  };

  const ownerSignup = async (signupData: SignupData) => {
    const response = await fetch(`${API_BASE}/register/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(signupData),
    });

    const contentType = response.headers.get("content-type") || "";
    const rawText = await response.text();

    if (!response.ok) {
      let errorMsg = "Signup failed";
      if (contentType.includes("application/json") && rawText) {
        try {
          const parsed = JSON.parse(rawText) as {
            message?: string;
            error?: string;
            detail?: string;
            code?: string;
          };
          errorMsg = accountErrorText(
            parsed.code,
            parsed.error || parsed.message || parsed.detail || `Signup failed (${response.status})`,
          );
        } catch {
          errorMsg = rawText || errorMsg;
        }
      } else {
        errorMsg = rawText || `Signup failed (${response.status})`;
      }
      throw new Error(errorMsg);
    }

    const data = contentType.includes("application/json") && rawText
      ? JSON.parse(rawText)
      : {};
    clearOnboardingSkipFlags();
    setUser(data.user);
    localStorage.setItem("user", JSON.stringify(data.user));
    applyLanguageForUser(data.user);
    localStorage.setItem("access_token", data.tokens.access);
    localStorage.setItem("refresh_token", data.tokens.refresh);
    markAuthenticatedUser(data.user as User);
    sessionCheckedRef.current = true;
    navigate("/onboarding");
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        await fetch(`${API_BASE}/auth/logout/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      clearAuth();
      if (location.pathname.startsWith("/admin")) {
        window.location.assign("/admin");
      } else {
        navigate("/auth");
      }
    }
  };

  const hasRole = (roles: string[]): boolean => {
    if (!user) return false;
    return roleAllowed(user.role, roles);
  };

  const isSuperAdmin = (): boolean => {
    const r = String(user?.role || "").toUpperCase();
    return r === "SUPER_ADMIN" || r === "OWNER" || r === "ADMIN";
  };
  const isAdmin = (): boolean => {
    const r = String(user?.role || "").toUpperCase();
    return r === "ADMIN" || r === "SUPER_ADMIN" || r === "OWNER";
  };
  const isStaff = (): boolean => {
    const staffRoles = ["CHEF", "WAITER", "BARTENDER", "DISHWASHER", "STAFF", "CASHIER", "KITCHEN_HELP", "CLEANER", "RECEPTIONIST", "SECURITY"];
    return user ? staffRoles.includes(String(user.role || "").toUpperCase()) : false;
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    try {
      localStorage.setItem("user", JSON.stringify(updatedUser));
    } catch (e) {
      console.warn("Failed to persist updated user to localStorage", e);
    }
    markAuthenticatedUser(updatedUser);
    applyLanguageForUser(updatedUser);
  };

  const switchBusiness = async (targetUserId: string) => {
    const response = await authFetch(`${API_BASE}/auth/switch-business/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: targetUserId }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !(data.tokens?.access || data.access)) {
      throw new Error(data.error || "Could not open this business");
    }
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("access_token", data.tokens?.access || data.access);
    localStorage.setItem("refresh_token", data.tokens?.refresh || data.refresh);
    // Every cached screen belongs to the other business: start clean, like impersonation does.
    window.location.replace("/dashboard");
  };

  const value: AuthContextType = {
    user,
    isLoading,
    accessToken: typeof window !== "undefined" ? window.localStorage.getItem("access_token") : null,
    refreshToken: typeof window !== "undefined" ? window.localStorage.getItem("refresh_token") : null,
    updateUser,
    login,
    loginWithPin,
    ownerSignup,
    logout,
    switchBusiness,
    hasRole,
    isSuperAdmin,
    isAdmin,
    isStaff,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
