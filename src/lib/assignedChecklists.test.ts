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

  it("adds checklist templates and every person an execution was assigned to", () => {
    const rows = mapAssignedChecklists(
      [],
      [],
      {
        success: true,
        data: [{ id: "cl-1", name: "Fridge log", is_active: true, step_count: 4 }],
        error: null,
      },
      {
        success: true,
        data: [
          {
            template_id: "cl-1",
            assigned_to: "s1",
            assigned_to_name: "Omar",
          },
          {
            template_id: "cl-1",
            assigned_to: "s2",
            assigned_to_name: "Salmane",
          },
          {
            template_id: "cl-1",
            assigned_to: "s1",
            assigned_to_name: "Omar",
          },
        ],
        error: null,
      },
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe("checklist");
    expect(rows[0].assignees.map((person) => person.name)).toEqual(["Omar", "Salmane"]);
  });

  it("does not repeat a checklist whose name is already a process template", () => {
    const rows = mapAssignedChecklists(
      [{ id: "tpl-3", name: "Closing", tasks: [], standing_assignee_details: [{ id: "u1", name: "Adama" }] }],
      [],
      [{ id: "cl-9", name: "Closing", step_count: 1 }],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe("template");
  });
});
