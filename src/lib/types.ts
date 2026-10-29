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
    code?: string;
    message?: string;
    data?: {
        whatsapp_url?: string;
        role?: string;
        email?: string;
        web_app?: boolean;
        [key: string]: unknown;
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
        /** Modules chosen at signup (general_settings.enabled_modules); core modules are always added. */
        modules?: ModuleKey[];
    };
}

/** Product modules a tenant runs (and pays for). operations + team are the core platform (always on). */
export type ModuleKey =
    | "operations"
    | "team"
    | "geo_clock"
    | "attendance"
    | "scheduling"
    | "hr"
    | "checklists"
    | "accountability"
    | "incidents"
    | "food_safety"
    | "sales"
    | "reservations"
    | "inventory"
    | "finance";

export type ModuleBundle = "core" | "workforce" | "execution" | "business";

export interface ModuleCatalogEntry {
    key: ModuleKey;
    core: boolean;
    bundle: ModuleBundle;
    requires: ModuleKey[];
    recommended: boolean;
    priceMonthly: number;
}

export interface ModulePricing {
    currency: string;
    platformMonthly: number;
    locationMonthly?: number;
    yearlyMonths: number;
    /** A whole bundle is billed at its bundle price. */
    bundles?: Record<string, { monthly: number; modules: string[] }>;
}

export interface ModuleCatalogResponse {
    modules: ModuleCatalogEntry[];
    recommended: ModuleKey[];
    pricing: ModulePricing;
}

export interface BillingLine {
    key: string;
    label: string;
    monthly?: number;
    amount: number;
    note?: string;
    /** Bundle lines: what the modules cost bought one by one. */
    listMonthly?: number;
    modules?: string[];
    /** Custom (Mizan-issued) and location lines. */
    quantity?: number;
    unitPrice?: number;
    unitMonthly?: number;
}

export interface BillingQuote {
    currency: string;
    interval: "month" | "year";
    lines: BillingLine[];
    /** HT per month. */
    monthlyTotal: number;
    /** HT for the interval. */
    total: number;
    taxRate?: number;
    taxAmount?: number;
    /** TTC for the interval. */
    totalTtc?: number;
    bundleSavings?: number;
    yearlySavings: number;
    locations?: number;
}

export interface BillingInvoiceRow {
    id: string;
    number: string;
    kind: "cycle" | "proration" | "custom";
    status: "open" | "paid" | "void";
    interval: string;
    periodStart: string;
    periodEnd: string;
    lines: BillingLine[];
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    currency: string;
    issuedAt: string;
    dueAt: string;
    paidAt: string | null;
    paymentMethod: string;
    paymentReference: string;
    overdue: boolean;
    restaurantId: string;
    restaurantName: string;
    billTo: Partial<BillingDetails>;
    notes?: string;
    reportedAt: string | null;
    reportedReference: string;
    reportedNote: string;
}

export interface BillingPaymentInstructions {
    beneficiary: string;
    bankName: string;
    rib: string;
    swift: string;
    instructions: string;
    contactEmail: string;
    legalName: string;
    address: string;
    ice: string;
    rc: string;
    taxId: string;
    taxLabel: string;
    taxRate: number;
}

export interface BillingDetails {
    legalName: string;
    ice: string;
    address: string;
    email: string;
}

export interface BillingBundleOffer {
    bundle: string;
    label: string;
    missing: string[];
    missingKeys: string[];
    extraMonthly: number;
}

export type BillingState = "trial" | "trial_over" | "active" | "due" | "overdue" | "suspended" | "none";

export interface BillingOverview {
    moduleBilling: boolean;
    status: string;
    state: BillingState;
    interval: "month" | "year";
    trialEndsAt: string | null;
    trialDaysLeft: number | null;
    nextInvoiceAt: string | null;
    suspended: boolean;
    locations: number;
    current: BillingQuote;
    monthly: BillingQuote;
    yearly: BillingQuote;
    bundleOffers: BillingBundleOffer[];
    openInvoices: BillingInvoiceRow[];
    balanceDue: number;
    invoices: BillingInvoiceRow[];
    paymentInstructions: BillingPaymentInstructions;
    billingDetails: BillingDetails;
}

export interface BillingInvoiceDocument extends BillingInvoiceRow {
    seller: BillingPaymentInstructions;
}

