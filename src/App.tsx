import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/layout/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Staff from "./pages/Staff";
import Analytics from "./pages/Analytics";
import AIAssistant from "./pages/AIAssistant";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import POS from "./pages/POS";
import Kitchen from "./pages/Kitchen";
import MenuManagement from "./pages/MenuManagement";
import FloorManagement from "./pages/FloorManagement";
import { LanguageProvider } from "./contexts/LanguageProvider";
import StaffDashboard from "./pages/StaffDashboard";
import RoleBasedRoute from "./components/RoleBasedRoute";
import StaffLayout from "./components/layout/StaffLayout";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/auth" element={<Auth />} />

              {/* Admin/Manager Routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="kitchen" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'CHEF']}>
                    <Kitchen />
                  </RoleBasedRoute>
                } />
                <Route path="menu" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <MenuManagement />
                  </RoleBasedRoute>
                } />
                <Route path="floors" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <FloorManagement />
                  </RoleBasedRoute>
                } />
                <Route path="inventory" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <Inventory />
                  </RoleBasedRoute>
                } />
                <Route path="staff" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <Staff />
                  </RoleBasedRoute>
                } />
                <Route path="analytics" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <Analytics />
                  </RoleBasedRoute>
                } />
                <Route path="assistant" element={<AIAssistant />} />
                <Route path="settings" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN']}>
                    <Settings />
                  </RoleBasedRoute>
                } />
                <Route path="pos" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'WAITER', 'CASHIER']}>
                    <POS />
                  </RoleBasedRoute>
                } />
              </Route>

              {/* Staff Routes */}
              <Route path="/staff-dashboard" element={
                <ProtectedRoute>
                  <StaffLayout />
                </ProtectedRoute>
              }>
                <Route index element={<StaffDashboard />} />
                <Route path="time-tracking" element={<div>Time Tracking (Component Missing)</div>} />
                <Route path="schedule" element={<div>Schedule (Component Missing)</div>} />
                <Route path="pos" element={<POS />} />
              </Route>

              {/* Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;