import { describe, expect, it } from "vitest";

import {
  dashboardTaskPriorityLabel,
  toLiveOpsPriority,
} from "./dashboard-task-detail-utils";

const t = (key: string, options?: Record<string, unknown>) =>
  String(options?.defaultValue ?? key);

describe("live ops priority labels", () => {
  it("uses three tiers: Normal, Medium, Urgent", () => {
    expect(dashboardTaskPriorityLabel("NORMAL", t)).toBe("Normal");
    expect(dashboardTaskPriorityLabel("MEDIUM", t)).toBe("Medium");
    expect(dashboardTaskPriorityLabel("URGENT", t)).toBe("Urgent");
    expect(dashboardTaskPriorityLabel("HIGH", t)).toBe("Urgent");
    expect(dashboardTaskPriorityLabel("CRITICAL", t)).toBe("Urgent");
  });

  it("normalizes legacy aliases to wire values", () => {
    expect(toLiveOpsPriority("CRITICAL")).toBe("URGENT");
    expect(toLiveOpsPriority("HIGH")).toBe("URGENT");
    expect(toLiveOpsPriority("LOW")).toBe("NORMAL");
    expect(toLiveOpsPriority("MEDIUM")).toBe("MEDIUM");
  });
});
