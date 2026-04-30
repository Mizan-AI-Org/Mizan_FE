import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { API_BASE } from "@/lib/api";
import { useLanguage } from "@/hooks/use-language";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, UserCircle2, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type TeamMemberRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role?: string;
};

function getAuthToken() {
  return localStorage.getItem("access_token") || localStorage.getItem("accessToken") || "";
}

function normalizeStaffList(data: unknown): TeamMemberRow[] {
  // The endpoint may return either an array (when pagination is bypassed
  // from the caller's settings) or a paginated ``{ count, next, previous,
  // results }`` envelope. Older shapes that nest the user inside a
  // ``user`` key are also handled so this normaliser stays a drop-in for
  // anywhere that lists "people on my team".
  const arr: unknown[] = Array.isArray(data)
    ? data
    : data && typeof data === "object" && "results" in (data as object)
      ? ((data as { results?: unknown[] }).results ?? [])
      : [];
  const out: TeamMemberRow[] = [];
  for (const row of arr) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const nested = r.user as Record<string, unknown> | undefined;
    if (nested && typeof nested.id === "string") {
      out.push({
        id: nested.id,
        email: String(nested.email ?? ""),
        first_name: String(nested.first_name ?? ""),
        last_name: String(nested.last_name ?? ""),
        role: String(nested.role ?? ""),
      });
      continue;
    }
    if (typeof r.id === "string") {
      out.push({
        id: r.id,
        email: String(r.email ?? ""),
        first_name: String(r.first_name ?? ""),
        last_name: String(r.last_name ?? ""),
        role: String(r.role ?? ""),
      });
    }
  }
  return out;
}

function displayName(m: TeamMemberRow) {
  const n = [m.first_name, m.last_name].filter(Boolean).join(" ").trim();
  return n || m.email || m.id;
}

function initialsFor(m: TeamMemberRow) {
  const a = (m.first_name || "").trim()[0] || "";
  const b = (m.last_name || "").trim()[0] || "";
  const both = `${a}${b}`.toUpperCase();
  if (both) return both;
  // Fallback to email's first letter so we never render an empty bubble.
  const e = (m.email || "").trim();
  return e ? e.slice(0, 1).toUpperCase() : "?";
}

/**
 * Friendly, human-readable label for a CustomUser.role enum value. The
 * backend speaks UPPER_SNAKE; the modal shows it as Title Case so it
 * reads naturally next to the email line.
 */
function roleLabel(role: string | undefined): string {
  if (!role) return "";
  return role
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

/**
 * Tone classes for the role badge — Owner & Admin pop in violet so the
 * highest-authority recipients are visually distinct from regular staff.
 * Managers get an amber tint (mid-authority). Everyone else gets a
 * neutral slate badge so the list stays calm.
 */
function roleBadgeTone(role: string | undefined): string {
  const r = (role || "").toUpperCase();
  if (r === "OWNER" || r === "ADMIN") {
    return "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300";
  }
  if (r === "MANAGER") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
  }
  return "bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300";
}

/** Sort order: OWNER → ADMIN → MANAGER → everyone else (alphabetical). */
function roleRank(role: string | undefined): number {
  const r = (role || "").toUpperCase();
  if (r === "OWNER") return 0;
  if (r === "ADMIN") return 1;
  if (r === "MANAGER") return 2;
  return 3;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (assigneeId: string) => void;
  isPending?: boolean;
  // Same picker, different intent. "reassign" rewords the title/button so
  // managers understand this is a lateral move, not a status escalation.
  mode?: "escalate" | "reassign";
};

