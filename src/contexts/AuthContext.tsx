/// <reference types="vite/client" />
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { SignupData } from "../lib/types";
import { AuthContext } from "./AuthContext";
import { AuthContextType, User } from "./AuthContext.types";
import { api } from "../lib/api";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Centralized API base, consistent with other pages
  const API_BASE =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_REACT_APP_API_URL ||
    "http://localhost:8000/api";

  const clearAuth = useCallback(() => {
    localStorage.removeItem("user");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
  }, []);

  const initializeAuth = useCallback(async () => {
    try {
      const storedUser = localStorage.getItem("user");
      const token = localStorage.getItem("access_token");

      if (storedUser && token) {
        // Verify token is still valid by fetching profile
        const response = await fetch(`${API_BASE}/auth/me/`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: localStorage.getItem("access_token")
              ? `Bearer ${localStorage.getItem("access_token")}`
              : "",
          },
        });

        if (response.ok) {
          const userData: User = await response.json();
          setUser(userData);
          // Don't auto-redirect on auth initialization - let the user stay where they are
          // Only redirect if they're on a public route like /auth
          if (
            location.pathname === "/auth" ||
            location.pathname === "/staff-login"
          ) {
            if (userData.role === "SUPER_ADMIN" || userData.role === "ADMIN") {
              navigate("/dashboard");
            } else {
              navigate("/staff-dashboard");
            }
          }
        } else {
          // Do not force clear on transient failures; allow app to show login page naturally
          clearAuth();
        }
      }
    } catch (error) {
      console.error("Auth initialization error:", error);
      clearAuth();
    } finally {
      setIsLoading(false);
    }
  }, [clearAuth, navigate, location.pathname]);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Periodically refresh user role and permissions for real-time UI updates
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const refreshInterval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/auth/me/`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        });
        if (response.ok) {
          const latest: User = await response.json();
          // Update user in memory and localStorage only if something changed
          const prev = user ? JSON.stringify(user) : null;
          const next = JSON.stringify(latest);
          if (prev !== next) {
            setUser(latest);
            localStorage.setItem("user", JSON.stringify(latest));
          }
        }
      } catch (err) {
        // Do not clear auth on transient errors
        console.warn("Periodic role refresh failed:", err);
      }
    }, 60000); // 60 seconds

    return () => clearInterval(refreshInterval);
  }, [user]);

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
            errorMsg =
              parsed.message || parsed.error || `Login failed (${response.status})`;
          } catch (e) {
            errorMsg = `Login failed (${response.status})`;
          }
        } else {
          if (response.status === 401) errorMsg = "Invalid email or password.";
          else if (response.status >= 500)
            errorMsg = "Server error during login. Please try again.";
          else errorMsg = "Backend unreachable or returned a non-JSON error.";
        }
        console.error("Login failed:", errorMsg, "Status:", response.status);
        throw new Error(errorMsg);
      }

      const data = isJson ? JSON.parse(rawText) : {};
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("access_token", data.tokens?.access || data.access);
      localStorage.setItem(
        "refresh_token",
        data.tokens?.refresh || data.refresh
      );

      if (data.user.role === "SUPER_ADMIN" || data.user.role === "ADMIN") {
        navigate("/dashboard");
      } else {
        navigate("/staff-dashboard");
      }
    } catch (err) {
      console.error("Login request error:", err);
      if (err instanceof Error) {
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
      console.log("Raw backend PIN login response:", rawText);

      if (!response.ok) {
        let errorMsg = "PIN login failed";
        if (isJson && rawText) {
          try {
            const parsed = JSON.parse(rawText);
            errorMsg = parsed.message || parsed.error || "PIN login failed";
          } catch (e) {
            errorMsg = `PIN login failed (${response.status})`;
          }
        } else {
          if (response.status === 401) errorMsg = "Invalid PIN or user.";
          else if (response.status >= 500)
            errorMsg = "Server error during PIN login. Please try again.";
          else errorMsg = "Backend unreachable or returned a non-JSON error.";
        }
        console.error("PIN login failed:", errorMsg, "Status:", response.status);
        throw new Error(errorMsg);
      }

      const data = isJson ? JSON.parse(rawText) : {};
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("access_token", data.tokens?.access || data.access);
      localStorage.setItem(
        "refresh_token",
        data.tokens?.refresh || data.refresh
      );

      if (data.user.role === "SUPER_ADMIN" || data.user.role === "ADMIN") {
        navigate("/dashboard");
      } else {
        navigate("/staff-dashboard");
      }
    } catch (err) {
      console.error("PIN login request error:", err);
      if (err instanceof Error) {
        throw err;
      }
      throw new Error("Network error during PIN login. Please check backend server.");
    }
  };

  const ownerSignup = async (signupData: SignupData) => {
    const response = await fetch(`${API_BASE}/auth/signup/owner/`, {
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
          const parsed = JSON.parse(rawText);
          if (parsed.message) {
            errorMsg = parsed.message;
          } else {
            const parts: string[] = [];
            Object.entries(parsed).forEach(([key, val]) => {
              const messages = Array.isArray(val) ? val : [val];
              const text = messages
                .filter(Boolean)
                .map((v) => (typeof v === "string" ? v : JSON.stringify(v)))
                .join(", ");
              parts.push(`${key}: ${text}`);
            });
            if (parts.length) errorMsg = parts.join(" | ");
          }
        } catch (e) {
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
    setUser(data.user);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("access_token", data.tokens.access);
    localStorage.setItem("refresh_token", data.tokens.refresh);
    navigate("/dashboard");
  };

  const acceptInvitation = async (
    token: string,
    first_name: string,
    last_name: string,
    password?: string,
    pin_code?: string | null,
    invitation_pin?: string | null
  ) => {
    // Use the API client’s logic to hit the right endpoint
    const data = await api.acceptInvitation(
      token,
      first_name,
      last_name,
      password,
      pin_code,
      invitation_pin
    );
    setUser(data.user);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("access_token", data.tokens.access);
    localStorage.setItem("refresh_token", data.tokens.refresh);
    if (data.user?.role === "SUPER_ADMIN" || data.user?.role === "ADMIN") {
      navigate("/dashboard");
    } else {
      navigate("/staff-dashboard");
    }
  };

  const inviteStaff = async (
    accessToken: string,
    inviteData: {
      email: string;
      role: string;
      first_name?: string;
      last_name?: string;
      phone_number?: string;
    }
  ) => {
    const response = await fetch(`${API_BASE}/staff/invite/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(inviteData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to send invitation");
    }

    return await response.json();
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        await fetch("/api/auth/logout/", {
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
      navigate("/auth");
    }
  };

  const hasRole = (roles: string[]): boolean => {
    return user ? roles.includes(user.role) : false;
  };

  const isSuperAdmin = (): boolean => user?.role === "SUPER_ADMIN";
  const isAdmin = (): boolean => user?.role === "ADMIN";
  const isStaff = (): boolean => {
    const staffRoles = ["CHEF", "WAITER", "CLEANER", "CASHIER"];
    return user ? staffRoles.includes(user.role) : false;
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    try {
      localStorage.setItem("user", JSON.stringify(updatedUser));
    } catch (e) {
      console.warn("Failed to persist updated user to localStorage", e);
    }
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
    acceptInvitation,
    inviteStaff,
    logout,
    hasRole,
    isSuperAdmin,
    isAdmin,
    isStaff,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
