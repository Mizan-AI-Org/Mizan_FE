import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ChecklistExecutor from "@/components/checklist/ChecklistExecutor";
import type { TemplateDefinition, StepDefinition, ExecutionRecord } from "@/types/checklist";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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

const ChecklistRunner: React.FC = () => {
  const { executionId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<TemplateDefinition | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<number>(Date.now());

  useEffect(() => {
    const loadExecution = async () => {
      if (!executionId) return;
      try {
        setLoading(true);
        const data = await api.getChecklistExecution(executionId);
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

        setTemplate({
          id: t.id,
          name: t.name,
          description: t.description ?? undefined,
          steps,
          category: t.template_type || undefined,
        });
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

  const onSubmit = async (record: ExecutionRecord) => {
    if (!executionId || !template) return;
    try {
      const step_responses = record.stepResponses.map((sr) => ({
        step_id: sr.stepId,
        status: sr.response ? "COMPLETED" : "PENDING",
        notes: (sr.evidence || []).find((e) => e.type === "note")?.note || undefined,
        measurement_value: sr.measurements && sr.measurements[0] ? sr.measurements[0].value : undefined,
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
      if (!syncRes.ok) throw new Error("Sync failed");

      const total = template.steps.length;
      const completed = record.stepResponses.filter((r) => !!r.response).length;

      await api.startChecklistExecution(executionId);

      if (completed >= total) {
        await api.completeChecklistExecution(executionId, "Submitted via My Checklists runner");
      }

      toast.success("Checklist submitted");
      navigate("/staff-dashboard/my-checklists");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Submission failed";
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
      <ChecklistExecutor template={template} onSubmit={onSubmit} />
    </div>
  );
};

export default ChecklistRunner;