import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, API_BASE } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useNotifications } from "@/hooks/useNotifications";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { logError, logInfo } from "@/lib/logging";
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

type SubmittedChecklist = {
  id: string;
  template?: { id: string; name?: string; description?: string } | null;
  submitted_by?: { id?: string; name?: string } | null;
  submitted_at?: string | null;
  status?: string | null;
  notes?: string | null;
};

const ManagerReviewDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterSubmitter, setFilterSubmitter] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterType, setFilterType] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState<string>("");

  const { data: submitted, isLoading } = useQuery<SubmittedChecklist[]>({
    queryKey: ["manager-submitted-checklists", filterDate, filterSubmitter, filterType],
    queryFn: async () => {
      const url = new URL(`${API_BASE}/checklists/executions/submitted/`);
      if (filterDate) url.searchParams.set("date", filterDate);
      if (filterSubmitter) url.searchParams.set("submitted_by", filterSubmitter);
      if (filterType) url.searchParams.set("type", filterType);
      const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` }, credentials: "include" });
      if (!res.ok) {
        logInfo({ feature: "manager-review", action: "fetch-submitted" }, `HTTP ${res.status}; using fallback`, { url: url.toString() });
        const my = await api.getMyChecklists({ status: "COMPLETED", page_size: 100 });
        const arr = Array.isArray(my) ? my : (my.results || []);
        const mapped = arr.map((e: { id: string | number; template?: any; completed_at?: string | null; updated_at?: string | null; assigned_to?: { id: string | number; first_name?: string; last_name?: string } | null; completion_notes?: string | null }) => ({
          id: String(e.id),
          template: e.template,
          submitted_at: e.completed_at || e.updated_at || null,
          status: "COMPLETED",
          submitted_by: e.assigned_to
            ? { id: String(e.assigned_to.id), name: `${e.assigned_to.first_name || ''} ${e.assigned_to.last_name || ''}`.trim() }
            : null,
          notes: e.completion_notes || null
        }));
        logInfo({ feature: "manager-review", action: "fallback-my-checklists" }, `Using ${mapped.length} completed entries`);
        return mapped;
      }
      const data = await res.json();
      try { logInfo({ feature: 'manager-review', action: 'fetch-submitted-ok' }, `Loaded ${(Array.isArray(data) ? data.length : (data?.results?.length || 0))} rows`); } catch { /* ignore */ }
      let arr: any[] = Array.isArray(data) ? data : (data.results || []);
      if (!arr || arr.length === 0) {
        const fb = new URL(`${API_BASE}/checklists/executions/`);
        fb.searchParams.set("status", "COMPLETED");
        fb.searchParams.set("page_size", "100");
        const alt = await fetch(fb.toString(), { headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` }, credentials: "include" });
        if (alt.ok) {
          const altJson = await alt.json();
          arr = Array.isArray(altJson) ? altJson : (altJson.results || []);
          logInfo({ feature: "manager-review", action: "fallback-completed-list" }, `Fetched ${arr.length} entries from completed list`);
        }
      }
      return arr.map((d: unknown) => {
        const itm = d as any;
        const submitterRaw = itm.submitted_by || itm.assigned_to || itm.assigned_to_info || null;
        const submitterName = submitterRaw
          ? (submitterRaw.name
            || [submitterRaw.first_name, submitterRaw.last_name].filter(Boolean).join(" ")
            || submitterRaw.username
            || undefined)
          : undefined;
        const review = (typeof itm.review_status === 'string') ? String(itm.review_status).toUpperCase() : null;
        const approved = typeof itm.supervisor_approved === 'boolean' ? itm.supervisor_approved : null;
        const displayStatus = review || (approved === true ? 'APPROVED' : approved === false ? 'PENDING' : (itm.status || itm.completion_status || null));
        return {
          id: String(itm.id),
          template: itm.template || itm.template_info || null,
          submitted_at: itm.submitted_at || itm.completed_at || itm.updated_at || null,
          status: displayStatus,
          submitted_by: submitterRaw ? { id: String(submitterRaw.id || itm.assigned_to_id || ''), name: submitterName } : null,
          notes: itm.notes || itm.completion_notes || null,
        } as SubmittedChecklist;
      });
    },
    refetchInterval: 15000,
    staleTime: 0,
  });

  const { notifications, unreadCount, isConnected } = useNotifications();

  const approveMutation = useMutation({
    mutationFn: async (vars: { id: string; reason?: string }) => {
      const res = await fetch(`${API_BASE}/checklists/executions/${vars.id}/manager_review/`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("access_token")}` }, body: JSON.stringify({ decision: "APPROVED", reason: vars.reason || "" }), credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        throw new Error(err?.detail || err?.error || err?.message || "Failed to approve submission");
      }
      return res.json();
    },
    onSuccess: async (_data, variables) => { queryClient.invalidateQueries({ queryKey: ["manager-submitted-checklists"] }); toast.success("Submission approved"); try { await api.logAdminAction(String(variables.id), { action: 'MANAGER_REVIEW_DECISION', message: 'Approved' }); } catch { /* ignore */ } },
    onError: (e: any) => toast.error(e?.message || "Approval failed"),
  });
  const rejectMutation = useMutation({
    mutationFn: async (vars: { id: string; reason?: string }) => {
      const res = await fetch(`${API_BASE}/checklists/executions/${vars.id}/manager_review/`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("access_token")}` }, body: JSON.stringify({ decision: "REJECTED", reason: vars.reason || "" }), credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        throw new Error(err?.detail || err?.error || err?.message || "Failed to reject submission");
      }
      return res.json();
    },
    onSuccess: async (_data, variables) => { queryClient.invalidateQueries({ queryKey: ["manager-submitted-checklists"] }); toast.success("Submission rejected"); try { await api.logAdminAction(String(variables.id), { action: 'MANAGER_REVIEW_DECISION', message: 'Rejected' }); } catch { /* ignore */ } },
    onError: (e: any) => toast.error(e?.message || "Rejection failed"),
  });

  const detailQuery = useQuery({
    queryKey: ["manager-review-detail", detailId],
    enabled: !!detailId,
    queryFn: async () => {
      const id = String(detailId);
      const data = await api.getChecklistExecution(id);
      return data;
    },
    staleTime: 0,
  });

  const filtered = useMemo(() => {
    const arr = Array.isArray(submitted) ? submitted : [];
    const term = search.trim().toLowerCase();
    return arr.filter(s => {
      const name = String(s.template?.name || "").toLowerCase();
      const submitter = String(s.submitted_by?.name || "").toLowerCase();
      return (!term || name.includes(term) || submitter.includes(term));
    });
  }, [submitted, search]);

  const total = filtered.length;
  const completed = filtered.filter(s => s.status === 'COMPLETED').length;
  const completionPct = total ? Math.round((completed / total) * 100) : 0;
  const recentActivity = notifications.filter(n => ['document signed', 'field edited', 'auto save', 'checklist submitted'].includes((n.verb || '').toLowerCase())).slice(0, 8);
  const dailyData = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((s) => {
      const d = s.submitted_at ? new Date(s.submitted_at) : null;
      const key = d ? d.toISOString().slice(0, 10) : '—';
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([date, count]) => ({ date, count }));
  }, [filtered]);

  const [tab, setTab] = useState<'cards' | 'table'>('table');
  const [sortBy, setSortBy] = useState<'date' | 'staff' | 'checklist'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [staffFilter, setStaffFilter] = useState('');
  const sortedTable = useMemo(() => {
    const inRange = filtered.filter(s => {
      const ts = s.submitted_at ? new Date(s.submitted_at).getTime() : 0;
      const fromOk = !dateFrom || ts >= new Date(dateFrom).getTime();
      const toOk = !dateTo || ts <= new Date(dateTo).getTime() + 86400000 - 1;
      const staffOk = !staffFilter || String(s.submitted_by?.name || '').toLowerCase().includes(staffFilter.trim().toLowerCase());
      return fromOk && toOk && staffOk;
    });
    const arr = [...inRange];
    arr.sort((a, b) => {
      const cmp = (valA: string, valB: string) => valA.localeCompare(valB);
      if (sortBy === 'date') {
        const ta = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
        const tb = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
        return sortDir === 'asc' ? ta - tb : tb - ta;
      }
      if (sortBy === 'staff') {
        const sa = String(a.submitted_by?.name || '');
        const sb = String(b.submitted_by?.name || '');
        const r = cmp(sa, sb);
        return sortDir === 'asc' ? r : -r;
      }
      const ca = String(a.template?.name || '');
      const cb = String(b.template?.name || '');
      const r = cmp(ca, cb);
      return sortDir === 'asc' ? r : -r;
    });
    return arr;
  }, [filtered, sortBy, sortDir, dateFrom, dateTo, staffFilter]);

  const exportCsv = () => {
    const headers = ['Staff', 'Submitted At', 'Checklist', 'Status', 'Notes'];
    const rows = sortedTable.map(s => [
      String(s.submitted_by?.name || ''),
      s.submitted_at ? new Date(s.submitted_at).toISOString() : '',
      String(s.template?.name || ''),
      String(s.status || ''),
      String(s.notes || '')
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'checklist_submissions.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Completion</CardTitle><CardDescription className="text-xs">Live status</CardDescription></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm"><div>{completed} of {total} completed</div><div>{completionPct}%</div></div>
            <Progress value={completionPct} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Notifications</CardTitle><CardDescription className="text-xs">Realtime</CardDescription></CardHeader>
          <CardContent>
            <div className="text-sm">Unread: {unreadCount}</div>
            <div className="text-xs text-muted-foreground">WebSocket: {isConnected ? 'Connected' : 'Offline'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Quality Control</CardTitle><CardDescription className="text-xs">Markers</CardDescription></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="outline">Signed</Badge>
              <Badge variant="outline">Evidence OK</Badge>
              <Badge variant="outline">Timely</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submissions Trend</CardTitle>
          <CardDescription className="text-sm">Daily submitted checklists</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#16a34a" fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Submitted Checklists</h2>
          <p className="text-sm text-muted-foreground">Manager review and audit trail</p>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Search by name or submitter" value={search} onChange={(e) => setSearch(e.target.value)} className="w-60" />
          <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-44" />
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList>
              <TabsTrigger value="table">Table</TabsTrigger>
              <TabsTrigger value="cards">Cards</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {tab === 'table' ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-44" />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-44" />
            <Input placeholder="Filter by staff" value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)} className="w-56" />
            <Button size="sm" variant="outline" onClick={exportCsv}>Export CSV</Button>
          </div>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading submissions…</div>
          ) : sortedTable.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No submissions found.
              <div className="mt-1">If you recently submitted, the server may be processing. Try again shortly.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><button className="text-left w-full" onClick={() => { setSortBy('staff'); setSortDir(sortBy === 'staff' && sortDir === 'asc' ? 'desc' : 'asc'); }}>Staff</button></TableHead>
                    <TableHead><button className="text-left w-full" onClick={() => { setSortBy('date'); setSortDir(sortBy === 'date' && sortDir === 'asc' ? 'desc' : 'asc'); }}>Submitted At</button></TableHead>
                    <TableHead><button className="text-left w-full" onClick={() => { setSortBy('checklist'); setSortDir(sortBy === 'checklist' && sortDir === 'asc' ? 'desc' : 'asc'); }}>Checklist</button></TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTable.map((s) => (
                    <TableRow key={s.id} className={s.status === 'COMPLETED' ? '' : 'bg-yellow-50'}>
                      <TableCell>{s.submitted_by?.name || '—'}</TableCell>
                      <TableCell>{s.submitted_at ? new Date(s.submitted_at).toLocaleString() : '—'}</TableCell>
                      <TableCell>{s.template?.name || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={s.status === 'COMPLETED' ? 'secondary' : 'outline'} className="text-xs">{s.status || '—'}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate" title={s.notes || undefined}>{s.notes || '—'}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={async () => { setDetailId(s.id); try { await api.logAdminAction(String(s.id), { action: 'VIEW_SUBMISSION', message: 'Opened submission details' }); } catch { /* ignore */ } }}>View</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading submissions…</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground">No submissions found.</div>
          ) : filtered.map((s) => (
            <Card key={s.id} className="transition hover:shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{s.template?.name || "Checklist"}</CardTitle>
                    <CardDescription className="text-sm">Submitted {s.submitted_at ? new Date(s.submitted_at).toLocaleString() : "—"}</CardDescription>
                  </div>
                  <Badge variant={s.status === 'COMPLETED' ? 'secondary' : 'outline'} className="text-xs">{s.status || '—'}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs">Submitter: {s.submitted_by?.name || '—'}</div>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline">Completion</Badge>
                  <Badge variant="outline">Performance</Badge>
                  <Badge variant="outline">Quality</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => approveMutation.mutate(s.id)}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => rejectMutation.mutate(s.id)}>Reject</Button>
                  <Button size="sm" variant="ghost" onClick={() => toast.info('Open detailed report…')}>View Report</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Live Activity</CardTitle>
          <CardDescription className="text-sm">Recent signed/edit/save events</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-sm text-muted-foreground">No recent activity</div>
          ) : (
            <div className="space-y-2">
              {recentActivity.map((n) => (
                <div key={n.id} className="text-xs flex items-center justify-between">
                  <div>
                    <div className="font-medium">{n.title || n.verb}</div>
                    <div className="text-muted-foreground">{n.description}</div>
                  </div>
                  <div className="text-muted-foreground">{new Date(n.timestamp).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailId !== null} onOpenChange={(o) => { if (!o) { setDetailId(null); setReviewComment(""); } }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Submission Details</DialogTitle>
          </DialogHeader>
          {(() => {
            const summary = sortedTable.find(x => x.id === detailId) || filtered.find(x => x.id === detailId);
            const exec = detailQuery.data as any;
            if (!summary) return (<div className="text-sm text-muted-foreground">No data</div>);
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div>Staff: {summary.submitted_by?.name || '—'}</div>
                    <div>Submitted: {summary.submitted_at ? new Date(summary.submitted_at).toLocaleString() : '—'}</div>
                    <div>Checklist: {summary.template?.name || '—'}</div>
                  </div>
                  <div>
                    <div>Status: {summary.status || '—'}</div>
                    <div>Notes: {summary.notes || '—'}</div>
                  </div>
                </div>
                <div className="border rounded-md">
                  <ScrollArea className="h-72 p-3">
                    {detailQuery.isLoading ? (
                      <div className="text-sm text-muted-foreground">Loading full details…</div>
                    ) : exec ? (
                      <div className="space-y-3 text-sm">
                        <div className="font-medium">Steps</div>
                        {(exec.step_responses || []).map((sr: any, idx: number) => (
                          <div key={sr.id || idx} className="border rounded-md p-3">
                            <div className="font-medium">{sr.step?.title || `Step ${idx + 1}`}</div>
                            <div className="text-xs text-muted-foreground">{sr.step?.description || ''}</div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                              <Badge variant="outline">Status: {sr.status || (sr.is_completed ? 'COMPLETED' : 'PENDING')}</Badge>
                              {sr.text_response ? (<Badge variant="outline">Response: {sr.text_response}</Badge>) : null}
                              {sr.measurement_value != null ? (<Badge variant="outline">Measure: {String(sr.measurement_value)}</Badge>) : null}
                            </div>
                            {sr.notes ? (<div className="mt-2 text-xs">Notes: {sr.notes}</div>) : null}
                            {Array.isArray(sr.evidence) && sr.evidence.length > 0 ? (
                              <div className="mt-2 text-xs">Evidence: {sr.evidence.length} item(s)</div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No detailed data</div>
                    )}
                  </ScrollArea>
                </div>
                <div className="space-y-2">
                  <Textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Add review comments (optional)" />
                  <div className="flex items-center gap-2 justify-end">
                    <Button variant="outline" onClick={() => setDetailId(null)}>Close</Button>
                    <Button onClick={() => approveMutation.mutate({ id: String(summary.id), reason: reviewComment })} disabled={approveMutation.isLoading}>Approve</Button>
                    <Button variant="destructive" onClick={() => rejectMutation.mutate({ id: String(summary.id), reason: reviewComment })} disabled={rejectMutation.isLoading}>Reject</Button>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManagerReviewDashboard;