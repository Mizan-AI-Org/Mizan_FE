import "@testing-library/jest-dom";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { SignupData } from "@/lib/types";

const ownerSignup = vi.fn(async (_data: SignupData) => undefined);
let currentLanguage = "fr";

vi.mock("../contexts/AuthContext", () => ({ useAuth: () => ({ ownerSignup }) }));
vi.mock("@/hooks/use-language", () => ({
  useLanguage: () => ({ t: (key: string) => key, language: currentLanguage }),
}));
vi.mock("@/components/ui/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/api", () => ({ api: { getModuleCatalog: vi.fn(() => new Promise(() => undefined)) } }));

async function fillAndSubmit() {
  const { SignUpForm } = await import("@/components/SignUpForm");
  const { container } = render(<MemoryRouter><SignUpForm /></MemoryRouter>);
  const set = (id: string, value: string) =>
    fireEvent.change(container.querySelector(`#${id}`) as HTMLInputElement, { target: { value } });
  set("businessName", "Cafe Atlas");
  set("fullName", "Sara Bennani");
  set("signup-email", "sara@example.test");
  set("signup-whatsapp", "612345678");  // required since signup proves the owner's WhatsApp
  set("signup-password", "S3cure-pass!");
  set("confirmPassword", "S3cure-pass!");
  fireEvent.click(container.querySelector("#terms") as HTMLInputElement);
  fireEvent.submit(container.querySelector("form") as HTMLFormElement);
  await waitFor(() => expect(ownerSignup).toHaveBeenCalled());
  return ownerSignup.mock.calls.at(-1)![0];
}

describe("SignUpForm", () => {
  it("sends the language picked on the signup page", async () => {
    currentLanguage = "fr";
    const payload = await fillAndSubmit();
    expect(payload.language).toBe("fr");
    expect(payload.user.email).toBe("sara@example.test");
    expect(screen.queryByText("auth.signup.errors.unexpected")).toBeNull();
  });

  it("sends Arabic when the signup page is in Arabic", async () => {
    ownerSignup.mockClear();
    currentLanguage = "ar";
    const payload = await fillAndSubmit();
    expect(payload.language).toBe("ar");
  });
});
