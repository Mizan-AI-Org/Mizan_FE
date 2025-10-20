import React, {
  useEffect,
  useState,
  useCallback,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { SignupData, StaffUserData } from "../services/backend.service";
import { AuthContext } from "./AuthContext.ts";
import { AuthContextType, User } from "./AuthContext.types.ts";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

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
        const response = await fetch("/api/auth/profile", {
          method: "GET",
          credentials: "include",
          headers: {
            Authorization: localStorage.getItem("access_token")
              ? `Bearer ${localStorage.getItem("access_token")}`
              : undefined,
          } as Record<string, string>,
        });

        if (response.ok) {
          const userData: User = await response.json();
          setUser(userData);
          // Don't auto-redirect on auth initialization - let the user stay where they are
          // Only redirect if they're on a public route like /auth
          if (location.pathname === "/auth" || location.pathname === "/staff-login") {
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

  const login = async (email: string, password: string) => {
    const response = await fetch("/api/auth/login/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    const responseText = await response.text(); // Always capture raw response text
    console.log("Raw backend response:", responseText); // Log raw text

    if (!response.ok) {
      let errorData = { message: "Login failed" };
      try {
        errorData = JSON.parse(responseText); // Attempt to parse as JSON
      } catch (e) {
        console.error("Failed to parse error response as JSON:", e, "Raw response:", responseText);
      }
      throw new Error(errorData.message || "Login failed");
    }

    const data = JSON.parse(responseText); // Parse the already captured raw text
    setUser(data.user);
    localStorage.setItem("user", JSON.stringify(data.user));

    // Redirect based on role
    if (data.user.role === "SUPER_ADMIN" || data.user.role === "ADMIN") {
      navigate("/dashboard");
    } else {
      navigate("/staff-dashboard");
    }
  };

  const loginWithPin = async (pin: string, imageSrc: string | null, latitude: number | null, longitude: number | null) => {
    const response = await fetch("/api/auth/pin-login/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ pin, image_data: imageSrc, latitude, longitude }),
    });

    const responseText = await response.text();
    console.log("Raw backend PIN login response:", responseText);

    if (!response.ok) {
      let errorData = { message: "PIN login failed" };
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse PIN login error response as JSON:", e, "Raw response:", responseText);
      }
      throw new Error(errorData.message || "PIN login failed");
    }

    const data = JSON.parse(responseText);
    setUser(data.user);
    localStorage.setItem("user", JSON.stringify(data.user));

    if (data.user.role === "SUPER_ADMIN" || data.user.role === "ADMIN") {
      navigate("/dashboard");
    } else {
      navigate("/staff-dashboard");
    }
  };

  const ownerSignup = async (signupData: SignupData) => {
    const response = await fetch("/api/auth/signup/owner", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(signupData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Signup failed");
    }

    const data = await response.json();
    setUser(data.user);
    localStorage.setItem("user", JSON.stringify(data.user));
    navigate("/dashboard");
  };

  const acceptInvitation = async (token: string, userData: StaffUserData) => {
    const response = await fetch("/api/auth/accept-invitation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ token, user: userData }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Invitation acceptance failed");
    }

    const data = await response.json();
    setUser(data.user);
    localStorage.setItem("user", JSON.stringify(data.user));
    navigate("/staff-dashboard");
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
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

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    loginWithPin,
    ownerSignup,
    acceptInvitation,
    logout,
    hasRole,
    isSuperAdmin,
    isAdmin,
    isStaff,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

