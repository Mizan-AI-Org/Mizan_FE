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
    const raw = await res.text().catch(() => "");
    let hint = "Check that the Django backend is running on port 8000 and has been restarted.";
    if (res.status === 404) {
      hint = "Endpoint not found — restart the backend after pulling latest changes.";
    } else if (res.status >= 500) {
      hint = "Server error — check Django logs for details.";
    } else if (raw.includes("ECONNREFUSED") || res.status === 502 || res.status === 503) {
      hint = "Cannot reach the backend — start it with `python manage.py runserver`.";
    }
    const err = new Error(
      `Platform API returned a non-JSON response (${res.status}). ${hint}`,
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
  metadata?: Record<string, unknown>;
};

export type PlatformAgentTurn = {
  id: string;
  created_at: string;
  restaurant: string;
  restaurant_name: string;
  user: string | null;
  user_email: string | null;
  channel: string;
  input_text: string;
  interpreted_intent: string;
  confidence_score: number;
  confidence_level: string;
  primary_capability: string;
  execution_success: boolean | null;
  execution_verified: boolean | null;
  execution_error_code: string;
  response_text: string;
  total_ms: number;
  conversation_id: string;
  thread_id: string;
  deploy_version: string;
  user_thumbs_up: boolean | null;
};

export type PlatformAgentTurnDetail = PlatformAgentTurn & {
  capabilities_selected: string[];
  interpretation_source: string;
  interpretation_ms: number;
  execution_ms: number;
  token_input: number;
  token_output: number;
  estimated_cost_usd: number;
  request_id: string;
  run_metadata: Record<string, unknown>;
  user_feedback_text: string;
  capability_executions: Array<{
    id: string;
    capability_name: string;
    execution_success: boolean | null;
    execution_error_code: string;
    authorization_result: string;
    total_ms: number;
    input_parameters: Record<string, unknown>;
    execution_result: Record<string, unknown>;
    created_at: string;
  }>;
  evaluation?: {
    quality_score: number;
    accuracy_score: number;
    helpfulness_score: number;
    safety_score: number;
    verification_rate: number;
    tools_called: unknown[];
    tools_succeeded: number;
    tools_failed: number;
  };
};

export type PlatformAgentConversation = {
  conversation_id: string;
  restaurant_id: string | null;
  restaurant_name: string | null;
  channel: string;
  turn_count: number;
  first_at: string;
  last_at: string;
  user_id: string | null;
  user_email: string | null;
  avg_confidence: number;
  success_count: number;
  fail_count: number;
};

export type PlatformAgentMetrics = {
  period_days: number;
  since: string;
  turns: {
    total: number;
    success: number;
    failed: number;
    success_rate: number | null;
    avg_confidence: number;
    avg_latency_ms: number;
    thumbs_up: number;
    thumbs_down: number;
  };
  by_channel: Array<{ channel: string; count: number; success: number }>;
  by_deploy_version: Array<{ deploy_version: string; count: number; success: number }>;
  top_intents: Array<{ interpreted_intent: string; count: number }>;
  evaluation: {
    count: number;
    avg_quality: number;
    avg_accuracy: number;
    avg_helpfulness: number;
    avg_safety: number;
    avg_verification_rate: number;
  };
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
  agentTurns: (params?: Record<string, string>) => {
    const qs = new URLSearchParams(params || {}).toString();
    return platformFetch<Paginated<PlatformAgentTurn>>(`/agent/turns/${qs ? `?${qs}` : ""}`);
  },
  agentTurn: (id: string) => platformFetch<PlatformAgentTurnDetail>(`/agent/turns/${id}/`),
  agentConversations: (params?: Record<string, string>) => {
    const qs = new URLSearchParams(params || {}).toString();
    return platformFetch<Paginated<PlatformAgentConversation>>(
      `/agent/conversations/${qs ? `?${qs}` : ""}`,
    );
  },
  agentConversation: (conversationId: string, params?: Record<string, string>) => {
    const qs = new URLSearchParams(params || {}).toString();
    return platformFetch<{
      conversation_id: string;
      restaurant_id: string | null;
      restaurant_name: string | null;
      channel: string;
      turn_count: number;
      turns: PlatformAgentTurn[];
    }>(`/agent/conversations/${encodeURIComponent(conversationId)}/${qs ? `?${qs}` : ""}`);
  },
  agentMetrics: (params?: Record<string, string>) => {
    const qs = new URLSearchParams(params || {}).toString();
    return platformFetch<PlatformAgentMetrics>(`/agent/metrics/${qs ? `?${qs}` : ""}`);
  },
  userActivity: (userId: string, params?: Record<string, string>) => {
    const qs = new URLSearchParams(params || {}).toString();
    return platformFetch<Paginated<PlatformAuditRow> & { user_id: string; user_email: string }>(
      `/users/${userId}/activity/${qs ? `?${qs}` : ""}`,
    );
  },
  userAgentTurns: (userId: string, params?: Record<string, string>) => {
    const qs = new URLSearchParams(params || {}).toString();
    return platformFetch<Paginated<PlatformAgentTurn>>(
      `/users/${userId}/agent-turns/${qs ? `?${qs}` : ""}`,
    );
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

};
