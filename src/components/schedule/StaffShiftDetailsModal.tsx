/// <reference types="vite/client" />
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Phone, Mail, FileText, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import CreateSwapRequest from '@/components/CreateSwapRequest';
import { api } from '@/lib/api';
import { listProcessTasks, ProcessTask } from '@/services/process';
import { API_BASE } from "@/lib/api";


export interface AssignedShiftDetail {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  break_duration?: number | string | null;
  role: string;
  notes?: string | null;
  actual_hours?: number;
  status?: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  is_confirmed?: boolean;
  staff_info?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
  };
  // Optional extended fields if backend provides them
  location?: string | null;
  venue?: string | null;
  supervisor_name?: string | null;
  supervisor_email?: string | null;
  supervisor_phone?: string | null;
  uniform_required?: string | null;
  equipment_required?: string | null;
  attachments?: Array<{ id: string; name: string; url: string }>; // best-effort
}

interface StaffShiftDetailsModalProps {
  open: boolean;
  shiftId: string | null;
  onClose: () => void;
  initialShift?: Partial<AssignedShiftDetail> | null;
}

function parseBreakMinutes(bd: AssignedShiftDetail['break_duration']): number | null {
  if (bd === null || bd === undefined) return null;
  if (typeof bd === 'number') return Math.round(bd);
  if (typeof bd === 'string') {
    const hoursMatch = bd.match(/PT(\d+)H/);
    const minutesMatch = bd.match(/PT(?:\d+H)?(\d+)M/);
    let total = 0;
    if (hoursMatch) total += parseInt(hoursMatch[1], 10) * 60;
    if (minutesMatch) total += parseInt(minutesMatch[1], 10);
    if (!total) {
      const hms = bd.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
      if (hms) {
        total = parseInt(hms[1], 10) * 60 + parseInt(hms[2], 10);
      }
    }
    return total || null;
  }
  return null;
}

