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
} from "./types"; // Updated import path

const API_BASE =
  import.meta.env.VITE_REACT_APP_API_URL || "http://localhost:8000/api";

export class BackendService {
  // In a real frontend application, HttpService and ConfigService would not be used directly
  // Instead, you would use fetch or a library like Axios directly.
  // These are kept for now to avoid breaking existing structure but should be refactored for a pure frontend.
  constructor(
    private readonly httpService: any | null = null,
    private readonly configService: any | null = null
  ) {
    // For frontend, we will directly use the API_BASE constant
  }

  private getHeaders(token?: string): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
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
      const response = await fetch(`${API_BASE}/auth/signup/owner/`, {
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

  async acceptInvitation(
    token: string,
    first_name: string,
    last_name: string,
    password: string,
    pin_code: string | null
  ): Promise<LoginResponse> {
    try {
      const response = await fetch(`${API_BASE}/auth/accept-invitation/`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          token,
          first_name,
          last_name,
          password,
          pin_code,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Invitation acceptance failed");
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

  async getStaffList(accessToken: string): Promise<StaffListItem[]> {
    try {
      const response = await fetch(`${API_BASE}/staff/list/`, {
        method: "GET",
        headers: this.getHeaders(accessToken),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch staff list");
      }
      return await response.json();
    } catch (error: any) {
      console.error("Error fetching staff list:", error);
      throw new Error(error.message || "Failed to fetch staff list");
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
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to remove staff member");
      }
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

  async getPendingStaffInvitations(
    accessToken: string
  ): Promise<StaffInvitation[]> {
    try {
      const response = await fetch(
        `${API_BASE}/accounts/staff/pending-invitations/`,
        {
          method: "GET",
          headers: this.getHeaders(accessToken),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to fetch pending staff invitations"
        );
      }
      return await response.json();
    } catch (error: any) {
      console.error("Error fetching pending staff invitations:", error);
      return []; // Return empty array on error for graceful degradation
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
  ): Promise<ClockEvent | null> {
    try {
      const response = await fetch(`${API_BASE}/timeclock/current-session/`, {
        method: "GET",
        headers: this.getHeaders(accessToken),
      });
      if (!response.ok) {
        if (response.status === 404) return null; // No current session
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch current session");
      }
      return await response.json();
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

  async getAttendanceHistory(accessToken: string): Promise<ClockEvent[]> {
    try {
      const response = await fetch(
        `${API_BASE}/timeclock/attendance-history/`,
        {
          method: "GET",
          headers: this.getHeaders(accessToken),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to fetch attendance history"
        );
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
}

export const api = new BackendService();
