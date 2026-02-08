import React, { useEffect, useMemo, useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Clock, DollarSign, CheckCircle, AlertCircle, Download, Edit, ArrowUpDown, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import AssignedShiftModal from '@/components/schedule/AssignedShiftModal';
import { API_BASE } from "@/lib/api";


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

// Assigned Shift interfaces for staff shift management
interface AssignedShift {
  id: string;
  staff: string; // user id
  staff_info: { id: string; first_name: string; last_name: string; email: string };
  shift_date: string;
  start_time: string;
  end_time: string;
  role: string;
  status?: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  is_confirmed?: boolean;
  actual_hours?: number;
  notes: string | null;
}

interface BackendUserSummary {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  profile?: { department?: string | null };
}

const Timesheets: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const queryClient = useQueryClient();

  // Staff Shifts state and filters
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [shiftStatusFilter, setShiftStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [shiftSearch, setShiftSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'time'>('time');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedShiftIds, setSelectedShiftIds] = useState<Set<string>>(new Set());
  const [editingShift, setEditingShift] = useState<AssignedShift | null>(null);

  // Initialize date range to current week to keep Timesheet and Staff Shifts in sync
  useEffect(() => {
    if (!dateFrom && !dateTo) {
      const base = new Date();
      const day = base.getDay(); // 0=Sun..6=Sat
      const weekStart = new Date(base); weekStart.setDate(base.getDate() - day);
      const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
      const toYMD = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
      };
      setDateFrom(toYMD(weekStart));
      setDateTo(toYMD(weekEnd));
    }
  }, []);

  // Fetch timesheets
  const { data: timesheets = [], isLoading, error } = useQuery({
    queryKey: ['timesheets', statusFilter],
    queryFn: async () => {
      const url = new URL(`${API_BASE}/scheduling/timesheets/`, window.location.origin);
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

  // Fetch assigned shifts with optional date range
  const { data: assignedShifts = [], isLoading: isLoadingShifts, error: shiftsError, refetch: refetchShifts } = useQuery<AssignedShift[]>({
    queryKey: ['assigned-shifts', dateFrom, dateTo],
    queryFn: async () => {
      const qp = new URLSearchParams();
      if (dateFrom) qp.append('date_from', dateFrom);
      if (dateTo) qp.append('date_to', dateTo);
      const url = `${API_BASE}/scheduling/assigned-shifts-v2/${qp.toString() ? `?${qp.toString()}` : ''}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch assigned shifts');
      const data = await response.json();
      return Array.isArray(data) ? data : data.results || [];
    },
  });

  // Manager's weekly grid view helpers
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekRange = useMemo(() => {
    const base = dateFrom ? new Date(dateFrom) : new Date();
    const day = base.getDay(); // 0=Sun..6=Sat
    const weekStart = new Date(base); weekStart.setDate(base.getDate() - day);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
      return d;
    });
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
    return { weekStart, days, label: `${fmt(days[0])} – ${fmt(days[6])}` };
  }, [dateFrom]);

  const roleColor = (role?: string) => {
    const r = (role || '').toUpperCase();
    if (r.includes('CHEF')) return 'bg-green-100 border-green-300 text-green-800';
    if (r.includes('WAITER')) return 'bg-blue-100 border-blue-300 text-blue-800';
    if (r.includes('CASHIER')) return 'bg-yellow-100 border-yellow-300 text-yellow-800';
    if (r.includes('CLEAN')) return 'bg-red-100 border-red-300 text-red-800';
    return 'bg-muted/30 border-muted text-foreground';
  };

  const hhmm = (s?: string) => (s ? s.substring(11, 16) || s.substring(0, 5) : '');
  const hoursBetween = (start?: string, end?: string) => {
    try {
      if (!start || !end) return 0;
      const a = new Date(start);
      const b = new Date(end);
      return Math.max(0, (b.getTime() - a.getTime()) / 3600000);
    } catch { return 0; }
  };



  // Fetch users for department mapping
  const { data: users = [] } = useQuery<BackendUserSummary[]>({
    queryKey: ['users-for-dept'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/users/`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
      });
      if (!response.ok) return [];
      return response.json();
    },
  });

  const userDeptMap = useMemo(() => {
    const map = new Map<string, string | null>();
    users.forEach(u => map.set(u.id, u.profile?.department ?? null));
    return map;
  }, [users]);

  // Map user id -> basic identity for enriching shifts lacking staff_info
  const userInfoMap = useMemo(() => {
    const map = new Map<string, { first_name: string; last_name: string; email: string }>();
    users.forEach(u => map.set(u.id, { first_name: u.first_name, last_name: u.last_name, email: u.email }));
    return map;
  }, [users]);

  // Ensure each shift has staff_info populated so UI always shows names
  const assignedShiftsWithInfo = useMemo(() => {
    return assignedShifts.map((s) => {
      if (s?.staff_info && (s.staff_info.first_name || s.staff_info.last_name || s.staff_info.email)) {
        return s;
      }
      const info = userInfoMap.get(s.staff) || { first_name: '', last_name: '', email: '' };
      return { ...s, staff_info: { id: s.staff, first_name: info.first_name, last_name: info.last_name, email: info.email } } as AssignedShift;
    });
  }, [assignedShifts, userInfoMap]);

  const weeklyByStaff = useMemo(() => {
    const map = new Map<string, { name: string; days: Record<number, AssignedShift[]>; total: number }>();
    const startYMD = weekRange.days[0].toISOString().slice(0, 10);
    const endYMD = weekRange.days[6].toISOString().slice(0, 10);
    const inWeek = (d: string) => d >= startYMD && d <= endYMD;
    for (const s of assignedShiftsWithInfo) {
      const ymd = s.shift_date.slice(0, 10);
      if (!inWeek(ymd)) continue;
      const key = s.staff_info ? s.staff_info.id : s.staff;
      const fullName = `${s.staff_info?.first_name || ''} ${s.staff_info?.last_name || ''}`.trim();
      const name = fullName || s.staff_info?.email || s.staff;
      const dayIdx = new Date(ymd).getDay();
      const rec = map.get(key) || { name, days: {}, total: 0 };
      (rec.days[dayIdx] ||= []).push(s);
      rec.total += s.actual_hours ?? hoursBetween(s.start_time, s.end_time);
      map.set(key, rec);
    }
    return Array.from(map.entries()).map(([id, v]) => ({ id, ...v }));
  }, [assignedShiftsWithInfo, weekRange]);

  // Approve timesheet mutation
  const approveTimesheetMutation = useMutation({
    mutationFn: async (timesheetId: number) => {
      const response = await fetch(`${API_BASE}/scheduling/timesheets/${timesheetId}/approve/`, {
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
      const response = await fetch(`${API_BASE}/scheduling/timesheets/${timesheetId}/mark_paid/`, {
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

  // Derive filtered, searched, and sorted shifts
  const processedShifts = useMemo(() => {
    let list: AssignedShift[] = assignedShiftsWithInfo;
    // Ensure list aligns with current week when dateFrom/dateTo are set
    if (dateFrom && dateTo) {
      const inRange = (d: string) => {
        const ymd = d.slice(0, 10);
        return ymd >= dateFrom && ymd <= dateTo;
      };
      list = list.filter(s => inRange(s.shift_date));
    }
    if (shiftStatusFilter !== 'all') {
      list = list.filter(s => (s.status || (s.is_confirmed ? 'CONFIRMED' : 'SCHEDULED')) === shiftStatusFilter);
    }
    if (departmentFilter !== 'all') {
      list = list.filter(s => (userDeptMap.get(s.staff_info?.id || s.staff) || '').toLowerCase() === departmentFilter.toLowerCase());
    }
    if (shiftSearch.trim()) {
      const q = shiftSearch.trim().toLowerCase();
      list = list.filter(s => `${s.staff_info?.first_name || ''} ${s.staff_info?.last_name || ''}`.toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => {
      if (sortBy === 'name') {
        const an = `${a.staff_info?.first_name || ''} ${a.staff_info?.last_name || ''}`.toLowerCase();
        const bn = `${b.staff_info?.first_name || ''} ${b.staff_info?.last_name || ''}`.toLowerCase();
        return sortDir === 'asc' ? an.localeCompare(bn) : bn.localeCompare(an);
      } else {
        const at = `${a.shift_date} ${a.start_time}`;
        const bt = `${b.shift_date} ${b.start_time}`;
        return sortDir === 'asc' ? at.localeCompare(bt) : bt.localeCompare(at);
      }
    });
    return list;
  }, [assignedShiftsWithInfo, dateFrom, dateTo, shiftStatusFilter, departmentFilter, shiftSearch, sortBy, sortDir, userDeptMap]);

  const toggleSelectAll = (checked: boolean) => {
    setSelectedShiftIds(checked ? new Set(processedShifts.map(s => s.id)) : new Set());
  };
  const toggleSelectOne = (id: string, checked: boolean) => {
    setSelectedShiftIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  // Mutations for bulk actions
  const confirmShiftMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/scheduling/assigned-shifts-v2/${id}/confirm/`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }, credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to confirm shift');
      return res.json();
    },
    onSuccess: () => { toast.success('Shift confirmed'); refetchShifts(); }
  });
  const completeShiftMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/scheduling/assigned-shifts-v2/${id}/complete/`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }, credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to complete shift');
      return res.json();
    },
    onSuccess: () => { toast.success('Shift marked completed'); refetchShifts(); }
  });
  const deleteShiftMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/scheduling/assigned-shifts-v2/${id}/`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }, credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to delete shift');
    },
    onSuccess: () => { toast.success('Shift deleted'); refetchShifts(); }
  });

  const bulkConfirm = () => selectedShiftIds.forEach(id => confirmShiftMutation.mutate(id));
  const bulkComplete = () => selectedShiftIds.forEach(id => completeShiftMutation.mutate(id));
  const bulkDelete = () => selectedShiftIds.forEach(id => deleteShiftMutation.mutate(id));

  const exportCSV = () => {
    const headers = ['Staff Name', 'Date', 'Start', 'End', 'Role', 'Status'];
    const rows = processedShifts.map(s => [
      `${s.staff_info?.first_name || ''} ${s.staff_info?.last_name || ''}`.trim() || (s.staff_info?.email || ''),
      s.shift_date,
      s.start_time,
      s.end_time,
      s.role,
      s.status || (s.is_confirmed ? 'CONFIRMED' : 'SCHEDULED')
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `staff_shifts_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  /** Export payroll timesheets (hours, earnings) from backend for pay period – CSV for payroll systems */
  const exportPayrollCSV = async () => {
    const start = dateFrom || weekRange.days[0]?.toISOString().slice(0, 10);
    const end = dateTo || weekRange.days[weekRange.days.length - 1]?.toISOString().slice(0, 10);
    if (!start || !end) {
      toast.error('Select a date range first');
      return;
    }
    try {
      const url = `${API_BASE}/scheduling/timesheets/export-payroll/?start_date=${start}&end_date=${end}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || 'Export failed');
        return;
      }
      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `payroll_export_${start}_${end}.csv`;
      a.click();
      URL.revokeObjectURL(downloadUrl);
      toast.success('Payroll CSV downloaded');
    } catch (e) {
      toast.error((e as Error).message || 'Export failed');
    }
  };

  const getShiftBadgeColor = (status?: string) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-green-100 text-green-800';
      case 'COMPLETED': return 'bg-blue-100 text-blue-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      case 'SCHEDULED':
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

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
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Timesheets</h1>
        <p className="text-gray-600 mt-1">Manage and approve staff timesheets</p>
      </div>
      {/* Timesheet (Weekly Grid) */}
      <div className="border rounded-lg shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">Timesheet</div>
            <div className="text-xs text-muted-foreground">{weekRange.label}</div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="bg-muted/40">
                <th className="p-2 text-left">Staff</th>
                {weekRange.days.map((d, i) => (
                  <th key={i} className="p-2 text-center">
                    <div className="font-medium">{dayNames[d.getDay()]}</div>
                    <div className="text-xs text-muted-foreground hidden md:block">{d.toLocaleDateString()}</div>
                  </th>
                ))}
                <th className="p-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {weeklyByStaff.length === 0 ? (
                <tr><td className="p-4 text-center text-muted-foreground" colSpan={weekRange.days.length + 2}>No shifts in selected week</td></tr>
              ) : weeklyByStaff.map(row => (
                <tr key={row.id} className="border-t">
                  <td className="p-2 font-medium">{row.name}</td>
                  {weekRange.days.map((d, i) => {
                    const idx = d.getDay();
                    const shifts = row.days[idx] || [];
                    return (
                      <td key={i} className="p-1 align-top">
                        {shifts.length === 0 ? (
                          <div className="h-10" />
                        ) : shifts.map((s) => (
                          <div key={s.id} className={`border rounded px-2 py-1 mb-1 ${roleColor(s.role)}`}>
                            <div className="font-medium">{hhmm(s.start_time)} – {hhmm(s.end_time)}</div>
                            <div className="text-xs">{s.role}</div>
                          </div>
                        ))}
                      </td>
                    );
                  })}
                  <td className="p-2 text-right font-semibold">{row.total.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Timesheets Table */}
      {/* Staff Shifts Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Staff Shifts</CardTitle>
              <CardDescription>Comprehensive view of assigned shifts</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportCSV} className="flex items-center gap-2">
                <Download className="w-4 h-4" /> Export Shifts CSV
              </Button>
              <Button variant="default" onClick={exportPayrollCSV} className="flex items-center gap-2">
                <Download className="w-4 h-4" /> Export Payroll CSV
              </Button>
              <Button variant="outline" onClick={() => window.print()} className="flex items-center gap-2">
                <Download className="w-4 h-4" /> Print / PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="From" />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="To" />
            <Input placeholder="Search staff..." value={shiftSearch} onChange={(e) => setShiftSearch(e.target.value)} />
            <Select value={shiftStatusFilter} onValueChange={setShiftStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {Array.from(new Set(users.map(u => (u.profile?.department || '').trim()).filter(Boolean))).map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 items-center">
            <Button variant="outline" size="sm" onClick={() => setSortBy(sortBy === 'name' ? 'time' : 'name')} className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4" /> Sort by {sortBy === 'name' ? 'Name' : 'Time'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}>{sortDir.toUpperCase()}</Button>
            <div className="ml-auto flex gap-2 flex-wrap justify-end">
              <Button size="sm" onClick={bulkConfirm} disabled={selectedShiftIds.size === 0}>Confirm Selected</Button>
              <Button size="sm" onClick={bulkComplete} disabled={selectedShiftIds.size === 0}>Mark Completed</Button>
              <Button size="sm" variant="destructive" onClick={bulkDelete} disabled={selectedShiftIds.size === 0} className="flex items-center gap-2">
                <Trash2 className="w-4 h-4" /> Delete
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={selectedShiftIds.size === processedShifts.length && processedShifts.length > 0}
                      onCheckedChange={(v) => toggleSelectAll(!!v)} aria-label="Select all" />
                  </TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingShifts ? (
                  <TableRow><TableCell colSpan={7} className="py-8 text-center">Loading shifts...</TableCell></TableRow>
                ) : shiftsError ? (
                  <TableRow><TableCell colSpan={7} className="py-8 text-center text-red-600">Failed to load shifts</TableCell></TableRow>
                ) : processedShifts.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="py-8 text-center text-gray-500">No shifts found</TableCell></TableRow>
                ) : (
                  processedShifts.map(s => (
                    <TableRow key={s.id} className="hover:bg-gray-50">
                      <TableCell>
                        <Checkbox checked={selectedShiftIds.has(s.id)} onCheckedChange={(v) => toggleSelectOne(s.id, !!v)} aria-label={`Select ${s.id}`} />
                      </TableCell>
                      <TableCell className="font-medium">
                        {s.staff_info ? `${s.staff_info.first_name} ${s.staff_info.last_name}` : s.staff}
                      </TableCell>
                      <TableCell>{new Date(s.shift_date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-sm text-gray-600">{s.start_time?.substring(0, 5)} - {s.end_time?.substring(0, 5)}</TableCell>
                      <TableCell>{s.role}</TableCell>
                      <TableCell>
                        <Badge className={`${getShiftBadgeColor(s.status || (s.is_confirmed ? 'CONFIRMED' : 'SCHEDULED'))} w-fit`}>{s.status || (s.is_confirmed ? 'CONFIRMED' : 'SCHEDULED')}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex items-center gap-2" onClick={() => setEditingShift(s)}>
                            <Edit className="w-4 h-4" /> Edit
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => confirmShiftMutation.mutate(s.id)}>Confirm</Button>
                          <Button size="sm" variant="ghost" onClick={() => completeShiftMutation.mutate(s.id)}>Complete</Button>
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

      {editingShift && (
        <AssignedShiftModal isOpen={!!editingShift} onClose={() => setEditingShift(null)} shift={editingShift} />
      )}

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
