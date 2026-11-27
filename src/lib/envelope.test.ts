import { describe, expect, it } from "vitest";
import { unwrapList } from "./envelope";

describe("unwrapList", () => {
  it("accepts a bare array", () => expect(unwrapList([1, 2])).toEqual([1, 2]));
  it("unwraps the {success,data:[]} envelope", () =>
    expect(unwrapList({ success: true, data: [{ id: "a" }], error: null })).toEqual([{ id: "a" }]));
  it("unwraps paginated results", () => {
    expect(unwrapList({ results: [1] })).toEqual([1]);
    expect(unwrapList({ success: true, data: { results: [2] } })).toEqual([2]);
  });
  it("returns [] for junk and throws on failure envelopes", () => {
    expect(unwrapList(null)).toEqual([]);
    expect(unwrapList({ success: true, data: null })).toEqual([]);
    expect(() => unwrapList({ success: false, error: "nope" })).toThrow("nope");
  });
});
