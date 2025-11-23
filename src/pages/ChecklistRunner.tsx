import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import ChecklistExecutor from "@/components/checklist/ChecklistExecutor";
import type { TemplateDefinition, StepDefinition, ExecutionRecord, StepResponse, EvidenceAttachment, MeasurementField, ResponseOption } from "@/types/checklist";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { logError, logInfo } from "@/lib/logging";
import { api } from "@/lib/api";

// Backend response shapes used for mapping into ChecklistExecutor types
interface BackendStep {
  id: string;
  title: string;
  description?: string | null;
  order?: number | null;
  measurement_type?: string | null;
  measurement_unit?: string | null;
  min_value?: number | null;
  max_value?: number | null;
  requires_photo?: boolean | null;
  requires_signature?: boolean | null;
}

interface BackendTemplate {
  id: string;
  name: string;
  description?: string | null;
  template_type?: string | null;
  steps?: BackendStep[];
}

interface BackendEvidence {
  id: string;
  evidence_type: string;
  file_path?: string;
  thumbnail_path?: string | null;
  metadata?: Record<string, unknown>;
  captured_at?: string;
}

interface BackendStepResponse {
  step: BackendStep;
  boolean_response?: boolean | null;
  status?: string;
  measurement_value?: number | string | null;
  notes?: string | null;
  signature_data?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  evidence?: BackendEvidence[];
}

interface BackendAction {
  id: string;
  title: string;
  description?: string | null;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | string;
  due_date?: string | null;
  assigned_to?: { id: string } | null;
}

interface BackendExecution {
  id: string;
  template: BackendTemplate;
  current_step?: BackendStep | null;
  step_responses?: BackendStepResponse[];
  actions?: BackendAction[];
  started_at?: string | null;
  updated_at?: string | null;
  completed_at?: string | null;
}

