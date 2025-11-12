import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Filter, ListChecks } from "lucide-react";

type CombinedTaskItem = {
  id: string;
  title: string;
  description?: string | null;
  priority?: string | null;
  status?: string | null;
  due_date?: string | null;
  source: "SHIFT_TASK" | "TEMPLATE_TASK";
  associated_shift?: { id?: string; shift_date?: string; role?: string } | null;
  associated_template?: { id?: string; name?: string; type?: string } | null;
};

const statusOptions = ["", "TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
const priorityOptions = ["", "LOW", "MEDIUM", "HIGH", "URGENT"] as const;

type StatusType = (typeof statusOptions)[number];
type PriorityType = (typeof priorityOptions)[number];

const StaffMyTasks: React.FC = () => {
  const token = localStorage.getItem("access_token") || "";

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusType>("");
  const [priority, setPriority] = useState<PriorityType>("");
  const [ordering, setOrdering] = useState<string>("due_date");

  const { data, isLoading, isFetching, error } = useQuery<CombinedTaskItem[], Error>({
    enabled: Boolean(token),
    queryKey: ["my-combined-tasks", { status, priority, ordering }],
    queryFn: async () => {
      return await api.getMyCombinedTasks(String(token), {
        status: status || undefined,
        priority: priority || undefined,
        ordering: ordering || undefined,
        page_size: 500,
      });
    },
    refetchInterval: 10000,
    staleTime: 30 * 1000,
  });

  const items = useMemo(() => {
    const list = Array.isArray(data) ? data : [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((it) => {
      const title = String(it.title || "").toLowerCase();
      const desc = String(it.description || "").toLowerCase();
      const tmpl = String(it.associated_template?.name || "").toLowerCase();
      const role = String(it.associated_shift?.role || "").toLowerCase();
      return title.includes(q) || desc.includes(q) || tmpl.includes(q) || role.includes(q);
    });
  }, [data, query]);

  const statusBadge = (s?: string | null) => {
    const val = String(s || "").toUpperCase();
    const variant = val === "COMPLETED" ? "default" : val === "IN_PROGRESS" ? "secondary" : val === "CANCELLED" ? "destructive" : "outline";
    return <Badge variant={variant} className="text-xs">{val || "UNKNOWN"}</Badge>;
  };

  const priorityBadge = (p?: string | null) => {
    const val = String(p || "").toUpperCase();
    const style = val === "URGENT" ? "bg-red-100 text-red-700" : val === "HIGH" ? "bg-orange-100 text-orange-700" : val === "MEDIUM" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-700";
    return <span className={`px-2 py-0.5 rounded text-xs ${style}`}>{val || "N/A"}</span>;
  };

  const sourceBadge = (src: CombinedTaskItem["source"]) => {
    const isTemplate = src === "TEMPLATE_TASK";
    return <Badge variant={isTemplate ? "default" : "outline"} className="text-xs">{isTemplate ? "Template-Embedded" : "Direct/Shift"}</Badge>;
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-50">
            <ListChecks className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">My Checklist</h2>
            <p className="text-xs text-muted-foreground">Unified tasks and checklist items assigned to you</p>
          </div>
        </div>
        {isFetching && <div className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="w-4 h-4 animate-spin" /> Updating…</div>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription className="text-xs">Search, filter, and sort tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <Input placeholder="Search by title, template, role" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search tasks" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground flex items-center gap-1"><Filter className="w-3 h-3" /> Status</label>
              <select className="border rounded px-2 py-1 text-sm w-full" value={status} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value as StatusType)} aria-label="Filter by status">
                {statusOptions.map((opt) => <option key={opt || "any"} value={opt}>{opt || "Any"}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Priority</label>
              <select className="border rounded px-2 py-1 text-sm w-full" value={priority} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPriority(e.target.value as PriorityType)} aria-label="Filter by priority">
                {priorityOptions.map((opt) => <option key={opt || "any"} value={opt}>{opt || "Any"}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Sort by</label>
              <select className="border rounded px-2 py-1 text-sm w-full" value={ordering} onChange={(e) => setOrdering(e.target.value)} aria-label="Sort tasks">
                <option value="due_date">Due date</option>
                <option value="priority">Priority</option>
                <option value="status">Status</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assigned Tasks</CardTitle>
          <CardDescription className="text-xs">Live-updating unified list</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
          ) : error ? (
            <div className="text-sm text-red-600">{error.message}</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-muted-foreground">No tasks found.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Shift / Template</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>
                        <div className="font-medium text-sm">{it.title}</div>
                        {it.description ? (
                          <div className="text-xs text-muted-foreground line-clamp-1">{it.description}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm">{it.due_date ? new Date(it.due_date).toLocaleDateString() : "—"}</TableCell>
                      <TableCell>{priorityBadge(it.priority)}</TableCell>
                      <TableCell>{statusBadge(it.status)}</TableCell>
                      <TableCell>{sourceBadge(it.source)}</TableCell>
                      <TableCell>
                        {it.source === "SHIFT_TASK" ? (
                          <div className="text-xs text-muted-foreground">
                            {it.associated_shift?.shift_date ? new Date(it.associated_shift.shift_date).toLocaleDateString() : "—"}
                            {it.associated_shift?.role ? ` · ${it.associated_shift.role}` : ""}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">
                            {it.associated_template?.name || "—"}
                            {it.associated_template?.type ? ` · ${it.associated_template.type}` : ""}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffMyTasks;