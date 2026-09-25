import { describe, expect, it } from "vitest";

import {
  dashboardTaskPriorityLabel,
  toLiveOpsPriority,
} from "./dashboard-task-detail-utils";

const t = (key: string, options?: Record<string, unknown>) =>
  String(options?.defaultValue ?? key);

describe("live ops priority labels", () => {
  it("calls HIGH urgent and URGENT critical", () => {
    expect(dashboardTaskPriorityLabel("HIGH", t)).toBe("Urgent");
    expect(dashboardTaskPriorityLabel("URGENT", t)).toBe("Critical");
    expect(dashboardTaskPriorityLabel("MEDIUM", t)).toBe("Medium");
    expect(dashboardTaskPriorityLabel("CRITICAL", t)).toBe("Critical");
  });

  it("normalizes aliases to the PATCH values", () => {
    expect(toLiveOpsPriority("CRITICAL")).toBe("URGENT");
    expect(toLiveOpsPriority("HIGH")).toBe("HIGH");
    expect(toLiveOpsPriority("MEDIUM")).toBe("MEDIUM");
  });
});
