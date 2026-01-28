import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, API_BASE, toAbsoluteUrl } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  compiled_summary?: {
    total_steps?: number;
    completed_steps?: number;
    skipped_steps?: number;
    failed_steps?: number;
    required_missing?: number;
    completion_rate?: number;
    duration_minutes?: number | null;
    evidence_items?: number;
    notes_items?: number;
    signature_items?: number;
    out_of_range_measurements?: number;
    actions_open?: number;
    actions_resolved?: number;
  } | null;
};

const ManagerReviewDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterSubmitter, setFilterSubmitter] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterType, setFilterType] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState<string>("");

  // Pagination state for Submitted Checklists
  const [checklistPage, setChecklistPage] = useState(1);
  const checklistPageSize = 10;

  // Incident management state
  const [incidentFilters, setIncidentFilters] = useState({ status: '', severity: '', search: '' });
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Pagination state for Incidents
  const [incidentPage, setIncidentPage] = useState(1);
  const incidentPageSize = 10;

  const { data: submitted, isLoading } = useQuery<SubmittedChecklist[]>({
    queryKey: ["manager-submitted-checklists", filterDate, filterSubmitter, filterType],
    queryFn: async () => {
      const url = toAbsoluteUrl(`${API_BASE}/checklists/executions/submitted/`);
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
        const fb = toAbsoluteUrl(`${API_BASE}/checklists/executions/`);
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

  const { notifications } = useNotifications();

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

  // Fetch incidents
  const { data: incidents, isLoading: incidentsLoading } = useQuery({
    queryKey: ['safety-incidents'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/staff/safety-concerns/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` }
      });
      if (!res.ok) throw new Error('Failed to fetch incidents');
      return res.json();
    },
    refetchInterval: 15000,
  });

  // Fetch selected incident details
  const { data: incidentDetail } = useQuery({
    queryKey: ['safety-incident-detail', selectedIncident],
    enabled: !!selectedIncident,
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/staff/safety-concerns/${selectedIncident}/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` }
      });
      if (!res.ok) throw new Error('Failed to fetch incident details');
      return res.json();
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (data: { id: string; status: string; resolution_notes: string }) => {
      const res = await fetch(`${API_BASE}/staff/safety-concerns/${data.id}/update_status/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem("access_token")}`
        },
        body: JSON.stringify({ status: data.status, resolution_notes: data.resolution_notes })
      });
      if (!res.ok) throw new Error('Failed to update status');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety-incidents'] });
      queryClient.invalidateQueries({ queryKey: ['safety-incident-detail'] });
      setSelectedIncident(null);
      setUpdateStatus('');
      setResolutionNotes('');
      toast.success('Incident status updated');
    },
    onError: () => toast.error('Failed to update incident status'),
  });
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

  // Pagination calculations for checklists
  const totalChecklistItems = sortedTable.length;
  const totalChecklistPages = totalChecklistItems ? Math.ceil(totalChecklistItems / checklistPageSize) : 1;
  const checklistStartIndex = (checklistPage - 1) * checklistPageSize;
  const checklistEndIndex = checklistStartIndex + checklistPageSize;
  const paginatedChecklists = sortedTable.slice(checklistStartIndex, checklistEndIndex);

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
      <Tabs defaultValue="submitted" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="submitted">Submitted Checklist</TabsTrigger>
          <TabsTrigger value="incidents">Reported Incidents</TabsTrigger>
        </TabsList>

        <TabsContent value="submitted" className="mt-0 space-y-4">
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
                        <TableHead>Completion</TableHead>
                        <TableHead>Issues</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedChecklists.map((s) => (
                        <TableRow key={s.id} className={s.status === 'COMPLETED' ? '' : 'bg-yellow-50'}>
                          <TableCell>{s.submitted_by?.name || '—'}</TableCell>
                          <TableCell>{s.submitted_at ? new Date(s.submitted_at).toLocaleString() : '—'}</TableCell>
                          <TableCell>{s.template?.name || '—'}</TableCell>
                          <TableCell>
                            <Badge variant={s.status === 'COMPLETED' ? 'secondary' : 'outline'} className="text-xs">{s.status || '—'}</Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate" title={s.notes || undefined}>{s.notes || '—'}</TableCell>
                          <TableCell>
                            <div className="text-xs">
                              {s.compiled_summary?.completed_steps ?? '—'}/{s.compiled_summary?.total_steps ?? '—'}
                              {typeof s.compiled_summary?.completion_rate === 'number' ? ` (${s.compiled_summary?.completion_rate}%)` : ''}
                            </div>
                            {typeof s.compiled_summary?.duration_minutes === 'number' ? (
                              <div className="text-[11px] text-muted-foreground">⏱ {s.compiled_summary.duration_minutes}m</div>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 text-[11px]">
                              {(s.compiled_summary?.failed_steps || 0) > 0 ? (<Badge variant="destructive" className="text-[10px]">Failed: {s.compiled_summary?.failed_steps}</Badge>) : null}
                              {(s.compiled_summary?.required_missing || 0) > 0 ? (<Badge variant="outline" className="text-[10px]">Missing: {s.compiled_summary?.required_missing}</Badge>) : null}
                              {(s.compiled_summary?.out_of_range_measurements || 0) > 0 ? (<Badge variant="outline" className="text-[10px]">Out-of-range: {s.compiled_summary?.out_of_range_measurements}</Badge>) : null}
                              {(s.compiled_summary?.actions_open || 0) > 0 ? (<Badge variant="outline" className="text-[10px]">Open actions: {s.compiled_summary?.actions_open}</Badge>) : null}
                              {(!s.compiled_summary || ((s.compiled_summary.failed_steps || 0) === 0 && (s.compiled_summary.required_missing || 0) === 0 && (s.compiled_summary.out_of_range_measurements || 0) === 0 && (s.compiled_summary.actions_open || 0) === 0)) ? (
                                <span className="text-muted-foreground">—</span>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={async () => { setDetailId(s.id); try { await api.logAdminAction(String(s.id), { action: 'VIEW_SUBMISSION', message: 'Opened submission details' }); } catch { /* ignore */ } }}>View</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination Controls for Checklists */}
              {sortedTable.length > 0 && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {checklistStartIndex + 1}-{Math.min(checklistEndIndex, totalChecklistItems)} of {totalChecklistItems} checklists
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={checklistPage <= 1}
                      onClick={() => setChecklistPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    {Array.from({ length: Math.min(totalChecklistPages, 5) }, (_, i) => {
                      // Show first 2, last 2, and current page
                      const pageNum = i < 2 ? i + 1 : totalChecklistPages - (4 - i);
                      if (totalChecklistPages <= 5 || Math.abs(pageNum - checklistPage) <= 2 || pageNum === 1 || pageNum === totalChecklistPages) {
                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === checklistPage ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setChecklistPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      }
                      return null;
                    }).filter(Boolean)}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={checklistPage >= totalChecklistPages}
                      onClick={() => setChecklistPage((p) => Math.min(totalChecklistPages, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
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
        </TabsContent>

        <TabsContent value="incidents" className="mt-0 space-y-4">
          {(() => {
            // Filter incidents
            const filteredIncidents = useMemo(() => {
              const incidentList = Array.isArray(incidents)
                ? incidents
                : (incidents?.results || []);

              return incidentList.filter((inc: any) => {
                const matchesStatus = !incidentFilters.status || inc.status?.toLowerCase() === incidentFilters.status.toLowerCase();
                const matchesSeverity = !incidentFilters.severity || inc.severity?.toLowerCase() === incidentFilters.severity.toLowerCase();
                const matchesSearch = !incidentFilters.search ||
                  inc.title?.toLowerCase().includes(incidentFilters.search.toLowerCase()) ||
                  inc.location?.toLowerCase().includes(incidentFilters.search.toLowerCase());
                return matchesStatus && matchesSeverity && matchesSearch;
              });
            }, [incidents, incidentFilters]);

            // Pagination calculations for incidents
            const totalIncidentItems = filteredIncidents.length;
            const totalIncidentPages = totalIncidentItems ? Math.ceil(totalIncidentItems / incidentPageSize) : 1;
            const incidentStartIndex = (incidentPage - 1) * incidentPageSize;
            const incidentEndIndex = incidentStartIndex + incidentPageSize;
            const paginatedIncidents = filteredIncidents.slice(incidentStartIndex, incidentEndIndex);

            const getSeverityColor = (severity: string) => {
              const sev = (severity || '').toLowerCase();
              switch (sev) {
                case 'critical': return 'bg-red-100 text-red-800 border-red-200';
                case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
                case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
                case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
                default: return 'bg-gray-100 text-gray-800 border-gray-200';
              }
            };

            const getStatusColor = (status: string) => {
              const st = (status || '').toLowerCase();
              switch (st) {
                case 'reported': return 'bg-amber-100 text-amber-800 border-amber-200';
                case 'under_review': return 'bg-blue-100 text-blue-800 border-blue-200';
                case 'addressed': return 'bg-purple-100 text-purple-800 border-purple-200';
                case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
                case 'dismissed': return 'bg-gray-100 text-gray-800 border-gray-200';
                default: return 'bg-gray-100 text-gray-800 border-gray-200';
              }
            };

            const formatStatus = (status: string) => {
              return (status || '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            };

            return (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Reported Incidents</CardTitle>
                    <CardDescription>View and manage safety incident reports from staff</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Filters */}
                    <div className="flex gap-2 flex-wrap">
                      <Input
                        placeholder="Search by title or location..."
                        value={incidentFilters.search}
                        onChange={(e) => setIncidentFilters({ ...incidentFilters, search: e.target.value })}
                        className="w-60"
                      />
                      <select
                        value={incidentFilters.severity}
                        onChange={(e) => setIncidentFilters({ ...incidentFilters, severity: e.target.value })}
                        className="border rounded-md px-3 py-2 text-sm"
                      >
                        <option value="">All Severities</option>
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                      <select
                        value={incidentFilters.status}
                        onChange={(e) => setIncidentFilters({ ...incidentFilters, status: e.target.value })}
                        className="border rounded-md px-3 py-2 text-sm"
                      >
                        <option value="">All Statuses</option>
                        <option value="reported">Reported</option>
                        <option value="under_review">Under Review</option>
                        <option value="addressed">Addressed</option>
                        <option value="resolved">Resolved</option>
                        <option value="dismissed">Dismissed</option>
                      </select>
                    </div>

                    {/* Incidents Table */}
                    {incidentsLoading ? (
                      <div className="text-center py-8 text-muted-foreground">Loading incidents...</div>
                    ) : filteredIncidents.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <svg className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-lg font-medium mb-2">No incidents found</p>
                        <p className="text-sm">
                          {incidentFilters.search || incidentFilters.severity || incidentFilters.status
                            ? 'Try adjusting your filters'
                            : 'All incidents will appear here'}
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Title</TableHead>
                              <TableHead>Location</TableHead>
                              <TableHead>Severity</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Reporter</TableHead>
                              <TableHead>Reported At</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedIncidents.map((incident: any) => (
                              <TableRow key={incident.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedIncident(incident.id)}>
                                <TableCell className="font-medium">{incident.title}</TableCell>
                                <TableCell>{incident.location || '—'}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={getSeverityColor(incident.severity)}>
                                    {formatStatus(incident.severity)}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={getStatusColor(incident.status)}>
                                    {formatStatus(incident.status)}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {incident.is_anonymous
                                    ? 'Anonymous'
                                    : incident.reporter_details
                                      ? `${incident.reporter_details.first_name} ${incident.reporter_details.last_name}`
                                      : '—'}
                                </TableCell>
                                <TableCell>{new Date(incident.created_at).toLocaleDateString()}</TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  <Button size="sm" variant="outline" onClick={() => setSelectedIncident(incident.id)}>
                                    View
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {/* Pagination Controls for Incidents */}
                    {filteredIncidents.length > 0 && (
                      <div className="flex items-center justify-between mt-3 pt-3 border-t">
                        <div className="text-sm text-muted-foreground">
                          Showing {incidentStartIndex + 1}-{Math.min(incidentEndIndex, totalIncidentItems)} of {totalIncidentItems} incidents
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={incidentPage <= 1}
                            onClick={() => setIncidentPage((p) => Math.max(1, p - 1))}
                          >
                            Previous
                          </Button>
                          {Array.from({ length: Math.min(totalIncidentPages, 5) }, (_, i) => {
                            const pageNum = i < 2 ? i + 1 : totalIncidentPages - (4 - i);
                            if (totalIncidentPages <= 5 || Math.abs(pageNum - incidentPage) <= 2 || pageNum === 1 || pageNum === totalIncidentPages) {
                              return (
                                <Button
                                  key={pageNum}
                                  variant={pageNum === incidentPage ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setIncidentPage(pageNum)}
                                >
                                  {pageNum}
                                </Button>
                              );
                            }
                            return null;
                          }).filter(Boolean)}
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={incidentPage >= totalIncidentPages}
                            onClick={() => setIncidentPage((p) => Math.min(totalIncidentPages, p + 1))}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Incident Detail Modal */}
                <Dialog open={!!selectedIncident} onOpenChange={(open) => { if (!open) { setSelectedIncident(null); setUpdateStatus(''); setResolutionNotes(''); } }}>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Incident Details</DialogTitle>
                    </DialogHeader>
                    {incidentDetail && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="font-medium text-muted-foreground mb-1">Incident Type</div>
                            <div>{incidentDetail.incident_type || '—'}</div>
                          </div>
                          <div>
                            <div className="font-medium text-muted-foreground mb-1">Title</div>
                            <div>{incidentDetail.title}</div>
                          </div>
                          <div>
                            <div className="font-medium text-muted-foreground mb-1">Location</div>
                            <div>{incidentDetail.location || '—'}</div>
                          </div>
                          <div>
                            <div className="font-medium text-muted-foreground mb-1">Severity</div>
                            <Badge variant="outline" className={getSeverityColor(incidentDetail.severity)}>
                              {formatStatus(incidentDetail.severity)}
                            </Badge>
                          </div>
                          <div>
                            <div className="font-medium text-muted-foreground mb-1">Status</div>
                            <Badge variant="outline" className={getStatusColor(incidentDetail.status)}>
                              {formatStatus(incidentDetail.status)}
                            </Badge>
                          </div>
                          <div>
                            <div className="font-medium text-muted-foreground mb-1">Reporter</div>
                            <div>
                              {incidentDetail.is_anonymous
                                ? 'Anonymous'
                                : incidentDetail.reporter_details
                                  ? `${incidentDetail.reporter_details.first_name} ${incidentDetail.reporter_details.last_name}`
                                  : '—'}
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-muted-foreground mb-1">Reported At</div>
                            <div>{new Date(incidentDetail.created_at).toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="font-medium text-muted-foreground mb-1">Time of Occurrence</div>
                            <div>{incidentDetail.occurred_at ? new Date(incidentDetail.occurred_at).toLocaleString() : '—'}</div>
                          </div>
                          <div>
                            <div className="font-medium text-muted-foreground mb-1">Shift Reference</div>
                            <div>{incidentDetail.shift ? String(incidentDetail.shift).slice(0, 8) : '—'}</div>
                          </div>
                        </div>

                        <div>
                          <div className="font-medium text-muted-foreground mb-1 text-sm">Description</div>
                          <div className="border rounded-md p-3 bg-muted/30 text-sm whitespace-pre-wrap">
                            {incidentDetail.description}
                          </div>
                        </div>

                        {incidentDetail.photo && (
                          <div>
                            <div className="font-medium text-muted-foreground mb-2 text-sm">Photo Evidence</div>
                            <img
                              src={incidentDetail.photo}
                              alt="Incident evidence"
                              className="max-h-96 rounded-md border"
                            />
                          </div>
                        )}

                        {incidentDetail.resolution_notes && (
                          <div>
                            <div className="font-medium text-muted-foreground mb-1 text-sm">Resolution Notes</div>
                            <div className="border rounded-md p-3 bg-muted/30 text-sm whitespace-pre-wrap">
                              {incidentDetail.resolution_notes}
                            </div>
                          </div>
                        )}

                        {incidentDetail.resolved_by_details && (
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="font-medium text-muted-foreground mb-1">Resolved By</div>
                              <div>{incidentDetail.resolved_by_details.first_name} {incidentDetail.resolved_by_details.last_name}</div>
                            </div>
                            <div>
                              <div className="font-medium text-muted-foreground mb-1">Resolved At</div>
                              <div>{incidentDetail.resolved_at ? new Date(incidentDetail.resolved_at).toLocaleString() : '—'}</div>
                            </div>
                          </div>
                        )}

                        <div className="border-t pt-4">
                          <div className="font-medium mb-3">Update Status</div>
                          <div className="space-y-3">
                            <div>
                              <label className="text-sm font-medium mb-2 block">New Status</label>
                              <select
                                value={updateStatus || incidentDetail.status}
                                onChange={(e) => setUpdateStatus(e.target.value)}
                                className="w-full border rounded-md px-3 py-2"
                              >
                                <option value="REPORTED">Reported</option>
                                <option value="UNDER_REVIEW">Under Review</option>
                                <option value="ADDRESSED">Addressed</option>
                                <option value="RESOLVED">Resolved</option>
                                <option value="DISMISSED">Dismissed</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-2 block">Resolution Notes</label>
                              <Textarea
                                value={resolutionNotes || incidentDetail.resolution_notes || ''}
                                onChange={(e) => setResolutionNotes(e.target.value)}
                                placeholder="Add notes about how this incident was handled..."
                                rows={4}
                              />
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button variant="outline" onClick={() => { setSelectedIncident(null); setUpdateStatus(''); setResolutionNotes(''); }}>
                                Close
                              </Button>
                              <Button
                                onClick={() => updateStatusMutation.mutate({
                                  id: incidentDetail.id,
                                  status: updateStatus || incidentDetail.status,
                                  resolution_notes: resolutionNotes || incidentDetail.resolution_notes || ''
                                })}
                                disabled={updateStatusMutation.isPending}
                              >
                                {updateStatusMutation.isPending ? 'Updating...' : 'Update Status'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </>
            );
          })()}
        </TabsContent>
      </Tabs>

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

                {summary.compiled_summary ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="border rounded-md p-3">
                      <div className="text-muted-foreground">Completion</div>
                      <div className="font-semibold">
                        {summary.compiled_summary.completed_steps ?? 0}/{summary.compiled_summary.total_steps ?? 0} ({summary.compiled_summary.completion_rate ?? 0}%)
                      </div>
                    </div>
                    <div className="border rounded-md p-3">
                      <div className="text-muted-foreground">Duration</div>
                      <div className="font-semibold">{typeof summary.compiled_summary.duration_minutes === 'number' ? `${summary.compiled_summary.duration_minutes} min` : '—'}</div>
                    </div>
                    <div className="border rounded-md p-3">
                      <div className="text-muted-foreground">Evidence</div>
                      <div className="font-semibold">{summary.compiled_summary.evidence_items ?? 0} item(s)</div>
                    </div>
                    <div className="border rounded-md p-3">
                      <div className="text-muted-foreground">Open actions</div>
                      <div className="font-semibold">{summary.compiled_summary.actions_open ?? 0}</div>
                    </div>
                  </div>
                ) : null}
                <div className="border rounded-md">
                  <ScrollArea className="h-72 p-3">
                    {detailQuery.isLoading ? (
                      <div className="text-sm text-muted-foreground">Loading full details…</div>
                    ) : exec ? (
                      <div className="space-y-3 text-sm">
                        <div className="space-y-1">
                          <div className="font-medium">Checklist report</div>
                          {exec.assigned_shift_info ? (
                            <div className="text-xs text-muted-foreground">
                              Shift: {exec.assigned_shift_info.shift_date || '—'}{' '}
                              {exec.assigned_shift_info.start_time ? `(${new Date(exec.assigned_shift_info.start_time).toLocaleTimeString()}` : ''}
                              {exec.assigned_shift_info.end_time ? ` – ${new Date(exec.assigned_shift_info.end_time).toLocaleTimeString()})` : exec.assigned_shift_info.start_time ? ')' : ''}
                              {exec.assigned_shift_info.role ? ` • Role: ${exec.assigned_shift_info.role}` : ''}
                              {exec.assigned_shift_info.department ? ` • Dept: ${exec.assigned_shift_info.department}` : ''}
                            </div>
                          ) : null}
                        </div>

                        <div className="font-medium">Steps</div>
                        {(exec.step_responses || []).map((sr: any, idx: number) => (
                          <div key={sr.id || idx} className="border rounded-md p-3">
                            <div className="font-medium">{sr.step?.title || `Step ${idx + 1}`}</div>
                            <div className="text-xs text-muted-foreground">{sr.step?.description || ''}</div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                              <Badge variant="outline">Status: {sr.status || (sr.is_completed ? 'COMPLETED' : 'PENDING')}</Badge>
                              {sr.text_response ? (<Badge variant="outline">Response: {sr.text_response}</Badge>) : null}
                              {sr.measurement_value != null ? (<Badge variant="outline">Measure: {String(sr.measurement_value)}{sr.step?.measurement_unit ? ` ${sr.step.measurement_unit}` : ''}</Badge>) : null}
                              {typeof sr.boolean_response === 'boolean' ? (<Badge variant="outline">Answer: {sr.boolean_response ? 'Yes' : 'No'}</Badge>) : null}
                              {sr.signature_data ? (<Badge variant="outline">Signature</Badge>) : null}
                            </div>
                            {sr.notes ? (<div className="mt-2 text-xs">Notes: {sr.notes}</div>) : null}
                            {Array.isArray(sr.evidence) && sr.evidence.length > 0 ? (
                              <div className="mt-2 text-xs space-y-1">
                                <div>Evidence:</div>
                                <ul className="list-disc pl-4">
                                  {sr.evidence.map((ev: any, eidx: number) => (
                                    <li key={ev.id || eidx} className="break-all">
                                      {ev.evidence_type || 'FILE'} — {ev.filename || ev.file_path || '—'}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                          </div>
                        ))}

                        {Array.isArray(exec.actions) && exec.actions.length > 0 ? (
                          <div className="space-y-2">
                            <div className="font-medium">Actions created</div>
                            <div className="space-y-2">
                              {exec.actions.map((a: any) => (
                                <div key={a.id} className="border rounded-md p-3 text-xs">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="font-semibold">{a.title}</div>
                                    <Badge variant="outline">{a.status}</Badge>
                                  </div>
                                  {a.description ? <div className="mt-1 text-muted-foreground">{a.description}</div> : null}
                                  <div className="mt-2 text-muted-foreground">
                                    Assigned to: {a.assigned_to ? `${a.assigned_to.first_name || ''} ${a.assigned_to.last_name || ''}`.trim() : '—'} • Priority: {a.priority || '—'}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
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