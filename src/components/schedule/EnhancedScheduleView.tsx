import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  parseISO,
  subDays,
} from "date-fns";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Check,
  ChevronsUpDown,
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { api, API_BASE } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

interface Schedule {
  id: string;
  title: string;
  description: string;
  staff: string;
  staff_name?: string;
  start_time: string;
  end_time: string;
  status: "SCHEDULED" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  color: string;
  created_at: string;
  updated_at: string;
  task_templates?: string[];
  task_templates_details?: any[];
}

interface ScheduleFormData {
  title: string;
  description: string;
  staff: string;
  start_time: string;
  end_time: string;
  color?: string;
  task_templates: string[];
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

interface EnhancedScheduleViewProps {
  viewMode?: "day" | "week" | "month";
  initialDate?: Date;
  onScheduleClick?: (schedule: Schedule) => void;
}

const statusColors = {
  SCHEDULED: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  COMPLETED: "bg-blue-100 text-blue-800",
};

const statusIcons = {
  SCHEDULED: <Clock className="h-4 w-4 mr-1" />,
  CONFIRMED: <CheckCircle className="h-4 w-4 mr-1" />,
  CANCELLED: <AlertCircle className="h-4 w-4 mr-1" />,
  COMPLETED: <CheckCircle className="h-4 w-4 mr-1" />,
};

const EnhancedScheduleView: React.FC<EnhancedScheduleViewProps> = ({
  viewMode = "week",
  initialDate = new Date(),
  onScheduleClick,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [currentView, setCurrentView] = useState<"day" | "week" | "month">(viewMode);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [formData, setFormData] = useState<ScheduleFormData>({
    title: "",
    description: "",
    staff: "",
    start_time: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    end_time: format(addDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm"),
    task_templates: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Interaction State
  const [dragStart, setDragStart] = useState<{ date: Date; hour: number; minute?: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ date: Date; hour: number; minute?: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Search State
  const [templateSearch, setTemplateSearch] = useState("");
  const [isStaffOpen, setIsStaffOpen] = useState(false);

  // Calculate date range based on current view
  const getDateRange = () => {
    if (currentView === "day") {
      return [currentDate];
    } else if (currentView === "week") {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    } else {
      // Simple month view (just showing 30 days)
      return Array.from({ length: 30 }, (_, i) => addDays(currentDate, i - 15));
    }
  };

  const dateRange = getDateRange();

  // Fetch staff members
  const {
    data: staffResponse,
    isLoading: isLoadingStaff,
    error: staffError,
  } = useQuery<PaginatedResponse<StaffMember>>({
    queryKey: ["staff-members"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/users/?is_active=true&page_size=1000`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch staff members");
      }
      return response.json();
    },
  });

  const staffMembers = Array.isArray(staffResponse)
    ? staffResponse
    : (staffResponse?.results || []);

  // Fetch schedules
  const {
    data: schedulesResponse,
    isLoading: isLoadingSchedules,
    error: schedulesError,
    refetch: refetchSchedules,
  } = useQuery<PaginatedResponse<Schedule>>({
    queryKey: ["schedules", format(dateRange[0], "yyyy-MM-dd"), format(dateRange[dateRange.length - 1], "yyyy-MM-dd")],
    queryFn: async () => {
      const startDate = format(dateRange[0], "yyyy-MM-dd");
      const endDate = format(dateRange[dateRange.length - 1], "yyyy-MM-dd");

      const response = await fetch(
        `${API_BASE}/staff/schedules/?start_date=${startDate}&end_date=${endDate}&page_size=100`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch schedules");
      }

      const data = await response.json();
      return data;
    },
  });

  const schedules = React.useMemo(() => {
    const rawSchedules = Array.isArray(schedulesResponse)
      ? schedulesResponse
      : (schedulesResponse?.results || []);

    return rawSchedules.map((schedule: Schedule) => {
      const staffMember = staffMembers?.find(s => s.id === schedule.staff);
      return {
        ...schedule,
        staff_name: staffMember
          ? `${staffMember.first_name} ${staffMember.last_name}`
          : "Unknown Staff"
      };
    });
  }, [schedulesResponse, staffMembers]);

  // Fetch task templates
  const { data: taskTemplates, isLoading: isLoadingTemplates } = useQuery({
    queryKey: ["task-templates"],
    queryFn: () => api.getTaskTemplates(localStorage.getItem("access_token") || ""),
    enabled: isModalOpen, // Only fetch when modal is open
    staleTime: 5 * 60 * 1000,
  });

  // Create schedule mutation
  const createScheduleMutation = useMutation({
    mutationFn: async (data: ScheduleFormData) => {
      setIsSubmitting(true);
      try {
        const response = await fetch(`${API_BASE}/staff/schedules/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Failed to create schedule");
        }

        return response.json();
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      toast({
        title: "Schedule created",
        description: "The schedule has been created successfully.",
      });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create schedule",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update schedule mutation
  const updateScheduleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ScheduleFormData }) => {
      setIsSubmitting(true);
      try {
        const response = await fetch(`${API_BASE}/staff/schedules/${id}/`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Failed to update schedule");
        }

        return response.json();
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      toast({
        title: "Schedule updated",
        description: "The schedule has been updated successfully.",
      });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update schedule",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete schedule mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: string) => {
      setIsDeleting(true);
      try {
        const response = await fetch(`${API_BASE}/staff/schedules/${id}/`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Failed to delete schedule");
        }

        return true;
      } finally {
        setIsDeleting(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      toast({
        title: "Schedule deleted",
        description: "The schedule has been deleted successfully.",
      });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete schedule",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Helper to generate consistent colors from string
  const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00ffffff).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  };

  const getShiftColor = (schedule: Schedule) => {
    // Use staff name for consistent coloring, fallback to schedule title or default
    const key = schedule.staff_name || schedule.title || "default";
    // Generate a pastel/pleasing version if possible, but basic hash for now
    // Let's use a predefined palette based on hash for better UI
    const colors = [
      "#e0f2fe", "#dbeafe", "#e0e7ff", "#fae8ff", "#f3e8ff",
      "#ffe4e6", "#fee2e2", "#ffedd5", "#fef3c7", "#ecfccb",
      "#dcfce7", "#d1fae5", "#ccfbf1"
    ];
    const textColors = [
      "#0369a1", "#1e40af", "#3730a3", "#86198f", "#6b21a8",
      "#be123c", "#991b1b", "#9a3412", "#92400e", "#3f6212",
      "#166534", "#065f46", "#115e59"
    ];
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = key.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return { bg: colors[index], text: textColors[index] };
  };

  // Handle Grid Interaction
  const handleGridMouseDown = (date: Date, hour: number, e: React.MouseEvent) => {
    // Clean start relative to the cell
    // e.nativeEvent.offsetY could give exact minute if we want precision
    e.stopPropagation();
    setDragStart({ date, hour });
    setDragEnd({ date, hour }); // Initialize end
    setIsDragging(true);
  };

  const handleGridMouseEnter = (date: Date, hour: number) => {
    if (isDragging && dragStart) {
      // Only update if on same day for now (simplify multi-day)
      if (isSameDay(date, dragStart.date)) {
        setDragEnd({ date, hour });
      }
    }
  };

  const handleGridMouseUp = () => {
    if (isDragging && dragStart && dragEnd) {
      const startHour = Math.min(dragStart.hour, dragEnd.hour);
      const endHour = Math.max(dragStart.hour, dragEnd.hour) + 1; // End of the slot

      const startDate = new Date(dragStart.date);
      startDate.setHours(startHour, 0, 0, 0);

      const endDate = new Date(dragStart.date);
      endDate.setHours(endHour, 0, 0, 0);

      setFormData({
        ...formData,
        start_time: format(startDate, "yyyy-MM-dd'T'HH:mm"),
        end_time: format(endDate, "yyyy-MM-dd'T'HH:mm"),
        task_templates: [],
      });
      setSelectedSchedule(null);
      setIsModalOpen(true);
    }
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  // Render Time Grid View (Week/Day)
  const renderTimeGridView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayColumns = dateRange;

    // Calculate selection style if dragging
    const isSelectionVisible = isDragging && dragStart && dragEnd && isSameDay(dragStart.date, dragEnd.date);

    return (
      <div className="flex flex-col h-[700px] border rounded-md bg-white overflow-hidden select-none" onMouseUp={handleGridMouseUp}>
        {/* Header - Days */}
        <div className="flex border-b bg-slate-50 relative z-20 shadow-sm">
          <div className="w-16 flex-shrink-0 border-r bg-slate-50 sticky left-0 z-30"></div>
          <div className="flex-1 flex overflow-hidden">
            {dayColumns.map(date => (
              <div key={date.toString()} className="flex-1 border-r text-center py-3 last:border-r-0 min-w-[100px]">
                <div className="font-semibold text-sm text-slate-600">{format(date, "EEE")}</div>
                <div className={`text-xl font-bold rounded-full w-8 h-8 flex items-center justify-center mx-auto mt-1 ${isSameDay(date, new Date()) ? 'bg-primary text-primary-foreground' : 'text-slate-900'}`}>{format(date, "d")}</div>
              </div>
            ))}
          </div>
          {/* Scrollbar spacer */}
          <div className="w-4 bg-slate-50"></div>
        </div>

        {/* Body - Time Grid */}
        <div className="flex-1 overflow-y-auto relative custom-scrollbar">
          <div className="flex relative h-[1440px]"> {/* 24h * 60px/h */}

            {/* Time Labels Column */}
            <div className="w-16 flex-shrink-0 border-r bg-slate-50 sticky left-0 z-10">
              {hours.map(hour => (
                <div key={hour} className="h-[60px] border-b text-xs text-muted-foreground text-right pr-2 pt-2 relative bg-slate-50">
                  {format(new Date().setHours(hour, 0, 0, 0), "h a")}
                </div>
              ))}
            </div>

            {/* Day Columns Container */}
            <div className="flex-1 flex">
              {dayColumns.map(date => {
                const daySchedules = schedules?.filter(s => isSameDay(new Date(s.start_time), date)) || [];
                const isToday = isSameDay(date, new Date());

                return (
                  <div key={date.toString()} className={`flex-1 border-r relative last:border-r-0 min-w-[100px] group ${isToday ? 'bg-slate-50/30' : ''}`}>
                    {/* Hour Slots (Interaction Layer) */}
                    {hours.map(hour => (
                      <div
                        key={hour}
                        className="h-[60px] border-b border-slate-100 w-full relative hover:bg-slate-50 transition-colors cursor-crosshair box-border"
                        onMouseDown={(e) => handleGridMouseDown(date, hour, e)}
                        onMouseEnter={() => handleGridMouseEnter(date, hour)}
                      >
                        {/* Half-hour marker guideline (visual only) */}
                        <div className="absolute top-1/2 w-full border-t border-slate-50 pointer-events-none"></div>
                      </div>
                    ))}

                    {/* Drag Selection Overlay */}
                    {isSelectionVisible && isSameDay(date, dragStart!.date) && (() => {
                      const startH = Math.min(dragStart!.hour, dragEnd!.hour);
                      const endH = Math.max(dragStart!.hour, dragEnd!.hour);
                      return (
                        <div
                          className="absolute left-1 right-1 bg-blue-500/20 border-2 border-blue-500 rounded z-30 pointer-events-none"
                          style={{
                            top: `${startH * 60}px`,
                            height: `${(endH - startH + 1) * 60}px`
                          }}
                        >
                          <div className="text-xs font-semibold text-blue-700 p-1">
                            {format(new Date().setHours(startH, 0, 0, 0), "h a")} - {format(new Date().setHours(endH + 1, 0, 0, 0), "h a")}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Shifts Layer */}
                    {daySchedules.map(schedule => {
                      const start = new Date(schedule.start_time);
                      const end = new Date(schedule.end_time);
                      const startMinutes = start.getHours() * 60 + start.getMinutes();
                      let durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);

                      // Cap at end of day
                      if (startMinutes + durationMinutes > 1440) durationMinutes = 1440 - startMinutes;

                      const { bg, text } = getShiftColor(schedule);

                      return (
                        <div
                          key={schedule.id}
                          className="absolute left-1 right-1 rounded px-2 py-1 text-xs font-semibold overflow-hidden border cursor-pointer hover:shadow-lg transition-all z-20 group-hover:z-30 hover:z-40"
                          style={{
                            top: `${startMinutes}px`,
                            height: `${Math.max(durationMinutes, 20)}px`,
                            backgroundColor: bg,
                            color: text,
                            borderColor: text + '40'
                          }}
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent grid click
                            handleScheduleClick(schedule);
                          }}
                        >
                          <div className="font-bold leading-tight">{schedule.staff_name}</div>
                          <div className="font-medium opacity-90 truncate leading-tight">{schedule.title}</div>
                          <div className="font-mono text-[10px] opacity-75 mt-0.5">
                            {format(start, "h:mm a")} - {format(end, "h:mm a")}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render Month Grid View
  const renderMonthGridView = () => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    const days = [];
    let day = start;
    while (day <= end) {
      days.push(day);
      day = addDays(day, 1);
    }

    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return (
      <div className="flex flex-col h-[600px] border rounded-md bg-white">
        {/* Header Days */}
        <div className="grid grid-cols-7 border-b">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
            <div key={d} className="py-2 text-center text-sm font-semibold bg-slate-50 border-r last:border-r-0">
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        <div className="flex-1 flex flex-col">
          {weeks.map((week, i) => (
            <div key={i} className="flex-1 grid grid-cols-7 border-b last:border-b-0">
              {week.map(d => {
                const isCurrentMonth = isSameMonth(d, currentDate);
                const daySchedules = schedules?.filter(s => isSameDay(new Date(s.start_time), d)) || [];
                const isToday = isSameDay(d, new Date());

                return (
                  <div key={d.toString()} className={`border-r last:border-r-0 p-1 flex flex-col ${!isCurrentMonth ? 'bg-slate-50/50 text-muted-foreground' : ''} ${isToday ? 'bg-blue-50/30' : ''}`}>
                    <div className={`text-right text-xs p-1 ${isToday ? 'font-bold text-blue-600' : ''}`}>
                      {format(d, "d")}
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-1 no-scrollbar">
                      {daySchedules.map(schedule => {
                        const { bg, text } = getShiftColor(schedule);
                        return (
                          <div
                            key={schedule.id}
                            className="text-[10px] px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 border"
                            style={{ backgroundColor: bg, color: text, borderColor: text + '40' }}
                            onClick={() => handleScheduleClick(schedule)}
                          >
                            <span className="font-semibold">{format(new Date(schedule.start_time), "HH:mm")}</span> {schedule.staff_name}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Remove color from formData as it's now auto-generated
    // We send a default color to backend to satisfy any strict validation, though backend might ignore it
    const submissionData = { ...formData, color: "#3b82f6" };

    if (selectedSchedule) {
      updateScheduleMutation.mutate({ id: selectedSchedule.id, data: submissionData });
    } else {
      createScheduleMutation.mutate(submissionData);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      staff: "",
      start_time: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      end_time: format(addDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm"),
      task_templates: [],
    });
    setSelectedSchedule(null);
  };

  // Handle schedule click
  const handleScheduleClick = (schedule: Schedule) => {
    if (onScheduleClick) {
      onScheduleClick(schedule);
    } else {
      setSelectedSchedule(schedule);
      setFormData({
        title: schedule.title,
        description: schedule.description || "",
        staff: schedule.staff,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        task_templates: schedule.task_templates || [],
      });
      setIsModalOpen(true);
    }
  };

  // Handle retry
  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await refetchSchedules();
    } finally {
      setIsRetrying(false);
    }
  };

  // Group schedules by date and staff (no longer directly used for rendering, but might be for other logic)
  const getSchedulesForDateAndStaff = (date: Date, staffId: string) => {
    if (!schedules) return [];

    return schedules.filter(
      (schedule) =>
        isSameDay(parseISO(schedule.start_time), date) &&
        schedule.staff === staffId
    );
  };

  // Navigate to previous period
  const goToPrevious = () => {
    if (currentView === "day") {
      setCurrentDate(addDays(currentDate, -1));
    } else if (currentView === "week") {
      setCurrentDate(addDays(currentDate, -7));
    } else {
      setCurrentDate(addDays(currentDate, -30));
    }
  };

  // Navigate to next period
  const goToNext = () => {
    if (currentView === "day") {
      setCurrentDate(addDays(currentDate, 1));
    } else if (currentView === "week") {
      setCurrentDate(addDays(currentDate, 7));
    } else {
      setCurrentDate(addDays(currentDate, 30));
    }
  };

  // Format time for display
  const formatTime = (dateTimeString: string) => {
    return format(parseISO(dateTimeString), "h:mm a");
  };

  // Loading state
  if (isLoadingStaff || isLoadingSchedules) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-600">Loading schedule data...</p>
      </div>
    );
  }

  // Error state
  if (staffError || schedulesError) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-red-500 text-lg mb-4">
          {staffError ? "Failed to load staff data" : "Failed to load schedule data"}
        </p>
        <Button onClick={handleRetry} disabled={isRetrying}>
          {isRetrying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and Controls - Reuse existing header logic */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* ... Date Navigation ... */}
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(subDays(currentDate, currentView === 'week' ? 7 : (currentView === 'month' ? 30 : 1)))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-semibold w-40 text-center">
            {currentView === 'day' ? format(currentDate, "MMMM d, yyyy") :
              currentView === 'month' ? format(currentDate, "MMMM yyyy") :
                `Week of ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "MMM d")}`
            }
          </div>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(addDays(currentDate, currentView === 'week' ? 7 : (currentView === 'month' ? 30 : 1)))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(new Date())}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <div className="bg-slate-100 p-1 rounded-md flex">
            <button className={`px-3 py-1 text-sm rounded-sm transition-all ${currentView === 'day' ? 'bg-white shadow-sm font-medium' : 'text-muted-foreground'}`} onClick={() => setCurrentView('day')}>Day</button>
            <button className={`px-3 py-1 text-sm rounded-sm transition-all ${currentView === 'week' ? 'bg-white shadow-sm font-medium' : 'text-muted-foreground'}`} onClick={() => setCurrentView('week')}>Week</button>
            <button className={`px-3 py-1 text-sm rounded-sm transition-all ${currentView === 'month' ? 'bg-white shadow-sm font-medium' : 'text-muted-foreground'}`} onClick={() => setCurrentView('month')}>Month</button>
          </div>
          <Button onClick={() => {
            setFormData({ ...formData, start_time: format(currentDate, "yyyy-MM-dd'T'09:00"), end_time: format(currentDate, "yyyy-MM-dd'T'17:00") });
            setSelectedSchedule(null);
            setIsModalOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Schedule
          </Button>
        </div>
      </div>

      {/* Main Calendar View */}
      {currentView === 'month' ? renderMonthGridView() : renderTimeGridView()}

      {/* Schedule Form Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSchedule ? "Edit Schedule" : "Create Schedule"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="staff">Staff Member</Label>
                <Popover open={isStaffOpen} onOpenChange={setIsStaffOpen} modal={true}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isStaffOpen}
                      className="w-full justify-between"
                    >
                      {formData.staff
                        ? staffMembers?.find((staff) => staff.id === formData.staff)
                          ? `${staffMembers.find((staff) => staff.id === formData.staff)?.first_name} ${staffMembers.find((staff) => staff.id === formData.staff)?.last_name}`
                          : "Select staff member..."
                        : "Select staff member..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[450px] p-0 z-[10000]">
                    <Command>
                      <CommandInput placeholder="Search by name or role..." />
                      <CommandList>
                        <CommandEmpty>No staff members found.</CommandEmpty>
                        <CommandGroup heading="Staff Members">
                          {staffMembers?.map((staff) => (
                            <CommandItem
                              key={staff.id}
                              value={`${staff.first_name} ${staff.last_name} ${staff.role} ${staff.id}`}
                              onSelect={() => {
                                setFormData({ ...formData, staff: staff.id });
                                setIsStaffOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.staff === staff.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{staff.first_name} {staff.last_name}</span>
                                <span className="text-xs text-muted-foreground uppercase">{staff.role?.replace('_', ' ')}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="title">Shift Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. Morning Shift, Dinner Service"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Additional notes for this shift..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input
                    id="start_time"
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="end_time">End Time</Label>
                  <Input
                    id="end_time"
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="templates" className="text-left font-medium">
                    Process & Task Templates
                  </Label>
                  <div className="relative w-[200px]">
                    <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                    <Input
                      placeholder="Search templates..."
                      className="h-8 pl-8 text-xs"
                      value={templateSearch}
                      onChange={(e) => setTemplateSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="border rounded-md p-4 max-h-[200px] overflow-y-auto space-y-2 bg-slate-50">
                  {isLoadingTemplates ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : taskTemplates?.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center">No templates found.</p>
                  ) : (
                    taskTemplates
                      ?.filter((t: any) =>
                        t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
                        t.description?.toLowerCase().includes(templateSearch.toLowerCase())
                      )
                      .map((template: any) => (
                        <div key={template.id} className="flex items-start space-x-2 p-2 hover:bg-slate-100 rounded cursor-pointer" onClick={() => {
                          const newTemplates = formData.task_templates.includes(template.id)
                            ? formData.task_templates.filter(id => id !== template.id)
                            : [...formData.task_templates, template.id];
                          setFormData({ ...formData, task_templates: newTemplates });
                        }}>
                          <input
                            type="checkbox"
                            checked={formData.task_templates.includes(template.id)}
                            onChange={() => { }} // Handled by div click
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium">{template.name}</div>
                            <div className="text-xs text-muted-foreground">{template.description}</div>
                          </div>
                        </div>
                      ))
                  )}
                  {taskTemplates?.length > 0 && taskTemplates.filter((t: any) => t.name.toLowerCase().includes(templateSearch.toLowerCase())).length === 0 && (
                    <p className="text-xs text-center text-muted-foreground py-2">No matches found</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Select templates to automatically add tasks to this shift.</p>
              </div>

            </div>
            <DialogFooter className="flex justify-between">
              {selectedSchedule && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => deleteScheduleMutation.mutate(selectedSchedule.id)}
                  disabled={isDeleting}
                >
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {selectedSchedule ? "Update" : "Create"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedScheduleView;