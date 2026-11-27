import { describe, expect, it } from "vitest";

import type { CommandSignal } from "@/lib/commandCentre";
import type { OperationsItem } from "@/pages/operations/contract";
import type { ApprovalRow, NeedsAttentionItem } from "@/lib/types";
import { briefingChips, buildPriorityQueue, cockpitCounts, PRIORITY_CAP } from "./priorityQueue";

const signal = (id: string, title = `Item ${id}`): CommandSignal => ({
  id,
  lane: "needs_me",
  severity: "high",
  title,
  category: "incidents",
  owner: "Hamza",
  area: "Kitchen",
});

const item = (patch: Partial<OperationsItem> & { id: string }): OperationsItem =>
  ({
    title: patch.id,
    kind: "task",
    category: "tasks",
    status: "open",
    priority: "high",
    assignee: { id: "u", name: "Fatima" },
    executor: null,
    readOnly: [],
    dueAt: null,
    overdue: false,
    needsHelp: false,
    awaitingApproval: false,
    unassigned: false,
    progress: null,
    source: "",
    closed: false,
    createdAt: null,
    ...patch,
  }) as OperationsItem;

const approval = (id: string): ApprovalRow =>
  ({ id, title: `Buy ${id}`, kindLabel: "Purchase", requestedBy: "Ahmed" }) as ApprovalRow;

describe("cockpitCounts", () => {
  it("uses only the numbers for the selected branch", () => {
    const branch = cockpitCounts({
      peopleWorking: 4,
      coverageGaps: 1,
      tasksOpen: 6,
      tasksOverdue: 2,
      incidents: 1,
      pendingApprovals: 1,
      awaitingApproval: 2,
    });
    const other = cockpitCounts({
      peopleWorking: 20,
      coverageGaps: 0,
      tasksOpen: 40,
      tasksOverdue: 0,
      incidents: 9,
      pendingApprovals: 0,
      awaitingApproval: 0,
    });
    expect(branch).toMatchObject({ onDuty: 4, coverageGaps: 1, tasksOpen: 6, tasksOverdue: 2, incidents: 1, pending: 3 });
    expect(other.pending).toBe(0);
    expect(other.onDuty).toBe(20);
  });
});

describe("briefingChips", () => {
  it("keeps at most three exceptions", () => {
    const chips = briefingChips({ tasksOverdue: 2, coverageGaps: 1, pending: 4, incidents: 3 });
    expect(chips.map((chip) => chip.id)).toEqual(["overdue", "coverage", "pending"]);
  });

  it("drops zero counts", () => {
    expect(briefingChips({ tasksOverdue: 0, coverageGaps: 0, pending: 0, incidents: 2 })).toEqual([
      { id: "incidents", count: 2 },
    ]);
  });
});

describe("buildPriorityQueue", () => {
  const base = {
    overviewItems: [] as OperationsItem[],
    approvals: [] as ApprovalRow[],
    validations: [] as NeedsAttentionItem[],
    hidden: [] as string[],
    fallbackTitle: "Approval",
  };

  it("is empty when nothing needs a decision", () => {
    expect(buildPriorityQueue({ ...base, needsMe: [] })).toEqual([]);
  });

  it("caps the queue at five and prefers command-centre items", () => {
    const needsMe = Array.from({ length: 6 }, (_, i) => signal(String(i + 1)));
    const queue = buildPriorityQueue({
      ...base,
      needsMe,
      overviewItems: [item({ id: "late", overdue: true })],
      approvals: [approval("a1")],
    });
    expect(queue).toHaveLength(PRIORITY_CAP);
    expect(queue.map((row) => row.id)).toEqual(["1", "2", "3", "4", "5"]);
    expect(queue[0]).toMatchObject({ owner: "Hamza", area: "Kitchen", actionKind: "open" });
  });

  it("fills from overdue work and approvals after hidden command items", () => {
    const queue = buildPriorityQueue({
      ...base,
      needsMe: [signal("1")],
      hidden: ["signal:1"],
      overviewItems: [
        item({ id: "ok" }),
        item({ id: "late", overdue: true, unassigned: true, assignee: null }),
      ],
      approvals: [approval("a1")],
      validations: [{ kind: "validate", taskId: "v1", title: "Check fridge", who: "Omar" }],
    });
    expect(queue.map((row) => row.key)).toEqual(["overview:late", "approval:a1", "task:v1"]);
    expect(queue[0].owner).toBe("");
    expect(queue[1].actionKind).toBe("approve");
  });
});
