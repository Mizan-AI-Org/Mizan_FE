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
import { Plus, AlertTriangle, AlertCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:8000/api';

interface SafetyConcern {
  id: string;
  title: string;
  description: string;
  location: string;
  severity: string;
  status: string;
  created_at: string;
  is_anonymous?: boolean;
  reporter_details?: {
    id: string;
    username?: string;
    first_name: string;
    last_name: string;
  };
  restaurant: {
    id: string;
    name: string;
  };
}

const SafetyConcernReporting: React.FC = () => {
  const { user, accessToken } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<SafetyConcern>>({
    title: '',
    description: '',
    location: '',
    severity: 'medium',
    status: 'reported',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Fetch Incidents
  const { data: concerns, isLoading } = useQuery({
    queryKey: ['safety-concerns'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/staff/safety-concerns/`, {
        headers: {
          'Authorization': `Bearer ${accessToken || localStorage.getItem('access_token') || ''}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch incidents');
      }

      return response.json();
    },
  });

  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalItems = Array.isArray(concerns) ? concerns.length : 0;
  const totalPages = totalItems ? Math.ceil(totalItems / pageSize) : 1;
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pageConcerns = Array.isArray(concerns) ? concerns.slice(startIndex, endIndex) : [];

  // Create Safety Concern mutation
  const createConcernMutation = useMutation({
    mutationFn: async (data: Partial<SafetyConcern>) => {
      const form = new FormData();
      form.append('title', data.title || '');
      form.append('description', data.description || '');
      form.append('location', data.location || '');
      form.append('severity', (data.severity || 'medium').toUpperCase());
      form.append('status', (data.status || 'reported').toUpperCase());
      form.append('is_anonymous', 'false');
      if (photoFile) {
        form.append('photo', photoFile);
      }

      const response = await fetch(`${API_BASE}/staff/safety-concerns/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken || localStorage.getItem('access_token') || ''}`,
        },
        body: form,
      });

      if (!response.ok) {
        let message = 'Failed to create incident';
        try {
          const err = await response.json();
          message = err?.message || err?.detail || err?.error || message;
        } catch { void 0; }
        throw new Error(message);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety-concerns'] });
      setIsModalOpen(false);
      setFormData({
        title: '',
        description: '',
        location: '',
        severity: 'medium',
        status: 'reported',
      });
      setPhotoFile(null);
      setPhotoPreview(null);
      toast({
        title: 'Success',
        description: 'Incident reported successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to report incident: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createConcernMutation.mutate(formData);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setPhotoFile(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  };

  const getSeverityBadge = (severity: string) => {
    const sev = (severity || '').toLowerCase();
    switch (sev) {
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge>{severity}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'reported':
        return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">Reported</Badge>;
      case 'investigating':
      case 'under_review':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">Investigating</Badge>;
      case 'resolved':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Resolved</Badge>;
      case 'dismissed':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">Dismissed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Incident Reporting</CardTitle>
          <CardDescription>
            Report and track Incidents and safety concerns in your restaurant
          </CardDescription>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Report Incidents
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-4">Loading Incidence & Safety...</div>
        ) : (
          <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reported At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageConcerns && pageConcerns.length > 0 ? (
                pageConcerns.map((concern: SafetyConcern) => (
                  <TableRow key={concern.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <AlertTriangle className="mr-2 h-4 w-4 text-amber-500" />
                        {concern.title}
                      </div>
                    </TableCell>
                    <TableCell>{concern.location}</TableCell>
                    <TableCell>{getSeverityBadge(concern.severity)}</TableCell>
                    <TableCell>{getStatusBadge(concern.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Clock className="mr-2 h-3 w-3 text-muted-foreground" />
                        {new Date(concern.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mb-2" />
                      <p>No incidents reported</p>
                      <Button
                        variant="outline"
                        className="mt-2"
                        onClick={() => setIsModalOpen(true)}
                      >
                        Report your first incident
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between mt-3">
            <div className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Button key={p} variant={p === page ? 'default' : 'outline'} onClick={() => setPage(p)}>{p}</Button>
              ))}
              <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
            </div>
          </div>
          </>
        )}
      </CardContent>

      {/* Create Safety Concern Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Report Safety Concern</DialogTitle>
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
                <Label htmlFor="location" className="text-right">
                  Location
                </Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="severity" className="text-right">
                  Severity
                </Label>
                <Select
                  value={formData.severity ?? 'medium'}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, severity: value }))}
                >
                  <SelectTrigger id="severity" className="col-span-3">
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
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
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="photo" className="text-right">
                  Photo
                </Label>
                <div className="col-span-3 space-y-2">
                  <Input
                    id="photo"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoChange}
                  />
                  {photoPreview && (
                    <div className="border rounded-md p-2">
                      <img src={photoPreview} alt="Preview" className="max-h-48 rounded" />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createConcernMutation.isPending}>
                {createConcernMutation.isPending ? 'Submitting...' : 'Submit Report'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SafetyConcernReporting;