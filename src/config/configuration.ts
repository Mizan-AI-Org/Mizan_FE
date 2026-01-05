export default () => ({
  backend: {
    apiUrl: import.meta.env.VITE_BACKEND_URL ? `${import.meta.env.VITE_BACKEND_URL}/api` : "http://localhost:8000/api",
    authUrl: import.meta.env.VITE_BACKEND_URL ? `${import.meta.env.VITE_BACKEND_URL}/api/auth` : "http://localhost:8000/api/auth",
  },
  frontend: {
    url: process.env.FRONTEND_URL || "http://localhost:3000",
  },
});
