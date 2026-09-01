import { API_BASE } from "@/lib/api";

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("access_token") || "";
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function platformFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/platform${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers || {}) },
  });
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const err = new Error(
      "Platform API returned a non-JSON response. Check VITE_BACKEND_URL / API proxy configuration.",
    ) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const b = body as {
      error?: string;
      detail?: string | string[];
      [key: string]: unknown;
    };
    let msg =
      b.error ||
      (typeof b.message === "string" ? b.message : null) ||
      (typeof b.detail === "string" ? b.detail : null);
    if (!msg && Array.isArray(b.detail)) msg = b.detail.join(" ");
    if (!msg) {
      // DRF field errors: { plan: ["…"], reason: ["…"] }
      const parts = Object.entries(b)
        .filter(([k, v]) => k !== "error" && Array.isArray(v))
        .map(([k, v]) => `${k}: ${(v as string[]).join(" ")}`);
      if (parts.length) msg = parts.join("; ");
    }
    const err = new Error(msg || `Request failed (${res.status})`) as Error & {
      status?: number;
    };
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export type MiyaConversationMetrics = {
  conversations_today: number;
  active_now: number;
  needs_review: number;
  errors: number;
  avg_response_time_ms: number;
  avg_response_time_label: string;
  whatsapp_conversations?: number;
  dashboard_conversations?: number;
  proactive_conversations?: number;
  staff_conversations?: number;
  manager_conversations?: number;
  admin_conversations?: number;
  miya_actions?: number;
  miya_errors?: number;
  fallback_turns?: number;
  overall_quality_score?: number | null;
  correct_turns?: number;
  partial_turns?: number;
  unknown_turns?: number;
  not_evaluated_turns?: number;
  failed_quality_turns?: number;
  critical_failures?: number;
  quality_needs_review?: number;
  execution_success_rate?: number | null;
  verification_success_rate?: number | null;
  entity_resolution_success_rate?: number | null;
  response_consistency_rate?: number | null;
  follow_up_success_rate?: number | null;
  failure_sources?: Array<{ category: string; count: number; pct: number }>;
  quality_coverage?: {
    rate: number | null;
    label: string;
    assessed: number;
    eligible: number;
    warning?: boolean;
  };
  quality_monitoring?: {
    evaluation_success_count: number;
    evaluation_failure_count: number;
    unknown_count: number;
    turns_without_quality: number;
    avg_evaluation_latency_ms: number;
    evaluator_version: string;
  };
};

export type MiyaConversationUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
};

export type MiyaConversationRestaurant = {
  id: string;
  name: string;
};

export type MiyaQualityAssessment = {
  overall_score: number;
  overall_status: string;
  confidence?: number;
  dimension_scores?: Array<{
    dimension: string;
    status: string;
    score: number;
    confidence?: number;
  }>;
  evidence?: Array<{
    dimension: string;
    status: string;
    confidence?: number;
    source?: string;
    reason?: string;
  }>;
  failures?: Array<{
    code: string;
    severity: string;
    category: string;
    reason: string;
    source?: string;
  }>;
  warnings?: string[];
  outcome?: string;
  review_required?: boolean;
  critical_failure_count?: number;
  overall_state?: string;
  assessment_version?: string;
  evaluation_error?: string;
  evaluation_reason?: string;
  evaluated_at?: string;
  previous_assessments?: Array<Record<string, unknown>>;
};

export type MiyaHumanReview = {
  id: string;
  status: string;
  reason?: string;
  failure_category?: string;
  severity?: string;
  notes?: string;
  created_at: string;
};

export type MiyaConversationListItem = {
  id: string;
  conversation_id: string;
  user: MiyaConversationUser | null;
  restaurant: MiyaConversationRestaurant | null;
  channel: string;
  channel_label?: string;
  last_message_preview: string;
  last_message_at: string | null;
  started_at: string | null;
  status: string;
  health: string;
  turn_count: number;
  quality_score?: number | null;
  quality_status?: string;
  quality_failure_preview?: string;
  quality_state?: string;
  has_critical_failure?: boolean;
  session_only?: boolean;
};

