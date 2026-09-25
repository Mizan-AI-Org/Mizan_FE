import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, keepPreviousData } from "@tanstack/react-query";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/layout/DashboardLayout";
import { LanguageProvider } from "./contexts/LanguageProvider";
import StaffGridLayout from "./components/layout/StaffGridLayout";
import RoleBasedRoute from "./components/RoleBasedRoute";
import OnboardingGate from "./components/OnboardingGate";
import { useIdleTimeout } from "./hooks/use-idle-timeout";
import React, { useEffect, useState } from "react";
import OfflineWarning from "./components/OfflineWarning";
import { ThemeSync } from "./components/ThemeSync";
import { OPERATIONAL_COMMAND_ROLES, PRIVILEGED_ROLES } from "./lib/operationalCommandRoles";
import { PageLoadingSkeleton } from "./components/skeletons";
// All route components are lazy-loaded below. Keep the top-level module graph
// tiny so the initial JS chunk can paint the shell + skeleton immediately.
const InventoryItemsPage = React.lazy(() => import("./pages/inventory/InventoryItemsPage"));
const WastePage = React.lazy(() => import("./pages/inventory/WastePage"));
const PurchasingPage = React.lazy(() => import("./pages/PurchasingPage"));
const ApprovalsPage = React.lazy(() => import("./pages/ApprovalsPage"));
const SuppliersPage = React.lazy(() => import("./pages/inventory/SuppliersPage"));
const SupplierPricesPage = React.lazy(() => import("./pages/inventory/SupplierPricesPage"));
const PurchaseOrdersPage = React.lazy(() => import("./pages/inventory/PurchaseOrdersPage"));
const StockAdjustmentsPage = React.lazy(() => import("./pages/inventory/StockAdjustmentsPage"));
const DailySalesReportsPage = React.lazy(() => import("./pages/reporting/DailySalesReportsPage"));
const FinancialMarginsPage = React.lazy(() => import("./pages/financials/FinancialMarginsPage"));
const FinancialPnLPage = React.lazy(() => import("./pages/financials/FinancialPnLPage"));
const SalesAndPrepPage = React.lazy(() => import("./pages/SalesAndPrepPage"));
const ReservationsPage = React.lazy(() => import("./pages/ReservationsPage"));
const AttendanceReportsPage = React.lazy(() => import("./pages/reporting/AttendanceReportsPage"));
const InventoryReportsPage = React.lazy(() => import("./pages/reporting/InventoryReportsPage"));
const LaborAttendanceReportPage = React.lazy(() => import("./pages/reporting/LaborAttendanceReportPage"));
const TimeClockPage = React.lazy(() => import("./pages/TimeClockPage"));
const ManagerAttendancePage = React.lazy(() => import("./pages/ManagerAttendancePage"));
const ShiftDetailView = React.lazy(() => import("./pages/ShiftDetailView"));

