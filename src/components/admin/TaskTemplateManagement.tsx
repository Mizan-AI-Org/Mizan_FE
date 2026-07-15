import React, { useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/hooks/use-language';
import { CardGridSkeleton } from '@/components/skeletons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Copy,
  Play,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Settings,
  Zap,
  Upload,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import TaskTemplateForm from './TaskTemplateForm';
import { API_BASE } from "@/lib/api";
import {
  parseProcessTemplatesFile,
  SAMPLE_JSON_EXPORT,
  SAMPLE_CSV_EXPORT,
  type ImportTemplatePayload,
} from '@/lib/processTemplateImport';
import { PROCESSES_TASKS_HEADER_ACTIONS_ID } from '@/pages/ProcessesTasksApp';
interface TemplateTask {
  title: string;
  description?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  estimated_duration?: number;
}

interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  template_type: string;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY" | "CUSTOM";
  tasks: TemplateTask[];
  created_at: string;
  updated_at: string;
  is_active: boolean;
  usage_count: number;
  priority_level: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  is_critical: boolean;
  ai_generated: boolean;
  standing_assignees?: string[];
  standing_assignee_count?: number;
}

const templateTypeIcons = {
  CLEANING: <Settings className="h-4 w-4" />,
  TEMPERATURE: <AlertCircle className="h-4 w-4" />,
  OPENING: <Play className="h-4 w-4" />,
  CLOSING: <CheckCircle className="h-4 w-4" />,
  HEALTH: <AlertCircle className="h-4 w-4" />,
  SOP: <FileText className="h-4 w-4" />,
  MAINTENANCE: <Settings className="h-4 w-4" />,
  COMPLIANCE: <CheckCircle className="h-4 w-4" />,
  SAFETY: <AlertCircle className="h-4 w-4" />,
  QUALITY: <CheckCircle className="h-4 w-4" />,
  CUSTOM: <FileText className="h-4 w-4" />,
};

const priorityColors = {
  LOW: "bg-blue-100 text-blue-800 border-blue-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200",
  HIGH: "bg-orange-100 text-orange-800 border-orange-200",
  URGENT: "bg-red-100 text-red-800 border-red-200",
};

const frequencyColors = {
  DAILY: "bg-green-100 text-green-800 border-green-200",
  WEEKLY: "bg-blue-100 text-blue-800 border-blue-200",
  MONTHLY: "bg-purple-100 text-purple-800 border-purple-200",
  QUARTERLY: "bg-indigo-100 text-indigo-800 border-indigo-200",
  ANNUALLY: "bg-pink-100 text-pink-800 border-pink-200",
  CUSTOM: "bg-orange-100 text-orange-800 border-orange-200",
} as const;

