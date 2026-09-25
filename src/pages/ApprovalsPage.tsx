import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { API_BASE } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";

type ApprovalRow = {
  id: string;
  title: string;
  amount: string;
  currency?: string;
  status: string;
  category?: string;
  notes?: string;
  requestedBy?: string;
};

async function load(path: string, token: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "Request failed");
  return body.data || body;
}

async function post(path: string, token: string, payload: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "Request failed");
  return body.data || body;
}

export default function ApprovalsPage() {
  const { accessToken } = useAuth() as { accessToken: string };
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["approvals", accessToken],
    queryFn: () => load("/approvals/", accessToken),
    enabled: !!accessToken,
  });
  const create = useMutation({
    mutationFn: () => post("/approvals/", accessToken, { title, amount, category: "spend" }),
    onSuccess: () => {
      setTitle("");
      setAmount("");
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
    },
  });
  const decide = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: string }) =>
      post(`/approvals/${id}/decide/`, accessToken, { decision }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["approvals"] }),
  });
  const rows = (data?.approvals || []) as ApprovalRow[];
  const pending = useMemo(() => rows.filter((row) => row.status === "pending"), [rows]);
  const decided = useMemo(() => rows.filter((row) => row.status !== "pending"), [rows]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Operations</p>
          <h1 className="text-2xl font-semibold">Approvals</h1>
          <p className="text-sm text-muted-foreground">
            Requests waiting for a yes. The approver is pinged on WhatsApp and can also tell the agent to approve.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/dashboard/settings?tab=approvals">Approval Settings</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>New request</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Input placeholder="What needs approval" value={title} onChange={(e) => setTitle(e.target.value)} className="max-w-xs" />
          <Input placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="max-w-[140px]" />
          <Button disabled={!title || create.isPending} onClick={() => create.mutate()}>
            Submit
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Needs a decision ({pending.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {isError && <p className="text-sm text-destructive">Could not load approvals.</p>}
          {!isLoading && pending.length === 0 && (
            <p className="text-sm text-muted-foreground">Nothing is waiting. New requests show up here and ping the approver.</p>
          )}
          {pending.map((row) => (
            <ApprovalLine key={row.id} row={row} busy={decide.isPending} onDecide={(decision) => decide.mutate({ id: row.id, decision })} />
          ))}
        </CardContent>
      </Card>
      {decided.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent decisions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {decided.map((row) => (
              <ApprovalLine key={row.id} row={row} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ApprovalLine({
  row,
  onDecide,
  busy,
}: {
  row: ApprovalRow;
  onDecide?: (decision: string) => void;
  busy?: boolean;
}) {
  const money = [row.amount, row.currency].filter(Boolean).join(" ");
  return (
    <div className="flex items-center justify-between gap-4 border-b py-2 last:border-0">
      <div>
        <p className="font-medium">{row.title}</p>
        <p className="text-sm text-muted-foreground">
          {[money || "No amount", row.category, row.requestedBy ? `from ${row.requestedBy}` : "", row.status]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      {row.status === "pending" && onDecide && (
        <div className="flex gap-2">
          <Button size="sm" disabled={busy} onClick={() => onDecide("approved")}>
            Approve
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => onDecide("rejected")}>
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
