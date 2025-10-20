const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export const apiClient = {
  async request(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem("access_token");

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      } as Record<string, string>,
      credentials: "include",
      ...options,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (response.status === 401) {
      // Try cookie-based refresh; avoid hard redirects here
      const refreshed = await refreshToken();
      if (refreshed) {
        return fetch(`${API_BASE_URL}${endpoint}`, config);
      }
    }

    return response;
  },
};

async function refreshToken(): Promise<boolean> {
  try {
    const hasRefresh = !!localStorage.getItem("refresh_token");
    const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: hasRefresh
        ? JSON.stringify({ refresh: localStorage.getItem("refresh_token") })
        : undefined,
    });

    if (response.ok) {
      try {
        const data = await response.json();
        if (data?.access) {
          localStorage.setItem("access_token", data.access);
        }
      } catch (_) {
        // No JSON body is fine (cookie-based refresh)
      }
      return true;
    }
  } catch (error) {
    console.error("Token refresh failed:", error);
  }

  return false;
}
