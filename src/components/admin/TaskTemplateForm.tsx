import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Trash2, 
  GripVertical,
  Clock,
  AlertTriangle,
  CheckCircle,
  Zap
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

const templateTypes = [
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

const frequencies = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'ANNUALLY', label: 'Annually' },
  { value: 'CUSTOM', label: 'Custom' },
];

const priorities = [
  { value: 'LOW', label: 'Low', color: 'bg-blue-100 text-blue-800' },
  { value: 'MEDIUM', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'HIGH', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'URGENT', label: 'Urgent', color: 'bg-red-100 text-red-800' },
];

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
    onSuccess: () => {
      toast.success(template?.id ? 'Template updated successfully' : 'Template created successfully');
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

    if (formData.tasks.length === 0) {
      newErrors.tasks = 'At least one task is required';
    }

    // Validate each task
    formData.tasks.forEach((task, index) => {
      if (!task.title.trim()) {
        newErrors[`task_${index}_title`] = 'Task title is required';
      }
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

    saveTemplateMutation.mutate(formData);
  };

  const addTask = () => {
    if (!newTask.title.trim()) {
      toast.error('Task title is required');
      return;
    }

    setFormData(prev => ({
      ...prev,
      tasks: [...prev.tasks, { ...newTask }],
    }));

    setNewTask({
      title: '',
      description: '',
      priority: 'MEDIUM',
      estimated_duration: 30,
    });
  };

  const removeTask = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== index),
    }));
  };

  const updateTask = (index: number, field: keyof TemplateTask, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.map((task, i) => 
        i === index ? { ...task, [field]: value } : task
      ),
    }));
  };

  const moveTask = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= formData.tasks.length) return;

    setFormData(prev => {
      const newTasks = [...prev.tasks];
      [newTasks[index], newTasks[newIndex]] = [newTasks[newIndex], newTasks[index]];
      return { ...prev, tasks: newTasks };
    });
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
              <Select 
                value={formData.template_type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, template_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {templateTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Select 
                value={formData.frequency} 
                onValueChange={(value: TaskTemplate['frequency']) => setFormData(prev => ({ ...prev, frequency: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {frequencies.map(freq => (
                    <SelectItem key={freq.value} value={freq.value}>
                      {freq.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority_level">Priority Level</Label>
              <Select 
                value={formData.priority_level} 
                onValueChange={(value: TaskTemplate['priority_level']) => setFormData(prev => ({ ...prev, priority_level: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map(priority => (
                    <SelectItem key={priority.value} value={priority.value}>
                      <div className="flex items-center gap-2">
                        <Badge className={priority.color}>{priority.label}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            Tasks ({formData.tasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add New Task */}
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-4">
                  <Label htmlFor="new_task_title">Task Title</Label>
                  <Input
                    id="new_task_title"
                    value={newTask.title}
                    onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Clean kitchen surfaces"
                  />
                </div>
                
                <div className="md:col-span-3">
                  <Label htmlFor="new_task_description">Description</Label>
                  <Input
                    id="new_task_description"
                    value={newTask.description}
                    onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional details..."
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="new_task_priority">Priority</Label>
                  <Select 
                    value={newTask.priority} 
                    onValueChange={(value: TemplateTask['priority']) => setNewTask(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map(priority => (
                        <SelectItem key={priority.value} value={priority.value}>
                          {priority.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="new_task_duration">Duration (min)</Label>
                  <Input
                    id="new_task_duration"
                    type="number"
                    value={newTask.estimated_duration}
                    onChange={(e) => setNewTask(prev => ({ ...prev, estimated_duration: parseInt(e.target.value) || 0 }))}
                    min="1"
                    max="480"
                  />
                </div>

                <div className="md:col-span-1">
                  <Button type="button" onClick={addTask} size="sm" className="w-full">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Existing Tasks */}
          {formData.tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tasks added yet. Add your first task above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {formData.tasks.map((task, index) => (
                <Card key={index} className="border-l-4 border-l-primary">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                      <div className="md:col-span-1 flex flex-col gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => moveTask(index, 'up')}
                          disabled={index === 0}
                          className="h-8 w-8 p-0"
                        >
                          <GripVertical className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground text-center">
                          {index + 1}
                        </span>
                      </div>

                      <div className="md:col-span-4">
                        <Label htmlFor={`task_${index}_title`}>Title</Label>
                        <Input
                          id={`task_${index}_title`}
                          value={task.title}
                          onChange={(e) => updateTask(index, 'title', e.target.value)}
                          className={errors[`task_${index}_title`] ? 'border-red-500' : ''}
                        />
                        {errors[`task_${index}_title`] && (
                          <p className="text-sm text-red-500">{errors[`task_${index}_title`]}</p>
                        )}
                      </div>

                      <div className="md:col-span-3">
                        <Label htmlFor={`task_${index}_description`}>Description</Label>
                        <Input
                          id={`task_${index}_description`}
                          value={task.description || ''}
                          onChange={(e) => updateTask(index, 'description', e.target.value)}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Label htmlFor={`task_${index}_priority`}>Priority</Label>
                        <Select 
                          value={task.priority} 
                          onValueChange={(value: TemplateTask['priority']) => updateTask(index, 'priority', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {priorities.map(priority => (
                              <SelectItem key={priority.value} value={priority.value}>
                                {priority.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="md:col-span-1">
                        <Label htmlFor={`task_${index}_duration`}>Duration</Label>
                        <Input
                          id={`task_${index}_duration`}
                          type="number"
                          value={task.estimated_duration || 30}
                          onChange={(e) => updateTask(index, 'estimated_duration', parseInt(e.target.value) || 30)}
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
                          onClick={() => removeTask(index)}
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