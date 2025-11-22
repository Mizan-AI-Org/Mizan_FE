import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, API_BASE } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useNotifications } from "@/hooks/useNotifications";

type AvailabilityTask = {
  id: string;
  title?: string;
  description?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  submitted_at?: string;
  staff?: { id?: string; name?: string } | null;
  status?: "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "IN_PROGRESS" | "COMPLETED";
  progress_pct?: number;
};

const AdminEmergencyAvailability: React.FC = () => {
  const queryClient = useQueryClient();
  const { notifications } = useNotifications();
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: tasks = [], isLoading, error } = useQuery<AvailabilityTask[]>({
    queryKey: ["emergency-availability-tasks", dateFrom, dateTo, priority, status],
    queryFn: async () => {
      const url = new URL(`${API_BASE}/emergency/availability/tasks/`);
      if (dateFrom) url.searchParams.set("from", dateFrom);
      if (dateTo) url.searchParams.set("to", dateTo);
      if (priority) url.searchParams.set("priority", priority);
      if (status) url.searchParams.set("status", status);
      const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } });
      if (!res.ok) {
        const fallback = await api.getMyChecklists({ status: "COMPLETED", page_size: 25 });
        const arr = Array.isArray(fallback) ? fallback : (fallback.results || []);
        return arr.map((e: { id: number | string; template?: { name?: string; description?: string }; priority_level?: string; completed_at?: string; updated_at?: string; assigned_to?: { id?: string; first_name?: string; last_name?: string } }) => ({
          id: String(e.id),
          title: e.template?.name,
          description: e.template?.description,
          priority: (e.priority_level || 'MEDIUM') as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
          submitted_at: e.completed_at || e.updated_at,
          staff: e.assigned_to ? { id: e.assigned_to.id, name: `${e.assigned_to.first_name || ''} ${e.assigned_to.last_name || ''}`.trim() } : null,
          status: 'COMPLETED',
          progress_pct: 100
        }));
      }
      const data = await res.json();
      return Array.isArray(data) ? data : (data.results || []);
    },
    refetchInterval: 5000,
    staleTime: 0,
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/emergency/availability/tasks/${id}/approve/`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('access_token')}` } });
      if (!res.ok) throw new Error('Failed to approve task');
      await api.notifyEvent({ event_type: 'FIELD_EDITED', severity: 'HIGH', message: `Task ${id} approved` });
      await api.logAdminAction?.(id, { action: 'APPROVE', message: 'Task approved' });
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["emergency-availability-tasks"] }); toast.success('Approved'); },
    onError: () => toast.error('Approval failed'),
  });
  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/emergency/availability/tasks/${id}/reject/`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('access_token')}` } });
      if (!res.ok) throw new Error('Failed to reject task');
      await api.notifyEvent({ event_type: 'FIELD_EDITED', severity: 'HIGH', message: `Task ${id} rejected` });
      await api.logAdminAction?.(id, { action: 'REJECT', message: 'Task rejected' });
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["emergency-availability-tasks"] }); toast.success('Rejected'); },
    onError: () => toast.error('Rejection failed'),
  });

  const bulkApprove = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Approve ${selectedIds.length} tasks?`)) return;
    for (const id of selectedIds) { 
      try { 
        await approveMutation.mutateAsync(id); 
      } catch (e) {
        console.warn(`Failed to approve task ${id}`, e);
      }
    }
    setSelectedIds([]);
  };
  const bulkReject = async () => {
    if (selectedIds.length === 0) return;

    if (!confirm(`Reject ${selectedIds.length} tasks?`)) return;
    for (const id of selectedIds) { try { await rejectMutation.mutateAsync(id); } catch {} }
    setSelectedIds([]);
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (Array.isArray(tasks) ? tasks : []).filter(t => {
      const title = String(t.title || '').toLowerCase();
      const staffName = String(t.staff?.name || '').toLowerCase();
      return (!term || title.includes(term) || staffName.includes(term));
    }).sort((a, b) => {
      const pa = (a.priority || 'MEDIUM'); const pb = (b.priority || 'MEDIUM');
      const order = { CRITICAL: 3, HIGH: 2, MEDIUM: 1, LOW: 0 } as Record<string, number>;
      return order[pb] - order[pa];
    });
  }, [tasks, search]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Emergency Staff Availability</h2>
          <p className="text-sm text-muted-foreground">Live task submissions and admin actions</p>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Search by title or staff" value={search} onChange={(e)=>setSearch(e.target.value)} className="w-56" />
          <Input type="date" value={dateFrom} onChange={(e)=>setDateFrom(e.target.value)} className="w-40" />
          <Input type="date" value={dateTo} onChange={(e)=>setDateTo(e.target.value)} className="w-40" />
          <select className="border rounded-md h-9 px-2" value={priority} onChange={(e)=>setPriority(e.target.value)}>
            <option value="">All priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          <select className="border rounded-md h-9 px-2" value={status} onChange={(e)=>setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={bulkApprove} disabled={selectedIds.length === 0}>Bulk Approve</Button>
        <Button size="sm" variant="outline" onClick={bulkReject} disabled={selectedIds.length === 0}>Bulk Reject</Button>
        <div className="text-xs text-muted-foreground">Selected: {selectedIds.length}</div>
      </div>

      {error && <div className="text-red-600 text-sm">Failed to load tasks</div>}
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading tasks…</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground">No tasks</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((t) => (
            <Card key={t.id} className="transition hover:shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={selectedIds.includes(t.id)} onCheckedChange={() => toggleSelect(t.id)} aria-label="Select task" />
                    <div>
                      <CardTitle className="text-base">{t.title || 'Task'}</CardTitle>
                      <CardDescription className="text-sm">{t.staff?.name || '—'} • {t.submitted_at ? new Date(t.submitted_at).toLocaleString() : '—'}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={t.priority === 'CRITICAL' ? 'destructive' : (t.priority === 'HIGH' ? 'secondary' : 'outline')} className="text-xs">{t.priority || 'MEDIUM'}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {t.description && <div className="text-sm text-muted-foreground">{t.description}</div>}
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">{t.status || '—'}</Badge>
                  <div className="w-40">
                    <Progress value={t.progress_pct || 0} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => setOpenId(t.id)}>View</Button>
                  <Button size="sm" variant="outline" onClick={() => approveMutation.mutate(t.id)}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => rejectMutation.mutate(t.id)}>Reject</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!openId} onOpenChange={(o)=> setOpenId(o ? openId : null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="summary">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="expanded">Expanded</TabsTrigger>
            </TabsList>
            <TabsContent value="summary" className="space-y-3 mt-3">
              <div className="text-sm text-muted-foreground">Key fields and status</div>
            </TabsContent>
            <TabsContent value="expanded" className="space-y-3 mt-3">
              <div className="text-sm text-muted-foreground">Full submission content</div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button onClick={() => openId && approveMutation.mutate(openId)}>Approve</Button>
            <Button variant="outline" onClick={() => openId && rejectMutation.mutate(openId)}>Reject</Button>
            <Button variant="ghost" onClick={() => setOpenId(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEmergencyAvailability;