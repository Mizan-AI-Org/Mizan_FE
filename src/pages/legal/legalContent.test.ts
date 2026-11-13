import { describe, expect, it } from "vitest";
import { LEGAL_CONTACT, LEGAL_DOCUMENTS, legalDocument, type LegalKind, type LegalLang } from "./legalContent";
import { LEGAL_VERSION } from "@/lib/accountErrors";
import { namesMatch } from "@/components/settings/AccountDataCard";


describe("legal documents", () => {
  const kinds: LegalKind[] = ["terms", "privacy"];
  const langs: LegalLang[] = ["en", "fr", "ar"];

  it("exist in en, fr and ar with the same structure", () => {
    for (const kind of kinds) {
      const count = LEGAL_DOCUMENTS[kind].en.sections.length;
      for (const lang of langs) {
        const doc = LEGAL_DOCUMENTS[kind][lang];
        expect(doc.title.length).toBeGreaterThan(3);
        expect(doc.sections.length).toBe(count);
        expect(doc.updated).toContain(LEGAL_VERSION);
      }
    }
  });

  it("cover what the privacy policy must (selfies, location, WhatsApp, payroll, retention, rights, law 09-08)", () => {
    const en = JSON.stringify(LEGAL_DOCUMENTS.privacy.en).toLowerCase();
    for (const word of ["selfie", "location", "whatsapp", "payroll", "90 days", "30 days", "09-08", "cndp", "gdpr", LEGAL_CONTACT.privacy]) {
      expect(en).toContain(word.toLowerCase());
    }
  });

  it("never shows a draft marker on the page", () => {
    for (const kind of kinds) for (const lang of langs) {
      expect(JSON.stringify(LEGAL_DOCUMENTS[kind][lang]).toLowerCase()).not.toContain("draft");
    }
  });

  it("falls back to English for an unknown language", () => {
    expect(legalDocument("terms", "de").title).toBe("Terms of Use");
    expect(legalDocument("terms", "fr-MA").title).toBe("Conditions d'utilisation");
  });
});

describe("closing the business needs the business name typed", () => {
  it("matches ignoring case and extra spaces, never an empty or different name", () => {
    expect(namesMatch(" dar  salma ", "Dar Salma")).toBe(true);
    expect(namesMatch("", "Dar Salma")).toBe(false);
    expect(namesMatch("Dar Salam", "Dar Salma")).toBe(false);
  });
});
