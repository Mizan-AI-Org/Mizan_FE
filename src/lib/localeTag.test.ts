import { describe, expect, it } from "vitest";
import { formatClockTime, localeTag, uses24h } from "./localeTag";

describe("localeTag helpers", () => {
  it("maps languages to locale tags", () => {
    expect(localeTag("fr")).toBe("fr-FR");
    expect(localeTag("ar")).toBe("ar-MA");
    expect(localeTag("en")).toBe("en-GB");
  });
  it("uses 24h for fr/ar and 12h for en", () => {
    expect(uses24h("fr")).toBe(true);
    expect(formatClockTime("09:05:00", "fr")).toBe("09:05");
    expect(formatClockTime("15:30", "en")).toBe("3:30 PM");
    expect(formatClockTime("00:00", "en")).toBe("12:00 AM");
  });
});
