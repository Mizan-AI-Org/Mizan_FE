import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { LanguageContext } from "@/contexts/LanguageContext";
import { FirstRunChecklistCard, OWNERS_ROUTE, checklistItems, countOwnerGaps } from "./FirstRunChecklist";

const t = (key: string) => key;
const wrap = (node: React.ReactNode) =>
  render(
    <MemoryRouter>
      <LanguageContext.Provider value={{ language: "en", setLanguage: () => {}, t, isRTL: false, isChanging: false }}>
        {node}
      </LanguageContext.Provider>
    </MemoryRouter>,
  );

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
    wrap(<FirstRunChecklistCard state={none} />);
    expect(screen.getByText("firstrun.team_invited")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /_cta$/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /firstrun\.all_steps/ }));
    // the popover lists every open step with its own action
    expect(screen.getAllByRole("button", { name: /_cta$/ }).length).toBeGreaterThanOrEqual(4);
  });

  it("shows nothing once everything is set up", () => {
    const { container } = wrap(
      <FirstRunChecklistCard state={{ team_invited: true, schedule_created: true, work_zone_set: true, pos_connected: true }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("points at the work zone when that is the only step left", () => {
    wrap(<FirstRunChecklistCard state={{ ...none, team_invited: true, schedule_created: true, pos_connected: true }} />);
    expect(screen.getByText("firstrun.work_zone_set")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "firstrun.work_zone_set_cta" })).toBeInTheDocument();
  });

  it("can be put away for a week", () => {
    const { container } = wrap(<FirstRunChecklistCard state={none} />);
    fireEvent.click(screen.getByRole("button", { name: "firstrun.hide" }));
    expect(container).toBeEmptyDOMElement();
    expect(Number(window.localStorage.getItem("mizan_setup_hidden_until"))).toBeGreaterThan(Date.now());
  });
  it("adds an 'areas nobody owns' step only when there is a team and gaps", () => {
    const done = { team_invited: true, schedule_created: true, work_zone_set: true, pos_connected: true };
    expect(checklistItems(done, 0)).toHaveLength(4);
    expect(checklistItems({ ...done, team_invited: false }, 5).map((i) => i.key)).not.toContain("owners_set");
    const withGaps = checklistItems(done, 5);
    expect(withGaps.at(-1)).toEqual({ key: "owners_set", route: OWNERS_ROUTE, done: false });
    expect(OWNERS_ROUTE).toContain("who-owns-what");
  });

  it("shows the owners step as the next one when it is all that is left", () => {
    wrap(
      <FirstRunChecklistCard
        state={{ team_invited: true, schedule_created: true, work_zone_set: true, pos_connected: true }}
        ownerGaps={3}
      />,
    );
    expect(screen.getByText("firstrun.owners_set")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "firstrun.owners_set_cta" })).toBeInTheDocument();
  });

  it("counts the owner areas nobody holds", () => {
    expect(countOwnerGaps(undefined)).toBe(0);
    const all = countOwnerGaps({});
    expect(all).toBeGreaterThan(10);
    expect(countOwnerGaps({ "incident.safety": ["u1"], "request.payroll": "u2", "task.bar": [] })).toBe(all - 2);
  });
});
