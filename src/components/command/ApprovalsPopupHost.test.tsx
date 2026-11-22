import { describe, expect, it } from "vitest";

import type { ApprovalRow, NeedsAttentionItem } from "@/lib/types";
import { buildPopupQueue } from "./ApprovalsPopupHost";

const approval = (id: string, title = "", notes = ""): ApprovalRow => ({ id, title, notes, kindLabel: "Purchase" }) as ApprovalRow;
const attn = (kind: NeedsAttentionItem["kind"], taskId: string, title = "Task"): NeedsAttentionItem => ({
  kind,
  taskId,
  title,
  who: "Omar",
});

describe("buildPopupQueue", () => {
  it("lists approvals first, then only the 'to validate' tasks of the accountability queue", () => {
    const queue = buildPopupQueue(
      [approval("a1", "Buy fish")],
      [attn("overdue", "t0"), attn("validate", "t1", "Wipe fryer"), attn("blocked", "t2")],
      [],
      "Approval request",
    );
    expect(queue.map((q) => `${q.kind}:${q.id}`)).toEqual(["approval:a1", "task:t1"]);
    expect(queue[1]).toMatchObject({ title: "Wipe fryer", label: "Omar" });
  });

  it("skips what was put off with Later and falls back to a translated title", () => {
    const queue = buildPopupQueue([approval("a1"), approval("a2", "", "Cash advance")], [attn("validate", "t1")], ["approval:a1"], "Approval request");
    expect(queue.map((q) => q.title)).toEqual(["Cash advance", "Task"]);
    expect(buildPopupQueue([approval("a3")], [], [], "Approval request")[0].title).toBe("Approval request");
  });

  it("is empty with nothing waiting", () => {
    expect(buildPopupQueue(undefined, undefined, [], "x")).toEqual([]);
  });
});
