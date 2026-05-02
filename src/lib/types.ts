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
        /** Saved to general_settings.business_vertical on the backend */
        business_vertical?: string;
    };
}

export interface InviteStaffData {
    email: string;
    role: string;
    first_name?: string;
    last_name?: string;
    phone_number?: string;
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
    sent_at?: string;
    created_at?: string;
    expires_at: string;
    first_name?: string;
    last_name?: string;
    phone_number?: string;
    extra_data?: { phone?: string;[key: string]: any };
}

/** Staff-captured order log (Miya voice/text or manual form). */
export type StaffCapturedOrderFulfillmentStatus = "NEW" | "IN_PROGRESS" | "FULFILLED" | "CANCELLED";

export interface StaffCapturedOrderRow {
    id: string;
    customer_name: string;
    customer_phone: string;
    order_type: "DINE_IN" | "TAKEOUT" | "DELIVERY" | "OTHER";
    table_or_location: string;
    items_summary: string;
    dietary_notes: string;
    special_instructions: string;
    channel: "VOICE" | "TEXT" | "MANUAL";
    fulfillment_status: StaffCapturedOrderFulfillmentStatus;
    created_at: string;
    updated_at: string;
    recorded_by_name: string | null;
}

/** PATCH body for staff-captured orders (partial update). */
export type StaffCapturedOrderPatchBody = Partial<{
    customer_name: string;
    customer_phone: string;
    order_type: StaffCapturedOrderRow["order_type"];
    table_or_location: string;
    items_summary: string;
    dietary_notes: string;
    special_instructions: string;
    channel: StaffCapturedOrderRow["channel"];
    fulfillment_status: StaffCapturedOrderFulfillmentStatus;
}>;

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
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    due_date: string;
    created_at: string;
    updated_at: string;
    source?: 'MANUAL' | 'WHATSAPP' | 'EMAIL' | 'MIYA' | 'SYSTEM';
    source_label?: string;
    ai_summary?: string;
}

/** Row shape served by GET /api/dashboard/tasks-demands/. Kept
 * deliberately small for the dashboard widget — no restaurant id, no
 * full user object. */
export type DashboardTaskPillStatus =
    /** Created in the last few hours and still pending — gives newly captured rows a distinct visual signal so they're easy to spot. */
    | 'NEW'
    /** Default "needs action" state for an unassigned, untouched item. */
    | 'PENDING'
    /** A staff request that's been APPROVED and has a named assignee. */
    | 'ASSIGNED'
    /** Work has started — same as the legacy IN_PROGRESS coarse status. */
    | 'IN_PROGRESS'
    /** Manager has parked the request awaiting an external dependency (supplier, contractor, document). */
    | 'WAITING_ON'
    /** A request that was bounced up the chain to a senior manager. */
    | 'ESCALATED'
    /** A task whose due date has passed (or whose follow-up date has slipped) — top priority for the manager's attention. */
    | 'OVERDUE'
    /** Open invoice or task due within the next 3 days — early heads-up before it slips. */
    | 'DUE_SOON'
    /** Invoice that hasn't been finalised yet (DRAFT status). */
    | 'DRAFT'
    /** Open invoice that hasn't yet hit its due date. */
    | 'OPEN'
    /** Invoice has been paid (final). */
    | 'PAID'
    /** Invoice has been voided / superseded (final). */
    | 'VOIDED'
    /** Task or request reached its terminal "done" state. */
    | 'DONE'
    /** Task or request was cancelled / rejected (final, no further action). */
    | 'CANCELLED';

export interface DashboardTaskDemandItem {
    id: string;
    title: string;
    description: string | null;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    /** Coarse status used by filter/counter logic (kept for back-compat). */
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    /**
     * Granular per-row status used by the colored pill on each widget row.
     * Returned by the backend; older deployments may not include it, in
     * which case the widget falls back to the coarse ``status`` field.
     */
    pill_status?: DashboardTaskPillStatus;
    /**
     * Compact relative-time string for when the item was created
     * (``"just now"`` / ``"12m ago"`` / ``"yesterday"`` / ``"5d ago"``).
     * Empty string when the backend can't compute one.
     */
    age_label?: string;
    /**
     * Source model that owns this row. Drives the row's action menu —
     * invoices only accept "Mark paid" / "Mark voided" while tasks /
     * staff requests accept the full PENDING → IN_PROGRESS → DONE flow.
     * The dashboard task-status PATCH endpoint figures out which model
     * to update from the row id alone, so this is purely for UI
     * vocabulary; older API responses may omit it.
     */
    kind?: 'dashboard' | 'scheduling' | 'staff_request' | 'invoice';
    due_date: string | null;
    source: 'MANUAL' | 'WHATSAPP' | 'EMAIL' | 'MIYA' | 'SYSTEM';
    source_label: string;
    ai_summary: string;
    /** Dashboard widget bucket — set by the intent router so HR / Finance /
     *  Maintenance / Meetings widgets can filter without extra round-trips. */
    category?:
        | 'DOCUMENT'
        | 'HR'
        | 'SCHEDULING'
        | 'PAYROLL'
        | 'FINANCE'
        | 'OPERATIONS'
        | 'MAINTENANCE'
        | 'RESERVATIONS'
        | 'INVENTORY'
        | 'PURCHASE_ORDER'
        | 'MEETING'
        | 'OTHER'
        | null;
    assignee: {
        id: string;
        name: string;
        initials: string;
        role?: string | null;
    } | null;
    created_at: string;
    updated_at: string;
}

