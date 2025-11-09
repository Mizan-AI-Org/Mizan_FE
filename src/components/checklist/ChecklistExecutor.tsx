import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, Check, Circle, CircleOff, FileText, PenTool, Plus, Save, X } from 'lucide-react';
import type { TemplateDefinition, StepDefinition, ExecutionRecord, StepResponse, ResponseOption, EvidenceAttachment, PriorityLevel, ActionItem } from '@/types/checklist';

type Props = {
  template: TemplateDefinition;
  initialExecution?: ExecutionRecord;
  onSubmit?: (record: ExecutionRecord) => Promise<void> | void;
};

const storageKey = (templateId: string) => `checklist-exec:${templateId}`;

// Basic signature pad using canvas
const SignaturePad: React.FC<{ onSave: (dataUrl: string) => void } & React.HTMLAttributes<HTMLDivElement>> = ({ onSave, ...rest }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#111827';
    }
  }, []);

  const getPos = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleDown = (e: React.MouseEvent) => {
    setDrawing(true);
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleMove = (e: React.MouseEvent) => {
    if (!drawing) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleUp = () => setDrawing(false);

  return (
    <div {...rest} className={`space-y-2 ${rest.className || ''}`}>
      <div className="border rounded-md overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          onMouseDown={handleDown}
          onMouseMove={handleMove}
          onMouseUp={handleUp}
          onMouseLeave={handleUp}
        />
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => {
          const ctx = canvasRef.current!.getContext('2d')!;
          ctx.clearRect(0, 0, 600, 200);
        }}>Clear</Button>
        <Button onClick={() => onSave(canvasRef.current!.toDataURL('image/png'))}>
          <PenTool className="h-4 w-4 mr-2" /> Save Signature
        </Button>
      </div>
    </div>
  );
};

