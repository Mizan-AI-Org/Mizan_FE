/** Normalized staff insights — safe when API returns envelope or partial data. */

export type StaffInsightsSummary = {
  tasks_completed: number;
  tasks_trend: number;
  team_reliability: number;
  active_workers: number;
};

export type StaffInsightsData = {
  summary: StaffInsightsSummary;
  star_performers: Array<{ name: string; role?: string; tasks: number; score: number }>;
  attendance_health: { on_time_arrival: number; no_show_rate: number };
  signals: Array<{ color: "emerald" | "amber"; text: string }>;
  alerts: Array<{ level: string; type?: string; title: string; description?: string }>;
  agent_recommendation?: { title: string; body: string; action_label?: string } | null;
};

const DEFAULT_SUMMARY: StaffInsightsSummary = {
  tasks_completed: 0,
  tasks_trend: 0,
  team_reliability: 0,
  active_workers: 0,
};

export function normalizeStaffInsights(raw: unknown): StaffInsightsData {
  const body =
    raw && typeof raw === "object" && "data" in (raw as object)
      ? (raw as { data: unknown }).data
      : raw;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      summary: { ...DEFAULT_SUMMARY },
      star_performers: [],
      attendance_health: { on_time_arrival: 0, no_show_rate: 0 },
      signals: [],
      alerts: [],
      agent_recommendation: null,
    };
  }

  const o = body as Record<string, unknown>;
  const s = (o.summary && typeof o.summary === "object" ? o.summary : {}) as Record<string, unknown>;

  return {
    summary: {
      tasks_completed: Number(s.tasks_completed) || 0,
      tasks_trend: Number(s.tasks_trend) || 0,
      team_reliability: Number(s.team_reliability) || 0,
      active_workers: Number(s.active_workers) || 0,
    },
    star_performers: Array.isArray(o.star_performers) ? (o.star_performers as StaffInsightsData["star_performers"]) : [],
    attendance_health:
      o.attendance_health && typeof o.attendance_health === "object"
        ? {
            on_time_arrival: Number((o.attendance_health as Record<string, unknown>).on_time_arrival) || 0,
            no_show_rate: Number((o.attendance_health as Record<string, unknown>).no_show_rate) || 0,
          }
        : { on_time_arrival: 0, no_show_rate: 0 },
    signals: Array.isArray(o.signals) ? (o.signals as StaffInsightsData["signals"]) : [],
    alerts: Array.isArray(o.alerts) ? (o.alerts as StaffInsightsData["alerts"]) : [],
    agent_recommendation: (o.agent_recommendation as StaffInsightsData["agent_recommendation"]) ?? null,
  };
}
