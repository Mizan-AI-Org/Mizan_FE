import { afterEach, describe, expect, it, vi } from "vitest";

import {
  conversationIdForUser,
  fetchMastraTranscript,
  invalidateAfterAgentWrite,
  sanitizeMiyaText,
} from "./mastraApi";

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

  it("keeps only the spoken answer when thinking leaks", () => {
    const text = sanitizeMiyaText(
      "<thinking>id: 3276187c reporterName: Adama Jarju</thinking>\nAdama Jarju reported the POS Repair Request.",
    );
    expect(text).toBe("Adama Jarju reported the POS Repair Request.");
    expect(text).not.toContain("thinking");
    expect(text).not.toContain("3276187c");
  });

  it("scopes conversation ids to the signed-in user", () => {
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
    });
    const admin = conversationIdForUser("admin-1");
    const wahabi = conversationIdForUser("wahabi-2");
    expect(admin).toContain("admin-1");
    expect(wahabi).toContain("wahabi-2");
    expect(admin).not.toBe(wahabi);
  });

  it("refreshes incidents and ops queries after an Agent write", () => {
    const keys: unknown[][] = [];
    invalidateAfterAgentWrite({
      invalidateQueries: ({ queryKey }) => {
        keys.push([...queryKey]);
      },
    });
    expect(keys).toContainEqual(["safety-incidents"]);
    expect(keys).toContainEqual(["safety-incident-detail"]);
    expect(keys).toContainEqual(["dashboard", "recent-incidents"]);
    expect(keys).toContainEqual(["dashboard", "custom-widget-tasks"]);
    expect(keys).toContainEqual(["dashboard", "operations-live"]);
  });
});
