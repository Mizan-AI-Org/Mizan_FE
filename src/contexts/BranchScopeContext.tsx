/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { API_BASE } from "@/lib/api";
import type { BranchBrief, BranchScopePayload } from "@/contexts/AuthContext.types";

/**
 * Which branch the dashboard is looking at (multi-location businesses).
 *
 * The choice travels on every API call as X-Mizan-Location: Django scopes reads to it and new records default to
 * it; Miya's chat follows it too. "all" (or a single-branch business) sends nothing, so nothing changes for them.
 */

export const ALL_BRANCHES = "all";

type BranchScopeValue = {
  multiBranch: boolean;
  /** Branches this person covers. */
  branches: BranchBrief[];
  home: BranchBrief | null;
  /** Covers more than one branch: can pick "All branches". */
  canSeeSeveral: boolean;
  selected: string;
  selectedBranch: BranchBrief | null;
  setSelected: (id: string) => void;
};

const fallback: BranchScopeValue = {
  multiBranch: false,
  branches: [],
  home: null,
  canSeeSeveral: false,
  selected: ALL_BRANCHES,
  selectedBranch: null,
  setSelected: () => undefined,
};

const BranchScopeContext = createContext<BranchScopeValue>(fallback);

let currentBranch = "";
let fetchPatched = false;

function apiPrefix(): string {
  try {
    return new URL(API_BASE, window.location.origin).href.replace(/\/$/, "");
  } catch {
    return API_BASE;
  }
}

/** Adds X-Mizan-Location to calls to our API while a branch is selected (installed once). */
function installBranchHeader() {
  if (fetchPatched || typeof window === "undefined" || typeof window.fetch !== "function") return;
  fetchPatched = true;
  const original = window.fetch.bind(window);
  const prefix = apiPrefix();
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (!currentBranch) return original(input, init);
    const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    let url = raw;
    try {
      url = new URL(raw, window.location.origin).href;
    } catch {
      /* keep raw */
    }
    if (!url.startsWith(prefix)) return original(input, init);
    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
    if (!headers.has("X-Mizan-Location")) headers.set("X-Mizan-Location", encodeURIComponent(currentBranch));
    if (input instanceof Request && !init) return original(new Request(input, { headers }));
    return original(input, { ...init, headers });
  };
}

function storageKey(userId: string) {
  return `mizan.branch.${userId}`;
}

function readStored(userId: string): string {
  try {
    return window.localStorage.getItem(storageKey(userId)) || "";
  } catch {
    return "";
  }
}

export const BranchScopeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth() as { user: { id: string; branch_scope?: BranchScopePayload } | null };
  const queryClient = useQueryClient();
  const scope = user?.branch_scope;
  const branches = useMemo(() => scope?.visible ?? [], [scope]);
  const multiBranch = Boolean(scope?.multiBranch) && branches.length > 0;
  const canSeeSeveral = multiBranch && branches.length > 1;
  const home = scope?.home ? branches.find((b) => b.id === scope.home?.id) ?? null : null;

  const initial = (): string => {
    if (!user || !multiBranch) return ALL_BRANCHES;
    const stored = readStored(user.id);
    if (stored === ALL_BRANCHES && canSeeSeveral) return ALL_BRANCHES;
    if (stored && branches.some((b) => b.id === stored)) return stored;
    return canSeeSeveral ? ALL_BRANCHES : branches[0]?.id ?? ALL_BRANCHES;
  };
  const [selected, setSelectedState] = useState<string>(initial);

  useEffect(() => {
    setSelectedState(initial());
    // Re-evaluate when the person or their branches change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, multiBranch, branches.map((b) => b.id).join(",")]);

  useEffect(() => {
    installBranchHeader();
  }, []);

  useEffect(() => {
    const next = multiBranch && selected !== ALL_BRANCHES ? selected : "";
    if (next !== currentBranch) {
      currentBranch = next;
      void queryClient.invalidateQueries();
    }
  }, [multiBranch, selected, queryClient]);

  useEffect(() => () => {
    currentBranch = "";
  }, []);

  const setSelected = useCallback(
    (id: string) => {
      setSelectedState(id);
      if (user) {
        try {
          window.localStorage.setItem(storageKey(user.id), id);
        } catch {
          /* per-viewer convenience only */
        }
      }
    },
    [user],
  );

  const value = useMemo<BranchScopeValue>(
    () => ({
      multiBranch,
      branches,
      home,
      canSeeSeveral,
      selected,
      selectedBranch: branches.find((b) => b.id === selected) ?? null,
      setSelected,
    }),
    [multiBranch, branches, home, canSeeSeveral, selected, setSelected],
  );

  return <BranchScopeContext.Provider value={value}>{children}</BranchScopeContext.Provider>;
};

export function useBranchScope(): BranchScopeValue {
  return useContext(BranchScopeContext);
}
