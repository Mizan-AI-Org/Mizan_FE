import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { ClipboardList, Filter, Loader2, Paperclip } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { logError } from "@/lib/logging";

type ChecklistExecutionItem = {
  id: string;
  status?: string;
  started_at?: string | null;
  completed_at?: string | null;
  due_date?: string | null;
  template?: { id: string; name: string; description?: string };
};

const statusOptions = [
  { key: "", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "COMPLETED", label: "Completed" },
  { key: "OVERDUE", label: "Overdue" },
];

const MyChecklistsPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, accessToken } = useAuth();
  const [status, setStatus] = useState<string>("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState<number>(1);
  const pageSize = 12;
  const token = accessToken || localStorage.getItem("access_token") || undefined;
  const userId = user?.id ? String(user?.id) : undefined;

  const { data: myChecklistsData, isFetching: loadingChecklists } = useQuery({
    queryKey: ["my-checklists", { status, page, pageSize }],
    queryFn: async () => {
      const resp = await api.getMyChecklists({ status: status || undefined, page, page_size: pageSize });
      const raw = Array.isArray(resp) ? resp : (resp.results || []);
      return (raw as ChecklistExecutionItem[]) || [];
    },
    refetchInterval: 15000,
    staleTime: 60 * 1000,
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Failed to load my checklists";
      logError({ feature: "my-checklists", action: "fetch" }, e);
      toast({ title: "Failed to load", description: msg, variant: "destructive" });
    },
  });

  const { data: tasksAsChecklistsData, isFetching: loadingTasksAsChecklists } = useQuery({
    enabled: Boolean(token && userId),
    queryKey: ["assigned-tasks-as-checklists", { userId, status }],
    queryFn: async () => {
      const tasksAsChecklists = await api.getAssignedTasksAsChecklists(String(token), String(userId!), status || undefined);
      const enriched = tasksAsChecklists.map((t) => ({
        id: t.execution_id,
        status: t.status,
        started_at: undefined,
        completed_at: undefined,
        due_date: t.due_date || undefined,
        template: t.template || { id: t.task_id, name: t.title, description: t.description },
      })) as ChecklistExecutionItem[];
      return enriched;
    },
    refetchInterval: 15000,
    staleTime: 60 * 1000,
    onError: (e: unknown) => {
      logError({ feature: "assigned-tasks", action: "fetch-as-checklists" }, e);
    },
  });

  // Merge and de-duplicate by execution id, then filter
  const mergedItems = useMemo(() => {
    const baseItems = myChecklistsData || [];
    const enriched = tasksAsChecklistsData || [];
    const mergedMap = new Map<string, ChecklistExecutionItem>();
    [...baseItems, ...enriched].forEach((it) => {
      if (it?.id) mergedMap.set(String(it.id), it);
    });
    return Array.from(mergedMap.values());
  }, [myChecklistsData, tasksAsChecklistsData]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mergedItems.filter((it) => {
      const name = it.template?.name?.toLowerCase() || "";
      const desc = it.template?.description?.toLowerCase() || "";
      return !q || name.includes(q) || desc.includes(q);
    });
  }, [mergedItems, query]);

  const goRun = (id: string) => navigate(`/staff-dashboard/run-checklist/${id}`);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-50">
            <ClipboardList className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">My Checklists</h2>
            <p className="text-xs text-muted-foreground">Assigned checklists for your role</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            className="border rounded-md h-9 px-2 w-full"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
          >
            {statusOptions.map((opt) => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <Input
            placeholder="Search by name or description"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search checklists"
          />
        </div>
      </div>

      {loadingChecklists || loadingTasksAsChecklists ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading your checklists…
        </div>
      ) : filtered.length === 0 ? (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">No checklists found</CardTitle>
            <CardDescription className="text-sm">Try a different status or search term.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((it) => {
            const statusLabel = it.status || "PENDING";
            const name = it.template?.name || "Checklist";
            const desc = it.template?.description || "";
            const due = it.due_date ? new Date(it.due_date).toLocaleString() : undefined;
            const started = it.started_at ? new Date(it.started_at).toLocaleString() : undefined;
            const completed = it.completed_at ? new Date(it.completed_at).toLocaleString() : undefined;
            const statusColor =
              statusLabel === "COMPLETED" ? "bg-green-100 text-green-700" :
              statusLabel === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
              statusLabel === "OVERDUE" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700";
            return (
              <Card key={it.id} className="shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base truncate">{name}</CardTitle>
                    <Badge className={`rounded-full ${statusColor}`}>{statusLabel.replace(/_/g, ' ')}</Badge>
                  </div>
                  {desc && <CardDescription className="text-xs truncate">{desc}</CardDescription>}
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <div className="text-xs text-muted-foreground">
                    {due && <div>Due: {due}</div>}
                    {started && <div>Started: {started}</div>}
                    {completed && <div>Completed: {completed}</div>}
                    <div className="flex items-center gap-1"><Paperclip className="w-3 h-3" /> Attachments & notes managed inside checklist</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => goRun(it.id)}>Open</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-muted-foreground">Page {page}</div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Previous</Button>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={(myChecklistsData?.length || 0) < pageSize}>Next</Button>
        </div>
      </div>
    </div>
  );
};

export default MyChecklistsPage;