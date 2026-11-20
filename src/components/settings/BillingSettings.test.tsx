import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LanguageContext } from "@/contexts/LanguageContext";
import type { BillingOverview } from "@/lib/types";

const reportBillingPayment = vi.fn();
const getBillingOverview = vi.fn();

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    api: {
      ...actual.api,
      getBillingOverview: (...a: unknown[]) => getBillingOverview(...a),
      reportBillingPayment: (...a: unknown[]) => reportBillingPayment(...a),
      getTenantModules: () => Promise.resolve({ selected: [], modules: [] }),
    },
  };
});
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: { role: "SUPER_ADMIN" } }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import BillingSettings, { transferReferenceOf } from "./BillingSettings";

const t = (key: string, opts?: Record<string, string | number> | string) =>
  opts && typeof opts === "object" ? `${key} ${JSON.stringify(opts)}` : key;

const quote = { currency: "MAD", total: 780, taxRate: 20, taxAmount: 156, totalTtc: 936, monthlyTotal: 780, yearlySavings: 0, interval: "month", lines: [] };
const invoice = {
  id: "i1", number: "MZ-2026-000007", kind: "cycle", status: "open", total: 936, currency: "MAD", overdue: false,
  dueAt: "2026-11-20T00:00:00Z", issuedAt: "2026-11-13T00:00:00Z", periodStart: "", periodEnd: "", lines: [],
  reportedAt: null, reportedReference: "", reportedNote: "", transferReference: "MZ-2026-000007",
};
const overview = (over: Partial<BillingOverview> = {}) =>
  ({
    moduleBilling: true, status: "unpaid", state: "due", interval: "month", trialEndsAt: null, trialDaysLeft: null,
    nextInvoiceAt: null, suspended: false, locations: 1, current: quote, monthly: quote, yearly: quote, bundleOffers: [],
    openInvoices: [invoice], balanceDue: 936, invoices: [invoice],
    paymentInstructions: { beneficiary: "Mizan SARL", bankName: "CIH", rib: "011780", swift: "", instructions: "", contactEmail: "", taxLabel: "TVA", taxRate: 20 },
    billingDetails: {}, graceDays: 7, ...over,
  }) as unknown as BillingOverview;

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <LanguageContext.Provider value={{ language: "en", setLanguage: () => {}, t, isRTL: false, isChanging: false }}>
        <MemoryRouter>
          <BillingSettings />
        </MemoryRouter>
      </LanguageContext.Provider>
    </QueryClientProvider>,
  );
}

describe("BillingSettings payment UX", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reportBillingPayment.mockResolvedValue({});
  });

  it("builds the transfer reference from the invoice numbers", () => {
    expect(transferReferenceOf([invoice as never, { ...invoice, number: "MZ-2026-000008", transferReference: undefined } as never])).toBe(
      "MZ-2026-000007, MZ-2026-000008",
    );
  });

  it("shows the exact amount and reference, and never the old billing@mizan.ai domain", async () => {
    getBillingOverview.mockResolvedValue(overview({ paymentInstructions: { ...overview().paymentInstructions, rib: "" } }));
    mount();
    await screen.findByText(/billing.pay.exact/);
    expect(screen.getByText(/billing.pay.exact/).textContent).toContain("MZ-2026-000007");
    expect(document.body.textContent).toContain("billing@heymizan.ai");
    expect(document.body.textContent).not.toContain("billing@mizan.ai");
  });

  it("reports a payment without typing a reference", async () => {
    getBillingOverview.mockResolvedValue(overview());
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "billing.i_have_paid" }));
    fireEvent.click(await screen.findByRole("button", { name: "billing.report.submit" }));
    await waitFor(() => expect(reportBillingPayment).toHaveBeenCalledWith("i1", "", "", null));
  });

  it("offers to keep the subscription while a cancellation is scheduled", async () => {
    getBillingOverview.mockResolvedValue(overview({ state: "active", openInvoices: [], balanceDue: 0, cancelAtPeriodEnd: true, cancelEffectiveAt: "2026-12-01T00:00:00Z" }));
    mount();
    expect(await screen.findByRole("button", { name: "billing.cancel_sub.keep_sub" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "billing.cancel_sub.title" })).toBeNull();
  });
});