export type MiyaConversationTurn = {
  id: string;
  message_id: string;
  role?: string;
  direction?: "inbound" | "outbound" | "exchange" | string;
  user_message?: string;
  miya_reply?: string;
  content?: string;
  created_at: string;
  is_proactive: boolean;
  proactive_meta?: Record<string, unknown>;
  attachments?: Array<{
    id: string;
    title?: string;
    mime_type?: string;
    url?: string;
    category?: string;
  }>;
  understanding?: {
    summary?: string;
    entity?: { type?: string; id?: string; label?: string };
    action?: string;
    target?: string;
    resolution_state?: string;
    action_pipeline?: Array<{ stage: string; detail?: string }>;
    proactive_pipeline?: Array<{ stage: string; detail?: string }>;
  };
  actions?: Array<{
    tool: string;
    label: string;
    success: boolean;
    verified?: boolean;
    reason?: string;
  }>;
  health?: string;
  review_signals?: Array<{ level: string; code: string; label: string }>;
  quality?: MiyaQualityAssessment | null;
  quality_score?: number | null;
  quality_status?: string;
  quality_state?: string;
  human_reviews?: MiyaHumanReview[];
  trace?: Record<string, unknown>;
  focus_snapshot?: Record<string, unknown>;
  conversation_status?: string;
  runtime_path?: string;
  session_only?: boolean;
};

export type MiyaConversationDetail = {
  id: string;
  conversation_id: string;
  user: MiyaConversationUser | null;
  restaurant: MiyaConversationRestaurant | null;
  channel: string;
  started_at: string;
  last_message_at: string;
  status: string;
  health: string;
  context: {
    active_entity?: { type?: string; id?: string; label?: string };
    recent_entities?: Array<{ type?: string; id?: string; label?: string }>;
    working_set?: unknown[];
    last_actionable_entity?: Record<string, unknown>;
    last_action?: Record<string, unknown>;
    language?: string;
    language_source?: string;
    proactive_focus?: Record<string, unknown>;
    conversation_state?: string;
  };
  reviews: Array<{
    id: string;
    status: string;
    reason: string;
    notes: string;
    created_at: string;
    reviewer_id?: string | null;
  }>;
  turn_count: number;
  session_only?: boolean;
};

export type MiyaConversationFilters = {
  channels: string[];
  roles: string[];
  statuses: string[];
  health: string[];
  quality?: string[];
  failure_categories?: string[];
  date_presets: string[];
};

export type PlatformMe = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_superuser: boolean;
  is_platform_operator?: boolean;
};

export type GrowthPoint = {
  date: string;
  label: string;
  new: number;
  cumulative: number;
};

export type PlatformOverview = {
  restaurants: number;
  users_active: number;
  staff_active: number;
  managers_active?: number;
  subscriptions_by_status: Record<string, number>;
  subscriptions_active: number;
  trials_ending_7d: number;
  mrr_estimate: number;
  deltas?: {
    users_wow: number;
    tenants_wow: number;
    users_new_this_week: number;
    tenants_new_this_week: number;
  };
  growth?: {
    weekly: { users: GrowthPoint[]; tenants: GrowthPoint[] };
    monthly: { users: GrowthPoint[]; tenants: GrowthPoint[] };
  };
  health: {
    whatsapp_configured: boolean;
    agent_bridge_configured?: boolean;
    /** @deprecated */
    lua_webhook_configured: boolean;
    stripe_configured?: boolean;
  };
  payments?: {
    stripe_available: boolean;
    note: string;
  };
};

export type PlatformTenant = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  country_code?: string;
  currency?: string;
  language?: string;
  timezone?: string;
  restaurant_type?: string;
  pos_provider?: string;
  pos_is_connected?: boolean;
  created_at: string;
  updated_at: string;
  staff_count: number;
  subscription_status?: string | null;
  subscription_plan?: string | null;
  suspended: boolean;
  deactivated?: boolean;
  onboarding_done: boolean;
  address?: string;
  owner?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    phone?: string;
    is_active: boolean;
  } | null;
  locations?: Array<{ id: string; name: string; is_primary: boolean; is_active: boolean }>;
  subscription?: {
    id: number;
    status: string;
    plan?: string | null;
    plan_id?: number | null;
    tier?: string | null;
    effective_tier?: string | null;
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
    billing_interval?: string;
    current_period_start?: string | null;
    current_period_end?: string | null;
    trial_ends_at?: string | null;
    cancel_at_period_end?: boolean;
    price_monthly?: string | null;
    last_plan_change?: {
      from_plan?: string | null;
      from_tier?: string | null;
      to_plan?: string | null;
      to_tier?: string | null;
      reason?: string;
      by_email?: string;
      at?: string;
    } | null;
  } | null;
  staff?: Array<{
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    phone?: string;
    is_active: boolean;
  }>;
  recent_audit?: Array<{
    id: string;
    timestamp: string;
    action_type: string;
    description: string;
    user_email: string | null;
  }>;
  general_settings?: Record<string, unknown>;
  onboarding_completed_at?: string | null;
};

export type PlatformUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone?: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  is_platform_operator?: boolean;
  is_locked?: boolean;
  failed_login_attempts?: number;
  account_locked_until?: string | null;
  restaurant?: string | null;
  restaurant_name?: string | null;
  created_at: string;
};

