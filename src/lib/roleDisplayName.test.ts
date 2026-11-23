import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { ROLE_CODES } from "./staffPaste";
import { roleDisplayName, translatedRoleName } from "./roleDisplayName";

for (const lang of ["en", "fr", "ar"]) {
  const dict = JSON.parse(readFileSync(`public/locales/${lang}.json`, "utf8")) as Record<string, string>;
  const t = (k: string) => dict[k] ?? k;
  describe(`role labels (${lang})`, () => {
    it("every ROLE_CODES entry has a translated add_people label", () => {
      for (const code of ROLE_CODES) expect(dict[`staff.add_people.roles.${code.toLowerCase()}`], code).toBeTruthy();
    });
    it("roleDisplayName never returns a raw key", () => {
      for (const code of [...ROLE_CODES, "OWNER", "SUPER_ADMIN"]) expect(roleDisplayName(code, t)).not.toMatch(/\./);
    });
  });
}

describe("translatedRoleName", () => {
  it("returns null for unknown/custom roles", () => {
    expect(translatedRoleName("CUSTOM:abc", (k) => k)).toBeNull();
  });
});
