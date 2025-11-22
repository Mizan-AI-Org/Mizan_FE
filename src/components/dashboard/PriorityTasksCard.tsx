import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2 } from "lucide-react";
import type { Task, StaffProfileItem } from "@/lib/types";

type Props = {
  tasks?: Task[] | null;
  loading?: boolean;
  error?: boolean;
  staffProfiles?: StaffProfileItem[] | null;
  onComplete: (id: string) => void;
  onDefer: (id: string) => void;
  onReassignOpen: (taskId: number) => void;
  reassignTargetId?: number | null;
  onConfirmReassign: (staffId: number) => void;
  onCancelReassign: () => void;
  priorityColor: (p?: Task["priority"]) => string;
};

const PriorityTasksCard: React.FC<Props> = ({ tasks, loading, error, staffProfiles, onComplete, onDefer, onReassignOpen, reassignTargetId, onConfirmReassign, onCancelReassign, priorityColor }) => {
  return (
    <Card className="lg:col-span-2" aria-labelledby="priority-tasks-title">
      <CardHeader>
        <CardTitle id="priority-tasks-title" className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" /> Today's Priority Tasks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && (
          <div className="flex items-center gap-2 text-sm" role="status" aria-live="polite">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading tasks…
          </div>
        )}
        {error && (
          <div className="text-sm text-destructive" role="alert">Failed to load tasks.</div>
        )}
        {!loading && !error && (!tasks || tasks.length === 0) && (
          <div className="text-sm text-muted-foreground">No priority tasks for today.</div>
        )}
        {!loading && !error && tasks && tasks.length > 0 && (
          <div className="space-y-3 animate-in fade-in">
            {tasks.map((t) => (
              <div key={t.id} className="flex items-start justify-between rounded-md border p-3 transition hover:bg-muted/40">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={priorityColor(t.priority) as any} aria-label={`Priority ${t.priority?.toUpperCase?.() || 'PRIORITY'}`}>
                      {t.priority?.toUpperCase() ?? "PRIORITY"}
                    </Badge>
                    <span className="font-medium">{t.title ?? t.name ?? `Task #${t.id}`}</span>
                  </div>
                  {t.due_time && (
                    <div className="text-xs text-muted-foreground">Due: {new Date(t.due_time).toLocaleString()}</div>
                  )}
                  {t.assigned_to_name && (
                    <div className="text-xs text-muted-foreground">Assigned to: {t.assigned_to_name}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="default" onClick={() => onComplete(String(t.id!))}>Complete</Button>
                  <Button size="sm" variant="secondary" onClick={() => onDefer(String(t.id!))}>Defer</Button>
                  <Button size="sm" variant="outline" onClick={() => onReassignOpen(Number(t.id!))}>Reassign</Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {reassignTargetId && (
          <div className="rounded-md border p-3 space-y-2">
            <div className="text-sm font-medium">Select staff to reassign</div>
            <div className="flex items-center gap-2">
              <select className="border rounded px-2 py-1 text-sm" onChange={(e) => onConfirmReassign(Number(e.target.value))} aria-label="Choose staff">
                <option value="">Choose staff…</option>
                {staffProfiles?.map((s) => (
                  <option key={s.user_details?.id} value={s.user_details?.id ?? 0}>
                    {s.user_details?.first_name} {s.user_details?.last_name} ({s.position ?? "Staff"})
                  </option>
                ))}
              </select>
              <Button size="sm" variant="ghost" onClick={onCancelReassign}>Cancel</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PriorityTasksCard;