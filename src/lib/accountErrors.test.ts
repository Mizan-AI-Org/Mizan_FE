import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n", () => ({
  default: { t: (key: string) => (key === "account.errors.email_taken" ? "Cet email est déjà utilisé." : key) },
}));
vi.mock("@/lib/api", () => ({ API_BASE: "/api", authFetch: vi.fn() }));

import { accountErrorFrom, accountErrorText, composeWhatsAppNumber, isPlausibleWhatsApp } from "./accountErrors";

describe("composeWhatsAppNumber", () => {
  it("defaults to Morocco and drops the trunk zero", () => {
    expect(composeWhatsAppNumber("0612 34 56 78", "212")).toBe("+212612345678");
    expect(composeWhatsAppNumber("612345678", "212")).toBe("+212612345678");
  });
  it("keeps a number typed with + or 00 whatever the country", () => {
    expect(composeWhatsAppNumber("+33 6 12 34 56 78", "212")).toBe("+33612345678");
    expect(composeWhatsAppNumber("0033612345678", "212")).toBe("+33612345678");
  });
  it("does not double the country code", () => {
    expect(composeWhatsAppNumber("212612345678", "212")).toBe("+212612345678");
  });
  it("is empty for nothing and bounds the length", () => {
    expect(composeWhatsAppNumber("  ", "212")).toBe("");
    expect(isPlausibleWhatsApp("+2126")).toBe(false);
    expect(isPlausibleWhatsApp("+212612345678")).toBe(true);
    expect(isPlausibleWhatsApp("+2126123456789012")).toBe(false);
  });
});

describe("account error messages", () => {
  it("translates a known server code", () => {
    expect(accountErrorText("email_taken", "raw")).toBe("Cet email est déjà utilisé.");
  });
  it("falls back to the server text for an unknown code, then the default", () => {
    expect(accountErrorFrom({ code: "weird", error: "Server says no" }, "fb")).toBe("Server says no");
    expect(accountErrorFrom({}, "fb")).toBe("fb");
    expect(accountErrorFrom({ code: "email_taken", error: "Email already registered" }, "fb")).toBe(
      "Cet email est déjà utilisé.",
    );
  });
});
