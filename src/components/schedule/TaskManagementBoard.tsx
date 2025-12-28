import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "react-router-dom";
import { 
import { API_BASE } from "@/lib/api";
  Plus, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Trash2, 
  Edit, 
  Calendar,
  ClipboardList,
  Thermometer,
  Shield,
  FileText,
  MessageSquarePlus
} from "lucide-react";


interface TemplateTask {
  title: string;
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
}

interface TaskCategory {
  id: string;
  name: string;
  description: string;
  color: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  category_details?: TaskCategory;
  template?: string;
  template_details?: TaskTemplate;
  assigned_to: string[];
  assigned_to_details?: StaffMember[];
  assigned_shift?: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";
  due_date: string;
  estimated_duration: number;
  completed_at?: string;
  completed_by?: string;
  subtasks_count?: number;
  parent_task?: string;
  created_at: string;
  updated_at: string;
}

interface TaskFormData {
  title: string;
  description: string;
  category: string;
  assigned_to: string[];
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  due_date: string;
  estimated_duration: number;
}

interface TaskManagementBoardProps {
  initialView?: "templates" | "tasks" | "categories";
}

const priorityColors = {
  LOW: "bg-blue-100 text-blue-800",
  MEDIUM: "bg-green-100 text-green-800",
  HIGH: "bg-yellow-100 text-yellow-800",
  URGENT: "bg-red-100 text-red-800",
};

const statusColors = {
  NOT_STARTED: "bg-gray-100 text-gray-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  OVERDUE: "bg-red-100 text-red-800",
};

const statusIcons = {
  NOT_STARTED: <Clock className="h-4 w-4 mr-1" />,
  IN_PROGRESS: <Clock className="h-4 w-4 mr-1" />,
  COMPLETED: <CheckCircle className="h-4 w-4 mr-1" />,
  OVERDUE: <AlertCircle className="h-4 w-4 mr-1" />,
};

const templateTypeIcons = {
  CLEANING: <ClipboardList className="h-5 w-5 mr-2" />,
  TEMPERATURE: <Thermometer className="h-5 w-5 mr-2" />,
  OPENING: <Calendar className="h-5 w-5 mr-2" />,
  CLOSING: <Calendar className="h-5 w-5 mr-2" />,
  SAFETY: <Shield className="h-5 w-5 mr-2" />,
  SOP: <FileText className="h-5 w-5 mr-2" />,
  CUSTOM: <MessageSquarePlus className="h-5 w-5 mr-2" />,
};

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  role?: string;
}

