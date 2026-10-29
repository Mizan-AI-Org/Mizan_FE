import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { BranchScopePayload } from "@/contexts/AuthContext.types";

let scope: BranchScopePayload | undefined;
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: { id: "u1", branch_scope: scope } }) }));
vi.mock("@/hooks/use-language", () => ({ useLanguage: () => ({ t: (key: string) => key }) }));

const twoBranches: BranchScopePayload = {
  multiBranch: true,
  all: true,
  home: { id: "a", name: "Maarif" },
  visible: [
    { id: "a", name: "Maarif" },
    { id: "b", name: "Anfa" },
  ],
  managed: ["a", "b"],
  allowed: ["a"],
};

async function mount() {
  const { BranchScopeProvider } = await import("@/contexts/BranchScopeContext");
  const { BranchSwitcher } = await import("@/components/layout/BranchSwitcher");
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <BranchScopeProvider>
        <BranchSwitcher />
      </BranchScopeProvider>
    </QueryClientProvider>,
  );
}

describe("branch scope", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules(); // the fetch wrapper is installed once per module load
  });

  it("shows no switcher for a single-branch business", async () => {
    scope = { ...twoBranches, multiBranch: false, visible: [{ id: "a", name: "Maarif" }] };
    await mount();
    expect(screen.queryByLabelText("branches.switcher.label")).toBeNull();
  });

  it("shows no switcher for someone who covers one branch", async () => {
    scope = { ...twoBranches, all: false, visible: [{ id: "b", name: "Anfa" }] };
    await mount();
    expect(screen.queryByLabelText("branches.switcher.label")).toBeNull();
  });

  it("starts on all branches and sends the picked branch to the API", async () => {
    scope = twoBranches;
    const seen: Headers[] = [];
    window.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      seen.push(new Headers(init?.headers));
      return new Response("{}");
    }) as typeof fetch;
    window.localStorage.setItem("mizan.branch.u1", "b");
    await mount();
    expect(screen.getByLabelText("branches.switcher.label")).toBeTruthy();
    await waitFor(async () => {
      await fetch("/api/inventory/");
      expect(seen.at(-1)?.get("X-Mizan-Location")).toBe("b");
    });
    await fetch("https://elsewhere.example/x");
    expect(seen.at(-1)?.get("X-Mizan-Location")).toBeNull();
  });
});
