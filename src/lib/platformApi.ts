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
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const b = body as {
      error?: string;
      detail?: string | string[];
      [key: string]: unknown;
    };
    let msg = b.error || (typeof b.detail === "string" ? b.detail : null);
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
};
