import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { API_BASE } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";

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
  const { data, isLoading } = useQuery({
    queryKey: ["approvals", accessToken],
    queryFn: () => load("/approvals/", accessToken),
    enabled: !!accessToken,
  });
  const create = useMutation({
    mutationFn: () => post("/approvals/", accessToken, { title, amount, category: "opex" }),
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
  const rows = data?.approvals || [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Approvals</h1>
        <p className="text-sm text-muted-foreground">Spend and operational requests that need a manager yes.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>New request</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="max-w-xs" />
          <Input placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="max-w-[140px]" />
          <Button disabled={!title || create.isPending} onClick={() => create.mutate()}>
            Submit
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Open and recent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {rows.map((row: { id: string; title: string; amount: string; status: string }) => (
            <div key={row.id} className="flex items-center justify-between gap-4 border-b py-2 last:border-0">
              <div>
                <p className="font-medium">{row.title}</p>
                <p className="text-sm text-muted-foreground">
                  {row.amount || "—"} · {row.status}
                </p>
              </div>
              {row.status === "pending" && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => decide.mutate({ id: row.id, decision: "approved" })}>
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => decide.mutate({ id: row.id, decision: "rejected" })}>
                    Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
