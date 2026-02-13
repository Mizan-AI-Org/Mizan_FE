/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  User,
  Restaurant,
  LoginResponse,
  SignupData,
  InviteStaffData,
  StaffListItem,
  StaffDashboardSummary,
  StaffOperationResponse,
  StaffInvitation,
  DailyKPI,
  Alert,
  Task,
  InventoryItem,
  Supplier,
  PurchaseOrder,
  PurchaseOrderItem,
  StockAdjustment,
  Table,
  Order,
  OrderItem,
  DailySalesReport,
  AttendanceReport,
  InventoryReport,
  ClockEvent,
  StaffProfileItem,
  CreateAnnouncementResponse,
  ShiftReviewSubmission,
} from "./types"; // Updated import path

// In dev, use relative /api so Vite proxy (vite.config proxy /api -> localhost:8000) is used.
// In production, also use relative /api to leverage Netlify/Vercel rewrites to api.heymizan.ai.
// Only use explicit URL if VITE_BACKEND_URL is set (e.g., for local testing against production).
const explicitBackend = import.meta.env.VITE_BACKEND_URL;
export const BACKEND_URL = explicitBackend ?? "";

// If BACKEND_URL is empty, API_BASE becomes "/api" which works with proxy/rewrites
export const API_BASE = BACKEND_URL ? `${BACKEND_URL}/api` : "/api";

// Derive WS_BASE from API_BASE or VITE_BACKEND_URL
// If API_BASE starts with http, replace with ws. If https, replace with wss.
const getWsBase = () => {
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL.replace(/^http/, 'ws');
  }
  return "ws://localhost:8000";
};

export const WS_BASE = import.meta.env.VITE_REACT_APP_WS_URL || getWsBase();

export const TELEMETRY_ENABLED = String(import.meta.env.VITE_ENABLE_CHECKLIST_TELEMETRY || "false").toLowerCase() === "true";

// Safe URL builder:
// - In dev, API_BASE is usually "/api" (relative), so `new URL("/api/...")` throws.
// - Always provide an origin base; absolute URLs still work fine with a base.
export const toAbsoluteUrl = (pathOrUrl: string): URL => {
  const base =
    (typeof window !== "undefined" && window.location && window.location.origin)
      ? window.location.origin
      : "http://localhost";
  return new URL(pathOrUrl, base);
};

export class BackendService {
  [x: string]: any;
  // In a real frontend application, HttpService and ConfigService would not be used directly
  // Instead, you would use fetch or a library like Axios directly.
  // These are kept for now to avoid breaking existing structure but should be refactored for a pure frontend.
  constructor(
    private readonly httpService: any | null = null,
    private readonly configService: any | null = null
  ) {
    // For frontend, we will directly use the API_BASE constant
  }

  private async fetchWithError(path: string, options?: { method?: string; body?: string }): Promise<any> {
    const method = options?.method || "GET";
    const init: RequestInit = { method, headers: this.getHeaders() };
    if (method !== "GET") init.body = options?.body ?? "{}";
    const response = await fetch(`${API_BASE}${path}`, init);
    if (!response.ok) {
      let message = "Request failed";
      try {
        const err = await response.json();
        message = err.error || err.message || err.detail || message;
      } catch {
        message = `Request failed (${response.status})`;
      }
      throw new Error(message);
    }
    return response.json();
  }

  private getHeaders(token?: string): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    // Resolve token from param or localStorage fallback
    let resolvedToken = token;
    if (!resolvedToken) {
      try {
        if (typeof window !== "undefined") {
          const lsToken = window.localStorage.getItem("access_token");
          if (lsToken) resolvedToken = lsToken;
        }
      } catch {
        // ignore localStorage access errors
      }
    }
    if (resolvedToken) {
      headers["Authorization"] = `Bearer ${resolvedToken}`;
    }

    // Propagate current UI language to backend for localized responses
    try {
      const lang =
        (typeof window !== "undefined" && window.localStorage.getItem("language")) ||
        (typeof document !== "undefined" && document.documentElement.lang) ||
        "en";
      headers["Accept-Language"] = lang as string;
    } catch {
      headers["Accept-Language"] = "en";
    }

