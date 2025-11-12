import React, { useCallback, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import type { TemplateDefinition, StepDefinition, EvidenceAttachment } from "@/types/checklist";
import { CheckCircle, Circle, FileText, Paperclip, Plus, Save, PenTool, X } from "lucide-react";

type GroupedProcess = {
  name: string;
  steps: StepDefinition[];
};

// Simple signature pad; adapted from ChecklistExecutor for reuse
const SignaturePad: React.FC<{
  onSave: (dataUrl: string) => void;
} & React.HTMLAttributes<HTMLDivElement>> = ({ onSave, ...rest }) => {
  const [drawing, setDrawing] = useState(false);
  const [sigUrl, setSigUrl] = useState<string | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    setDrawing(true);
    draw(e);
  };
  const end = () => {
    setDrawing(false);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const rect = canvas.getBoundingClientRect();

    const getPoint = (ev: React.MouseEvent | React.TouchEvent) => {
      if ('touches' in ev && ev.touches && ev.touches[0]) {
        const x = ev.touches[0].clientX - rect.left;
        const y = ev.touches[0].clientY - rect.top;
        return { x, y };
      }
      const m = ev as React.MouseEvent;
      return { x: m.clientX - rect.left, y: m.clientY - rect.top };
    };

    const { x, y } = getPoint(e);
    if (!drawing) return;
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(x, y, 1.6, 0, 2 * Math.PI);
    ctx.fill();
  };

  const clear = () => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    setSigUrl(null);
  };

  const save = () => {
    const c = canvasRef.current; if (!c) return;
    const url = c.toDataURL('image/png');
    setSigUrl(url);
    onSave(url);
  };

  return (
    <div {...rest} className="space-y-2">
      <canvas
        ref={canvasRef}
        width={600}
        height={150}
        className="border rounded-md w-full touch-none"
        onMouseDown={start}
        onMouseUp={end}
        onMouseMove={draw}
        onTouchStart={start}
        onTouchEnd={end}
        onTouchMove={draw}
      />
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={clear}><X className="h-4 w-4 mr-2" /> Clear</Button>
        <Button size="sm" onClick={save}><PenTool className="h-4 w-4 mr-2" /> Save</Button>
        {sigUrl && <Badge className="text-xs">Signed</Badge>}
      </div>
    </div>
  );
};

export interface ChecklistTreeProps {
  executionId: string;
  template: TemplateDefinition;
  assigneeName?: string;
}

function groupSteps(template: TemplateDefinition): GroupedProcess[] {
  const groups = new Map<string, StepDefinition[]>();
  const toKey = (title: string) => {
    const t = title || "";
    if (t.includes(" - ")) return t.split(" - ")[0].trim();
    if (t.includes(":")) return t.split(":")[0].trim();
    return "General";
  };
  template.steps.forEach((s) => {
    const key = toKey(s.title);
    const arr = groups.get(key) || [];
    arr.push(s);
    groups.set(key, arr);
  });
  return Array.from(groups.entries()).map(([name, steps]) => ({ name, steps }));
}

type LocalStepState = {
  response?: 'YES' | 'NO' | 'NA';
  notes?: string;
  evidence?: EvidenceAttachment[];
};

