import { API_BASE } from "@/lib/api";

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("access_token") || "";
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

export type SocialOAuthStartResult = {
  authorization_url?: string;
  configured?: boolean;
  missing_env?: string[];
  docs_url?: string;
  dev_connect_available?: boolean;
};

export class SocialApiError extends Error {
  status: number;
  payload?: SocialOAuthStartResult;

  constructor(message: string, status: number, payload?: SocialOAuthStartResult) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

async function socialFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const payload = (body.data ?? undefined) as SocialOAuthStartResult | undefined;
    throw new SocialApiError(body.error || body.detail || `Request failed (${res.status})`, res.status, payload);
  }
  return (body.data ?? body) as T;
}

export type SocialOverview = {
  accounts: Array<Record<string, unknown>>;
  stats: Record<string, unknown>;
  upcoming: Array<Record<string, unknown>>;
  recent_activity: Array<Record<string, unknown>>;
  opportunities: Array<{
    id: string;
    title: string;
    detail: string;
    actions: string[];
  }>;
  platform_setup: Array<{
    platform: string;
    configured: boolean;
    missing_env: string[];
    docs_url: string;
    redirect_uri?: string;
    provider?: string;
    env_vars?: string[];
    setup_steps?: string[];
    tenant_steps?: string[];
  }>;
};

export const socialApi = {
  overview: () => socialFetch<SocialOverview>("/social/overview/"),
  listContent: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params)}` : "";
    return socialFetch<Array<Record<string, unknown>>>(`/social/content/${q}`);
  },
  getContent: (id: string) => socialFetch<Record<string, unknown>>(`/social/content/${id}/`),
  createContent: (payload: Record<string, unknown>) =>
    socialFetch<Record<string, unknown>>("/social/content/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateContent: (id: string, payload: Record<string, unknown>) =>
    socialFetch<Record<string, unknown>>(`/social/content/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  approveContent: (id: string) =>
    socialFetch<Record<string, unknown>>(`/social/content/${id}/approve/`, { method: "POST", body: "{}" }),
  publishContent: (id: string) =>
    socialFetch<Record<string, unknown>>(`/social/content/${id}/publish/`, { method: "POST", body: "{}" }),
  scheduleContent: (id: string, scheduled_at: string) =>
    socialFetch<Record<string, unknown>>(`/social/content/${id}/schedule/`, {
      method: "POST",
      body: JSON.stringify({ scheduled_at }),
    }),
  generate: (payload: Record<string, unknown>) =>
    socialFetch<Record<string, unknown>>("/social/generate/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  transform: (payload: Record<string, unknown>) =>
    socialFetch<{ content: string }>("/social/transform/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  accounts: () =>
    socialFetch<{
      accounts: Array<Record<string, unknown>>;
      platform_setup: SocialOverview["platform_setup"];
      dev_connect_available?: boolean;
    }>("/social/accounts/"),
  oauthStart: (platform: string, returnTo: string) =>
    socialFetch<SocialOAuthStartResult>(`/social/oauth/${platform}/start/?return_to=${encodeURIComponent(returnTo)}`),
  devConnect: (platform: string) =>
    socialFetch<Record<string, unknown>>(`/social/accounts/${platform}/dev-connect/`, {
      method: "POST",
      body: "{}",
    }),
  disconnect: (platform: string) =>
    socialFetch<{ disconnected: string }>(`/social/accounts/${platform}/disconnect/`, { method: "POST", body: "{}" }),
  listConnectionTargets: (platform: string) =>
    socialFetch<{
      targets: Array<{
        page_id: string;
        page_name: string;
        instagram_business_account_id?: string;
        instagram_username?: string;
      }>;
    }>(`/social/accounts/${platform}/connection-target/`),
  setConnectionTarget: (platform: string, page_id: string) =>
    socialFetch<Record<string, unknown>>(`/social/accounts/${platform}/connection-target/`, {
      method: "POST",
      body: JSON.stringify({ page_id }),
    }),
  calendar: (start: string, end: string) =>
    socialFetch<Array<Record<string, unknown>>>(`/social/calendar/?start=${start}&end=${end}`),
  campaigns: () => socialFetch<Array<Record<string, unknown>>>("/social/campaigns/"),
  createCampaign: (payload: Record<string, unknown>) =>
    socialFetch<Record<string, unknown>>("/social/campaigns/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  analytics: (days = 30) => socialFetch<Record<string, unknown>>(`/social/analytics/?days=${days}`),
  syncAnalytics: (days = 7) =>
    socialFetch<Record<string, unknown>>("/social/analytics/", {
      method: "POST",
      body: JSON.stringify({ days }),
    }),
  autopilot: () => socialFetch<Record<string, unknown>>("/social/autopilot/"),
  updateAutopilot: (payload: Record<string, unknown>) =>
    socialFetch<Record<string, unknown>>("/social/autopilot/", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  brand: () => socialFetch<Record<string, unknown>>("/social/brand/"),
  updateBrand: (payload: Record<string, unknown>) =>
    socialFetch<Record<string, unknown>>("/social/brand/", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  uploadMedia: async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const token = localStorage.getItem("access_token") || "";
    const res = await fetch(`${API_BASE}/social/media/upload/`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "Upload failed");
    return body.data as { id: string; url: string };
  },
};
