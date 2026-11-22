import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

const SKIPPED = "mizan.approvalsLater";

type Popup =
  | { kind: "approval"; id: string; title: string }
  | { kind: "task"; id: string; title: string };

function skipped(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(SKIPPED) || "[]") as string[];
  } catch {
    return [];
  }
}

/** One approval or task validation at a time. Later hides it for this session. */
export function ApprovalsPopupHost() {
  const queryClient = useQueryClient();
  const [hidden, setHidden] = useState<string[]>(() => skipped());
  const approvals = useQuery({
    queryKey: ["approvals", "pending-popup"],
    queryFn: () => api.listApprovals("pending"),
    staleTime: 20_000,
  });
  const waiting = useQuery({
    queryKey: ["operations-overview", "awaiting-approval"],
    queryFn: () => api.getOperationsOverview({ focus: "awaiting_approval", category: "tasks" }),
    staleTime: 20_000,
  });
  const decide = useMutation({
    mutationFn: async (input: Popup & { decision: "approve" | "reject" }) => {
      if (input.kind === "task") await api.validateDashboardTask(input.id, input.decision);
      else await api.decideApproval(input.id, input.decision);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["approvals", "pending-popup"] });
      void queryClient.invalidateQueries({ queryKey: ["operations-overview", "awaiting-approval"] });
    },
  });
  const queue: Popup[] = [
    ...(approvals.data?.approvals ?? []).map((row) => ({
      kind: "approval" as const,
      id: row.id,
      title: row.title || row.notes || "Approval",
    })),
    ...(waiting.data?.items ?? [])
      .filter((item) => item.kind === "task" && item.awaitingApproval)
      .map((item) => ({ kind: "task" as const, id: item.id, title: item.title })),
  ];
  const next = queue.find((row) => row.id && !hidden.includes(`${row.kind}:${row.id}`));
  if (!next) return null;
  const later = () => {
    const ids = [...hidden, `${next.kind}:${next.id}`];
    setHidden(ids);
    sessionStorage.setItem(SKIPPED, JSON.stringify(ids));
  };
  return (
    <div className="fixed bottom-6 end-6 z-40 w-[min(100%-2rem,24rem)] rounded-2xl border border-border bg-card p-4 shadow-lg">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Needs a decision</p>
      <p className="mt-1 font-semibold">{next.title}</p>
      <div className="mt-3 flex gap-2">
        <Button type="button" size="sm" onClick={() => decide.mutate({ ...next, decision: "approve" })}>Approve</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => decide.mutate({ ...next, decision: "reject" })}>Reject</Button>
        <Button type="button" size="sm" variant="ghost" onClick={later}>Later</Button>
      </div>
    </div>
  );
}
