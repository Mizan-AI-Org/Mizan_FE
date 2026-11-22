import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/use-language";
import { api } from "@/lib/api";
import type { ApprovalRow, NeedsAttentionItem } from "@/lib/types";

const SKIPPED = "mizan.approvalsLater";

export type PopupItem =
  | { kind: "approval"; id: string; title: string; label: string }
  | { kind: "task"; id: string; title: string; label: string };

function skipped(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(SKIPPED) || "[]") as string[];
  } catch {
    return [];
  }
}

const popupKey = (item: Pick<PopupItem, "kind" | "id">) => `${item.kind}:${item.id}`;

/**
 * Pure: what is waiting for the manager's decision, one list. Approvals come from the approvals engine
 * (pending on this person), tasks from the accountability "to validate" queue. Items put off with "Later"
 * are skipped for this session.
 */
export function buildPopupQueue(
  approvals: ApprovalRow[] | undefined,
  attention: NeedsAttentionItem[] | undefined,
  hidden: string[],
  fallbackTitle: string,
): PopupItem[] {
  const queue: PopupItem[] = [
    ...(approvals ?? []).map((row) => ({
      kind: "approval" as const,
      id: row.id,
      title: row.title || row.notes || fallbackTitle,
      label: row.kindLabel || "",
    })),
    ...(attention ?? [])
      .filter((item) => item.kind === "validate" && item.taskId)
      .map((item) => ({ kind: "task" as const, id: item.taskId, title: item.title, label: item.who || "" })),
  ];
  return queue.filter((row) => row.id && !hidden.includes(popupKey(row)));
}

/** One approval or task validation at a time, for managers. Later hides it for this session. */
export function ApprovalsPopupHost() {
  const { t } = useLanguage();
  const { user, isStaff } = useAuth();
  const queryClient = useQueryClient();
  const [hidden, setHidden] = useState<string[]>(() => skipped());
  const enabled = Boolean(user) && !isStaff();
  const approvals = useQuery({
    queryKey: ["approvals", "pending-popup"],
    queryFn: () => api.listApprovals("pending"),
    enabled,
    staleTime: 20_000,
    retry: false,
  });
  const attention = useQuery({
    queryKey: ["operations", "needs-attention", "popup"],
    queryFn: () => api.getNeedsAttention(),
    enabled,
    staleTime: 20_000,
    retry: false,
  });
  const decide = useMutation({
    mutationFn: async (input: { item: PopupItem; decision: "approve" | "reject" }) => {
      if (input.item.kind === "task") await api.taskExecutionAction(input.item.id, "validate");
      else await api.decideApproval(input.item.id, input.decision);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["approvals"] });
      void queryClient.invalidateQueries({ queryKey: ["operations"] });
    },
  });
  if (!enabled) return null;
  const next = buildPopupQueue(approvals.data?.approvals, attention.data?.items, hidden, t("approvals.popup.untitled"))[0];
  if (!next) return null;
  const later = () => {
    const ids = [...hidden, popupKey(next)];
    setHidden(ids);
    try {
      sessionStorage.setItem(SKIPPED, JSON.stringify(ids));
    } catch {
      /* private mode: it comes back on reload */
    }
  };
  return (
    <div
      role="dialog"
      aria-label={t("approvals.popup.title")}
      data-testid="approvals-popup"
      className="fixed bottom-6 end-6 z-40 w-[min(100%-2rem,24rem)] rounded-2xl border border-border bg-card p-4 shadow-lg"
    >
      <p className="text-xs font-medium text-muted-foreground">
        {next.kind === "task" ? t("approvals.popup.to_validate") : t("approvals.popup.title")}
        {next.label ? ` · ${next.label}` : ""}
      </p>
      <p className="mt-1 font-semibold">{next.title}</p>
      <div className="mt-3 flex gap-2">
        <Button type="button" size="sm" disabled={decide.isPending} onClick={() => decide.mutate({ item: next, decision: "approve" })}>
          {next.kind === "task" ? t("approvals.popup.validate") : t("approvals.popup.approve")}
        </Button>
        {next.kind === "approval" ? (
          <Button type="button" size="sm" variant="outline" disabled={decide.isPending} onClick={() => decide.mutate({ item: next, decision: "reject" })}>
            {t("approvals.popup.reject")}
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="ghost" onClick={later}>
          {t("approvals.popup.later")}
        </Button>
      </div>
    </div>
  );
}
