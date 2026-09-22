import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

type ProcessStep = {
  id: string;
  title: string;
  description?: string;
  index?: number;
  total?: number;
  requiresPhotoAfterYes?: boolean;
};

type ProcessRunState = {
  id: string;
  templateName?: string;
  status?: string;
  completed?: boolean;
  awaitingPhoto?: boolean;
  step?: ProcessStep | null;
  prompt?: string;
};

const ProcessConversationalRunner: React.FC = () => {
  const { runId } = useParams<{ runId?: string }>();
  const [search] = useSearchParams();
  const templateId = search.get("templateId");
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [run, setRun] = useState<ProcessRunState | null>(null);
  const [templates, setTemplates] = useState<{ id: string; name: string; description?: string }[]>([]);
  const [photoNote, setPhotoNote] = useState("");
  const [busy, setBusy] = useState(false);

  const applyRun = (payload: ProcessRunState) => {
    setRun({
      id: payload.id || (payload as { runId?: string }).runId || "",
      templateName: payload.templateName,
      status: payload.status,
      completed: payload.completed,
      awaitingPhoto: payload.awaitingPhoto || payload.status === "awaiting_photo",
      step: payload.step ?? null,
      prompt: payload.prompt,
    });
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (runId) {
        const data = await api.getProcessRun(runId);
        applyRun(data);
      } else {
        const hub = await api.listProcessRuns();
        setTemplates(hub.templates || []);
        if (hub.activeRun) {
          applyRun(hub.activeRun);
        } else if (templateId) {
          const started = await api.startProcessRun(templateId);
          applyRun(started);
          navigate(`/staff-dashboard/process-run/${started.id}`, { replace: true });
        } else {
          setRun(null);
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load process");
    } finally {
      setLoading(false);
    }
  }, [runId, templateId, navigate]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const answer = async (value: "yes" | "no") => {
    if (!run?.id) return;
    setBusy(true);
    try {
      const next = await api.answerProcessStep(run.id, value);
      applyRun(next);
      if (next.completed) {
        toast.success("Process complete");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save answer");
    } finally {
      setBusy(false);
    }
  };

  const submitPhoto = async () => {
    if (!run?.id) return;
    setBusy(true);
    try {
      const next = await api.submitProcessPhoto(run.id, { photoNote: photoNote.trim() || "Photo attached" });
      applyRun(next);
      setPhotoNote("");
      if (next.completed) {
        toast.success("Process complete");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit photo");
    } finally {
      setBusy(false);
    }
  };

  const startTemplate = async (id: string) => {
    setBusy(true);
    try {
      const started = await api.startProcessRun(id);
      navigate(`/staff-dashboard/process-run/${started.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start process");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  if (!runId && !run && templates.length > 0) {
    return (
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" /> Your processes
            </CardTitle>
            <CardDescription>One question at a time — answer Yes or No on each step.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {templates.map((t) => (
              <Button
                key={t.id}
                variant="outline"
                className="w-full justify-start h-auto py-3"
                disabled={busy}
                onClick={() => void startTemplate(t.id)}
              >
                <div className="text-left">
                  <div className="font-medium">{t.name}</div>
                  {t.description ? (
                    <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
                  ) : null}
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="max-w-lg mx-auto p-6 text-center text-muted-foreground">
        No active process. Ask Miya to <strong>start checklist</strong> or clock in if you are assigned.
      </div>
    );
  }

  if (run.completed) {
    return (
      <div className="max-w-lg mx-auto p-6 text-center space-y-3">
        <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
        <h2 className="text-xl font-semibold">{run.templateName || "Process"} complete</h2>
        <Button variant="outline" onClick={() => navigate("/staff-dashboard/process-run")}>
          Back to processes
        </Button>
      </div>
    );
  }

  const step = run.step;
  const progress =
    step?.index && step?.total ? Math.round((step.index / step.total) * 100) : undefined;

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>{run.templateName || "Process"}</CardTitle>
            {run.awaitingPhoto ? (
              <Badge variant="secondary">Photo needed</Badge>
            ) : (
              <Badge variant="outline">
                Step {step?.index ?? "—"} / {step?.total ?? "—"}
              </Badge>
            )}
          </div>
          {progress != null ? <Progress value={progress} className="mt-2" /> : null}
          <CardDescription className="pt-2">{run.prompt || step?.title}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step?.description ? (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{step.description}</p>
          ) : null}

          {run.awaitingPhoto ? (
            <div className="space-y-3">
              <Label htmlFor="photo-note">Photo link or note</Label>
              <Input
                id="photo-note"
                value={photoNote}
                onChange={(e) => setPhotoNote(e.target.value)}
                placeholder="Paste image URL or short description"
              />
              <Button className="w-full" disabled={busy} onClick={() => void submitPhoto()}>
                Submit proof & continue
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Button
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={busy}
                onClick={() => void answer("yes")}
              >
                Yes
              </Button>
              <Button
                size="lg"
                variant="destructive"
                disabled={busy}
                onClick={() => void answer("no")}
              >
                No
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProcessConversationalRunner;