    return headers;
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await fetch(`${API_BASE}/auth/login/`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Login failed");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Login failed");
    }
  }

  async ownerSignup(signupData: SignupData): Promise<LoginResponse> {

    try {
      const response = await fetch(`${API_BASE}/register/`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(signupData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Signup failed");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Signup failed");
    }
  }

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    try {
      const response = await fetch(`${API_BASE}/password-reset-request/`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({ email }),
      });

      // Read raw text first to handle non-JSON responses gracefully
      const raw = await response.text();
      let parsed: any;
      try {
        parsed = raw ? JSON.parse(raw) : null;
      } catch {
        parsed = null;
      }

      if (!response.ok) {
        const message = (parsed && (parsed.error || parsed.message || parsed.detail))
          || `Password reset request failed (${response.status})`;
        throw new Error(message);
      }

      if (parsed) {
        return parsed;
      }

      // Non-JSON success response; return generic success
      return { message: "Password reset link sent" };
    } catch (error: any) {
      throw new Error(error.message || "Password reset request failed");
    }
  }

  async confirmPasswordReset(token: string, newPassword: string): Promise<{ message: string }> {
    try {
      const response = await fetch(`${API_BASE}/password-reset-confirm/`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({ token, new_password: newPassword }),
      });

      // Read raw text first to handle non-JSON responses gracefully
      const raw = await response.text();
      let parsed: any;
      try {
        parsed = raw ? JSON.parse(raw) : null;
      } catch {
        parsed = null;
      }

      if (!response.ok) {
        const message = (parsed && (parsed.error || parsed.message || parsed.detail))
          || `Password reset failed (${response.status})`;
        throw new Error(message);
      }

      if (parsed) {
        return parsed;
      }

      // Non-JSON success response; return generic success
      return { message: "Password has been reset" };
    } catch (error: any) {
      throw new Error(error.message || "Password reset failed");
    }
  }

  async acceptInvitation(
    token: string,
    first_name: string,
    last_name: string,
    password?: string,
    pin_code?: string | null,
    invitation_pin?: string | null,
    email?: string
  ): Promise<LoginResponse> {
    try {
      // Decide endpoint based on provided credentials
      // Staff flow now requires only a login PIN, no invitation PIN
      const isStaffFlow = !!pin_code && !password;
      // Backend routes:
      // - Staff (PIN flow):       POST /api/staff/accept-invitation/
      // - Admin/owner (password): POST /api/invitations/accept/
      const endpoint = isStaffFlow
        ? `${API_BASE}/staff/accept-invitation/`
        : `${API_BASE}/invitations/accept/`;

      const body: Record<string, any> = {
        token,
        first_name,
        last_name,
      };

      if (isStaffFlow) {
        body.pin_code = pin_code;
        if (email) body.email = email;
      } else if (password) {
        body.password = password;
      } else {
        throw new Error("Missing credentials: provide PIN for staff or password for admin.");
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        let message = "Invitation acceptance failed";
        try {
          const errorData = await response.json();
          message = errorData.message || errorData.detail || errorData.error || message;
          // Use a stable message so callers can redirect to login when already accepted
          if (errorData.code === 'already_accepted') {
            message = 'already_accepted';
          }
        } catch (_) {
          // ignore parse errors
        }
        throw new Error(message);
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Invitation acceptance failed");
    }
  }

  async refreshToken(refreshToken: string): Promise<{ access: string }> {
    try {
      const response = await fetch(`${API_BASE}/auth/token/refresh/`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({ refresh: refreshToken }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Token refresh failed");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Token refresh failed");
    }
  }

  async getUserProfile(accessToken: string): Promise<User> {
    try {
      const response = await fetch(`${API_BASE}/auth/me/`, {
        method: "GET",
        headers: this.getHeaders(accessToken),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch user profile");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch user profile");
    }
  }

  async getDailyKpis(accessToken: string): Promise<DailyKPI[]> {
    try {
      const response = await fetch(`${API_BASE}/dashboard/kpis/`, {
        method: "GET",
        headers: this.getHeaders(accessToken),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch daily KPIs");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch daily KPIs");
    }
  }

  async getAlerts(accessToken: string): Promise<Alert[]> {
    try {
      const response = await fetch(`${API_BASE}/dashboard/alerts/`, {
        method: "GET",
        headers: this.getHeaders(accessToken),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch alerts");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch alerts");
    }
  }

  async getDashboardSummary() {
    return this.fetchWithError("/dashboard/summary/");
  }

  /** Mark an assigned shift as no-show (Critical issues & attendance dashboard). */
  async markShiftNoShow(shiftId: string): Promise<{ success: boolean; message?: string }> {
    return this.fetchWithError("/dashboard/attendance/mark-no-show/", {
      method: "POST",
      body: JSON.stringify({ shift_id: shiftId }),
    });
  }

  async getActionCenter(): Promise<{
    items: Array<Record<string, unknown>>;
    counts: Record<string, number>;
    total: number;
    timestamp: string;
  }> {
    return this.fetchWithError("/dashboard/action-center/");
  }

  async managerClockIn(staffId: string): Promise<Record<string, unknown>> {
    return this.fetchWithError(`/timeclock/staff/${staffId}/manager-clock-in/`, { method: "POST" });
  }

  async managerClockOut(staffId: string): Promise<Record<string, unknown>> {
    return this.fetchWithError(`/timeclock/staff/${staffId}/manager-clock-out/`, { method: "POST" });
  }

  async getTasks(accessToken: string): Promise<Task[]> {
    try {
      const response = await fetch(`${API_BASE}/dashboard/tasks/`, {
        method: "GET",
        headers: this.getHeaders(accessToken),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch tasks");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch tasks");
    }
  }

  async updateAlertStatus(
    accessToken: string,
    alertId: string,
    is_resolved: boolean
  ): Promise<Alert> {
    try {
      const response = await fetch(`${API_BASE}/dashboard/alerts/${alertId}/`, {
        method: "PATCH",
        headers: this.getHeaders(accessToken),
        body: JSON.stringify({ is_resolved }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update alert status");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to update alert status");
    }
  }

  async updateTaskStatus(
    accessToken: string,
    taskId: string,
    status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  ): Promise<Task> {
    try {
      const response = await fetch(`${API_BASE}/dashboard/tasks/${taskId}/`, {
        method: "PATCH",
        headers: this.getHeaders(accessToken),
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update task status");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to update task status");
    }
  }

  async updateTask(
    accessToken: string,
    taskId: string,
    updates: Partial<Pick<Task, "status" | "due_date" | "assigned_to" | "priority" | "title" | "description">>
  ): Promise<Task> {
    try {
      const response = await fetch(`${API_BASE}/dashboard/tasks/${taskId}/`, {
        method: "PATCH",
        headers: this.getHeaders(accessToken),
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update task");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to update task");
    }
  }

  async handleInviteStaff(
    accessToken: string,
    invitationData: InviteStaffData
  ): Promise<StaffOperationResponse> {
    try {
      const response = await fetch(`${API_BASE}/staff/invite/`, {
        method: "POST",
        headers: this.getHeaders(accessToken),
        body: JSON.stringify(invitationData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Staff invitation failed");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Staff invitation failed");
    }
  }

  // Shift Template Selections
  async saveShiftTemplateSelections(
    accessToken: string,
    staffId: string,
    templateIds: string[]
  ): Promise<{ message: string }> {
    try {
      const response = await fetch(`${API_BASE}/scheduling/shift-template-selections/`, {
        method: "POST",
        headers: this.getHeaders(accessToken),
        body: JSON.stringify({ staff_id: staffId, template_ids: templateIds }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save template selections");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to save template selections");
    }
  }

  async getShiftTemplateSelections(
    accessToken: string,
    staffId: string
  ): Promise<{ staff_id: string; template_ids: string[] }> {
    try {
      const response = await fetch(
        `${API_BASE}/scheduling/shift-template-selections/?staff_id=${staffId}`,
        {
          method: "GET",
          headers: this.getHeaders(accessToken),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to get template selections");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to get template selections");
    }
  }

  async clearShiftTemplateSelections(
    accessToken: string,
    staffId: string
  ): Promise<{ message: string }> {
    try {
      const response = await fetch(`${API_BASE}/scheduling/shift-template-selections/`, {
        method: "DELETE",
        headers: this.getHeaders(accessToken),
        body: JSON.stringify({ staff_id: staffId }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to clear template selections");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to clear template selections");
    }
  }

  // Alias for consistency with controllers expecting inviteStaff()
  async inviteStaff(
    accessToken: string,
    invitationData: InviteStaffData
  ): Promise<StaffOperationResponse> {
    return this.handleInviteStaff(accessToken, invitationData);
  }

  async getStaffList(accessToken: string): Promise<StaffListItem[]> {
    try {
      // Use the standard staff list endpoint
      const primary = await fetch(`${API_BASE}/staff/`, {
        method: "GET",
        headers: this.getHeaders(accessToken),
      });
      const rawPrimary = await primary.text();
      let parsedPrimary: any = null;
      try {
        parsedPrimary = rawPrimary ? JSON.parse(rawPrimary) : null;
      } catch {
        parsedPrimary = null;
      }
      if (!primary.ok) {
        const msg = (parsedPrimary && (parsedPrimary.message || parsedPrimary.detail)) || "Failed to fetch staff list";
        throw new Error(msg);
      }
      if (parsedPrimary) {
        const arr = Array.isArray(parsedPrimary?.results) ? parsedPrimary.results : (Array.isArray(parsedPrimary) ? parsedPrimary : []);
        return arr as StaffListItem[];
      }

      // Fallback to generic users list
      const fallback = await fetch(`${API_BASE}/users/?is_active=true`, {
        method: "GET",
        headers: this.getHeaders(accessToken),
      });
      const rawFallback = await fallback.text();
      let parsedFallback: any = null;
      try {
        parsedFallback = rawFallback ? JSON.parse(rawFallback) : null;
      } catch {
        parsedFallback = null;
      }
      if (!fallback.ok) {
        const msg = (parsedFallback && (parsedFallback.message || parsedFallback.detail)) || "Failed to fetch staff list";
        throw new Error(msg);
      }
      const list: any[] = Array.isArray(parsedFallback?.results) ? parsedFallback.results : (Array.isArray(parsedFallback) ? parsedFallback : []);
      return list.map((u: any) => ({
        id: String(u?.id ?? ""),
        email: String(u?.email ?? ""),
        first_name: String(u?.first_name ?? ""),
        last_name: String(u?.last_name ?? ""),
        role: String(u?.role ?? ""),
        phone: String(u?.phone ?? ""),
        join_date: String(u?.join_date ?? u?.created_at ?? ""),
        profile: u?.profile || null,
      }));
    } catch (error: any) {
      throw new Error(error?.message || "Failed to fetch staff list");
    }
  }

  async getStaffDashboard(accessToken: string): Promise<StaffDashboardSummary> {
    try {
      const response = await fetch(`${API_BASE}/staff/dashboard/`, {
        method: "GET",
        headers: this.getHeaders(accessToken),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch staff dashboard");
      }
      return await response.json();
    } catch (error: any) {
      console.error("Error fetching staff dashboard:", error);
      throw new Error(error.message || "Failed to fetch staff dashboard");
    }
  }

  async removeStaff(
    accessToken: string,
    staffId: string
  ): Promise<StaffOperationResponse> {
    try {
      const response = await fetch(`${API_BASE}/staff/${staffId}/`, {
        method: "DELETE",
        headers: this.getHeaders(accessToken),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error((errorData as { detail?: string }).detail || (errorData as { message?: string }).message || "Failed to remove staff member");
      }
      if (response.status === 204) return { success: true } as StaffOperationResponse;
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to remove staff member");
    }
  }

  async updateStaffRole(
    accessToken: string,
    staffId: string,
    role: string
  ): Promise<StaffOperationResponse> {
    try {
      const response = await fetch(`${API_BASE}/staff/${staffId}/role/`, {
        method: "PUT",
        headers: this.getHeaders(accessToken),
        body: JSON.stringify({ role }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update staff role");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to update staff role");
    }
  }

  async updateStaffProfile(
    accessToken: string,
    staffId: string,
    profileData: Partial<StaffProfileItem | any>
  ): Promise<StaffOperationResponse> {
    try {
      const response = await fetch(`${API_BASE}/staff/profile/${staffId}/update/`, {
        method: "PUT",
        headers: this.getHeaders(accessToken),
        body: JSON.stringify(profileData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        // Handle structured DRF errors (e.g. { "email": ["..."] })
        if (typeof errorData === 'object' && !errorData.message && !errorData.detail) {
          const errors = Object.entries(errorData)
            .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
            .join(' | ');
          throw new Error(errors || "Validation failed");
        }
        throw new Error(errorData.message || errorData.detail || "Failed to update staff profile");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to update staff profile");
    }
  }

  async resetStaffPassword(
    accessToken: string,
    staffId: string,
    password: string
  ): Promise<{ message: string }> {
    try {
      const response = await fetch(`${API_BASE}/staff/profile/${staffId}/reset-password/`, {
        method: "POST",
        headers: this.getHeaders(accessToken),
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.detail || "Failed to reset password");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to reset password");
    }
  }

  async getPendingStaffInvitations(
    accessToken: string
  ): Promise<StaffInvitation[]> {
    try {
      const response = await fetch(
        `${API_BASE}/invitations/?is_accepted=false&show_expired=false`,
        {
          method: "GET",
          headers: this.getHeaders(accessToken),
        }
      );
      if (response.ok) {
        return await response.json();
      }

      // Fallback to legacy endpoint and client-side filter
      const fallback = await fetch(`${API_BASE}/staff/invitations/`, {
        method: "GET",
        headers: this.getHeaders(accessToken),
      });
      if (!fallback.ok) {
        let msg = "Failed to fetch pending staff invitations";
        try {
          const err = await fallback.json();
          msg = err.message || err.detail || err.error || msg;
        } catch {
          // ignore parse error
        }
        throw new Error(msg);
      }
      const allInvites: StaffInvitation[] = await fallback.json();
      const now = Date.now();
      return (allInvites || []).filter((i: any) => {
        const accepted = Boolean(i?.is_accepted);
        const expiresAt = i?.expires_at ? Date.parse(i.expires_at) : 0;
        return !accepted && expiresAt > now;
      });
    } catch (error: any) {
      const message =
        error?.message || "Failed to fetch pending staff invitations";
      throw new Error(message);
    }
  }

  async getStaffDocuments(accessToken: string, staffId: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/staff/documents/?staff_id=${staffId}`, {
        method: "GET",
        headers: this.getHeaders(accessToken),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.detail || "Failed to fetch staff documents");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch staff documents");
    }
  }

  /**
   * Generate and download a branded PDF report for a staff member (profile, hours, employment details).
   * Returns a Blob for the PDF file.
   */
  async generateStaffReport(accessToken: string, staffId: string): Promise<Blob> {
    const response = await fetch(`${API_BASE}/staff/${staffId}/report/pdf/`, {
      method: "GET",
      headers: this.getHeaders(accessToken),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as { detail?: string }).detail || response.statusText || "Failed to generate report");
    }
    return response.blob();
  }

  async uploadStaffDocument(
    accessToken: string,
    staffId: string,
    file: File,
    title: string
  ): Promise<any> {
    try {
      const formData = new FormData();
      formData.append("staff", staffId);
      formData.append("title", title);
      formData.append("file", file);

      const response = await fetch(`${API_BASE}/staff/documents/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.detail || "Failed to upload document");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to upload document");
    }
  }

  async deleteStaffDocument(
    accessToken: string,
    docId: string
  ): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/staff/documents/${docId}/`, {
        method: "DELETE",
        headers: this.getHeaders(accessToken),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.detail || "Failed to delete document");
      }
    } catch (error: any) {
      throw new Error(error.message || "Failed to delete document");
    }
  }

  async getRestaurantDetails(accessToken: string): Promise<Restaurant> {
    try {
      const response = await fetch(`${API_BASE}/restaurant/`, {
        method: "GET",
        headers: this.getHeaders(accessToken),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to fetch restaurant details"
        );
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch restaurant details");
    }
  }

  async updateRestaurantDetails(
    accessToken: string,
    restaurantData: Partial<Restaurant>
  ): Promise<Restaurant> {
    try {
      const response = await fetch(`${API_BASE}/restaurant/`, {
        method: "PUT",
        headers: this.getHeaders(accessToken),
        body: JSON.stringify(restaurantData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to update restaurant details"
        );
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to update restaurant details");
    }
  }

  // Inventory Management

  async getInventoryItems(accessToken: string): Promise<InventoryItem[]> {
    try {
      const response = await fetch(`${API_BASE}/inventory/items/`, {
        method: "GET",
        headers: this.getHeaders(accessToken),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch inventory items");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch inventory items");
    }
  }

  async getInventoryItem(
    accessToken: string,
    itemId: string
  ): Promise<InventoryItem> {
    try {
      const response = await fetch(`${API_BASE}/inventory/items/${itemId}/`, {
        method: "GET",
        headers: this.getHeaders(accessToken),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch inventory item");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch inventory item");
    }
  }

  async createInventoryItem(
    accessToken: string,
    itemData: Omit<
      InventoryItem,
      | "id"
      | "restaurant"
      | "created_at"
      | "updated_at"
      | "supplier_info"
      | "inventory_item_info"
      | "adjusted_by_info"
    >
  ): Promise<InventoryItem> {
    try {
      const response = await fetch(`${API_BASE}/inventory/items/`, {
        method: "POST",
        headers: this.getHeaders(accessToken),
        body: JSON.stringify(itemData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create inventory item");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to create inventory item");
    }
  }

  async updateInventoryItem(
    accessToken: string,
    itemId: string,
    itemData: Partial<
      Omit<
        InventoryItem,
        | "id"
        | "restaurant"
        | "created_at"
        | "updated_at"
        | "supplier_info"
        | "inventory_item_info"
        | "adjusted_by_info"
      >
    >
  ): Promise<InventoryItem> {
    try {
      const response = await fetch(`${API_BASE}/inventory/items/${itemId}/`, {
        method: "PATCH",
        headers: this.getHeaders(accessToken),
        body: JSON.stringify(itemData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update inventory item");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to update inventory item");
    }
  }

  async deleteInventoryItem(
    accessToken: string,
    itemId: string
  ): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/inventory/items/${itemId}/`, {
        method: "DELETE",
        headers: this.getHeaders(accessToken),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete inventory item");
      }
    } catch (error: any) {
      throw new Error(error.message || "Failed to delete inventory item");
    }
  }

  async getSuppliers(accessToken: string): Promise<Supplier[]> {
    try {
      const response = await fetch(`${API_BASE}/inventory/suppliers/`, {
        method: "GET",
        headers: this.getHeaders(accessToken),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch suppliers");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch suppliers");
    }
  }

  async getSupplier(
    accessToken: string,
    supplierId: string
  ): Promise<Supplier> {
    try {
      const response = await fetch(
        `${API_BASE}/inventory/suppliers/${supplierId}/`,
        {
          method: "GET",
          headers: this.getHeaders(accessToken),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch supplier");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch supplier");
    }
  }

  async createSupplier(
    accessToken: string,
    supplierData: Omit<
      Supplier,
      "id" | "restaurant" | "created_at" | "updated_at"
    >
  ): Promise<Supplier> {
    try {
      const response = await fetch(`${API_BASE}/inventory/suppliers/`, {
        method: "POST",
        headers: this.getHeaders(accessToken),
        body: JSON.stringify(supplierData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create supplier");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to create supplier");
    }
  }

  async updateSupplier(
    accessToken: string,
    supplierId: string,
    supplierData: Partial<
      Omit<Supplier, "id" | "restaurant" | "created_at" | "updated_at">
    >
  ): Promise<Supplier> {
    try {
      const response = await fetch(
        `${API_BASE}/inventory/suppliers/${supplierId}/`,
        {
          method: "PATCH",
          headers: this.getHeaders(accessToken),
          body: JSON.stringify(supplierData),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update supplier");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to update supplier");
    }
  }

  async deleteSupplier(accessToken: string, supplierId: string): Promise<void> {
    try {
      const response = await fetch(
        `${API_BASE}/inventory/suppliers/${supplierId}/`,
        {
          method: "DELETE",
          headers: this.getHeaders(accessToken),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete supplier");
      }
    } catch (error: any) {
      throw new Error(error.message || "Failed to delete supplier");
    }
  }

  async getPurchaseOrders(accessToken: string): Promise<PurchaseOrder[]> {
    try {
      const response = await fetch(`${API_BASE}/inventory/purchase-orders/`, {
        method: "GET",
        headers: this.getHeaders(accessToken),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch purchase orders");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch purchase orders");
    }
  }

  async getPurchaseOrder(
    accessToken: string,
    orderId: string
  ): Promise<PurchaseOrder> {
    try {
      const response = await fetch(
        `${API_BASE}/inventory/purchase-orders/${orderId}/`,
        {
          method: "GET",
          headers: this.getHeaders(accessToken),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch purchase order");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch purchase order");
    }
  }

  async createPurchaseOrder(
    accessToken: string,
    orderData: Omit<
      PurchaseOrder,
      "id" | "restaurant" | "created_at" | "updated_at" | "supplier_info"
    >
  ): Promise<PurchaseOrder> {
    try {
      const response = await fetch(`${API_BASE}/inventory/purchase-orders/`, {
        method: "POST",
        headers: this.getHeaders(accessToken),
        body: JSON.stringify(orderData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create purchase order");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to create purchase order");
    }
  }

  async updatePurchaseOrder(
    accessToken: string,
    orderId: string,
    orderData: Partial<
      Omit<
        PurchaseOrder,
        "id" | "restaurant" | "created_at" | "updated_at" | "supplier_info"
      >
    >
  ): Promise<PurchaseOrder> {
    try {
      const response = await fetch(
        `${API_BASE}/inventory/purchase-orders/${orderId}/`,
        {
          method: "PATCH",
          headers: this.getHeaders(accessToken),
          body: JSON.stringify(orderData),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update purchase order");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to update purchase order");
    }
  }

  async deletePurchaseOrder(
    accessToken: string,
    orderId: string
  ): Promise<void> {
    try {
      const response = await fetch(
        `${API_BASE}/inventory/purchase-orders/${orderId}/`,
        {
          method: "DELETE",
          headers: this.getHeaders(accessToken),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete purchase order");
      }
    } catch (error: any) {
      throw new Error(error.message || "Failed to delete purchase order");
    }
  }

  async getPurchaseOrderItems(
    accessToken: string,
    purchaseOrderId: string
  ): Promise<PurchaseOrderItem[]> {
    try {
      const response = await fetch(
        `${API_BASE}/inventory/purchase-orders/${purchaseOrderId}/items/`,
        {
          method: "GET",
          headers: this.getHeaders(accessToken),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to fetch purchase order items"
        );
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch purchase order items");
    }
  }

  async getPurchaseOrderItem(
    accessToken: string,
    purchaseOrderId: string,
    itemId: string
  ): Promise<PurchaseOrderItem> {
    try {
      const response = await fetch(
        `${API_BASE}/inventory/purchase-orders/${purchaseOrderId}/items/${itemId}/`,
        {
          method: "GET",
          headers: this.getHeaders(accessToken),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to fetch purchase order item"
        );
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch purchase order item");
    }
  }

  async createPurchaseOrderItem(
    accessToken: string,
    purchaseOrderId: string,
    itemData: Omit<
      PurchaseOrderItem,
      | "id"
      | "purchase_order"
      | "created_at"
      | "updated_at"
      | "inventory_item_info"
    >
  ): Promise<PurchaseOrderItem> {
    try {
      const response = await fetch(
        `${API_BASE}/inventory/purchase-orders/${purchaseOrderId}/items/`,
        {
          method: "POST",
          headers: this.getHeaders(accessToken),
          body: JSON.stringify(itemData),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to create purchase order item"
        );
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to create purchase order item");
    }
  }

  async updatePurchaseOrderItem(
    accessToken: string,
    purchaseOrderId: string,
    itemId: string,
    itemData: Partial<
      Omit<
        PurchaseOrderItem,
        | "id"
        | "purchase_order"
        | "created_at"
        | "updated_at"
        | "inventory_item_info"
      >
    >
  ): Promise<PurchaseOrderItem> {
    try {
      const response = await fetch(
        `${API_BASE}/inventory/purchase-orders/${purchaseOrderId}/items/${itemId}/`,
        {
          method: "PATCH",
          headers: this.getHeaders(accessToken),
          body: JSON.stringify(itemData),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to update purchase order item"
        );
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to update purchase order item");
    }
  }

  async deletePurchaseOrderItem(
    accessToken: string,
    purchaseOrderId: string,
    itemId: string
  ): Promise<void> {
    try {
      const response = await fetch(
        `${API_BASE}/inventory/purchase-orders/${purchaseOrderId}/items/${itemId}/`,
        {
          method: "DELETE",
          headers: this.getHeaders(accessToken),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to delete purchase order item"
        );
      }
    } catch (error: any) {
      throw new Error(error.message || "Failed to delete purchase order item");
    }
  }

  async getStockAdjustments(accessToken: string): Promise<StockAdjustment[]> {
    try {
      const response = await fetch(`${API_BASE}/inventory/stock-adjustments/`, {
        method: "GET",
        headers: this.getHeaders(accessToken),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to fetch stock adjustments"
        );
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch stock adjustments");
    }
  }

  async getStockAdjustment(
    accessToken: string,
    adjustmentId: string
  ): Promise<StockAdjustment> {
    try {
      const response = await fetch(
        `${API_BASE}/inventory/stock-adjustments/${adjustmentId}/`,
        {
          method: "GET",
          headers: this.getHeaders(accessToken),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to fetch stock adjustment"
        );
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch stock adjustment");
    }
  }

  async createStockAdjustment(
    accessToken: string,
    adjustmentData: Omit<
      StockAdjustment,
      | "id"
      | "restaurant"
      | "created_at"
      | "updated_at"
      | "inventory_item_info"
      | "adjusted_by_info"
    >
  ): Promise<StockAdjustment> {
    try {
      const response = await fetch(`${API_BASE}/inventory/stock-adjustments/`, {
        method: "POST",
        headers: this.getHeaders(accessToken),
        body: JSON.stringify(adjustmentData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to create stock adjustment"
        );
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to create stock adjustment");
    }
  }

  async updateStockAdjustment(
    accessToken: string,
    adjustmentId: string,
    adjustmentData: Partial<
      Omit<
        StockAdjustment,
        | "id"
        | "restaurant"
        | "created_at"
        | "updated_at"
        | "inventory_item_info"
        | "adjusted_by_info"
      >
    >
  ): Promise<StockAdjustment> {
    try {
      const response = await fetch(
        `${API_BASE}/inventory/stock-adjustments/${adjustmentId}/`,
        {
          method: "PATCH",
          headers: this.getHeaders(accessToken),
          body: JSON.stringify(adjustmentData),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to update stock adjustment"
        );
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to update stock adjustment");
    }
  }

  async deleteStockAdjustment(
    accessToken: string,
    adjustmentId: string
  ): Promise<void> {
    try {
      const response = await fetch(
        `${API_BASE}/inventory/stock-adjustments/${adjustmentId}/`,
        {
          method: "DELETE",
          headers: this.getHeaders(accessToken),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to delete stock adjustment"
        );
      }
    } catch (error: any) {
      throw new Error(error.message || "Failed to delete stock adjustment");
    }
  }

  // POS (Orders & Tables) Management

  async getTables(accessToken: string): Promise<Table[]> {
    try {
      const response = await fetch(`${API_BASE}/pos/tables/`, {
        method: "GET",
        headers: this.getHeaders(accessToken),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch tables");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch tables");
    }
  }

  async getTable(accessToken: string, tableId: string): Promise<Table> {
    try {
      const response = await fetch(`${API_BASE}/pos/tables/${tableId}/`, {
        method: "GET",
        headers: this.getHeaders(accessToken),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch table");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch table");
    }
  }

  async createTable(
    accessToken: string,
    tableData: Omit<Table, "id" | "restaurant" | "created_at" | "updated_at">
  ): Promise<Table> {
    try {
      const response = await fetch(`${API_BASE}/pos/tables/`, {
        method: "POST",
        headers: this.getHeaders(accessToken),
        body: JSON.stringify(tableData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create table");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to create table");
    }
  }

  async updateTable(
    accessToken: string,
    tableId: string,
    tableData: Partial<
      Omit<Table, "id" | "restaurant" | "created_at" | "updated_at">
    >
  ): Promise<Table> {
    try {
      const response = await fetch(`${API_BASE}/pos/tables/${tableId}/`, {
        method: "PATCH",
        headers: this.getHeaders(accessToken),
        body: JSON.stringify(tableData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update table");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to update table");
    }
  }

  async deleteTable(accessToken: string, tableId: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/pos/tables/${tableId}/`, {
        method: "DELETE",
        headers: this.getHeaders(accessToken),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete table");
      }
    } catch (error: any) {
      throw new Error(error.message || "Failed to delete table");
    }
  }

  async getOrders(accessToken: string): Promise<Order[]> {
    try {
      const response = await fetch(`${API_BASE}/pos/orders/`, {
        method: "GET",
        headers: this.getHeaders(accessToken),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch orders");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch orders");
    }
  }

  async getOrder(accessToken: string, orderId: string): Promise<Order> {
    try {
      const response = await fetch(`${API_BASE}/pos/orders/${orderId}/`, {
        method: "GET",
        headers: this.getHeaders(accessToken),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch order");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch order");
    }
  }

  async createOrder(
    accessToken: string,
    orderData: Omit<
      Order,
      | "id"
      | "restaurant"
      | "order_time"
      | "total_amount"
      | "is_paid"
      | "created_at"
      | "updated_at"
      | "ordered_by_info"
      | "table_info"
      | "items"
    > & {
      items?: Omit<
        OrderItem,
        "id" | "order" | "created_at" | "updated_at" | "menu_item_info"
      >[];
    }
  ): Promise<Order> {
    try {
      const response = await fetch(`${API_BASE}/pos/orders/`, {
        method: "POST",
        headers: this.getHeaders(accessToken),
        body: JSON.stringify(orderData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create order");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to create order");
    }
  }

  async updateOrder(
    accessToken: string,
    orderId: string,
    orderData: Partial<
      Omit<
        Order,
        | "id"
        | "restaurant"
        | "order_time"
        | "total_amount"
        | "is_paid"
        | "created_at"
        | "updated_at"
        | "ordered_by_info"
        | "table_info"
        | "items"
      >
    >
  ): Promise<Order> {
    try {
      const response = await fetch(`${API_BASE}/pos/orders/${orderId}/`, {
        method: "PATCH",
        headers: this.getHeaders(accessToken),
        body: JSON.stringify(orderData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update order");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to update order");
    }
  }

  async updateOrderStatus(
    accessToken: string,
    orderId: string,
    status: Order["status"]
  ): Promise<Order> {
    try {
      const response = await fetch(
        `${API_BASE}/pos/orders/${orderId}/status/`,
        {
          method: "PUT",
          headers: this.getHeaders(accessToken),
          body: JSON.stringify({ status }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update order status");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to update order status");
    }
  }

  async deleteOrder(accessToken: string, orderId: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/pos/orders/${orderId}/`, {
        method: "DELETE",
        headers: this.getHeaders(accessToken),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete order");
      }
    } catch (error: any) {
      throw new Error(error.message || "Failed to delete order");
    }
  }

  async getOrderItems(
    accessToken: string,
    orderId: string
  ): Promise<OrderItem[]> {
    try {
      const response = await fetch(`${API_BASE}/pos/orders/${orderId}/items/`, {
        method: "GET",
        headers: this.getHeaders(accessToken),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch order items");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch order items");
    }
  }

  async getOrderItem(
    accessToken: string,
    orderId: string,
    itemId: string
  ): Promise<OrderItem> {
    try {
      const response = await fetch(
        `${API_BASE}/pos/orders/${orderId}/items/${itemId}/`,
        {
          method: "GET",
          headers: this.getHeaders(accessToken),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch order item");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch order item");
    }
  }

  async createOrderItem(
    accessToken: string,
    orderId: string,
    itemData: Omit<
      OrderItem,
      "id" | "order" | "created_at" | "updated_at" | "menu_item_info"
    >
  ): Promise<OrderItem> {
    try {
      const response = await fetch(`${API_BASE}/pos/orders/${orderId}/items/`, {
        method: "POST",
        headers: this.getHeaders(accessToken),
        body: JSON.stringify(itemData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create order item");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to create order item");
    }
  }

  async updateOrderItem(
    accessToken: string,
    orderId: string,
    itemId: string,
    itemData: Partial<
      Omit<
        OrderItem,
        "id" | "order" | "created_at" | "updated_at" | "menu_item_info"
      >
    >
  ): Promise<OrderItem> {
    try {
      const response = await fetch(
        `${API_BASE}/pos/orders/${orderId}/items/${itemId}/`,
        {
          method: "PATCH",
          headers: this.getHeaders(accessToken),
          body: JSON.stringify(itemData),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update order item");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to update order item");
    }
  }

  async deleteOrderItem(
    accessToken: string,
    orderId: string,
    itemId: string
  ): Promise<void> {
    try {
      const response = await fetch(
        `${API_BASE}/pos/orders/${orderId}/items/${itemId}/`,
        {
          method: "DELETE",
          headers: this.getHeaders(accessToken),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete order item");
      }
    } catch (error: any) {
      throw new Error(error.message || "Failed to delete order item");
    }
  }

  // Reporting Management

  async getDailySalesReports(accessToken: string): Promise<DailySalesReport[]> {
    try {
      const response = await fetch(`${API_BASE}/reporting/sales/daily/`, {
        method: "GET",
        headers: this.getHeaders(accessToken),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to fetch daily sales reports"
        );
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch daily sales reports");
    }
  }

  async getDailySalesReport(
    accessToken: string,
    reportId: string
  ): Promise<DailySalesReport> {
    try {
      const response = await fetch(
        `${API_BASE}/reporting/sales/daily/${reportId}/`,
        {
          method: "GET",
          headers: this.getHeaders(accessToken),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to fetch daily sales report"
        );
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch daily sales report");
    }
  }

  async getAttendanceReports(accessToken: string): Promise<AttendanceReport[]> {
    try {
      const response = await fetch(`${API_BASE}/reporting/attendance/`, {
        method: "GET",
        headers: this.getHeaders(accessToken),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to fetch attendance reports"
        );
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch attendance reports");
    }
  }

  async getAttendanceReport(
    accessToken: string,
    reportId: string
  ): Promise<AttendanceReport> {
    try {
      const response = await fetch(
        `${API_BASE}/reporting/attendance/${reportId}/`,
        {
          method: "GET",
          headers: this.getHeaders(accessToken),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to fetch attendance report"
        );
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch attendance report");
    }
  }

  async getInventoryReports(accessToken: string): Promise<InventoryReport[]> {
    try {
      const response = await fetch(`${API_BASE}/reporting/inventory/`, {
        method: "GET",
        headers: this.getHeaders(accessToken),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to fetch inventory reports"
        );
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch inventory reports");
    }
  }

  async getInventoryReport(
    accessToken: string,
    reportId: string
  ): Promise<InventoryReport> {
    try {
      const response = await fetch(
        `${API_BASE}/reporting/inventory/${reportId}/`,
        {
          method: "GET",
          headers: this.getHeaders(accessToken),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to fetch inventory report"
        );
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch inventory report");
    }
  }

  // Time Tracking

  async clockIn(
    accessToken: string,
    latitude: number,
    longitude: number
  ): Promise<{ message: string; event: ClockEvent }> {
    try {
      const response = await fetch(`${API_BASE}/timeclock/clock-in/`, {
        method: "POST",
        headers: this.getHeaders(accessToken),
        body: JSON.stringify({ latitude, longitude }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to clock in");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to clock in");
    }
  }

  async clockOut(
    accessToken: string,
    latitude: number,
    longitude: number
  ): Promise<{ message: string; event: ClockEvent }> {
    try {
      const response = await fetch(`${API_BASE}/timeclock/clock-out/`, {
        method: "POST",
        headers: this.getHeaders(accessToken),
        body: JSON.stringify({ latitude, longitude }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to clock out");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to clock out");
    }
  }

  // Web-specific endpoints with backend geofence enforcement and optional photo
  async webClockIn(
    accessToken: string,
    latitude: number,
    longitude: number,
    accuracy?: number,
    photo_url?: string,
    photo?: string
  ): Promise<{ message: string; event: ClockEvent }> {
    try {
      const response = await fetch(`${API_BASE}/timeclock/web-clock-in/`, {
        method: "POST",
        headers: this.getHeaders(accessToken),
        body: JSON.stringify({ latitude, longitude, accuracy, photo_url, photo }),
      });
      const ct = response.headers.get("content-type") || "";
      if (!response.ok) {
        let errorMessage = "Failed to clock in";
        if (ct.includes("application/json")) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
            console.error("webClockIn error", {
              status: response.status,
              statusText: response.statusText,
              errorData,
              payload: { latitude, longitude, accuracy, hasPhoto: Boolean(photo) },
            });
          } catch (parseErr) {
            console.error("webClockIn error (JSON parse failed)", {
              status: response.status,
              statusText: response.statusText,
              parseErr,
            });
          }
        } else {
          const text = await response.text().catch(() => "<non-json response>");
          console.error("webClockIn error (non-JSON)", {
            status: response.status,
            statusText: response.statusText,
            contentType: ct,
            snippet: text?.slice(0, 200),
            payload: { latitude, longitude, accuracy, hasPhoto: Boolean(photo) },
          });
          errorMessage =
            "Service responded unexpectedly. Please try again or contact support.";
        }
        throw new Error(errorMessage);
      }
      if (!ct.includes("application/json")) {
        const text = await response.text().catch(() => "");
        console.error("webClockIn success but non-JSON", {
          status: response.status,
          statusText: response.statusText,
          contentType: ct,
          snippet: text?.slice(0, 200),
        });
        throw new Error(
          "Unexpected response format from server (not JSON). Please retry."
        );
      }
      return await response.json();
    } catch (error: any) {
      console.error("webClockIn exception", { error });
      throw new Error(error.message || "Failed to clock in");
    }
  }

  async webClockOut(
    accessToken: string,
    latitude?: number,
    longitude?: number,
    accuracy?: number,
    opts?: { method?: "manual" | "automatic"; device_id?: string; override?: boolean }
  ): Promise<{ message: string; event: ClockEvent }> {
    try {
      const response = await fetch(`${API_BASE}/timeclock/web-clock-out/`, {
        method: "POST",
        headers: this.getHeaders(accessToken),
        // Backend expects only latitude, longitude, accuracy. Extra fields are ignored server-side.
        body: JSON.stringify({ latitude, longitude, accuracy }),
      });
      if (!response.ok) {
        let errorMessage = "Failed to clock out";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          // Log payload and server error for diagnostics
          console.error("webClockOut error", {
            status: response.status,
            statusText: response.statusText,
            errorData,
            payload: { latitude, longitude, accuracy, opts },
          });
        } catch (parseErr) {
          console.error("webClockOut error (unparsable)", {
            status: response.status,
            statusText: response.statusText,
          });
        }
        throw new Error(errorMessage);
      }
      return await response.json();
    } catch (error: any) {
      console.error("webClockOut exception", { error });
      throw new Error(error?.message || "Failed to clock out");
    }
  }

  async startBreak(
    accessToken: string
  ): Promise<{ message: string; event: ClockEvent }> {
    try {
      const response = await fetch(`${API_BASE}/timeclock/start-break/`, {
        method: "POST",
        headers: this.getHeaders(accessToken),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to start break");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to start break");
    }
  }

  async endBreak(
    accessToken: string
  ): Promise<{ message: string; event: ClockEvent }> {
    try {
      const response = await fetch(`${API_BASE}/timeclock/end-break/`, {
        method: "POST",
        headers: this.getHeaders(accessToken),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to end break");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to end break");
    }
  }

  async getCurrentClockSession(
    accessToken: string
  ): Promise<{ currentSession: ClockEvent | null; is_clocked_in: boolean }> {
    try {
      const response = await fetch(`${API_BASE}/timeclock/current-session/`, {
        method: "GET",
        headers: this.getHeaders(accessToken),
      });
      if (!response.ok) {
        if (response.status === 404) {
          // Normalize 404 (no active session) into a stable shape
          return { currentSession: null, is_clocked_in: false };
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch current session");
      }
      const data = await response.json();
      // Normalize various possible backend shapes
      if (data && typeof data === "object") {
        // Preferred shape: { currentSession: ClockEvent | null, is_clocked_in: boolean }
        if ("currentSession" in data || "is_clocked_in" in data) {
          return {
            currentSession: (data as any).currentSession ?? null,
            is_clocked_in: Boolean((data as any).is_clocked_in),
          };
        }
        // Fallback: backend returns the ClockEvent directly
        if ("clock_in_time" in data) {
          const ev = data as ClockEvent;
          return {
            currentSession: ev ?? null,
            is_clocked_in: ev ? !ev.clock_out_time : false,
          };
        }
      }
      // Final fallback: treat unknown payload as no active session
      return { currentSession: null, is_clocked_in: false };
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch current session");
    }
  }

  async verifyLocation(
    accessToken: string,
    latitude: number,
    longitude: number
  ): Promise<{ message: string; event: ClockEvent }> {
    try {
      const response = await fetch(`${API_BASE}/timeclock/verify-location/`, {
        method: "POST",
        headers: this.getHeaders(accessToken),
        body: JSON.stringify({ latitude, longitude }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to verify location");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to verify location");
    }
  }

  async getRestaurantLocation(accessToken: string): Promise<{ latitude: number; longitude: number; radius: number } | any> {
    try {
      const response = await fetch(`${API_BASE}/timeclock/restaurant-location/`, {
        method: "GET",
        headers: this.getHeaders(accessToken),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch restaurant location");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch restaurant location");
    }
  }

  async getAttendanceHistory(
    accessToken: string,
    params: { start_date: string; end_date: string; user_id?: string }
  ): Promise<ClockEvent[]> {
    try {
      const qs = new URLSearchParams();
      qs.set("start_date", params.start_date);
      qs.set("end_date", params.end_date);
      if (params.user_id) qs.set("user_id", params.user_id);

      const response = await fetch(
        `${API_BASE}/timeclock/attendance-history/?${qs.toString()}`,
        {
          method: "GET",
          headers: this.getHeaders(accessToken),
        }
      );
      if (!response.ok) {
        let message = "Failed to fetch attendance history";
        try {
          const errorData = await response.json();
          message = errorData.message || errorData.detail || message;
        } catch (_) {
          // ignore parse errors
        }
        throw new Error(message);
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch attendance history");
    }
  }

  // ===== TASK MANAGEMENT =====
  async getTaskCategories(accessToken: string): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE}/scheduling/task-categories/`, {
        method: "GET",
        headers: this.getHeaders(accessToken),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch task categories");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch task categories");
    }
  }

  async createTaskCategory(
    accessToken: string,
    categoryData: any
  ): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/scheduling/task-categories/`, {
        method: "POST",
        headers: this.getHeaders(accessToken),
        body: JSON.stringify(categoryData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create task category");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to create task category");
    }
  }

  async getShiftTasks(
    accessToken: string,
    filters?: { assigned_to?: string; status?: string; shift_id?: string }
  ): Promise<any[]> {
    try {
      let url = `${API_BASE}/scheduling/shift-tasks/`;
      const params = new URLSearchParams();

      if (filters?.assigned_to)
        params.append("assigned_to", filters.assigned_to);
      if (filters?.status) params.append("status", filters.status);
      if (filters?.shift_id) params.append("shift_id", filters.shift_id);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        method: "GET",
        headers: this.getHeaders(accessToken),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch shift tasks");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch shift tasks");
    }
  }

  async createShiftTask(accessToken: string, taskData: any): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/scheduling/shift-tasks/`, {
        method: "POST",
        headers: this.getHeaders(accessToken),
        body: JSON.stringify(taskData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create shift task");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to create shift task");
    }
  }

  async updateShiftTask(
    accessToken: string,
    taskId: string,
    taskData: any
  ): Promise<any> {
    try {
      const response = await fetch(
        `${API_BASE}/scheduling/shift-tasks/${taskId}/`,
        {
          method: "PATCH",
          headers: this.getHeaders(accessToken),
          body: JSON.stringify(taskData),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update shift task");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to update shift task");
    }
  }

  async deleteShiftTask(accessToken: string, taskId: string): Promise<void> {
    try {
      const response = await fetch(
        `${API_BASE}/scheduling/shift-tasks/${taskId}/`,
        {
          method: "DELETE",
          headers: this.getHeaders(accessToken),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete shift task");
      }
    } catch (error: any) {
      throw new Error(error.message || "Failed to delete shift task");
    }
  }

  async markTaskCompleted(accessToken: string, taskId: string): Promise<any> {
    try {
      const response = await fetch(
        `${API_BASE}/scheduling/shift-tasks/${taskId}/mark_completed/`,
        {
          method: "POST",
          headers: this.getHeaders(accessToken),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to mark task as completed"
        );
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to mark task as completed");
    }
  }

  async startTask(accessToken: string, taskId: string): Promise<any> {
    try {
      const response = await fetch(
        `${API_BASE}/scheduling/shift-tasks/${taskId}/start/`,
        {
          method: "POST",
          headers: this.getHeaders(accessToken),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to start task");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to start task");
    }
  }

  async reassignTask(
    accessToken: string,
    taskId: string,
    assigned_to: string
  ): Promise<any> {
    try {
      const response = await fetch(
        `${API_BASE}/scheduling/shift-tasks/${taskId}/reassign/`,
        {
          method: "POST",
          headers: this.getHeaders(accessToken),
          body: JSON.stringify({ assigned_to }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to reassign task");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to reassign task");
    }
  }

  // =========================
  // Checklist API (frontend)
  // =========================

  /**
   * Create a checklist template with steps.
   * Backend: POST `/checklists/templates/` using ChecklistTemplateCreateSerializer
   */
  async createChecklistTemplate(
    accessToken: string,
    payload: {
      name: string;
      description?: string;
      category: string;
      version?: string;
      estimated_duration?: number;
      requires_supervisor_approval?: boolean;
      steps: Array<{
        title: string;
        description?: string;
        step_type?: string;
        order: number;
        is_required?: boolean;
        requires_photo?: boolean;
        requires_note?: boolean;
        requires_signature?: boolean;
        measurement_type?: string | null;
        measurement_unit?: string | null;
        min_value?: number | null;
        max_value?: number | null;
        target_value?: number | string | null;
        conditional_logic?: Record<string, any> | null;
        depends_on_step?: string | null;
        validation_rules?: Record<string, any> | null;
      }>;
    }
  ): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/checklists/templates/`, {
        method: "POST",
        headers: this.getHeaders(accessToken),
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        let message = "Failed to create checklist template";
        try {
          const err = await response.json();
          message = err.message || err.detail || err.error || message;
        } catch {
          message = `${message} (${response.status})`;
        }
        throw new Error(message);
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to create checklist template");
    }
  }

  /** List checklist templates for current restaurant */
  async getChecklistTemplates(accessToken: string, params?: { category?: string; is_active?: boolean; search?: string }): Promise<any[]> {
    try {
      const url = new URL(`${API_BASE}/checklists/templates/`);
      if (params?.category) url.searchParams.set("category", params.category);
      if (typeof params?.is_active === "boolean") url.searchParams.set("is_active", String(params.is_active));
      if (params?.search) url.searchParams.set("search", params.search);
      const response = await fetch(url.toString(), { headers: this.getHeaders(accessToken) });
      if (!response.ok) {
        let msg = "Failed to fetch checklist templates";
        try {
          const err = await response.json();
          msg = err.message || err.detail || err.error || msg;
        } catch (e) {
          // Fallback to status code when response JSON cannot be parsed
          msg = `${msg} (${response.status})`;
        }
        throw new Error(msg);
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch checklist templates");
    }
  }

  /** Duplicate an existing checklist template */
  async duplicateChecklistTemplate(accessToken: string, templateId: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/checklists/templates/${templateId}/duplicate/`, {
        method: "POST",
        headers: this.getHeaders(accessToken),
      });
      if (!response.ok) {
        let msg = "Failed to duplicate checklist template";
        try {
          const err = await response.json();
          msg = err.message || err.detail || err.error || msg;
        } catch (e) {
          // Fallback to status code when response JSON cannot be parsed
          msg = `${msg} (${response.status})`;
        }
        throw new Error(msg);
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to duplicate checklist template");
    }
  }

  /**
   * Assign a checklist template to a staff member.
   * Backend: POST `/checklists/templates/{id}/assign/` with { user_id, due_date? }
   */
  async assignChecklistTemplate(
    accessToken: string,
    templateId: string,
    userId: string,
    dueDateISO?: string
  ): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/checklists/templates/${templateId}/assign/`, {
        method: "POST",
        headers: this.getHeaders(accessToken),
        body: JSON.stringify({ user_id: userId, due_date: dueDateISO || undefined }),
      });
      if (!response.ok) {
        let msg = "Failed to assign checklist template";
        try {
          const err = await response.json();
          msg = err.message || err.detail || err.error || msg;
        } catch (e) {
          // Fallback to status code when response JSON cannot be parsed
          msg = `${msg} (${response.status})`;
        }
        throw new Error(msg);
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to assign checklist template");
    }
  }

  async ensureChecklistForTask(taskId: string): Promise<any> {
    try {
      const response = await fetch(
        `${API_BASE}/checklists/executions/ensure_for_task/`,
        {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify({ task_id: taskId }),
        }
      );
      if (!response.ok) {
        let message = "Failed to ensure checklist for task";
        try {
          const err = await response.json();
          message = err.error || err.detail || message;
        } catch {
          // Ignore JSON parse error; retain default message
        }
        throw new Error(message);
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to ensure checklist for task");
    }
  }

  async createChecklistExecution(
    templateId: string,
    assignedShiftId?: string
  ): Promise<any> {
    try {
      const body: any = { template_id: templateId };
      if (assignedShiftId) body.assigned_shift = assignedShiftId;

      // Get token from localStorage
      const token = localStorage.getItem('access_token') || '';

      const response = await fetch(`${API_BASE}/checklists/executions/`, {
        method: "POST",
        headers: this.getHeaders(token),
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || err.detail || "Failed to create checklist execution");
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to create checklist execution");
    }
  }

  async getCurrentSession(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/timeclock/current-session/`, {
        headers: this.getHeaders(),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch session');
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch session");
    }
  }

  /**
   * Fetch all shift tasks assigned to a user, ensure each has a checklist execution,
   * and return enriched items with execution details for UI rendering.
   */
  async getAssignedTasksAsChecklists(
    accessToken: string,
    userId: string,
    status?: string
  ): Promise<
    Array<{
      task_id: string;
      execution_id: string;
      title: string;
      description?: string;
      priority?: string;
      due_date?: string | null;
      status?: string;
      assigned_to?: string | { id?: string; name?: string } | Array<{ id?: string; name?: string }> | null;
      template?: { id: string; name: string; description?: string } | null;
    }>
  > {
    const tasks = await this.getShiftTasks(accessToken, {
      assigned_to: userId,
      status,
    });

    const results: Array<{
      task_id: string;
      execution_id: string;
      title: string;
      description?: string;
      priority?: string;
      due_date?: string | null;
      status?: string;
      assigned_to?: string | { id?: string; name?: string } | Array<{ id?: string; name?: string }> | null;
      template?: { id: string; name: string; description?: string } | null;
    }> = [];

    for (const t of tasks) {
      try {
        let ensured = await this.ensureChecklistForTask(t.id);
        let executionId = ensured?.execution?.id || ensured?.id || ensured?.execution_id;
        if (!executionId) {
          console.warn("Checklist execution missing for task", t.id, ensured);
        }

        if (!executionId) {
          // Fallback: auto-create a minimal template by task category and retry ensure
          const categoryName = String(
            (t?.category_name || (t?.category && t?.category.name) || 'CHECKLIST')
          );
          try {
            const existing = await this.getChecklistTemplates(accessToken, { category: categoryName, is_active: true });
            let template = Array.isArray(existing) ? existing[0] : null;
            if (!template) {
              template = await this.createChecklistTemplate(accessToken, {
                name: `${categoryName} Checklist`,
                description: 'Auto-generated default checklist linked to shift tasks.',
                category: categoryName,
                steps: [
                  { title: 'Start checklist', description: 'Open and review task requirements.', order: 1, is_required: true },
                  { title: 'Perform task steps', description: 'Complete all required actions safely.', order: 2, is_required: true },
                  { title: 'Finish and confirm', description: 'Verify completion and leave notes.', order: 3, is_required: true },
                ],
              });
            }
            ensured = await this.ensureChecklistForTask(String(t.id));
            executionId = ensured?.execution?.id || ensured?.id || ensured?.execution_id;
          } catch (innerErr) {
            console.warn('Auto-create template fallback failed', innerErr);
          }
        }
        if (!executionId) {
          continue;
        }
        const execution = await this.getChecklistExecution(String(executionId));
        results.push({
          task_id: t.id,
          execution_id: String(executionId),
          title: t.title || t.name || execution?.template?.name || 'Task',
          description: t.description || execution?.template?.description || undefined,
          priority: t.priority || undefined,
          due_date: t.due_date || execution?.due_date || null,
          status: execution?.status || t.status || undefined,
          assigned_to: (t.assigned_to ?? t.assignees ?? t.owner ?? null) as any,
          template: execution?.template
            ? { id: execution.template.id, name: execution.template.name, description: execution.template.description }
            : null,
        });
      } catch (err) {
        const emsg = String((err as any)?.message || '');
        if (emsg.toLowerCase().includes('no active checklist template')) {
          try {
            const categoryName = String(
              (t?.category_name || (t?.category && t?.category.name) || 'CHECKLIST')
            );
            const existing = await this.getChecklistTemplates(accessToken, { category: categoryName, is_active: true });
            let template = Array.isArray(existing) ? existing[0] : null;
            if (!template) {
              template = await this.createChecklistTemplate(accessToken, {
                name: `${categoryName} Checklist`,
                description: 'Auto-generated default checklist linked to shift tasks.',
                category: categoryName,
                steps: [
                  { title: 'Start checklist', description: 'Open and review task requirements.', order: 1, is_required: true },
                  { title: 'Perform task steps', description: 'Complete all required actions safely.', order: 2, is_required: true },
                  { title: 'Finish and confirm', description: 'Verify completion and leave notes.', order: 3, is_required: true },
                ],
              });
            }
            const ensured = await this.ensureChecklistForTask(String(t.id));
            const executionId = ensured?.execution?.id || ensured?.id || ensured?.execution_id;
            if (!executionId) continue;
            const execution = await this.getChecklistExecution(String(executionId));
            results.push({
              task_id: t.id,
              execution_id: String(executionId),
              title: t.title || t.name || execution?.template?.name || 'Task',
              description: t.description || execution?.template?.description || undefined,
              priority: t.priority || undefined,
              due_date: t.due_date || execution?.due_date || null,
              status: execution?.status || t.status || undefined,
              assigned_to: (t.assigned_to ?? t.assignees ?? t.owner ?? null) as any,
              template: execution?.template
                ? { id: execution.template.id, name: execution.template.name, description: execution.template.description }
                : null,
            });
          } catch (innerErr) {
            console.warn('Fallback ensure after creating template failed', innerErr);
          }
        } else {
          console.warn('Failed to ensure checklist for task', t?.id, err);
        }
      }
    }

    return results;
  }

  /**
   * Unified tasks for the current user: direct assignments + template-embedded tasks.
   * Backend: GET `/scheduling/tasks/my_combined/`
   */
  async getMyCombinedTasks(
    accessToken: string,
    params?: { status?: string; priority?: string; ordering?: string; due_from?: string; due_to?: string; page_size?: number }
  ): Promise<Array<{
    id: string;
    title: string;
    description?: string | null;
    priority?: string | null;
    status?: string | null;
    due_date?: string | null;
    source: 'SHIFT_TASK' | 'TEMPLATE_TASK';
    associated_shift?: { id?: string; shift_date?: string; role?: string } | null;
    associated_template?: { id?: string; name?: string; type?: string } | null;
  }>> {
    const url = new URL(`${API_BASE}/scheduling/tasks/my_combined/`);
    if (params?.status) url.searchParams.set('status', params.status);
    if (params?.priority) url.searchParams.set('priority', params.priority);
    if (params?.ordering) url.searchParams.set('ordering', params.ordering);
    if (params?.due_from) url.searchParams.set('due_from', params.due_from);
    if (params?.due_to) url.searchParams.set('due_to', params.due_to);
    if (params?.page_size) url.searchParams.set('page_size', String(params.page_size));

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getHeaders(accessToken),
    });
    if (!response.ok) {
      let message = 'Failed to fetch combined tasks';
      try {
        const err = await response.json();
        message = err.message || err.detail || err.error || message;
      } catch {
        message = `${message} (${response.status})`;
      }
      throw new Error(message);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : (data?.results || []);
  }

  async getChecklistExecution(executionId: string): Promise<any> {
    try {
      const response = await fetch(
        `${API_BASE}/checklists/executions/${executionId}/`,
        { headers: this.getHeaders() }
      );
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Failed to load checklist execution: ${err}`);
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to load checklist execution");
    }
  }

  async startChecklistExecution(executionId: string): Promise<any> {
    try {
      const response = await fetch(
        `${API_BASE}/checklists/executions/${executionId}/start/`,
        { method: "POST", headers: this.getHeaders() }
      );
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Failed to start checklist: ${err}`);
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to start checklist");
    }
  }

  async completeChecklistExecution(
    executionId: string,
    completion_notes?: string
  ): Promise<any> {
    try {
      const response = await fetch(
        `${API_BASE}/checklists/executions/${executionId}/complete/`,
        {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify({ completion_notes }),
        }
      );
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Failed to complete checklist: ${err}`);
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to complete checklist");
    }
  }

  async notifyChecklistSubmission(
    executionId: string,
    payload: { title?: string; message?: string; submitter_id?: string; submitter_name?: string; channels?: Array<'in_app' | 'email' | 'push'> }
  ): Promise<void> {
    if (!TELEMETRY_ENABLED) return;
    const headers = this.getHeaders();
    try {
      // Prefer a dedicated endpoint if available
      const res = await fetch(`${API_BASE}/notifications/checklists/submission/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ execution_id: executionId, ...payload }),
      });
      if (res.ok) return;
    } catch {
      // fallthrough to announcement
    }
    try {
      const title = payload.title || 'Checklist Submitted';
      const message = payload.message || 'A checklist was submitted.';
      await this.createAnnouncement(localStorage.getItem('access_token') || '', {
        title,
        message,
        priority: 'HIGH',
        recipients_roles: ['MANAGER'],
      } as any);
    } catch {
      // No-op to avoid breaking submission flow
    }
  }

  async notifyEvent(
    payload: { event_type: 'DOCUMENT_SIGNED' | 'FIELD_EDITED' | 'AUTO_SAVE'; execution_id?: string; severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; message?: string }
  ): Promise<void> {
    const headers = this.getHeaders();
    try {
      const res = await fetch(`${API_BASE}/notifications/events/`, { method: 'POST', headers, body: JSON.stringify(payload) });
      if (res.ok) return;
    } catch {
      // fallback to announcement for managers
    }
    try {
      await this.createAnnouncement(localStorage.getItem('access_token') || '', {
        title: payload.event_type.replace('_', ' ') + (payload.severity ? ` [${payload.severity}]` : ''),
        message: payload.message || 'Checklist activity',
        priority: (payload.severity === 'CRITICAL' ? 'URGENT' : payload.severity === 'HIGH' ? 'HIGH' : 'MEDIUM') as any,
        recipients_roles: ['MANAGER'],
      } as any);
    } catch {
      // ignore
    }
  }

  async logChecklistSubmissionAttempt(
    executionId: string,
    payload: { status: 'STARTED' | 'COMPLETED' | 'FAILED'; message?: string; submitter_id?: string }
  ): Promise<void> {
    if (!TELEMETRY_ENABLED) return;
    const headers = this.getHeaders();
    try {
      const res = await fetch(`${API_BASE}/checklists/executions/${executionId}/submission_log/`, {
        method: 'POST', headers, body: JSON.stringify(payload)
      });
      if (res.ok) return;
    } catch {
      // ignore
    }
    try {
      await fetch(`${API_BASE}/audits/events/`, {
        method: 'POST', headers, body: JSON.stringify({
          event_type: 'CHECKLIST_SUBMISSION',
          execution_id: executionId,
          status: payload.status,
          message: payload.message || '',
          submitter_id: payload.submitter_id || '',
        })
      });
    } catch {
      // ignore
    }
  }

  async logAdminAction(taskId: string, payload: { action: string; message?: string }): Promise<void> {
    const headers = this.getHeaders();
    try {
      const res = await fetch(`${API_BASE}/audits/admin-actions/`, {
        method: 'POST', headers, body: JSON.stringify({ task_id: taskId, ...payload })
      });
      if (res.ok) return;
    } catch {
      // ignore
    }
  }

  async updateStepResponse(
    stepResponseId: string,
    payload: { response_value?: string; notes?: string }
  ): Promise<any> {
    try {
      const response = await fetch(
        `${API_BASE}/checklists/step-responses/${stepResponseId}/`,
        {
          method: "PUT",
          headers: this.getHeaders(),
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Failed to update step: ${err}`);
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to update step");
    }
  }

  async addStepEvidence(stepResponseId: string, file: File): Promise<any> {
    try {
      const form = new FormData();
      form.append("file", file);
      const headers = this.getHeaders();
      // Remove explicit JSON content-type for multipart
      delete headers["Content-Type"];
      const response = await fetch(
        `${API_BASE}/checklists/step-responses/${stepResponseId}/add-evidence/`,
        { method: "POST", headers, body: form }
      );
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Failed to attach evidence: ${err}`);
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to attach evidence");
    }
  }

  async getMyChecklists(statusOrOpts?: string | { status?: string; page?: number; page_size?: number; ordering?: string }): Promise<{ results: any[]; next?: string | null; previous?: string | null; count?: number } | any[]> {
    const opts = typeof statusOrOpts === "string" ? { status: statusOrOpts } : (statusOrOpts || {});
    const url = new URL(`${API_BASE}/checklists/executions/my_checklists/`);
    if (opts.status) url.searchParams.set("status", opts.status);
    if (opts.page) url.searchParams.set("page", String(opts.page));
    if (opts.page_size) url.searchParams.set("page_size", String(opts.page_size));
    if (opts.ordering) url.searchParams.set("ordering", String(opts.ordering));
    const response = await fetch(url.toString(), { headers: this.getHeaders() });
    if (!response.ok) {
      let message = "Failed to fetch checklists";
      try {
        const err = await response.json();
        message = err.message || err.detail || err.error || message;
      } catch {
        message = `Failed to fetch checklists (${response.status})`;
      }
      throw new Error(message);
    }
    const data = await response.json();
    return typeof data === "object" && data && "results" in data ? data : (data.results || data);
  }

  async getStaffProfiles(accessToken: string): Promise<StaffProfileItem[]> {
    try {
      const response = await fetch(`${API_BASE}/staff/profiles/`, {
        method: "GET",
        headers: this.getHeaders(accessToken),
      });

      // Read raw body first to allow graceful handling of non-JSON responses
      const raw = await response.text();
      let parsed: any;
      try {
        parsed = raw ? JSON.parse(raw) : null;
      } catch {
        parsed = null;
      }

      if (!response.ok) {
        const message = (parsed && (parsed.message || parsed.detail))
          || `Failed to fetch staff profiles (${response.status})`;
        // Include short snippet for easier debugging when server returns HTML/text
        const snippet = raw?.slice(0, 160)?.replace(/\s+/g, " ")?.trim();
        if (snippet) console.warn("Staff profiles error response:", snippet);
        throw new Error(message);
      }

      if (parsed) {
        // Prefer array or paginated envelope
        return Array.isArray(parsed?.results) ? parsed.results : (Array.isArray(parsed) ? parsed : []);
      }

      // Non-JSON success response. Log and return empty list to keep UI stable
      const snippet = raw?.slice(0, 160)?.replace(/\s+/g, " ")?.trim();
      if (snippet) console.warn("Non-JSON staff profiles response:", snippet);
      return [];
    } catch (error: any) {
      throw new Error(error?.message || "Failed to fetch staff profiles");
    }
  }

  async createAnnouncement(
    accessToken: string,
    announcementData: {
      title: string;
      message: string;
      priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
      expires_at?: string;
      schedule_for?: string;
      recipients_staff_ids?: string[];
      recipients_departments?: string[];
      recipients_roles?: string[];
      recipients_shift_ids?: string[];
      tags?: string[];
    },
    attachments?: File[]
  ): Promise<CreateAnnouncementResponse> {
    try {
      const formData = new FormData();
      formData.append("title", announcementData.title);
      formData.append("message", announcementData.message);
      formData.append("priority", announcementData.priority);
      if (announcementData.expires_at)
        formData.append("expires_at", announcementData.expires_at);
      if (announcementData.schedule_for)
        formData.append("schedule_for", announcementData.schedule_for);
      if (announcementData.recipients_staff_ids?.length) {
        announcementData.recipients_staff_ids.forEach((id) =>
          formData.append("recipients_staff_ids", id)
        );
      }
      if (announcementData.recipients_departments?.length) {
        announcementData.recipients_departments.forEach((dept) =>
          formData.append("recipients_departments", dept)
        );
      }
      if (announcementData.recipients_roles?.length) {
        announcementData.recipients_roles.forEach((role) =>
          formData.append("recipients_roles", role)
        );
      }
      if (announcementData.recipients_shift_ids?.length) {
        announcementData.recipients_shift_ids.forEach((id) =>
          formData.append("recipients_shift_ids", id)
        );
      }
      if (announcementData.tags?.length) {
        announcementData.tags.forEach((tag) => formData.append("tags", tag));
      }
      (attachments || []).forEach((file) =>
        formData.append("attachments", file, file.name)
      );

      const response = await fetch(`${API_BASE}/notifications/announcements/create/`, {
        method: "POST",
        // Do NOT set Content-Type header for FormData; browser sets boundary
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        body: formData,
      });
      if (!response.ok) {
        let errorMessage = "Failed to create announcement";
        try {
          const clone = response.clone();
          const errorData = await clone.json();
          const extracted =
            (errorData && (errorData.message || errorData.detail || errorData.error)) ||
            null;
          if (extracted) {
            errorMessage = extracted;
          }
        } catch (parseError) {
          try {
            const clone = response.clone();
            const text = await clone.text();
            if (text && typeof text === "string") {
              errorMessage = text;
            }
          } catch {
            void 0;
          }
        }
        throw new Error(errorMessage);
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to create announcement");
    }
  }

  async getAssignedShifts(
    accessToken: string,
    params?: { date_from?: string; date_to?: string; staff_id?: string; schedule_id?: string }
  ): Promise<any[]> {
    try {
      const qp = new URLSearchParams();
      if (params?.date_from) qp.append("date_from", params.date_from);
      if (params?.date_to) qp.append("date_to", params.date_to);
      if (params?.staff_id) qp.append("staff_id", params.staff_id);
      if (params?.schedule_id) qp.append("schedule_id", params.schedule_id);
      const url = `${API_BASE}/scheduling/assigned-shifts-v2/${qp.toString() ? `?${qp.toString()}` : ""}`;
      const response = await fetch(url, {
        method: "GET",
        headers: this.getHeaders(accessToken),
      });
      if (!response.ok) {
        let message = "Failed to fetch assigned shifts";
        try {
          const data = await response.json();
          message = data.message || data.detail || message;
        } catch {
          // ignore parse error; keep default message
        }
        throw new Error(message);
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch assigned shifts");
    }
  }

  /** Live checklist progress (WhatsApp/conversational step-by-step) for managers. */
  async getLiveChecklistProgress(): Promise<{ items: Array<{
    id: string;
    shift_id: string;
    staff_id: string;
    staff_name: string;
    shift_date: string | null;
    channel: string;
    status: string;
    progress_percentage: number;
    total_tasks: number;
    completed_tasks: number;
    current_task_id: string | null;
    updated_at: string | null;
    completed_at: string | null;
  }> }> {
    const response = await fetch(`${API_BASE}/scheduling/live-checklist-progress/`, {
      method: "GET",
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch live checklist progress");
    return response.json();
  }

  // --- Shift Reviews ---
  async submitShiftReview(
    accessToken: string,
    payload: ShiftReviewSubmission
  ): Promise<{ id: string; message?: string }> {
    try {
      const response = await fetch(`${API_BASE}/attendance/shift-reviews/`, {
        method: "POST",
        headers: this.getHeaders(accessToken),
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        let message = "Failed to submit shift review";
        try {
          const err = await response.json();
          message = err.message || err.detail || message;
        } catch {
          // Ignore JSON parse error; retain default message
        }
        throw new Error(message);
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || "Failed to submit shift review");
    }
  }

  async getShiftReviews(
    accessToken: string,
    params?: { date_from?: string; date_to?: string; staff_id?: string; rating?: number }
  ): Promise<any[]> {
    try {
      const url = toAbsoluteUrl(`${API_BASE}/attendance/shift-reviews/`);
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null && String(v).length > 0) url.searchParams.set(k, String(v));
        });
      }
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: this.getHeaders(accessToken),
      });
      if (!response.ok) {
        let message = "Failed to fetch shift reviews";
        try {
          const err = await response.json();
          message = err.message || err.detail || message;
        } catch {
          // Ignore JSON parse error; retain default message
        }
        throw new Error(message);
      }
      const json = await response.json();
      // Unwrap paginated responses transparently; tolerate both array and {results: []}
      if (Array.isArray(json)) return json;
      if (json && Array.isArray(json.results)) return json.results;
      return [];
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch shift reviews");
    }
  }

  async likeShiftReview(accessToken: string, reviewId: string): Promise<{ liked: boolean; likes_count: number }> {
    const url = `${API_BASE}/attendance/shift-reviews/${reviewId}/like/`;
    const response = await fetch(url, {
      method: "POST",
      headers: this.getHeaders(accessToken),
    });
    if (!response.ok) {
      let message = "Failed to like review";
      try {
        const err = await response.json();
        message = err.message || err.detail || message;
      } catch {
        // Ignore JSON parse error; retain default message
      }
      throw new Error(message);
    }
    return await response.json();
  }

  async getShiftReviewStats(
    accessToken: string,
    params?: { date_from?: string; date_to?: string }
  ): Promise<{ by_rating: Array<{ rating: number; count: number }>; total_reviews: number; total_likes: number; tag_counts: Record<string, number> }> {
    const url = toAbsoluteUrl(`${API_BASE}/attendance/shift-reviews/stats/`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v).length > 0) url.searchParams.set(k, String(v));
      });
    }
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: this.getHeaders(accessToken),
    });
    if (!response.ok) {
      let message = "Failed to fetch review stats";
      try {
        const err = await response.json();
        message = err.message || err.detail || message;
      } catch {
        // Ignore JSON parse error; retain default message
      }
      throw new Error(message);
    }
    return await response.json();
  }
}

export const api = new BackendService();
