/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Zap,
  Play,
  Pause,
  Trash2,
  Settings,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Webhook,
  Timer,
  Mail,
  Bell,
  Users,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";
import { PAGE_SHELL_PADDED } from "@/lib/page-shell";

// ── Types ───────────────────────────────────────────────────────────
type TriggerType = "event" | "schedule" | "manual" | "threshold";

interface WorkflowAction {
  type: string;
  config: Record<string, any>;
  delay_minutes?: number;
  condition?: string;
}

interface WorkflowCondition {
  field: string;
  operator: string;
  value: any;
}

interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  trigger_type: TriggerType;
  trigger_config: Record<string, any>;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  is_enabled: boolean;
  last_run_at: string | null;
  run_count: number;
  last_status: string | null;
  created_at: string;
  updated_at: string;
}

// ── Constants ───────────────────────────────────────────────────────
const TRIGGER_CONFIG: Record<
  TriggerType,
  { label: string; icon: any; color: string; description: string }
> = {
  event: {
    label: "Event Trigger",
    icon: Webhook,
    color: "text-blue-500",
    description: "Fires when a system event occurs",
  },
  schedule: {
    label: "Schedule",
    icon: Timer,
    color: "text-purple-500",
    description: "Runs on a time-based schedule",
  },
  manual: {
    label: "Manual",
    icon: Play,
    color: "text-green-500",
    description: "Triggered manually by a user",
  },
  threshold: {
    label: "Threshold",
    icon: AlertTriangle,
    color: "text-amber-500",
    description: "Fires when a metric crosses a threshold",
  },
};

const ACTION_TYPES = [
  { value: "send_notification", label: "Send Notification", icon: Bell },
  { value: "send_email", label: "Send Email", icon: Mail },
  { value: "create_task", label: "Create Task", icon: FileText },
  { value: "assign_to_role", label: "Assign to Role", icon: Users },
  { value: "escalate", label: "Escalate", icon: AlertTriangle },
  { value: "webhook", label: "Call Webhook", icon: Webhook },
];

const EVENT_TYPES = [
  "shift.created",
  "shift.swapped",
  "incident.created",
  "incident.resolved",
  "task.overdue",
  "task.completed",
  "checklist.submitted",
  "document.expiring",
  "guest_request.created",
  "approval.requested",
  "schedule.published",
];

