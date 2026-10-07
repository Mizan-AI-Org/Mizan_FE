import { describe, expect, it } from "vitest";
import {
  filterStaffPickerOptions,
  staffOptionMatchesQuery,
} from "@/lib/staffPickerFilter";
import type { StaffPickerOption } from "@/lib/staffPicker";

const roster: StaffPickerOption[] = [
  { id: "1", name: "Salmane Tazi", role: "ADMIN" },
  { id: "2", name: "Soufiane Hadni", role: "BARTENDER", department: "Bar" },
  { id: "3", name: "Amina Hadni", role: "CASHIER" },
];

describe("staffPickerFilter", () => {
  it("matches name fragments case-insensitively", () => {
    expect(staffOptionMatchesQuery(roster[1], "soufiane")).toBe(true);
    expect(staffOptionMatchesQuery(roster[1], "hadni")).toBe(true);
  });

  it("matches role and department", () => {
    expect(staffOptionMatchesQuery(roster[1], "bartender")).toBe(true);
    expect(staffOptionMatchesQuery(roster[1], "bar")).toBe(true);
  });

  it("filters roster for search box", () => {
    const out = filterStaffPickerOptions(roster, "amina");
    expect(out.map((r) => r.id)).toEqual(["3"]);
  });
});