const DomainLayout = React.lazy(() =>
  import("./components/layout/DomainWorld").then((m) => ({ default: m.DomainLayout }))
);
const DomainOverviewPage = React.lazy(() =>
  import("./components/layout/DomainWorld").then((m) => ({ default: m.DomainOverviewPage }))
);
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const AttentionPage = React.lazy(() => import("./pages/os/AttentionPage"));
const AutomationHubPage = React.lazy(() => import("./pages/os/AutomationHubPage"));
const SocialMediaHubPage = React.lazy(() => import("./pages/social/SocialMediaHubPage"));
const SocialContentDetailPage = React.lazy(() => import("./pages/social/SocialContentDetailPage"));
const IntelligenceInsightsPage = React.lazy(() => import("./pages/intelligence/IntelligenceInsightsPage"));
const IntelligenceForecastsPage = React.lazy(() => import("./pages/intelligence/IntelligenceForecastsPage"));
const IntelligenceRecommendationsPage = React.lazy(() => import("./pages/intelligence/IntelligenceRecommendationsPage"));
const IntelligenceReportsPage = React.lazy(() => import("./pages/intelligence/IntelligenceReportsPage"));
const LocationsOverview = React.lazy(
  () => import("./pages/LocationsOverview")
);
const OperationsLivePage = React.lazy(
  () => import("./pages/OperationsLivePage")
);
const BranchDetailPage = React.lazy(
  () => import("./pages/BranchDetailPage")
);
const AdminDashboard = React.lazy(() => import("./pages/AdminAnalytics"));
const KitchenDisplay = React.lazy(() => import("./pages/KitchenDisplay"));
const InventoryManagement = React.lazy(
  () => import("./pages/InventoryManagement")
);
const MenuManagement = React.lazy(() => import("./pages/MenuManagement"));
const FloorManagement = React.lazy(() => import("./pages/FloorManagement"));
const Auth = React.lazy(() => import("./pages/Auth"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const Unauthorized = React.lazy(() => import("./pages/Unauthorized"));
const StaffWhatsAppOnly = React.lazy(() => import("./pages/StaffWhatsAppOnly"));
const PlatformAdminGate = React.lazy(
  () => import("./components/platform-admin/PlatformAdminGate")
);
const PlatformAdminLayout = React.lazy(
  () => import("./components/platform-admin/PlatformAdminLayout")
);
const PlatformOverviewPage = React.lazy(
  () => import("./pages/platform-admin/OverviewPage")
);
const PlatformTenantsPage = React.lazy(
  () => import("./pages/platform-admin/TenantsPage")
);
const PlatformTenantDetailPage = React.lazy(
  () => import("./pages/platform-admin/TenantDetailPage")
);
const PlatformUsersPage = React.lazy(
  () => import("./pages/platform-admin/UsersPage")
);
const PlatformUserDetailPage = React.lazy(
  () => import("./pages/platform-admin/UserDetailPage")
);
const PlatformOperatorsPage = React.lazy(
  () => import("./pages/platform-admin/OperatorsPage")
)
const PlatformOperatorDetailPage = React.lazy(
  () => import("./pages/platform-admin/OperatorDetailPage")
);
const PlatformBillingPage = React.lazy(
  () => import("./pages/platform-admin/BillingPage")
);
const PlatformHealthPage = React.lazy(
  () => import("./pages/platform-admin/HealthPage")
);
const PlatformWhatsAppPage = React.lazy(
  () => import("./pages/platform-admin/WhatsAppPage")
);
const PlatformAuditPage = React.lazy(
  () => import("./pages/platform-admin/AuditPage")
);
const PlatformAgentTurnsPage = React.lazy(
  () => import("./pages/platform-admin/AgentTurnsPage")
);
const PlatformAgentTurnDetailPage = React.lazy(
  () => import("./pages/platform-admin/AgentTurnDetailPage")
);
const PlatformConversationsPage = React.lazy(
  () => import("./pages/platform-admin/ConversationsPage")
);
const PlatformConversationDetailPage = React.lazy(
  () => import("./pages/platform-admin/ConversationDetailPage")
);
const PlatformAgentQualityPage = React.lazy(
  () => import("./pages/platform-admin/AgentQualityPage")
);
const StaffAppsPage = React.lazy(() => import("./pages/StaffAppsPage"));
const SafetyDashboard = React.lazy(() => import("./pages/SafetyDashboard"));
const PinLogin = React.lazy(() => import("./components/auth/PinLogin"));
const StaffApp = React.lazy(() => import("./pages/StaffApp"));
const ProcessesTasksApp = React.lazy(() => import("./pages/ProcessesTasksApp"));
const StaffSchedulingPage = React.lazy(
  () => import("./pages/StaffSchedulingPage")
);
const SchedulingAnalytics = React.lazy(
  () => import("./pages/SchedulingAnalytics")
);
const ProfileSettings = React.lazy(() => import("./pages/ProfileSettings"));
const AdminEmergencyAvailability = React.lazy(() => import("./pages/AdminEmergencyAvailability"));
const AdvancedSettings = React.lazy(() => import("./pages/Settings"));
const RolePermissionsPage = React.lazy(() => import("./pages/settings/RolePermissionsPage"));
const StaffManagement = React.lazy(() => import("./pages/StaffManagement"));
const StaffRequestsPage = React.lazy(() => import("./pages/StaffRequestsPage"));
const RedirectToStaffRequests = React.lazy(() => import("./pages/RedirectToStaffRequests"));
const WeeklyScheduleView = React.lazy(
  () => import("./pages/WeeklyScheduleView")
);
const TaskManagementBoard = React.lazy(
  () => import("./pages/TaskManagementBoard")
);
const OperationalIssuesPage = React.lazy(
  () => import("./pages/OperationalIssuesPage")
);
const TaskTemplates = React.lazy(() => import("./pages/TaskTemplates"));
const AutomationsPage = React.lazy(() => import("./pages/automations/AutomationsPage"));
const AutomationBuilderPage = React.lazy(() => import("./pages/automations/AutomationBuilderPage"));
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
const ProcessConversationalRunner = React.lazy(
  () => import("./pages/ProcessConversationalRunner"),
);
const ChecklistRunner = React.lazy(() => import("./pages/ChecklistRunner"));
const AdminChecklistTemplates = React.lazy(
  () => import("./pages/AdminChecklistTemplates")
);
const StaffChecklistBoard = React.lazy(() => import("@/pages/StaffChecklistBoard"));
const ManagerReviewDashboard = React.lazy(() => import("./pages/ManagerReviewDashboard"));
const StaffSubmittedChecklists = React.lazy(() => import("./pages/StaffSubmittedChecklists"));
const ResetPassword = React.lazy(() => import("./pages/ResetPassword"));

const DashboardAttendancePage = React.lazy(
  () => import("./pages/DashboardAttendancePage")
);
const TakeOrdersPage = React.lazy(() => import("./pages/TakeOrdersPage"));
const CleaningTasks = React.lazy(() => import("./pages/CleaningTasks"));
const ActivityLogPage = React.lazy(() => import("./pages/ActivityLogPage"));
const OnboardingWizard = React.lazy(() => import("./pages/OnboardingWizard"));
const GuestRequestsPage = React.lazy(() => import("./pages/GuestRequestsPage"));
const WorkflowBuilderPage = React.lazy(() => import("./pages/WorkflowBuilderPage"));

// Global defaults shared by every useQuery in the app.
// These defaults are tuned for perceived speed AND server cost on a SaaS
// dashboard:
// - staleTime 60s: cached data is treated as fresh when flipping pages/tabs
//   so switching between Schedule -> Inventory -> Schedule doesn't refetch.
// - gcTime 10min: keep the cached payload around long after a page unmounts so
//   coming back to it is instant.
// - placeholderData keepPreviousData: when a query's key changes (tab switch,
//   date change, filter change) keep the last result visible while the next
//   request is in flight - no "Loading…" flash.
// - refetchOnWindowFocus / refetchOnReconnect off: avoid the usual flurry of
//   background refetches that re-render the whole dashboard whenever the tab
//   regains focus (very expensive on mobile and on laptops switching Wi-Fi).
// - refetchIntervalInBackground: false: pause every poll when the tab is
//   hidden. Owners and managers leave the dashboard open in background tabs
//   for hours; without this, every 30/45/60s poll keeps firing, multiplying
//   our API + DB cost for zero perceived value. Individual queries that
//   need to keep polling in the background can still opt in explicitly.
// - retry with short backoff + capped at 1: first real failure surfaces fast
//   instead of stalling the UI for 30s on a dead endpoint.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchIntervalInBackground: false,
      retry: 1,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
      staleTime: 60 * 1000,
      gcTime: 10 * 60 * 1000,
      placeholderData: keepPreviousData,
      networkMode: "online",
    },
    mutations: {
      retry: 0,
      networkMode: "online",
    },
  },
});

