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
import { api } from '@/lib/api';
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
      <div className="border rounded-md overflow-hidden bg-white max-w-sm">
        <canvas
          ref={canvasRef}
          width={320}
          height={120}
          onMouseDown={handleDown}
          onMouseMove={handleMove}
          onMouseUp={handleUp}
          onMouseLeave={handleUp}
        />
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => {
          const ctx = canvasRef.current!.getContext('2d')!;
          ctx.clearRect(0, 0, 320, 120);
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
  locked?: boolean;
}> = ({ step, evidence, onAddEvidence, locked }) => {
  const [note, setNote] = useState('');
  const [showSignature, setShowSignature] = useState(false);

  const addNoteAuto = () => {
    if (!note.trim()) return;
    onAddEvidence({ id: crypto.randomUUID(), type: 'note', note, createdAt: new Date().toISOString() });
    void (async () => { try { await api.notifyEvent({ event_type: 'FIELD_EDITED', severity: 'MEDIUM', message: 'Note added' }); } catch (e) { /* silent fail */ } })();
  };

  const handleFile = (ev: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'video' | 'document') => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (!locked) onAddEvidence({ id: crypto.randomUUID(), type, url, createdAt: new Date().toISOString(), metadata: { name: file.name, size: file.size } });
    void (async () => { try { await api.notifyEvent({ event_type: 'FIELD_EDITED', severity: 'MEDIUM', message: `${type} added` }); } catch (e) { /* silent fail */ } })();
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Add Note</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} onBlur={addNoteAuto} placeholder="Details, observations, or context" disabled={!!locked} />
        </div>
        <div className="space-y-2">
          <Label>Attach Photo</Label>
          <Input type="file" accept="image/*" capture="environment" onChange={(e) => handleFile(e, 'photo')} disabled={!!locked} />
          {step.requiresPhoto && (
            <Badge variant="destructive" className="w-fit">Photo required</Badge>
          )}
        </div>
        <div className="space-y-2">
          <Label>Attach Video</Label>
          <Input type="file" accept="video/*" onChange={(e) => handleFile(e, 'video')} disabled={!!locked} />
        </div>
        <div className="space-y-2">
          <Label>Attach Document</Label>
          <Input type="file" accept="application/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" onChange={(e) => handleFile(e, 'document')} disabled={!!locked} />
        </div>

      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label>Digital Signature</Label>
            {step.requiresSignature && evidence.every(ev => String(ev.type).toLowerCase() !== 'signature') && (
              <Badge variant="destructive" className="w-fit">Signature required</Badge>
            )}
            {evidence.some(ev => String(ev.type).toLowerCase() === 'signature') && (
              <Badge className="w-fit bg-green-100 text-green-700">Signed</Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowSignature((s) => !s)} aria-label="Toggle signature pad" disabled={!!locked}>
            {showSignature ? <X className="h-4 w-4 mr-2" /> : <PenTool className="h-4 w-4 mr-2" />} {showSignature ? 'Hide' : 'Add Signature'}
          </Button>
        </div>
        {showSignature && !locked && (
          <SignaturePad onSave={(dataUrl) => {
            onAddEvidence({ id: crypto.randomUUID(), type: 'signature', url: dataUrl, createdAt: new Date().toISOString() });
            void (async () => { try { await api.notifyEvent({ event_type: 'DOCUMENT_SIGNED', severity: 'HIGH', message: 'Document signed' }); } catch (e) { /* silent fail */ } })();
          }} />
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
                  ev.type === 'photo' ? (
                    <img src={ev.url} alt="Photo evidence" className="w-full h-20 object-cover" />
                  ) : ev.type === 'video' ? (
                    <video src={ev.url} controls className="w-full h-20 object-cover" />
                  ) : ev.type === 'document' ? (
                    <a href={ev.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1"><FileText className="h-3 w-3" /> Open document</a>
                  ) : (
                    <div className="text-muted-foreground">{ev.note}</div>
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

  // Autosave with timestamp + notification
  const [lastAutoNotify, setLastAutoNotify] = useState<number>(0);
  useEffect(() => {
    const payload = { ...record, updatedAt: new Date().toISOString() };
    localStorage.setItem(storageKey(template.id), JSON.stringify(payload));
    const now = Date.now();
    if (now - lastAutoNotify > 15000) {
      setLastAutoNotify(now);
      void (async () => { try { await api.notifyEvent({ event_type: 'AUTO_SAVE', severity: 'LOW', message: 'Checklist autosaved' }); } catch (e) { /* silent fail */ } })();
    }
  }, [record, template.id, lastAutoNotify]);

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
      const sr: StepResponse = { stepId: currentStep.id, response: resp, respondedAt: now, evidence: [] };
      return { ...r, stepResponses: [...r.stepResponses, sr] };
    });
  };

  const addEvidence = (ev: EvidenceAttachment) => {
    setRecord(r => {
      const resp = r.stepResponses.find(sr => sr.stepId === currentStep.id) || { stepId: currentStep.id, evidence: [] } as StepResponse;
      if (!r.stepResponses.find(sr => sr.stepId === currentStep.id)) r.stepResponses.push(resp);
      resp.evidence.push(ev);
      return { ...r, stepResponses: [...r.stepResponses] };
    });
    if (ev.type === 'photo' || ev.type === 'note') {
      void (async () => { try { await api.notifyEvent({ event_type: 'FIELD_EDITED', severity: 'MEDIUM', message: `Evidence added: ${ev.type}` }); } catch (e) { /* silent fail */ } })();
    }
  };

  const isStepRequirementsMet = (step: StepDefinition, stepId: string) => {
    const resp = record.stepResponses.find(sr => sr.stepId === stepId);
    const hasResponse = !!resp?.response;
    const hasPhotoIfRequired = !step.requiresPhoto || (resp?.evidence || []).some(ev => ev.type === 'photo');
    const hasSigIfRequired = !step.requiresSignature || (resp?.evidence || []).some(ev => ev.type === 'signature');
    return hasResponse && hasPhotoIfRequired && hasSigIfRequired;
  };

  const nextStep = () => {
    // Require a response before moving forward
    if (!isStepRequirementsMet(currentStep, currentStep.id)) {
      setValidationMsg('Please complete required response and evidence before proceeding.');
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

  const allStepsSatisfied = useMemo(() => {
    return template.steps.every(s => isStepRequirementsMet(s, s.id));
  }, [template.steps, record.stepResponses]);

  const hasAnySignature = useMemo(() => {
    return record.stepResponses.some(sr => (sr.evidence || []).some(ev => ev.type === 'signature'));
  }, [record.stepResponses]);

  const [locked, setLocked] = useState<boolean>(!!record.completedAt);
  const [quickNote, setQuickNote] = useState('');
  const [showQuickNote, setShowQuickNote] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const completedCount = useMemo(() => {
    return template.steps.filter(s => isStepRequirementsMet(s, s.id)).length;
  }, [template.steps, record.stepResponses]);
  const overallPct = useMemo(() => {
    const total = template.steps.length || 1;
    return Math.round((completedCount / total) * 100);
  }, [completedCount, template.steps.length]);

  useEffect(() => {
    const allDone = template.steps.every(s => isStepRequirementsMet(s, s.id));
    if (allDone || record.completedAt) setLocked(true);
  }, [template.steps, record.stepResponses, record.completedAt]);

  const handleSubmit = async () => {
    if (!allStepsSatisfied || !hasAnySignature) {
      setValidationMsg('All tasks must be completed and signed before submission.');
      return;
    }
    const final = { ...record, completedAt: new Date().toISOString() };
    setRecord(final);
    setLocked(true);
    if (onSubmit) await onSubmit(final);
  };

  const createAction = (action: ActionItem) => {
    setRecord(r => ({ ...r, actions: [...r.actions, action] }));
  };

  return (
    <Card className="max-w-4xl w-full mx-auto shadow-soft">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <CardTitle className="text-lg sm:text-xl">{template.name}</CardTitle>
            <CardDescription className="text-sm">Quick, mobile-first checklist executor</CardDescription>
          </div>
          <Badge variant={record.offline ? 'destructive' : 'secondary'}>{record.offline ? 'Offline' : 'Online'}</Badge>
        </div>
        <div>
          <div className="text-sm font-medium mb-2">Overall Progress</div>
          <Progress value={overallPct} className="h-2" />
          <div className="text-xs text-muted-foreground mt-1.5" aria-live="polite">{completedCount} of {template.steps.length} tasks completed</div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step Card */}
        <div className="border rounded-lg p-4 sm:p-5 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="text-xs font-medium text-muted-foreground mb-1">Step {record.currentIndex + 1} of {template.steps.length}</div>
              <div className="text-lg font-semibold text-gray-900">{currentStep.title}</div>
              {currentStep.instruction && (
                <p className="text-sm text-muted-foreground mt-2">{currentStep.instruction}</p>
              )}
            </div>
            <Badge variant="outline" className="text-xs whitespace-nowrap">{currentStep.estimatedSeconds ? `${Math.round(currentStep.estimatedSeconds / 60)}m` : '—'}</Badge>
          </div>

          {validationMsg && (
            <Alert className="mt-3">
              <AlertDescription>{validationMsg}</AlertDescription>
            </Alert>
          )}

          {/* Response Toggle */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {(['YES', 'NO', 'NA'] as ResponseOption[]).map((opt) => {
              const selected = record.stepResponses.find(sr => sr.stepId === currentStep.id)?.response === opt;
              const base = "w-full h-12 text-base font-semibold rounded-md transition-colors";
              const yesCls = selected ? "bg-green-600 hover:bg-green-700 text-white" : "bg-green-50 text-green-700 hover:bg-green-100";
              const noCls = selected ? "bg-red-600 hover:bg-red-700 text-white" : "bg-red-50 text-red-700 hover:bg-red-100";
              const naCls = selected ? "bg-gray-600 hover:bg-gray-700 text-white" : "bg-gray-100 text-gray-800 hover:bg-gray-200";
              const cls = opt === 'YES' ? yesCls : opt === 'NO' ? noCls : naCls;
              return (
                <Button
                  key={opt}
                  className={`${base} ${cls}`}
                  onClick={() => setResponse(opt)}
                  disabled={locked}
                >
                  {responseIcon(opt)}
                  <span className="ml-2">{opt}</span>
                </Button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mt-4">
            <Button variant="outline" size="default" className="flex-1 h-11" onClick={() => setShowQuickNote(true)} disabled={locked}><FileText className="h-4 w-4 mr-2" /> Add Comment</Button>
            <Button variant="outline" size="default" className="flex-1 h-11" onClick={() => fileRef.current?.click()} disabled={locked}><Camera className="h-4 w-4 mr-2" /> Attach Photo</Button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                const url = URL.createObjectURL(f);
                addEvidence({ id: crypto.randomUUID(), type: 'photo', url, createdAt: new Date().toISOString() });
                e.currentTarget.value = '';
              }
            }} />
          </div>

          {showQuickNote && (
            <div className="mt-3 space-y-2">
              <Textarea value={quickNote} onChange={(e) => setQuickNote(e.target.value)} placeholder="Add a comment" />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => { if (quickNote.trim()) { addEvidence({ id: crypto.randomUUID(), type: 'note', note: quickNote, createdAt: new Date().toISOString() }); setQuickNote(''); } }} disabled={locked}><Save className="h-4 w-4 mr-2" /> Save Comment</Button>
                <Button variant="ghost" size="sm" onClick={() => { setShowQuickNote(false); setQuickNote(''); }} disabled={locked}>Cancel</Button>
              </div>
            </div>
          )}

          {currentStep.requiresPhoto && !(record.stepResponses.find(sr => sr.stepId === currentStep.id)?.evidence || []).some(ev => ev.type === 'photo') && (
            <div className="mt-3 rounded-md border bg-amber-50 text-amber-800 px-3 py-2 text-sm">Photo evidence is required to complete this task</div>
          )}

          {/* Evidence Panel */}
          <div className="mt-4">
            <Tabs defaultValue="evidence">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="evidence">Evidence</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
              </TabsList>
              <TabsContent value="evidence" className="mt-3">
                <EvidencePanel step={currentStep} evidence={record.stepResponses.find(sr => sr.stepId === currentStep.id)?.evidence || []} onAddEvidence={locked ? () => { } : addEvidence} locked={locked} />
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

          <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t">
            <Button variant="secondary" size="lg" onClick={prevStep} disabled={locked} className="h-11 px-6" aria-label="Previous step">Previous</Button>
            <div className="hidden sm:block text-xs text-muted-foreground flex-shrink-0" aria-live="polite">Auto-saved</div>
            {!hasAnySignature ? (
              <Button size="lg" onClick={nextStep} disabled={locked || !isStepRequirementsMet(currentStep, currentStep.id)} className="h-11 px-6 transition-colors" aria-label="Next step">Next</Button>
            ) : (
              <Button size="lg" onClick={handleSubmit} disabled={locked || !allStepsSatisfied} className="h-11 px-6 bg-green-600 hover:bg-green-700 text-white transition-colors animate-in fade-in slide-in-from-right" aria-label="Submit checklist">
                <Save className="h-4 w-4 mr-2" /> Submit
              </Button>
            )}
          </div>
        </div>

        <ActionModal open={actionOpen} onOpenChange={setActionOpen} onCreate={createAction} />
      </CardContent>
    </Card >
  );
};

export default ChecklistExecutor;