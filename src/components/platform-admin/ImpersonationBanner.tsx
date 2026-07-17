import React from "react";
import { getImpersonation, exitImpersonation } from "@/lib/impersonation";

/** Fixed banner while an operator is viewing the app as a tenant. */
export default function ImpersonationBanner() {
  const state = getImpersonation();
  if (!state) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[2100] flex items-center justify-center gap-4 bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-md">
      <span>
        Viewing as {state.restaurant.name} — support session
      </span>
      <button
        type="button"
        onClick={() => {
          const returnTo = exitImpersonation();
          window.location.replace(returnTo);
        }}
        className="rounded bg-slate-950 px-3 py-1 text-xs font-bold text-amber-300 hover:bg-slate-800"
      >
        Exit
      </button>
    </div>
  );
}
