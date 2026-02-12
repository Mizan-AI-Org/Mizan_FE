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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "react-router-dom";
import { API_BASE } from "@/lib/api";
import {
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
  const [templateFrequency, setTemplateFrequency] = useState<"DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY" | "CUSTOM">("DAILY");
  const [templateTasks, setTemplateTasks] = useState<TemplateTask[]>([]);
  const [newTemplateTask, setNewTemplateTask] = useState<{ title: string; priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"; estimated_duration: number }>({ title: "", priority: "MEDIUM", estimated_duration: 30 });

  // Category form state
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categoryColor, setCategoryColor] = useState("#3B82F6");

  // Fetch tasks (backend uses TODO, we use NOT_STARTED; compute OVERDUE from due_date)
  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/scheduling/tasks/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!response.ok) throw new Error("Failed to load tasks");
      const data = await response.json();
      const raw = (data.results ?? data) as (Task & { status?: string; due_date?: string })[];
      const today = format(new Date(), "yyyy-MM-dd");
      return (Array.isArray(raw) ? raw : []).map((t) => {
        let status = (t.status ?? "TODO") as string;
        if (status === "TODO") status = "NOT_STARTED";
        const dueDate = t.due_date ? t.due_date.slice(0, 10) : "";
        if ((status === "NOT_STARTED" || status === "IN_PROGRESS") && dueDate && dueDate < today) {
          status = "OVERDUE";
        }
        return { ...t, status: status as Task["status"] };
      });
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

  // Fetch staff members (GET /api/staff/ – same list as Staff app)
  const { data: staffMembers, isLoading: staffLoading } = useQuery<StaffMember[]>({
    queryKey: ["staff-list"],
    enabled: !!localStorage.getItem("access_token"),
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/staff/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!response.ok) throw new Error("Failed to load staff members");
      const data = await response.json();
      const list = (data.results ?? data) as { id: string; first_name?: string; last_name?: string; role?: string }[];
      return Array.isArray(list)
        ? list
            .filter((u) => u.role !== "SUPER_ADMIN")
            .map((u) => ({
              id: u.id,
              first_name: u.first_name ?? "",
              last_name: u.last_name ?? "",
              role: u.role,
            }))
        : [];
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

      // Backend expects due_date as YYYY-MM-DD; due_time optional
      const dueDateStr = data.due_date ? data.due_date.slice(0, 10) : null;
      const payload = {
        ...data,
        due_date: dueDateStr,
        category: data.category || null,
        assigned_to: Array.isArray(data.assigned_to) ? data.assigned_to : [],
        assigned_shift: prefilledAssignedShift,
        estimated_duration: Number(data.estimated_duration) || 30,
      };
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to save task");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-stats"] });
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
      queryClient.invalidateQueries({ queryKey: ["restaurant-stats"] });
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

  const resetCategoryForm = () => {
    setCategoryName("");
    setCategoryDescription("");
    setCategoryColor("#3B82F6");
    setSelectedCategory(null);
  };

  const createCategoryMutation = useMutation({
    mutationFn: async (payload: { name: string; description?: string; color?: string }) => {
      const response = await fetch(`${API_BASE}/scheduling/task-categories/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail || "Failed to create category");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-categories"] });
      setIsCategoryModalOpen(false);
      resetCategoryForm();
      toast({ title: "Category created", description: "The category has been added." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: { name: string; description?: string; color?: string } }) => {
      const response = await fetch(`${API_BASE}/scheduling/task-categories/${id}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail || "Failed to update category");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-categories"] });
      setIsCategoryModalOpen(false);
      resetCategoryForm();
      toast({ title: "Category updated", description: "The category has been updated." });
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
      queryClient.invalidateQueries({ queryKey: ["restaurant-stats"] });
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
      queryClient.invalidateQueries({ queryKey: ["restaurant-stats"] });
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

  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await fetch(`${API_BASE}/scheduling/tasks/${taskId}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail || "Failed to delete task");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-stats"] });
      setTaskToDelete(null);
      setIsTaskModalOpen(false);
      resetTaskForm();
      toast({ title: "Task deleted", description: "The task has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
              <Button
                onClick={() => {
                  resetTaskForm();
                  setIsTaskModalOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> New Task
              </Button>
            )}
            {activeTab === "templates" && (
              <Button onClick={handleOpenNewTemplateModal}>
                <Plus className="h-4 w-4 mr-1" /> New Template
              </Button>
            )}
            {activeTab === "categories" && (
              <Button
                onClick={() => {
                  resetCategoryForm();
                  setIsCategoryModalOpen(true);
                }}
              >
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
      <Dialog
        open={isTaskModalOpen}
        onOpenChange={(open) => {
          setIsTaskModalOpen(open);
          if (!open) resetTaskForm();
        }}
      >
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
                <Label className="text-right">Assigned To</Label>
                <div className="col-span-3 space-y-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between font-normal h-10"
                      >
                        {taskFormData.assigned_to.length === 0
                          ? "Assign to staff member(s)"
                          : `${taskFormData.assigned_to.length} staff selected`}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-[3050]" align="start">
                      <ScrollArea className="max-h-60">
                        <div className="p-2 space-y-1">
                          {staffMembers?.map((staff: StaffMember) => (
                            <label
                              key={staff.id}
                              className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent cursor-pointer"
                            >
                              <Checkbox
                                checked={taskFormData.assigned_to.includes(staff.id)}
                                onCheckedChange={(checked) => {
                                  const next = checked
                                    ? [...taskFormData.assigned_to, staff.id]
                                    : taskFormData.assigned_to.filter((id) => id !== staff.id);
                                  setTaskFormData({ ...taskFormData, assigned_to: next });
                                }}
                              />
                              <span className="text-sm">
                                {staff.first_name} {staff.last_name}
                              </span>
                            </label>
                          ))}
                          {(!staffMembers || staffMembers.length === 0) && (
                            <p className="text-sm text-muted-foreground px-2 py-2">No staff members found.</p>
                          )}
                        </div>
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                  {taskFormData.assigned_to.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {taskFormData.assigned_to.map((id) => {
                        const staff = staffMembers?.find((s) => s.id === id);
                        return (
                          <Badge key={id} variant="secondary" className="text-xs">
                            {staff ? `${staff.first_name} ${staff.last_name}` : id}
                            <button
                              type="button"
                              className="ml-1 rounded-full hover:bg-muted"
                              onClick={() =>
                                setTaskFormData({
                                  ...taskFormData,
                                  assigned_to: taskFormData.assigned_to.filter((x) => x !== id),
                                })
                              }
                            >
                              <span className="sr-only">Remove</span>×
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>
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
                  min={1}
                  value={taskFormData.estimated_duration}
                  onChange={(e) =>
                    setTaskFormData({
                      ...taskFormData,
                      estimated_duration: Math.max(1, Number(e.target.value) || 30),
                    })
                  }
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter className="flex-wrap gap-2">
              {selectedTask && (
                <Button
                  type="button"
                  variant="destructive"
                  className="mr-auto"
                  onClick={() => setTaskToDelete(selectedTask.id)}
                  disabled={taskMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => setIsTaskModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={taskMutation.isPending}>
                {selectedTask ? "Update Task" : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The task will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              className="bg-red-600 hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault();
                const id = taskToDelete;
                if (id) deleteTaskMutation.mutate(id);
              }}
              disabled={deleteTaskMutation.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Template Modal */}
      <Dialog
        open={isTemplateModalOpen}
        onOpenChange={(open) => {
          setIsTemplateModalOpen(open);
          if (!open) resetTemplateForm();
        }}
      >
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
                    <Input type="number" min={1} className="w-32" value={newTemplateTask.estimated_duration} onChange={(e) => setNewTemplateTask({ ...newTemplateTask, estimated_duration: Math.max(1, Number(e.target.value) || 30) })} />
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

      {/* Category Modal */}
      <Dialog
        open={isCategoryModalOpen}
        onOpenChange={(open) => {
          setIsCategoryModalOpen(open);
          if (!open) resetCategoryForm();
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedCategory ? "Edit Category" : "Create New Category"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!categoryName.trim()) {
                toast({ title: "Error", description: "Category name is required.", variant: "destructive" });
                return;
              }
              if (selectedCategory) {
                updateCategoryMutation.mutate({
                  id: selectedCategory.id,
                  payload: { name: categoryName.trim(), description: categoryDescription.trim() || undefined, color: categoryColor },
                });
              } else {
                createCategoryMutation.mutate({
                  name: categoryName.trim(),
                  description: categoryDescription.trim() || undefined,
                  color: categoryColor,
                });
              }
            }}
          >
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category-name" className="text-right">Name</Label>
                <Input
                  id="category-name"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="col-span-3"
                  placeholder="e.g. Opening"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category-desc" className="text-right">Description</Label>
                <Textarea
                  id="category-desc"
                  value={categoryDescription}
                  onChange={(e) => setCategoryDescription(e.target.value)}
                  className="col-span-3"
                  placeholder="Optional description"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category-color" className="text-right">Color</Label>
                <div className="col-span-3 flex items-center gap-2">
                  <input
                    id="category-color"
                    type="color"
                    value={categoryColor}
                    onChange={(e) => setCategoryColor(e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded border border-input"
                  />
                  <Input
                    value={categoryColor}
                    onChange={(e) => setCategoryColor(e.target.value)}
                    className="flex-1 font-mono text-sm"
                    placeholder="#3B82F6"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCategoryModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}>
                {selectedCategory ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskManagementBoard;