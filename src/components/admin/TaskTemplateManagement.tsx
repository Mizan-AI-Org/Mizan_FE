import React, { useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { CardGridSkeleton } from '@/components/skeletons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Zap
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterFrequency, setFilterFrequency] = useState<string>('all');
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState<TaskTemplate | null>(null);

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
      // Fetch current templates to avoid duplicates (use large page_size to get all)
      const listRes = await fetch(`${API_BASE}/scheduling/task-templates/?page_size=500`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!listRes.ok) throw new Error('Failed to fetch existing templates');
      const listData = await listRes.json();
      const existing = (listData.results || listData || []) as TaskTemplate[];
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

  // Generate tasks from template mutation
  const generateTasksMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const response = await fetch(`${API_BASE}/scheduling/task-templates/${templateId}/generate_tasks/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to generate tasks');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Tasks generated successfully');
    },
    onError: (error) => {
      toast.error('Failed to generate tasks');
      console.error('Generate tasks error:', error);
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

  const handleGenerateTasks = (templateId: string) => {
    generateTasksMutation.mutate(templateId);
  };

  const handleFormSuccess = () => {
    setIsProcessModalOpen(false);
    setEditingProcess(null);
    queryClient.invalidateQueries({ queryKey: ['task-templates'] });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Manage Processes</h1>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={isProcessModalOpen} onOpenChange={setIsProcessModalOpen}>
            <DialogTrigger asChild>
              <Button className="premium-button">
                <Plus className="h-4 w-4 mr-2" />
                New Process
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Process</DialogTitle>
                <DialogDescription>
                  Create a new operational process that can be reused across shifts and schedules.
                </DialogDescription>
              </DialogHeader>
              <TaskTemplateForm
                onSuccess={handleFormSuccess}
                onCancel={() => setIsProcessModalOpen(false)}
              />
            </DialogContent>
          </Dialog>
          <Button
            variant="outline"
            onClick={() => seedTemplatesMutation.mutate()}
            disabled={seedTemplatesMutation.isPending}
          >
            Load Pre-Built Processes
          </Button>
        </div>
      </div>

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
                <SelectItem value="all">All Types</SelectItem>
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
                <SelectItem value="all">All Frequencies</SelectItem>
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
            <h3 className="text-lg font-semibold mb-2">No processes found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || filterType !== 'all' || filterFrequency !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create your first operational process to get started'
              }
            </p>
            {!searchTerm && filterType === 'all' && filterFrequency === 'all' && (
              <Button onClick={() => setIsProcessModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Process
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
                        Critical
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
                    <span>{template.tasks.length} tasks</span>
                    <span>Used {template.usage_count} times</span>
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
                    Edit
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
                    onClick={() => handleGenerateTasks(template.id)}
                    disabled={generateTasksMutation.isPending}
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
                        <AlertDialogTitle>Delete Template</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{template.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(template.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Process</DialogTitle>
              <DialogDescription>
                Update the process details and tasks.
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
    </div>
  );
}