import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/layout/DashboardLayout";
import { LanguageProvider } from "./contexts/LanguageProvider";
import StaffGridLayout from "./components/layout/StaffGridLayout";
import RoleBasedRoute from "./components/RoleBasedRoute";
import { useIdleTimeout } from "./hooks/use-idle-timeout";
import React, { useEffect, useState } from "react";
import { useAuth } from "./contexts/AuthContext";
import OfflineWarning from "./components/OfflineWarning"; // Import OfflineWarning
import InventoryItemsPage from "./pages/inventory/InventoryItemsPage";
import SuppliersPage from "./pages/inventory/SuppliersPage";
import PurchaseOrdersPage from "./pages/inventory/PurchaseOrdersPage";
import StockAdjustmentsPage from "./pages/inventory/StockAdjustmentsPage";
import DailySalesReportsPage from "./pages/reporting/DailySalesReportsPage";
import AttendanceReportsPage from "./pages/reporting/AttendanceReportsPage";
import InventoryReportsPage from "./pages/reporting/InventoryReportsPage";
import LaborAttendanceReportPage from "./pages/reporting/LaborAttendanceReportPage";
import TimeClockPage from "./pages/TimeClockPage";
import ShiftDetailView from "./pages/ShiftDetailView";
import StaffAnnouncementsList from "./pages/StaffAnnouncement";
// Removed legacy staff imports

