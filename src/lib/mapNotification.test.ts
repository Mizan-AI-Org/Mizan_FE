import { describe, expect, it } from "vitest";
import { mapNotification } from "./mapNotification";

describe("mapNotification", () => {
  it("maps an unread assignment onto the bell row with a route", () => {
    const mapped = mapNotification({
      id: "n1",
      message: "You've been assigned a task:\n*Buy chairs*",
      created_at: "2026-09-30T06:00:00Z",
      is_read: false,
      notification_type: "TASK_ASSIGNED",
      title: "New task assigned",
      link: "/dashboard/operations/live",
    });
    expect(mapped.read).toBe(false);
    expect(mapped.title).toBe("New task assigned");
    expect(mapped.verb).toBe("task assigned");
    expect(mapped.data?.route).toBe("/dashboard/operations/live");
  });

  it("treats a missing link as no navigation target", () => {
    const mapped = mapNotification({ id: "n2", is_read: true, message: "hello" });
    expect(mapped.read).toBe(true);
    expect(mapped.data).toBeUndefined();
  });
});