export default function TaskTemplateManagement() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterFrequency, setFilterFrequency] = useState<string>('all');
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState<TaskTemplate | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportTemplatePayload[]>([]);
  const [importParseErrors, setImportParseErrors] = useState<string[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [startProcessTemplate, setStartProcessTemplate] = useState<TaskTemplate | null>(null);
  const [startProcessStaffIds, setStartProcessStaffIds] = useState<string[]>([]);

  const queryClient = useQueryClient();

  // Fetch task templates
  const { data: templates, isLoading } = useQuery<TaskTemplate[]>({
    queryKey: ['task-templates'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/scheduling/task-templates/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to load task templates');
      const data = await response.json();
      return data.results || data;
    },
  });

  type StaffOption = { id: string; name: string };
  const { data: staffOptions = [] } = useQuery<StaffOption[]>({
    queryKey: ['task-template-staff'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/staff/?page_size=500`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      if (!response.ok) throw new Error('Failed to fetch staff');
      const json = await response.json();
      const arr = (json?.results ?? json) as Record<string, unknown>[];
      return (Array.isArray(arr) ? arr : []).map((s) => {
        const nested = (s.user as Record<string, unknown>) || {};
        const id = String(s.id ?? nested.id ?? '');
        const first = String(s.first_name ?? nested.first_name ?? '');
        const last = String(s.last_name ?? nested.last_name ?? '');
        const email = String(s.email ?? nested.email ?? '');
        const name = `${first} ${last}`.trim() || email || 'Staff member';
        return { id, name };
      }).filter((s) => s.id);
    },
  });

  const builtInTemplates: Array<{
    name: string;
    description: string;
    template_type: string;
    frequency: TaskTemplate['frequency'];
    tasks: TemplateTask[];
  }> = [
      {
        name: 'Restaurant Opening',
        description: 'Complete all tasks before restaurant opens for service',
        template_type: 'OPENING',
        frequency: 'DAILY',
        tasks: [
          { title: 'Check refrigeration temperatures', priority: 'HIGH', estimated_duration: 5 },
          { title: 'Verify food storage compliance', priority: 'HIGH', estimated_duration: 5 },
          { title: 'Test cooking equipment', priority: 'MEDIUM', estimated_duration: 5 },
          { title: 'Check hand washing stations', priority: 'MEDIUM', estimated_duration: 5 },
          { title: 'Prep kitchen stations', priority: 'MEDIUM', estimated_duration: 10 },
          { title: 'Inspect dining area cleanliness', priority: 'MEDIUM', estimated_duration: 10 },
          { title: 'Stock bar essentials', priority: 'MEDIUM', estimated_duration: 10 },
          { title: 'Run POS opening procedures', priority: 'MEDIUM', estimated_duration: 5 },
          { title: 'Verify safety compliance signage', priority: 'LOW', estimated_duration: 5 },
          { title: 'Brief staff on service notes', priority: 'LOW', estimated_duration: 5 },
          { title: 'Unlock entrances and enable music', priority: 'LOW', estimated_duration: 5 },
        ],
      },
      {
        name: 'Restaurant Closing',
        description: 'End of day shutdown and cleaning procedures',
        template_type: 'CLOSING',
        frequency: 'DAILY',
        tasks: [
          { title: 'Cash reconciliation and deposits', priority: 'HIGH', estimated_duration: 10 },
          { title: 'Kitchen deep clean and sanitization', priority: 'HIGH', estimated_duration: 30 },
          { title: 'Bar cleanup and inventory check', priority: 'MEDIUM', estimated_duration: 20 },
          { title: 'Dining area cleaning and trash removal', priority: 'MEDIUM', estimated_duration: 20 },
          { title: 'Secure inventory and lock storage', priority: 'MEDIUM', estimated_duration: 10 },
          { title: 'Update closing notes', priority: 'LOW', estimated_duration: 5 },
        ],
      },
      {
        name: 'Kitchen Prep',
        description: 'Morning prep checklist for kitchen staff',
        template_type: 'SOP',
        frequency: 'DAILY',
        tasks: [
          { title: 'Prepare mise en place', priority: 'MEDIUM', estimated_duration: 30 },
          { title: 'Thaw and portion proteins', priority: 'HIGH', estimated_duration: 20 },
          { title: 'Check prep inventory levels', priority: 'MEDIUM', estimated_duration: 10 },
          { title: 'Label and date prepared items', priority: 'MEDIUM', estimated_duration: 10 },
        ],
      },
      {
        name: 'Bar Setup',
        description: 'Daily bar preparation and inventory check',
        template_type: 'SOP',
        frequency: 'DAILY',
        tasks: [
          { title: 'Prepare garnishes', priority: 'MEDIUM', estimated_duration: 15 },
          { title: 'Check spirits and mixers inventory', priority: 'MEDIUM', estimated_duration: 10 },
          { title: 'Clean glassware and bar surface', priority: 'LOW', estimated_duration: 10 },
          { title: 'Update menu specials', priority: 'LOW', estimated_duration: 5 },
        ],
      },
      {
        name: 'Health & Safety Inspection',
        description: 'Weekly health and safety compliance check',
        template_type: 'HEALTH',
        frequency: 'WEEKLY',
        tasks: [
          { title: 'Verify food storage temperatures', priority: 'HIGH', estimated_duration: 10 },
          { title: 'Check sanitation logs', priority: 'MEDIUM', estimated_duration: 10 },
          { title: 'Inspect fire safety equipment', priority: 'MEDIUM', estimated_duration: 10 },
          { title: 'Review staff hygiene practices', priority: 'MEDIUM', estimated_duration: 10 },
        ],
      },
      {
        name: 'Equipment Maintenance',
        description: 'Monthly equipment inspection and maintenance',
        template_type: 'MAINTENANCE',
        frequency: 'MONTHLY',
        tasks: [
          { title: 'Clean and descale coffee machines', priority: 'LOW', estimated_duration: 20 },
          { title: 'Service refrigeration units', priority: 'MEDIUM', estimated_duration: 30 },
          { title: 'Grease hood filters', priority: 'MEDIUM', estimated_duration: 20 },
          { title: 'Calibrate cooking equipment', priority: 'HIGH', estimated_duration: 30 },
        ],
      },
    ];

  const seedTemplatesMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('access_token') || '';
      // Prefer cached list; fall back to a fresh fetch
      let existing = (queryClient.getQueryData<TaskTemplate[]>(['task-templates']) || []);
      if (!existing.length) {
        const listRes = await fetch(`${API_BASE}/scheduling/task-templates/?page_size=500`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!listRes.ok) {
          const errBody = await listRes.json().catch(() => ({}));
          const detail =
            (errBody as { detail?: string; message?: string }).detail ||
            (errBody as { message?: string }).message ||
            (listRes.status === 401
              ? 'Session expired — please sign in again.'
              : `Could not load templates (${listRes.status}). Is the API running?`);
          throw new Error(detail);
        }
        const listData = await listRes.json();
        existing = (listData.results || listData || []) as TaskTemplate[];
      }
      const existingNames = new Set(existing.map((t) => t.name.trim().toLowerCase()));

      const toCreate = builtInTemplates.filter(
        (tpl) => !existingNames.has(tpl.name.trim().toLowerCase())
      );

      if (toCreate.length === 0) {
        return { created: 0, skipped: builtInTemplates.length };
      }

      for (const tpl of toCreate) {
        const response = await fetch(`${API_BASE}/scheduling/task-templates/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: tpl.name,
            description: tpl.description,
            template_type: tpl.template_type,
            frequency: tpl.frequency,
            tasks: tpl.tasks,
          }),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.detail || err.message || 'Failed to create built-in template');
        }
      }
      return {
        created: toCreate.length,
        skipped: builtInTemplates.length - toCreate.length,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['task-templates'] });
      const { created = 0, skipped = 0 } = result || {};
      if (created === 0 && skipped > 0) {
        toast.info('All pre-built processes are already loaded.');
      } else if (skipped > 0) {
        toast.success(`Loaded ${created} new processes. ${skipped} were already present.`);
      } else {
        toast.success('Built-in templates loaded');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to load built-in templates');
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const response = await fetch(`${API_BASE}/scheduling/task-templates/${templateId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to delete template');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-templates'] });
      toast.success('Process deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete process');
      console.error('Delete error:', error);
    },
  });

  // Duplicate template mutation
  const duplicateTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const response = await fetch(`${API_BASE}/scheduling/task-templates/${templateId}/duplicate/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to duplicate process');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-templates'] });
      toast.success('Process duplicated successfully');
    },
    onError: (error) => {
      toast.error('Failed to duplicate process');
      console.error('Duplicate error:', error);
    },
  });

  // Start process checklist for staff (Live Board / Miya — not Tasks & Demands)
  const startProcessMutation = useMutation({
    mutationFn: async ({ templateId, staffIds }: { templateId: string; staffIds: string[] }) => {
      const response = await fetch(`${API_BASE}/scheduling/task-templates/${templateId}/start_process/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ staff_ids: staffIds, notify: true }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.detail || 'Failed to start process');
      }
      return response.json();
    },
    onSuccess: (data) => {
      const name = data?.template_name || startProcessTemplate?.name || 'Process';
      const count = data?.count ?? startProcessStaffIds.length;
      toast.success(t('processes.start_process_success', { name, count }));
      setStartProcessTemplate(null);
      setStartProcessStaffIds([]);
      queryClient.invalidateQueries({ queryKey: ['task-templates'] });
      queryClient.invalidateQueries({ queryKey: ['live-checklist-progress'] });
    },
    onError: (error: Error) => {
      toast.error(error?.message || t('processes.start_process_failed'));
      console.error('Start process error:', error);
    },
  });

  // Filter templates
  const filteredTemplates = templates?.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || template.template_type === filterType;
    const matchesFrequency = filterFrequency === 'all' || template.frequency === filterFrequency;

    return matchesSearch && matchesType && matchesFrequency;
  }) || [];

  const handleEdit = (template: TaskTemplate) => {
    setEditingProcess(template);
  };

  const handleDelete = (templateId: string) => {
    deleteTemplateMutation.mutate(templateId);
  };

  const handleDuplicate = (templateId: string) => {
    duplicateTemplateMutation.mutate(templateId);
  };

  const openStartProcess = (template: TaskTemplate) => {
    const standing = (template.standing_assignees || []).map(String);
    setStartProcessStaffIds(standing);
    setStartProcessTemplate(template);
  };

  const toggleStartProcessStaff = (staffId: string) => {
    setStartProcessStaffIds((prev) =>
      prev.includes(staffId) ? prev.filter((id) => id !== staffId) : [...prev, staffId],
    );
  };

  const confirmStartProcess = () => {
    if (!startProcessTemplate) return;
    if (!startProcessStaffIds.length) {
      toast.error(t('processes.start_process_no_staff'));
      return;
    }
    startProcessMutation.mutate({
      templateId: startProcessTemplate.id,
      staffIds: startProcessStaffIds,
    });
  };

  const handleFormSuccess = () => {
    setIsProcessModalOpen(false);
    setEditingProcess(null);
    queryClient.invalidateQueries({ queryKey: ['task-templates'] });
  };

  const resetImportState = () => {
    setImportPreview([]);
    setImportParseErrors([]);
    setImportFileName('');
  };

  const downloadImportSample = (kind: 'json' | 'csv') => {
    const body = kind === 'json' ? SAMPLE_JSON_EXPORT : SAMPLE_CSV_EXPORT;
    const mime = kind === 'json' ? 'application/json' : 'text/csv;charset=utf-8';
    const blob = new Blob([body], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = kind === 'json' ? 'mizan-processes-sample.json' : 'mizan-processes-sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const applyImportFile = async (file: File) => {
    setImportFileName(file.name);
    try {
      const text = await file.text();
      const { templates, errors } = parseProcessTemplatesFile(text, file.name);
      setImportPreview(templates);
      setImportParseErrors(errors);
    } catch {
      setImportPreview([]);
      setImportParseErrors([t('processes.import_failed_read')]);
    }
  };

  const importProcessesMutation = useMutation({
    mutationFn: async (payloads: ImportTemplatePayload[]) => {
      const token = localStorage.getItem('access_token') || '';
      let existing = (queryClient.getQueryData<TaskTemplate[]>(['task-templates']) || []);
      if (!existing.length) {
        const listRes = await fetch(`${API_BASE}/scheduling/task-templates/?page_size=500`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!listRes.ok) {
          const errBody = await listRes.json().catch(() => ({}));
          throw new Error(
            (errBody as { detail?: string }).detail ||
              (listRes.status === 401
                ? 'Session expired — please sign in again.'
                : `Could not load templates (${listRes.status}). Is the API running?`),
          );
        }
        const listData = await listRes.json();
        existing = (listData.results || listData || []) as TaskTemplate[];
      }
      const existingNames = new Set(existing.map((x) => x.name.trim().toLowerCase()));

      let created = 0;
      let skipped = 0;
      let failed = 0;
      let lastError = '';

      for (const tpl of payloads) {
        const key = tpl.name.trim().toLowerCase();
        if (existingNames.has(key)) {
          skipped += 1;
          continue;
        }
        const body: Record<string, unknown> = {
          name: tpl.name.trim(),
          description: tpl.description ?? '',
          template_type: tpl.template_type,
          frequency: tpl.frequency,
          tasks: tpl.tasks,
          is_active: tpl.is_active !== false,
        };
        if (tpl.priority_level) body.priority_level = tpl.priority_level;
        if (typeof tpl.is_critical === 'boolean') body.is_critical = tpl.is_critical;

        const response = await fetch(`${API_BASE}/scheduling/task-templates/`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          failed += 1;
          const err = await response.json().catch(() => ({}));
          const msg =
            (typeof err === 'object' && err && ('detail' in err || 'message' in err)
              ? String((err as { detail?: unknown }).detail ?? (err as { message?: unknown }).message)
              : '') || response.statusText;
          if (msg) lastError = msg;
          continue;
        }
        existingNames.add(key);
        created += 1;
      }
      return { created, skipped, failed, lastError };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['task-templates'] });
      const { created, skipped, failed, lastError } = result;
      if (created > 0 && failed === 0) {
        toast.success(t('processes.import_success', { created, skipped }));
        setImportDialogOpen(false);
        resetImportState();
      } else if (created > 0 && failed > 0) {
        toast.warning(t('processes.import_partial', { created, failed }));
        setImportDialogOpen(false);
        resetImportState();
      } else if (failed > 0) {
        toast.error(lastError || t('processes.import_partial', { created: 0, failed }));
      } else {
        toast.info(t('processes.import_none_created'));
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Import failed');
    },
  });

  const canRunImport =
    importPreview.length > 0 &&
    importProcessesMutation.isPending === false;

  const [headerActionsEl, setHeaderActionsEl] = useState<HTMLElement | null>(() =>
    typeof document !== "undefined"
      ? document.getElementById(PROCESSES_TASKS_HEADER_ACTIONS_ID)
      : null,
  );
  useLayoutEffect(() => {
    const el = document.getElementById(PROCESSES_TASKS_HEADER_ACTIONS_ID);
    setHeaderActionsEl(el);
    if (el) return;
    // Portal target may mount a tick later (parent header); retry once.
    const id = window.setTimeout(() => {
      setHeaderActionsEl(document.getElementById(PROCESSES_TASKS_HEADER_ACTIONS_ID));
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const actionButtons = (
    <div className="flex flex-wrap items-center gap-2">
      <Dialog open={isProcessModalOpen} onOpenChange={setIsProcessModalOpen}>
        <DialogTrigger asChild>
          <Button className="premium-button">
            <Plus className="h-4 w-4 mr-2" />
            {t("processes.new_process")}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("processes.create_new_process")}</DialogTitle>
            <DialogDescription>
              {t("processes.create_new_process_desc")}
            </DialogDescription>
          </DialogHeader>
          <TaskTemplateForm
            onSuccess={handleFormSuccess}
            onCancel={() => setIsProcessModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setImportDialogOpen(true)}
        className="gap-2 text-slate-600 dark:text-slate-300"
      >
        <Upload className="h-4 w-4" />
        {t('processes.import_processes')}
      </Button>

      <Dialog
        open={importDialogOpen}
        onOpenChange={(open) => {
          setImportDialogOpen(open);
          if (!open) resetImportState();
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('processes.import_processes_title')}</DialogTitle>
            <DialogDescription>{t('processes.import_processes_desc')}</DialogDescription>
          </DialogHeader>

          <input
            ref={importFileInputRef}
            type="file"
            accept=".json,.csv,application/json,text/csv,text/plain"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void applyImportFile(f);
            }}
          />

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => importFileInputRef.current?.click()}
            >
              {t('processes.import_choose_file')}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => downloadImportSample('json')}>
              {t('processes.import_download_json_sample')}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => downloadImportSample('csv')}>
              {t('processes.import_download_csv_sample')}
            </Button>
          </div>

          <div
            className="rounded-md border border-dashed border-muted-foreground/40 bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground"
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const f = e.dataTransfer.files?.[0];
              if (f) void applyImportFile(f);
            }}
          >
            {importFileName
              ? `${importFileName}`
              : t('processes.import_no_preview')}
          </div>

          {importParseErrors.length > 0 && (
            <ul className="text-xs text-amber-700 dark:text-amber-400 list-disc pl-4 space-y-1 max-h-24 overflow-y-auto">
              {importParseErrors.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          )}

          {importPreview.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{t('processes.import_preview')}</p>
              <ul className="max-h-48 overflow-y-auto rounded-md border divide-y text-sm">
                {importPreview.map((p, idx) => (
                  <li key={`${p.name}-${idx}`} className="px-3 py-2 flex justify-between gap-2">
                    <span className="font-medium truncate">{p.name}</span>
                    <span className="text-muted-foreground shrink-0">
                      {t('processes.import_tasks_count', { count: p.tasks.length })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setImportDialogOpen(false)}>
              {t('schedule.cancel')}
            </Button>
            <Button
              type="button"
              className="premium-button"
              disabled={!canRunImport}
              onClick={() => importProcessesMutation.mutate(importPreview)}
            >
              {t('processes.import_run')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => seedTemplatesMutation.mutate()}
        disabled={seedTemplatesMutation.isPending}
        className="text-slate-600 dark:text-slate-300"
      >
        {t("processes.load_prebuilt_processes")}
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Actions sit opposite "Processes & Tasks" via portal when embedded in that page */}
      {headerActionsEl
        ? createPortal(actionButtons, headerActionsEl)
        : (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold">{t("processes.manage_processes")}</h1>
            </div>
            {actionButtons}
          </div>
        )}

      {/* Filters and Search */}
      <Card className="premium-card">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder={t("processes.search_processes")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder={t("processes.filter_by_type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("processes.all_types")}</SelectItem>
                <SelectItem value="CLEANING">Cleaning</SelectItem>
                <SelectItem value="TEMPERATURE">Temperature</SelectItem>
                <SelectItem value="OPENING">Opening</SelectItem>
                <SelectItem value="CLOSING">Closing</SelectItem>
                <SelectItem value="HEALTH">Health & Safety</SelectItem>
                <SelectItem value="SOP">SOP</SelectItem>
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                <SelectItem value="COMPLIANCE">Compliance</SelectItem>
                <SelectItem value="SAFETY">Safety</SelectItem>
                <SelectItem value="QUALITY">Quality Control</SelectItem>
                <SelectItem value="CUSTOM">Custom</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterFrequency} onValueChange={setFilterFrequency}>
              <SelectTrigger className="w-full sm:w-48">
                <Clock className="h-4 w-4 mr-2" />
                <SelectValue placeholder={t("processes.filter_by_frequency")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("processes.all_frequencies")}</SelectItem>
                <SelectItem value="DAILY">Daily</SelectItem>
                <SelectItem value="WEEKLY">Weekly</SelectItem>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
                <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                <SelectItem value="ANNUALLY">Annually</SelectItem>
                <SelectItem value="CUSTOM">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {isLoading ? (
        <CardGridSkeleton count={6} columns="grid-cols-1 md:grid-cols-2 lg:grid-cols-3" />
      ) : filteredTemplates.length === 0 ? (
        <Card className="premium-card">
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t("processes.no_processes_found")}</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || filterType !== 'all' || filterFrequency !== 'all'
                ? t("processes.try_adjusting_filters")
                : t("processes.create_first_process")
              }
            </p>
            {!searchTerm && filterType === 'all' && filterFrequency === 'all' && (
              <Button onClick={() => setIsProcessModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t("processes.create_process")}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="premium-card hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {templateTypeIcons[template.template_type as keyof typeof templateTypeIcons]}
                    <CardTitle className="text-lg leading-tight">{template.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    {template.ai_generated && (
                      <Badge variant="outline" className="text-xs">
                        <Zap className="h-3 w-3 mr-1" />
                        AI
                      </Badge>
                    )}
                    {template.is_critical && (
                      <Badge variant="destructive" className="text-xs">
                        {t("processes.critical_badge")}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {template.description}
                </p>

                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className={`text-xs ${priorityColors[template.priority_level]}`}
                  >
                    {template.priority_level}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-xs ${frequencyColors[template.frequency]}`}
                  >
                    {template.frequency.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>{t("processes.tasks_count", { count: template.tasks.length })}</span>
                    <span>{t("processes.used_times", { count: template.usage_count })}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(template)}
                    className="flex-1"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    {t("processes.edit")}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicate(template.id)}
                    disabled={duplicateTemplateMutation.isPending}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openStartProcess(template)}
                    disabled={startProcessMutation.isPending}
                    title={t('processes.start_process')}
                    aria-label={t('processes.start_process')}
                  >
                    <Play className="h-3 w-3" />
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("processes.delete_template")}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("processes.delete_template_confirm", { name: template.name })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("schedule.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(template.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {t("processes.delete_button")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Template Dialog */}
      {editingProcess && (
        <Dialog open={!!editingProcess} onOpenChange={() => setEditingProcess(null)}>
          <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("processes.edit_process")}</DialogTitle>
              <DialogDescription>
                {t("processes.edit_process_desc")}
              </DialogDescription>
            </DialogHeader>
            <TaskTemplateForm
              template={editingProcess}
              onSuccess={handleFormSuccess}
              onCancel={() => setEditingProcess(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Start process → Live Board checklist (not Tasks & Demands) */}
      <Dialog
        open={!!startProcessTemplate}
        onOpenChange={(open) => {
          if (!open) {
            setStartProcessTemplate(null);
            setStartProcessStaffIds([]);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t('processes.start_process')}
              {startProcessTemplate ? `: ${startProcessTemplate.name}` : ''}
            </DialogTitle>
            <DialogDescription>{t('processes.start_process_desc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>{t('processes.start_process_select_staff')}</Label>
            <div className="max-h-64 overflow-y-auto rounded-md border border-border divide-y">
              {staffOptions.length === 0 ? (
                <p className="px-3 py-3 text-sm text-muted-foreground">No staff found.</p>
              ) : (
                staffOptions.map((s) => {
                  const selected = startProcessStaffIds.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() => toggleStartProcessStaff(s.id)}
                      />
                      <span className="text-sm">{s.name}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setStartProcessTemplate(null);
                setStartProcessStaffIds([]);
              }}
            >
              {t('schedule.cancel')}
            </Button>
            <Button
              onClick={confirmStartProcess}
              disabled={startProcessMutation.isPending || startProcessStaffIds.length === 0}
            >
              <Play className="h-3.5 w-3.5 mr-1.5" />
              {t('processes.start_process')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}