export interface TenantModulesResponse {
    enabled: ModuleKey[];
    selected: ModuleKey[];
    suspended: boolean;
    modules: ModuleCatalogEntry[];
    pricing: ModulePricing;
    canEdit: boolean;
}

export interface UpdateModulesResponse {
    enabled: ModuleKey[];
    selected: ModuleKey[];
    suspended: boolean;
    billing: { added: ModuleKey[]; removed: ModuleKey[]; proration: BillingInvoiceRow | null; nextBill: BillingQuote };
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
    phone?: string | null;
    profile?: { department?: string | null; [key: string]: unknown } | null;
}

export interface StaffDashboardSummary {
    totalStaff: number;
    activeShifts: number;
    pendingOrders: number;
    revenueToday: number;
}

export interface StaffOperationResponse {
    message: string;
    success?: boolean;
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

/** Guest orders taken by the team via Miya (all channels) or the dashboard form. */
export type StaffCapturedOrderFulfillmentStatus =
    | "NEW"
    | "IN_PROGRESS"
    | "READY"
    | "FULFILLED"
    | "CANCELLED";

export type StaffCapturedOrderChannel =
    | "VOICE"
    | "TEXT"
    | "MANUAL"
    | "AGENT"
    | "WHATSAPP"
    | "WHATSAPP_VOICE"
    | "WEB";

export interface StaffCapturedOrderRow {
    id: string;
    customer_name: string;
    customer_phone: string;
    order_type: "DINE_IN" | "TAKEOUT" | "DELIVERY" | "OTHER";
    table_or_location: string;
    items_summary: string;
    dietary_notes: string;
    special_instructions: string;
    channel: StaffCapturedOrderChannel | string;
    capture_source?: "AGENT" | "MANUAL" | string;
    fulfillment_status: StaffCapturedOrderFulfillmentStatus;
    created_at: string;
    updated_at: string;
    recorded_by_name: string | null;
    taken_by_id?: string | null;
    taken_by_role?: string | null;
    requires_manager_validation?: boolean;
    manager_validated_at?: string | null;
    manager_validated?: boolean | null;
    validation_label?: string | null;
    detected_station?: string | null;
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
    detected_station: string;
    requires_manager_validation: boolean;
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
    status: 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'UNABLE_TO_COMPLETE' | 'CANCELLED';
    due_date: string;
    created_at: string;
    updated_at: string;
    source?: 'MANUAL' | 'WHATSAPP' | 'EMAIL' | 'AGENT' | 'SYSTEM';
    source_label?: string;
    ai_summary?: string;
}

/** Row shape served by GET /api/dashboard/tasks-demands/. Kept
 * deliberately small for the dashboard widget - no restaurant id, no
 * full user object. */
export type DashboardTaskPillStatus =
    /** Created in the last few hours and still pending - gives newly captured rows a distinct visual signal so they're easy to spot. */
    | 'NEW'
    /** Default "needs action" state for an unassigned, untouched item. */
    | 'PENDING'
    /** A staff request that's been APPROVED and has a named assignee. */
    | 'ASSIGNED'
    /** Work has started - same as the legacy IN_PROGRESS coarse status. */
    | 'IN_PROGRESS'
    /** Manager has parked the request awaiting an external dependency (supplier, contractor, document). */
    | 'WAITING_ON'
    /** A request that was bounced up the chain to a senior manager. */
    | 'ESCALATED'
    /** A task whose due date has passed (or whose follow-up date has slipped) - top priority for the manager's attention. */
    | 'OVERDUE'
    /** Open invoice or task due within the next 3 days - early heads-up before it slips. */
    | 'DUE_SOON'
    /** Invoice that hasn't been finalised yet (DRAFT status). */
    | 'DRAFT'
    /** Open invoice that hasn't yet hit its due date. */
    | 'OPEN'
    /** Invoice has been paid (final). */
    | 'PAID'
    /** Invoice has been voided / superseded (final). */
    | 'VOIDED'
    | 'ARCHIVED'
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
    status: 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'UNABLE_TO_COMPLETE' | 'CANCELLED';
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
     * Source model that owns this row. Drives the row's action menu -
     * invoices only accept "Mark paid" / "Mark voided" while tasks /
     * staff requests accept the full PENDING → IN_PROGRESS → DONE flow.
     * The dashboard task-status PATCH endpoint figures out which model
     * to update from the row id alone, so this is purely for UI
     * vocabulary; older API responses may omit it.
     */
    kind?: 'dashboard' | 'scheduling' | 'staff_request' | 'invoice';
    /** Shared task from WhatsApp Project X: "first" = first to take it, "all" = everyone together. */
    group_mode?: 'first' | 'all' | null;
    /** Members who validated an everyone-together task. */
    done_by?: string[];
    /** Raw staff-request status before widget vocabulary mapping. */
    raw_status?: string;
    due_date: string | null;
    source: 'MANUAL' | 'WHATSAPP' | 'EMAIL' | 'AGENT' | 'SYSTEM';
    source_label: string;
    ai_summary: string;
    /** Dashboard widget bucket - set by the intent router so HR / Finance /
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
    /** All staff assigned to this task (dashboard.Task M2M). */
    assignees?: Array<{
        id: string;
        name: string;
        initials: string;
        role?: string | null;
    }>;
    created_at: string;
    updated_at: string;
    /** Custom dashboard process widget title (e.g. Wedding). */
    process_label?: string | null;
    /** Alias of process_label for slider project chip. */
    project_title?: string | null;
    /** Cross-cutting manager validation (non-blocking). */
    requires_manager_validation?: boolean;
    manager_validated?: boolean | null;
    validation_label?: string | null;
    assignee_absent?: boolean;
    has_photo_proof?: boolean;
    require_photo_proof?: boolean;
    proof_media_url?: string | null;
    proof_caption?: string | null;
    proof_submitted_at?: string | null;
    proof_submitted_by_name?: string | null;
    proof_submitter_name?: string | null;
    attachment_url?: string | null;
    attachment_label?: string | null;
}

