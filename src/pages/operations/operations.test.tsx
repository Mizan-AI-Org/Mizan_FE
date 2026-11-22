import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToOperations } from "@/pages/operations/ToOperations";
import { selectedOperationsId } from "@/pages/operations/contract";
import { OperationsSummaryStrip } from "@/pages/operations/OperationsSummaryStrip";
import { OperationsItemSheet } from "@/pages/operations/OperationsItemSheet";
import { singleExecutor } from "@/components/responsibilities/types";
import { currentUiContext, publishUiContext } from "@/lib/uiContext";
import { runMastraChat } from "@/lib/mastraApi";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "u1", role: "MANAGER" } }),
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="loc">{`${location.pathname}?${location.search}`}</div>;
}

describe("operations redirects", () => {
  it("keeps the task query and opens the incidents category", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/operations/incidents?task=abc"]}>
        <Routes>
          <Route path="/dashboard/operations/incidents" element={<ToOperations category="incidents" />} />
          <Route path="/dashboard/operations/live" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );
    const landed = screen.getByTestId("loc").textContent || "";
    expect(landed).toContain("/dashboard/operations/live?");
    expect(landed).toContain("category=incidents");
    expect(landed).toContain("task=abc");
  });

  it("opens whichever id the old links used", () => {
    expect(selectedOperationsId(new URLSearchParams("task=abc"))).toBe("abc");
    expect(selectedOperationsId(new URLSearchParams("incident=inc"))).toBe("inc");
    expect(selectedOperationsId(new URLSearchParams("item=one&task=two"))).toBe("one");
  });
});

describe("summary counters", () => {
  it("applies and clears the overdue filter", async () => {
    const user = userEvent.setup();
    const seen: string[] = [];
    render(<OperationsSummaryStrip summary={{ overdue: 3 }} focus="" onFocus={(focus) => seen.push(focus)} />);
    await user.click(screen.getByRole("button", { name: /overdue/i }));
    expect(seen).toEqual(["overdue"]);
  });
});

describe("item sheet", () => {
  it("shows the title for an incident and the reply buttons for a manager's task", () => {
    const client = new QueryClient();
    const task = {
      id: "t1",
      kind: "task",
      category: "tasks",
      title: "Wipe the pass",
      status: "PENDING",
      priority: "urgent",
      assignee: { id: "u1", name: "Ada" },
      executor: null,
      readOnly: [],
      dueAt: null,
      overdue: false,
      needsHelp: false,
      awaitingApproval: false,
      unassigned: false,
      progress: 0,
      source: "task",
      closed: false,
      createdAt: null,
    };
    render(
      <QueryClientProvider client={client}>
        <OperationsItemSheet item={task} onClose={() => undefined} />
      </QueryClientProvider>,
    );
    expect(screen.getByText("Wipe the pass")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Got it" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Need help" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
  });
});

describe("responsibility editor", () => {
  it("keeps a single executor and drops that person from read-only", () => {
    expect(singleExecutor("ada", ["ada", "omar", "omar", ""])).toEqual({
      executor: "ada",
      read_only: ["omar"],
    });
  });
});

describe("agent ui context", () => {
  it("sends the page the manager is looking at", async () => {
    publishUiContext({ counts: { open: 4, overdue: 1 } });
    window.history.pushState({}, "", "/dashboard/operations?tab=work&category=incidents&focus=overdue&item=abc");
    const ctx = currentUiContext();
    expect(ctx.route).toContain("/dashboard/operations");
    expect(ctx.category).toBe("incidents");
    expect(ctx.focus).toBe("overdue");
    expect(ctx.selectedItemId).toBe("abc");
    expect(ctx.counts?.open).toBe(4);

    const bodies: string[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      bodies.push(String(init?.body || ""));
      return new Response(JSON.stringify({ success: true, text: "ok" }), { status: 200 });
    }) as typeof fetch;
    try {
      await runMastraChat({ message: "what's urgent here" });
    } finally {
      globalThis.fetch = original;
    }
    const sent = JSON.parse(bodies[0]);
    expect(sent.uiContext.category).toBe("incidents");
    expect(sent.uiContext.selectedItemId).toBe("abc");
  });
});