const ChecklistRunner: React.FC = () => {
  const { executionId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<TemplateDefinition | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<number>(Date.now());
  const [initialExec, setInitialExec] = useState<ExecutionRecord | undefined>(undefined);

  useEffect(() => {
    const loadExecution = async () => {
      if (!executionId) return;
      try {
        setLoading(true);
        const data = await api.getChecklistExecution(executionId) as BackendExecution;
        const t = data.template as BackendTemplate;
        const stepsSource = Array.isArray(t.steps) ? t.steps : [];
        const steps: StepDefinition[] = stepsSource
          .sort((a, b) => ((a.order ?? 0) - (b.order ?? 0)))
          .map((s) => {
            let measurements: StepDefinition["measurements"] | undefined;
            const hasMeas = !!s.measurement_type;
            if (hasMeas) {
              let thresholdType: "min" | "max" | "range" | undefined;
              const min = s.min_value ?? undefined;
              const max = s.max_value ?? undefined;
              if (min != null && max != null) thresholdType = "range";
              else if (min != null) thresholdType = "min";
              else if (max != null) thresholdType = "max";
              measurements = [
                {
                  label: s.measurement_type || "",
                  unit: s.measurement_unit || undefined,
                  min,
                  max,
                  thresholdType,
                },
              ];
            }
            const def: StepDefinition = {
              id: s.id,
              title: s.title,
              instruction: s.description ?? undefined,
              requiresPhoto: !!s.requires_photo,
              requiresSignature: !!s.requires_signature,
              measurements,
              estimatedSeconds: undefined,
            };
            return def;
          });

        const nextTemplate: TemplateDefinition = {
          id: t.id,
          name: t.name,
          description: t.description ?? undefined,
          steps,
          category: t.template_type || undefined,
        };
        setTemplate(nextTemplate);

        // Build initial execution record to pre-populate responses/evidence
        try {
          const currentStepId = (data.current_step?.id as string | undefined) || undefined;
          const currentIndex = currentStepId ? Math.max(0, steps.findIndex(s => String(s.id) === String(currentStepId))) : 0;

          const stepResponses: StepResponse[] = (Array.isArray(data.step_responses) ? data.step_responses as BackendStepResponse[] : []).map((sr) => {
            const stepId: string = String(sr.step?.id || "");
            let response: ResponseOption | undefined = undefined;
            if (sr.boolean_response === true) response = 'YES';
            else if (sr.boolean_response === false) response = 'NO';
            else if (String(sr.status) === 'SKIPPED') response = 'NA';

            const measurements: MeasurementField[] | undefined = sr.measurement_value != null ? [{
              label: sr.step?.measurement_type || '',
              unit: sr.step?.measurement_unit || undefined,
              value: typeof sr.measurement_value === 'number' ? sr.measurement_value : Number(sr.measurement_value),
              min: sr.step?.min_value ?? undefined,
              max: sr.step?.max_value ?? undefined,
            }] : undefined;

            const evidenceItems: EvidenceAttachment[] = [];
            const evList: BackendEvidence[] = Array.isArray(sr.evidence) ? sr.evidence as BackendEvidence[] : [];
            evList.forEach((ev: BackendEvidence) => {
              const type = String(ev.evidence_type || '').toUpperCase();
              if (type === 'PHOTO') {
                evidenceItems.push({ id: String(ev.id || crypto.randomUUID()), type: 'photo', url: ev.file_path || ev.thumbnail_path || undefined, createdAt: ev.captured_at || new Date().toISOString(), metadata: ev.metadata || {} });
              } else if (type === 'VIDEO') {
                evidenceItems.push({ id: String(ev.id || crypto.randomUUID()), type: 'video', url: ev.file_path || undefined, createdAt: ev.captured_at || new Date().toISOString(), metadata: ev.metadata || {} });
              } else if (type === 'DOCUMENT') {
                evidenceItems.push({ id: String(ev.id || crypto.randomUUID()), type: 'document', url: ev.file_path || undefined, createdAt: ev.captured_at || new Date().toISOString(), metadata: ev.metadata || {} });
              }
            });
            if (sr.notes) {
              evidenceItems.push({ id: crypto.randomUUID(), type: 'note', note: String(sr.notes), createdAt: new Date().toISOString() });
            }
            if (sr.signature_data) {
              const url = `data:image/png;base64,${sr.signature_data}`;
              evidenceItems.push({ id: crypto.randomUUID(), type: 'signature', url, createdAt: new Date().toISOString() });
            }

            return {
              stepId,
              response,
              respondedAt: sr.completed_at || sr.started_at || undefined,
              evidence: evidenceItems,
              measurements,
            } as StepResponse;
          });

          const initialRecord: ExecutionRecord = {
            templateId: nextTemplate.id,
            startedAt: data.started_at || new Date().toISOString(),
            updatedAt: data.updated_at || new Date().toISOString(),
            completedAt: data.completed_at || undefined,
            currentIndex: currentIndex >= 0 ? currentIndex : 0,
            stepResponses,
            actions: (Array.isArray(data.actions) ? data.actions as BackendAction[] : []).map((a) => ({
              id: String(a.id || crypto.randomUUID()),
              title: a.title || '',
              description: a.description || undefined,
              priority: (a.priority || 'MEDIUM'),
              dueDate: a.due_date || undefined,
              assigneeId: a.assigned_to?.id ? String(a.assigned_to.id) : undefined,
              labels: [],
              visibility: 'team',
            })),
            offline: !navigator.onLine,
          };

          setInitialExec(initialRecord);
        } catch {
          setInitialExec(undefined);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unable to open checklist execution";
        toast.error(msg);
      } finally {
        setLoading(false);
        setLastFetchedAt(Date.now());
      }
    };
    loadExecution();
  }, [executionId]);

  // Live refresh to reflect template changes in real-time
  useEffect(() => {
    if (!executionId) return;
    const interval = setInterval(async () => {
      try {
        const execution = await api.getChecklistExecution(String(executionId));
        const t = execution?.template as BackendTemplate | undefined;
        if (!t) return;
        const stepsSource: BackendStep[] = Array.isArray(t.steps) ? (t.steps as BackendStep[]) : [];
        const steps: StepDefinition[] = stepsSource
          .sort((a, b) => ((a.order ?? 0) - (b.order ?? 0)))
          .map((s, idx) => {
            let measurements: StepDefinition["measurements"] | undefined;
            if (s.measurement_type) {
              let thresholdType: "min" | "max" | "range" | undefined;
              const min = s.min_value ?? undefined;
              const max = s.max_value ?? undefined;
              if (min != null && max != null) thresholdType = "range";
              else if (min != null) thresholdType = "min";
              else if (max != null) thresholdType = "max";
              measurements = [
                {
                  label: s.measurement_type || "",
                  unit: s.measurement_unit || undefined,
                  min,
                  max,
                  thresholdType,
                },
              ];
            }
            return {
              id: String(s.id || idx + 1),
              title: s.title || `Step ${idx + 1}`,
              instruction: s.description ?? undefined,
              requiresPhoto: !!s.requires_photo,
              requiresSignature: !!s.requires_signature,
              measurements,
              estimatedSeconds: undefined,
            };
          });
        const nextTemplate: TemplateDefinition = {
          id: t.id,
          name: t.name,
          description: t.description ?? undefined,
          steps,
          category: t.template_type || undefined,
        };
        // Update only if structure changed to avoid unnecessary re-renders
        const currentStepCount = template?.steps?.length || 0;
        if (!template || currentStepCount !== steps.length) {
          setTemplate(nextTemplate);
          setLastFetchedAt(Date.now());
        }
      } catch (err) {
        // Ignore refresh errors silently
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [executionId, template]);

  const queryClient = useQueryClient();
  const onSubmit = async (record: ExecutionRecord) => {
    if (!executionId || !template) return;
    try {
      await api.logChecklistSubmissionAttempt(String(executionId), { status: 'STARTED', message: 'User submitting checklist' });
      const step_responses = record.stepResponses.map((sr) => ({
        step_id: sr.stepId,
        response: sr.response || undefined,
        status: sr.response ? "COMPLETED" : "PENDING",
        responded_at: sr.respondedAt || undefined,
        notes: (sr.evidence || []).find((e) => e.type === "note")?.note || undefined,
        measurement_value: sr.measurements && sr.measurements[0] ? sr.measurements[0].value : undefined,
        measurements: (sr.measurements || []).map(m => ({ label: m.label, unit: m.unit, value: m.value, min: m.min, max: m.max })),
        evidence: (sr.evidence || []).map(ev => ({ type: ev.type, url: ev.url, note: ev.note })),
        attachments: (sr.evidence || []).map(ev => ({ type: ev.type, url: ev.url, note: ev.note })),
      }));

      // Sync, start, and conditionally complete via API helpers
      const token = localStorage.getItem("access_token");
      const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || "http://localhost:8000/api";

      const syncRes = await fetch(`${API_BASE}/checklists/executions/${executionId}/sync/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ execution_id: executionId, step_responses }),
      });
      if (!syncRes.ok) {
        type ApiError = { detail?: string; error?: string; message?: string };
        const err: ApiError | null = await syncRes.json().catch(() => null);
        const msg = err?.detail || err?.error || err?.message || "Sync failed";
        throw new Error(msg);
      }
      logInfo({ feature: 'checklist-runner', action: 'sync' }, 'Sync OK');

      const total = template.steps.length;
      const completed = record.stepResponses.filter((r) => !!r.response).length;

      await api.startChecklistExecution(executionId);
      logInfo({ feature: 'checklist-runner', action: 'start' }, 'Start OK');

      if (completed >= total) {
        await api.completeChecklistExecution(executionId, "Submitted via My Checklists runner");
        logInfo({ feature: 'checklist-runner', action: 'complete' }, 'Complete OK');
        await api.notifyChecklistSubmission(String(executionId), { title: 'Checklist Submitted', message: 'A checklist was submitted' });
        await api.logChecklistSubmissionAttempt(String(executionId), { status: 'COMPLETED', message: 'Checklist submission complete' });
        logInfo({ feature: 'checklist-runner', action: 'submit' }, 'Checklist completed');
        queryClient.invalidateQueries({ queryKey: ["manager-submitted-checklists"] });
      }

      toast.success("Checklist submitted");
      navigate("/staff-dashboard/my-checklists");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Submission failed";
      logError({ feature: 'checklist-runner', action: 'submit' }, e, { executionId });
      try { await api.logChecklistSubmissionAttempt(String(executionId!), { status: 'FAILED', message: msg }); } catch {/* ignore */ }
      toast.error(msg);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading checklist…</CardTitle>
          </CardHeader>
          <CardContent>Preparing your checklist.</CardContent>
        </Card>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Checklist unavailable</CardTitle>
          </CardHeader>
          <CardContent>
            This checklist execution could not be loaded.
            <div className="mt-4">
              <Button onClick={() => navigate(-1)}>Go Back</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <ChecklistExecutor template={template} initialExecution={initialExec} onSubmit={onSubmit} />
    </div>
  );
};

export default ChecklistRunner;