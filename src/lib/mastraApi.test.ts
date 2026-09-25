import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchMastraTranscript } from "./mastraApi";

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
});
