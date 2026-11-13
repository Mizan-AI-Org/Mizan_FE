import { describe, expect, it } from "vitest";
import { CURRENCY_CODES, DEFAULT_CURRENCY, DEFAULT_TIMEZONE, TIMEZONES, withCurrent } from "./regional";

describe("regional defaults", () => {
  it("defaults to Casablanca and dirhams", () => {
    expect(DEFAULT_TIMEZONE).toBe("Africa/Casablanca");
    expect(DEFAULT_CURRENCY).toBe("MAD");
    expect(TIMEZONES[0]).toBe(DEFAULT_TIMEZONE);
    expect(CURRENCY_CODES[0]).toBe(DEFAULT_CURRENCY);
  });
  it("keeps a value that is not on the list instead of silently replacing it", () => {
    expect(withCurrent(TIMEZONES, "Asia/Tokyo")[0]).toBe("Asia/Tokyo");
    expect(withCurrent(TIMEZONES, "Europe/Paris")).toHaveLength(TIMEZONES.length);
  });
});
