import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Clock, DollarSign, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:8000/api';

interface TimesheetEntry {
  id: number;
  shift: number;
  shift_details: {
    staff_name: string;
    shift_date: string;
    start_time: string;
    end_time: string;
  };
  hours_worked: number;
  notes: string;
  created_at: string;
}

interface Timesheet {
  id: number;
  staff: number;
  staff_name: string;
  restaurant: number;
  start_date: string;
  end_date: string;
  total_hours: number;
  total_earnings: number;
  hourly_rate: number;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PAID';
  notes: string;
  submitted_at: string | null;
  approved_at: string | null;
  approved_by_name: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  entries: TimesheetEntry[];
}

const Timesheets: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const queryClient = useQueryClient();

  // Fetch timesheets
  const { data: timesheets = [], isLoading, error } = useQuery({
    queryKey: ['timesheets', statusFilter],
    queryFn: async () => {
      const url = new URL(`${API_BASE}/timesheets/`, window.location.origin);
      if (statusFilter !== 'all') {
        url.searchParams.append('status', statusFilter);
      }
      
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized');
        }
        throw new Error('Failed to fetch timesheets');
      }

      const data = await response.json();
      return Array.isArray(data) ? data : data.results || [];
    },
  });

  // Approve timesheet mutation
  const approveTimesheetMutation = useMutation({
    mutationFn: async (timesheetId: number) => {
      const response = await fetch(`${API_BASE}/timesheets/${timesheetId}/approve/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to approve timesheet');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Timesheet approved successfully');
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
      setShowApproveDialog(false);
      setSelectedTimesheet(null);
    },
    onError: (error) => {
      toast.error((error as Error).message || 'Failed to approve timesheet');
    },
  });

  // Mark as paid mutation
  const markAsPaidMutation = useMutation({
    mutationFn: async (timesheetId: number) => {
      const response = await fetch(`${API_BASE}/timesheets/${timesheetId}/mark_paid/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to mark as paid');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Timesheet marked as paid');
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
    },
    onError: (error) => {
      toast.error((error as Error).message || 'Failed to mark as paid');
    },
  });

  const filteredTimesheets = timesheets.filter((timesheet: Timesheet) =>
    timesheet.staff_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-800';
      case 'SUBMITTED':
        return 'bg-blue-100 text-blue-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'PAID':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'PAID':
        return <CheckCircle className="w-4 h-4" />;
      case 'SUBMITTED':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">{(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Timesheets</h1>
        <p className="text-gray-600 mt-1">Manage and approve staff timesheets</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Submitted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {timesheets.filter((t: Timesheet) => t.status === 'SUBMITTED').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {timesheets.filter((t: Timesheet) => t.status === 'APPROVED').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {timesheets.filter((t: Timesheet) => t.status === 'PAID').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              <DollarSign className="w-5 h-5" />
              {formatCurrency(
                timesheets
                  .filter((t: Timesheet) => t.status === 'APPROVED')
                  .reduce((sum: number, t: Timesheet) => sum + (t.total_earnings || 0), 0)
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Input
            placeholder="Search by staff name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="SUBMITTED">Submitted</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Timesheets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Timesheets</CardTitle>
          <CardDescription>
            {filteredTimesheets.length} timesheet{filteredTimesheets.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Earnings</TableHead>
                  <TableHead>Rate/Hour</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTimesheets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No timesheets found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTimesheets.map((timesheet: Timesheet) => (
                    <TableRow key={timesheet.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{timesheet.staff_name}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatDate(timesheet.start_date)} - {formatDate(timesheet.end_date)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-gray-500" />
                          {timesheet.total_hours.toFixed(1)}h
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(timesheet.total_earnings)}
                      </TableCell>
                      <TableCell>{formatCurrency(timesheet.hourly_rate)}/h</TableCell>
                      <TableCell>
                        <Badge className={`${getStatusBadgeColor(timesheet.status)} flex items-center gap-1 w-fit`}>
                          {getStatusIcon(timesheet.status)}
                          {timesheet.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {timesheet.status === 'SUBMITTED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedTimesheet(timesheet);
                                setShowApproveDialog(true);
                              }}
                              disabled={approveTimesheetMutation.isPending}
                            >
                              Approve
                            </Button>
                          )}
                          {timesheet.status === 'APPROVED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markAsPaidMutation.mutate(timesheet.id)}
                              disabled={markAsPaidMutation.isPending}
                            >
                              Mark Paid
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedTimesheet(timesheet)}
                          >
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Timesheet Details Modal */}
      {selectedTimesheet && !showApproveDialog && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Timesheet Details</CardTitle>
                <CardDescription>{selectedTimesheet.staff_name}</CardDescription>
              </div>
              <Button
                variant="ghost"
                onClick={() => setSelectedTimesheet(null)}
              >
                ✕
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Period</p>
                <p className="font-medium">
                  {formatDate(selectedTimesheet.start_date)} - {formatDate(selectedTimesheet.end_date)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <Badge className={getStatusBadgeColor(selectedTimesheet.status)}>
                  {selectedTimesheet.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Hours</p>
                <p className="font-medium">{selectedTimesheet.total_hours.toFixed(2)} hours</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Hourly Rate</p>
                <p className="font-medium">{formatCurrency(selectedTimesheet.hourly_rate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Earnings</p>
                <p className="font-medium text-lg text-green-600">
                  {formatCurrency(selectedTimesheet.total_earnings)}
                </p>
              </div>
              {selectedTimesheet.approved_by_name && (
                <div>
                  <p className="text-sm text-gray-600">Approved By</p>
                  <p className="font-medium">{selectedTimesheet.approved_by_name}</p>
                </div>
              )}
            </div>

            {selectedTimesheet.entries.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Entries</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {selectedTimesheet.entries.map((entry) => (
                    <div key={entry.id} className="p-2 bg-gray-50 rounded border border-gray-200">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">{formatDate(entry.shift_details.shift_date)}</span>
                        <span className="text-sm font-medium">{entry.hours_worked.toFixed(2)}h</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        {entry.shift_details.start_time} - {entry.shift_details.end_time}
                      </p>
                      {entry.notes && (
                        <p className="text-xs text-gray-600 mt-1">{entry.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedTimesheet.notes && (
              <div>
                <p className="text-sm text-gray-600">Notes</p>
                <p className="text-sm">{selectedTimesheet.notes}</p>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              {selectedTimesheet.status === 'SUBMITTED' && (
                <Button
                  onClick={() => {
                    setShowApproveDialog(true);
                  }}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve Timesheet
                </Button>
              )}
              {selectedTimesheet.status === 'APPROVED' && (
                <Button
                  onClick={() => markAsPaidMutation.mutate(selectedTimesheet.id)}
                  className="flex items-center gap-2"
                  disabled={markAsPaidMutation.isPending}
                >
                  <DollarSign className="w-4 h-4" />
                  {markAsPaidMutation.isPending ? 'Processing...' : 'Mark as Paid'}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setSelectedTimesheet(null)}
              >
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approve Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogTitle>Approve Timesheet?</AlertDialogTitle>
          <AlertDialogDescription>
            {selectedTimesheet && (
              <div className="space-y-2">
                <p>Are you sure you want to approve the timesheet for {selectedTimesheet.staff_name}?</p>
                <p className="font-semibold">
                  Total Hours: {selectedTimesheet.total_hours.toFixed(2)}h | 
                  Total Earnings: {formatCurrency(selectedTimesheet.total_earnings)}
                </p>
              </div>
            )}
          </AlertDialogDescription>
          <div className="flex gap-3 mt-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedTimesheet && approveTimesheetMutation.mutate(selectedTimesheet.id)}
              disabled={approveTimesheetMutation.isPending}
            >
              {approveTimesheetMutation.isPending ? 'Approving...' : 'Approve'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Timesheets;