/** Bucket id served by GET /api/dashboard/category-tasks/. */
export type CategoryTaskBucket =
    | 'urgent'
    | 'human_resources'
    | 'finance'
    | 'maintenance'
    | 'meetings'
    | 'purchase_orders'
    | 'miscellaneous';

export interface CategoryTasksResponse {
    bucket: CategoryTaskBucket;
    /** Canonical staff/dashboard category slugs that feed this bucket. */
    categories: string[];
    items: DashboardTaskDemandItem[];
    completed: DashboardTaskDemandItem[];
    /**
     * Coarse counts (``open / in_progress / completed``) drive the filter
     * chips. The granular fields (``overdue / waiting_on / escalated /
     * new``) are best-effort — counted from the trimmed top-N items and
     * only used to render the warning badges in the card header. They
     * may be undefined on older backends.
     */
    counts: {
        open: number;
        in_progress: number;
        completed: number;
        overdue?: number;
        waiting_on?: number;
        escalated?: number;
        new?: number;
    };
    generated_at: string;
}

/**
 * Outbound WhatsApp message status as tracked by the dashboard
 * "Staff Messages" widget. Mirrors the backend NotificationLog status
 * machine, with READ being the terminal happy path (✓✓ blue).
 */
export type StaffMessageStatus =
    | 'PENDING'
    | 'SENT'
    | 'DELIVERED'
    | 'READ'
    | 'FAILED';

/** Single row in the staff-messages feed. */
export interface StaffMessageRow {
    id: string;
    notification_id: string | null;
    external_id: string;
    status: StaffMessageStatus;
    channel: 'whatsapp' | string;
    recipient: {
        id: string | null;
        name: string;
        phone: string;
        role: string;
    };
    sender: { id: string; name: string } | null;
    preview: string;
    priority: 'LOW' | 'NORMAL' | 'MEDIUM' | 'HIGH' | 'URGENT';
    sent_at: string | null;
    delivered_at: string | null;
    error_message: string;
}