export const EscalateStaffRequestModal: React.FC<Props> = ({
  open,
  onOpenChange,
  onConfirm,
  isPending = false,
  mode = "escalate",
}) => {
  const { t } = useLanguage();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const isReassign = mode === "reassign";

  const staffQuery = useQuery({
    queryKey: ["staff-list-escalate-modal"],
    queryFn: async (): Promise<TeamMemberRow[]> => {
      const token = getAuthToken();
      // ``page_size=500`` matches the server's MAX_PAGE_SIZE so the
      // modal never silently truncates at DRF's default 10. The shape
      // normaliser below handles both paginated and bare-array
      // responses, so this stays robust if the backend later turns
      // pagination off entirely.
      const res = await fetch(`${API_BASE}/staff/?page_size=500`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load team");
      const data = await res.json();
      return normalizeStaffList(data);
    },
    enabled: open,
    staleTime: 60_000,
  });

  // Client-side filter + sort. We fetch every member in one go (the
  // backend caps at 500 which covers any realistic restaurant chain),
  // then filter in-memory as the manager types — no debounce needed,
  // no extra round trips. Sort puts owners / admins / managers first
  // so escalating "above your head" is a one-click action even with a
  // long list.
  const filteredMembers = useMemo(() => {
    const all = staffQuery.data ?? [];
    const q = search.trim().toLowerCase();
    const matches = q
      ? all.filter((m) => {
          const name = displayName(m).toLowerCase();
          const email = (m.email || "").toLowerCase();
          const role = (m.role || "").toLowerCase();
          return (
            name.includes(q) || email.includes(q) || role.includes(q)
          );
        })
      : all;
    // Stable sort by (role rank → first name → last name) so the list
    // is predictable across renders.
    return [...matches].sort((a, b) => {
      const r = roleRank(a.role) - roleRank(b.role);
      if (r !== 0) return r;
      return displayName(a).localeCompare(displayName(b));
    });
  }, [staffQuery.data, search]);

  const totalCount = staffQuery.data?.length ?? 0;
  const filteredCount = filteredMembers.length;

  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setSearch("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isReassign ? "Reassign request" : t("staff.requests.escalate_modal_title")}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {isReassign
              ? "Pick the teammate who should own this request. The status won't change — they'll be pinged on WhatsApp."
              : t("staff.requests.escalate_modal_description")}
          </p>
        </DialogHeader>

        {/* Search + count strip — discoverable, single-key access to any
            teammate even when the list is long. Total / filtered counts
            on the right give the manager confidence the list is
            complete (the previous "only 10 names" complaint was fed by
            an invisible page cap; surfacing the count makes that
            impossible to miss). */}
        <div className="space-y-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden
            />
            <Input
              autoFocus
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("staff.requests.escalate_modal_search_placeholder")}
              aria-label={t("staff.requests.escalate_modal_search_placeholder")}
              className="pl-8 pr-8"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label={t("staff.requests.escalate_modal_clear_search")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" aria-hidden />
            {search ? (
              <span>
                {t("staff.requests.escalate_modal_count_filtered", {
                  filtered: filteredCount,
                  total: totalCount,
                })}
              </span>
            ) : (
              <span>
                {t("staff.requests.escalate_modal_count_total", {
                  total: totalCount,
                })}
              </span>
            )}
          </div>
        </div>

        <ScrollArea className="h-[min(360px,55vh)] pr-3 -mr-1">
          {staffQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("staff.requests.escalate_modal_loading")}
            </div>
          ) : staffQuery.isError ? (
            <div className="text-sm text-destructive py-6 text-center">
              {t("staff.requests.escalate_modal_error")}
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              {search
                ? t("staff.requests.escalate_modal_no_match")
                : t("staff.requests.escalate_modal_empty")}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredMembers.map((m) => {
                const active = selectedId === m.id;
                const role = roleLabel(m.role);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedId(m.id)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                      active
                        ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                        : "border-border hover:bg-muted/60"
                    )}
                  >
                    {/* Avatar / initials bubble — gives the list a face
                        and avoids the "wall of identical UserCircle2"
                        we used to render for every row. */}
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                        active
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                      aria-hidden
                    >
                      {initialsFor(m) ? (
                        initialsFor(m)
                      ) : (
                        <UserCircle2 className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="font-medium truncate">{displayName(m)}</div>
                        {role ? (
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide",
                              roleBadgeTone(m.role)
                            )}
                          >
                            {role}
                          </span>
                        ) : null}
                      </div>
                      {m.email ? (
                        <div className="text-xs text-muted-foreground truncate">
                          {m.email}
                        </div>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t("staff.requests.escalate_modal_cancel")}
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (!selectedId) return;
              onConfirm(selectedId);
            }}
            disabled={!selectedId || isPending || staffQuery.isLoading}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("staff.requests.escalate_modal_submitting")}
              </>
            ) : isReassign ? (
              "Reassign"
            ) : (
              t("staff.requests.escalate_modal_confirm")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