export type PlatformSubscription = {
  id: number;
  restaurant_id: string;
  restaurant_name: string;
  plan: number | null;
  plan_name: string | null;
  plan_tier: string | null;
  status: string;
  billing_interval: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  cancel_at_period_end: boolean;
};

export type PlatformPlan = {
  id: number;
  name: string;
  slug: string;
  tier: string;
  price: string;
  price_monthly: string | null;
  currency: string;
  is_active: boolean;
};

export type PlatformHealthItem = {
  id: string;
  label: string;
  ok: boolean;
  kind: "config" | "runtime" | "optional" | string;
  required?: boolean;
  message: string;
};

export type PlatformHealth = {
  ok: boolean;
  status?: "ok" | "degraded" | string;
  summary?: string;
  checks: Record<string, boolean>;
  items?: PlatformHealthItem[];
  payments?: {
    note: string;
    stripe_available: boolean;
  };
  details: Record<string, unknown>;
};

export type PlatformAuditRow = {
  id: string;
  timestamp: string;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  description: string;
  user_email: string | null;
  restaurant: string | null;
  restaurant_name: string | null;
};

export type Paginated<T> = {
  count: number;
  page?: number;
  page_size?: number;
  results: T[];
};

export type PlatformWhatsAppConfig = {
  phone_number_id: string;
  business_account_id: string;
  verify_token: string;
  activation_phone: string;
  api_version: string;
  access_token_set: boolean;
  access_token_masked: string;
  webhook_callback_url: string;
  connected: boolean;
  disconnected?: boolean;
  disconnected_at?: string | null;
  last_probe_at: string | null;
  last_probe_ok: boolean | null;
  last_probe_message: string;
  display_phone_number: string;
  verified_name: string;
  config_source?: string;
  updated_at: string | null;
};

export type PlatformWhatsAppTemplate = {
  id: string;
  meta_id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  body_text: string;
  footer_text: string;
  header_text: string;
  synced_at: string | null;
};

export type PlatformWhatsAppPhoneOption = {
  phone_number_id: string;
  display_phone_number: string;
  verified_name: string;
  business_account_id: string;
  business_account_name: string;
};

export type PlatformWhatsAppTestResult = {
  ok: boolean;
  reason?: string;
  message?: string;
  display_phone_number?: string;
  verified_name?: string;
  assigned_waba_count?: number;
  available_phone_numbers?: PlatformWhatsAppPhoneOption[];
  suggested_phone_number_id?: string;
  suggested_business_account_id?: string;
  fix_steps?: string[];
  auto_corrected?: boolean;
  config?: PlatformWhatsAppConfig;
};