/** Quick-pick template the composer surfaces as a chip. */
export interface StaffMessageTemplate {
    id: string;
    label: string;
    body: string;
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

export interface StaffMessagesRecentResponse {
    items: StaffMessageRow[];
    counts: Record<StaffMessageStatus, number>;
    templates: StaffMessageTemplate[];
    generated_at: string;
}

export interface StaffMessageSendResponse {
    success: boolean;
    whatsapp_sent: number;
    whatsapp_failed: boolean;
    // Human-readable failure reason surfaced from Meta / the normalizer.
    // Populated when whatsapp_failed is true; null on success.
    failure_reason?: string | null;
    log: StaffMessageRow | null;
    template_id: string | null;
}

export interface DashboardTasksDemandsResponse {
    counts: { pending: number; in_progress: number; completed: number };
    pending: DashboardTaskDemandItem[];
    in_progress: DashboardTaskDemandItem[];
    completed: DashboardTaskDemandItem[];
    generated_at: string;
}

/** Invoice row shape mirroring the backend ``InvoiceSerializer``. */
export interface Invoice {
    id: string;
    restaurant: string;
    location?: string | null;
    location_name?: string;
    vendor_name: string;
    invoice_number?: string;
    amount: string; // Decimal serialized as string by DRF
    currency: string;
    issue_date?: string | null;
    due_date: string;
    status: 'DRAFT' | 'OPEN' | 'PAID' | 'VOIDED';
    category?: string;
    notes?: string;
    photo?: string | null;
    photo_url?: string;
    paid_at?: string | null;
    paid_amount?: string | null;
    payment_method?: string;
    payment_reference?: string;
    created_by?: string | null;
    created_by_name?: string;
    paid_by?: string | null;
    paid_by_name?: string;
    is_overdue: boolean;
    days_until_due: number | null;
    created_at: string;
    updated_at: string;
}

/** Row shape served by GET /api/dashboard/meetings-reminders/. Thin by design
 * so the widget can render without a second call — the full event detail
 * is one click away in Google Calendar via `html_link`. */
export interface MeetingReminderItem {
    id: string;
    title: string;
    /** RFC3339 start datetime in UTC (or `YYYY-MM-DDT00:00:00+00:00` for all-day). */
    start: string;
    end: string | null;
    all_day: boolean;
    /** First-name label for the organizer, or literally "Me" when it's the viewer. */
    owner_label: string;
    owner_is_me: boolean;
    /** Widget pill vocabulary — mapped from event time + color on the backend. */
    status: 'URGENT' | 'PENDING' | 'DONE';
    html_link: string | null;
    hangout_link: string | null;
    location: string | null;
    attendee_count: number;
    calendar_id: string;
}

export interface DashboardMeetingsRemindersResponse {
    connected: boolean;
    /** Google account the tenant connected. Shown as a hint on the empty state. */
    email: string | null;
    items: MeetingReminderItem[];
    counts: { urgent: number; pending: number; done: number };
    /** Target for the "Open in Calendar" footer link. */
    calendar_link: string;
    /** Only set on the not-connected shape; tells the UI whether the server
     * has OAuth creds at all (so we can hide the connect CTA if it'd just 501). */
    configured?: boolean;
    generated_at: string;
}

/** Row shape served by GET /api/dashboard/clock-ins/. */
export interface ClockInEventItem {
    id: string;
    /** RFC3339 datetime when the staff clocked in. */
    timestamp: string;
    status: "ON_TIME" | "LATE";
    /** Minutes vs. scheduled shift start (negative = early, positive = late).
     * ``null`` when the staff has no shift assigned for today. */
    lateness_minutes: number | null;
    /** True when the staff clocked in at a branch outside their allowed set. */
    location_mismatch: boolean;
    method: "self" | "manager_override";
    location: { id: string; name: string } | null;
    staff: {
        id: string;
        name: string;
        initials: string;
        role: string | null;
        avatar: string | null;
    };
}

export interface DashboardClockInsResponse {
    items: ClockInEventItem[];
    counts: {
        on_time: number;
        late: number;
        /** Total clock-in events today across the whole tenant — lets the
         * card show "3 late / 17 today" without a second request. */
        total: number;
    };
    generated_at: string;
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
    reorder_level?: number | null;
    cost_per_unit: number;
    supplier?: string; // Supplier ID
    supplier_info?: Supplier;
    last_restock_date?: string;
    // Prep-planning / purchasing hints (Phase 1).
    pack_size?: number | null;
    min_order_qty?: number | null;
    shelf_life_days?: number | null;
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
    lead_time_days?: number;
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
    top_selling_items: TopSellingItemSummary[];
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
    attendance_details: AttendanceDetailSummary[];
    created_at: string;
    updated_at: string;
}

export interface InventoryReport {
    id: string;
    restaurant: string;
    date: string;
    total_inventory_value: number;
    low_stock_items: LowStockItemSummary[];
    waste_cost: number;
    stock_adjustment_summary: StockAdjustmentSummary[];
    created_at: string;
    updated_at: string;
}

// More specific summary types used in aggregated reports
export interface TopSellingItemSummary {
    menu_item_id: string;
    name: string;
    quantity_sold: number;
    total_revenue: number;
}

export interface AttendanceDetailSummary {
    user_id: string;
    name?: string;
    hours_worked?: number;
    status?: 'ON_SHIFT' | 'LATE' | 'ABSENT';
}

export interface LowStockItemSummary {
    inventory_item_id: string;
    name: string;
    current_stock: number;
    min_stock_level: number;
}

export interface StockAdjustmentSummary {
    inventory_item_id: string;
    total_added: number;
    total_removed: number;
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

export interface StaffProfileItem {
    id: string;
    user_details: {
        id: string;
        email: string;
        first_name: string;
        last_name: string;
        role: string;
        phone?: string;
        restaurant: string;
        is_verified: boolean;
        created_at: string;
        updated_at: string;
    };
    profile_image?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    date_of_birth?: string;
    hire_date: string;
    position?: string;
    hourly_rate: number;
    skills: string[];
    certifications: string[];
    notes?: string;
    department?: string;
}

export interface CreateAnnouncementResponse {
    message: string;
    notification_count: number;
    announcement_id?: string;
}

// ---------------------------------------------------------------------------
// Billing / subscriptions
// ---------------------------------------------------------------------------
export type SubscriptionTier = "FREE" | "STARTER" | "GROWTH" | "ENTERPRISE";

export type SubscriptionStatus =
    | "incomplete"
    | "incomplete_expired"
    | "trialing"
    | "active"
    | "past_due"
    | "canceled"
    | "unpaid";

export interface SubscriptionPlan {
    id: number;
    slug: string;
    tier: SubscriptionTier;
    name: string;
    description: string;
    price: string; // DRF decimals serialize as strings
    price_monthly: string | null;
    price_yearly: string | null;
    currency: string;
    interval: "month" | "year";
    stripe_price_id: string | null;
    stripe_price_id_monthly: string;
    stripe_price_id_yearly: string;
    features: string[];
    feature_keys: string[];
    max_locations: number | null;
    max_staff: number | null;
    badge: string;
    highlight: boolean;
    cta_label: string;
    contact_sales: boolean;
    sort_order: number;
    trial_days: number;
    is_active: boolean;
}

export interface CurrentSubscription {
    id: number;
    status: SubscriptionStatus;
    tier: SubscriptionTier;
    is_paid: boolean;
    billing_interval: "" | "month" | "year";
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    trial_ends_at: string | null;
    plan: SubscriptionPlan | null;
}

export interface BillingEntitlements {
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    is_paid: boolean;
    billing_interval: "" | "month" | "year";
    trial_ends_at: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    features: string[];
    limits: { max_locations: number | null; max_staff: number | null };
    plan: SubscriptionPlan | null;
}
