import { describe, expect, it } from "vitest";
import { commandKindLabel } from "./commandBarUtils";

describe("commandBarUtils", () => {
  it("labels known kinds", () => {
    expect(commandKindLabel("assignment")).toBe("assignment");
    expect(commandKindLabel("approval")).toBe("approval");
  });
});
