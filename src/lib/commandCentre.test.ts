import { describe, expect, it } from "vitest";
import {
  localizedCommandGreeting,
  localizedOpsHealth,
  signalsForFilter,
  type CommandCentrePayload,
} from "./commandCentre";

describe("commandCentre", () => {
  it("localizes greeting with name", () => {
    const text = localizedCommandGreeting(
      { greeting_period: "morning", greeting_name: "Test", greeting: "Good morning, Test." },
      (key, opts) => {
        if (key === "dashboard.greeting.morning") return "Good morning";
        return String(opts?.defaultValue ?? key);
      },
    );
    expect(text).toBe("Good morning, Test.");
  });

  it("uses manager-friendly ops health labels", () => {
    expect(
      localizedOpsHealth("strained", (key) =>
        key === "command.ops_health.strained" ? "Needs attention" : key,
      ),
    ).toBe("Needs attention");
  });

  it("filters today lane", () => {
    const data = {
      success: true,
      lanes: {
        needs_me: [{ id: "1", lane: "needs_me", severity: "high", title: "A" }],
        today: [{ id: "2", lane: "today", severity: "medium", title: "B" }],
        handling: [],
        waiting: [],
        watching: [],
      },
    } as unknown as CommandCentrePayload;
    expect(signalsForFilter(data, "today")).toHaveLength(1);
    expect(signalsForFilter(data, "today")[0]?.title).toBe("B");
  });
});
