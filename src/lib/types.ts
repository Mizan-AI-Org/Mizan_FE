export interface User {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    restaurant: string;
    accessToken?: string;
}

export interface Restaurant {
    id: string;
    name: string;
    address: string;
    phone: string;
    email: string;
}

export interface LoginResponse {
    user: User & { restaurant_data?: Restaurant };
    tokens: {
        access: string;
        refresh: string;
    };
}

export interface SignupData {
    user: {
        email: string;
        password: string;
        first_name: string;
        last_name: string;
        phone?: string;
        pin_code?: string;
    };
    restaurant: {
        name: string;
        address: string;
        phone: string;
        email: string;
    };
}

export interface InviteStaffData {
    email: string;
    role: string;
}

export interface StaffListItem {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    join_date: string;
}

export interface StaffDashboardSummary {
    totalStaff: number;
    activeShifts: number;
    pendingOrders: number;
    revenueToday: number;
}

export interface StaffOperationResponse {
    message: string;
}

export interface StaffInvitation {
    id: string;
    email: string;
    role: string;
    invited_by: string; // User ID of the inviter
    restaurant: string; // Restaurant ID
    token: string;
    is_accepted: boolean;
    created_at: string;
    expires_at: string;
}

export interface DailyKPI {
    id: string;
    restaurant: string;
    date: string;
    total_revenue: number;
    total_orders: number;
    avg_order_value: number;
    food_waste_cost: number;
    labor_cost_percentage: number;
    inventory_value: number;
    revenue_lost_to_stockouts: number;
    staff_online_count: number;
    created_at: string;
    updated_at: string;
}

export interface Alert {
    id: string;
    restaurant: string;
    message: string;
    alert_type: 'INFO' | 'WARNING' | 'ERROR';
    is_resolved: boolean;
    created_at: string;
}

export interface Task {
    id: string;
    restaurant: string;
    assigned_to: string;
    assigned_to_info?: User;
    title: string;
    description: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    due_date: string;
    created_at: string;
    updated_at: string;
}

export interface InventoryItem {
    id: string;
    restaurant: string;
    name: string;
    description?: string;
    category: string;
    unit: string;
    current_stock: number;
    min_stock_level: number;
    cost_per_unit: number;
    supplier?: string; // Supplier ID
    supplier_info?: Supplier;
    last_restock_date?: string;
    created_at: string;
    updated_at: string;
}

export interface Supplier {
    id: string;
    restaurant: string;
    name: string;
    contact_person?: string;
    email?: string;
    phone?: string;
    address?: string;
    created_at: string;
    updated_at: string;
}

export interface PurchaseOrder {
    id: string;
    restaurant: string;
    supplier: string; // Supplier ID
    supplier_info?: Supplier;
    order_date: string;
    expected_delivery_date?: string;
    delivery_date?: string;
    status: 'PENDING' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';
    total_amount: number;
    created_at: string;
    updated_at: string;
}

export interface PurchaseOrderItem {
    id: string;
    purchase_order: string; // PurchaseOrder ID
    inventory_item: string; // InventoryItem ID
    inventory_item_info?: InventoryItem;
    quantity: number;
    unit_price: number;
    total_price: number;
    created_at: string;
    updated_at: string;
}

export interface StockAdjustment {
    id: string;
    restaurant: string;
    inventory_item: string; // InventoryItem ID
    inventory_item_info?: InventoryItem;
    adjustment_type: 'ADD' | 'REMOVE';
    quantity: number;
    reason?: string;
    adjusted_by: string; // User ID
    adjusted_by_info?: User;
    created_at: string;
    updated_at: string;
}

export interface Table {
    id: string;
    restaurant: string;
    table_number: number;
    capacity: number;
    is_available: boolean;
    created_at: string;
    updated_at: string;
}

export interface MenuItem {
    id: string;
    restaurant: string;
    category: string; // MenuCategory ID
    name: string;
    description?: string;
    price: number;
    is_available: boolean;
    created_at: string;
    updated_at: string;
}

export interface OrderItem {
    id: string;
    order: string; // Order ID
    menu_item: string; // MenuItem ID
    menu_item_info?: MenuItem;
    quantity: number;
    unit_price: number;
    total_price: number;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface Order {
    id: string;
    restaurant: string;
    table?: string; // Table ID
    table_info?: Table;
    ordered_by?: string; // CustomUser ID
    ordered_by_info?: User;
    order_time: string;
    status: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'PAID' | 'CANCELLED';
    total_amount: number;
    is_paid: boolean;
    items?: OrderItem[];
    created_at: string;
    updated_at: string;
}

export interface DailySalesReport {
    id: string;
    restaurant: string;
    date: string;
    total_revenue: number;
    total_orders: number;
    avg_order_value: number;
    top_selling_items: any[]; // Adjust with a more specific type if needed
    created_at: string;
    updated_at: string;
}

export interface AttendanceReport {
    id: string;
    restaurant: string;
    date: string;
    total_staff_hours: number;
    staff_on_shift: number;
    late_arrivals: number;
    absences: number;
    attendance_details: any[]; // Adjust with a more specific type if needed
    created_at: string;
    updated_at: string;
}

export interface InventoryReport {
    id: string;
    restaurant: string;
    date: string;
    total_inventory_value: number;
    low_stock_items: any[]; // Adjust with a more specific type if needed
    waste_cost: number;
    stock_adjustment_summary: any[]; // Adjust with a more specific type if needed
    created_at: string;
    updated_at: string;
}

export interface ClockEvent {
    id: string;
    user: string;
    clock_in_time: string;
    clock_out_time: string | null;
    is_break: boolean;
    break_start: string | null;
    break_end: string | null;
    clock_in_latitude: number;
    clock_in_longitude: number;
    clock_out_latitude: number;
    clock_out_longitude: number;
    verified_location: boolean;
    created_at: string;
    updated_at: string;
}