// ── Component ───────────────────────────────────────────────────────
export default function WorkflowBuilderPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  // ── Queries ────────────────────────────────────────────────────────
  const { data: workflows = [], isLoading } = useQuery<WorkflowDefinition[]>({
    queryKey: ["workflows"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/core/workflows/`);
      if (!res.ok) throw new Error("Failed to fetch workflows");
      return res.json();
    },
  });

  // ── Mutations ──────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description: string;
      trigger_type: TriggerType;
      trigger_config: Record<string, any>;
      conditions: WorkflowCondition[];
      actions: WorkflowAction[];
    }) => {
      const res = await fetch(`${API_BASE}/core/workflows/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create workflow");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      setCreateOpen(false);
      toast.success(t("generic.toast.workflow_created"));
    },
    onError: () => toast.error(t("generic.toast.failed_to_create_workflow")),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const res = await fetch(`${API_BASE}/core/workflows/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_enabled }),
      });
      if (!res.ok) throw new Error("Failed to toggle workflow");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast.success(t("generic.toast.workflow_updated"));
    },
    onError: () => toast.error(t("generic.toast.failed_to_update_workflow")),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/core/workflows/${id}/`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete workflow");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      setDetailId(null);
      toast.success(t("generic.toast.workflow_deleted"));
    },
    onError: () => toast.error(t("generic.toast.failed_to_delete_workflow")),
  });

  const runMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/core/workflows/${id}/run/`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to run workflow");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast.success(t("generic.toast.workflow_started"));
    },
    onError: () => toast.error(t("generic.toast.failed_to_run_workflow")),
  });

  const detailWorkflow = workflows.find((w) => w.id === detailId);

  return (
    <div className={PAGE_SHELL_PADDED}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t("Workflow Builder")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("Create and manage automated workflows")}
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {t("New Workflow")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("Create Workflow")}</DialogTitle>
            </DialogHeader>
            <WorkflowForm
              onSubmit={(data) => createMutation.mutate(data)}
              onCancel={() => setCreateOpen(false)}
              isLoading={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{workflows.length}</p>
                <p className="text-xs text-muted-foreground">{t("Total Workflows")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Play className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {workflows.filter((w) => w.is_enabled).length}
                </p>
                <p className="text-xs text-muted-foreground">{t("Active")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">
                  {workflows.reduce((sum, w) => sum + w.run_count, 0)}
                </p>
                <p className="text-xs text-muted-foreground">{t("Total Runs")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflow List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
            {t("Loading workflows...")}
          </div>
        ) : workflows.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Zap className="w-12 h-12 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">{t("No workflows yet")}</p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                {t("Create your first automation workflow")}
              </p>
            </CardContent>
          </Card>
        ) : (
          workflows.map((wf) => {
            const triggerConfig = TRIGGER_CONFIG[wf.trigger_type];
            const TriggerIcon = triggerConfig?.icon || Zap;
            return (
              <Card
                key={wf.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setDetailId(wf.id)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div
                    className={`p-2 rounded-lg bg-muted ${triggerConfig?.color || "text-gray-500"}`}
                  >
                    <TriggerIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{wf.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {triggerConfig?.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {wf.description || `${wf.actions.length} action(s)`}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      <p className="text-muted-foreground">
                        {wf.run_count} {t("runs")}
                      </p>
                      {wf.last_run_at && (
                        <p className="text-xs text-muted-foreground/60">
                          Last: {new Date(wf.last_run_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Switch
                      checked={wf.is_enabled}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({ id: wf.id, is_enabled: checked })
                      }
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detailId} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detailWorkflow && (
            <>
              <DialogHeader>
                <DialogTitle>{detailWorkflow.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {detailWorkflow.description && (
                  <p className="text-sm text-muted-foreground">
                    {detailWorkflow.description}
                  </p>
                )}

                {/* Trigger */}
                <div>
                  <h4 className="font-medium mb-2">{t("Trigger")}</h4>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    {React.createElement(
                      TRIGGER_CONFIG[detailWorkflow.trigger_type]?.icon || Zap,
                      { className: "w-4 h-4" }
                    )}
                    <span className="text-sm">
                      {TRIGGER_CONFIG[detailWorkflow.trigger_type]?.label}
                    </span>
                    <code className="text-xs text-muted-foreground ml-auto">
                      {JSON.stringify(detailWorkflow.trigger_config)}
                    </code>
                  </div>
                </div>

                {/* Conditions */}
                {detailWorkflow.conditions.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">
                      {t("Conditions")} ({detailWorkflow.conditions.length})
                    </h4>
                    <div className="space-y-1">
                      {detailWorkflow.conditions.map((cond, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded"
                        >
                          <GitBranch className="w-3 h-3 text-muted-foreground" />
                          <code>
                            {cond.field} {cond.operator} {String(cond.value)}
                          </code>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div>
                  <h4 className="font-medium mb-2">
                    {t("Actions")} ({detailWorkflow.actions.length})
                  </h4>
                  <div className="space-y-2">
                    {detailWorkflow.actions.map((action, i) => {
                      const actionType = ACTION_TYPES.find(
                        (a) => a.value === action.type
                      );
                      const ActionIcon = actionType?.icon || Zap;
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                        >
                          <span className="text-xs text-muted-foreground font-mono w-6">
                            {i + 1}.
                          </span>
                          <ActionIcon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {actionType?.label || action.type}
                          </span>
                          {action.delay_minutes && action.delay_minutes > 0 && (
                            <Badge variant="outline" className="text-xs">
                              +{action.delay_minutes}m delay
                            </Badge>
                          )}
                          {action.condition && (
                            <Badge variant="secondary" className="text-xs">
                              if: {action.condition}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => runMutation.mutate(detailWorkflow.id)}
                    disabled={!detailWorkflow.is_enabled}
                  >
                    <Play className="w-4 h-4 mr-1" />
                    {t("Run Now")}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (confirm(t("Delete this workflow?"))) {
                        deleteMutation.mutate(detailWorkflow.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    {t("Delete")}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Workflow Form ───────────────────────────────────────────────────

function WorkflowForm({
  onSubmit,
  onCancel,
  isLoading,
}: {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState<TriggerType>("event");
  const [triggerConfig, setTriggerConfig] = useState<Record<string, any>>({});
  const [conditions, setConditions] = useState<WorkflowCondition[]>([]);
  const [actions, setActions] = useState<WorkflowAction[]>([]);

  const addCondition = () => {
    setConditions([...conditions, { field: "", operator: "equals", value: "" }]);
  };

  const updateCondition = (
    index: number,
    field: keyof WorkflowCondition,
    value: any
  ) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], [field]: value };
    setConditions(updated);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const addAction = () => {
    setActions([...actions, { type: "send_notification", config: {} }]);
  };

  const updateAction = (index: number, updates: Partial<WorkflowAction>) => {
    const updated = [...actions];
    updated[index] = { ...updated[index], ...updates };
    setActions(updated);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || actions.length === 0) return;
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      trigger_type: triggerType,
      trigger_config: triggerConfig,
      conditions,
      actions,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">{t("Workflow Name")} *</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("e.g. Auto-escalate overdue tasks")}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">{t("Description")}</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("What does this workflow do?")}
            rows={2}
          />
        </div>
      </div>

      <Separator />

      {/* Trigger */}
      <div>
        <h4 className="font-medium mb-3">{t("Trigger")}</h4>
        <Select value={triggerType} onValueChange={(v) => setTriggerType(v as any)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TRIGGER_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label} — {config.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {triggerType === "event" && (
          <div className="mt-2">
            <label className="text-sm text-muted-foreground">{t("Event Type")}</label>
            <Select
              value={triggerConfig.event_type || ""}
              onValueChange={(v) =>
                setTriggerConfig({ ...triggerConfig, event_type: v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("Select event...")} />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((evt) => (
                  <SelectItem key={evt} value={evt}>
                    {evt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {triggerType === "schedule" && (
          <div className="mt-2">
            <label className="text-sm text-muted-foreground">{t("Cron Expression")}</label>
            <Input
              value={triggerConfig.cron || ""}
              onChange={(e) =>
                setTriggerConfig({ ...triggerConfig, cron: e.target.value })
              }
              placeholder="0 9 * * 1-5 (weekdays at 9am)"
            />
          </div>
        )}
      </div>

      <Separator />

      {/* Conditions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium">{t("Conditions")} (optional)</h4>
          <Button type="button" variant="ghost" size="sm" onClick={addCondition}>
            <Plus className="w-4 h-4 mr-1" />
            {t("Add")}
          </Button>
        </div>
        <div className="space-y-2">
          {conditions.map((cond, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={cond.field}
                onChange={(e) => updateCondition(i, "field", e.target.value)}
                placeholder={t("field")}
                className="flex-1"
              />
              <Select
                value={cond.operator}
                onValueChange={(v) => updateCondition(i, "operator", v)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equals">equals</SelectItem>
                  <SelectItem value="not_equals">not equals</SelectItem>
                  <SelectItem value="greater_than">greater than</SelectItem>
                  <SelectItem value="less_than">less than</SelectItem>
                  <SelectItem value="contains">contains</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={String(cond.value)}
                onChange={(e) => updateCondition(i, "value", e.target.value)}
                placeholder={t("value")}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeCondition(i)}
              >
                ×
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Actions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium">{t("Actions")} *</h4>
          <Button type="button" variant="ghost" size="sm" onClick={addAction}>
            <Plus className="w-4 h-4 mr-1" />
            {t("Add Action")}
          </Button>
        </div>
        <div className="space-y-3">
          {actions.map((action, i) => {
            const actionType = ACTION_TYPES.find((a) => a.value === action.type);
            const ActionIcon = actionType?.icon || Zap;
            return (
              <div key={i} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <span className="text-xs text-muted-foreground font-mono">
                  {i + 1}.
                </span>
                <ActionIcon className="w-4 h-4 text-muted-foreground" />
                <Select
                  value={action.type}
                  onValueChange={(v) => updateAction(i, { type: v })}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_TYPES.map((at) => (
                      <SelectItem key={at.value} value={at.value}>
                        {at.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={action.delay_minutes || 0}
                  onChange={(e) =>
                    updateAction(i, { delay_minutes: Number(e.target.value) })
                  }
                  type="number"
                  min={0}
                  placeholder="0"
                  className="w-20"
                />
                <span className="text-xs text-muted-foreground">{t("min delay")}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAction(i)}
                >
                  ×
                </Button>
              </div>
            );
          })}
        </div>
        {actions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("Add at least one action")}
          </p>
        )}
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t("Cancel")}
        </Button>
        <Button
          type="submit"
          disabled={isLoading || !name.trim() || actions.length === 0}
        >
          {isLoading ? t("Creating...") : t("Create Workflow")}
        </Button>
      </div>
    </form>
  );
}
