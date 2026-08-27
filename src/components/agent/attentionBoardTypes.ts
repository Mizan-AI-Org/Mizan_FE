export type AttentionLane = "needs_me" | "today" | "handling" | "waiting" | "watching" | "all";

export type AttentionBoardItem = {
  id: string;
  category: string;
  severity: string;
  title: string;
  detail?: string;
  why_it_matters?: string;
  count?: number;
  entity_type?: string;
  entity_id?: string | null;
  entity_ids?: string[];
  owner?: string | null;
  lane?: AttentionLane | string;
  state_label?: string;
  waiting_on?: string;
  recommended_action?: {
    label?: string;
    href?: string;
    tool_hint?: string;
    handle_hint?: string;
  };
  ask_agent_prompt?: string;
};

export type AttentionCluster = {
  id: string;
  category: string;
  label: string;
  count: number;
  item_count: number;
  entity_count: number;
  severity?: string;
  members: Array<{
    id?: string;
    title?: string;
    severity?: string;
    entity_type?: string;
    entity_id?: string | null;
    owner?: string | null;
    lane?: string;
  }>;
  href?: string;
  review_label?: string;
};

export type AttentionBoardSummary = {
  signals_detected: number;
  needs_me: number;
  today: number;
  handling: number;
  waiting: number;
  watching: number;
  clear: boolean;
};

export type AttentionBoard = {
  summary: AttentionBoardSummary;
  next_actions: AttentionBoardItem[];
  needs_me: AttentionBoardItem[];
  today: AttentionBoardItem[];
  handling: AttentionBoardItem[];
  waiting: AttentionBoardItem[];
  watching: AttentionBoardItem[];
  clusters: AttentionCluster[];
  waiting_breakdown?: {
    staff?: number;
    suppliers?: number;
    hr?: number;
    other?: number;
  };
  scale?: "clear" | "few" | "moderate" | "busy" | "heavy" | "extreme" | string;
};
