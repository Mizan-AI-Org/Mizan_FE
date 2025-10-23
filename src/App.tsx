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
import InventoryItemsPage from "./pages/inventory/InventoryItemsPage";
import SuppliersPage from "./pages/inventory/SuppliersPage";
import PurchaseOrdersPage from "./pages/inventory/PurchaseOrdersPage";
import StockAdjustmentsPage from "./pages/inventory/StockAdjustmentsPage";
import TablesPage from "./pages/pos/TablesPage";
import OrdersPage from "./pages/pos/OrdersPage";
import ReportingPage from "./pages/reporting/ReportingPage";
import DailySalesReportsPage from "./pages/reporting/DailySalesReportsPage";
import AttendanceReportsPage from "./pages/reporting/AttendanceReportsPage";
import InventoryReportsPage from "./pages/reporting/InventoryReportsPage";
import TimeClockPage from "./pages/TimeClockPage";

// Lazy-loaded components
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const AdminDashboard = React.lazy(() => import("./pages/AdminDashboard"));
const KitchenDisplay = React.lazy(() => import("./pages/KitchenDisplay"));
const InventoryManagement = React.lazy(() => import("./pages/InventoryManagement"));
const MenuManagement = React.lazy(() => import("./pages/MenuManagement"));
const FloorManagement = React.lazy(() => import("./pages/FloorManagement"));
const Inventory = React.lazy(() => import("./pages/Inventory"));
const Staff = React.lazy(() => import("./pages/Staff"));
const Analytics = React.lazy(() => import("./pages/Analytics"));
const AIAssistant = React.lazy(() => import("./pages/AIAssistant"));
const Auth = React.lazy(() => import("./pages/Auth"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const POS = React.lazy(() => import("./pages/POS"));
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
const CategoryManagement = React.lazy(() => import("./pages/CategoryManagement"));
const ProductManagement = React.lazy(() => import("./pages/ProductManagement"));
const CleaningTasks = React.lazy(() => import("./pages/CleaningTasks"));
const SupervisorDashboard = React.lazy(() => import("./pages/SupervisorDashboard"));
const StaffChat = React.lazy(() => import("./pages/StaffChat"));
const ReportsPage = React.lazy(() => import("./pages/ReportsPage"));
const AcceptInvitation = React.lazy(() => import("./pages/AcceptInvitation"));

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
              {/* Public Routes for Login/ Signup*/}
              <Route path="/auth" element={<Auth />} />
              <Route path="/staff-login" element={<PinLogin />} />
              <Route path="/accept-invitation" element={<AcceptInvitation />} />

              {/* Admin/Manager Routes for Dashboard */}
              <Route path="/" element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <Dashboard />
                  </RoleBasedRoute>
                } />
                <Route path="dashboard/analytics" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <AdminDashboard />
                  </RoleBasedRoute>
                } />
                <Route path="dashboard/kitchen" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'CHEF']}>
                    <KitchenDisplay />
                  </RoleBasedRoute>
                } />
                <Route path="dashboard/inventory" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <InventoryManagement />
                  </RoleBasedRoute>
                } />
                <Route path="dashboard/inventory/items" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <InventoryItemsPage />
                  </RoleBasedRoute>
                } />
                <Route path="dashboard/inventory/suppliers" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <SuppliersPage />
                  </RoleBasedRoute>
                } />
                <Route path="dashboard/inventory/purchase-orders" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <PurchaseOrdersPage />
                  </RoleBasedRoute>
                } />
                <Route path="dashboard/inventory/adjustments" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <StockAdjustmentsPage />
                  </RoleBasedRoute>
                } />
                <Route path="dashboard/pos/tables" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <TablesPage />
                  </RoleBasedRoute>
                } />
                <Route path="dashboard/pos/orders" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'WAITER', 'CASHIER']}>
                    <OrdersPage />
                  </RoleBasedRoute>
                } />
                <Route path="dashboard/menu" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <MenuManagement />
                  </RoleBasedRoute>
                } />
                <Route path="dashboard/floors" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <FloorManagement />
                  </RoleBasedRoute>
                } />
                <Route path="menu" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <MenuManagement />
                  </RoleBasedRoute>
                } />
                <Route path="dashboard/categories" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <CategoryManagement />
                  </RoleBasedRoute>
                } />
                <Route path="dashboard/products" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <ProductManagement />
                  </RoleBasedRoute>
                } />
                <Route path="dashboard/floors" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <FloorManagement />
                  </RoleBasedRoute>
                } />
                <Route path="dashboard/inventory" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <Inventory />
                  </RoleBasedRoute>
                } />
                <Route path="dashboard/staff" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <Staff />
                  </RoleBasedRoute>
                } />
                {/* <Route path="analytics" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <Analytics />
                  </RoleBasedRoute>
                } /> */}
                <Route path="dashboard/assistant" element={<AIAssistant />} />
                <Route path="dashboard/settings" element={<ProfileSettings />} />
                <Route path="dashboard/reports" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}>
                    <ReportsPage />
                  </RoleBasedRoute>
                } />
                <Route path="dashboard/reports/sales/daily" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <DailySalesReportsPage />
                  </RoleBasedRoute>
                } />
                <Route path="dashboard/reports/attendance" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <AttendanceReportsPage />
                  </RoleBasedRoute>
                } />
                <Route path="dashboard/reports/inventory" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <InventoryReportsPage />
                  </RoleBasedRoute>
                } />
                <Route path="dashboard/swap-requests" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <ManagerSwapRequests />
                  </RoleBasedRoute>
                } />
                <Route path="dashboard/staff-management" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <StaffManagement />
                  </RoleBasedRoute>
                } />
                <Route path="schedule-management" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <ScheduleManagement />
                  </RoleBasedRoute>
                } />
                <Route path="dashboard/table-management" element={
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
                <Route path="timeclock" element={
                  <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'CHEF', 'WAITER', 'CLEANER', 'CASHIER']}>
                    <TimeClockPage />
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
                <Route path="time-tracking" element={<React.Fragment>Time Tracking (Component Missing)</React.Fragment>} />
                <Route path="schedule" element={<WeeklyScheduleView />} />
                <Route path="schedule/:id" element={<ShiftDetailView />} />
                <Route path="attendance" element={<AttendanceHistory />} />
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