const EvidencePanel: React.FC<{
  step: StepDefinition;
  evidence: EvidenceAttachment[];
  onAddEvidence: (e: EvidenceAttachment) => void;
}> = ({ step, evidence, onAddEvidence }) => {
  const [note, setNote] = useState('');
  const [showSignature, setShowSignature] = useState(false);

  const addNote = () => {
    if (!note.trim()) return;
    onAddEvidence({ id: crypto.randomUUID(), type: 'note', note, createdAt: new Date().toISOString() });
    setNote('');
  };

  const handleFile = (ev: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'video') => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onAddEvidence({ id: crypto.randomUUID(), type, url, createdAt: new Date().toISOString(), metadata: { name: file.name, size: file.size } });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Add Note</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Details, observations, or context" />
          <Button variant="secondary" onClick={addNote}>
            <FileText className="h-4 w-4 mr-2" /> Save with Timestamp
          </Button>
        </div>
        <div className="space-y-2">
          <Label>Attach Photo</Label>
          <Input type="file" accept="image/*" capture="environment" onChange={(e) => handleFile(e, 'photo')} />
          {step.requiresPhoto && (
            <Badge variant="destructive" className="w-fit">Photo required</Badge>
          )}
        </div>
        <div className="space-y-2">
          <Label>Attach Video</Label>
          <Input type="file" accept="video/*" capture="environment" onChange={(e) => handleFile(e, 'video')} />
          {step.requiresVideo && (
            <Badge variant="destructive" className="w-fit">Video required</Badge>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Digital Signature</Label>
          <Button variant="ghost" size="sm" onClick={() => setShowSignature((s) => !s)}>
            {showSignature ? <X className="h-4 w-4 mr-2" /> : <PenTool className="h-4 w-4 mr-2" />} {showSignature ? 'Hide' : 'Add Signature'}
          </Button>
        </div>
        {showSignature && (
          <SignaturePad onSave={(dataUrl) => onAddEvidence({ id: crypto.randomUUID(), type: 'signature', url: dataUrl, createdAt: new Date().toISOString() })} />
        )}
      </div>

      {evidence.length > 0 && (
        <div className="space-y-2">
          <Label>Evidence</Label>
          <div className="grid grid-cols-3 gap-2">
            {evidence.map((ev) => (
              <div key={ev.id} className="border rounded-md p-2 text-xs">
                <div className="font-medium capitalize">{ev.type}</div>
                {ev.url ? (
                  ev.type === 'photo' ? <img src={ev.url} alt="Photo evidence" className="w-full h-20 object-cover" /> : (
                    <video src={ev.url} className="w-full h-20" controls title="Video evidence" />
                  )
                ) : (
                  <div className="text-muted-foreground">{ev.note}</div>
                )}
                <div className="mt-1 text-muted-foreground">{new Date(ev.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ActionModal: React.FC<{
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (action: ActionItem) => void;
}> = ({ open, onOpenChange, onCreate }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [labels, setLabels] = useState<string>('');
  const [visibility, setVisibility] = useState<'private' | 'team' | 'org'>('team');

  const submit = () => {
    if (!title.trim()) return;
    onCreate({
      id: crypto.randomUUID(),
      title,
      description,
      priority,
      dueDate: dueDate || undefined,
      assigneeId: assigneeId || undefined,
      locationId: locationId || undefined,
      labels: labels ? labels.split(',').map(s => s.trim()).filter(Boolean) : [],
      visibility,
    });
    onOpenChange(false);
    setTitle(''); setDescription(''); setDueDate(''); setAssigneeId(''); setLocationId(''); setLabels(''); setPriority('MEDIUM'); setVisibility('team');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Follow-up Action</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Priority</Label>
              <select className="border rounded-md h-9 px-2 w-full" value={priority} onChange={e => setPriority(e.target.value as PriorityLevel)}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Assignee</Label>
              <Input placeholder="Staff ID or picklist" value={assigneeId} onChange={e => setAssigneeId(e.target.value)} />
            </div>
            <div>
              <Label>Location/Site</Label>
              <Input placeholder="Site ID" value={locationId} onChange={e => setLocationId(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Labels/Tags (comma separated)</Label>
            <Input value={labels} onChange={e => setLabels(e.target.value)} />
          </div>
          <div>
            <Label>Visibility</Label>
            <select className="border rounded-md h-9 px-2 w-full" value={visibility} onChange={e => setVisibility(e.target.value as 'private' | 'team' | 'org')}>
              <option value="private">Private</option>
              <option value="team">Team</option>
              <option value="org">Organization</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit}><Plus className="h-4 w-4 mr-2" /> Create Action</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const responseIcon = (r?: ResponseOption) => {
  switch (r) {
    case 'YES': return <Check className="h-4 w-4" />;
    case 'NO': return <X className="h-4 w-4" />;
    case 'NA': return <CircleOff className="h-4 w-4" />;
    default: return <Circle className="h-4 w-4" />;
  }
};

const ChecklistExecutor: React.FC<Props> = ({ template, initialExecution, onSubmit }) => {
  const [record, setRecord] = useState<ExecutionRecord>(initialExecution ?? (() => {
    const raw = localStorage.getItem(storageKey(template.id));
    return raw ? JSON.parse(raw) : {
      templateId: template.id,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentIndex: 0,
      stepResponses: [],
      actions: [],
      offline: !navigator.onLine,
    } as ExecutionRecord;
  }));

  const [actionOpen, setActionOpen] = useState(false);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const currentStep = template.steps[record.currentIndex];

  const progressPct = useMemo(() => {
    const completed = record.stepResponses.filter(r => !!r.response).length;
    const total = template.steps.length;
    return Math.round((completed / total) * 100);
  }, [record.stepResponses, template.steps.length]);

  // Autosave
  useEffect(() => {
    const payload = { ...record, updatedAt: new Date().toISOString() };
    localStorage.setItem(storageKey(template.id), JSON.stringify(payload));
  }, [record, template.id]);

  useEffect(() => {
    const updateOnline = () => setRecord(r => ({ ...r, offline: !navigator.onLine }));
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => { window.removeEventListener('online', updateOnline); window.removeEventListener('offline', updateOnline); };
  }, []);

  // Keyboard navigation & shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); nextStep(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prevStep(); }
      else if (e.key.toLowerCase() === 'y' || e.key === '1') { e.preventDefault(); setResponse('YES'); }
      else if (e.key.toLowerCase() === 'n' || e.key === '2') { e.preventDefault(); setResponse('NO'); }
      else if (e.key.toLowerCase() === 'a' || e.key === '3') { e.preventDefault(); setResponse('NA'); }
      else if (e.key === 'Enter') { e.preventDefault(); nextStep(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [record.currentIndex, currentStep?.id]);

  const setResponse = (resp: ResponseOption) => {
    setRecord(r => {
      const existing = r.stepResponses.find(sr => sr.stepId === currentStep.id);
      const now = new Date().toISOString();
      if (existing) {
        existing.response = resp; existing.respondedAt = now;
        return { ...r, stepResponses: [...r.stepResponses] };
      }
      const sr: StepResponse = { stepId: currentStep.id, response: resp, respondedAt: now, evidence: [], measurements: currentStep.measurements?.map(m => ({ ...m })) };
      return { ...r, stepResponses: [...r.stepResponses, sr] };
    });
  };

  const addEvidence = (ev: EvidenceAttachment) => {
    setRecord(r => {
      const resp = r.stepResponses.find(sr => sr.stepId === currentStep.id) || { stepId: currentStep.id, evidence: [], measurements: currentStep.measurements?.map(m => ({ ...m })) } as StepResponse;
      if (!r.stepResponses.find(sr => sr.stepId === currentStep.id)) r.stepResponses.push(resp);
      resp.evidence.push(ev);
      return { ...r, stepResponses: [...r.stepResponses] };
    });
  };

  const nextStep = () => {
    // Require a response before moving forward
    const currentResp = record.stepResponses.find(sr => sr.stepId === currentStep.id)?.response;
    if (!currentResp) {
      setValidationMsg('Please select YES/NO/NA before proceeding.');
      return;
    }
    setValidationMsg(null);
    // Conditional navigation
    const cs = currentStep.conditional?.find(c => record.stepResponses.find(sr => sr.stepId === currentStep.id)?.response === c.when);
    if (cs) {
      const idx = template.steps.findIndex(s => s.id === cs.goToStepId);
      if (idx >= 0) { setRecord(r => ({ ...r, currentIndex: idx })); return; }
    }
    setRecord(r => ({ ...r, currentIndex: Math.min(r.currentIndex + 1, template.steps.length - 1) }));
  };

  const prevStep = () => setRecord(r => ({ ...r, currentIndex: Math.max(0, r.currentIndex - 1) }));

  const handleSubmit = async () => {
    const completed = record.stepResponses.length >= template.steps.length;
    const final = { ...record, completedAt: new Date().toISOString() };
    setRecord(final);
    if (onSubmit) await onSubmit(final);
  };

  const createAction = (action: ActionItem) => {
    setRecord(r => ({ ...r, actions: [...r.actions, action] }));
  };

  return (
    <Card className="max-w-xl mx-auto shadow-soft">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base sm:text-lg">{template.name}</CardTitle>
            <CardDescription className="text-xs">Quick, mobile-first checklist executor</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={record.offline ? 'destructive' : 'secondary'}>{record.offline ? 'Offline' : 'Online'}</Badge>
            <Button variant="outline" size="sm" onClick={handleSubmit}><Save className="h-4 w-4 mr-2" /> Submit</Button>
          </div>
        </div>
        <div className="mt-3">
          <Progress value={progressPct} />
          <div className="text-xs text-muted-foreground mt-1" aria-live="polite">{progressPct}% complete</div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step Card */}
        <div className="border rounded-md p-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-medium">Step {record.currentIndex + 1} of {template.steps.length}</div>
              <div className="text-base font-semibold">{currentStep.title}</div>
              {currentStep.instruction && (
                <p className="text-sm text-muted-foreground mt-1">{currentStep.instruction}</p>
              )}
            </div>
            <Badge variant="outline" className="text-xs">{currentStep.estimatedSeconds ? `${Math.round(currentStep.estimatedSeconds/60)}m` : '—'}</Badge>
          </div>

          {validationMsg && (
            <Alert className="mt-3">
              <AlertDescription>{validationMsg}</AlertDescription>
            </Alert>
          )}

          {/* Response Toggle */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            {(['YES','NO','NA'] as ResponseOption[]).map((opt) => {
              const selected = record.stepResponses.find(sr => sr.stepId === currentStep.id)?.response === opt;
              return (
                <Button key={opt} variant={selected ? 'default' : 'secondary'} className="w-full" onClick={() => setResponse(opt)}>
                  {responseIcon(opt)}
                  <span className="ml-2">{opt}</span>
                </Button>
              );
            })}
          </div>

          {/* Evidence Panel */}
          <div className="mt-4">
            <Tabs defaultValue="evidence">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="evidence">Evidence</TabsTrigger>
                <TabsTrigger value="measurements">Measurements</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
              </TabsList>
              <TabsContent value="evidence" className="mt-3">
                <EvidencePanel step={currentStep} evidence={record.stepResponses.find(sr => sr.stepId === currentStep.id)?.evidence || []} onAddEvidence={addEvidence} />
              </TabsContent>
              <TabsContent value="measurements" className="mt-3">
                {currentStep.measurements?.length ? (
                  <div className="space-y-3">
                    {currentStep.measurements.map((m, idx) => (
                      <div key={idx} className="grid grid-cols-3 gap-2 items-end">
                        <div>
                          <Label>{m.label}</Label>
                          <Input type="number" step="0.1" onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setRecord(r => {
                              const resp = r.stepResponses.find(sr => sr.stepId === currentStep.id) || { stepId: currentStep.id, evidence: [], measurements: currentStep.measurements?.map(mm => ({ ...mm })) } as StepResponse;
                              if (!r.stepResponses.find(sr => sr.stepId === currentStep.id)) r.stepResponses.push(resp);
                              const target = (resp.measurements || []).find(mm => mm.label === m.label);
                              if (target) target.value = v; else (resp.measurements || []).push({ ...m, value: v });
                              return { ...r, stepResponses: [...r.stepResponses] };
                            });
                          }} />
                        </div>
                        <div>
                          <Label>Unit</Label>
                          <Input value={m.unit || ''} readOnly />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {m.thresholdType === 'range' && m.min !== undefined && m.max !== undefined && (
                            <span>Threshold: {m.min}–{m.max} {m.unit || ''}</span>
                          )}
                          {m.thresholdType === 'min' && m.min !== undefined && (
                            <span>Min: ≥ {m.min} {m.unit || ''}</span>
                          )}
                          {m.thresholdType === 'max' && m.max !== undefined && (
                            <span>Max: ≤ {m.max} {m.unit || ''}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <AlertDescription>No measurements for this step.</AlertDescription>
                  </Alert>
                )}
              </TabsContent>
              <TabsContent value="actions" className="mt-3">
                <Button onClick={() => setActionOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Create Follow-up Action
                </Button>
                {record.actions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {record.actions.map((a) => (
                      <div key={a.id} className="border rounded-md p-2 text-sm flex items-center justify-between">
                        <div>
                          <div className="font-medium">{a.title}</div>
                          <div className="text-xs text-muted-foreground">{a.description}</div>
                        </div>
                        <Badge variant="outline" className="text-xs">{a.priority}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-4">
            <Button variant="secondary" onClick={prevStep}>Previous</Button>
            <div className="text-xs text-muted-foreground">Save happens automatically</div>
            <Button onClick={nextStep}>Next</Button>
          </div>
        </div>

        <ActionModal open={actionOpen} onOpenChange={setActionOpen} onCreate={createAction} />
      </CardContent>
    </Card>
  );
};

export default ChecklistExecutor;