function safeParseDate(input?: string | Date | null): Date | null {
  if (!input) return null;
  try {
    const d = typeof input === 'string' ? new Date(input) : input;
    if (!d || Number.isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}

function safeFormatDate(input?: string | Date | null, fmt = 'MM/dd/yyyy'): string {
  const d = safeParseDate(input);
  if (!d) return '';
  try {
    return format(d, fmt);
  } catch {
    return '';
  }
}

function safeFormatTime(timeStr?: string | null): string {
  if (!timeStr) return '';
  const normalized = timeStr.match(/^\d{2}:\d{2}(:\d{2})?$/) ? timeStr : null;
  const iso = normalized ? `2000-01-01T${normalized}` : `2000-01-01T${timeStr}`;
  const d = safeParseDate(iso);
  if (!d) return '';
  try {
    return format(d, 'hh:mm a');
  } catch {
    return '';
  }
}

const StaffShiftDetailsModal: React.FC<StaffShiftDetailsModalProps> = ({ open, shiftId, onClose, initialShift }) => {
  // UI preference: hide transmission error banner to avoid disrupting the workflow
  const HIDE_TRANSMISSION_ERROR = true;
  const { user } = useAuth();
  const isStaffRole = String(user?.role || '').toUpperCase() === 'STAFF';
  const [showSwap, setShowSwap] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccessCount, setSendSuccessCount] = useState<number | null>(null);
  const hasAutoSentRef = useRef(false);

  const queryKey = useMemo(() => ['shift-details', shiftId], [shiftId]);

  const { data, isLoading, error, refetch, isFetching } = useQuery<AssignedShiftDetail>({
    queryKey,
    enabled: open && !!shiftId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    initialData: initialShift as AssignedShiftDetail | undefined,
    queryFn: async () => {
      if (!shiftId) throw new Error('Missing shift id');
      const token = localStorage.getItem('access_token');
      const headers = { 'Authorization': `Bearer ${token}` };
      // Try v2 endpoint first, then fallback to legacy
      const candidates = [
        `${API_BASE}/scheduling/assigned-shifts-v2/${shiftId}/`,
        `${API_BASE}/schedule/assigned-shifts/${shiftId}/`,
        `${API_BASE}/scheduling/assigned-shifts/${shiftId}/`,
      ];
      let lastError: any = null;
      for (const url of candidates) {
        try {
          const res = await fetch(url, { headers });
          if (res.ok) return await res.json();
          lastError = await res.json().catch(() => ({ detail: res.statusText }));
        } catch (e: any) {
          lastError = e;
        }
      }
      throw new Error(lastError?.detail || lastError?.message || 'Failed to fetch shift details');
    },
  });

  const shift = data || (initialShift as AssignedShiftDetail | undefined);

  const supervisor = useMemo(() => {
    // Prefer explicit supervisor fields from the shift; otherwise fall back gracefully
    return {
      name: shift?.supervisor_name || 'Supervisor',
      email: shift?.supervisor_email || undefined,
      phone: shift?.supervisor_phone || user?.phone || undefined,
    };
  }, [shift, user]);

  // Display date/time with robust parsing
  const formattedDate = safeFormatDate(shift?.shift_date, 'MM/dd/yyyy');
  const startTime = safeFormatTime(shift?.start_time);
  const endTime = safeFormatTime(shift?.end_time);
  const breakMinutes = parseBreakMinutes(shift?.break_duration ?? null);

  // Load tasks assigned to this shift (template-derived tasks)
  const {
    data: shiftTasks,
    isLoading: tasksLoading,
    error: tasksError,
    refetch: refetchTasks,
    isFetching: tasksFetching,
  } = useQuery<Array<{
    id: string;
    title?: string;
    description?: string;
    priority?: string;
    status?: string;
    estimated_duration?: string | number | null;
    due_date?: string | null;
    category_name?: string | null;
    template?: { id: string; name: string; description?: string } | null;
  }>>({
    queryKey: ['shift-tasks', shiftId],
    enabled: open && !!shiftId,
    staleTime: 30 * 1000,
    refetchInterval: 15 * 1000,
    queryFn: async () => {
      if (!shiftId) return [];
      const token = localStorage.getItem('access_token');
      const items = await api.getShiftTasks(String(token), { shift_id: String(shiftId) });
      // getShiftTasks is typed to return an array; avoid accessing a non-existent 'results'
      const arr: any[] = Array.isArray(items) ? items : [];
      return arr.map((t: any) => ({
        id: String(t.id ?? Math.random()),
        title: t.title ?? t.name ?? 'Task',
        description: t.description ?? undefined,
        priority: t.priority ?? undefined,
        status: t.status ?? undefined,
        estimated_duration: t.estimated_duration ?? t.duration ?? null,
        due_date: t.due_date ?? null,
        category_name: t?.category_details?.name ?? t?.category ?? null,
        template: t.template ?? undefined,
      }));
    },
  });

  // Load process tasks relevant to this shift (by staff and date)
  const {
    data: processTasks,
    isLoading: procLoading,
    error: procError,
    refetch: refetchProc,
    isFetching: procFetching,
  } = useQuery<ProcessTask[]>({
    queryKey: ['process-tasks', shiftId, user?.id, shift?.shift_date],
    enabled: open && !!shiftId && !!user?.id && !!shift?.shift_date,
    staleTime: 30 * 1000,
    refetchInterval: 15 * 1000,
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (user?.id) params['assigned_to'] = String(user.id);
      if (shift?.shift_date) {
        const d = typeof shift.shift_date === 'string' ? shift.shift_date : format(new Date(shift.shift_date), 'yyyy-MM-dd');
        params['due_date'] = d;
      }
      const res: any = await listProcessTasks(params);
      const arr: any[] = Array.isArray(res) ? res : [];
      return arr as ProcessTask[];
    },
  });

  // Automatically transmit Assigned Work to CheckList app once tasks load
  useEffect(() => {
    const autoSend = async () => {
      if (!open || !shiftId || hasAutoSentRef.current) return;
      const latestTasks = Array.isArray(shiftTasks) ? shiftTasks : [];
      if (!latestTasks.length || tasksLoading || tasksError) return;
      hasAutoSentRef.current = true;
      setSendError(null);
      setSendSuccessCount(null);
      setSending(true);
      try {
        const token = localStorage.getItem('access_token') || undefined;

        // Skip auto-transmission for staff-only users; just report items available
        if (isStaffRole) {
          try {
            const mine = await api.getMyChecklists({ status: 'PENDING' });
            const count = Array.isArray(mine)
              ? mine.length
              : (typeof mine === 'object' && mine && 'results' in mine ? (mine.results || []).length : 0);
            setSendSuccessCount(count || 0);
          } finally {
            setSending(false);
          }
          return;
        }
        let success = 0;
        for (const t of latestTasks) {
          try {
            // eslint-disable-next-line no-await-in-loop
            await api.ensureChecklistForTask(String(t.id));
            success += 1;
          } catch (err: any) {
            const msg = String(err?.message || '');
            // Fallback: auto-link or create a default template
            if (msg.includes('No active checklist template linked')) {
              const categoryName = t.category_name || 'CHECKLIST';

              // If the task has no category, assign CHECKLIST category to it
              if (!t.category_name && token) {
                try {
                  const cats = await api.getTaskCategories(token);
                  let cat = Array.isArray(cats) ? cats.find((c: any) => String(c?.name).toUpperCase() === 'CHECKLIST') : null;
                  if (!cat && token) {
                    // eslint-disable-next-line no-await-in-loop
                    cat = await api.createTaskCategory(token, { name: 'CHECKLIST' });
                  }
                  const catId = cat?.id;
                  if (catId) {
                    // eslint-disable-next-line no-await-in-loop
                    await api.updateShiftTask(token, String(t.id), { category: catId });
                  }
                } catch {
                  // Ignore category assignment errors; we will still try template creation
                }
              }

              // Ensure an active template exists for the category
              if (token) {
                try {
                  const existing = await api.getChecklistTemplates(token, { category: categoryName, is_active: true });
                  let template = Array.isArray(existing) ? existing[0] : null;
                  if (!template) {
                    // eslint-disable-next-line no-await-in-loop
                    template = await api.createChecklistTemplate(token, {
                      name: `${categoryName} Checklist`,
                      description: 'Auto-generated default checklist linked to shift tasks.',
                      category: categoryName,
                      steps: [
                        { title: 'Start checklist', description: 'Open and review task requirements.', order: 1, is_required: true },
                        { title: 'Perform task steps', description: 'Complete all required actions safely.', order: 2, is_required: true },
                        { title: 'Finish and confirm', description: 'Verify completion and leave notes.', order: 3, is_required: true },
                      ],
                    });
                  }
                  // Retry ensure now that a template exists
                  // eslint-disable-next-line no-await-in-loop
                  await api.ensureChecklistForTask(String(t.id));
                  success += 1;
                } catch (innerErr: any) {
                  // Capture the first encountered error; continue processing other tasks
                  if (!sendError) setSendError(innerErr?.message || 'Failed to ensure checklist after creating template');
                }
              }
            } else {
              // Other errors: keep note but continue
              if (!sendError) setSendError(msg || 'Failed to transmit data to CheckList app');
            }
          }
        }
        // Optional verification: confirm items appear in My Checklists
        if (user?.id && token) {
          try {
            const items = await api.getAssignedTasksAsChecklists(String(token), String(user.id));
            const titles = new Set(latestTasks.map((t) => String(t.title).toLowerCase()));
            const dateStr = safeFormatDate(shift?.shift_date, 'yyyy-MM-dd') || undefined;
            const matched = Array.isArray(items)
              ? items.filter((i: any) => {
                  const titleOk = i?.title && titles.has(String(i.title).toLowerCase());
                  const dateOk = dateStr ? (i?.due_date ? safeFormatDate(i.due_date, 'yyyy-MM-dd') === dateStr : true) : true;
                  return titleOk && dateOk;
                })
              : [];
            setSendSuccessCount(matched.length || success);
          } catch {
            setSendSuccessCount(success);
          }
        } else {
          setSendSuccessCount(success);
        }
        await Promise.all([refetchTasks(), refetchProc()]);
      } catch (e: any) {
        const msg = String(e?.message || '');
        if (isStaffRole && msg.toLowerCase().includes('permission')) {
          // Hide permission-related alerts for staff
          setSendError(null);
        } else {
          setSendError(e?.message || 'Failed to transmit data to CheckList app');
        }
      } finally {
        setSending(false);
      }
    };
    autoSend();
    // Re-run if a new shiftId or different tasks arrive while open
  }, [open, shiftId, tasksLoading, tasksError, shiftTasks, user?.id]);

  return (
    <Dialog open={open} onOpenChange={(val: boolean) => { if (!val) onClose(); }}>
      <DialogContent
        className="sm:max-w-[640px] w-[95vw] max-h-[85vh] p-0 overflow-hidden"
        aria-labelledby="shift-details-title"
        aria-describedby="shift-details-description"
      >
        <DialogHeader className="px-6 pt-6">
          <DialogTitle id="shift-details-title" className="flex items-center justify-between">
            <span>Shift Details</span>
            {shift?.role && (
              <Badge variant="secondary" className="ml-3">{shift.role}</Badge>
            )}
          </DialogTitle>
          <DialogDescription id="shift-details-description">
            View information, notes, and actions for this shift.
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-2" />

        {/* Ensure body scrolls by giving ScrollArea a fixed height */}
        <ScrollArea className="px-6 py-4 h-[70vh]">
          {isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mb-4" role="alert">
              <AlertTitle>Failed to load shift</AlertTitle>
              <AlertDescription>
                {(error as any)?.message || 'Unexpected error occurred.'}
                <div className="mt-3">
                  <Button variant="outline" size="sm" onClick={() => refetch()} aria-label="Retry loading shift">Retry</Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {shift && (
            <div className="space-y-4">
              {/* Header above Assigned Work */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-xl sm:text-2xl font-semibold truncate" aria-label="Shift title">
                    {shift.role || 'Shift'}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
                    {formattedDate && (
                      <span aria-label="Shift date">{formattedDate}</span>
                    )}
                    {formattedDate && (startTime || endTime) && (
                      <span aria-hidden="true">•</span>
                    )}
                    {(startTime || endTime) && (
                      <span aria-label="Shift time range">
                        {startTime}
                        {startTime && endTime ? ' - ' : ''}
                        {endTime}
                      </span>
                    )}
                    {typeof breakMinutes === 'number' && (
                      <>
                        <span aria-hidden="true">•</span>
                        <span aria-label="Break duration">Break: {breakMinutes} min</span>
                      </>
                    )}
                  </div>
                  {shift.notes && (
                    <p className="text-xs text-muted-foreground mt-1" aria-label="Special instructions">
                      {shift.notes}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {shift.status && (
                    <Badge variant="outline" className="mr-2">{shift.status}</Badge>
                  )}
                  {shift.is_confirmed && (
                    <Badge className="bg-green-100 text-green-700 border">Confirmed</Badge>
                  )}
                </div>
              </div>



              {/* Assigned Work: Template-based tasks and processes */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Assigned Work</p>
                  <div className="flex items-center gap-2">
                    {(tasksFetching || procFetching) && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                        Syncing
                      </Badge>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => { refetchTasks(); refetchProc(); }}>Refresh</Button>
                    {sending && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                        Sending to CheckList
                      </Badge>
                    )}
                  </div>
                </div>
                <Separator className="my-2" />

                {!HIDE_TRANSMISSION_ERROR && !isStaffRole && sendError && (
                  <Alert variant="destructive" className="mb-2" role="alert">
                    <AlertTitle>Transmission failed</AlertTitle>
                    <AlertDescription className="text-xs">{sendError}</AlertDescription>
                  </Alert>
                )}
                {typeof sendSuccessCount === 'number' && sendSuccessCount > 0 && (
                  <Alert className="mb-2" role="status">
                    <AlertTitle>Checklist package sent</AlertTitle>
                    <AlertDescription className="text-xs">
                      {sendSuccessCount} item{sendSuccessCount === 1 ? '' : 's'} available in My Checklists.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Tasks section */}
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground">Processes and Tasks</p>
                  {tasksLoading ? (
                    <div className="space-y-2 mt-2">
                      <Skeleton className="h-5 w-3/5" />
                      <Skeleton className="h-5 w-2/5" />
                    </div>
                  ) : tasksError ? (
                    <Alert variant="destructive" className="mt-2">
                      <AlertTitle>Failed to load tasks</AlertTitle>
                      <AlertDescription className="text-xs">
                        {(tasksError as any)?.message || 'Unable to load tasks assigned to this shift.'}
                      </AlertDescription>
                    </Alert>
                  ) : Array.isArray(shiftTasks) && shiftTasks.length > 0 ? (
                    <ul className="mt-2 space-y-2">
                      {shiftTasks.map((t) => (
                        <li key={t.id} className="rounded-md border p-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium truncate">{t.title}</p>
                            <div className="flex items-center gap-2">
                              {t.priority && (
                                <Badge variant="outline" className="text-[10px]">{t.priority}</Badge>
                              )}
                              {t.status && (
                                <Badge variant="secondary" className="text-[10px]">{t.status}</Badge>
                              )}
                            </div>
                          </div>
                          {t.description && (
                            <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-gray-600">
                            {t.estimated_duration && (
                              <span>Duration: {typeof t.estimated_duration === 'number' ? `${t.estimated_duration} min` : t.estimated_duration}</span>
                            )}
                            {t.due_date && <span>Due: {format(new Date(t.due_date), 'PP')}</span>}
                            {t.template?.name && <span>Template: {t.template.name}</span>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-2">No tasks assigned.</p>
                  )}
                </div>

                {/* Processes section */}
                <div>
                  <p className="text-xs text-muted-foreground">Processes</p>
                  {procLoading ? (
                    <div className="space-y-2 mt-2">
                      <Skeleton className="h-5 w-3/5" />
                      <Skeleton className="h-5 w-2/5" />
                    </div>
                  ) : procError ? (
                    <Alert variant="destructive" className="mt-2">
                      <AlertTitle>Failed to load processes</AlertTitle>
                      <AlertDescription className="text-xs">
                        {(procError as any)?.message || 'Unable to load processes relevant to this shift.'}
                      </AlertDescription>
                    </Alert>
                  ) : Array.isArray(processTasks) && processTasks.length > 0 ? (
                    <ul className="mt-2 space-y-2">
                      {processTasks.map((pt) => (
                        <li key={pt.id || Math.random().toString(36)} className="rounded-md border p-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium truncate">{pt.title}</p>
                            <div className="flex items-center gap-2">
                              {pt.priority && (
                                <Badge variant="outline" className="text-[10px]">{pt.priority}</Badge>
                              )}
                              {pt.status && (
                                <Badge variant="secondary" className="text-[10px]">{pt.status}</Badge>
                              )}
                            </div>
                          </div>
                          {pt.description && (
                            <p className="text-xs text-muted-foreground mt-1">{pt.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-gray-600">
                            {pt.estimated_duration && <span>Duration: {pt.estimated_duration} min</span>}
                            {pt.due_date && <span>Due: {format(new Date(pt.due_date), 'PP')}</span>}
                            {pt.due_time && <span>Time: {pt.due_time}</span>}
                            {pt.process && <span>Process: {pt.process}</span>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-2">No processes listed.</p>
                  )}
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium mb-2">Attachments</p>
                {Array.isArray(shift.attachments) && shift.attachments.length > 0 ? (
                  <ul className="space-y-2">
                    {shift.attachments.map((a: { id: string; name: string; url: string }) => (
                      <li key={a.id} className="flex items-center gap-2">
                        <FileText className="h-4 w-4" aria-hidden="true" />
                        <a href={a.url} target="_blank" rel="noreferrer" className="text-sm underline">
                          {a.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No attachments</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {typeof shift.actual_hours === 'number' && (
                    <>Scheduled Hours: {shift.actual_hours.toFixed(2)}</>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="default" onClick={() => setShowSwap(true)} aria-haspopup="dialog" aria-expanded={showSwap}>
                    Request Change
                  </Button>
                  <Button variant="outline" onClick={onClose} aria-label="Close shift details">Close</Button>
                </div>
              </div>

              {showSwap && (
                <div className="rounded-lg border p-2 mt-2" aria-live="polite">
                  {/* Nested dialog alternative: inline content for simplicity and mobile compatibility */}
                  <div className="flex items-center justify-between px-2">
                    <p className="text-sm font-medium">Request a change</p>
                    <Button variant="ghost" size="sm" onClick={() => setShowSwap(false)}>Hide</Button>
                  </div>
                  <Separator className="my-2" />
                  <CreateSwapRequest />
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {isFetching && (
          <div className="absolute right-4 bottom-4" aria-live="polite">
            <Badge variant="outline" className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              Updating
            </Badge>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StaffShiftDetailsModal;