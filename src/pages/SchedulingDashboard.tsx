/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  format,
  addDays,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Users,
  Clock,
  AlertCircle,
  ClipboardList,
  MessageSquarePlus,
} from "lucide-react";
import { useAuth } from "../hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";

const API_BASE =
  import.meta.env.VITE_REACT_APP_API_URL || "http://localhost:8000/api";

interface AssignedShift {
  id: string;
  staff: { id: string; first_name: string; last_name: string; email: string };
  shift_date: string;
  start_time: string;
  end_time: string;
  role: string;
  status: "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  is_confirmed: boolean;
  actual_hours: number;
  notes?: string;
}

interface WeeklySchedule {
  id: string;
  week_start: string;
  week_end: string;
  is_published: boolean;
  assigned_shifts: AssignedShift[];
}

interface ScheduleAnalytics {
  total_shifts: number;
  total_hours: number;
  average_shift_hours: number;
  unique_staff: number;
  by_role: Record<string, { count: number; total_hours: number }>;
  confirmation_rate: number;
}

interface CoverageData {
  total_required: number;
  total_assigned: number;
  coverage_percentage: number;
  uncovered_shifts: number;
}

export const SchedulingDashboard: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentWeek, setCurrentWeek] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState("calendar");
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<AssignedShift | null>(
    null
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [assignmentFrequency, setAssignmentFrequency] = useState<
    "ONE_TIME" | "DAILY" | "WEEKLY"
  >("ONE_TIME");

  const weekStart = format(currentWeek, "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(currentWeek), "yyyy-MM-dd");

  // Fetch weekly schedule
  const { data: schedule, isLoading: scheduleLoading } =
    useQuery<WeeklySchedule>({
      queryKey: ["schedule", weekStart],
      queryFn: async () => {
        const response = await fetch(
          `${API_BASE}/scheduling/weekly-schedules-v2/?date_from=${weekStart}&date_to=${weekEnd}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            },
          }
        );
        if (!response.ok) throw new Error("Failed to load schedule");
        const data = await response.json();
        return data.results?.[0] || data;
      },
    });

  // Fetch task templates for assignment
  type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

  interface TemplateTask {
    title?: string;
    description?: string;
    priority?: TaskPriority;
    estimated_duration?: number;
  }

  interface TaskTemplate {
    id: string;
    name: string;
    description: string;
    template_type: string;
    frequency: string;
    tasks: TemplateTask[];
  }

  interface TaskPayload {
    title: string;
    description?: string;
    // Backend expects TaskCategory ID or null; using null when unknown
    category?: string | null;
    // Single user id
    assigned_to: string;
    // Backend field name is 'shift'
    shift: string;
    priority: TaskPriority;
    // DurationField expects HH:MM:SS or ISO8601; we send HH:MM:SS
    estimated_duration?: string;
  }
  const { data: templates, isLoading: templatesLoading } = useQuery<TaskTemplate[]>({
    queryKey: ["task-templates"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/scheduling/task-templates/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to load task templates");
      const data = await response.json();
      return data.results || data;
    },
  });

  // Fetch analytics
  const { data: analytics } = useQuery<ScheduleAnalytics>({
    queryKey: ["schedule-analytics", weekStart],
    queryFn: async () => {
      if (!schedule?.id) return null;
      const response = await fetch(
        `${API_BASE}/scheduling/weekly-schedules-v2/${schedule.id}/analytics/`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to load analytics");
      return response.json();
    },
    enabled: !!schedule?.id,
  });

  // Fetch coverage
  const { data: coverage } = useQuery<CoverageData>({
    queryKey: ["schedule-coverage", weekStart],
    queryFn: async () => {
      if (!schedule?.id) return null;
      const response = await fetch(
        `${API_BASE}/scheduling/weekly-schedules-v2/${schedule.id}/coverage/`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to load coverage");
      return response.json();
    },
    enabled: !!schedule?.id,
  });

  // Confirm shift mutation
  const confirmShiftMutation = useMutation({
    mutationFn: async (shiftId: string) => {
      const response = await fetch(
        `${API_BASE}/scheduling/assigned-shifts-v2/${shiftId}/confirm/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to confirm shift");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      queryClient.invalidateQueries({ queryKey: ["schedule-analytics"] });
    },
  });

  // Create task mutation for assigning to shift
  const createTaskMutation = useMutation<unknown, Error, TaskPayload>({
    mutationFn: async (payload: TaskPayload) => {
      const response = await fetch(`${API_BASE}/scheduling/shift-tasks/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        // Try JSON first, then fallback to text for better diagnostics
        let message = "Failed to create task";
        try {
          const errorData = await response.json();
          message = errorData.detail || errorData.message || message;
        } catch {
          const text = await response.text();
          message = text || message;
        }
        throw new Error(message);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Task(s) assigned",
        description: "Tasks have been assigned to the shift.",
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

  const toHHMMSS = (minutes: number): string => {
    const m = Math.max(0, Math.floor(minutes));
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`;
  };

  const buildTaskPayloadsForShift = (
    shift: AssignedShift,
    template: TaskTemplate
  ): TaskPayload[] => {
    const items: TaskPayload[] = (template.tasks || []).map((t) => ({
      title: t.title || template.name,
      description: t.description || template.description || "",
      // Unknown category mapping → send null to satisfy serializer
      category: null,
      assigned_to: shift.staff.id,
      shift: shift.id,
      priority: t.priority ?? "MEDIUM",
      estimated_duration:
        t.estimated_duration !== undefined
          ? toHHMMSS(Number(t.estimated_duration))
          : undefined,
    }));
    if (items.length === 0) {
      items.push({
        title: template.name,
        description: template.description || "",
        category: null,
        assigned_to: shift.staff.id,
        shift: shift.id,
        priority: "MEDIUM",
        estimated_duration: toHHMMSS(30),
      });
    }
    return items;
  };

  const onAssignTasksFromTemplate = async () => {
    if (!selectedShift || !selectedTemplateId) {
      toast({
        title: "Select template",
        description: "Please choose a template to assign.",
      });
      return;
    }
    const template = templates?.find(
      (t) => String(t.id) === String(selectedTemplateId)
    );
    if (!template) {
      toast({
        title: "Template not found",
        description: "Please re-select a template.",
      });
      return;
    }
    let tasks: TaskPayload[] = [];
    if (assignmentFrequency === "ONE_TIME") {
      tasks = buildTaskPayloadsForShift(selectedShift, template);
    } else if (assignmentFrequency === "DAILY") {
      const thisWeekShiftsForStaff =
        schedule?.assigned_shifts?.filter(
          (s) => s.staff.id === selectedShift.staff.id
        ) || [];
      thisWeekShiftsForStaff.forEach((s) => {
        tasks.push(...buildTaskPayloadsForShift(s, template));
      });
    } else if (assignmentFrequency === "WEEKLY") {
      // Frequency is a UI concept; backend doesn't support it on ShiftTask creation
      tasks = buildTaskPayloadsForShift(selectedShift, template);
    }
    try {
      const createdTaskIds: string[] = [];
      for (const payload of tasks) {
        // eslint-disable-next-line no-await-in-loop
        const created: any = await createTaskMutation.mutateAsync(payload);
        const taskId = created?.id || created?.task?.id || created?.task_id;
        if (taskId) createdTaskIds.push(String(taskId));
        // Send a targeted notification to the assignee for each created task
        try {
          const accessToken = localStorage.getItem("access_token") || undefined;
          if (accessToken) {
            await api.createAnnouncement(accessToken, {
              title: `Checklist assigned: ${template.name}`,
              message: `You have new checklist items for your shift on ${selectedShift.shift_date} (${selectedShift.start_time}–${selectedShift.end_time}). Open My Checklists to begin.`,
              priority: "MEDIUM",
              recipients_staff_ids: [payload.assigned_to],
              tags: ["checklist", "shift", "template"],
            });
          }
        } catch (err) {
          // Silently ignore announcement errors to avoid blocking assignment
        }
      }

      // Ensure a checklist execution exists for each created task so it's immediately accessible
      try {
        for (const id of createdTaskIds) {
          // eslint-disable-next-line no-await-in-loop
          await api.ensureChecklistForTask(String(id));
        }
      } catch (err) {
        // Non-blocking: checklist ensures are also performed when staff opens My Checklists
      }

      setAssignModalOpen(false);
      setSelectedTemplateId("");
      setAssignmentFrequency("ONE_TIME");
    } catch (e) {
      // Errors are handled in mutation onError
    }
  };

  const onOpenAiTask = () => {
    if (!selectedShift) return;
    const params = new URLSearchParams({
      assigned_to: selectedShift.staff.id,
      assigned_shift: selectedShift.id,
      openModal: "true",
    }).toString();
    navigate(`/dashboard/tasks?${params}`);
  };

  const daysOfWeek = Array.from({ length: 7 }).map((_, i) =>
    addDays(currentWeek, i)
  );

  const getShiftsForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return (
      schedule?.assigned_shifts?.filter(
        (shift) => shift.shift_date === dateStr
      ) || []
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Schedule Management</h1>
          <p className="text-gray-600">
            Week of {format(currentWeek, "MMM d")} -{" "}
            {format(endOfWeek(currentWeek), "MMM d, yyyy")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))
            }
          >
            Today
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Coverage Alert */}
      {coverage && coverage.coverage_percentage < 80 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Low coverage: {coverage.coverage_percentage}% of shifts assigned (
            {coverage.uncovered_shifts} shifts still need staff)
          </AlertDescription>
        </Alert>
      )}

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Total Shifts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{analytics.total_shifts}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {analytics.total_hours.toFixed(1)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Staff Count</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{analytics.unique_staff}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Confirmation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {analytics.confirmation_rate}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="calendar">
            <Calendar className="h-4 w-4 mr-2" /> Calendar View
          </TabsTrigger>
          <TabsTrigger value="table">
            <Users className="h-4 w-4 mr-2" /> List View
          </TabsTrigger>
        </TabsList>

        {/* Calendar View */}
        <TabsContent value="calendar" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-2">
            {daysOfWeek.map((date) => {
              const shifts = getShiftsForDay(date);
              const isToday =
                format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

              return (
                <Card
                  key={format(date, "yyyy-MM-dd")}
                  className={`cursor-pointer transition ${
                    isToday ? "ring-2 ring-blue-500" : ""
                  }`}
                  onClick={() => setSelectedDate(date)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">
                      {format(date, "EEE")}
                      <br />
                      {format(date, "d MMM")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-xs text-gray-600">
                      {shifts.length} shifts
                    </p>
                    <div className="space-y-1">
                      {shifts.slice(0, 3).map((shift) => (
                        <div
                          key={shift.id}
                          className="text-xs p-1 bg-blue-100 text-blue-900 rounded truncate"
                          title={`${shift.staff.first_name} ${shift.staff.last_name}`}
                        >
                          {shift.start_time} - {shift.end_time}
                        </div>
                      ))}
                      {shifts.length > 3 && (
                        <p className="text-xs text-gray-500">
                          +{shifts.length - 3} more
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Selected Day Details */}
          {selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Shifts for {format(selectedDate, "EEEE, MMMM d, yyyy")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getShiftsForDay(selectedDate).length > 0 ? (
                    getShiftsForDay(selectedDate).map((shift) => (
                      <div
                        key={shift.id}
                        className="flex items-center justify-between p-3 border rounded"
                      >
                        <div>
                          <p className="font-medium">
                            {shift.staff.first_name} {shift.staff.last_name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {shift.start_time} - {shift.end_time}(
                            {shift.actual_hours} hours)
                          </p>
                          <span className="inline-block mt-1 text-xs px-2 py-1 bg-gray-100 rounded">
                            {shift.role}
                          </span>
                        </div>
                        <div className="text-right space-y-2">
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                              shift.is_confirmed
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {shift.status}
                          </span>
                          {!shift.is_confirmed && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                confirmShiftMutation.mutate(shift.id)
                              }
                            >
                              Confirm
                            </Button>
                          )}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedShift(shift);
                                setAssignModalOpen(true);
                              }}
                            >
                              <ClipboardList className="h-4 w-4 mr-1" /> Assign
                              Tasks
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">
                      No shifts scheduled for this day
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Table View */}
        <TabsContent value="table">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Staff</th>
                      <th className="px-4 py-3 text-left font-medium">Date</th>
                      <th className="px-4 py-3 text-left font-medium">Time</th>
                      <th className="px-4 py-3 text-left font-medium">Role</th>
                      <th className="px-4 py-3 text-left font-medium">Hours</th>
                      <th className="px-4 py-3 text-left font-medium">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {schedule?.assigned_shifts?.map((shift) => (
                      <tr key={shift.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          {shift.staff.first_name} {shift.staff.last_name}
                        </td>
                        <td className="px-4 py-3">{shift.shift_date}</td>
                        <td className="px-4 py-3">
                          {shift.start_time} - {shift.end_time}
                        </td>
                        <td className="px-4 py-3">{shift.role}</td>
                        <td className="px-4 py-3">{shift.actual_hours}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              shift.is_confirmed
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {shift.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Assign Tasks Modal */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" /> Assign Tasks to Shift
            </DialogTitle>
          </DialogHeader>
          {selectedShift && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">
                    {selectedShift.staff.first_name}{" "}
                    {selectedShift.staff.last_name}
                  </p>
                  <p className="text-xs text-gray-600">
                    {selectedShift.shift_date} • {selectedShift.start_time} -{" "}
                    {selectedShift.end_time}
                  </p>
                </div>
                <Badge variant="outline">{selectedShift.role}</Badge>
              </div>

              <div className="space-y-2">
                <Label>Select Template</Label>
                <Select
                  value={selectedTemplateId}
                  onValueChange={setSelectedTemplateId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templatesLoading && (
                      <SelectItem value="__loading_templates__" disabled>Loading templates…</SelectItem>
                    )}
                    {!templatesLoading && (!templates || templates.length === 0) && (
                      <SelectItem value="__no_templates__" disabled>No templates available</SelectItem>
                    )}
                    {templates?.map((t) => (
                      <SelectItem key={String(t.id)} value={String(t.id)}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select
                    value={assignmentFrequency}
                    onValueChange={(v) =>
                      setAssignmentFrequency(
                        v as "ONE_TIME" | "DAILY" | "WEEKLY"
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ONE_TIME">One time</SelectItem>
                      <SelectItem value="DAILY">Every day (this week)</SelectItem>
                      <SelectItem value="WEEKLY">Weekly (same weekday)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    onClick={onAssignTasksFromTemplate}
                    disabled={!selectedTemplateId}
                  >
                    Assign from Template
                  </Button>
                  <Button variant="secondary" onClick={onOpenAiTask}>
                    <MessageSquarePlus className="h-4 w-4 mr-1" /> Use AI Prompt
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SchedulingDashboard;