const App = () => {
  useIdleTimeout();

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
      <ThemeSync />
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          {showOfflineWarning && (
            <OfflineWarning
              onReconnectAttempt={() => window.location.reload()}
            />
          )}
          <React.Suspense fallback={<PageLoadingSkeleton />}>
            <Routes>
              {/* Public Routes for Login/ Signup*/}
              <Route path="/auth" element={<Auth />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route path="/staff-whatsapp" element={<StaffWhatsAppOnly />} />
              <Route path="/staff-login" element={<PinLogin />} />
              <Route path="/accept-invitation" element={<AcceptInvitation />} />
              <Route path="/invite/:token" element={<AcceptInvitation />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute>
                    <OnboardingWizard />
                  </ProtectedRoute>
                }
              />

              {/* Platform ops - own login on /admin (not restaurant /auth) */}
              <Route path="/admin" element={<PlatformAdminGate />}>
                <Route element={<PlatformAdminLayout />}>
                  <Route index element={<PlatformOverviewPage />} />
                  <Route path="tenants" element={<PlatformTenantsPage />} />
                  <Route path="tenants/:id" element={<PlatformTenantDetailPage />} />
                  <Route path="users" element={<PlatformUsersPage />} />
                  <Route path="users/:id" element={<PlatformUserDetailPage />} />
                  <Route path="operators" element={<PlatformOperatorsPage />} />
                  <Route path="operators/:id" element={<PlatformOperatorDetailPage />} />
                  <Route path="billing" element={<PlatformBillingPage />} />
                  <Route path="whatsapp" element={<PlatformWhatsAppPage />} />
                  <Route path="health" element={<PlatformHealthPage />} />
                  <Route path="audit" element={<PlatformAuditPage />} />
                  <Route path="agent/turns" element={<PlatformAgentTurnsPage />} />
                  <Route path="agent/turns/:id" element={<PlatformAgentTurnDetailPage />} />
                  <Route path="agent/conversations" element={<PlatformConversationsPage />} />
                  <Route
                    path="agent/conversations/:conversationId"
                    element={<PlatformConversationDetailPage />}
                  />
                  <Route path="agent/quality" element={<PlatformAgentQualityPage />} />
                </Route>
              </Route>

              {/* Admin/Manager Routes for Dashboard */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <OnboardingGate>
                      <DashboardLayout />
                    </OnboardingGate>
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route
                  path="dashboard"
                  element={
                    <RoleBasedRoute allowedRoles={[...OPERATIONAL_COMMAND_ROLES]}>
                      <Dashboard />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/attention"
                  element={
                    <RoleBasedRoute allowedRoles={[...OPERATIONAL_COMMAND_ROLES]}>
                      <AttentionPage />
                    </RoleBasedRoute>
                  }
                />
                <Route path="dashboard/work" element={<Navigate to="/dashboard/operations" replace />} />
                <Route path="dashboard/people" element={<Navigate to="/dashboard/employees" replace />} />
                <Route path="dashboard/business" element={<Navigate to="/dashboard/financials" replace />} />
                <Route path="dashboard/operations" element={<DomainLayout domain="operations" />}>
                  <Route index element={<DomainOverviewPage />} />
                  <Route path="live" element={<OperationsLivePage />} />
                  <Route path="approvals" element={<ApprovalsPage />} />
                  <Route path="tasks" element={<Navigate to="/dashboard/operations/approvals" replace />} />
                  <Route path="incidents" element={<ManagerReviewDashboard />} />
                  <Route path="requests" element={<RedirectToStaffRequests />} />
                  <Route path="requests/:id" element={<RedirectToStaffRequests />} />
                </Route>
                <Route path="dashboard/employees" element={<DomainLayout domain="employees" />}>
                  <Route index element={<DomainOverviewPage />} />
                  <Route path="people" element={<StaffApp />} />
                  <Route path="shifts" element={<StaffSchedulingPage />} />
                  <Route path="tasks" element={<ProcessesTasksApp />} />
                  <Route path="attendance" element={<ManagerAttendancePage />} />
                  <Route path="performance" element={<SchedulingAnalytics />} />
                  <Route path="requests" element={<RedirectToStaffRequests />} />
                  <Route path="requests/:id" element={<RedirectToStaffRequests />} />
                </Route>
                <Route path="dashboard/products" element={<DomainLayout domain="products" />}>
                  <Route index element={<DomainOverviewPage />} />
                  <Route path="catalog" element={<ProductManagement />} />
                  <Route path="sales" element={<SalesAndPrepPage />} />
                  <Route path="recipes" element={<MenuManagement />} />
                  <Route path="inventory" element={<InventoryItemsPage />} />
                  <Route path="waste" element={<WastePage />} />
                </Route>
                <Route path="dashboard/customers" element={<DomainLayout domain="customers" />}>
                  <Route index element={<DomainOverviewPage />} />
                  <Route path="list" element={<DomainOverviewPage />} />
                  <Route path="reservations" element={<ReservationsPage />} />
                  <Route path="orders" element={<TakeOrdersPage />} />
                  <Route path="insights" element={<DomainOverviewPage />} />
                </Route>
                <Route path="dashboard/suppliers" element={<DomainLayout domain="suppliers" />}>
                  <Route index element={<DomainOverviewPage />} />
                  <Route path="directory" element={<SuppliersPage />} />
                  <Route path="prices" element={<SupplierPricesPage />} />
                  <Route path="purchasing" element={<PurchasingPage />} />
                  <Route path="deliveries" element={<PurchaseOrdersPage />} />
                </Route>
                <Route
                  path="dashboard/financials"
                  element={<DomainLayout domain="financials" roles={["SUPER_ADMIN", "ADMIN", "OWNER", "MANAGER"]} />}
                >
                  <Route index element={<DomainOverviewPage />} />
                  <Route path="revenue" element={<DailySalesReportsPage />} />
                  <Route path="costs" element={<InventoryReportsPage />} />
                  <Route path="margins" element={<FinancialMarginsPage />} />
                  <Route path="pnl" element={<FinancialPnLPage />} />
                </Route>
                <Route
                  path="dashboard/intelligence"
                  element={<DomainLayout domain="intelligence" roles={["SUPER_ADMIN", "ADMIN", "OWNER", "MANAGER"]} />}
                >
                  <Route index element={<Navigate to="/dashboard/intelligence/insights" replace />} />
                  <Route path="insights" element={<IntelligenceInsightsPage />} />
                  <Route path="forecasts" element={<IntelligenceForecastsPage />} />
                  <Route path="recommendations" element={<IntelligenceRecommendationsPage />} />
                  <Route path="reports" element={<IntelligenceReportsPage />} />
                </Route>
                <Route path="dashboard/automation" element={<Navigate to="/dashboard/social-media" replace />} />
                <Route
                  path="dashboard/social-media"
                  element={
                    <RoleBasedRoute allowedRoles={[...OPERATIONAL_COMMAND_ROLES]} appId="social_media">
                      <SocialMediaHubPage />
                    </RoleBasedRoute>
                  }
                />
                <Route path="dashboard/social-media/ideas" element={<Navigate to="/dashboard/social-media?tab=plan" replace />} />
                <Route path="dashboard/social-media/calendar" element={<Navigate to="/dashboard/social-media?tab=schedule" replace />} />
                <Route path="dashboard/social-media/accounts" element={<Navigate to="/dashboard/social-media?tab=home" replace />} />
                <Route path="dashboard/social-media/campaigns" element={<Navigate to="/dashboard/social-media?tab=insights" replace />} />
                <Route path="dashboard/social-media/analytics" element={<Navigate to="/dashboard/social-media?tab=insights" replace />} />
                <Route path="dashboard/social-media/autopilot" element={<Navigate to="/dashboard/social-media?tab=insights" replace />} />
                <Route path="dashboard/social-media/content" element={<Navigate to="/dashboard/social-media?tab=posts" replace />} />
                <Route
                  path="dashboard/social-media/content/:id"
                  element={
                    <RoleBasedRoute allowedRoles={[...OPERATIONAL_COMMAND_ROLES]} appId="social_media">
                      <SocialContentDetailPage />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/take-orders"
                  element={
                    <RoleBasedRoute
                      allowedRoles={[...OPERATIONAL_COMMAND_ROLES]}
                    >
                      <TakeOrdersPage />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/locations-overview"
                  element={
                    <RoleBasedRoute
                      allowedRoles={[
                        ...OPERATIONAL_COMMAND_ROLES,
                      ]}
                    >
                      <LocationsOverview />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/operations-live"
                  element={
                    <RoleBasedRoute
                      allowedRoles={[
                        ...OPERATIONAL_COMMAND_ROLES,
                      ]}
                    >
                      <OperationsLivePage />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/locations-overview/:locationId"
                  element={
                    <RoleBasedRoute
                      allowedRoles={[
                        ...OPERATIONAL_COMMAND_ROLES,
                      ]}
                    >
                      <BranchDetailPage />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/analytics"
                  element={
                    <RoleBasedRoute allowedRoles={[...PRIVILEGED_ROLES]}>
                      <AdminDashboard />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/kitchen"
                  element={
                    <RoleBasedRoute allowedRoles={[...OPERATIONAL_COMMAND_ROLES]}>
                      <KitchenDisplay />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/inventory"
                  element={
                    <RoleBasedRoute allowedRoles={[...PRIVILEGED_ROLES]}>
                      <InventoryManagement />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/inventory/items"
                  element={
                    <RoleBasedRoute allowedRoles={[...OPERATIONAL_COMMAND_ROLES]}>
                      <InventoryItemsPage />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/purchasing"
                  element={
                    <RoleBasedRoute allowedRoles={[...OPERATIONAL_COMMAND_ROLES]}>
                      <PurchasingPage />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/approvals"
                  element={
                    <RoleBasedRoute allowedRoles={[...OPERATIONAL_COMMAND_ROLES]}>
                      <ApprovalsPage />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/inventory/suppliers"
                  element={
                    <RoleBasedRoute allowedRoles={[...OPERATIONAL_COMMAND_ROLES]}>
                      <SuppliersPage />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/inventory/purchase-orders"
                  element={
                    <RoleBasedRoute allowedRoles={[...OPERATIONAL_COMMAND_ROLES]}>
                      <PurchaseOrdersPage />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/inventory/adjustments"
                  element={
                    <RoleBasedRoute allowedRoles={[...PRIVILEGED_ROLES]}>
                      <StockAdjustmentsPage />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/menu"
                  element={
                    <RoleBasedRoute allowedRoles={[...PRIVILEGED_ROLES]}>
                      <MenuManagement />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/floors"
                  element={
                    <RoleBasedRoute allowedRoles={[...PRIVILEGED_ROLES]}>
                      <FloorManagement />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="menu"
                  element={
                    <RoleBasedRoute allowedRoles={[...PRIVILEGED_ROLES]}>
                      <MenuManagement />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/categories"
                  element={
                    <RoleBasedRoute allowedRoles={[...PRIVILEGED_ROLES]}>
                      <CategoryManagement />
                    </RoleBasedRoute>
                  }
                />
                {/* Catalog now lives under the Products domain */}
                <Route path="dashboard/catalog" element={<Navigate to="/dashboard/products/catalog" replace />} />
                {/* Removed legacy staff route */}
                <Route
                  path="dashboard/staff-app"
                  element={
                    <RoleBasedRoute allowedRoles={[...OPERATIONAL_COMMAND_ROLES]}>
                      <StaffApp />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/processes-tasks-app"
                  element={<Navigate to="/dashboard/employees/tasks?tab=templates" replace />}
                />
                <Route
                  path="dashboard/announcements"
                  element={
                    <RoleBasedRoute
                      allowedRoles={[...OPERATIONAL_COMMAND_ROLES]}
                    >
                      <StaffAnnouncements />
                    </RoleBasedRoute>
                  }
                />
                {/* Legacy / mistaken deep-link → manager announcements */}
                <Route
                  path="dashboard/staff-chat"
                  element={<Navigate to="/dashboard/announcements" replace />}
                />
                {/* Removed legacy add-staff route */}
                <Route
                  path="dashboard/auto-schedule"
                  element={
                    <RoleBasedRoute
                      allowedRoles={[...OPERATIONAL_COMMAND_ROLES]}
                    >
                      <AutoSchedule />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/timesheets"
                  element={
                    <RoleBasedRoute
                      allowedRoles={[...OPERATIONAL_COMMAND_ROLES]}
                    >
                      <Timesheets />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/automations"
                  element={
                    <RoleBasedRoute allowedRoles={[...OPERATIONAL_COMMAND_ROLES]}>
                      <AutomationsPage />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/automations/:id"
                  element={
                    <RoleBasedRoute allowedRoles={[...OPERATIONAL_COMMAND_ROLES]}>
                      <AutomationBuilderPage />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/guest-requests"
                  element={
                    <RoleBasedRoute allowedRoles={[...OPERATIONAL_COMMAND_ROLES]}>
                      <GuestRequestsPage />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/workflows"
                  element={
                    <RoleBasedRoute allowedRoles={[...OPERATIONAL_COMMAND_ROLES]}>
                      <WorkflowBuilderPage />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/settings"
                  element={<AdvancedSettings />}
                />
                <Route
                  path="dashboard/settings/permissions"
                  element={
                    <RoleBasedRoute allowedRoles={["SUPER_ADMIN", "ADMIN", "OWNER"]}>
                      <React.Suspense fallback={<PageLoadingSkeleton />}>
                        <RolePermissionsPage />
                      </React.Suspense>
                    </RoleBasedRoute>
                  }
                />
                <Route path="dashboard/profile" element={<ProfileSettings />} />
                {/* Removed /dashboard/advanced-settings route per UI cleanup */}
                <Route
                  path="dashboard/tasks"
                  element={
                    <React.Suspense fallback={<PageLoadingSkeleton />}>
                      <TaskManagementBoard />
                    </React.Suspense>
                  }
                />
                <Route
                  path="dashboard/operational-issues"
                  element={
                    <RoleBasedRoute
                      allowedRoles={[...OPERATIONAL_COMMAND_ROLES]}
                    >
                      <React.Suspense fallback={<PageLoadingSkeleton />}>
                        <OperationalIssuesPage />
                      </React.Suspense>
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/task-templates"
                  element={
                    <RoleBasedRoute allowedRoles={[...PRIVILEGED_ROLES]}>
                      <React.Suspense fallback={<PageLoadingSkeleton />}>
                        <TaskTemplates />
                      </React.Suspense>
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/checklists/templates"
                  element={
                    <RoleBasedRoute allowedRoles={[...PRIVILEGED_ROLES]}>
                      <AdminChecklistTemplates />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/scheduling"
                  element={
                    <RoleBasedRoute
                      allowedRoles={[...OPERATIONAL_COMMAND_ROLES]}
                    >
                      <React.Suspense fallback={<PageLoadingSkeleton />}>
                        <StaffSchedulingPage />
                      </React.Suspense>
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/scheduling/analytics"
                  element={
                    <RoleBasedRoute
                      allowedRoles={[...OPERATIONAL_COMMAND_ROLES]}
                    >
                      <React.Suspense fallback={<PageLoadingSkeleton />}>
                        <SchedulingAnalytics />
                      </React.Suspense>
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/reviews/checklists"
                  element={
                    <RoleBasedRoute allowedRoles={[...OPERATIONAL_COMMAND_ROLES]}>
                      <ManagerReviewDashboard />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/emergency-availability"
                  element={
                    <RoleBasedRoute allowedRoles={[...OPERATIONAL_COMMAND_ROLES]}>
                      <AdminEmergencyAvailability />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/reports"
                  element={
                    <RoleBasedRoute
                      allowedRoles={[...OPERATIONAL_COMMAND_ROLES]}
                    >
                      <ReportsPage />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/reports/sales/daily"
                  element={
                    <RoleBasedRoute allowedRoles={[...PRIVILEGED_ROLES]}>
                      <DailySalesReportsPage />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/sales-and-prep"
                  element={
                    <RoleBasedRoute allowedRoles={[...OPERATIONAL_COMMAND_ROLES]}>
                      <SalesAndPrepPage />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/reservations"
                  element={
                    <RoleBasedRoute allowedRoles={[...OPERATIONAL_COMMAND_ROLES]}>
                      <ReservationsPage />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/attendance"
                  element={
                    <RoleBasedRoute
                      allowedRoles={[...OPERATIONAL_COMMAND_ROLES]}
                    >
                      <React.Suspense fallback={<PageLoadingSkeleton />}>
                        <DashboardAttendancePage />
                      </React.Suspense>
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/reports/attendance"
                  element={
                    <RoleBasedRoute allowedRoles={[...OPERATIONAL_COMMAND_ROLES]}>
                      <AttendanceReportsPage />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/reports/inventory"
                  element={
                    <RoleBasedRoute allowedRoles={[...PRIVILEGED_ROLES]}>
                      <InventoryReportsPage />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/reports/labor-attendance"
                  element={
                    <RoleBasedRoute allowedRoles={[...OPERATIONAL_COMMAND_ROLES]}>
                      <LaborAttendanceReportPage />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/swap-requests"
                  element={
                    <RoleBasedRoute allowedRoles={[...PRIVILEGED_ROLES]}>
                      <ManagerSwapRequests />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/staff-management"
                  element={
                    <RoleBasedRoute allowedRoles={[...PRIVILEGED_ROLES]}>
                      <StaffManagement />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/staff-requests"
                  element={
                    <RoleBasedRoute allowedRoles={[...OPERATIONAL_COMMAND_ROLES]}>
                      <StaffRequestsPage />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/staff-requests/:id"
                  element={
                    <RoleBasedRoute allowedRoles={[...OPERATIONAL_COMMAND_ROLES]}>
                      <StaffRequestsPage />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/table-management"
                  element={
                    <RoleBasedRoute allowedRoles={[...PRIVILEGED_ROLES]}>
                      <TableManagement />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/cleaning"
                  element={
                    <RoleBasedRoute allowedRoles={[...OPERATIONAL_COMMAND_ROLES]}>
                      <CleaningTasks />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="dashboard/activity-log"
                  element={
                    <RoleBasedRoute
                      allowedRoles={[...OPERATIONAL_COMMAND_ROLES]}
                    >
                      <ActivityLogPage />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="staff-management/:user_id/attendance"
                  element={
                    <RoleBasedRoute allowedRoles={[...PRIVILEGED_ROLES]}>
                      <AttendanceHistory />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="supervisor"
                  element={
                    <RoleBasedRoute
                      allowedRoles={[...OPERATIONAL_COMMAND_ROLES]}
                    >
                      <SupervisorDashboard />
                    </RoleBasedRoute>
                  }
                />
                <Route
                  path="timeclock"
                  element={
                    <RoleBasedRoute allowedRoles={[...OPERATIONAL_COMMAND_ROLES]}>
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
                <Route path="process-run" element={<ProcessConversationalRunner />} />
                <Route path="process-run/:runId" element={<ProcessConversationalRunner />} />
                <Route path="my-tasks" element={<StaffMyTasks />} />
                <Route path="staff-checklists" element={<StaffChecklistBoard />} />
                <Route path="submissions" element={<StaffSubmittedChecklists />} />
                <Route
                  path="cleaning"
                  element={
                    <RoleBasedRoute allowedRoles={[...OPERATIONAL_COMMAND_ROLES]}>
                      <CleaningTasks />
                    </RoleBasedRoute>
                  }
                />
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
                    <RoleBasedRoute allowedRoles={[...OPERATIONAL_COMMAND_ROLES]}>
                      <KitchenDisplay />
                    </RoleBasedRoute>
                  }
                />
                <Route path="chat" element={<StaffChat />} />
                <Route path="take-orders" element={<TakeOrdersPage />} />
                <Route
                  path="announcements"
                  element={<StaffChat />}
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