export const TaskManagementBoard: React.FC<TaskManagementBoardProps> = ({
  initialView = "tasks",
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<"templates" | "tasks" | "categories">(initialView);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | null>(null);
  const [taskFormData, setTaskFormData] = useState<TaskFormData>({
    title: "",
    description: "",
    category: "",
    assigned_to: [],
    priority: "MEDIUM",
    due_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    estimated_duration: 30,
  });
  const [prefilledAssignedShift, setPrefilledAssignedShift] = useState<string | undefined>(undefined);
  const [taskFilter, setTaskFilter] = useState({
    status: "all",
    priority: "all",
    category: "all",
  });


  // Template form state
  const [templateName, setTemplateName] = useState<string>("");
  const [templateDescription, setTemplateDescription] = useState<string>("");
  const [templateType, setTemplateType] = useState<string>("CUSTOM");
  const [templateFrequency, setTemplateFrequency] = useState<"DAILY"|"WEEKLY"|"MONTHLY"|"QUARTERLY"|"ANNUALLY"|"CUSTOM">("DAILY");
  const [templateTasks, setTemplateTasks] = useState<TemplateTask[]>([]);
  const [newTemplateTask, setNewTemplateTask] = useState<{ title: string; priority: "LOW"|"MEDIUM"|"HIGH"|"URGENT"; estimated_duration: number }>({ title: "", priority: "MEDIUM", estimated_duration: 30 });

  // Fetch tasks
  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/scheduling/tasks/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!response.ok) throw new Error("Failed to load tasks");
      const data = await response.json();
      return data.results || data;
    },
  });

  // Fetch task templates
  const { data: templates, isLoading: templatesLoading } = useQuery<TaskTemplate[]>({
    queryKey: ["task-templates"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/scheduling/task-templates/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!response.ok) throw new Error("Failed to load task templates");
      const data = await response.json();
      return data.results || data;
    },
  });

  // Fetch task categories
  const { data: categories, isLoading: categoriesLoading } = useQuery<TaskCategory[]>({
    queryKey: ["task-categories"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/scheduling/task-categories/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!response.ok) throw new Error("Failed to load task categories");
      const data = await response.json();
      return data.results || data;
    },
  });

  // Fetch staff members
  const { data: staffMembers, isLoading: staffLoading } = useQuery<StaffMember[]>({
    // Distinct query key to avoid collisions with other components
    queryKey: ["accounts-staff-users"],
    // Only run when token is present
    enabled: !!localStorage.getItem("access_token"),
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/accounts/staff/users/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!response.ok) throw new Error("Failed to load staff members");
      const data = await response.json();
      const list = (data.results || data) as StaffMember[];
      return Array.isArray(list) ? list.filter((u) => u.role !== "SUPER_ADMIN") : [];
    },
  });

  // Prefill from URL params (assigned_to, assigned_shift, openModal)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const assignedTo = params.get("assigned_to");
    const assignedShift = params.get("assigned_shift");
    const openModal = params.get("openModal") === "true";
    if (assignedTo) {
      setTaskFormData((prev) => ({ ...prev, assigned_to: [assignedTo] }));
    }
    if (assignedShift) {
      setPrefilledAssignedShift(assignedShift || undefined);
    }
    if (openModal) {
      setIsTaskModalOpen(true);
    }
  }, [location.search]);

  // Create/update task mutation
  const taskMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      const url = selectedTask
        ? `${API_BASE}/scheduling/tasks/${selectedTask.id}/`
        : `${API_BASE}/scheduling/tasks/`;
      const method = selectedTask ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({
          ...data,
          assigned_shift: prefilledAssignedShift,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to save task");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setIsTaskModalOpen(false);
      toast({
        title: selectedTask ? "Task updated" : "Task created",
        description: selectedTask
          ? "The task has been updated successfully."
          : "A new task has been created successfully.",
      });
      resetTaskForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate task from template mutation
  const generateTaskMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const response = await fetch(`${API_BASE}/scheduling/task-templates/${templateId}/generate_tasks/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to generate tasks");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({
        title: "Tasks generated",
        description: `${data.tasks_created} tasks have been generated from the template.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create/update template mutation
  interface TemplatePayload {
    name: string;
    description: string;
    template_type: string;
    frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY" | "CUSTOM";
    tasks: TemplateTask[];
  }

  const templateMutation = useMutation({
    mutationFn: async (data: TemplatePayload) => {
      const url = selectedTemplate
        ? `${API_BASE}/scheduling/task-templates/${selectedTemplate.id}/`
        : `${API_BASE}/scheduling/task-templates/`;
      const method = selectedTemplate ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to save template");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-templates"] });
      setIsTemplateModalOpen(false);
      toast({
        title: selectedTemplate ? "Template updated" : "Template created",
        description: selectedTemplate
          ? "The task template has been updated successfully."
          : "A new task template has been created successfully.",
      });
      resetTemplateForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetTemplateForm = () => {
    setTemplateName("");
    setTemplateDescription("");
    setTemplateType("CUSTOM");
    setTemplateFrequency("DAILY");
    setTemplateTasks([]);
    setNewTemplateTask({ title: "", priority: "MEDIUM", estimated_duration: 30 });
    setSelectedTemplate(null);
  };

  const handleOpenNewTemplateModal = () => {
    resetTemplateForm();
    setIsTemplateModalOpen(true);
  };

  const handleEditTemplate = (template: TaskTemplate) => {
    setSelectedTemplate(template);
    setTemplateName(template.name || "");
    setTemplateDescription(template.description || "");
    setTemplateType(template.template_type || "CUSTOM");
    setTemplateFrequency(template.frequency || "DAILY");
    setTemplateTasks(Array.isArray(template.tasks) ? template.tasks : []);
    setIsTemplateModalOpen(true);
  };

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const response = await fetch(`${API_BASE}/scheduling/task-templates/${templateId}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to delete template");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-templates"] });
      toast({ title: "Template deleted", description: "The template has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Mark task as completed mutation
  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await fetch(`${API_BASE}/scheduling/tasks/${taskId}/mark_completed/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to mark task as completed");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({
        title: "Task completed",
        description: "The task has been marked as completed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Start task mutation
  const startTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await fetch(`${API_BASE}/scheduling/tasks/${taskId}/start_task/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to start task");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({
        title: "Task started",
        description: "The task has been marked as in progress.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });



  // Reset task form
  const resetTaskForm = () => {
    setTaskFormData({
      title: "",
      description: "",
      category: "",
      assigned_to: [],
      priority: "MEDIUM",
      due_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      estimated_duration: 30,
    });
    setSelectedTask(null);
    setPrefilledAssignedShift(undefined);
  };

  // Handle task form submission
  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    taskMutation.mutate(taskFormData);
  };

  // Filter tasks based on current filters
  const filteredTasks = tasks
    ? tasks.filter((task) => {
        if (taskFilter.status !== "all" && task.status !== taskFilter.status) return false;
        if (taskFilter.priority !== "all" && task.priority !== taskFilter.priority) return false;
        if (taskFilter.category !== "all" && task.category !== taskFilter.category) return false;
        return true;
      })
    : [];

  // Group tasks by status for Kanban view
  const tasksByStatus = {
    NOT_STARTED: filteredTasks.filter((task) => task.status === "NOT_STARTED"),
    IN_PROGRESS: filteredTasks.filter((task) => task.status === "IN_PROGRESS"),
    COMPLETED: filteredTasks.filter((task) => task.status === "COMPLETED"),
    OVERDUE: filteredTasks.filter((task) => task.status === "OVERDUE"),
  };

  // Edit task
  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setTaskFormData({
      title: task.title,
      description: task.description,
      category: task.category,
      assigned_to: task.assigned_to,
      priority: task.priority,
      due_date: task.due_date,
      estimated_duration: task.estimated_duration,
    });
    setIsTaskModalOpen(true);
  };

  // Generate tasks from template
  const handleGenerateFromTemplate = (templateId: string) => {
    generateTaskMutation.mutate(templateId);
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "tasks" | "templates" | "categories")}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>
          <div className="flex space-x-2">
            {activeTab === "tasks" && (
              <Button onClick={() => setIsTaskModalOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> New Task
              </Button>
            )}
            {activeTab === "templates" && (
              <Button onClick={handleOpenNewTemplateModal}>
                <Plus className="h-4 w-4 mr-1" /> New Template
              </Button>
            )}
            {activeTab === "categories" && (
              <Button onClick={() => setIsCategoryModalOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> New Category
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="tasks" className="space-y-4">
          {/* Task Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="status-filter">Status</Label>
                  <Select
                    value={taskFilter.status}
                    onValueChange={(value) => setTaskFilter({ ...taskFilter, status: value })}
                  >
                    <SelectTrigger id="status-filter">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="OVERDUE">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority-filter">Priority</Label>
                  <Select
                    value={taskFilter.priority}
                    onValueChange={(value) => setTaskFilter({ ...taskFilter, priority: value })}
                  >
                    <SelectTrigger id="priority-filter">
                      <SelectValue placeholder="Filter by priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="category-filter">Category</Label>
                  <Select
                    value={taskFilter.category}
                    onValueChange={(value) => setTaskFilter({ ...taskFilter, category: value })}
                  >
                    <SelectTrigger id="category-filter">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories?.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Kanban Board */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
              <Card key={status} className="overflow-hidden">
                <CardHeader className={`py-3 ${statusColors[status as keyof typeof statusColors]}`}>
                  <CardTitle className="text-sm font-medium flex items-center">
                    {statusIcons[status as keyof typeof statusIcons]}
                    {status.replace("_", " ")} ({statusTasks.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 max-h-[500px] overflow-y-auto">
                  {statusTasks.length === 0 ? (
                    <div className="text-center text-gray-500 py-4">No tasks</div>
                  ) : (
                    <div className="space-y-2">
                      {statusTasks.map((task) => (
                        <Card key={task.id} className="p-3 cursor-pointer hover:bg-gray-50" onClick={() => handleEditTask(task)}>
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium">{task.title}</h4>
                            <Badge className={priorityColors[task.priority]}>{task.priority}</Badge>
                          </div>
                          <p className="text-sm text-gray-500 line-clamp-2 mb-2">{task.description}</p>
                          <div className="flex justify-between items-center text-xs text-gray-500">
                            <div>Due: {format(new Date(task.due_date), "MMM d, h:mm a")}</div>
                            <div className="flex space-x-1">
                              {task.status !== "COMPLETED" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    completeTaskMutation.mutate(task.id);
                                  }}
                                >
                                  <CheckCircle className="h-3 w-3" />
                                </Button>
                              )}
                              {task.status === "NOT_STARTED" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startTaskMutation.mutate(task.id);
                                  }}
                                >
                                  <Clock className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                          {task.assigned_to_details && task.assigned_to_details.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {task.assigned_to_details.map((staff, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {staff.first_name} {staff.last_name}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {templatesLoading ? (
              <div className="col-span-3 text-center py-8">Loading templates...</div>
            ) : templates?.length === 0 ? (
              <div className="col-span-3 text-center py-8">No templates found. Create your first template!</div>
            ) : (
              templates?.map((template) => (
                <Card key={template.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center">
                      {templateTypeIcons[template.template_type as keyof typeof templateTypeIcons] || 
                        templateTypeIcons.CUSTOM}
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <p className="text-sm text-gray-500 mb-4">{template.description}</p>
                    <div className="flex justify-between items-center">
                      <Badge variant="outline">{template.frequency}</Badge>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditTemplate(template)}>
                          <Edit className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        <Button size="sm" onClick={() => handleGenerateFromTemplate(template.id)}>
                          Generate Tasks
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteTemplateMutation.mutate(template.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {categoriesLoading ? (
              <div className="col-span-4 text-center py-8">Loading categories...</div>
            ) : categories?.length === 0 ? (
              <div className="col-span-4 text-center py-8">No categories found. Create your first category!</div>
            ) : (
              categories?.map((category) => (
                <Card key={category.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center">
                      <div 
                        className="w-4 h-4 rounded-full mr-2" 
                        style={{ backgroundColor: category.color || '#3b82f6' }}
                      ></div>
                      {category.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500">{category.description}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Task Modal */}
      <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedTask ? "Edit Task" : "Create New Task"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTaskSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">
                  Title
                </Label>
                <Input
                  id="title"
                  value={taskFormData.title}
                  onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={taskFormData.description}
                  onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">
                  Category
                </Label>
                <Select
                  value={taskFormData.category}
                  onValueChange={(value) => setTaskFormData({ ...taskFormData, category: value })}
                >
                  <SelectTrigger id="category" className="col-span-3">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="assigned_to" className="text-right">
                  Assigned To
                </Label>
                <Select
                  value={taskFormData.assigned_to[0] || ""}
                  onValueChange={(value) => setTaskFormData({ ...taskFormData, assigned_to: [value] })}
                >
                  <SelectTrigger id="assigned_to" className="col-span-3">
                    <SelectValue placeholder="Assign to staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffMembers?.map((staff: StaffMember) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.first_name} {staff.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="priority" className="text-right">
                  Priority
                </Label>
                <Select
                  value={taskFormData.priority}
                  onValueChange={(value) => setTaskFormData({ ...taskFormData, priority: value as TaskFormData["priority"] })}
                >
                  <SelectTrigger id="priority" className="col-span-3">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="due_date" className="text-right">
                  Due Date
                </Label>
                <Input
                  id="due_date"
                  type="datetime-local"
                  value={taskFormData.due_date}
                  onChange={(e) => setTaskFormData({ ...taskFormData, due_date: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="estimated_duration" className="text-right">
                  Est. Duration (min)
                </Label>
                <Input
                  id="estimated_duration"
                  type="number"
                  value={taskFormData.estimated_duration}
                  onChange={(e) => setTaskFormData({ ...taskFormData, estimated_duration: parseInt(e.target.value) })}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsTaskModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{selectedTask ? "Update Task" : "Create Task"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Template Modal */}
      <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>{selectedTemplate ? "Edit Task Template" : "Create New Task Template"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const payload = {
                name: templateName,
                description: templateDescription,
                template_type: templateType,
                frequency: templateFrequency,
                tasks: templateTasks,
              };
              templateMutation.mutate(payload);
            }}
          >
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tpl-name" className="text-right">Name</Label>
                <Input id="tpl-name" value={templateName} onChange={(e) => setTemplateName(e.target.value)} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tpl-desc" className="text-right">Description</Label>
                <Textarea id="tpl-desc" value={templateDescription} onChange={(e) => setTemplateDescription(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tpl-type" className="text-right">Type</Label>
                <Select value={templateType} onValueChange={setTemplateType}>
                  <SelectTrigger id="tpl-type" className="col-span-3">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLEANING">Cleaning</SelectItem>
                    <SelectItem value="TEMPERATURE">Temperature</SelectItem>
                    <SelectItem value="OPENING">Opening</SelectItem>
                    <SelectItem value="CLOSING">Closing</SelectItem>
                    <SelectItem value="SAFETY">Safety</SelectItem>
                    <SelectItem value="SOP">SOP</SelectItem>
                    <SelectItem value="CUSTOM">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tpl-frequency" className="text-right">Frequency</Label>
                <Select
                  value={templateFrequency}
                  onValueChange={(v) =>
                    setTemplateFrequency(
                      v as "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY" | "CUSTOM"
                    )
                  }
                >
                  <SelectTrigger id="tpl-frequency" className="col-span-3">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                    <SelectItem value="ANNUALLY">Annually</SelectItem>
                    <SelectItem value="CUSTOM">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-2">
                <Label className="mb-2 block">Template Tasks</Label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input placeholder="Task title" value={newTemplateTask.title} onChange={(e) => setNewTemplateTask({ ...newTemplateTask, title: e.target.value })} />
                    <Select value={newTemplateTask.priority} onValueChange={(v) => setNewTemplateTask({ ...newTemplateTask, priority: v as typeof newTemplateTask.priority })}>
                      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="URGENT">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="number" className="w-32" value={newTemplateTask.estimated_duration} onChange={(e) => setNewTemplateTask({ ...newTemplateTask, estimated_duration: parseInt(e.target.value || '0') })} />
                    <Button
                      type="button"
                      onClick={() => {
                        if (!newTemplateTask.title.trim()) return;
                        setTemplateTasks([...templateTasks, { ...newTemplateTask }]);
                        setNewTemplateTask({ title: "", priority: "MEDIUM", estimated_duration: 30 });
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  {templateTasks.length > 0 && (
                    <div className="space-y-2 bg-gray-50 p-3 rounded">
                      {templateTasks.map((t, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white p-2 rounded border">
                          <div className="text-sm">
                            <span className="font-medium">{t.title}</span>
                            <span className="ml-2 text-xs text-gray-500">{t.priority}</span>
                            <span className="ml-2 text-xs text-gray-500">{t.estimated_duration} min</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setTemplateTasks(templateTasks.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsTemplateModalOpen(false)}>Cancel</Button>
              <Button type="submit">{selectedTemplate ? "Update Template" : "Create Template"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskManagementBoard;