import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { LanguageContext } from "@/contexts/LanguageContext";
import { FirstRunChecklistCard, checklistItems, type ResponsibilityGap } from "./FirstRunChecklist";

const t = (key: string, opts?: Record<string, string>) => {
  if (key === "firstrun.gap_line" && opts) return `${opts.area}: ${opts.label}`;
  return key;
};
const wrap = (node: React.ReactNode) => {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <LanguageContext.Provider value={{ language: "en", setLanguage: () => {}, t, isRTL: false, isChanging: false }}>
          {node}
        </LanguageContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

const sampleGaps: ResponsibilityGap[] = [
  { item_id: "1", key: "finance", label: "Finance and invoices", area: "Finance" },
];

describe("FirstRunChecklist", () => {
  const none = { team_invited: false, schedule_created: false, work_zone_set: false, pos_connected: false };
  afterEach(() => window.localStorage.clear());

  it("keeps the four first-run steps in order", () => {
    expect(checklistItems(none).map((i) => i.key)).toEqual([
      "team_invited",
      "schedule_created",
      "work_zone_set",
      "pos_connected",
    ]);
  });

  it("is one quiet line: the next step and its action, the rest on demand", () => {
    wrap(<FirstRunChecklistCard state={none} gaps={[]} />);
    expect(screen.getByText("firstrun.team_invited")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /_cta$/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /firstrun\.all_steps/ }));
    expect(screen.getAllByRole("button", { name: /_cta$/ }).length).toBeGreaterThanOrEqual(4);
  });

  it("shows nothing once setup and responsibilities are complete", () => {
    const { container } = wrap(
      <FirstRunChecklistCard
        state={{ team_invited: true, schedule_created: true, work_zone_set: true, pos_connected: true }}
        gaps={[]}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("lists unassigned responsibilities in All steps", () => {
    wrap(<FirstRunChecklistCard state={{ ...none, team_invited: true, schedule_created: true, work_zone_set: true, pos_connected: true }} gaps={sampleGaps} />);
    fireEvent.click(screen.getByRole("button", { name: /firstrun\.all_steps/ }));
    expect(screen.getAllByText("Finance: Finance and invoices").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("responsibilities.gaps_intro")).toBeInTheDocument();
  });

  it("can be put away for a week", () => {
    const { container } = wrap(<FirstRunChecklistCard state={none} gaps={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "firstrun.hide" }));
    expect(container).toBeEmptyDOMElement();
    expect(Number(window.localStorage.getItem("mizan_setup_hidden_until"))).toBeGreaterThan(Date.now());
  });
});