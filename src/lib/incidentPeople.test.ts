import { describe, expect, it } from "vitest";

import {
  incidentAssigneeId,
  matchingStaffOptionId,
  personId,
  sameUserId,
  staffOptionsWithCurrentAssignee,
} from "./incidentPeople";

describe("incidentPeople", () => {
  it("reads assignee from assigned_to_details when assigned_to is missing", () => {
    expect(
      incidentAssigneeId({
        assigned_to: null,
        assigned_to_details: { id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", first_name: "Younes" },
      }),
    ).toBe("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
  });

  it("treats dashed and undashed UUIDs as the same person", () => {
    expect(sameUserId("a1b2c3d4-e5f6-7890-abcd-ef1234567890", "a1b2c3d4e5f67890abcdef1234567890")).toBe(true);
    expect(matchingStaffOptionId([{ id: "a1b2c3d4e5f67890abcdef1234567890" }], "a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe(
      "a1b2c3d4e5f67890abcdef1234567890",
    );
  });

  it("injects the current assignee when they are missing from the staff list", () => {
    const rows = staffOptionsWithCurrentAssignee(
      [{ id: "other", name: "Adama Jarju" }],
      {
        assigned_to: "younes-id",
        assigned_to_details: { id: "younes-id", first_name: "Younes", last_name: "Elfalahi" },
      },
    );
    expect(rows[0].id).toBe("younes-id");
    expect(rows[0].name).toBe("Younes Elfalahi");
  });

  it("ignores blank assigned_to placeholders", () => {
    expect(personId("unassigned")).toBe("");
    expect(personId("null")).toBe("");
    expect(incidentAssigneeId({ assigned_to: "", assigned_to_details: null })).toBe("");
  });
});
