import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/layout/DashboardLayout";
import { LanguageProvider } from "./contexts/LanguageProvider";
import StaffLayout from "./components/layout/StaffLayout";
import RoleBasedRoute from "./components/RoleBasedRoute";
import { useIdleTimeout } from "./hooks/use-idle-timeout";
import React, { useEffect, useState } from "react";
import ErrorBoundary from "./components/ErrorBoundary"; // kept at root in main.tsx
// import usePushNotifications from "./hooks/usePushNotifications"; // Notifications disabled
import { useAuth } from "./contexts/AuthContext";
import OfflineWarning from "./components/OfflineWarning"; // Import OfflineWarning

// Lazy-loaded components
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const Inventory = React.lazy(() => import("./pages/Inventory"));
const Staff = React.lazy(() => import("./pages/Staff"));
const Analytics = React.lazy(() => import("./pages/Analytics"));
const AIAssistant = React.lazy(() => import("./pages/AIAssistant"));
const Auth = React.lazy(() => import("./pages/Auth"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const POS = React.lazy(() => import("./pages/POS"));
const MenuManagement = React.lazy(() => import("./pages/MenuManagement"));
const FloorManagement = React.lazy(() => import("./pages/FloorManagement"));
const StaffDashboard = React.lazy(() => import("./pages/StaffDashboard"));
const PinLogin = React.lazy(() => import("./components/auth/PinLogin"));
const ProfileSettings = React.lazy(() => import("./pages/ProfileSettings"));
const StaffManagement = React.lazy(() => import("./pages/StaffManagement"));
const ScheduleManagement = React.lazy(() => import("./pages/ScheduleManagement"));
const WeeklyScheduleView = React.lazy(() => import("./pages/WeeklyScheduleView"));
const ShiftDetailView = React.lazy(() => import("./pages/ShiftDetailView"));
const ManagerSwapRequests = React.lazy(() => import("./pages/ManagerSwapRequests"));
const AttendanceHistory = React.lazy(() => import("./pages/AttendanceHistory"));
const TableManagement = React.lazy(() => import("./pages/TableManagement"));
const KitchenDisplay = React.lazy(() => import("./pages/KitchenDisplay"));
const CategoryManagement = React.lazy(() => import("./pages/CategoryManagement"));
const ProductManagement = React.lazy(() => import("./pages/ProductManagement"));
const CleaningTasks = React.lazy(() => import("./pages/CleaningTasks"));
const SupervisorDashboard = React.lazy(() => import("./pages/SupervisorDashboard"));
const StaffChat = React.lazy(() => import("./pages/StaffChat"));
const ReportsPage = React.lazy(() => import("./pages/ReportsPage"));

const queryClient = new QueryClient();

const App = () => {
  useIdleTimeout(); // Initialize the idle timeout hook
  // Notifications disabled
  // const { requestPermissionAndGetToken, deleteToken } = usePushNotifications();
  const { user, logout } = useAuth();

  // Notifications disabled
  // useEffect(() => {
  //   if (user) {
  //     requestPermissionAndGetToken();
  //   } else {
  //     // Optionally, delete token on logout
  //     deleteToken();
  //   }
  // }, [user, requestPermissionAndGetToken, deleteToken]);

  const [showOfflineWarning, setShowOfflineWarning] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnlineStatusChange = () => {
      setShowOfflineWarning(!navigator.onLine);
    };

    window.addEventListener('online', handleOnlineStatusChange);
    window.addEventListener('offline', handleOnlineStatusChange);

    return () => {
      window.removeEventListener('online', handleOnlineStatusChange);
      window.removeEventListener('offline', handleOnlineStatusChange);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          {showOfflineWarning && <OfflineWarning onReconnectAttempt={() => window.location.reload()} />}
          <React.Suspense fallback={<div>Loading...</div>}>
            <Routes>
              {/* Public Routes */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/staff-login" element={<PinLogin />} />

              {/* Admin/Manager Routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="menu" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <MenuManagement />
                  </RoleBasedRoute>
                } />
                <Route path="categories" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <CategoryManagement />
                  </RoleBasedRoute>
                } />
                <Route path="products" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <ProductManagement />
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
                <Route path="settings" element={<ProfileSettings />} />
                <Route path="reports" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}>
                    <ReportsPage />
                  </RoleBasedRoute>
                } />
                <Route path="pos" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'WAITER', 'CASHIER']}>
                    <POS />
                  </RoleBasedRoute>
                } />
                <Route path="swap-requests" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <ManagerSwapRequests />
                  </RoleBasedRoute>
                } />
                <Route path="staff-management" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <StaffManagement />
                  </RoleBasedRoute>
                } />
                <Route path="schedule-management" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <ScheduleManagement />
                  </RoleBasedRoute>
                } />
                <Route path="table-management" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <TableManagement />
                  </RoleBasedRoute>
                } />
                <Route path="staff-management/:user_id/attendance" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <AttendanceHistory />
                  </RoleBasedRoute>
                } />
                <Route path="supervisor" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}>
                    <SupervisorDashboard />
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
                <Route path="schedule" element={<WeeklyScheduleView />} />
                <Route path="schedule/:id" element={<ShiftDetailView />} />
                <Route path="attendance" element={<AttendanceHistory />} />
                <Route path="pos" element={<POS />} />
                <Route path="kitchen" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'CHEF']}>
                    <KitchenDisplay />
                  </RoleBasedRoute>
                } />
                <Route path="cleaning-tasks" element={
                  <RoleBasedRoute allowedRoles={['CLEANER']}>
                    <CleaningTasks />
                  </RoleBasedRoute>
                } />
                <Route path="chat" element={<StaffChat />} />
              </Route>

              {/* Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </React.Suspense>
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
};

export default App;