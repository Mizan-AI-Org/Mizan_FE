import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/use-auth';
import { AuthContextType } from '../contexts/AuthContext.types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
import { API_BASE } from "@/lib/api";
  Plus,
  Loader2,
  Trash2,
  CheckCircle,
  Circle,
  AlertCircle,
  Users,
  Filter,
  Search,
  ArrowRight
} from 'lucide-react';


interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  assigned_to?: { id: string; first_name: string; last_name: string; };
  category?: { id: string; name: string; color: string; };
  created_at: string;
  completed_at?: string;
  estimated_duration?: string;
  shift?: { id: string; };
}

interface ShiftOption {
  id: string;
  staff: { first_name: string; last_name: string; };
  shift_date: string;
  start_time: string;
  end_time: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

export default function TaskManagementBoard() {
  const { user } = useAuth() as AuthContextType;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [shifts, setShifts] = useState<ShiftOption[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // New task form state
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM' as const,
    status: 'TODO' as const,
    shift_id: '',
    category_id: '',
    assigned_to_id: ''
  });
  
  useEffect(() => {
    loadTasks();
    loadShifts();
    loadCategories();
  }, []);
  
  const loadTasks = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const params = new URLSearchParams();
      
      if (priorityFilter) params.append('priority', priorityFilter);
      if (statusFilter) params.append('status', statusFilter);
      
      const response = await fetch(
        `${API_BASE}/dashboard/tasks/?${params.toString()}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.ok) {
        const data = await response.json();
        setTasks(data.results || data);
      }
    } catch (error) {
      toast.error('Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadShifts = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${API_BASE}/scheduling/assigned-shifts/`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.ok) {
        const data = await response.json();
        setShifts(data.results || data);
      }
    } catch (error) {
      console.error('Failed to load shifts:', error);
    }
  };
  
  const loadCategories = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${API_BASE}/dashboard/task-categories/`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.ok) {
        const data = await response.json();
        setCategories(data.results || data);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };
  
  const createTask = async () => {
    if (!newTask.title.trim() || !newTask.shift_id) {
      toast.error('Please fill in required fields');
      return;
    }
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE}/dashboard/tasks/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newTask)
      });
      
      if (response.ok) {
        toast.success('Task created successfully');
        setNewTask({
          title: '',
          description: '',
          priority: 'MEDIUM',
          status: 'TODO',
          shift_id: '',
          category_id: '',
          assigned_to_id: ''
        });
        setIsDialogOpen(false);
        loadTasks();
      } else {
        throw new Error('Failed to create task');
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };
  
  const updateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE}/dashboard/tasks/${taskId}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (response.ok) {
        toast.success(`Task status updated to ${newStatus}`);
        loadTasks();
      }
    } catch (error) {
      toast.error('Failed to update task');
    }
  };
  
  const markTaskCompleted = async (taskId: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE}/dashboard/tasks/${taskId}/mark_completed/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('Task marked as completed');
        loadTasks();
      }
    } catch (error) {
      toast.error('Failed to mark task as completed');
    }
  };
  
  const deleteTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE}/dashboard/tasks/${taskId}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('Task deleted');
        loadTasks();
      }
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };
  
  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'IN_PROGRESS':
        return <Circle className="w-4 h-4 text-blue-500" />;
      case 'TODO':
        return <Circle className="w-4 h-4 text-gray-400" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };
  
  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });
  
  // Group tasks by status
  const tasksByStatus = {
    'TODO': filteredTasks.filter(t => t.status === 'TODO'),
    'IN_PROGRESS': filteredTasks.filter(t => t.status === 'IN_PROGRESS'),
    'COMPLETED': filteredTasks.filter(t => t.status === 'COMPLETED')
  };
  
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Task Management</h1>
          <p className="text-gray-600 mt-2">Organize and track all your tasks</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Task Title *</label>
                <Input
                  value={newTask.title}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  placeholder="Enter task title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  placeholder="Enter task description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({...newTask, priority: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    value={newTask.category_id}
                    onChange={(e) => setNewTask({...newTask, category_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Shift *</label>
                <select
                  value={newTask.shift_id}
                  onChange={(e) => setNewTask({...newTask, shift_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select shift</option>
                  {shifts.map(shift => (
                    <option key={shift.id} value={shift.id}>
                      {shift.staff.first_name} {shift.staff.last_name} - {shift.shift_date}
                    </option>
                  ))}
                </select>
              </div>
              
              <Button onClick={createTask} className="w-full">
                Create Task
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md"
        >
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
      </div>
      
      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {['TODO', 'IN_PROGRESS', 'COMPLETED'].map(status => (
            <div key={status}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  {status === 'TODO' && <Circle className="w-4 h-4 text-gray-400" />}
                  {status === 'IN_PROGRESS' && <AlertCircle className="w-4 h-4 text-blue-500" />}
                  {status === 'COMPLETED' && <CheckCircle className="w-4 h-4 text-green-500" />}
                  {status.replace(/_/g, ' ')}
                </h3>
                <Badge variant="secondary">
                  {tasksByStatus[status as keyof typeof tasksByStatus].length}
                </Badge>
              </div>
              
              <div className="space-y-3 min-h-96">
                {tasksByStatus[status as keyof typeof tasksByStatus].map(task => (
                  <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{task.title}</p>
                            {task.description && (
                              <p className="text-xs text-gray-600 line-clamp-2">{task.description}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-1">
                          <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </Badge>
                          {task.category && (
                            <Badge style={{backgroundColor: task.category.color, opacity: 0.8}} className="text-xs text-white">
                              {task.category.name}
                            </Badge>
                          )}
                        </div>
                        
                        {task.assigned_to && (
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Users className="w-3 h-3" />
                            {task.assigned_to.first_name} {task.assigned_to.last_name}
                          </div>
                        )}
                        
                        <div className="flex gap-1 pt-2 border-t pt-2">
                          {status !== 'COMPLETED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markTaskCompleted(task.id)}
                              className="text-xs flex-1"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Complete
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteTask(task.id)}
                            className="text-xs text-red-600"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}