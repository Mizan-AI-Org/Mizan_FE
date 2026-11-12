import { describe, expect, it } from "vitest";

import { parseLines, rowsToPreviewCsv, splitNameAndTitle } from "./staffPaste";

const one = (line: string, fallback = "STAFF") => parseLines(line, fallback).rows[0];

describe("parseLines job titles", () => {
  it("keeps a trailing title out of the name when the line has no separators", () => {
    expect(one("Fatima Zahra 0612345678 Serveuse")).toEqual({
      first_name: "Fatima", last_name: "Zahra", phone: "0612345678", title: "Serveuse",
    });
  });

  it("finds a title before the number and multi-word titles", () => {
    expect(one("Karim Alami Chef de rang +212 6 12 34 56 78")).toMatchObject({
      first_name: "Karim", last_name: "Alami", phone: "+212 6 12 34 56 78", title: "Chef de rang",
    });
    expect(one("Plongeur Said 0698765432")).toMatchObject({ first_name: "Said", title: "Plongeur" });
  });

  it("treats separated cells after the number as the title", () => {
    expect(one("Amina\tBenali\t0612345678\tCuisinière")).toMatchObject({
      first_name: "Amina", last_name: "Benali", title: "Cuisinière",
    });
    expect(one("Youssef, 0612345678, Agent d'entretien")).toMatchObject({ first_name: "Youssef", title: "Agent d'entretien" });
    expect(one("0612345678, Fatima Zahra, Plongeuse")).toMatchObject({ first_name: "Fatima", last_name: "Zahra", title: "Plongeuse" });
    expect(one("Serveuse, Fatima Zahra, 0612345678")).toMatchObject({ first_name: "Fatima", title: "Serveuse" });
  });

  it("sends a title without a role so the backend picks the role", () => {
    expect(one("Fatima 0612345678 Serveuse", "CHEF").role).toBeUndefined();
    expect(one("Hassan, 0612345678, Plongeur").title).toBe("Plongeur");
  });

  it("keeps role codes working", () => {
    expect(one("Amina Benali, +212612345678, CHEF")).toEqual({
      first_name: "Amina", last_name: "Benali", phone: "+212612345678", role: "CHEF",
    });
    expect(one("Youssef Idrissi, +212698765432", "WAITER")).toEqual({
      first_name: "Youssef", last_name: "Idrissi", phone: "+212698765432", role: "WAITER",
    });
    expect(one("Sara, 0612345678, WAITER, Chef de rang")).toMatchObject({ role: "WAITER", title: "Chef de rang" });
  });

  it("does not invent titles from plain names", () => {
    expect(one("Amina Benali El Fassi 0612345678")).toEqual({
      first_name: "Amina", last_name: "Benali El Fassi", phone: "0612345678", role: "STAFF",
    });
    expect(one("Amina\tBenali\t0612345678")).toMatchObject({ first_name: "Amina", last_name: "Benali" });
  });

  it("reads Arabic titles and skips lines without a number", () => {
    expect(one("محمد العلوي 0612345678 طباخ")).toMatchObject({ first_name: "محمد", last_name: "العلوي", title: "طباخ" });
    expect(parseLines("Just a name\nAli 0612345678", "STAFF").bad).toEqual(["Just a name"]);
  });

  it("splitNameAndTitle keeps at least one name word", () => {
    expect(splitNameAndTitle("Serveuse")).toEqual({ name: "Serveuse", title: "" });
    expect(splitNameAndTitle("Ali Barman")).toEqual({ name: "Ali", title: "Barman" });
  });

  it("builds the preview CSV with the title (or role code) in the title column", () => {
    const { rows } = parseLines("Fatima, 0612345678, Serveuse\nAli, 0698765432, CHEF", "STAFF");
    const csv = rowsToPreviewCsv(rows).split("\n");
    expect(csv[0]).toBe("first_name,last_name,phone,title");
    expect(csv[1]).toBe("Fatima,,0612345678,Serveuse");
    expect(csv[2]).toBe("Ali,,0698765432,CHEF");
  });
});
