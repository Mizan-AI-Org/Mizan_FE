import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { CheckCircle, Clock, AlertTriangle, CalendarClock, ListChecks, ClipboardCheck } from 'lucide-react';

const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:8000/api';

interface Task {
  id: number;
  title: string;
  description: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  task_type: 'sop' | 'checklist';
  assigned_to?: number;
}

interface Staff {
  id: number;
  first_name: string;
  last_name: string;
}

const TaskManagementInterface: React.FC<{ isManager: boolean }> = ({ isManager }) => {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium',
    status: 'pending',
    task_type: 'sop',
  });
  const [activeTab, setActiveTab] = useState<'all' | 'sop' | 'checklist'>('all');

  // Fetch tasks
  const { data: tasks = [], isLoading: isLoadingTasks } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/staff/tasks/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return response.json();
    },
  });

  // Fetch staff members for assignment
  const { data: staffMembers = [] } = useQuery<Staff[]>({
    queryKey: ['staff'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/staff/profiles/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch staff');
      return response.json();
    },
    enabled: isManager,
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (task: Partial<Task>) => {
      const response = await fetch(`${API_BASE}/staff/tasks/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify(task),
      });
      if (!response.ok) throw new Error('Failed to create task');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsCreateModalOpen(false);
      setNewTask({
        title: '',
        description: '',
        due_date: '',
        priority: 'medium',
        status: 'pending',
        task_type: 'sop',
      });
      toast.success('Task created successfully');
    },
    onError: () => {
      toast.error('Failed to create task');
    },
  });

  // Update task status mutation
  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await fetch(`${API_BASE}/staff/tasks/${id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update task');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task status updated');
    },
    onError: () => {
      toast.error('Failed to update task status');
    },
  });

  const handleCreateTask = () => {
    createTaskMutation.mutate(newTask);
  };

  const handleStatusChange = (task: Task, status: string) => {
    updateTaskStatusMutation.mutate({ id: task.id, status });
  };

  const handleViewTask = (task: Task) => {
    setSelectedTask(task);
    setIsViewModalOpen(true);
  };

  const filteredTasks = tasks.filter(task => {
    if (activeTab === 'all') return true;
    return task.task_type === activeTab;
  });

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge variant="default">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-amber-500" />;
      case 'pending':
        return <AlertTriangle className="h-5 w-5 text-gray-400" />;
      default:
        return null;
    }
  };

  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case 'sop':
        return <ClipboardCheck className="h-5 w-5 text-blue-500" />;
      case 'checklist':
        return <ListChecks className="h-5 w-5 text-purple-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Task Management</h2>
        {isManager && (
          <Button onClick={() => setIsCreateModalOpen(true)}>
            Create New Task
          </Button>
        )}
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'sop' | 'checklist')}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Tasks</TabsTrigger>
          <TabsTrigger value="sop">SOP Tasks</TabsTrigger>
          <TabsTrigger value="checklist">Checklist Tasks</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoadingTasks ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No tasks found. {isManager && 'Create a new task to get started.'}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTasks.map((task) => (
            <Card key={task.id} className="overflow-hidden">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                  {getTaskTypeIcon(task.task_type)}
                  <CardTitle className="text-sm font-medium line-clamp-1">{task.title}</CardTitle>
                </div>
                {getPriorityBadge(task.priority)}
              </CardHeader>
              <CardContent className="pb-2">
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{task.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs">
                    <CalendarClock className="h-3 w-3" />
                    <span>{new Date(task.due_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(task.status)}
                    <Button variant="ghost" size="sm" onClick={() => handleViewTask(task)}>
                      View
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Task Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="task-type">Task Type</Label>
              <Select
                value={newTask.task_type}
                onValueChange={(value) => setNewTask({ ...newTask, task_type: value as 'sop' | 'checklist' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select task type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sop">Standard Operating Procedure</SelectItem>
                  <SelectItem value="checklist">Safety Checklist</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="due-date">Due Date</Label>
              <Input
                id="due-date"
                type="date"
                value={newTask.due_date}
                onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={newTask.priority}
                onValueChange={(value) => setNewTask({ ...newTask, priority: value as 'low' | 'medium' | 'high' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isManager && (
              <div className="grid gap-2">
                <Label htmlFor="assigned-to">Assign To</Label>
                <Select
                  value={newTask.assigned_to?.toString()}
                  onValueChange={(value) => setNewTask({ ...newTask, assigned_to: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffMembers.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id.toString()}>
                        {staff.first_name} {staff.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTask} disabled={!newTask.title || !newTask.due_date}>Create Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Task Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          {selectedTask && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  {getTaskTypeIcon(selectedTask.task_type)}
                  <DialogTitle>{selectedTask.title}</DialogTitle>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {getPriorityBadge(selectedTask.priority)}
                  <span className="text-sm text-muted-foreground">
                    Due: {new Date(selectedTask.due_date).toLocaleDateString()}
                  </span>
                </div>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm mb-4">{selectedTask.description}</p>
                <div className="flex items-center gap-2 mb-4">
                  <Label>Status:</Label>
                  <Select
                    value={selectedTask.status}
                    onValueChange={(value) => handleStatusChange(selectedTask, value)}
                    disabled={!isManager && selectedTask.status === 'completed'}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {selectedTask.assigned_to && (
                  <div className="flex items-center gap-2">
                    <Label>Assigned To:</Label>
                    <span>
                      {staffMembers.find(s => s.id === selectedTask.assigned_to)?.first_name} 
                      {' '}
                      {staffMembers.find(s => s.id === selectedTask.assigned_to)?.last_name}
                    </span>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>Close</Button>
                {isManager && (
                  <Button 
                    variant="destructive" 
                    onClick={() => {
                      // Delete functionality would go here
                      setIsViewModalOpen(false);
                    }}
                  >
                    Delete
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskManagementInterface;