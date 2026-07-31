export type AutomationStep = { type: string; config: Record<string, unknown> };

export type CatalogItem = {
  id: string;
  label: string;
  category: string;
  icon?: string;
  config_fields?: string[];
};

export type TemplateItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  tags?: string[];
  difficulty?: string;
  step_count?: number;
  trigger: { type: string; config: Record<string, unknown> };
  steps: AutomationStep[];
};

export type CatalogResponse = {
  triggers: Record<string, string>;
  actions: Record<string, string>;
  templates: TemplateItem[];
  trigger_catalog?: CatalogItem[];
  action_catalog?: CatalogItem[];
  categories?: {
    template: { id: string; label: string }[];
    trigger: { id: string; label: string }[];
    action: { id: string; label: string }[];
  };
  variables?: { token: string; description: string }[];
};

export const STEP_DEFAULTS: Record<string, Record<string, unknown>> = {
  send_message: { text: "" },
  send_template: { template_name: "" },
  add_tag: { tag: "" },
  remove_tag: { tag: "" },
  assign_conversation: { staff_id: "" },
  update_contact_field: { note: "" },
  create_task: { title: "", description: "", priority: "MEDIUM" },
  create_staff_request: { category: "OPERATIONS", subject: "", description: "" },
  wait: { seconds: 60 },
  condition: { keywords: [], then: [], else: [] },
  send_webhook: { url: "" },
  close_conversation: {},
};

const ACTION_ALIASES: Record<string, string> = {
  send_reply: "send_message",
  reply: "send_message",
  tag: "add_tag",
  tag_contact: "add_tag",
};

/** Coerce legacy / Miya step shapes into { type, config } for the builder. */
export function normalizeAutomationSteps(steps: unknown[]): AutomationStep[] {
  if (!Array.isArray(steps)) return [];
  return steps.map((raw) => {
    if (!raw || typeof raw !== "object") {
      return { type: "send_message", config: { text: String(raw ?? "") } };
    }
    const r = raw as Record<string, unknown>;
    let type = String(r.type || r.action || r.step_type || "").trim();
    type = ACTION_ALIASES[type.toLowerCase()] || type;

    const config: Record<string, unknown> = {
      ...((r.config as Record<string, unknown>) || {}),
    };
    if (r.message) config.text = config.text ?? r.message;
    if (r.text && !config.text) config.text = r.text;
    if (r.tag) {
      if (!type) type = "add_tag";
      config.tag = config.tag ?? r.tag;
    }
    if (!type) {
      if (config.text) type = "send_message";
      else if (config.tag) type = "add_tag";
      else type = "send_message";
    }
    return {
      type,
      config: { ...(STEP_DEFAULTS[type] || {}), ...config },
    };
  });
}

export const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  advanced: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
};
