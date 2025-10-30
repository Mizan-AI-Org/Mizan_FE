import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, CheckCircle2, Clock, AlertCircle, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:8000/api';

interface Staff {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface ScheduleTask {
  id: string;
  title: string;
  description: string;
  due_date: string;
  priority: string;
  status: string;
  assigned_to: Staff;
  created_at: string;
  created_by: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
  };
  restaurant: {
    id: string;
    name: string;
  };
}

const ScheduleTaskManager: React.FC = () => {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<ScheduleTask>>({
    title: '',
    description: '',
    due_date: format(new Date(), 'yyyy-MM-dd'),
    priority: 'medium',
    status: 'pending',
    assigned_to: undefined,
  });

  // Fetch Tasks
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['schedule-tasks'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/schedule-tasks/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      
      return response.json();
    },
  });

  // Fetch Staff
  const { data: staff, isLoading: staffLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/staff/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch staff');
      }
      
      return response.json();
    },
  });

  // Create Task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: Partial<ScheduleTask>) => {
      const response = await fetch(`${API_BASE}/schedule-tasks/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create task');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-tasks'] });
      setIsModalOpen(false);
      setFormData({
        title: '',
        description: '',
        due_date: format(new Date(), 'yyyy-MM-dd'),
        priority: 'medium',
        status: 'pending',
        assigned_to: undefined,
      });
      toast({
        title: 'Success',
        description: 'Task created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create task: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Complete Task mutation
  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await fetch(`${API_BASE}/schedule-tasks/${taskId}/complete_task/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to complete task');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-tasks'] });
      toast({
        title: 'Success',
        description: 'Task marked as completed',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to complete task: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTaskMutation.mutate(formData);
  };

  const handleCompleteTask = (taskId: string) => {
    completeTaskMutation.mutate(taskId);
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge>{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Completed</Badge>;
      case 'in_progress':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">In Progress</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const isLoading = tasksLoading || staffLoading;

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Schedule Tasks</CardTitle>
          <CardDescription>
            Manage and assign safety-related tasks
          </CardDescription>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Task
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-4">Loading tasks...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks && tasks.length > 0 ? (
                tasks.map((task: ScheduleTask) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        {task.status === 'completed' ? (
                          <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                        ) : (
                          <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                        )}
                        {task.title}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <User className="mr-2 h-4 w-4 text-muted-foreground" />
                        {task.assigned_to ? `${task.assigned_to.first_name} ${task.assigned_to.last_name}` : 'Unassigned'}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(task.due_date).toLocaleDateString()}</TableCell>
                    <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                    <TableCell>{getStatusBadge(task.status)}</TableCell>
                    <TableCell className="text-right">
                      {task.status !== 'completed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCompleteTask(task.id)}
                          className="h-8 px-2 text-xs"
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Complete
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mb-2" />
                      <p>No tasks found</p>
                      <Button 
                        variant="outline" 
                        className="mt-2"
                        onClick={() => setIsModalOpen(true)}
                      >
                        Create your first task
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create Task Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Schedule Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">
                  Title
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="assigned_to" className="text-right">
                  Assign To
                </Label>
                <Select
                  value={formData.assigned_to?.id}
                  onValueChange={(value) => {
                    const selectedStaff = staff?.find((s: Staff) => s.id === value);
                    setFormData({ ...formData, assigned_to: selectedStaff });
                  }}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff?.map((staffMember: Staff) => (
                      <SelectItem key={staffMember.id} value={staffMember.id}>
                        {staffMember.first_name} {staffMember.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="due_date" className="text-right">
                  Due Date
                </Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="priority" className="text-right">
                  Priority
                </Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="col-span-3"
                  rows={5}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTaskMutation.isPending}>
                {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ScheduleTaskManager;