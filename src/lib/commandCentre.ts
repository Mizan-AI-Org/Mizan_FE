/** Mizan Command Centre API types */

/**
 * Where command-centre tiles and review links point. One place so the integrator can retarget them
 * if the unified Operations page (workstream C) lands on different paths.
 */
/** Legacy `/operations/incidents` links → Live Ops incidents tab (avoids redirect + double modal). */
export function normalizeOperationsDeepLink(href: string): string {
  const raw = (href || "").trim();
  if (!raw.startsWith("/") || raw.startsWith("//")) return raw;
  const [path, query = ""] = raw.split("?");
  if (!/\/operations\/incidents\/?$/.test(path)) return raw;
  const params = new URLSearchParams(query);
  const next = new URLSearchParams();
  next.set("view", "incidents");
  const incident = params.get("incident");
  if (incident) next.set("incident", incident);
  params.forEach((value, key) => {
    if (key === "incident" || key === "view" || key === "tab") return;
    next.set(key, value);
  });
  return `/dashboard/operations/live?${next}`;
}

export const COMMAND_ROUTES = {
  operations: "/dashboard/operations/live",
  compliance: "/dashboard/operations/live?view=compliance",
  incidents: "/dashboard/operations/live?view=incidents",
  performance: "/dashboard/employees/performance",
  attendance: "/dashboard/employees/attendance",
  orders: "/dashboard/customers/reservations-orders?tab=orders",
  calendar: "/dashboard/settings?tab=integrations&section=calendar",
} as const;

export type CommandSignal = {
  id: string;
  lane: "needs_me" | "today" | "handling" | "waiting" | "watching";
  severity: "critical" | "high" | "medium" | "low";
  level?: string;
  /** Agent watching feed: urgent_action vs recommendation */
  signal_type?: "urgent_action" | "recommendation";
  category?: string;
  title: string;
  detail?: string;
  why?: string;
  recommendation?: string;
  action_url?: string;
  kind?: string;
  /** Person accountable, when the payload has one. */
  owner?: string;
  /** Department or operational area. */
  area?: string;
  action_kind?: "open" | "approve";
};

export type CommandCluster = {
  id: string;
  category: string;
  severity: string;
  title: string;
  issue_count: number;
  entity_count: number;
  action_url?: string;
};

export type CommandCentrePayload = {
  success: boolean;
  greeting: string;
  /** Localized via dashboard.greeting.* when present */
  greeting_period?: "morning" | "afternoon" | "evening";
  greeting_name?: string;
  signals_total: number;
  chips: {
    now: number;
    today: number;
    handled: number;
    waiting: number;
  };
  ops_health: "strained" | "stable" | "healthy";
  metrics: {
    people_working: number;
    /** Missing clock-ins (other people) plus open staffing gaps for the current scope. */
    coverage_gaps?: number;
    active_work: number;
    open_incidents: number;
    pending_approvals: number;
  };
  scope?: {
    all_branches: boolean;
    label: string;
  };
  lanes: {
    needs_me: CommandSignal[];
    today: CommandSignal[];
    handling: CommandSignal[];
    waiting: CommandSignal[];
    watching: CommandSignal[];
  };
  next_five: CommandSignal[];
  clusters: CommandCluster[];
  filter_counts: {
    all: number;
    needs_me: number;
    today: number;
    handling: number;
    waiting: number;
    watching: number;
  };
  generated_at?: string;
  day_sheet?: CommandDaySheet;
  domain_attention?: Array<{
    domain: string;
    title: string;
    detail: string;
    detail_key?: string;
    detail_params?: Record<string, string | number>;
    href: string;
    severity?: string;
  }>;
  briefing?: CommandBriefingSnapshot;
};

export type CommandDaySheetLine = {
  kind: "event" | "reminder" | "birthday";
  text: string;
  href: string;
};

export type CommandDaySheet = {
  lines: CommandDaySheetLine[];
  presence: { in: number; expected: number };
  approvals_pending: number;
  services: Array<{ label: "lunch" | "dinner"; start: string; end: string }>;
  calendar: {
    connected: boolean;
    href: string;
    /** Next meeting or shift at or after now. */
    upcoming?: { title: string; minutes: number; starts_at?: string; in_progress?: boolean } | null;
  };
  incidents_new: number;
};

export type CommandBriefingSnapshot = {
  restaurantName?: string;
  asOf?: string;
  summary?: string;
  whatsHappening?: string;
  whatNeedsAttention?: string;
  live?: {
    summary?: string;
    missingClockIns?: Array<{ id?: string; name?: string; isViewerSelf?: boolean }>;
    clockedIn?: unknown[];
    todaysClockIns?: unknown[];
  };
  upcomingShifts?: Array<{
    id?: string;
    staffName?: string;
    startsAt?: string;
    start_time?: string;
    end_time?: string;
    roleLabel?: string;
  }>;
  inventoryAlerts?: Array<{ id: string; name: string; quantity?: number; unit?: string }>;
};

const OPS_HEALTH_DEFAULTS: Record<CommandCentrePayload["ops_health"], string> = {
  strained: "Needs attention",
  stable: "Steady",
  healthy: "Running smoothly",
};

/** Plain-language ops health for managers (not engineering jargon). */
export function localizedOpsHealth(
  opsHealth: CommandCentrePayload["ops_health"] | undefined,
  t: (key: string, opts?: Record<string, string | number>) => string,
): string {
  const ops: CommandCentrePayload["ops_health"] = opsHealth ?? "stable";
  return t(`command.ops_health.${ops}`, { defaultValue: OPS_HEALTH_DEFAULTS[ops] });
}

export function localizedCommandGreeting(
  data: Pick<CommandCentrePayload, "greeting" | "greeting_period" | "greeting_name">,
  t: (key: string, opts?: Record<string, string | number>) => string,
): string {
  const period = data.greeting_period;
  if (period === "morning" || period === "afternoon" || period === "evening") {
    const salutation = t(`dashboard.greeting.${period}`);
    const name = (data.greeting_name || "").trim();
    return name ? `${salutation}, ${name}.` : `${salutation}.`;
  }
  return data.greeting || t("command.hello");
}

export type CommandFilterKey =
  | "all"
  | "needs_me"
  | "today"
  | "handling"
  | "waiting"
  | "watching";

export function severityToBadgeLevel(severity: string): string {
  switch (severity) {
    case "critical":
      return "CRITICAL";
    case "high":
      return "HIGH";
    case "medium":
      return "RECOMMENDATION";
    default:
      return "INFORMATION";
  }
}

/** Route for Review — never leave the user on /dashboard with no navigation. */
export function resolveCommandReviewRoute(signal: CommandSignal): string {
  const raw = (signal.action_url || "").trim();
  if (raw === "/dashboard/staff-scheduling") {
    return "/dashboard/scheduling";
  }
  if (raw && raw !== "/dashboard" && raw.startsWith("/") && !raw.startsWith("//")) {
    return normalizeOperationsDeepLink(raw);
  }
  const category = (signal.category || "").toLowerCase();
  if (category === "incidents" || signal.kind === "incident") {
    const id = String(signal.id || "").trim();
    return id
      ? `/dashboard/operations/live?view=incidents&incident=${encodeURIComponent(id)}`
      : "/dashboard/operations/live?view=incidents";
  }
  if (category === "staffing") {
    return "/dashboard/employees/shifts";
  }
  if (category === "inventory") {
    return "/dashboard/suppliers/procurement?tab=needs";
  }
  if (category === "compliance") {
    return COMMAND_ROUTES.compliance;
  }
  if (category === "tasks" || category === "workload") {
    const id = String(signal.id || "").trim();
    return id
      ? `${COMMAND_ROUTES.operations}?task=${encodeURIComponent(id)}`
      : COMMAND_ROUTES.operations;
  }
  if (category === "finance" || signal.kind === "invoice") {
    return "/dashboard/operations/approvals";
  }
  if (category === "attendance") {
    return "/dashboard/employees/attendance";
  }
  return COMMAND_ROUTES.operations;
}

export function signalsForFilter(
  data: CommandCentrePayload | undefined,
  filter: CommandFilterKey,
): CommandSignal[] {
  if (!data) return [];
  if (filter === "all") {
    return [
      ...data.lanes.needs_me,
      ...data.lanes.today,
      ...data.lanes.handling,
      ...data.lanes.waiting,
      ...data.lanes.watching,
    ];
  }
  return data.lanes[filter] || [];
}
