import React, { useState } from 'react';
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

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  
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
      toast.success('Template deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete template');
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
      if (!response.ok) throw new Error('Failed to duplicate template');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-templates'] });
      toast.success('Template duplicated successfully');
    },
    onError: (error) => {
      toast.error('Failed to duplicate template');
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
    setEditingTemplate(template);
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
    setIsCreateModalOpen(false);
    setEditingTemplate(null);
    queryClient.invalidateQueries({ queryKey: ['task-templates'] });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Processes & Tasks </h1>
          <p className="text-muted-foreground">
            Create and manage reusable Processes and Task templates for your restaurant operations
          </p>
        </div>
        
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="premium-button">
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
              <DialogDescription>
                Create a new task template that can be reused across shifts and schedules.
              </DialogDescription>
            </DialogHeader>
            <TaskTemplateForm 
              onSuccess={handleFormSuccess}
              onCancel={() => setIsCreateModalOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters and Search */}
      <Card className="premium-card">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
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
                <SelectValue placeholder="Filter by frequency" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="premium-card animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                  <div className="flex gap-2">
                    <div className="h-6 bg-muted rounded w-16"></div>
                    <div className="h-6 bg-muted rounded w-16"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card className="premium-card">
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No templates found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || filterType !== 'all' || filterFrequency !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Create your first task template to get started'
              }
            </p>
            {!searchTerm && filterType === 'all' && filterFrequency === 'all' && (
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
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
      {editingTemplate && (
        <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Template</DialogTitle>
              <DialogDescription>
                Update the template details and tasks.
              </DialogDescription>
            </DialogHeader>
            <TaskTemplateForm 
              template={editingTemplate}
              onSuccess={handleFormSuccess}
              onCancel={() => setEditingTemplate(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}