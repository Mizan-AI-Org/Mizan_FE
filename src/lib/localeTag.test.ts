import { describe, expect, it } from "vitest";
import { formatClockTime, formatDate, formatPattern, formatTime, localeTag, uses24h } from "./localeTag";

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
  it("formats dates and times in the requested language", () => {
    const d = new Date(2026, 10, 23, 15, 30);
    expect(formatDate(d, "fr", { month: "long" })).toBe("novembre");
    expect(formatTime(d, "fr", { hour: "2-digit", minute: "2-digit" })).toBe("15:30");
    expect(formatPattern(d, "EEEE", "fr")).toBe("lundi");
  });
});
