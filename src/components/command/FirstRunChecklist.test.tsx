import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { LanguageContext } from "@/contexts/LanguageContext";
import { FirstRunChecklistCard, checklistItems } from "./FirstRunChecklist";

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

  it("lists the four first-run tasks, each with a place to go", () => {
    expect(checklistItems(none).map((i) => i.key)).toEqual([
      "team_invited",
      "schedule_created",
      "work_zone_set",
      "pos_connected",
    ]);
    wrap(<FirstRunChecklistCard state={none} />);
    expect(screen.getAllByRole("button", { name: /_cta$/ })).toHaveLength(4);
  });

  it("shows nothing once everything is set up", () => {
    const { container } = wrap(
      <FirstRunChecklistCard state={{ team_invited: true, schedule_created: true, work_zone_set: true, pos_connected: true }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the work-zone nudge only while it is missing", () => {
    wrap(<FirstRunChecklistCard state={{ ...none, team_invited: true, schedule_created: true, pos_connected: true }} />);
    expect(screen.getByText("firstrun.work_zone_set")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /_cta$/ })).toHaveLength(1);
  });
});