const ChecklistTree: React.FC<ChecklistTreeProps> = ({ executionId, template, assigneeName }) => {
  const [stepStates, setStepStates] = useState<Record<string, LocalStepState>>({});
  const [recommendations, setRecommendations] = useState<string>("");
  const [showSignature, setShowSignature] = useState(false);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const processes = useMemo(() => groupSteps(template), [template]);

  const totalSteps = template.steps.length;
  const completed = useMemo(() => Object.values(stepStates).filter(s => s.response === 'YES' || s.response === 'NA').length, [stepStates]);
  const progressPct = totalSteps > 0 ? Math.round((completed / totalSteps) * 100) : 0;

  const toggleResponse = (stepId: string, resp: 'YES' | 'NO' | 'NA') => {
    setStepStates(prev => ({ ...prev, [stepId]: { ...(prev[stepId] || {}), response: prev[stepId]?.response === resp ? undefined : resp } }));
  };

  const addEvidence = (stepId: string, ev: EvidenceAttachment) => {
    setStepStates(prev => {
      const current = prev[stepId] || {};
      const next: LocalStepState = { ...current, evidence: [...(current.evidence || []), ev] };
      return { ...prev, [stepId]: next };
    });
  };

  const syncAndSubmit = useCallback(async () => {
    setSubmitting(true);
    setValidationMsg(null);
    try {
      const token = localStorage.getItem('access_token') || '';
      const step_responses = template.steps.map((s) => {
        const st = stepStates[s.id];
        return {
          step_id: s.id,
          status: st?.response === 'YES' || st?.response === 'NA' ? 'COMPLETED' : 'PENDING',
          notes: st?.notes,
          measurement_value: undefined,
        };
      });

      const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:8000/api';
      const syncRes = await fetch(`${API_BASE}/checklists/executions/${executionId}/sync/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ execution_id: executionId, step_responses }),
      });
      if (!syncRes.ok) throw new Error('Sync failed');

      await api.startChecklistExecution(executionId);

      const allDone = step_responses.every(r => r.status === 'COMPLETED');
      if (!allDone) {
        setValidationMsg('Please complete all required tasks before submitting.');
        setSubmitting(false);
        return;
      }

      await api.completeChecklistExecution(executionId, recommendations || undefined);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Submission failed';
      setValidationMsg(msg);
    } finally {
      setSubmitting(false);
    }
  }, [executionId, template.steps, stepStates, recommendations]);

  return (
    <Card className="max-w-3xl mx-auto shadow-soft">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base sm:text-lg">{template.name}</CardTitle>
            <CardDescription className="text-xs">Assigned to {assigneeName || 'you'}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={progressPct >= 100 ? 'default' : 'secondary'}>{completed}/{totalSteps}</Badge>
            <Button variant="outline" size="sm" onClick={syncAndSubmit} disabled={submitting}><Save className="h-4 w-4 mr-2" /> Complete inspection</Button>
          </div>
        </div>
        <div className="mt-3">
          <Progress value={progressPct} />
          <div className="text-xs text-muted-foreground mt-1" aria-live="polite">{progressPct}% complete</div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Accordion type="multiple" className="w-full">
          {processes.map((p, idx) => (
            <AccordionItem key={p.name + idx} value={`${idx}`}>
              <AccordionTrigger className="text-sm font-semibold">{p.name}</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {p.steps.map((s) => {
                    const st = stepStates[s.id] || {};
                    const yes = st.response === 'YES';
                    const no = st.response === 'NO';
                    const na = st.response === 'NA';
                    return (
                      <div key={s.id} className="border rounded-md p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Checkbox checked={yes || na} onCheckedChange={() => toggleResponse(s.id, yes ? 'NO' : 'YES')} aria-label={`Complete ${s.title}`} />
                            <div>
                              <div className="text-sm font-medium">{s.title}</div>
                              {s.instruction && <div className="text-xs text-muted-foreground">{s.instruction}</div>}
                            </div>
                          </div>
                          <Badge variant={yes ? 'default' : no ? 'destructive' : 'outline'} className="text-xs flex items-center gap-1">
                            {yes ? <CheckCircle className="h-3 w-3" /> : <Circle className="h-3 w-3" />} {yes ? 'Done' : no ? 'Failed' : 'Pending'}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="justify-start"
                            onClick={() => {
                              const note = window.prompt('Add note');
                              if (!note) return;
                              addEvidence(s.id, { id: crypto.randomUUID(), type: 'note', note, createdAt: new Date().toISOString() });
                            }}
                          >
                            <FileText className="h-4 w-4 mr-2" /> Add note
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="justify-start"
                            onClick={() => {
                              // Simplified attachment prompt; real file upload is in runner
                              addEvidence(s.id, { id: crypto.randomUUID(), type: 'photo', url: 'local://photo', createdAt: new Date().toISOString() });
                            }}
                          >
                            <Paperclip className="h-4 w-4 mr-2" /> Attach media
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="justify-start"
                            onClick={() => {
                              const title = window.prompt('Create action title');
                              if (!title) return;
                              addEvidence(s.id, { id: crypto.randomUUID(), type: 'note', note: `Action created: ${title}`, createdAt: new Date().toISOString() });
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" /> Create action
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Completion Section */}
        <div className="border rounded-md">
          <div className="bg-primary/10 px-3 py-2 rounded-t-md font-medium">Completion</div>
          <div className="p-3 space-y-3">
            <div>
              <Label>Recommendations</Label>
              <Textarea value={recommendations} onChange={(e) => setRecommendations(e.target.value)} placeholder="Write recommendations or observations" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label>Inspector's Full Name and Signature</Label>
                <Button variant="outline" size="sm" onClick={() => setShowSignature((s) => !s)}><PenTool className="h-4 w-4 mr-2" /> {showSignature ? 'Hide' : 'Add signature'}</Button>
              </div>
              {showSignature && <SignaturePad onSave={(url) => {
                const first = template.steps[0];
                if (first) addEvidence(first.id, { id: crypto.randomUUID(), type: 'signature', url, createdAt: new Date().toISOString() });
              }} />}
            </div>
            {validationMsg && (
              <Alert>
                <AlertDescription>{validationMsg}</AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChecklistTree;