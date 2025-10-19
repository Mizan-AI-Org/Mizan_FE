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
      ...options,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (response.status === 401) {
      // Token expired, try to refresh
      const newToken = await refreshToken();
      if (newToken) {
        (
          config.headers as Record<string, string>
        ).Authorization = `Bearer ${newToken}`;
        return fetch(`${API_BASE_URL}${endpoint}`, config);
      }
    }

    return response;
  },
};

async function refreshToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem("refresh_token");

  if (!refreshToken) {
    // Redirect to login
    window.location.href = "/auth";
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem("access_token", data.access);
      return data.access;
    }
  } catch (error) {
    console.error("Token refresh failed:", error);
  }

  // Clear tokens and redirect to login
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
  window.location.href = "/auth";
  return null;
}
