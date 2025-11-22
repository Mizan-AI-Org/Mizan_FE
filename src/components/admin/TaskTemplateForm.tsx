// components/tasks/TaskTemplateForm.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
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
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Trash2, 
  GripVertical,
  Clock,
  AlertTriangle,
  CheckCircle,
  Zap,
  Search as SearchIcon,
  FolderPlus,
  FolderMinus
} from 'lucide-react';
import { toast } from 'sonner';

// Prefer the common frontend API base env var, fall back to legacy, then localhost
const API_BASE =
  import.meta.env.VITE_REACT_APP_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:8000/api';

interface TemplateTask {
  title: string;
  description?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  estimated_duration?: number;
}

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
  });

  // New hierarchical state: processes (stations) containing tasks
  const [processes, setProcesses] = useState<ProcessGroup[]>(() => {
    // If editing an existing template that previously had flat tasks,
    // initialize with a single default process to preserve compatibility.
    if (template?.tasks && template.tasks.length > 0) {
      return [{ id: 'default', name: 'General', color: '#0ea5e9', tasks: template.tasks }];
    }
    return [];
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

  // Selection map for bulk operations
  const [selectedTasks, setSelectedTasks] = useState<Record<string, Set<number>>>({});

  const [newTask, setNewTask] = useState<TemplateTask>({
    title: '',
    description: '',
    priority: 'MEDIUM',
    estimated_duration: 30,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

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
        let message = `Failed to save template (HTTP ${response.status})`;
        if (isJson) {
          try {
            const errorData = await response.json();
            // DRF validation errors: {field: ["error", ...], non_field_errors: [...]}
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
            // Detect common auth/HTML responses
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
      // As a fallback, return an empty object or parsed text
      try {
        const text = await response.text();
        return { _raw: text } as unknown as TaskTemplate;
      } catch {
        return {} as TaskTemplate;
      }
    },
    onSuccess: async (resp: any) => {
      toast.success(template?.id ? 'Template updated successfully' : 'Template created successfully');
      try {
        const token = localStorage.getItem('access_token') || '';
        const tplName = (resp?.name || formData.name || 'Template');
        await api.createAnnouncement(token, {
          title: `Template updated: ${tplName}`,
          message: `A template has been ${template?.id ? 'updated' : 'created'} and is available to use.`,
          priority: 'MEDIUM',
          tags: ['template_update']
        });
      } catch {
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
      newErrors.name = 'Template name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Template description is required';
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

    // Flatten hierarchical tasks to match backend payload
    const flattenedTasks: TemplateTask[] = processes.flatMap(p => p.tasks);
    saveTemplateMutation.mutate({ ...formData, tasks: flattenedTasks });
  };

  // Process/task operations for hierarchical structure
  const addProcess = (name?: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const color = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'][processes.length % 5];
    setProcesses(prev => [...prev, { id, name: name || 'New Process', color, tasks: [] }]);
  };

  const updateProcessName = (id: string, name: string) => {
    setProcesses(prev => prev.map(p => (p.id === id ? { ...p, name } : p)));
  };

  const removeProcess = (id: string) => {
    setProcesses(prev => prev.filter(p => p.id !== id));
  };

  const addTaskToProcess = (processId: string) => {
    if (!newTask.title.trim()) {
      toast.error('Task title is required');
      return;
    }
    setProcesses(prev => prev.map(p => (
      p.id === processId ? { ...p, tasks: [...p.tasks, { ...newTask }] } : p
    )));
    setNewTask({ title: '', description: '', priority: 'MEDIUM', estimated_duration: 30 });
  };

  const updateTaskInProcess = (processId: string, index: number, field: keyof TemplateTask, value: string | number) => {
    setProcesses(prev => prev.map(p => (
      p.id === processId
        ? { ...p, tasks: p.tasks.map((t, i) => (i === index ? { ...t, [field]: value } : t)) }
        : p
    )));
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

  // Handler for task priority dropdown changes
  const handleTaskPriorityChange = (processId: string, index: number) => (value: string) => {
    updateTaskInProcess(processId, index, 'priority', value as TemplateTask['priority']);
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
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Daily Cleaning Checklist"
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
              placeholder="Describe what this template is used for..."
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
                  Critical Template
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

      {/* Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Processes & Tasks ({processes.reduce((sum, p) => sum + p.tasks.length, 0)})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toolbar: search + add process */}
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="relative w-full md:w-1/2">
              <Input
                placeholder="Search tasks within processes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                aria-label="Search tasks"
              />
              <SearchIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => addProcess('New Process')}>
                <FolderPlus className="h-4 w-4 mr-1" /> Add Process
              </Button>
            </div>
          </div>

          {/* Hierarchical processes and nested tasks */}
          {processes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FolderMinus className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No processes yet. Create one to add tasks.</p>
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-3">
              {filteredProcesses.map((process) => (
                <AccordionItem key={process.id} value={process.id}>
                  <AccordionTrigger className="bg-muted px-4 py-3 rounded-md">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: process.color }} aria-hidden />
                        <span className="text-sm font-medium">{process.name}</span>
                        <Badge variant="outline">{process.tasks.length} tasks</Badge>
                      </div>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="px-2 md:px-4 pb-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: process.color }} aria-hidden />
                        <Input
                          value={process.name}
                          onChange={(e) => updateProcessName(process.id, e.target.value)}
                          className="h-8 w-56"
                          aria-label={`Process name ${process.name}`}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{process.tasks.length} tasks</Badge>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeProcess(process.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {/* Add task within this process */}
                    <Card className="border-dashed">
                      <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                          <div className="md:col-span-4">
                            <Label htmlFor={`new_task_title_${process.id}`}>Task Title *</Label>
                            <Input
                              id={`new_task_title_${process.id}`}
                              value={newTask.title}
                              onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                              placeholder="e.g., Sweep floors"
                            />
                          </div>
                          <div className="md:col-span-3">
                            <Label htmlFor={`new_task_desc_${process.id}`}>Description</Label>
                            <Input
                              id={`new_task_desc_${process.id}`}
                              value={newTask.description}
                              onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                              placeholder="Optional details..."
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Label htmlFor={`new_task_priority_${process.id}`}>Priority</Label>
                            <AccessibleDropdown
                              id={`new_task_priority_${process.id}`}
                              ariaLabel="Task Priority"
                              value={newTask.priority || 'MEDIUM'}
                              onChange={(value) => setNewTask(prev => ({ ...prev, priority: value as TemplateTask['priority'] }))}
                              options={priorities}
                              placeholder="Select priority"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Label htmlFor={`new_task_duration_${process.id}`}>Duration (min)</Label>
                            <Input
                              id={`new_task_duration_${process.id}`}
                              type="number"
                              value={newTask.estimated_duration}
                              onChange={(e) => setNewTask(prev => ({ ...prev, estimated_duration: parseInt(e.target.value) || 0 }))}
                              min="1"
                              max="480"
                            />
                          </div>
                          <div className="md:col-span-1">
                            <Button type="button" onClick={() => addTaskToProcess(process.id)} size="sm" className="w-full">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Task list */}
                    {process.tasks.length === 0 ? (
                      <div className="text-muted-foreground py-4">No tasks in this process.</div>
                    ) : (
                      <div className="space-y-3 mt-3">
                        {/* Bulk actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => bulkDeleteSelected(process.id)}
                            disabled={!selectedTasks[process.id] || selectedTasks[process.id].size === 0}
                          >
                            Delete Selected
                          </Button>
                        </div>
                        {process.tasks.map((task, index) => (
                          <Card key={index} className="border-l-4" style={{ borderLeftColor: process.color || '#0ea5e9' }}>
                            <CardContent className="pt-4">
                              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                                <div className="md:col-span-1 flex flex-col items-center gap-2">
                                  <Checkbox
                                    checked={!!selectedTasks[process.id]?.has(index)}
                                    onCheckedChange={() => toggleTaskSelection(process.id, index)}
                                    aria-label="Select task"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => moveTaskWithinProcess(process.id, index, 'up')}
                                    disabled={index === 0}
                                    className="h-8 w-8 p-0"
                                  >
                                    <GripVertical className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div className="md:col-span-4">
                                  <Label htmlFor={`task_${process.id}_${index}_title`}>Title *</Label>
                                  <Input
                                    id={`task_${process.id}_${index}_title`}
                                    value={task.title}
                                    onChange={(e) => updateTaskInProcess(process.id, index, 'title', e.target.value)}
                                    className={errors[`process_${process.id}_task_${index}_title`] ? 'border-red-500' : ''}
                                  />
                                  {errors[`process_${process.id}_task_${index}_title`] && (
                                    <p className="text-sm text-red-500">{errors[`process_${process.id}_task_${index}_title`]}</p>
                                  )}
                                </div>
                                <div className="md:col-span-3">
                                  <Label htmlFor={`task_${process.id}_${index}_description`}>Description</Label>
                                  <Input
                                    id={`task_${process.id}_${index}_description`}
                                    value={task.description || ''}
                                    onChange={(e) => updateTaskInProcess(process.id, index, 'description', e.target.value)}
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <Label htmlFor={`task_${process.id}_${index}_priority`}>Priority</Label>
                                  <AccessibleDropdown
                                    id={`task_${process.id}_${index}_priority`}
                                    ariaLabel="Task Priority"
                                    value={task.priority || 'MEDIUM'}
                                    onChange={handleTaskPriorityChange(process.id, index)}
                                    options={priorities}
                                    placeholder="Select priority"
                                  />
                                </div>
                                <div className="md:col-span-1">
                                  <Label htmlFor={`task_${process.id}_${index}_duration`}>Duration</Label>
                                  <Input
                                    id={`task_${process.id}_${index}_duration`}
                                    type="number"
                                    value={task.estimated_duration || 30}
                                    onChange={(e) => updateTaskInProcess(process.id, index, 'estimated_duration', parseInt(e.target.value) || 30)}
                                    min="1"
                                    max="480"
                                  />
                                </div>
                                <div className="md:col-span-1">
                                  <Label>&nbsp;</Label>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeTaskFromProcess(process.id, index)}
                                    className="w-full text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
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
              {template?.id ? 'Update Template' : 'Create Template'}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}