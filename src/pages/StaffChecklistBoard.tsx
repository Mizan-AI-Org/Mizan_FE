import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
// Use relative import to avoid alias resolution issues in some TS setups
import ChecklistTree from "../components/checklist/ChecklistTree";
import { api } from "@/lib/api";
import type { TemplateDefinition, StepDefinition } from "@/types/checklist";
import { ClipboardList, Filter, Loader2 } from "lucide-react";

type ChecklistExecutionItem = {
  id: string; // execution id
  status?: string;
  started_at?: string | null;
  completed_at?: string | null;
  due_date?: string | null;
  priority?: string | null;
  template?: { id: string; name: string; description?: string } | null;
};

const StaffChecklistBoard: React.FC = () => {
  const [items, setItems] = useState<ChecklistExecutionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [selectedExecId, setSelectedExecId] = useState<string>("");
  const [template, setTemplate] = useState<TemplateDefinition | null>(null);
  const [assigneeName, setAssigneeName] = useState<string>("");

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("access_token") || "";
        const userRaw = localStorage.getItem("user");
        const user = userRaw ? JSON.parse(userRaw) : null as { id?: string; first_name?: string; last_name?: string; email?: string } | null;
        setAssigneeName(user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user?.email || 'You' : 'You');

        // My checklist executions (may be array or paginated envelope)
        const resp = await api.getMyChecklists({ status: status || undefined, page: 1, page_size: 50 });
        const list = Array.isArray(resp) ? resp : (resp?.results ?? []);

        let merged: ChecklistExecutionItem[] = Array.isArray(list) ? list as ChecklistExecutionItem[] : [];

        // Fallback: include assigned tasks ensured as checklists when my list is empty
        if ((!merged || merged.length === 0) && token && user?.id) {
          try {
            const taskExecs = await api.getAssignedTasksAsChecklists(token, String(user.id), status || undefined);
            const mapped: ChecklistExecutionItem[] = taskExecs.map(t => ({
              id: t.execution_id,
              status: t.status,
              due_date: t.due_date ?? null,
              priority: t.priority ?? null,
              template: t.template ? { id: t.template.id, name: t.template.name, description: t.template.description } : null,
            }));
            merged = mapped;
          } catch (err) {
            // Non-blocking; keep merged as is
            console.warn('Failed to load assigned tasks as checklists', err);
          }
        }

        setItems(merged || []);
        if (!selectedExecId && merged && merged[0]?.id) setSelectedExecId(String(merged[0].id));
      } catch (e) {
        // Non-blocking on error
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [status]);

  useEffect(() => {
    const loadExecution = async () => {
      if (!selectedExecId) { setTemplate(null); return; }
      try {
        const data: { template?: { id: string; name: string; description?: string; template_type?: string; steps?: Array<{
          id?: string | number;
          title?: string;
          description?: string;
          order?: number;
          requires_photo?: boolean;
          requires_signature?: boolean;
          measurement_type?: string | null;
          measurement_unit?: string | null;
          min_value?: number | null;
          max_value?: number | null;
        }> } } = await api.getChecklistExecution(selectedExecId);
        const t = data?.template;
        if (!t) { setTemplate(null); return; }
        const stepsSource = Array.isArray(t.steps) ? t.steps : [];
        const steps: StepDefinition[] = stepsSource
          .sort((a, b) => ((a.order ?? 0) - (b.order ?? 0)))
          .map((s, idx) => ({
            id: String(s.id ?? idx + 1),
            title: s.title || `Step ${idx + 1}`,
            instruction: s.description ?? undefined,
            requiresPhoto: !!s.requires_photo,
            requiresSignature: !!s.requires_signature,
            measurements: s.measurement_type ? [{
              label: s.measurement_type,
              unit: s.measurement_unit || undefined,
              min: s.min_value ?? undefined,
              max: s.max_value ?? undefined,
              thresholdType: s.min_value != null && s.max_value != null ? 'range' : s.min_value != null ? 'min' : s.max_value != null ? 'max' : undefined,
            }] : undefined,
            estimatedSeconds: undefined,
          }));
        setTemplate({ id: String(t.id), name: t.name, description: t.description ?? undefined, steps, category: t.template_type || undefined });
      } catch {
        setTemplate(null);
      }
    };
    loadExecution();
  }, [selectedExecId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(it => (it.template?.name || '').toLowerCase().includes(q) || (it.template?.description || '').toLowerCase().includes(q));
  }, [items, query]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-50">
            <ClipboardList className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Staff Checklists</h2>
            <p className="text-xs text-muted-foreground">Assigned templates and tasks in checklist format</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select className="border rounded-md h-9 px-2 w-full" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="OVERDUE">Overdue</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <Input placeholder="Search by name or description" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search checklists" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Assigned Templates</CardTitle>
            <CardDescription className="text-xs">Select to view and run</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="text-sm text-muted-foreground">No templates found.</div>
            ) : (
              <div className="space-y-2">
                {filtered.map((it) => (
                  <button key={it.id} className={`w-full text-left border rounded-md p-2 hover:bg-muted ${String(it.id) === selectedExecId ? 'bg-muted' : ''}`} onClick={() => setSelectedExecId(String(it.id))} aria-label={`Open ${it.template?.name || 'Checklist'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{it.template?.name || 'Checklist'}</div>
                        <div className="text-xs text-muted-foreground truncate">{it.template?.description || ''}</div>
                      </div>
                      <Badge variant="outline" className="text-xs">{it.status || 'PENDING'}</Badge>
                    </div>
                    {it.due_date && <div className="text-xs text-muted-foreground mt-1">Due {new Date(it.due_date).toLocaleDateString()}</div>}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          {selectedExecId && template ? (
            <ChecklistTree executionId={selectedExecId} template={template} assigneeName={assigneeName} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Select a template</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Choose an assigned template from the left to view its checklist.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffChecklistBoard;