import { describe, expect, it } from "vitest";
import { DOMAIN_SECTIONS } from "./mizan-domains";
import { COMMAND_ROUTES } from "./commandCentre";

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
  it("routes to Live Operations", () => {
    expect(COMMAND_ROUTES.operations).toBe("/dashboard/operations/live");
    expect(COMMAND_ROUTES.compliance).toBe("/dashboard/operations/live?view=compliance");
  });
});