/** Row in the Operations Live full-page feed. */
export interface OperationsLiveItem extends DashboardTaskDemandItem {
    from?: { name: string; role?: string | null };
    to?: { id?: string | null; name: string; is_me?: boolean; role?: string | null };
    operation?: string;
    display_status?: 'critical' | 'pending' | 'in_progress' | 'completed';
    escalated_to?: { name: string; role?: string | null } | null;
    attachment_label?: string | null;
    attachment_url?: string | null;
    /** Soft-delete via CANCELLED is available for this row. */
    can_cancel?: boolean;
    /** Custom dashboard process widget title (e.g. Wedding). */
    process_label?: string | null;
}

export interface OperationsLiveLanePagination {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
}

export interface OperationsLiveResponse {
    restaurant_name: string;
    counts: { pending: number; in_progress: number; completed: number };
    pending: OperationsLiveItem[];
    in_progress: OperationsLiveItem[];
    completed: OperationsLiveItem[];
    pagination?: {
        pending: OperationsLiveLanePagination;
        in_progress: OperationsLiveLanePagination;
        completed: OperationsLiveLanePagination;
    };
    filter_options?: {
        categories: string[];
        staff: string[];
    };
    generated_at: string;
}

/** Bucket id served by GET /api/dashboard/category-tasks/. */
export type CategoryTaskBucket =
    | 'urgent'
    | 'human_resources'
    | 'finance'
    | 'maintenance'
    | 'meetings'
    | 'operations'
    | 'purchase_orders'
    | 'miscellaneous'
    | 'team_travel'
    | 'team_medical_service';

export type WidgetDropTarget =
    | CategoryTaskBucket
    | "tasks_demands"
    | `custom:${string}`;

/** Active tab on the destination widget when a row is dropped. */
export type WidgetDropColumn =
    | "pending"
    | "in_progress"
    | "completed"
    | "open"
    | "done";

