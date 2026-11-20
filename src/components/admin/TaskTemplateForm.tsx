// components/tasks/TaskTemplateForm.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AccessibleDropdown, { DropdownOption } from '@/components/common/AccessibleDropdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  Trash2,
  GripVertical,
  AlertTriangle,
  CheckCircle,
  Search as SearchIcon,
  FolderPlus,
  FolderMinus,
  GitBranch,
  ArrowRight,
  Users,
  Camera,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE, api, type AudienceSpec } from "@/lib/api";
import { AudiencePicker, normalizeAudience, audienceIsEmpty } from "@/components/admin/AudiencePicker";
import { loadStaffPickerOptions, type StaffPickerOption } from "@/lib/staffPicker";
import {
  BranchAlertAssigneeSelect,
  ProcessAssigneeMultiSelect,
} from "@/components/admin/ProcessAssigneeMultiSelect";
import { cn } from "@/lib/utils";

import { useLanguage } from "@/hooks/use-language";
import i18n from "@/i18n";
/** What happens after Yes / No on a checklist task. */
type BranchActionType = "next" | "goto" | "end" | "alert";

interface BranchAction {
  type: BranchActionType;
  /** Required when type === "goto" */
  task_id?: string;
  /** Optional note when type === "alert" */
  message?: string;
  /** Staff user ids to notify when type === "alert" (empty/omitted = managers) */
  assignees?: string[];
}

interface TemplateTask {
  id: string;
  title: string;
  description?: string;
  /** Kept for backward compatibility with existing templates / imports */
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  estimated_duration?: number;
  response_type?: "yes_no" | "check";
  /** After Yes, staff are asked to send a photo as proof before continuing */
  requires_photo?: boolean;
  verification_type?: "NONE" | "PHOTO";
  verification_required?: boolean;
  branches?: {
    yes?: BranchAction;
    no?: BranchAction;
  };
}

const BRANCH_ACTION_OPTIONS: { value: string; labelKey: string }[] = [
  { value: "next", labelKey: "process.form.branch_next" },
  { value: "goto", labelKey: "process.form.branch_goto" },
  { value: "end", labelKey: "process.form.branch_end" },
  { value: "alert", labelKey: "process.form.branch_alert" },
];

const newTaskId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const defaultBranches = (): NonNullable<TemplateTask["branches"]> => ({
  yes: { type: "next" },
  no: { type: "alert", message: i18n.t("process.form.needs_attention") },
});

const normalizeTask = (t: Partial<TemplateTask> & { title?: string }): TemplateTask => {
  const requiresPhoto = Boolean(
    t.requires_photo || t.verification_required || t.verification_type === "PHOTO",
  );
  return {
    id: t.id || newTaskId(),
    title: t.title || "",
    description: t.description || "",
    priority: t.priority || "MEDIUM",
    estimated_duration: t.estimated_duration,
    response_type: t.response_type || "yes_no",
    requires_photo: requiresPhoto,
    verification_required: requiresPhoto,
    verification_type: requiresPhoto ? "PHOTO" : "NONE",
    branches: {
      yes: t.branches?.yes || { type: "next" },
      no: t.branches?.no || { type: "alert", message: i18n.t("process.form.needs_attention") },
    },
  };
};

interface ProcessGroup {
  id: string;
  name: string;
  color?: string; // visual indicator for association
  tasks: TemplateTask[];
}

interface TaskTemplate {
  id?: string;
  name: string;
  description: string;
  template_type: string;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY" | "CUSTOM";
  tasks: TemplateTask[];
  is_active: boolean;
  priority_level: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  is_critical: boolean;
  ai_generated?: boolean;
  /** Staff who can run this checklist after clock-in without a scheduled shift */
  standing_assignees?: string[];
  /** 0=Mon … 6=Sun — when this process appears on the staff schedule */
  schedule_days?: number[];
  /** Local time (HH:mm) when the process block starts on the calendar */
  schedule_time?: string | null;
  /** Groups (roles / titles / departments / everyone / on shift) - named people stay in standing_assignees */
  audience?: Partial<AudienceSpec> | null;
  audience_label?: string;
  /** 1-31, or -1 = last day (MONTHLY / QUARTERLY / ANNUALLY) */
  schedule_month_day?: number | null;
}

interface TaskTemplateFormProps {
  template?: TaskTemplate;
  onSuccess: () => void;
  onCancel: () => void;
}

const templateTypes: { value: string; labelKey: string }[] = [
  { value: 'CLEANING', labelKey: 'process.form.type_cleaning' },
  { value: 'TEMPERATURE', labelKey: 'process.form.type_temperature' },
  { value: 'OPENING', labelKey: 'process.form.type_opening' },
  { value: 'CLOSING', labelKey: 'process.form.type_closing' },
  { value: 'HEALTH', labelKey: 'process.form.type_health' },
  { value: 'SOP', labelKey: 'process.form.type_sop' },
  { value: 'MAINTENANCE', labelKey: 'process.form.type_maintenance' },
  { value: 'COMPLIANCE', labelKey: 'process.form.type_compliance' },
  { value: 'SAFETY', labelKey: 'process.form.type_safety' },
  { value: 'QUALITY', labelKey: 'process.form.type_quality' },
  { value: 'CUSTOM', labelKey: 'process.form.type_custom' },
];

