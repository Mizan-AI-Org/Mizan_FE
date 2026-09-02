/** Mizan Command Centre API types */

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
    active_work: number;
    open_incidents: number;
    pending_approvals: number;
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
};

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
