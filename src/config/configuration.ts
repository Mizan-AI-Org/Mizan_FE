import { API_BASE } from "@/lib/api";

export default () => ({
  backend: {
    apiUrl: API_BASE,
    authUrl: `${API_BASE}/auth`,
  },
  frontend: {
    url: import.meta.env.VITE_FRONTEND_URL || "https://app.heymizan.ai",
  },
});
