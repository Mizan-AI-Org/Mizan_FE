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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, UserCircle2 } from "lucide-react";
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

  const isReassign = mode === "reassign";

  const staffQuery = useQuery({
    queryKey: ["staff-list-escalate-modal"],
    queryFn: async (): Promise<TeamMemberRow[]> => {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/staff/`, {
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

  const members = useMemo(() => staffQuery.data ?? [], [staffQuery.data]);

  useEffect(() => {
    if (!open) setSelectedId(null);
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

        <ScrollArea className="h-[min(320px,50vh)] pr-3 -mr-1">
          {staffQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("staff.requests.escalate_modal_loading")}
            </div>
          ) : staffQuery.isError ? (
            <div className="text-sm text-destructive py-6 text-center">
              {t("staff.requests.escalate_modal_error")}
            </div>
          ) : members.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              {t("staff.requests.escalate_modal_empty")}
            </div>
          ) : (
            <div className="space-y-1">
              {members.map((m) => {
                const active = selectedId === m.id;
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
                    <UserCircle2
                      className={cn("h-8 w-8 shrink-0", active ? "text-primary" : "text-muted-foreground")}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{displayName(m)}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {m.email}
                        {m.role ? ` · ${m.role}` : ""}
                      </div>
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