const WEEKDAY_KEYS = [
  { value: 0, labelKey: 'process.schedule.day_mon' },
  { value: 1, labelKey: 'process.schedule.day_tue' },
  { value: 2, labelKey: 'process.schedule.day_wed' },
  { value: 3, labelKey: 'process.schedule.day_thu' },
  { value: 4, labelKey: 'process.schedule.day_fri' },
  { value: 5, labelKey: 'process.schedule.day_sat' },
  { value: 6, labelKey: 'process.schedule.day_sun' },
] as const;

const frequencies: { value: string; labelKey: string }[] = [
  { value: 'DAILY', labelKey: 'process.form.freq_daily' },
  { value: 'WEEKLY', labelKey: 'process.form.freq_weekly' },
  { value: 'MONTHLY', labelKey: 'process.form.freq_monthly' },
  { value: 'QUARTERLY', labelKey: 'process.form.freq_quarterly' },
  { value: 'ANNUALLY', labelKey: 'process.form.freq_annually' },
  { value: 'CUSTOM', labelKey: 'process.form.freq_custom' },
];

const priorities: { value: string; labelKey: string }[] = [
  { value: 'LOW', labelKey: 'process.form.prio_low' },
  { value: 'MEDIUM', labelKey: 'process.form.prio_medium' },
  { value: 'HIGH', labelKey: 'process.form.prio_high' },
  { value: 'URGENT', labelKey: 'process.form.prio_urgent' },
];

