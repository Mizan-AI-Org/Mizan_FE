import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ChecklistExecutor from '@/components/checklist/ChecklistExecutor';
import type { TemplateDefinition, StepDefinition, ExecutionRecord } from '@/types/checklist';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:8000/api';

const TaskChecklistRunner: React.FC = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [template, setTemplate] = useState<TemplateDefinition | null>(null);

  useEffect(() => {
    const ensureExecution = async () => {
      if (!taskId) return;
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${API_BASE}/checklists/executions/ensure_for_task/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ task_id: taskId })
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Failed to ensure checklist' }));
          throw new Error(err.error || 'Failed to ensure checklist');
        }

        const data = await res.json();
        setExecutionId(data.id);
        // Map backend template to ChecklistExecutor TemplateDefinition
        const t = data.template;
        const steps: StepDefinition[] = (t.steps || []).sort((a: any, b: any) => (a.order || 0) - (b.order || 0)).map((s: any) => {
          // Build measurement structure if present
          let measurements: StepDefinition['measurements'] | undefined;
          const hasMeas = !!s.measurement_type;
          if (hasMeas) {
            let thresholdType: 'min' | 'max' | 'range' | undefined;
            if (s.min_value != null && s.max_value != null) thresholdType = 'range';
            else if (s.min_value != null) thresholdType = 'min';
            else if (s.max_value != null) thresholdType = 'max';
            measurements = [{
              label: s.measurement_type,
              unit: s.measurement_unit || undefined,
              min: s.min_value ?? undefined,
              max: s.max_value ?? undefined,
              thresholdType,
            }];
          }
          return {
            id: s.id,
            title: s.title,
            instruction: s.description || undefined,
            requiresPhoto: !!s.requires_photo,
            requiresSignature: !!s.requires_signature,
            measurements,
            estimatedSeconds: undefined,
          } as StepDefinition;
        });

        setTemplate({
          id: t.id,
          name: t.name,
          description: t.description,
          steps,
          category: t.template_type || undefined,
        });
      } catch (e: any) {
        toast.error(e.message || 'Unable to open checklist for this task');
      } finally {
        setLoading(false);
      }
    };

    ensureExecution();
  }, [taskId]);

  const onSubmit = async (record: ExecutionRecord) => {
    if (!executionId || !template) return;
    try {
      const token = localStorage.getItem('access_token');

      // Build minimal sync payload
      const step_responses = record.stepResponses.map(sr => ({
        step_id: sr.stepId,
        status: sr.response ? 'COMPLETED' : 'PENDING',
        notes: (sr.evidence || []).find(e => e.type === 'note')?.note || undefined,
        measurement_value: sr.measurements && sr.measurements[0] ? sr.measurements[0].value : undefined,
      }));

      const syncRes = await fetch(`${API_BASE}/checklists/executions/${executionId}/sync/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ execution_id: executionId, step_responses })
      });
      if (!syncRes.ok) throw new Error('Sync failed');

      // Determine completion
      const total = template.steps.length;
      const completed = record.stepResponses.filter(r => !!r.response).length;

      // Start if not started and then complete if finished
      const startRes = await fetch(`${API_BASE}/checklists/executions/${executionId}/start/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!startRes.ok && startRes.status !== 400) {
        // 400 might mean already started
        throw new Error('Failed to start checklist');
      }

      if (completed >= total) {
        const completeRes = await fetch(`${API_BASE}/checklists/executions/${executionId}/complete/`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ completion_notes: 'Submitted via staff checklist runner' })
        });
        if (!completeRes.ok) throw new Error('Failed to complete checklist');
      }

      toast.success('Checklist submitted');
      navigate('/staff-dashboard/safety');
    } catch (e: any) {
      toast.error(e.message || 'Submission failed');
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading checklist…</CardTitle>
          </CardHeader>
          <CardContent>Preparing your task checklist.</CardContent>
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
            No checklist template found for this task. Please contact your manager.
            <div className="mt-4"><Button onClick={() => navigate(-1)}>Go Back</Button></div>
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

export default TaskChecklistRunner;