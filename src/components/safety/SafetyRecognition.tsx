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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Award, AlertCircle, User, Trophy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:8000/api';

interface Staff {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface SafetyRecognition {
  id: string;
  title: string;
  description: string;
  points: number;
  awarded_to: Staff;
  awarded_by: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
  };
  created_at: string;
  restaurant: {
    id: string;
    name: string;
  };
}

interface LeaderboardEntry {
  staff: Staff;
  total_points: number;
  recognition_count: number;
}

const SafetyRecognitionComponent: React.FC = () => {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<SafetyRecognition>>({
    title: '',
    description: '',
    points: 10,
    awarded_to: undefined,
  });

  // Fetch Recognitions
  const { data: recognitions, isLoading: recognitionsLoading } = useQuery({
    queryKey: ['safety-recognitions'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/staff/safety-recognitions/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch safety recognitions');
      }

      return response.json();
    },
  });

  // Fetch Leaderboard
  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery({
    queryKey: ['safety-leaderboard'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/staff/safety-recognitions/leaderboard/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch safety leaderboard');
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

  // Create Recognition mutation
  const createRecognitionMutation = useMutation({
    mutationFn: async (data: Partial<SafetyRecognition>) => {
      const response = await fetch(`${API_BASE}/staff/safety-recognitions/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create recognition');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety-recognitions'] });
      queryClient.invalidateQueries({ queryKey: ['safety-leaderboard'] });
      setIsModalOpen(false);
      setFormData({
        title: '',
        description: '',
        points: 10,
        awarded_to: undefined,
      });
      toast({
        title: 'Success',
        description: 'Safety recognition created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create recognition: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRecognitionMutation.mutate(formData);
  };

  const isLoading = recognitionsLoading || leaderboardLoading || staffLoading;

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle> Recognition</CardTitle>
          <CardDescription>
            Staff Recognition and Award for Excellence
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="recognitions">
          <TabsList className="mb-4">
            <TabsTrigger value="recognitions">Recent Recognitions</TabsTrigger>
            <TabsTrigger value="leaderboard">Safety Leaderboard</TabsTrigger>
          </TabsList>

          <TabsContent value="recognitions">
            {isLoading ? (
              <div className="flex justify-center p-4">Loading recognitions...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Awarded To</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Awarded By</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recognitions && recognitions.length > 0 ? (
                    recognitions.map((recognition: SafetyRecognition) => (
                      <TableRow key={recognition.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <Award className="mr-2 h-4 w-4 text-yellow-500" />
                            {recognition.title}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <User className="mr-2 h-4 w-4 text-muted-foreground" />
                            {recognition.awarded_to.first_name} {recognition.awarded_to.last_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                            +{recognition.points} points
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {recognition.awarded_by.first_name} {recognition.awarded_by.last_name}
                        </TableCell>
                        <TableCell>
                          {new Date(recognition.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <AlertCircle className="h-8 w-8 mb-2" />
                          <p>No safety recognitions found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="leaderboard">
            {isLoading ? (
              <div className="flex justify-center p-4">Loading leaderboard...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Total Points</TableHead>
                    <TableHead>Recognitions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard && leaderboard.length > 0 ? (
                    leaderboard.map((entry: LeaderboardEntry, index: number) => (
                      <TableRow key={entry.staff.id} className={index < 3 ? "bg-amber-50" : ""}>
                        <TableCell>
                          {index === 0 ? (
                            <div className="flex items-center">
                              <Trophy className="mr-2 h-5 w-5 text-yellow-500" />
                              <span className="font-bold">1st</span>
                            </div>
                          ) : index === 1 ? (
                            <div className="flex items-center">
                              <Trophy className="mr-2 h-5 w-5 text-gray-400" />
                              <span className="font-bold">2nd</span>
                            </div>
                          ) : index === 2 ? (
                            <div className="flex items-center">
                              <Trophy className="mr-2 h-5 w-5 text-amber-700" />
                              <span className="font-bold">3rd</span>
                            </div>
                          ) : (
                            <span className="pl-7">{index + 1}th</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <User className="mr-2 h-4 w-4 text-muted-foreground" />
                            {entry.staff.first_name} {entry.staff.last_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                            {entry.total_points} points
                          </Badge>
                        </TableCell>
                        <TableCell>{entry.recognition_count} recognitions</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <AlertCircle className="h-8 w-8 mb-2" />
                          <p>No leaderboard data available</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Create Recognition Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Award Safety Recognition</DialogTitle>
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
                <Label htmlFor="awarded_to" className="text-right">
                  Award To
                </Label>
                <Select
                  value={formData.awarded_to?.id}
                  onValueChange={(value) => {
                    const selectedStaff = staff?.find((s: Staff) => s.id === value);
                    setFormData({ ...formData, awarded_to: selectedStaff });
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
                <Label htmlFor="points" className="text-right">
                  Points
                </Label>
                <Select
                  value={formData.points?.toString()}
                  onValueChange={(value) => setFormData({ ...formData, points: parseInt(value) })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select points" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 points</SelectItem>
                    <SelectItem value="10">10 points</SelectItem>
                    <SelectItem value="15">15 points</SelectItem>
                    <SelectItem value="25">25 points</SelectItem>
                    <SelectItem value="50">50 points</SelectItem>
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
              <Button type="submit" disabled={createRecognitionMutation.isPending}>
                {createRecognitionMutation.isPending ? 'Awarding...' : 'Award Recognition'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SafetyRecognitionComponent;