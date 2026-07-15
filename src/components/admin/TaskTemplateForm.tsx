// components/tasks/TaskTemplateForm.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  Check as CheckIcon,
  X as XIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE, api } from "@/lib/api";
import { cn } from "@/lib/utils";

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

interface StaffOption {
  id: string;
  name: string;
  role?: string;
}

interface TemplateTask {
  id: string;
  title: string;
  description?: string;
  /** Kept for backward compatibility with existing templates / imports */
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  estimated_duration?: number;
  response_type?: "yes_no" | "check";
  /** After Yes, Miya asks staff to send a photo as proof before continuing */
  requires_photo?: boolean;
  verification_type?: "NONE" | "PHOTO";
  verification_required?: boolean;
  branches?: {
    yes?: BranchAction;
    no?: BranchAction;
  };
}

const BRANCH_ACTION_OPTIONS: DropdownOption[] = [
  { value: "next", label: "Continue to next task" },
  { value: "goto", label: "Jump to another task" },
  { value: "end", label: "End this process" },
  { value: "alert", label: "Flag for manager, then continue" },
];

const newTaskId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const defaultBranches = (): NonNullable<TemplateTask["branches"]> => ({
  yes: { type: "next" },
  no: { type: "alert", message: "Needs attention" },
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
      no: t.branches?.no || { type: "alert", message: "Needs attention" },
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
}

interface TaskTemplateFormProps {
  template?: TaskTemplate;
  onSuccess: () => void;
  onCancel: () => void;
}

const templateTypes: DropdownOption[] = [
  { value: 'CLEANING', label: 'Daily Restaurant Cleaning Schedule' },
  { value: 'TEMPERATURE', label: 'Daily Temperature Log' },
  { value: 'OPENING', label: 'Restaurant Manager Opening Checklist' },
  { value: 'CLOSING', label: 'Restaurant Manager Closing Checklist' },
  { value: 'HEALTH', label: 'Monthly Health and Safety Inspection' },
  { value: 'SOP', label: 'Standard Operating Procedure' },
  { value: 'MAINTENANCE', label: 'Equipment Maintenance' },
  { value: 'COMPLIANCE', label: 'Compliance Check' },
  { value: 'SAFETY', label: 'Safety Protocol' },
  { value: 'QUALITY', label: 'Quality Control' },
  { value: 'CUSTOM', label: 'Custom Template' },
];

const frequencies: DropdownOption[] = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'ANNUALLY', label: 'Annually' },
  { value: 'CUSTOM', label: 'Custom' },
];

