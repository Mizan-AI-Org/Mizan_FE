import { describe, expect, it } from "vitest";
import { DOMAIN_SECTIONS } from "./mizan-domains";
import { COMMAND_ROUTES } from "./commandCentre";
import { COMMAND_TILES, DEFAULT_TILE_IDS, sanitizeSelection } from "@/components/command/CommandCenterTiles";

/** A restaurant has every module except the agency one. */
const restaurantHas = (moduleId?: string) => !moduleId || moduleId !== "agency";

describe("operations nav (Cursor's design)", () => {
  it("shows exactly the four leaves to a restaurant, in order", () => {
    const hrefs = DOMAIN_SECTIONS.operations.filter((l) => restaurantHas(l.moduleId)).map((l) => l.href);
    expect(hrefs).toEqual([
      "/dashboard/operations/live",
      "/dashboard/operations/approvals",
      "/dashboard/employees/tasks",
      "/dashboard/operations/checklists",
    ]);
  });

  it("keeps Agency jobs behind the agency module only", () => {
    const agency = DOMAIN_SECTIONS.operations.find((l) => l.href.endsWith("/agency-jobs"));
    expect(agency?.moduleId).toBe("agency");
  });

  it("has nothing Accountability- or Progress-like, and Staff requests moved out of Employees", () => {
    const all = [...DOMAIN_SECTIONS.operations, ...DOMAIN_SECTIONS.employees].map((l) => `${l.labelKey} ${l.href}`).join(" ");
    expect(all).not.toMatch(/accountab|progress|overview/i);
    expect(DOMAIN_SECTIONS.employees.some((l) => l.href === "/dashboard/staff-requests")).toBe(false);
    expect(DOMAIN_SECTIONS.employees.some((l) => l.href === "/dashboard/employees/tasks")).toBe(false);
    expect(DOMAIN_SECTIONS.operations.some((l) => l.href === "/dashboard/employees/tasks")).toBe(true);
  });
});

describe("command centre tiles", () => {
  it("offers Cursor's three tiles (calendar, orders and attendance retired)", () => {
    expect(COMMAND_TILES.map((t) => t.id)).toEqual(["operations", "performance", "incidents"]);
  });

  it("defaults to operations, performance, incidents; empty or invalid choices fall back to it", () => {
    expect(DEFAULT_TILE_IDS).toEqual(["operations", "performance", "incidents"]);
    expect(sanitizeSelection(undefined)).toEqual(DEFAULT_TILE_IDS);
    expect(sanitizeSelection([])).toEqual(DEFAULT_TILE_IDS);
    expect(sanitizeSelection(["accountability", "progress"])).toEqual(DEFAULT_TILE_IDS);
    expect(sanitizeSelection("nope")).toEqual(DEFAULT_TILE_IDS);
    expect(sanitizeSelection(["incidents", "bogus"])).toEqual(["incidents"]);
  });

  it("routes to Live Operations", () => {
    expect(COMMAND_ROUTES.operations).toBe("/dashboard/operations/live");
    expect(COMMAND_ROUTES.compliance).toBe("/dashboard/operations/live?view=compliance");
  });
});
