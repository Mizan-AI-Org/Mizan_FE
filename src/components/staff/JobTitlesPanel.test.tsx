import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LanguageContext } from "@/contexts/LanguageContext";

const applyTitleMapping = vi.fn();
const getTitleMappings = vi.fn();

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    api: {
      ...actual.api,
      applyTitleMapping: (...args: unknown[]) => applyTitleMapping(...args),
      getTitleMappings: (...args: unknown[]) => getTitleMappings(...args),
    },
  };
});
vi.mock("@/hooks/use-business-vertical", () => ({
  useBusinessVertical: () => ({ data: { businessVertical: "RESTAURANT", customStaffRoles: [{ id: "c1", name: "Plonge lead" }] } }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

import { JobTitlesSettings, UnmatchedTitlesPanel } from "./JobTitlesPanel";

const t = (key: string, opts?: Record<string, string | number> | string) =>
  opts && typeof opts === "object" ? `${key} ${JSON.stringify(opts)}` : key;

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

describe("UnmatchedTitlesPanel", () => {
  beforeEach(() => {
    applyTitleMapping.mockReset();
    getTitleMappings.mockReset();
  });

  it("renders nothing without unmatched titles or lowered roles", () => {
    const { container } = wrap(<UnmatchedTitlesPanel unmatched={[]} lowered={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows one row per title and applies the picked role, remembered", async () => {
    applyTitleMapping.mockResolvedValue({ title: "Plongeur", role: "CHEF", updated: 5, skipped: [], label: "Plongeur" });
    const onApplied = vi.fn();
    wrap(
      <UnmatchedTitlesPanel
        unmatched={[
          { title: "Plongeur", count: 5, people: [] },
          { title: "Voiturier chef", count: 1, people: [] },
        ]}
        onApplied={onApplied}
      />,
    );
    expect(screen.getAllByTestId("job-title-row")).toHaveLength(2);
    expect(screen.getByText("(5)")).toBeInTheDocument();

    const picker = screen.getByLabelText(/role_for.*Plongeur/) as HTMLSelectElement;
    // Title roles plus the business's custom title.
    expect(Array.from(picker.options).map((o) => o.value)).toContain("CUSTOM:c1");
    const apply = screen.getAllByRole("button", { name: /staff.job_titles.apply/ })[0];
    expect(apply).toBeDisabled();

    fireEvent.change(picker, { target: { value: "CHEF" } });
    fireEvent.click(apply);
    await waitFor(() => expect(onApplied).toHaveBeenCalledWith("Plongeur"));
    expect(applyTitleMapping).toHaveBeenCalledWith({ title: "Plongeur", role: "CHEF", remember: true });
  });

  it("sends a custom title as customRoleId", async () => {
    applyTitleMapping.mockResolvedValue({ updated: 1, skipped: [] });
    wrap(<UnmatchedTitlesPanel unmatched={[{ title: "Plongeur", count: 1, people: [] }]} />);
    fireEvent.change(screen.getByLabelText(/role_for/), { target: { value: "CUSTOM:c1" } });
    fireEvent.click(screen.getByRole("button", { name: /staff.job_titles.apply/ }));
    await waitFor(() =>
      expect(applyTitleMapping).toHaveBeenCalledWith({ title: "Plongeur", customRoleId: "c1", remember: true }),
    );
  });

  it("explains roles lowered by the inviter's rank", () => {
    wrap(<UnmatchedTitlesPanel lowered={[{ name: "Omar", title: "Directeur", requested: "MANAGER", given: "SUPERVISOR" }]} />);
    const notice = screen.getByTestId("role-lowered");
    expect(notice.textContent).toContain("staff.job_titles.lowered");
    expect(notice.textContent).toContain('"name":"Omar"');
  });
});

describe("JobTitlesSettings", () => {
  it("lists remembered mappings and titles still waiting for a role", async () => {
    getTitleMappings.mockResolvedValue({
      roles: ["STAFF"],
      remembered: [{ title: "Serveuse", role: "WAITER" }],
      unmatchedTitles: [{ title: "Plongeur", count: 2, people: [] }],
    });
    wrap(<JobTitlesSettings />);
    await waitFor(() => expect(screen.getAllByTestId("job-title-row")).toHaveLength(2));
    expect((screen.getByLabelText(/role_for.*Serveuse/) as HTMLSelectElement).value).toBe("WAITER");
    expect(screen.getByTestId("unmatched-titles-panel")).toBeInTheDocument();
  });

  it("hides itself when the user may not manage titles", async () => {
    getTitleMappings.mockRejectedValue(new Error("Managers only"));
    const { container } = wrap(<JobTitlesSettings />);
    await waitFor(() => expect(container.querySelector("[data-testid=job-titles-settings]")).toBeNull());
  });
});