const priorities: DropdownOption[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
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
  });

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

  // Staff list for "flag for manager" assignee picker
  const { data: staffOptions = [] } = useQuery<StaffOption[]>({
    queryKey: ["task-template-staff"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/staff/?page_size=500`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!response.ok) throw new Error("Failed to fetch staff");
      const json = await response.json();
      const arr = (json?.results ?? json) as Record<string, unknown>[];
      return (Array.isArray(arr) ? arr : []).map((s) => {
        const nested = (s.user as Record<string, unknown>) || {};
        const id = String(s.id ?? nested.id ?? "");
        const first = String(s.first_name ?? nested.first_name ?? "");
        const last = String(s.last_name ?? nested.last_name ?? "");
        const email = String(s.email ?? nested.email ?? "");
        const name = `${first} ${last}`.trim() || email || "Staff member";
        return { id, name, role: (s.role as string) || undefined } satisfies StaffOption;
      }).filter((s) => s.id);
    },
  });

  const staffNameById = useMemo(() => {
    const m = new Map<string, string>();
    staffOptions.forEach((s) => m.set(s.id, s.name));
    return m;
  }, [staffOptions]);

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
      p.tasks.map((t) => ({
        id: t.id,
        label: t.title.trim() || "Untitled task",
        processName: p.name,
      })),
    );
  }, [processes]);

  // Selection map for bulk operations
  const [selectedTasks, setSelectedTasks] = useState<Record<string, Set<number>>>({});

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
        let message = `Failed to save process (HTTP ${response.status})`;
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
                ? 'Unauthorized. Please log in again.'
                : 'Server returned HTML instead of JSON.';
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
      toast.success(template?.id ? 'Process updated successfully' : 'Process created successfully');
      // In-app only — do NOT WhatsApp-blast the whole team. That polluted the
      // dashboard "Messages to staff" feed with failed "A process has been
      // created…" rows and burned Meta's messaging window.
      try {
        const token = localStorage.getItem('access_token') || '';
        const tplName = (resp?.name ?? formData.name ?? 'Process');
        await api.createAnnouncement(
          token,
          {
            title: `Process updated: ${tplName}`,
            message: `A process has been ${template?.id ? 'updated' : 'created'} and is available to use.`,
            priority: 'MEDIUM',
            tags: ['template_update'],
          },
          undefined,
          ['app'],
        );
      } catch {
        // ignore announcement errors
      }
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
      newErrors.name = 'Process name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Process description is required';
    }

    // Validate processes exist and are not empty
    if (processes.length === 0) {
      newErrors.tasks = 'Add at least one process with tasks';
    }

    processes.forEach((p, pIndex) => {
      if (!p.name.trim()) {
        newErrors[`process_${p.id}_name`] = 'Process name is required';
      }
      if (p.tasks.length === 0) {
        newErrors[`process_${p.id}_tasks`] = 'Each process must have at least one task';
      }
      p.tasks.forEach((t, tIndex) => {
        if (!t.title.trim()) {
          newErrors[`process_${p.id}_task_${tIndex}_title`] = 'Task title is required';
        }
      });
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the form errors');
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
    });
  };

  const toggleStandingAssignee = (staffId: string) => {
    setFormData((prev) => {
      const current = prev.standing_assignees || [];
      const next = current.includes(staffId)
        ? current.filter((id) => id !== staffId)
        : [...current, staffId];
      return { ...prev, standing_assignees: next };
    });
  };

  // Process/task operations for hierarchical structure
  const genProcessId = () =>
    `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const addProcess = (name?: string) => {
    const id = genProcessId();
    const color = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'][processes.length % 5];
    setProcesses(prev => [...prev, { id, name: name || 'New section', color, tasks: [] }]);
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
      toast.error("Task title is required");
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
      toast.error("Type at least one task (one per line)");
      return;
    }
    const added = addTasksToTarget(items);
    if (added > 0) {
      toast.success(`Added ${added} task${added === 1 ? "" : "s"}`);
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
  const handleDropdownChange = (field: keyof TaskTemplate) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleAssignee = (
    processId: string,
    taskIndex: number,
    answer: "yes" | "no",
    action: BranchAction,
    staffId: string,
  ) => {
    const current = action.assignees || [];
    const next = current.includes(staffId)
      ? current.filter((id) => id !== staffId)
      : [...current, staffId];
    setBranchAction(processId, taskIndex, answer, { ...action, type: "alert", assignees: next });
  };

  const renderAssigneePicker = (
    processId: string,
    taskIndex: number,
    answer: "yes" | "no",
    action: BranchAction,
  ) => {
    const selected = action.assignees || [];
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-dashed"
            >
              <Users className="h-3.5 w-3.5" />
              {selected.length > 0
                ? `Assigned to ${selected.length}`
                : "Assign to people"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0 z-[3100]" align="start">
            <div className="px-3 py-2 border-b text-xs text-muted-foreground">
              Notify specific people (leave empty for managers)
            </div>
            <div className="max-h-60 overflow-y-auto py-1">
              {staffOptions.length === 0 ? (
                <p className="px-3 py-3 text-sm text-muted-foreground">No staff found.</p>
              ) : (
                staffOptions.map((s) => {
                  const isSel = selected.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleAssignee(processId, taskIndex, answer, action, s.id)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                    >
                      <span className="min-w-0 truncate">
                        {s.name}
                        {s.role ? (
                          <span className="text-muted-foreground"> · {s.role}</span>
                        ) : null}
                      </span>
                      {isSel && <CheckIcon className="h-4 w-4 text-emerald-600 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </PopoverContent>
        </Popover>
        {selected.map((id) => (
          <Badge
            key={id}
            variant="secondary"
            className="gap-1 pl-2 pr-1 py-0.5 text-xs font-medium"
          >
            {staffNameById.get(id) || "Unknown"}
            <button
              type="button"
              onClick={() => toggleAssignee(processId, taskIndex, answer, action, id)}
              className="rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5"
              aria-label={`Remove ${staffNameById.get(id) || "assignee"}`}
            >
              <XIcon className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    );
  };

  const renderBranchRow = (
    processId: string,
    taskIndex: number,
    task: TemplateTask,
    answer: "yes" | "no",
  ) => {
    const action = task.branches?.[answer] || { type: "next" as BranchActionType };
    const label = answer === "yes" ? "Yes" : "No";
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
            ariaLabel={`${label} action`}
            value={action.type}
            onChange={(value) => {
              const type = value as BranchActionType;
              const next: BranchAction = { type };
              if (type === "goto") {
                next.task_id = action.task_id || gotoOptions[0]?.value;
              }
              if (type === "alert") {
                next.message = action.message || "Needs attention";
              }
              setBranchAction(processId, taskIndex, answer, next);
            }}
            options={BRANCH_ACTION_OPTIONS}
            placeholder="What happens next?"
          />
          {action.type === "goto" ? (
            <AccessibleDropdown
              id={`branch_${processId}_${taskIndex}_${answer}_goto`}
              ariaLabel={`${label} jump target`}
              value={action.task_id || ""}
              onChange={(value) =>
                setBranchAction(processId, taskIndex, answer, { type: "goto", task_id: value })
              }
              options={
                gotoOptions.length > 0
                  ? gotoOptions
                  : [{ value: "", label: "Add another task first" }]
              }
              placeholder="Choose task…"
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
                placeholder="Manager note (optional)"
                aria-label={`${label} alert message`}
              />
              {renderAssigneePicker(processId, taskIndex, answer, action)}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground self-center px-1">
              {action.type === "next"
                ? "Staff moves to the next task in order."
                : "Checklist stops after this answer."}
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
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Process Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Daily Cleaning Process"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="template_type">Template Type</Label>
              <AccessibleDropdown
                id="template_type"
                ariaLabel="Template Type"
                value={formData.template_type}
                onChange={handleDropdownChange('template_type')}
                options={templateTypes}
                placeholder="Select template type"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what this process is used for..."
              rows={3}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency</Label>
              <AccessibleDropdown
                id="frequency"
                ariaLabel="Frequency"
                value={formData.frequency}
                onChange={handleDropdownChange('frequency')}
                options={frequencies}
                placeholder="Select frequency"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority_level">Priority Level</Label>
              <AccessibleDropdown
                id="priority_level"
                ariaLabel="Priority Level"
                value={formData.priority_level}
                onChange={handleDropdownChange('priority_level')}
                options={priorities}
                placeholder="Select priority"
                renderOption={(opt: DropdownOption) => {
                  const color = getPriorityColor(opt.value);
                  return (
                    <div className="flex items-center gap-2">
                      <Badge className={color}>{opt.label}</Badge>
                    </div>
                  );
                }}
                renderTriggerValue={(selected) => {
                  if (!selected) return <span className="text-muted-foreground">Select priority</span>;
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
                  Critical Process
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Standing assignees — quiet, optional */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Users className="h-4 w-4 text-muted-foreground" />
            Who can run this
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Optional. These people get this Yes/No checklist after they clock in with Miya —
            even if they are not on today&apos;s schedule.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 border-dashed"
                >
                  <Users className="h-3.5 w-3.5" />
                  {(formData.standing_assignees || []).length > 0
                    ? `${(formData.standing_assignees || []).length} assigned`
                    : "Assign staff"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0 z-[3100]" align="start">
                <div className="px-3 py-2 border-b text-xs text-muted-foreground">
                  Clock in → start checklist. No shift required.
                </div>
                <div className="max-h-60 overflow-y-auto py-1">
                  {staffOptions.length === 0 ? (
                    <p className="px-3 py-3 text-sm text-muted-foreground">No staff found.</p>
                  ) : (
                    staffOptions.map((s) => {
                      const selected = (formData.standing_assignees || []).includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleStandingAssignee(s.id)}
                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                        >
                          <span className="min-w-0 truncate">
                            {s.name}
                            {s.role ? (
                              <span className="text-muted-foreground"> · {s.role}</span>
                            ) : null}
                          </span>
                          {selected && <CheckIcon className="h-4 w-4 text-emerald-600 shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </PopoverContent>
            </Popover>
            {(formData.standing_assignees || []).map((id) => (
              <Badge
                key={id}
                variant="secondary"
                className="gap-1 pl-2 pr-1 py-0.5 text-xs font-medium"
              >
                {staffNameById.get(id) || "Staff"}
                <button
                  type="button"
                  onClick={() => toggleStandingAssignee(id)}
                  className="rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5"
                  aria-label={`Remove ${staffNameById.get(id) || "assignee"}`}
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            <GitBranch className="h-5 w-5 text-teal-600" />
            Tasks ({processes.reduce((sum, p) => sum + p.tasks.length, 0)})
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            For each task, set what happens when staff answers <span className="font-semibold text-emerald-700 dark:text-emerald-400">Yes</span> or{" "}
            <span className="font-semibold text-rose-700 dark:text-rose-400">No</span>.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add tasks panel — one at a time or several at once */}
          <div className="rounded-xl border border-teal-200 dark:border-teal-900/50 bg-teal-50/50 dark:bg-teal-950/20 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex rounded-lg border border-teal-200 dark:border-teal-800 bg-white dark:bg-slate-900 p-0.5">
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
                  One at a time
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
                  Add several
                </button>
              </div>
            </div>

            {addMode === "single" ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-5">
                  <Label htmlFor="quick_task_title">Task Title *</Label>
                  <Input
                    id="quick_task_title"
                    ref={quickAddTitleRef}
                    value={newTask.title}
                    onChange={(e) => setNewTask((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Sweep floors"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleQuickAddSingle();
                      }
                    }}
                  />
                </div>
                <div className="md:col-span-5">
                  <Label htmlFor="quick_task_desc">Description</Label>
                  <Input
                    id="quick_task_desc"
                    value={newTask.description}
                    onChange={(e) => setNewTask((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional details..."
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
                    <Plus className="h-4 w-4 mr-1" /> Add task
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="bulk_tasks">Add several tasks (one per line)</Label>
                <Textarea
                  id="bulk_tasks"
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={"Sweep floors\nWipe down counters\nCheck fridge temperature | Should read below 5°C"}
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
                    Tip: use <code className="px-1 rounded bg-slate-200 dark:bg-slate-800">Title | description</code> to add details. Press ⌘/Ctrl+Enter to add.
                  </p>
                  <Button type="button" onClick={handleBulkAdd}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add {bulkText.split("\n").map((l) => l.trim()).filter(Boolean).length || ""} tasks
                  </Button>
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Default flow per task: <span className="font-medium text-emerald-700 dark:text-emerald-400">Yes → next</span>
              {" · "}
              <span className="font-medium text-rose-700 dark:text-rose-400">No → flag manager</span>. Adjust on each task below.
            </p>
          </div>

          {/* Search + bulk delete toolbar */}
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="relative w-full md:w-1/2">
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                aria-label="Search tasks"
              />
              <SearchIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
            {flatTasks.some((f) => selectedTasks[f.processId]?.has(f.index)) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => processes.forEach((p) => bulkDeleteSelected(p.id))}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Delete selected
              </Button>
            )}
          </div>

          {/* Single flat, ordered list of all tasks */}
          {flatTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FolderMinus className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tasks yet. Type a task above and press Add to get started.</p>
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
                    return (
                      <SortableTaskCard key={task.id || `${processId}-${index}`} id={`${processId}-${index}`}>
                        {({ setNodeRef, style, attributes, listeners }) => (
                          <div ref={setNodeRef} style={style}>
                            <Card className="border-l-4" style={{ borderLeftColor: "#0ea5e9" }}>
                              <CardContent className="pt-4 space-y-4">
                                <div className="flex gap-3 items-start">
                                  <div className="flex flex-col items-center gap-2 pt-1 shrink-0">
                                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-white text-xs font-bold">
                                      {ordinal + 1}
                                    </span>
                                    <Checkbox
                                      checked={!!selectedTasks[processId]?.has(index)}
                                      onCheckedChange={() => toggleTaskSelection(processId, index)}
                                      aria-label="Select task"
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 cursor-grab active:cursor-grabbing"
                                      {...attributes}
                                      {...listeners}
                                    >
                                      <GripVertical className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 min-w-0">
                                    <div className="md:col-span-5">
                                      <Label htmlFor={`task_${processId}_${index}_title`}>Title *</Label>
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
                                    <div className="md:col-span-6">
                                      <Label htmlFor={`task_${processId}_${index}_description`}>Description</Label>
                                      <Input
                                        id={`task_${processId}_${index}_description`}
                                        value={task.description || ''}
                                        onChange={(e) => updateTaskInProcess(processId, index, 'description', e.target.value)}
                                      />
                                    </div>
                                    <div className="md:col-span-1 flex md:justify-end md:items-end">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => removeTaskFromProcess(processId, index)}
                                        className="w-full md:w-auto text-destructive hover:text-destructive"
                                        aria-label="Delete task"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 px-3 py-2">
                                  <div className="flex items-start gap-2 min-w-0">
                                    <Camera className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium">Ask for photo after Yes</p>
                                      <p className="text-xs text-muted-foreground">
                                        Miya will ask for a photo as proof, then continue to the next task.
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
                                    aria-label="Require photo proof after Yes"
                                  />
                                </div>

                                {/* Yes / No condition flow */}
                                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40 p-3 space-y-2">
                                  <div className="flex items-center gap-2 mb-1">
                                    <GitBranch className="h-4 w-4 text-teal-600" />
                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                      Condition flow
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      What happens after Yes or No
                                    </span>
                                  </div>
                                  {renderBranchRow(processId, index, task, "yes")}
                                  {renderBranchRow(processId, index, task, "no")}
                                </div>
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
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={saveTemplateMutation.isPending}
          className="premium-button"
        >
          {saveTemplateMutation.isPending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {template?.id ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              {template?.id ? 'Update Process' : 'Create Process'}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}