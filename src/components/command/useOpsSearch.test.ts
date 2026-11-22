import { describe, expect, it } from "vitest";
import { toHits } from "./useOpsSearch";
import { COMMAND_TILES, sanitizeSelection } from "./CommandCenterTiles";

describe("toHits", () => {
  it("flattens tenant search groups in the API group order", () => {
    const hits = toHits({
      staff: [{ kind: "staff", id: "u1", title: "Omar" }],
      tasks: [{ kind: "task", id: "t1", title: "Clean fryer", href: "/x" }],
      invoices: [{ kind: "invoice", id: "i1", title: "Metro" }],
    });
    expect(hits.map((h) => h.group)).toEqual(["tasks", "staff", "invoices"]);
    expect(hits[0].key).toBe("tasks:t1");
  });
  it("is empty for no payload", () => {
    expect(toHits(null)).toEqual([]);
  });
});

describe("command tiles", () => {
  it("falls back to all tiles for an empty or unknown choice", () => {
    expect(sanitizeSelection(undefined)).toHaveLength(COMMAND_TILES.length);
    expect(sanitizeSelection(["nope"])).toHaveLength(COMMAND_TILES.length);
    expect(sanitizeSelection(["orders", "nope"])).toEqual(["orders"]);
  });
});