export interface CategoryTasksResponse {
    bucket: CategoryTaskBucket;
    /** Canonical staff/dashboard category slugs that feed this bucket. */
    categories: string[];
    items: DashboardTaskDemandItem[];
    completed: DashboardTaskDemandItem[];
    /**
     * Coarse counts (``open / in_progress / completed``) drive the filter
     * chips. The granular fields (``overdue / waiting_on / escalated /
     * new``) are best-effort - counted from the trimmed top-N items and
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
    /** True when Meta rejected our platform token (ops must rotate WHATSAPP_ACCESS_TOKEN). */
    whatsapp_platform_issue?: boolean;
    /** In-app notifications delivered (same as announcement fan-out count). */
    notified_count?: number;
    /** Single-recipient sends: name + digits-only phone Meta accepted. */
    recipient_name?: string | null;
    recipient_phone?: string | null;
    /** Echo of targeting mode + filters for analytics / toasts. */
    audience?: {
        mode: string;
        recipient_user_id?: string;
        recipient_user_ids?: string[];
        recipient_count?: number;
        tags?: string[];
        departments?: string[];
        roles?: string[];
    };
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

/** Tasks bound to a custom dashboard tile. */
export interface CustomWidgetTasksResponse {
    widget_id: string;
    title: string;
    items: DashboardTaskDemandItem[];
    pending: DashboardTaskDemandItem[];
    in_progress: DashboardTaskDemandItem[];
    completed: DashboardTaskDemandItem[];
    counts: {
        open: number;
        in_progress: number;
        completed: number;
        pending: number;
    };
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
    status:
      | 'DRAFT'
      | 'SUBMITTED'
      | 'UNDER_REVIEW'
      | 'PENDING_APPROVAL'
      | 'APPROVED'
      | 'REJECTED'
      | 'RETURNED'
      | 'OPEN'
      | 'PAYMENT_IN_PROGRESS'
      | 'PAID'
      | 'PAYMENT_FAILED'
      | 'VOIDED'
      | 'ARCHIVED';
    category?: string;
    notes?: string;
    photo?: string | null;
    attachment?: string | null;
    attachment_url?: string;
    attachment_content_type?: string;
    attachment_filename?: string;
    has_attachment?: boolean;
    photo_url?: string;
    proof_of_payment?: string | null;
    proof_of_payment_url?: string;
    returned_reason?: string;
    lifecycle_status?: string;
    paid_at?: string | null;
    paid_amount?: string | null;
    payment_method?: string;
    payment_reference?: string;
    created_by?: string | null;
    created_by_name?: string;
    paid_by?: string | null;
    paid_by_name?: string;
    approval_status?: string;
    is_overdue: boolean;
    days_until_due: number | null;
    created_at: string;
    updated_at: string;
}

export interface InvoiceTimelineEvent {
    id: string;
    kind: "audit" | "approval_step";
    event_type: string;
    at: string;
    actor: string;
    channel: string;
    summary: string;
    metadata?: Record<string, unknown>;
}

/** Row shape served by GET /api/dashboard/meetings-reminders/. Thin by design
 * so the widget can render without a second call - the full event detail
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
    /** Widget pill vocabulary - mapped from event time + color on the backend. */
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
    /** ISO timestamp of last Google pull (when connected). */
    last_sync_at?: string | null;
    sync_mode?: string | null;
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
    method: "self" | "manager_override" | "whatsapp_geo";
    /** WhatsApp geo-clocking: site name and on-site photo (proof of presence). */
    site?: string | null;
    photo_url?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    location: { id: string; name: string } | null;
    /** Geolocation Clock-In proof review: "flagged" waits for a manager. */
    review_status?: "ok" | "flagged" | "approved" | "rejected" | "manual" | null;
    flags?: string[];
    /** Why it was flagged, in the viewer's language. */
    flag_labels?: string;
    /** Same reasons, a few words each, for compact cards. */
    flag_short?: string;
    /** "flow_camera" = camera-only selfie; "chat_photo" = normal photo (could be from the gallery). */
    selfie_source?: "flow_camera" | "chat_photo" | null;
    reviewed_by?: string | null;
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
        /** Total clock-in events today across the whole tenant - lets the
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
    par_level?: number;
    stock_value?: number;
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

export interface SupplierPriceQuote {
    id: string;
    itemName: string;
    price: string;
    unit: string;
    currency: string;
    recordedAt?: string | null;
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
    delivery_days?: number[];
    order_cutoff?: string | null;
    min_order_amount?: number;
    prices?: SupplierPriceQuote[];
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
    has_provider_subscription?: boolean;
    payment_provider?: {
        id: string;
        configured: boolean;
        reason: string;
    };
    billing_interval: "" | "month" | "year";
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    trial_ends_at: string | null;
    plan: SubscriptionPlan | null;
    pending_plan?: SubscriptionPlan | null;
    pending_billing_interval?: string;
}

export type CheckoutUpgradeResult = {
    action: "redirect" | "updated" | "queued";
    url: string | null;
    provider?: string;
    message?: string;
    subscription_id?: number;
};

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
    usage?: { staff: number };
    plan: SubscriptionPlan | null;
}

// ── HR staff file (Mizan_BE apps.people) ──────────────────────────────────

export type StaffDocumentCategory = "ID" | "CONTRACT" | "CERTIFICATE" | "MEDICAL" | "JUSTIFICATION" | "PAYSLIP" | "OTHER";
export type StaffAbsenceReason = "CHILD_SICK" | "DOCTOR" | "SICK" | "DEATH_FAMILY" | "FAMILY_EMERGENCY" | "TRANSPORT" | "OTHER";
export type StaffAbsenceStatus = "REPORTED" | "JUSTIFIED" | "EXCUSED" | "UNJUSTIFIED";
export type StaffNoteKind = "NOTE" | "PRAISE" | "WARNING";

export interface StaffHRDocument {
    id: string;
    staffId: string;
    category: StaffDocumentCategory;
    categoryLabel: string;
    title: string;
    url: string;
    mimeType: string;
    sizeBytes: number;
    expiresAt: string | null;
    source: string;
    createdAt: string;
}

export interface StaffAbsence {
    id: string;
    staffId: string;
    staffName: string;
    startDate: string;
    endDate: string;
    reason: StaffAbsenceReason;
    reasonLabel: string;
    note: string;
    status: StaffAbsenceStatus;
    justified: boolean;
    justification: StaffHRDocument | null;
    reportedVia: string;
    reviewedAt: string | null;
    createdAt: string;
}

export interface MonthlyAttendanceRow {
    staffId: string;
    name: string;
    role: string;
    scheduled_shifts: number;
    days_present: number;
    attendance_rate: number | null;
    late_count: number;
    late_minutes: number;
    absent_days: number;
    absences_justified: number;
    absences_pending: number;
    absences_unjustified: number;
    absent_unreported: number;
    leave_days: number;
    hours: number;
}

export interface MonthlyAttendance {
    month: string;
    from: string;
    to: string;
    totals: Omit<MonthlyAttendanceRow, "staffId" | "name" | "role" | "attendance_rate" | "absent_days">;
    staff: MonthlyAttendanceRow[];
}

export type PresenceStatus =
    | "on_time" | "late" | "not_yet_in" | "absent_unreported" | "absent_reported"
    | "absent_justified" | "on_leave" | "unscheduled_in" | "upcoming";

export interface DayPresenceRow {
    staffId: string;
    name: string;
    role: string;
    status: PresenceStatus;
    shiftStart: string;
    shiftEnd: string;
    clockIn: string;
    lateMinutes: number;
    site: string;
    photoUrl: string;
    hours: number;
    absence: StaffAbsence | null;
}

export interface DayPresence {
    date: string;
    summary: Record<string, number>;
    staff: DayPresenceRow[];
}

export interface StaffHRFile {
    id: string;
    identity: { firstName: string; lastName: string; name: string; role: string; roleLabel: string; isActive: boolean; language: string };
    contact: { email: string; phone: string; whatsapp: string };
    personal: Record<string, unknown>;
    employment: Record<string, unknown>;
    compensation: Record<string, unknown>;
    skills: Record<string, unknown>;
    tenureDays: number | null;
    contractEndsInDays: number | null;
    locations: { id: string; name: string; isPrimary: boolean }[];
    leave: { year: number; entitlementDays: number; usedDays: number; pendingDays: number; remainingDays: number; upcoming: { from: string; to: string; days: number }[] };
    attendanceThisMonth: MonthlyAttendanceRow | null;
    today: DayPresenceRow | null;
    absences: StaffAbsence[];
    documents: StaffHRDocument[];
    upcomingShifts: { date: string; start: string; end: string; role: string }[];
    work: { openTasks: number; tasksCompleted30d: number; incidentsReported30d: number; openIncidentsAssigned: number; openRequests: number };
    notes: { id: string; kind: StaffNoteKind; body: string; author: string; createdAt: string }[];
    sensitiveHidden: boolean;
}

// ── Finance (Mizan_BE apps.finance.pnl) ───────────────────────────────────

export type FinancePeriod = "month" | "last_month" | "week" | "7d" | "30d";
export const COST_CATEGORIES = [
    "FOOD", "BEVERAGE", "SUPPLIES", "CLEANING", "UTILITIES", "RENT", "MAINTENANCE", "EQUIPMENT", "MARKETING",
    "SERVICES", "OTHER",
] as const;

export interface FinanceRatios {
    food_cost_pct: number | null;
    labor_pct: number | null;
    prime_cost_pct: number | null;
    gross_margin_pct: number | null;
    net_margin_pct: number | null;
}

export interface FinancePnL {
    period: { from: string; to: string; days: number };
    currency: string;
    revenue: { total: number; pos_sales: number; mizan_orders: number };
    cogs: { total: number; food: number; beverage: number };
    gross_profit: number;
    labor: { total: number; floor: number; management: number; floor_hours: number;
             by_person?: { name: string; hours: number; cost: number }[] };
    overheads: { total: number; by_category: Record<string, number> };
    waste: { estimated_cost: number; unpriced_events: number };
    prime_cost: number;
    net_profit: number;
    ratios: FinanceRatios;
    top_vendors: { vendor: string; amount: number }[];
    daily: { date: string; revenue: number; costs: number }[];
    gaps: { key: string; detail: string; count?: number }[];
    previous?: Pick<FinancePnL, "period" | "revenue" | "cogs" | "labor" | "net_profit" | "ratios">;
}

export interface FinancePayables {
    total_open: number;
    buckets: Record<"overdue" | "due_7d" | "due_30d" | "later", { amount: number; count: number }>;
    awaiting_approval: number;
    paid_last_30d: number;
}

// ── Inventory ledger (Mizan_BE apps.inventory.stock) ──────────────────────

export interface InventorySummary {
    currency: string;
    stockValue: number;
    stockValueByCategory: Record<string, number>;
    itemsWithoutCost: number;
    wasteCost30d: number;
    onOrderValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    itemCount: number;
}

export interface StockCountReport {
    reference: string;
    itemsCounted: number;
    itemsWithVariance: number;
    varianceValue: number;
    lines: { itemId: string; name: string; unit: string; expected: number; counted: number; variance: number; varianceValue: number }[];
}

export interface ReorderLine {
    itemId: string;
    name: string;
    unit: string;
    onHand: number;
    reorderPoint: number;
    parLevel: number;
    suggestedQuantity: number;
    unitPrice: number;
    estimatedCost: number;
    dailyDemand: number | null;
    isLow: boolean;
}

export interface ReorderSuggestions {
    itemCount: number;
    groups: { supplierId: string | null; supplierName: string | null; estimatedTotal: number; lines: ReorderLine[] }[];
}

// ── Accountability (Mizan_BE apps.operations.scorecard) ───────────────────

export interface AccountabilityPerson {
    staffId: string;
    name: string;
    role: string;
    assigned: number;
    completed: number;
    onTime: number;
    late: number;
    onTimePct: number | null;
    open: number;
    openOverdue: number;
    nudges: number;
    nudgesPerTask: number;
    blocked: number;
    sentBack: number;
    escalated: number;
    medianAckMinutes: number | null;
    medianCompleteHours: number | null;
    incidentsResolved: number;
    incidentResolutionHours: number | null;
    flags: ("overdue" | "often_late" | "needs_chasing" | "often_blocked")[];
}

export interface AccountabilityScorecard {
    days: number;
    team: { onTimePct: number | null; completed: number; openOverdue: number; unassigned: number; blocked: number;
            awaitingValidation: number; escalatedOpen: number };
    people: AccountabilityPerson[];
}

export interface NeedsAttentionItem {
    kind: "blocked" | "overdue" | "unassigned" | "validate";
    taskId: string;
    title: string;
    who?: string;
    reason?: string;
    due?: string | null;
    since?: string | null;
    nudges?: number;
    escalationLevel?: number;
    proof?: string | null;
}

/** Approvals engine (Operations → Approvals, WhatsApp buttons, Miya). */
export type ApprovalKind =
    | "purchase"
    | "expense"
    | "salary_advance"
    | "overtime"
    | "discount"
    | "purchase_order"
    | "invoice"
    | "time_off"
    | "shift_swap"
    | "contract"
    | "other";

export interface ApprovalStep {
    approverId: string;
    approverName: string;
    status: "waiting" | "approved" | "rejected";
    decidedByName?: string;
    decidedAt?: string | null;
    note?: string;
    escalatedFrom?: string;
    signature?: { name: string; via: string; at: string };
}

export interface ApprovalEventRow {
    kind: string;
    actor: string;
    note: string;
    via: string;
    at: string;
}

export interface ApprovalRow {
    id: string;
    code: string;
    kind: ApprovalKind;
    kindLabel: string;
    title: string;
    notes: string;
    amount: string;
    currency: string;
    status: "pending" | "approved" | "rejected" | "cancelled";
    requestedBy: string;
    requestedById: string | null;
    assignedTo: string;
    assignedToId: string | null;
    decidedBy: string;
    decisionNotes: string;
    steps: ApprovalStep[];
    stepIndex: number;
    evidenceUrl: string;
    source: string;
    createdAt: string | null;
    decidedAt: string | null;
    dueAt: string | null;
    overdue: boolean;
    hoursPending: number | null;
    canDecide: boolean;
    /** The rule makes approvers sign (typed full name + consent) instead of just approving. */
    needsSignature?: boolean;
    signatures?: { name: string; via: string; at: string; userId: string; step: number }[];
    events?: ApprovalEventRow[];
}

export interface ApprovalsListResponse {
    approvals: ApprovalRow[];
    counts: { mine: number; pending: number; requested: number };
}

export type ApprovalStepSpec =
    | { kind: "owner" }
    | { kind: "manager" }
    | { kind: "role"; role: string }
    | { kind: "user"; user_id: string };

export interface ApprovalRule {
    enabled: boolean;
    auto_approve_below: string | null;
    sla_hours: number;
    max_reminders: number;
    sign_on_approve?: boolean;
    tiers: { max_amount: string | null; steps: ApprovalStepSpec[] }[];
}

export type SignatureStatus = "draft" | "approval" | "sent" | "completed" | "declined" | "voided" | "expired";

export interface SignatureSigner {
    id: string;
    name: string;
    role: "signer" | "copy";
    order: number;
    status: "waiting" | "sent" | "viewed" | "signed" | "declined";
    phone: string;
    isTeam: boolean;
    isCurrent: boolean;
    signedAt: string | null;
    viewedAt: string | null;
    typedName: string;
    declineReason: string;
    reminders: number;
    /** WhatsApp refused the invitation (wrong number, or no open chat and no template). */
    undelivered: boolean;
    canSignHere: boolean;
}

export interface SignatureEventRow {
    kind: string;
    label: string;
    who: string;
    at: string;
    localTime: string;
    detail: { reason?: string; via?: string; question?: string };
    hash: string;
}

export interface SignatureRequestRow {
    id: string;
    code: string;
    ref: string;
    title: string;
    kind: string;
    message: string;
    status: SignatureStatus;
    ordered: boolean;
    pages: number;
    documentUrl: string;
    sealedUrl: string;
    documentSha256: string;
    sealedSha256: string;
    createdBy: string;
    createdAt: string;
    sentAt: string | null;
    completedAt: string | null;
    expiresAt: string | null;
    remindEveryDays: number;
    voidedReason: string;
    approval: { id: string; code: string; status: string } | null;
    verifyUrl: string;
    signers: SignatureSigner[];
    events?: SignatureEventRow[];
    chainOk?: boolean;
}

export interface SignatureVerifyRecord {
    ref: string;
    title: string;
    business: string;
    status: SignatureStatus;
    pages: number;
    documentSha256: string;
    sealedSha256: string;
    completedAt: string | null;
    timezone: string;
    chainOk: boolean;
    signers: { name: string; status: string; signedAt: string | null; verifiedBy: string }[];
}

export interface ApprovalTypeInfo {
    key: ApprovalKind;
    label: string;
    labelFr: string;
    money: boolean;
    module: string | null;
    available: boolean;
    ownerCategory: string | null;
}

export interface ApprovalRulesResponse {
    rules: Record<ApprovalKind, ApprovalRule>;
    types: ApprovalTypeInfo[];
    staff: { id: string; name: string; role: string }[];
    canEdit: boolean;
}
