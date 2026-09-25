import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchMastraTranscript, sanitizeMiyaText } from "./mastraApi";

describe("fetchMastraTranscript", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns an empty list when the API fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    await expect(fetchMastraTranscript("conv-1")).resolves.toEqual([]);
  });

  it("strips leaked working-memory tags from the visible reply", () => {
    const text = sanitizeMiyaText(
      "You have 4 open incidents.\n<working-memory format=\"markdown\">- Open incidents now: 4</working-memory>",
    );
    expect(text).toContain("You have 4 open incidents.");
    expect(text).not.toContain("working-memory");
    expect(text).not.toContain("Open incidents now");
  });
});
