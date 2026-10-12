import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LanguageContext } from "@/contexts/LanguageContext";
import type { CustomWidgetTasksResponse, DashboardTaskDemandItem } from "@/lib/types";

const getCustomWidgetTasks = vi.fn();

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    api: { ...actual.api, getCustomWidgetTasks: (...args: unknown[]) => getCustomWidgetTasks(...args) },
  };
});

import { CustomWidgetTasksCard } from "./DashboardWidgets";

function task(n: number): DashboardTaskDemandItem {
  return {
    id: `task-${n}`,
    title: `Wedding task ${n}`,
    description: null,
    priority: "MEDIUM",
    status: "PENDING",
  } as DashboardTaskDemandItem;
}

function payload(count: number, total: number): CustomWidgetTasksResponse {
  const pending = Array.from({ length: count }, (_, i) => task(i + 1));
  return {
    widget_id: "w1",
    title: "Wedding Farid",
    items: pending,
    pending,
    in_progress: [],
    completed: [],
    counts: { open: total, in_progress: 0, completed: 0, pending: total },
    generated_at: new Date().toISOString(),
  };
}

describe("CustomWidgetTasksCard More", () => {
  beforeEach(() => {
    getCustomWidgetTasks.mockReset();
    getCustomWidgetTasks.mockImplementation((_id: string, limit: number) =>
      Promise.resolve(payload(Math.min(limit, 6), 6)),
    );
  });

  it("opens the full list inside the widget instead of Live Ops", async () => {
    const navigate = vi.fn();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <LanguageContext.Provider
          value={{ language: "en", setLanguage: () => {}, t: (key: string) => key, isRTL: false, isChanging: false }}
        >
          <MemoryRouter>
            <CustomWidgetTasksCard
              def={{ id: "w1", slot_id: "custom:w1", title: "Wedding Farid", subtitle: "", link_url: "", icon: "" }}
              cardBase=""
              cardHeaderBase=""
              t={(key: string) => key}
              navigate={navigate}
            />
          </MemoryRouter>
        </LanguageContext.Provider>
      </QueryClientProvider>,
    );

    await screen.findByText("Wedding task 1");
    expect(screen.queryByText("Wedding task 6")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "dashboard.category_tasks.more" }));

    await screen.findByText("Wedding task 6");
    expect(getCustomWidgetTasks).toHaveBeenLastCalledWith("w1", 25);
    expect(navigate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "dashboard.category_tasks.less" }));
    await waitFor(() => expect(screen.queryByText("Wedding task 6")).toBeNull());
    expect(navigate).not.toHaveBeenCalled();
  });
});
