import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const accountRequest = vi.fn();
const updateUser = vi.fn();
let currentUser: Record<string, unknown> | null;

vi.mock("@/lib/accountErrors", () => ({
  apiPost: (path: string, body: unknown) => accountRequest(path, "POST", body),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: currentUser, updateUser }) }));
vi.mock("@/hooks/use-language", () => ({ useLanguage: () => ({ t: (key: string) => key }) }));

import { WhatsAppVerifyBanner } from "./WhatsAppVerifyBanner";

describe("WhatsAppVerifyBanner", () => {
  beforeEach(() => {
    accountRequest.mockReset();
    updateUser.mockReset();
    currentUser = { id: "1", whatsapp_verification_pending: true };
  });

  it("is hidden once the number is verified", () => {
    currentUser = { id: "1", whatsapp_verification_pending: false };
    const { container } = render(<WhatsAppVerifyBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("resends the code and shows a server error in the person's language", async () => {
    accountRequest.mockResolvedValueOnce({ ok: false, error: "Attendez une minute" });
    render(<WhatsAppVerifyBanner />);
    fireEvent.click(screen.getByText("account.verify.resend"));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Attendez une minute"));
    expect(accountRequest).toHaveBeenCalledWith("/auth/me/whatsapp/", "POST", {});
  });

  it("verifies with the 6-digit code and updates the user", async () => {
    accountRequest.mockResolvedValueOnce({ ok: true, data: { user: { id: "1", whatsapp_verification_pending: false } } });
    render(<WhatsAppVerifyBanner />);
    const confirm = screen.getByText("account.verify.confirm");
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText("account.verify.code_label"), { target: { value: "12ab3456" } });
    fireEvent.click(confirm);
    await waitFor(() => expect(updateUser).toHaveBeenCalled());
    expect(accountRequest).toHaveBeenCalledWith("/auth/me/whatsapp/verify/", "POST", { code: "123456" });
  });
});
