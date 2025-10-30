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
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, CheckSquare, AlertCircle, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:8000/api';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  category: string;
  frequency: string;
  is_completed: boolean;
  completed_at?: string;
  completed_by?: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
  };
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

const SafetyChecklistComponent: React.FC = () => {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<ChecklistItem>>({
    title: '',
    description: '',
    category: 'DAILY',
    frequency: 'DAILY',
  });

  // Fetch Checklists
  const { data: checklists, isLoading } = useQuery({
    queryKey: ['safety-checklists'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/safety-checklists/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch safety checklists');
      }
      
      return response.json();
    },
  });

  // Create Checklist mutation
  const createChecklistMutation = useMutation({
    mutationFn: async (data: Partial<ChecklistItem>) => {
      const response = await fetch(`${API_BASE}/safety-checklists/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create checklist item');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety-checklists'] });
      setIsModalOpen(false);
      setFormData({
        title: '',
        description: '',
        category: 'DAILY',
        frequency: 'DAILY',
      });
      toast({
        title: 'Success',
        description: 'Safety checklist item created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create checklist item: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Toggle completion status mutation
  const toggleCompletionMutation = useMutation({
    mutationFn: async ({ id, is_completed }: { id: string; is_completed: boolean }) => {
      const response = await fetch(`${API_BASE}/safety-checklists/${id}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_completed }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update checklist status');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety-checklists'] });
      toast({
        title: 'Success',
        description: 'Checklist status updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update status: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createChecklistMutation.mutate(formData);
  };

  const handleToggleCompletion = (item: ChecklistItem) => {
    toggleCompletionMutation.mutate({
      id: item.id,
      is_completed: !item.is_completed,
    });
  };

  const getCategoryLabel = (category: string) => {
    const categories: Record<string, string> = {
      'FOOD_SAFETY': 'Food Safety',
      'EQUIPMENT': 'Equipment',
      'CLEANING': 'Cleaning',
      'OPENING': 'Opening',
      'CLOSING': 'Closing',
    };
    
    return categories[category] || category;
  };

  const getFrequencyLabel = (frequency: string) => {
    const frequencies: Record<string, string> = {
      'DAILY': 'Daily',
      'WEEKLY': 'Weekly',
      'MONTHLY': 'Monthly',
      'QUARTERLY': 'Quarterly',
      'YEARLY': 'Yearly',
    };
    
    return frequencies[frequency] || frequency;
  };

  const getFrequencyBadge = (frequency: string) => {
    switch (frequency) {
      case 'DAILY':
        return <Badge variant="default">Daily</Badge>;
      case 'WEEKLY':
        return <Badge variant="secondary">Weekly</Badge>;
      case 'MONTHLY':
        return <Badge variant="outline">Monthly</Badge>;
      case 'QUARTERLY':
        return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">Quarterly</Badge>;
      case 'YEARLY':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">Yearly</Badge>;
      default:
        return <Badge>{frequency}</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Safety Checklists</CardTitle>
          <CardDescription>
            Manage and complete safety checklists for your restaurant
          </CardDescription>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Checklist Item
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-4">Loading checklists...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Status</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Completed By</TableHead>
                <TableHead>Completed At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {checklists && checklists.length > 0 ? (
                checklists.map((item: ChecklistItem) => (
                  <TableRow key={item.id} className={item.is_completed ? "bg-muted/30" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={item.is_completed}
                        onCheckedChange={() => handleToggleCompletion(item)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <CheckSquare className="mr-2 h-4 w-4 text-muted-foreground" />
                        {item.title}
                      </div>
                    </TableCell>
                    <TableCell>{getCategoryLabel(item.category)}</TableCell>
                    <TableCell>{getFrequencyBadge(item.frequency)}</TableCell>
                    <TableCell>
                      {item.completed_by ? `${item.completed_by.first_name} ${item.completed_by.last_name}` : '-'}
                    </TableCell>
                    <TableCell>
                      {item.completed_at ? new Date(item.completed_at).toLocaleDateString() : '-'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mb-2" />
                      <p>No safety checklist items found</p>
                      <Button 
                        variant="outline" 
                        className="mt-2"
                        onClick={() => setIsModalOpen(true)}
                      >
                        Create your first checklist item
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create Checklist Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Safety Checklist Item</DialogTitle>
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
                <Label htmlFor="category" className="text-right">
                  Category
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FOOD_SAFETY">Food Safety</SelectItem>
                    <SelectItem value="EQUIPMENT">Equipment</SelectItem>
                    <SelectItem value="CLEANING">Cleaning</SelectItem>
                    <SelectItem value="OPENING">Opening</SelectItem>
                    <SelectItem value="CLOSING">Closing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="frequency" className="text-right">
                  Frequency
                </Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
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
              <Button type="submit" disabled={createChecklistMutation.isPending}>
                {createChecklistMutation.isPending ? 'Creating...' : 'Create Checklist Item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SafetyChecklistComponent;