// Helper function for priority colors
/** Wrapper for a task card that makes it draggable via @dnd-kit (drag handle receives attributes/listeners). */
function SortableTaskCard({
  id,
  children,
}: {
  id: string;
  children: (props: {
    setNodeRef: (node: HTMLElement | null) => void;
    style: React.CSSProperties;
    attributes: object;
    listeners: object;
  }) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return <>{children({ setNodeRef, style, attributes, listeners })}</>;
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'LOW': return 'bg-blue-100 text-blue-800';
    case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
    case 'HIGH': return 'bg-orange-100 text-orange-800';
    case 'URGENT': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export default function TaskTemplateForm({ template, onSuccess, onCancel }: TaskTemplateFormProps) {
    const { t } = useLanguage();
  const branchActionOptions = useMemo<DropdownOption[]>(
    () => BRANCH_ACTION_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) })),
    [t],
  );
  const templateTypeOptions = useMemo<DropdownOption[]>(
    () => templateTypes.map((o) => ({ value: o.value, label: t(o.labelKey) })),
    [t],
  );
  const frequencyOptions = useMemo<DropdownOption[]>(
    () => frequencies.map((o) => ({ value: o.value, label: t(o.labelKey) })),
    [t],
  );
  const priorityOptions = useMemo<DropdownOption[]>(
    () => priorities.map((o) => ({ value: o.value, label: t(o.labelKey) })),
    [t],
  );
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<TaskTemplate>({
    name: '',
    description: '',
    template_type: 'CUSTOM',
    frequency: 'DAILY',
    tasks: [],
    is_active: true,
    priority_level: 'MEDIUM',
    is_critical: false,
    ...template,
    standing_assignees: Array.isArray(template?.standing_assignees)
      ? template!.standing_assignees!.map(String)
      : [],
    schedule_days: Array.isArray(template?.schedule_days)
      ? template!.schedule_days!.map((d) => Number(d)).filter((d) => d >= 0 && d <= 6)
      : [],
    schedule_time: template?.schedule_time ?? '09:00',
    schedule_month_day: template?.schedule_month_day ?? null,
  });
  const [groupAudience, setGroupAudience] = useState<AudienceSpec>(() => normalizeAudience(template?.audience));

  // New hierarchical state: processes (stations) containing tasks
  const [processes, setProcesses] = useState<ProcessGroup[]>(() => {
    // If editing an existing template that previously had flat tasks,
    // initialize with a single default process to preserve compatibility.
    if (template?.tasks && template.tasks.length > 0) {
      return [{
        id: 'default',
        name: 'General',
        color: '#0ea5e9',
        tasks: template.tasks.map((t) => normalizeTask(t)),
      }];
    }
    return [];
  });

  // Staff list for standing assignees + branch alert pickers
  const { data: staffOptions = [] } = useQuery<StaffPickerOption[]>({
    queryKey: ["task-template-staff"],
    queryFn: () => loadStaffPickerOptions({ pageSize: 500 }),
  });

  // Search/filter term for tasks within processes
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Derived filtered view
  const filteredProcesses = useMemo(() => {
    if (!searchTerm.trim()) return processes;
    const term = searchTerm.toLowerCase();
    return processes
      .map(p => ({
        ...p,
        tasks: p.tasks.filter(t =>
          t.title.toLowerCase().includes(term) ||
          (t.description || '').toLowerCase().includes(term)
        ),
      }))
      .filter(p => p.tasks.length > 0);
  }, [processes, searchTerm]);

  /** All tasks flattened into one ordered list (with their owning section id + index). */
  const flatTasks = useMemo(
    () =>
      filteredProcesses.flatMap((p) =>
        p.tasks.map((task, index) => ({ task, processId: p.id, index })),
      ),
    [filteredProcesses],
  );

  /** All tasks (for jump-to pickers), excluding optional self id */
  const allTaskOptions = useMemo(() => {
    return processes.flatMap((p) =>
      p.tasks.map((task) => ({
        id: task.id,
        label: task.title.trim() || t("process.form.untitled_task"),
        processName: p.name,
      })),
    );
  }, [processes, t]);

  // Selection map for bulk operations
  const [selectedTasks, setSelectedTasks] = useState<Record<string, Set<number>>>({});

  // Which task cards are expanded (collapsed by default for a denser list)
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(() => new Set());

  const toggleTaskExpanded = (taskId: string) => {
    setExpandedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  // Which task-group accordions are open (controlled so "Add Tasks" can open the new one)
  const [openAccordionIds, setOpenAccordionIds] = useState<string[]>([]);

  const [newTask, setNewTask] = useState<TemplateTask>(() =>
    normalizeTask({ title: "", description: "" }),
  );

  // Add-task modes: single ("one at a time") vs bulk ("add several")
  const [addMode, setAddMode] = useState<"single" | "bulk">("single");
  const [bulkText, setBulkText] = useState("");
  // Which section new tasks go into (only surfaced when >1 section exists)
  const [targetProcessId, setTargetProcessId] = useState<string>("");
  const quickAddTitleRef = React.useRef<HTMLInputElement>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const dndSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleTaskDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const parseId = (sid: string) => {
      const lastDash = String(sid).lastIndexOf('-');
      if (lastDash === -1) return { processId: '', index: -1 };
      return {
        processId: String(sid).slice(0, lastDash),
        index: parseInt(String(sid).slice(lastDash + 1), 10) || 0,
      };
    };
    const from = parseId(active.id as string);
    const to = parseId(over.id as string);
    if (from.processId && to.processId && from.processId === to.processId) {
      reorderTasksInProcess(from.processId, from.index, to.index);
    }
  };

  // Create/Update template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (templateData: TaskTemplate) => {
      const url = template?.id
        ? `${API_BASE}/scheduling/task-templates/${template.id}/`
        : `${API_BASE}/scheduling/task-templates/`;

      const method = template?.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(templateData),
      });

      // Safely parse JSON if available, otherwise read text
      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');

      if (!response.ok) {
        let message = t("process.form.save_failed_http", { status: response.status });
        if (isJson) {
          try {
            const errorData = await response.json();
            if (errorData && typeof errorData === 'object' && !Array.isArray(errorData)) {
              const parts: string[] = [];
              for (const [field, errs] of Object.entries(errorData)) {
                const msgs = Array.isArray(errs) ? errs.join(', ') : String(errs);
                parts.push(`${field}: ${msgs}`);
              }
              if (parts.length > 0) {
                message = parts.join('; ');
              } else if (errorData.detail || errorData.message) {
                message = errorData.detail || errorData.message;
              }
            }
          } catch {
            // ignore JSON parse errors
          }
        } else {
          try {
            const text = await response.text();
            if (text.startsWith('<!DOCTYPE') || text.includes('<html')) {
              message = response.status === 401
                ? t('process.form.unauthorized')
                : t('process.form.html_response');
            }
          } catch {
            // ignore text read errors
          }
        }
        throw new Error(message);
      }

      if (isJson) {
        try {
          return await response.json();
        } catch {
          // fall through to text
        }
      }
      try {
        const text = await response.text();
        return { _raw: text } as unknown as TaskTemplate;
      } catch {
        return {} as TaskTemplate;
      }
    },
    onSuccess: async (resp: TaskTemplate | undefined) => {
      toast.success(template?.id ? t('process.form.updated_ok') : t('process.form.created_ok'));
      // In-app only - do NOT WhatsApp-blast the whole team. That polluted the
      // dashboard "Messages to staff" feed with failed "A process has been
      // created…" rows and burned Meta's messaging window.
      try {
        const token = localStorage.getItem('access_token') || '';
        const tplName = (resp?.name ?? formData.name ?? t('process.form.process_fallback'));
        await api.createAnnouncement(
          token,
          {
            title: t('process.form.announce_title', { name: tplName }),
            message: template?.id ? t('process.form.announce_updated') : t('process.form.announce_created'),
            priority: 'MEDIUM',
            tags: ['template_update'],
          },
          undefined,
          ['app'],
        );
      } catch {
        // ignore announcement errors
      }
      await queryClient.invalidateQueries({ queryKey: ['weekly-schedule'] });
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message);
      console.error('Save error:', error);
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('process.form.err_name');
    }

    if (!formData.description.trim()) {
      newErrors.description = t('process.form.err_description');
    }

    // Validate processes exist and are not empty
    if (processes.length === 0) {
      newErrors.tasks = t('process.form.err_tasks');
    }

    processes.forEach((p, pIndex) => {
      if (!p.name.trim()) {
        newErrors[`process_${p.id}_name`] = t('process.form.err_name');
      }
      if (p.tasks.length === 0) {
        newErrors[`process_${p.id}_tasks`] = t('process.form.err_process_tasks');
      }
      p.tasks.forEach((task, tIndex) => {
        if (!task.title.trim()) {
          newErrors[`process_${p.id}_task_${tIndex}_title`] = t('process.form.err_task_title');
        }
      });
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error(t('process.form.fix_errors'));
      return;
    }

    // Flatten hierarchical tasks to match backend payload (preserve branch tree)
    const flattenedTasks: TemplateTask[] = processes.flatMap((p) =>
      p.tasks.map((t) => normalizeTask(t)),
    );
    saveTemplateMutation.mutate({
      ...formData,
      tasks: flattenedTasks,
      standing_assignees: formData.standing_assignees || [],
      schedule_days: formData.schedule_days ?? [],
      schedule_time: formData.schedule_time?.slice(0, 5) || null,
      audience: audienceIsEmpty(groupAudience) ? null : { ...groupAudience, people: [] },
      schedule_month_day: showMonthDay ? (formData.schedule_month_day ?? 1) : null,
    });
  };


  // Process/task operations for hierarchical structure
  const genProcessId = () =>
    `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const addProcess = (name?: string) => {
    const id = genProcessId();
    const color = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'][processes.length % 5];
    setProcesses(prev => [...prev, { id, name: name || t('process.form.new_section'), color, tasks: [] }]);
    setOpenAccordionIds(prev => [...prev, id]);
    setTargetProcessId(id);
    return id;
  };

  const updateProcessName = (id: string, name: string) => {
    setProcesses(prev => prev.map(p => (p.id === id ? { ...p, name } : p)));
  };

  const removeProcess = (id: string) => {
    setProcesses(prev => prev.filter(p => p.id !== id));
    setTargetProcessId(prev => (prev === id ? "" : prev));
  };

  /**
   * Core add: append tasks to the chosen section, auto-creating a default
   * "General" section when none exists so users never have to think about
   * grouping for the simple case.
   */
  const addTasksToTarget = (
    items: { title: string; description?: string }[],
  ) => {
    const clean = items
      .map((i) => ({ title: i.title.trim(), description: (i.description || "").trim() }))
      .filter((i) => i.title);
    if (clean.length === 0) {
      toast.error(t("generic.toast.task_title_is_required"));
      return 0;
    }
    const newTasks = clean.map((c) =>
      normalizeTask({ id: newTaskId(), title: c.title, description: c.description }),
    );

    // Resolve target synchronously from current render state
    const existingTarget =
      targetProcessId && processes.some((p) => p.id === targetProcessId)
        ? targetProcessId
        : processes[0]?.id || "";
    const resolvedId = existingTarget || "general";

    setProcesses((prev) => {
      const base =
        prev.length > 0
          ? prev
          : [{ id: "general", name: "General", color: "#0ea5e9", tasks: [] as TemplateTask[] }];
      const targetId =
        targetProcessId && base.some((p) => p.id === targetProcessId)
          ? targetProcessId
          : base[0].id;
      return base.map((p) =>
        p.id === targetId ? { ...p, tasks: [...p.tasks, ...newTasks] } : p,
      );
    });
    setOpenAccordionIds((o) => (o.includes(resolvedId) ? o : [...o, resolvedId]));
    // Auto-expand newly added tasks so the manager can tweak them immediately
    setExpandedTaskIds((prev) => {
      const next = new Set(prev);
      newTasks.forEach((t) => next.add(t.id));
      return next;
    });
    return newTasks.length;
  };

  const handleQuickAddSingle = () => {
    const added = addTasksToTarget([{ title: newTask.title, description: newTask.description }]);
    if (added > 0) {
      setNewTask(normalizeTask({ title: "", description: "" }));
      quickAddTitleRef.current?.focus();
    }
  };

  const handleBulkAdd = () => {
    // One task per line. Optional "Title | description".
    const items = bulkText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [title, ...rest] = line.split("|");
        return { title: title.trim(), description: rest.join("|").trim() };
      });
    if (items.length === 0) {
      toast.error(t("generic.toast.type_at_least_one_task_one_per_line"));
      return;
    }
    const added = addTasksToTarget(items);
    if (added > 0) {
      toast.success(added === 1 ? t("process.form.added_task_one") : t("process.form.added_task_other", { count: added }));
      setBulkText("");
    }
  };

  const updateTaskInProcess = (
    processId: string,
    index: number,
    field: keyof TemplateTask,
    value: TemplateTask[keyof TemplateTask],
  ) => {
    setProcesses(prev => prev.map(p => (
      p.id === processId
        ? { ...p, tasks: p.tasks.map((t, i) => (i === index ? { ...t, [field]: value } : t)) }
        : p
    )));
  };

  const setBranchAction = (
    processId: string,
    index: number,
    answer: "yes" | "no",
    action: BranchAction,
  ) => {
    setProcesses((prev) =>
      prev.map((p) => {
        if (p.id !== processId) return p;
        return {
          ...p,
          tasks: p.tasks.map((t, i) => {
            if (i !== index) return t;
            return {
              ...t,
              response_type: "yes_no",
              branches: {
                ...defaultBranches(),
                ...t.branches,
                [answer]: action,
              },
            };
          }),
        };
      }),
    );
  };

  const removeTaskFromProcess = (processId: string, index: number) => {
    setProcesses(prev => prev.map(p => (
      p.id === processId ? { ...p, tasks: p.tasks.filter((_, i) => i !== index) } : p
    )));
  };

  const moveTaskWithinProcess = (processId: string, index: number, direction: 'up' | 'down') => {
    setProcesses(prev => prev.map(p => {
      if (p.id !== processId) return p;
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= p.tasks.length) return p;
      const tasks = [...p.tasks];
      [tasks[index], tasks[newIndex]] = [tasks[newIndex], tasks[index]];
      return { ...p, tasks };
    }));
  };

  const reorderTasksInProcess = (processId: string, oldIndex: number, newIndex: number) => {
    if (oldIndex === newIndex) return;
    setProcesses(prev => prev.map(p => {
      if (p.id !== processId) return p;
      const tasks = arrayMove(p.tasks, oldIndex, newIndex);
      return { ...p, tasks };
    }));
  };

  const moveTaskAcrossProcesses = (fromId: string, toId: string, index: number) => {
    if (fromId === toId) return;
    setProcesses(prev => {
      const from = prev.find(p => p.id === fromId);
      const to = prev.find(p => p.id === toId);
      if (!from || !to) return prev;
      const task = from.tasks[index];
      const newFrom = { ...from, tasks: from.tasks.filter((_, i) => i !== index) };
      const newTo = { ...to, tasks: [...to.tasks, task] };
      return prev.map(p => (p.id === fromId ? newFrom : p.id === toId ? newTo : p));
    });
  };

  const toggleTaskSelection = (processId: string, index: number) => {
    setSelectedTasks(prev => {
      const set = new Set(prev[processId] || []);
      if (set.has(index)) set.delete(index); else set.add(index);
      return { ...prev, [processId]: set };
    });
  };

  const bulkDeleteSelected = (processId: string) => {
    const selected = selectedTasks[processId];
    if (!selected || selected.size === 0) return;
    setProcesses(prev => prev.map(p => (
      p.id === processId ? { ...p, tasks: p.tasks.filter((_, i) => !selected.has(i)) } : p
    )));
    setSelectedTasks(prev => ({ ...prev, [processId]: new Set() }));
  };

  // Handler for dropdown changes with proper typing
  const showScheduleDays =
    formData.frequency === 'DAILY' ||
    formData.frequency === 'WEEKLY' ||
    formData.frequency === 'CUSTOM';

  const showMonthDay =
    formData.frequency === 'MONTHLY' ||
    formData.frequency === 'QUARTERLY' ||
    formData.frequency === 'ANNUALLY';

  const toggleScheduleDay = (day: number) => {
    setFormData((prev) => {
      const current = prev.schedule_days ?? [];
      const next = current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day].sort((a, b) => a - b);
      return { ...prev, schedule_days: next };
    });
  };

  const handleDropdownChange = (field: keyof TaskTemplate) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const renderAssigneePicker = (
    processId: string,
    taskIndex: number,
    answer: "yes" | "no",
    action: BranchAction,
  ) => {
    const selected = action.assignees || [];
    return (
      <BranchAlertAssigneeSelect
        selectedIds={selected}
        staffOptions={staffOptions}
        onChange={(ids) =>
          setBranchAction(processId, taskIndex, answer, { ...action, type: "alert", assignees: ids })
        }
      />
    );
  };

  const renderBranchRow = (
    processId: string,
    taskIndex: number,
    task: TemplateTask,
    answer: "yes" | "no",
  ) => {
    const action = task.branches?.[answer] || { type: "next" as BranchActionType };
    const label = answer === "yes" ? t("common.yes") : t("common.no");
    const tone =
      answer === "yes"
        ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/30"
        : "border-rose-200 bg-rose-50/70 dark:border-rose-900/50 dark:bg-rose-950/30";
    const badgeTone =
      answer === "yes"
        ? "bg-emerald-600 text-white"
        : "bg-rose-600 text-white";
    const gotoOptions: DropdownOption[] = allTaskOptions
      .filter((o) => o.id !== task.id)
      .map((o) => ({
        value: o.id,
        label: o.processName ? `${o.label} (${o.processName})` : o.label,
      }));

    return (
      <div
        className={cn(
          "flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border px-3 py-2.5",
          tone,
        )}
      >
        <div className="flex items-center gap-2 shrink-0 min-w-[4.5rem]">
          <span className={cn("inline-flex h-6 min-w-[2.25rem] items-center justify-center rounded-md px-2 text-xs font-bold", badgeTone)}>
            {label}
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
        </div>
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
          <AccessibleDropdown
            id={`branch_${processId}_${taskIndex}_${answer}_type`}
            ariaLabel={t("process.form.branch_action_aria", { label })}
            value={action.type}
            onChange={(value) => {
              const type = value as BranchActionType;
              const next: BranchAction = { type };
              if (type === "goto") {
                next.task_id = action.task_id || gotoOptions[0]?.value;
              }
              if (type === "alert") {
                next.message = action.message || t("process.form.needs_attention");
              }
              setBranchAction(processId, taskIndex, answer, next);
            }}
            options={branchActionOptions}
            placeholder={t("process.form.what_next")}
          />
          {action.type === "goto" ? (
            <AccessibleDropdown
              id={`branch_${processId}_${taskIndex}_${answer}_goto`}
              ariaLabel={t("process.form.branch_jump_aria", { label })}
              value={action.task_id || ""}
              onChange={(value) =>
                setBranchAction(processId, taskIndex, answer, { type: "goto", task_id: value })
              }
              options={
                gotoOptions.length > 0
                  ? gotoOptions
                  : [{ value: "", label: t("process.form.add_task_first") }]
              }
              placeholder={t("process.form.choose_task")}
            />
          ) : action.type === "alert" ? (
            <div className="flex flex-col gap-2">
              <Input
                value={action.message || ""}
                onChange={(e) =>
                  setBranchAction(processId, taskIndex, answer, {
                    ...action,
                    type: "alert",
                    message: e.target.value,
                  })
                }
                placeholder={t("process.form.manager_note")}
                aria-label={t("process.form.branch_alert_aria", { label })}
              />
              {renderAssigneePicker(processId, taskIndex, answer, action)}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground self-center px-1">
              {action.type === "next"
                ? t("process.form.next_hint")
                : t("process.form.end_hint")}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            {t("process.form.basic_info")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("process.form.name_label")}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t("process.form.name_placeholder")}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="template_type">{t("process.form.template_type")}</Label>
              <AccessibleDropdown
                id="template_type"
                ariaLabel={t("process.form.template_type")}
                value={formData.template_type}
                onChange={handleDropdownChange('template_type')}
                options={templateTypeOptions}
                placeholder={t("process.form.template_type_placeholder")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("process.form.description_label")}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder={t("process.form.description_placeholder")}
              rows={3}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="frequency">{t("process.form.frequency")}</Label>
              <AccessibleDropdown
                id="frequency"
                ariaLabel={t("process.form.frequency")}
                value={formData.frequency}
                onChange={handleDropdownChange('frequency')}
                options={frequencyOptions}
                placeholder={t("common.select_frequency")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority_level">{t("process.form.priority_level")}</Label>
              <AccessibleDropdown
                id="priority_level"
                ariaLabel={t("process.form.priority_level")}
                value={formData.priority_level}
                onChange={handleDropdownChange('priority_level')}
                options={priorityOptions}
                placeholder={t("common.select_priority")}
                renderOption={(opt: DropdownOption) => {
                  const color = getPriorityColor(opt.value);
                  return (
                    <div className="flex items-center gap-2">
                      <Badge className={color}>{opt.label}</Badge>
                    </div>
                  );
                }}
                renderTriggerValue={(selected) => {
                  if (!selected) return <span className="text-muted-foreground">{t("common.select_priority")}</span>;
                  const color = getPriorityColor(selected.value);
                  return <Badge className={color}>{selected.label}</Badge>;
                }}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_critical"
                  checked={formData.is_critical}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_critical: checked }))}
                />
                <Label htmlFor="is_critical" className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  {t("process.form.critical")}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">{t("common.active")}</Label>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-border/60">
            <div>
              <Label htmlFor="schedule_time">{t('process.schedule.start_time')}</Label>
              <Input
                id="schedule_time"
                type="time"
                className="max-w-[10rem] mt-1"
                value={formData.schedule_time?.slice(0, 5) || '09:00'}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, schedule_time: e.target.value || '09:00' }))
                }
              />
              <p className="text-xs text-muted-foreground mt-1">{t('process.schedule.start_time_help')}</p>
            </div>

            {showScheduleDays && (
              <div className="space-y-2">
                <Label>{t('process.schedule.days_label')}</Label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAY_KEYS.map(({ value, labelKey }) => {
                    const selected = (formData.schedule_days ?? []).includes(value);
                    return (
                      <Button
                        key={value}
                        type="button"
                        size="sm"
                        variant={selected ? 'default' : 'outline'}
                        className={cn('min-w-[3rem]', selected && 'bg-emerald-600 hover:bg-emerald-700')}
                        onClick={() => toggleScheduleDay(value)}
                      >
                        {t(labelKey)}
                      </Button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">{t('process.schedule.days_help')}</p>
              </div>
            )}

            {showMonthDay && (
              <div className="space-y-1">
                <Label htmlFor="schedule_month_day">{t('process.schedule.month_day')}</Label>
                <select
                  id="schedule_month_day"
                  className="mt-1 flex h-10 w-full max-w-[10rem] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={String(formData.schedule_month_day ?? 1)}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, schedule_month_day: Number(e.target.value) }))
                  }
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                  <option value={-1}>{t('task_sched.last_day')}</option>
                </select>
                <p className="text-xs text-muted-foreground">{t('process.schedule.month_day_help')}</p>
              </div>
            )}
            {!showScheduleDays && !showMonthDay && (
              <p className="text-xs text-muted-foreground">{t('process.schedule.monthly_hint')}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Standing assignees - quiet, optional */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Users className="h-4 w-4 text-muted-foreground" />
            {t("process.form.who_title")}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {t("process.form.who_desc_prefix")}{" "}
            <span className="font-medium">start checklist</span>{" "}
            {t("process.form.who_desc_suffix")}
          </p>
        </CardHeader>
        <CardContent>
          <ProcessAssigneeMultiSelect
            selectedIds={formData.standing_assignees || []}
            staffOptions={staffOptions}
            onChange={(ids) => setFormData((prev) => ({ ...prev, standing_assignees: ids }))}
            popoverHint={t("process.form.assignee_hint")}
          />
          <div className="mt-4 space-y-2 border-t border-border/60 pt-4">
            <p className="text-sm font-medium">{t('process.audience.groups_title')}</p>
            <p className="text-xs text-muted-foreground">{t('process.audience.groups_help')}</p>
            <AudiencePicker hidePeople value={groupAudience} onChange={setGroupAudience} />
          </div>
        </CardContent>
      </Card>

      {/* Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            <GitBranch className="h-5 w-5 text-teal-600" />
            {t("process.form.tasks_title", { count: processes.reduce((sum, p) => sum + p.tasks.length, 0) })}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {t("process.form.tasks_hint_prefix")} <span className="font-semibold text-emerald-700 dark:text-emerald-400">{t("common.yes")}</span> {t("process.form.tasks_hint_or")}{" "}
            <span className="font-semibold text-rose-700 dark:text-rose-400">{t("common.no")}</span>{t("process.form.tasks_hint_suffix")}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add tasks panel - one at a time or several at once */}
          <div className="rounded-xl border border-teal-200 dark:border-teal-900/50 bg-teal-50/50 dark:bg-teal-950/20 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex rounded-lg border border-teal-200 dark:border-teal-800 bg-card p-0.5">
                <button
                  type="button"
                  onClick={() => setAddMode("single")}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    addMode === "single"
                      ? "bg-teal-600 text-white"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
                  )}
                >
                  {t("process.form.one_at_a_time")}
                </button>
                <button
                  type="button"
                  onClick={() => setAddMode("bulk")}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    addMode === "bulk"
                      ? "bg-teal-600 text-white"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
                  )}
                >
                  {t("process.form.add_several")}
                </button>
              </div>
            </div>

            {addMode === "single" ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-5">
                  <Label htmlFor="quick_task_title">{t("process.form.task_title_label")}</Label>
                  <Input
                    id="quick_task_title"
                    ref={quickAddTitleRef}
                    value={newTask.title}
                    onChange={(e) => setNewTask((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder={t("process.form.task_title_placeholder")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleQuickAddSingle();
                      }
                    }}
                  />
                </div>
                <div className="md:col-span-5">
                  <Label htmlFor="quick_task_desc">{t("common.description")}</Label>
                  <Input
                    id="quick_task_desc"
                    value={newTask.description}
                    onChange={(e) => setNewTask((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder={t("process.form.optional_details")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleQuickAddSingle();
                      }
                    }}
                  />
                </div>
                <div className="md:col-span-2">
                  <Button type="button" onClick={handleQuickAddSingle} className="w-full">
                    <Plus className="h-4 w-4 mr-1" /> {t("process.form.add_task")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="bulk_tasks">{t("process.form.bulk_label")}</Label>
                <Textarea
                  id="bulk_tasks"
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={t("process.form.bulk_placeholder")}
                  rows={4}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleBulkAdd();
                    }
                  }}
                />
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {t("process.form.tip_prefix")} <code className="px-1 rounded bg-slate-200 dark:bg-slate-800">{t("process.form.tip_format")}</code> {t("process.form.tip_suffix")}
                  </p>
                  <Button type="button" onClick={handleBulkAdd}>
                    <Plus className="h-4 w-4 mr-1" />
                    {t("process.form.add_n_tasks", { n: bulkText.split("\n").map((l) => l.trim()).filter(Boolean).length || "" })}
                  </Button>
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {t("process.form.default_flow")} <span className="font-medium text-emerald-700 dark:text-emerald-400">{t("process.form.yes_next")}</span>
              {" · "}
              <span className="font-medium text-rose-700 dark:text-rose-400">{t("process.form.no_flag")}</span>{t("process.form.adjust_below")}
            </p>
          </div>

          {/* Search + bulk delete toolbar */}
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="relative w-full md:w-1/2">
              <Input
                placeholder={t("staff.requests.search_tasks")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                aria-label={t("process.form.search_tasks_aria")}
              />
              <SearchIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {flatTasks.length > 0 && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setExpandedTaskIds(new Set(flatTasks.map((f) => f.task.id)))
                    }
                  >
                    {t("process.form.expand_all")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedTaskIds(new Set())}
                  >
                    {t("process.form.collapse_all")}
                  </Button>
                </>
              )}
              {flatTasks.some((f) => selectedTasks[f.processId]?.has(f.index)) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => processes.forEach((p) => bulkDeleteSelected(p.id))}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> {t("process.form.delete_selected")}
                </Button>
              )}
            </div>
          </div>

          {/* Single flat, ordered list of all tasks */}
          {flatTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FolderMinus className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t("process.form.no_tasks")}</p>
            </div>
          ) : (
            <DndContext
              sensors={dndSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleTaskDragEnd}
            >
              <SortableContext
                items={flatTasks.map((f) => `${f.processId}-${f.index}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {flatTasks.map((f, ordinal) => {
                    const { task, processId, index } = f;
                    const isExpanded = expandedTaskIds.has(task.id);
                    return (
                      <SortableTaskCard key={task.id || `${processId}-${index}`} id={`${processId}-${index}`}>
                        {({ setNodeRef, style, attributes, listeners }) => (
                          <div ref={setNodeRef} style={style}>
                            <Card className="border-l-4 overflow-hidden" style={{ borderLeftColor: "#0ea5e9" }}>
                              <CardContent className={isExpanded ? "pt-4 space-y-4" : "py-3 px-4"}>
                                {/* Collapsible header */}
                                <div className="flex gap-2 items-center min-w-0">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 shrink-0"
                                    onClick={() => toggleTaskExpanded(task.id)}
                                    aria-expanded={isExpanded}
                                    aria-label={isExpanded ? t("process.form.collapse_task") : t("process.form.expand_task")}
                                  >
                                    <ChevronDown
                                      className={`h-4 w-4 transition-transform ${isExpanded ? "" : "-rotate-90"}`}
                                    />
                                  </Button>
                                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-white text-xs font-bold shrink-0">
                                    {ordinal + 1}
                                  </span>
                                  <Checkbox
                                    checked={!!selectedTasks[processId]?.has(index)}
                                    onCheckedChange={() => toggleTaskSelection(processId, index)}
                                    aria-label={t("process.form.select_task")}
                                    className="shrink-0"
                                  />
                                  {isExpanded ? (
                                    <div className="flex-1 min-w-0" />
                                  ) : (
                                    <button
                                      type="button"
                                      className="flex-1 min-w-0 text-left"
                                      onClick={() => toggleTaskExpanded(task.id)}
                                    >
                                      <p className="text-sm font-medium truncate text-slate-900 dark:text-slate-100">
                                        {task.title?.trim() || t("process.form.untitled_task")}
                                      </p>
                                      {task.description?.trim() ? (
                                        <p className="text-xs text-muted-foreground truncate">
                                          {task.description}
                                        </p>
                                      ) : null}
                                    </button>
                                  )}
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 cursor-grab active:cursor-grabbing"
                                      {...attributes}
                                      {...listeners}
                                      aria-label={t("process.form.drag_reorder")}
                                    >
                                      <GripVertical className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeTaskFromProcess(processId, index)}
                                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                      aria-label={t("process.form.delete_task")}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>

                                {isExpanded && (
                                  <>
                                    <div className="flex gap-3 items-start pl-1">
                                      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 min-w-0">
                                        <div className="md:col-span-5">
                                          <Label htmlFor={`task_${processId}_${index}_title`}>{t("process.form.title_label")}</Label>
                                          <Input
                                            id={`task_${processId}_${index}_title`}
                                            value={task.title}
                                            onChange={(e) => updateTaskInProcess(processId, index, 'title', e.target.value)}
                                            className={errors[`process_${processId}_task_${index}_title`] ? 'border-red-500' : ''}
                                          />
                                          {errors[`process_${processId}_task_${index}_title`] && (
                                            <p className="text-sm text-red-500">{errors[`process_${processId}_task_${index}_title`]}</p>
                                          )}
                                        </div>
                                        <div className="md:col-span-7">
                                          <Label htmlFor={`task_${processId}_${index}_description`}>{t("common.description")}</Label>
                                          <Input
                                            id={`task_${processId}_${index}_description`}
                                            value={task.description || ''}
                                            onChange={(e) => updateTaskInProcess(processId, index, 'description', e.target.value)}
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 px-3 py-2">
                                      <div className="flex items-start gap-2 min-w-0">
                                        <Camera className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                        <div className="min-w-0">
                                          <p className="text-sm font-medium">{t("process.form.photo_title")}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {t("process.form.photo_desc")}
                                          </p>
                                        </div>
                                      </div>
                                      <Switch
                                        checked={!!task.requires_photo}
                                        onCheckedChange={(checked) => {
                                          setProcesses((prev) =>
                                            prev.map((p) => {
                                              if (p.id !== processId) return p;
                                              const tasks = [...p.tasks];
                                              const cur = tasks[index];
                                              if (!cur) return p;
                                              tasks[index] = {
                                                ...cur,
                                                requires_photo: checked,
                                                verification_required: checked,
                                                verification_type: checked ? "PHOTO" : "NONE",
                                              };
                                              return { ...p, tasks };
                                            }),
                                          );
                                        }}
                                        aria-label={t("process.form.photo_aria")}
                                      />
                                    </div>

                                    {/* Yes / No condition flow */}
                                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40 p-3 space-y-2">
                                      <div className="flex items-center gap-2 mb-1">
                                        <GitBranch className="h-4 w-4 text-teal-600" />
                                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                          {t("process.form.condition_flow")}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          {t("process.form.condition_flow_hint")}
                                        </span>
                                      </div>
                                      {renderBranchRow(processId, index, task, "yes")}
                                      {renderBranchRow(processId, index, task, "no")}
                                    </div>
                                  </>
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </SortableTaskCard>
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {errors.tasks && <p className="text-sm text-red-500">{errors.tasks}</p>}
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button
          type="submit"
          disabled={saveTemplateMutation.isPending}
          className="premium-button"
        >
          {saveTemplateMutation.isPending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {template?.id ? t('process.form.updating') : t('schedule.creating')}
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              {template?.id ? t('process.form.update_process') : t('processes.create_process')}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}