export const platformApi = {
  me: () => platformFetch<PlatformMe>("/me/"),
  overview: () => platformFetch<PlatformOverview>("/overview/"),
  tenants: (params?: Record<string, string>) => {
    const qs = new URLSearchParams(params || {}).toString();
    return platformFetch<Paginated<PlatformTenant>>(`/tenants/${qs ? `?${qs}` : ""}`);
  },
  tenant: (id: string) => platformFetch<PlatformTenant>(`/tenants/${id}/`),
  patchTenant: (id: string, body: Record<string, unknown>) =>
    platformFetch<PlatformTenant>(`/tenants/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  createTenant: (body: Record<string, unknown>) =>
    platformFetch<PlatformTenant>("/tenants/", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  users: (params?: Record<string, string>) => {
    const qs = new URLSearchParams(params || {}).toString();
    return platformFetch<Paginated<PlatformUser>>(`/users/${qs ? `?${qs}` : ""}`);
  },
  user: (id: string) => platformFetch<PlatformUser>(`/users/${id}/`),
  patchUser: (id: string, body: Record<string, unknown>) =>
    platformFetch<PlatformUser>(`/users/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  unlockUser: (id: string) =>
    platformFetch<PlatformUser>(`/users/${id}/unlock/`, { method: "POST", body: "{}" }),
  resetUserPassword: (id: string, password: string) =>
    platformFetch<{ message: string; user: PlatformUser }>(`/users/${id}/reset-password/`, {
      method: "POST",
      body: JSON.stringify({ password }),
    }),
  operators: () =>
    platformFetch<{ count: number; results: PlatformUser[] }>("/operators/"),
  operator: (id: string) => platformFetch<PlatformUser>(`/operators/${id}/`),
  createOperator: (body: {
    email: string;
    first_name?: string;
    last_name?: string;
    password: string;
    is_superuser?: boolean;
  }) =>
    platformFetch<PlatformUser>("/operators/", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchOperator: (id: string, body: Record<string, unknown>) =>
    platformFetch<PlatformUser>(`/operators/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  subscriptions: (params?: Record<string, string>) => {
    const qs = new URLSearchParams(params || {}).toString();
    return platformFetch<Paginated<PlatformSubscription>>(
      `/billing/subscriptions/${qs ? `?${qs}` : ""}`,
    );
  },
  patchSubscription: (id: number, body: Record<string, unknown>) =>
    platformFetch<PlatformSubscription>(`/billing/subscriptions/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  plans: () => platformFetch<PlatformPlan[]>("/billing/plans/"),
  health: () => platformFetch<PlatformHealth>("/health/"),
  audit: (params?: Record<string, string>) => {
    const qs = new URLSearchParams(params || {}).toString();
    return platformFetch<Paginated<PlatformAuditRow>>(`/audit/${qs ? `?${qs}` : ""}`);
  },
  impersonate: (restaurantId: string) =>
    platformFetch<{
      access: string;
      refresh: string;
      user: Record<string, string>;
      restaurant: { id: string; name: string };
      impersonated_by: { id: string; email: string };
    }>("/impersonate/", {
      method: "POST",
      body: JSON.stringify({ restaurant_id: restaurantId }),
    }),
  whatsappConfig: () => platformFetch<PlatformWhatsAppConfig>("/whatsapp/config/"),
  saveWhatsAppConfig: (body: Record<string, unknown>) =>
    platformFetch<PlatformWhatsAppConfig>("/whatsapp/config/", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  testWhatsAppConnection: (body?: Record<string, unknown>) =>
    platformFetch<PlatformWhatsAppTestResult>("/whatsapp/config/test/", {
      method: "POST",
      body: JSON.stringify(body || {}),
    }),
  disconnectWhatsApp: () =>
    platformFetch<PlatformWhatsAppConfig>("/whatsapp/config/disconnect/", {
      method: "POST",
      body: "{}",
    }),
  whatsappTemplates: () =>
    platformFetch<{ results: PlatformWhatsAppTemplate[] }>("/whatsapp/templates/"),
  syncWhatsAppTemplates: () =>
    platformFetch<{ ok: boolean; synced?: number; results: PlatformWhatsAppTemplate[] }>(
      "/whatsapp/templates/sync/",
      { method: "POST", body: "{}" },
    ),
  createWhatsAppTemplate: (body: Record<string, unknown>) =>
    platformFetch<{ results: PlatformWhatsAppTemplate[] }>("/whatsapp/templates/", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteWhatsAppTemplate: (id: string) =>
    platformFetch<void>(`/whatsapp/templates/${id}/`, { method: "DELETE" }),

  agentConversationMetrics: (params?: Record<string, string>) => {
    const qs = new URLSearchParams(params || {}).toString();
    return platformFetch<MiyaConversationMetrics>(
      `/agent/conversations/metrics/${qs ? `?${qs}` : ""}`,
    );
  },
  agentConversationFilters: () =>
    platformFetch<MiyaConversationFilters>("/agent/conversations/filters/"),
  agentConversations: (params?: Record<string, string>) => {
    const qs = new URLSearchParams(params || {}).toString();
    return platformFetch<Paginated<MiyaConversationListItem>>(
      `/agent/conversations/${qs ? `?${qs}` : ""}`,
    );
  },
  agentConversation: (id: string) =>
    platformFetch<MiyaConversationDetail>(`/agent/conversations/${encodeURIComponent(id)}/`),
  agentConversationTurns: (id: string, params?: Record<string, string>) => {
    const qs = new URLSearchParams(params || {}).toString();
    return platformFetch<Paginated<MiyaConversationTurn>>(
      `/agent/conversations/${encodeURIComponent(id)}/turns/${qs ? `?${qs}` : ""}`,
    );
  },
  agentConversationQuality: (
    id: string,
    body: {
      status: string;
      reason?: string;
      notes?: string;
      turn_id?: string;
      failure_category?: string;
      severity?: string;
    },
  ) =>
    platformFetch<{
      id: string;
      status: string;
      reason: string;
      notes: string;
      failure_category?: string;
      severity?: string;
      created_at: string;
    }>(`/agent/conversations/${encodeURIComponent(id)}/quality/`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  agentConversationReEvaluate: (id: string, body?: { turn_id?: string }) =>
    platformFetch<{ ok: boolean; turn_id?: string; quality?: MiyaQualityAssessment }>(
      `/agent/conversations/${encodeURIComponent(id)}/quality/re-evaluate/`,
      { method: "POST", body: JSON.stringify(body || {}) },
    ),

};
