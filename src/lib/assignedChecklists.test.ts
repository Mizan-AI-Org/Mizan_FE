import { describe, expect, it } from "vitest";

import { mapAssignedChecklists } from "./assignedChecklists";

describe("mapAssignedChecklists", () => {
  it("lists every person assigned to a process template", () => {
    const rows = mapAssignedChecklists(
      {
        count: 1,
        results: [
          {
            id: "tpl-1",
            name: "Restaurant Closing",
            is_active: true,
            tasks: [{ title: "Lock doors" }, { title: "Cash up" }],
            standing_assignees: ["u1", "u2"],
            standing_assignee_details: [
              { id: "u1", name: "Adama Jarju" },
              { id: "u2", first_name: "Wahabi", last_name: "Driss" },
            ],
          },
        ],
      },
      [],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe("template");
    expect(rows[0].stepCount).toBe(2);
    expect(rows[0].assignees.map((person) => person.name)).toEqual([
      "Adama Jarju",
      "Wahabi Driss",
    ]);
  });

  it("resolves assignee ids from the staff roster when details are missing", () => {
    const rows = mapAssignedChecklists(
      [{ id: "tpl-2", name: "Opening", standing_assignees: ["u9"], tasks: [] }],
      [{ id: "u9", name: "Kenza Bennani" }],
    );

    expect(rows[0].assignees).toEqual([{ id: "u9", name: "Kenza Bennani" }]);
  });

  it("does not include leftover checklist-catalog templates", () => {
    const leftoverCatalog = {
      success: true,
      data: [
        { id: "cl-1", name: "Restaurant Opening Checklist", is_active: true, step_count: 4 },
        { id: "cl-2", name: "Restaurant Safety Checklist", is_active: true, step_count: 5 },
      ],
      error: null,
    };
    const rows = mapAssignedChecklists(
      [
        {
          id: "tpl-3",
          name: "Restaurant Closing",
          tasks: [{ title: "Lock" }],
          standing_assignee_details: [{ id: "u1", name: "Adama" }],
        },
      ],
      [],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Restaurant Closing");
    expect(rows[0].kind).toBe("template");
    expect(JSON.stringify(leftoverCatalog)).toContain("Opening");
  });
});
