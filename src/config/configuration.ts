export default () => ({
  backend: {
    apiUrl: process.env.BACKEND_API_URL || "http://localhost:8000/api",
    authUrl: process.env.BACKEND_AUTH_URL || "http://localhost:8000/api/auth",
  },
  frontend: {
    url: process.env.FRONTEND_URL || "http://localhost:3000",
  },
});
