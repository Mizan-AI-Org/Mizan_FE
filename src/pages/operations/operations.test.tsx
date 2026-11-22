import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import en from "../../../public/locales/en.json";
import { ToOperations } from "@/pages/operations/ToOperations";
import { operationsViewFromParams, selectedOperationsId, type OperationsItem } from "@/pages/operations/contract";
import { OperationsSummaryStrip } from "@/pages/operations/OperationsSummaryStrip";
import { OperationsItemSheet } from "@/pages/operations/OperationsItemSheet";
import { currentUiContext, publishUiContext } from "@/lib/uiContext";
import { runMastraChat } from "@/lib/mastraApi";
import { api } from "@/lib/api";
import { DOMAIN_SECTIONS } from "@/lib/mizan-domains";

vi.mock("@/hooks/use-language", () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, string | number>) => {
      const text = (en as Record<string, string>)[key] ?? key;
      return text.replace(/\{\{(\w+)\}\}/g, (_m, name) => String(vars?.[name] ?? ""));
    },
  }),
}));
vi.mock("@/components/dashboard/TaskAssigneePicker", () => ({
  TaskAssigneePicker: () => <div data-testid="assignee-picker" />,
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="loc">{`${location.pathname}?${location.search}`}</div>;
}

function task(extra: Partial<OperationsItem> = {}): OperationsItem {
  return {
    id: "t1",
    kind: "task",
    category: "tasks",
    title: "Wipe the pass",
    status: "PENDING",
    lane: "pending",
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
    actions: ["open", "assign", "got_it", "need_help", "done"],
    ...extra,
  };
}

function renderSheet(item: OperationsItem) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <OperationsItemSheet item={item} onClose={() => undefined} />
    </QueryClientProvider>,
  );
}

describe("operations redirects", () => {
  it("keeps the query and opens the category on the unified page", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/tasks?task=abc"]}>
        <Routes>
          <Route path="/dashboard/tasks" element={<ToOperations category="tasks" />} />
          <Route path="/dashboard/operations" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );
    const landed = screen.getByTestId("loc").textContent || "";
    expect(landed).toContain("/dashboard/operations?");
    expect(landed).toContain("category=tasks");
    expect(landed).toContain("task=abc");
  });

  it("turns the old ?view=board link into the board layout", () => {
    render(
      <MemoryRouter initialEntries={["/old?view=board"]}>
        <Routes>
          <Route path="/old" element={<ToOperations />} />
          <Route path="/dashboard/operations" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );
    const landed = screen.getByTestId("loc").textContent || "";
    expect(landed).toContain("layout=board");
    expect(landed).not.toContain("view=");
  });

  it("opens whichever id the old links used", () => {
    expect(selectedOperationsId(new URLSearchParams("task=abc"))).toBe("abc");
    expect(selectedOperationsId(new URLSearchParams("incident=inc"))).toBe("inc");
    expect(selectedOperationsId(new URLSearchParams("item=one&task=two"))).toBe("one");
  });

  it("keeps the progress deep link and the old compliance tab link", () => {
    expect(operationsViewFromParams(new URLSearchParams("view=progress&tab=staff"))).toBe("progress");
    expect(operationsViewFromParams(new URLSearchParams("view=accountability"))).toBe("accountability");
    expect(operationsViewFromParams(new URLSearchParams("tab=compliance"))).toBe("compliance");
    expect(operationsViewFromParams(new URLSearchParams(""))).toBe("work");
  });
});

describe("navigation", () => {
  it("keeps every Operations destination reachable", () => {
    const hrefs = DOMAIN_SECTIONS.operations.map((leaf) => leaf.href);
    for (const href of [
      "/dashboard/operations",
      "/dashboard/operations/live",
      "/dashboard/operations?view=accountability",
      "/dashboard/operations?view=progress",
      "/dashboard/operations?view=compliance",
      "/dashboard/operations/approvals",
      "/dashboard/operations/incidents",
      "/dashboard/operations/checklists",
      "/dashboard/operations/agency-jobs",
    ]) {
      expect(hrefs).toContain(href);
    }
    expect(DOMAIN_SECTIONS.operations.find((l) => l.href.includes("accountability"))?.moduleId).toBe("accountability");
    expect(DOMAIN_SECTIONS.employees.map((l) => l.href)).toContain("/dashboard/staff-requests");
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
  beforeEach(() => vi.restoreAllMocks());

  it("shows the reply buttons and the assignee picker the server allows", () => {
    renderSheet(task());
    expect(screen.getByText("Wipe the pass")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Got it" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Need help" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
    expect(screen.getByTestId("assignee-picker")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Validate" })).toBeNull();
  });

  it("shows no action the server did not offer (an incident can only be opened)", () => {
    renderSheet(task({ kind: "incident", category: "incidents", actions: ["open"] }));
    expect(screen.queryByRole("button", { name: "Got it" })).toBeNull();
    expect(screen.queryByTestId("assignee-picker")).toBeNull();
  });

  it("claims first-come: the first tap wins", async () => {
    const claim = vi.spyOn(api, "claimOperationsItem").mockResolvedValue({ won: true, message: "It's yours", claimedBy: null });
    renderSheet(
      task({
        kind: "staff_request",
        category: "staff_requests",
        unassigned: true,
        assignee: null,
        claim: { open: true, claimable: true, claimedBy: null, candidates: 2 },
        actions: ["open", "claim", "assign"],
      }),
    );
    await userEvent.setup().click(screen.getByRole("button", { name: "I'll take it" }));
    await waitFor(() => expect(claim).toHaveBeenCalledWith("staff_request", "t1"));
  });

  it("validates, or sends back with the reason", async () => {
    const review = vi.spyOn(api, "reviewDashboardTask").mockResolvedValue({ success: true });
    const user = userEvent.setup();
    renderSheet(task({ awaitingApproval: true, actions: ["open", "assign", "validate", "send_back"] }));
    await user.click(screen.getByRole("button", { name: "Send back" }));
    await user.type(screen.getByPlaceholderText("Why is it sent back?"), "Redo the corners");
    await user.click(screen.getAllByRole("button", { name: "Send back" })[0]);
    await waitFor(() => expect(review).toHaveBeenCalledWith("t1", false, "Redo the corners"));
  });

  it("answers got it / need help through the existing status endpoint", async () => {
    const status = vi.spyOn(api, "updateDashboardTaskStatus").mockResolvedValue({} as never);
    renderSheet(task());
    await userEvent.setup().click(screen.getByRole("button", { name: "Need help" }));
    await waitFor(() => expect(status).toHaveBeenCalledWith("t1", "NEED_HELP"));
  });
});

describe("agent ui context", () => {
  it("sends the page the manager is looking at", async () => {
    window.history.pushState({}, "", "/dashboard/operations?view=work&category=incidents&focus=overdue&item=abc");
    publishUiContext({ counts: { open: 4, overdue: 1 } });
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
