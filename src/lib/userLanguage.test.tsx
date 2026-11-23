import "@testing-library/jest-dom";
import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { User } from "@/contexts/AuthContext.types";
import { normalizeAppLanguage, resolveUserLanguage } from "@/lib/userLanguage";

const fakeI18n = vi.hoisted(() => ({
  language: "en",
  changeLanguage: vi.fn(async (lng: string) => {
    fakeI18n.language = lng;
  }),
}));
vi.mock("@/i18n", () => ({ default: fakeI18n }));

const person = (language: string | null | undefined, business: string | undefined): User =>
  ({
    id: "u1",
    email: "owner@example.test",
    first_name: "Sara",
    last_name: "Owner",
    role: "OWNER",
    restaurant: "r1",
    restaurant_name: "Cafe",
    language,
    restaurant_data: { id: "r1", name: "Cafe", address: "", language: business },
  }) as User;

describe("resolveUserLanguage", () => {
  it("uses the person's own language over the business default", () => {
    expect(resolveUserLanguage(person("ar", "en"), "fr")).toBe("ar");
    expect(resolveUserLanguage(person("fr", "ar"), "en")).toBe("fr");
  });

  it("falls back to the business default, then the current language", () => {
    expect(resolveUserLanguage(person(null, "fr"), "en")).toBe("fr");
    expect(resolveUserLanguage(person("", undefined), "ar")).toBe("ar");
    expect(resolveUserLanguage(person("de", "xx"), "fr")).toBe("fr");
    expect(resolveUserLanguage(null, "fr")).toBe("fr");
  });

  it("normalises regional and legacy codes", () => {
    expect(normalizeAppLanguage("fr-FR")).toBe("fr");
    expect(normalizeAppLanguage("ma")).toBe("ar");
    expect(normalizeAppLanguage("ary")).toBe("ar");
    expect(normalizeAppLanguage("de")).toBeNull();
    expect(resolveUserLanguage(person("ma", "en"))).toBe("ar");
  });
});

describe("AuthProvider applyLanguageForUser", () => {
  beforeEach(() => {
    window.localStorage.clear();
    fakeI18n.language = "en";
    fakeI18n.changeLanguage.mockClear();
  });

  async function mountWith(u: User) {
    const { AuthProvider } = await import("@/contexts/AuthContext.tsx");
    const { useAuth } = await import("@/hooks/use-auth");
    let update: ((u: User) => void) | undefined;
    const Probe = () => {
      update = useAuth().updateUser;
      return null;
    };
    render(
      <MemoryRouter>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </MemoryRouter>,
    );
    await act(async () => update!(u));
  }

  it("never overrides a person's own language with the business one", async () => {
    await mountWith(person("ar", "en"));
    expect(fakeI18n.changeLanguage).toHaveBeenCalledWith("ar");
    expect(window.localStorage.getItem("language")).toBe("ar");
  });

  it("uses the business default when the person has none", async () => {
    await mountWith(person(undefined, "fr"));
    expect(fakeI18n.changeLanguage).toHaveBeenCalledWith("fr");
    expect(window.localStorage.getItem("language")).toBe("fr");
  });

  it("keeps the current language when neither is set", async () => {
    fakeI18n.language = "fr";
    await mountWith(person(null, undefined));
    expect(fakeI18n.changeLanguage).not.toHaveBeenCalled();
    expect(window.localStorage.getItem("language")).toBe("fr");
  });
});
