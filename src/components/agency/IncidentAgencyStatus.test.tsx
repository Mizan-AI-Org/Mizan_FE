import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { LanguageContext } from "@/contexts/LanguageContext";
import { safeMediaUrl } from "@/lib/safeUrl";

const authFetch = vi.fn();
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, authFetch: (...args: unknown[]) => authFetch(...args) };
});
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import IncidentAgencyStatus from "./IncidentAgencyStatus";

const t = (key: string) => key;

function wrap(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <LanguageContext.Provider value={{ language: "en", setLanguage: () => {}, t, isRTL: false, isChanging: false }}>
        {node}
      </LanguageContext.Provider>
    </QueryClientProvider>,
  );
}

function jobWithProof(proof: string[]) {
  return {
    agency: { id: "a1", name: "Agence" },
    job: {
      id: "j1", client: null, avenue: null, scope: "breakdown", title: "Leak", description: "", photos: [],
      urgency: "high", urgencyReason: "", respondBy: null, fixBy: null, overdue: null, status: "DONE",
      assignedTo: null, reportedBy: null, proof, events: [], incidentId: "i1", createdAt: null,
    },
  };
}

describe("safeMediaUrl", () => {
  it("keeps https and our /media/ paths only", () => {
    expect(safeMediaUrl("https://cdn.example.com/p.jpg")).toBe("https://cdn.example.com/p.jpg");
    expect(safeMediaUrl("/media/proof/p.jpg")).toBe("/media/proof/p.jpg");
    expect(safeMediaUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeMediaUrl(" JaVaScRiPt:alert(1)")).toBeUndefined();
    expect(safeMediaUrl("data:text/html,<script>alert(1)</script>")).toBeUndefined();
    expect(safeMediaUrl("http://evil.example/p.jpg")).toBeUndefined();
    expect(safeMediaUrl("/api/users/")).toBeUndefined();
    expect(safeMediaUrl("/media/../api/users/")).toBeUndefined();
    expect(safeMediaUrl("//evil.example/x")).toBeUndefined();
  });
});

describe("IncidentAgencyStatus proof link", () => {
  it("does not render a javascript: proof as a clickable link", async () => {
    authFetch.mockResolvedValue(new Response(JSON.stringify(jobWithProof(["javascript:alert(1)"])), { status: 200 }));
    wrap(<IncidentAgencyStatus incidentId="i1" />);
    await screen.findByText(/agency.badge.with/);
    expect(document.querySelector("a")).toBeNull();
    expect(document.body.innerHTML).not.toContain("javascript:");
  });

  it("renders a /media/ proof link", async () => {
    authFetch.mockResolvedValue(new Response(JSON.stringify(jobWithProof(["/media/proof/p.jpg"])), { status: 200 }));
    wrap(<IncidentAgencyStatus incidentId="i1" />);
    const link = await screen.findByRole("link");
    expect(link.getAttribute("href")).toBe("/media/proof/p.jpg");
  });
});