// Lazy-loaded components
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const AdminDashboard = React.lazy(() => import("./pages/AdminAnalytics"));
const KitchenDisplay = React.lazy(() => import("./pages/KitchenDisplay"));
const InventoryManagement = React.lazy(
  () => import("./pages/InventoryManagement")
);
const MenuManagement = React.lazy(() => import("./pages/MenuManagement"));
const FloorManagement = React.lazy(() => import("./pages/FloorManagement"));
const Inventory = React.lazy(() => import("./pages/Inventory"));
const Auth = React.lazy(() => import("./pages/Auth"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const Unauthorized = React.lazy(() => import("./pages/Unauthorized"));
const StaffAppsPage = React.lazy(() => import("./pages/StaffAppsPage"));
const SafetyDashboard = React.lazy(() => import("./pages/SafetyDashboard"));
const PinLogin = React.lazy(() => import("./components/auth/PinLogin"));
const StaffApp = React.lazy(() => import("./pages/StaffApp"));
const ProcessesTasksApp = React.lazy(() => import("./pages/ProcessesTasksApp"));
const StaffSchedulesApp = React.lazy(() => import("./pages/StaffSchedulesApp"));
const StaffSchedulingPage = React.lazy(
  () => import("./pages/StaffSchedulingPage")
);
const SchedulingAnalytics = React.lazy(
  () => import("./pages/SchedulingAnalytics")
);
const ProfileSettings = React.lazy(() => import("./pages/ProfileSettings"));
const AdminEmergencyAvailability = React.lazy(() => import("./pages/AdminEmergencyAvailability"));
const AdvancedSettings = React.lazy(() => import("./pages/Settings"));
const StaffManagement = React.lazy(() => import("./pages/StaffManagement"));
const StaffRequestsPage = React.lazy(() => import("./pages/StaffRequestsPage"));
const ScheduleManagement = React.lazy(
  () => import("./pages/ScheduleManagement")
);
const WeeklyScheduleView = React.lazy(
  () => import("./pages/WeeklyScheduleView")
);
const TaskManagementBoard = React.lazy(
  () => import("./pages/TaskManagementBoard")
);
const TaskTemplates = React.lazy(() => import("./pages/TaskTemplates"));
const ManagerSwapRequests = React.lazy(
  () => import("./pages/ManagerSwapRequests")
);
const AttendanceHistory = React.lazy(() => import("./pages/AttendanceHistory"));
const TableManagement = React.lazy(() => import("./pages/TableManagement"));
const CategoryManagement = React.lazy(
  () => import("./pages/CategoryManagement")
);
const ProductManagement = React.lazy(() => import("./pages/ProductManagement"));
const SupervisorDashboard = React.lazy(
  () => import("./pages/SupervisorDashboard")
);
const StaffChat = React.lazy(() => import("./pages/StaffAnnouncement"));
const StaffAnnouncements = React.lazy(
  () => import("./pages/StaffAnnouncements")
);
const ReportsPage = React.lazy(() => import("./pages/ReportsPage"));
const AcceptInvitation = React.lazy(() => import("./pages/AcceptInvitation"));
const AutoSchedule = React.lazy(() => import("./pages/AutoSchedule"));
const Timesheets = React.lazy(() => import("./pages/Timesheets"));
const TaskChecklistRunner = React.lazy(
  () => import("./pages/TaskChecklistRunner")
);
const StaffMyTasks = React.lazy(() => import("./pages/StaffMyTasks"));
const MyChecklistsPage = React.lazy(() => import("./pages/MyChecklistsPage"));
const ChecklistRunner = React.lazy(() => import("./pages/ChecklistRunner"));
const AdminChecklistTemplates = React.lazy(
  () => import("./pages/AdminChecklistTemplates")
);
const StaffChecklistBoard = React.lazy(() => import("@/pages/StaffChecklistBoard"));
const ManagerReviewDashboard = React.lazy(() => import("./pages/ManagerReviewDashboard"));
const StaffSubmittedChecklists = React.lazy(() => import("./pages/StaffSubmittedChecklists"));
const ResetPassword = React.lazy(() => import("./pages/ResetPassword"));

const ShiftReviewsAdminPage = React.lazy(
  () => import("./pages/ShiftReviewsAdminPage")
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
      staleTime: 60 * 1000,
    },
  },
});

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

  const [showOfflineWarning, setShowOfflineWarning] = useState(
    !navigator.onLine
  );

  useEffect(() => {
    const handleOnlineStatusChange = () => {
      setShowOfflineWarning(!navigator.onLine);
    };

    window.addEventListener("online", handleOnlineStatusChange);
    window.addEventListener("offline", handleOnlineStatusChange);

    return () => {
      window.removeEventListener("online", handleOnlineStatusChange);
      window.removeEventListener("offline", handleOnlineStatusChange);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          {showOfflineWarning && (
            <OfflineWarning
              onReconnectAttempt={() => window.location.reload()}
            />
          )}
          <React.Suspense fallback={<div>Loading...</div>}>
            <Routes>
              {/* Public Routes for Login/ Signup*/}
              <Route path="/auth" element={<Auth />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route path="/staff-login" element={<PinLogin />} />
              <Route path="/accept-invitation" element={<AcceptInvitation />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Admin/Manager Routes for Dashboard */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route
                  path="dashboard"
                  element={
                    <RoleBasedRoute allowedRoles={["SUPER_ADMIN", "ADMIN", "MANAGER", "OWNER"]}>
                      <Dashboard />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/analytics"
                  element={
                    <RoleBasedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
                      <AdminDashboard />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/kitchen"
                  element={
                    <RoleBasedRoute
                      allowedRoles={["SUPER_ADMIN", "ADMIN", "CHEF"]}
                    >
                      <KitchenDisplay />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/inventory"
                  element={
                    <RoleBasedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
                      <InventoryManagement />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/inventory/items"
                  element={
                    <RoleBasedRoute allowedRoles={["SUPER_ADMIN", "ADMIN", "MANAGER"]}>
                      <InventoryItemsPage />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/inventory/suppliers"
                  element={
                    <RoleBasedRoute allowedRoles={["SUPER_ADMIN", "ADMIN", "MANAGER"]}>
                      <SuppliersPage />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/inventory/purchase-orders"
                  element={
                    <RoleBasedRoute allowedRoles={["SUPER_ADMIN", "ADMIN", "MANAGER"]}>
                      <PurchaseOrdersPage />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/shift-reviews"
                  element={
                    <RoleBasedRoute
                      allowedRoles={["SUPER_ADMIN", "ADMIN", "MANAGER"]}
                    >
                      <StaffSchedulesApp />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/inventory/adjustments"
                  element={
                    <RoleBasedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
                      <StockAdjustmentsPage />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/menu"
                  element={
                    <RoleBasedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
                      <MenuManagement />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/floors"
                  element={
                    <RoleBasedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
                      <FloorManagement />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="menu"
                  element={
                    <RoleBasedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
                      <MenuManagement />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/categories"
                  element={
                    <RoleBasedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
                      <CategoryManagement />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/products"
                  element={
                    <RoleBasedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
                      <ProductManagement />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/floors"
                  element={
                    <RoleBasedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
                      <FloorManagement />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/inventory"
                  element={
                    <RoleBasedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
                      <Inventory />
                    </RoleBasedRoute>
                  }
                />
                {/* Removed legacy staff route */}
                <Route
                  path="dashboard/staff-app"
                  element={
                    <RoleBasedRoute allowedRoles={["SUPER_ADMIN", "ADMIN", "MANAGER"]}>
                      <StaffApp />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/processes-tasks-app"
                  element={
                    <RoleBasedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
                      <ProcessesTasksApp />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/announcements"
                  element={
                    <RoleBasedRoute
                      allowedRoles={["SUPER_ADMIN", "ADMIN", "MANAGER"]}
                    >
                      <StaffAnnouncements />
                    </RoleBasedRoute>
                  }
                />
                {/* Removed legacy add-staff route */}
                <Route
                  path="dashboard/auto-schedule"
                  element={
                    <RoleBasedRoute
                      allowedRoles={["SUPER_ADMIN", "ADMIN", "MANAGER"]}
                    >
                      <AutoSchedule />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/timesheets"
                  element={
                    <RoleBasedRoute
                      allowedRoles={["SUPER_ADMIN", "ADMIN", "MANAGER"]}
                    >
                      <Timesheets />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/settings"
                  element={<AdvancedSettings />}
                />
                <Route path="dashboard/profile" element={<ProfileSettings />} />
                {/* Removed /dashboard/advanced-settings route per UI cleanup */}
                <Route
                  path="dashboard/tasks"
                  element={
                    <React.Suspense fallback={<div>Loading...</div>}>
                      <TaskManagementBoard />
                    </React.Suspense>
                  }
                />
                <Route
                  path="dashboard/task-templates"
                  element={
                    <RoleBasedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
                      <React.Suspense fallback={<div>Loading...</div>}>
                        <TaskTemplates />
                      </React.Suspense>
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/checklists/templates"
                  element={
                    <RoleBasedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
                      <AdminChecklistTemplates />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/scheduling"
                  element={
                    <RoleBasedRoute
                      allowedRoles={["SUPER_ADMIN", "ADMIN", "MANAGER"]}
                    >
                      <React.Suspense fallback={<div>Loading...</div>}>
                        <StaffSchedulingPage />
                      </React.Suspense>
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/scheduling/analytics"
                  element={
                    <RoleBasedRoute
                      allowedRoles={["SUPER_ADMIN", "ADMIN", "MANAGER"]}
                    >
                      <React.Suspense fallback={<div>Loading...</div>}>
                        <SchedulingAnalytics />
                      </React.Suspense>
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/reviews/checklists"
                  element={
                    <RoleBasedRoute allowedRoles={["SUPER_ADMIN", "ADMIN", "MANAGER"]}>
                      <ManagerReviewDashboard />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/emergency-availability"
                  element={
                    <RoleBasedRoute allowedRoles={["SUPER_ADMIN", "ADMIN", "MANAGER"]}>
                      <AdminEmergencyAvailability />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/reports"
                  element={
                    <RoleBasedRoute
                      allowedRoles={["SUPER_ADMIN", "ADMIN", "MANAGER"]}
                    >
                      <ReportsPage />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/reports/sales/daily"
                  element={
                    <RoleBasedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
                      <DailySalesReportsPage />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/reports/attendance"
                  element={
                    <RoleBasedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
                      <AttendanceReportsPage />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/reports/inventory"
                  element={
                    <RoleBasedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
                      <InventoryReportsPage />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/reports/labor-attendance"
                  element={
                    <RoleBasedRoute allowedRoles={["SUPER_ADMIN", "ADMIN", "MANAGER"]}>
                      <LaborAttendanceReportPage />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/swap-requests"
                  element={
                    <RoleBasedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
                      <ManagerSwapRequests />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/staff-management"
                  element={
                    <RoleBasedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
                      <StaffManagement />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/staff-requests"
                  element={
                    <RoleBasedRoute allowedRoles={["SUPER_ADMIN", "ADMIN", "MANAGER", "OWNER"]}>
                      <StaffRequestsPage />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/staff-requests/:id"
                  element={
                    <RoleBasedRoute allowedRoles={["SUPER_ADMIN", "ADMIN", "MANAGER", "OWNER"]}>
                      <StaffRequestsPage />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="schedule-management"
                  element={
                    <RoleBasedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
                      <ScheduleManagement />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/table-management"
                  element={
                    <RoleBasedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
                      <TableManagement />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="staff-management/:user_id/attendance"
                  element={
                    <RoleBasedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
                      <AttendanceHistory />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="supervisor"
                  element={
                    <RoleBasedRoute
                      allowedRoles={["SUPER_ADMIN", "ADMIN", "MANAGER"]}
                    >
                      <SupervisorDashboard />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="timeclock"
                  element={
                    <RoleBasedRoute
                      allowedRoles={[
                        "SUPER_ADMIN",
                        "ADMIN",
                        "CHEF",
                        "WAITER",
                        "CLEANER",
                        "CASHIER",
                      ]}
                    >
                      <TimeClockPage />
                    </RoleBasedRoute>
                  }
                />
              </Route>

              {/* Staff Routes */}
              <Route
                path="/staff-dashboard"
                element={
                  <ProtectedRoute>
                    <StaffGridLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<StaffAppsPage />} />
                <Route path="time-tracking" element={<TimeClockPage />} />
                <Route path="schedule" element={<WeeklyScheduleView />} />
                <Route path="schedule/:id" element={<ShiftDetailView />} />
                <Route path="attendance" element={<AttendanceHistory />} />
                <Route path="safety" element={<SafetyDashboard />} />
                <Route path="my-checklists" element={<MyChecklistsPage />} />
                <Route path="my-tasks" element={<StaffMyTasks />} />
                <Route path="staff-checklists" element={<StaffChecklistBoard />} />
                <Route path="submissions" element={<StaffSubmittedChecklists />} />
                <Route
                  path="task-checklist/:taskId"
                  element={<TaskChecklistRunner />}
                />
                <Route
                  path="run-checklist/:executionId"
                  element={<ChecklistRunner />}
                />
                <Route
                  path="kitchen"
                  element={
                    <RoleBasedRoute
                      allowedRoles={["SUPER_ADMIN", "ADMIN", "CHEF"]}
                    >
                      <KitchenDisplay />
                    </RoleBasedRoute>
                  }
                />
                <Route path="chat" element={<StaffChat />} />
                <Route
                  path="announcements"
                  element={<StaffAnnouncementsList />}
                />
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
