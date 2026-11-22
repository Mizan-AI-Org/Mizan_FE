import { describe, expect, it } from "vitest";
import { isPrivateSlug, normalizeOwners, slugsOwnedBy, watchLevelFor, withOwner, withOwners } from "./types";

describe("responsibilities model (several owners, opt-in watching)", () => {
  it("keeps several owners in pick order and drops duplicates", () => {
    expect(withOwners({}, "request.inventory", ["a", "b", "a"])).toEqual({ "request.inventory": ["a", "b"] });
    expect(normalizeOwners({ "task.foh": "x", "task.bar": [] })).toEqual({ "task.foh": ["x"] });
  });

  it("adds and removes one owner without touching the others", () => {
    const start = { "task.foh": ["a"], "task.bar": ["a", "b"] };
    expect(withOwner(start, "task.foh", "b", true)["task.foh"]).toEqual(["a", "b"]);
    expect(withOwner(start, "task.foh", "a", false)).toEqual({ "task.bar": ["a", "b"] });
    expect(slugsOwnedBy(start, "b")).toEqual(["task.bar"]);
  });

  it("cannot follow private areas, same as the backend", () => {
    for (const slug of ["request.payroll", "request.hr", "incident.hr", "incident.team_conflict", "task.personal"]) {
      expect(isPrivateSlug(slug)).toBe(true);
    }
    for (const slug of ["incident.safety", "request.inventory", "task.foh"]) expect(isPrivateSlug(slug)).toBe(false);
  });

  it("reads my follow level, defaulting to none", () => {
    const mine = [{ id: "1", slug: "incident.safety", level: "critical" as const, branch_id: null }];
    expect(watchLevelFor(mine, "incident.safety")).toBe("critical");
    expect(watchLevelFor(mine, "task.foh")).toBe("none");
  });
});
