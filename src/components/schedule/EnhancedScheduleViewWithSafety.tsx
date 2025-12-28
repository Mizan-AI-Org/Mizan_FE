import React, { useState } from "react";
import { format, parseISO, isSameDay, addDays } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Shield,
  AlertTriangle,
  CheckSquare,
  Calendar,
  Clipboard,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { API_BASE } from "@/lib/api";


interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  safety_compliance?: number;
  pending_tasks?: number;
  safety_score?: number;
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
  safety_tasks?: SafetyTask[];
  safety_compliance?: number;
}

interface SafetyTask {
  id: string;
  title: string;
  description: string;
  due_date: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
}

interface ScheduleFormData {
  title: string;
  description: string;
  staff: string;
  start_time: string;
  end_time: string;
  color: string;
}

interface EnhancedScheduleViewProps {
  viewMode?: "day" | "week" | "month";
  initialDate?: Date;
  onScheduleClick?: (schedule: Schedule) => void;
  showSafetyIndicators?: boolean;
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

const safetyComplianceColors = (compliance: number) => {
  if (compliance >= 90) return "bg-green-500";
  if (compliance >= 70) return "bg-yellow-500";
  return "bg-red-500";
};

const formatTime = (dateTimeString: string) => {
  try {
    return format(parseISO(dateTimeString), "h:mm a");
  } catch (error) {
    return "Invalid time";
  }
};

const EnhancedScheduleViewWithSafety: React.FC<EnhancedScheduleViewProps> = ({
  viewMode = "week",
  initialDate = new Date(),
  onScheduleClick,
  showSafetyIndicators = true,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
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
    color: "#3b82f6",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showSafetyTasksModal, setShowSafetyTasksModal] = useState(false);
  const [selectedStaffSafetyTasks, setSelectedStaffSafetyTasks] = useState<SafetyTask[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  // Get date range based on current view
  const getDateRange = () => {
    const today = currentDate;
    const dates = [];

    if (currentView === "day") {
      dates.push(today);
    } else if (currentView === "week") {
      for (let i = 0; i < 7; i++) {
        dates.push(addDays(today, i));
      }
    } else {
      // Month view - show 4 weeks
      for (let i = 0; i < 28; i++) {
        dates.push(addDays(today, i));
      }
    }

    return dates;
  };

  const dateRange = getDateRange();

  // Fetch staff members with safety data
  const {
    data: staffMembers,
    isLoading: isLoadingStaff,
    error: staffError,
  } = useQuery<StaffMember[]>({
    queryKey: ["staff-members-with-safety"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/staff/profiles/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch staff members");
      }
      
      const staffData = await response.json();
      
      // Do not simulate safety data; return actual staff data only
      return staffData;
    },
  });

  // Fetch schedules
  const {
    data: schedules,
    isLoading: isLoadingSchedules,
    error: schedulesError,
    refetch: refetchSchedules,
  } = useQuery<Schedule[]>({
    queryKey: ["schedules", format(dateRange[0], "yyyy-MM-dd"), format(dateRange[dateRange.length - 1], "yyyy-MM-dd")],
    queryFn: async () => {
      const startDate = format(dateRange[0], "yyyy-MM-dd");
      const endDate = format(dateRange[dateRange.length - 1], "yyyy-MM-dd");
      
      const response = await fetch(
        `${API_BASE}/staff/schedules/?start_date=${startDate}&end_date=${endDate}`,
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
      
      // Enhance schedules with staff names only (no simulated safety data)
      return data.map((schedule: Schedule) => {
        const staffMember = staffMembers?.find(s => s.id === schedule.staff);
        
        return {
          ...schedule,
          staff_name: staffMember ? `${staffMember.first_name} ${staffMember.last_name}` : "Unknown Staff",
        };
      });
    },
    enabled: !!staffMembers, // Only run this query when staffMembers are loaded
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

  // Form submission handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedSchedule) {
      updateScheduleMutation.mutate({
        id: selectedSchedule.id,
        data: formData,
      });
    } else {
      createScheduleMutation.mutate(formData);
    }
  };

  // Delete schedule handler
  const handleDelete = () => {
    if (selectedSchedule) {
      deleteScheduleMutation.mutate(selectedSchedule.id);
    }
  };

  // Reset form
  const resetForm = () => {
    setSelectedSchedule(null);
    setFormData({
      title: "",
      description: "",
      staff: "",
      start_time: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      end_time: format(addDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm"),
      color: "#3b82f6",
    });
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
        color: schedule.color || "#3b82f6",
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

  // Group schedules by date and staff
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

  // Show safety tasks for a staff member
  const showSafetyTasks = (staffId: string) => {
    const staffMember = staffMembers?.find(s => s.id === staffId);
    if (!staffMember) return;
    
    // Get all safety tasks for this staff member across all schedules
    const allTasks: SafetyTask[] = [];
    schedules?.forEach(schedule => {
      if (schedule.staff === staffId && schedule.safety_tasks) {
        allTasks.push(...schedule.safety_tasks);
      }
    });
    
    setSelectedStaffId(staffId);
    setSelectedStaffSafetyTasks(allTasks);
    setShowSafetyTasksModal(true);
  };

  // Loading state
  if (isLoadingStaff || isLoadingSchedules) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading schedules...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (staffError || schedulesError) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <p className="mt-4 text-destructive">Failed to load schedules</p>
          <Button onClick={handleRetry} disabled={isRetrying} className="mt-4">
            {isRetrying ? "Retrying..." : "Retry"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={goToPrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-medium">
            {currentView === "day"
              ? format(currentDate, "MMMM d, yyyy")
              : currentView === "week"
              ? `${format(dateRange[0], "MMM d")} - ${format(dateRange[dateRange.length - 1], "MMM d, yyyy")}`
              : `${format(dateRange[0], "MMM yyyy")}`}
          </div>
          <Button variant="outline" size="sm" onClick={goToNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as "day" | "week" | "month")}>
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" /> Add Schedule
          </Button>
        </div>
      </div>

      {/* Schedule Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Staff</TableHead>
                {dateRange.slice(0, currentView === "month" ? 7 : undefined).map((date) => (
                  <TableHead key={date.toISOString()} className="min-w-[120px]">
                    <div className="text-center">
                      <div>{format(date, "EEE")}</div>
                      <div className="text-sm font-normal">{format(date, "MMM d")}</div>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffMembers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-4">
                    No staff members available.
                  </TableCell>
                </TableRow>
              ) : (
                staffMembers?.map((staffMember) => (
                  <TableRow key={staffMember.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center justify-between">
                        <div>
                          {`${staffMember.first_name} ${staffMember.last_name}`}
                          <div className="text-xs text-muted-foreground">{staffMember.role}</div>
                        </div>
                        
                        {/* Safety indicators */}
                        {showSafetyIndicators && (
                          <div className="flex items-center space-x-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div 
                                    className="w-2 h-2 rounded-full" 
                                    style={{ backgroundColor: safetyComplianceColors(staffMember.safety_compliance || 0) }}
                                  ></div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Safety Compliance: {staffMember.safety_compliance}%</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            {(staffMember.pending_tasks || 0) > 0 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-6 w-6 p-0 rounded-full"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        showSafetyTasks(staffMember.id);
                                      }}
                                    >
                                      <Clipboard className="h-3 w-3 text-amber-500" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{staffMember.pending_tasks} pending safety tasks</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    {dateRange.slice(0, currentView === "month" ? 7 : undefined).map((date) => {
                      const schedulesForDay = getSchedulesForDateAndStaff(date, staffMember.id);
                      return (
                        <TableCell key={date.toISOString()} className="p-2 align-top">
                          {schedulesForDay.length > 0 ? (
                            <div className="space-y-1">
                              {schedulesForDay.map((schedule) => (
                                <div
                                  key={schedule.id}
                                  className={`text-xs rounded-md px-2 py-1 cursor-pointer hover:opacity-80 transition-opacity`}
                                  style={{ backgroundColor: schedule.color || "#3b82f6", color: "#ffffff" }}
                                  onClick={() => handleScheduleClick(schedule)}
                                >
                                  <div className="font-medium">{schedule.title}</div>
                                  <div className="text-xs opacity-90">
                                    {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                                  </div>
                                  <div className="mt-1 flex items-center justify-between">
                                    <Badge variant="outline" className={`${statusColors[schedule.status]} border-none text-xs`}>
                                      {statusIcons[schedule.status]}
                                      {schedule.status}
                                    </Badge>
                                    
                                    {/* Safety compliance indicator */}
                                    {showSafetyIndicators && schedule.safety_compliance !== undefined && (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="flex items-center">
                                              <Shield className={`h-3 w-3 ${
                                                schedule.safety_compliance >= 90 ? "text-green-200" :
                                                schedule.safety_compliance >= 70 ? "text-yellow-200" : "text-red-200"
                                              }`} />
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Safety Compliance: {schedule.safety_compliance}%</p>
                                            {schedule.safety_tasks && schedule.safety_tasks.some(task => task.status !== "COMPLETED") && (
                                              <p className="text-xs text-amber-500">Has incomplete safety tasks</p>
                                            )}
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full h-8 border border-dashed border-gray-200 text-gray-400 hover:text-gray-900"
                              onClick={() => {
                                resetForm();
                                setFormData({
                                  ...formData,
                                  staff: staffMember.id,
                                  start_time: format(date, "yyyy-MM-dd") + "T09:00",
                                  end_time: format(date, "yyyy-MM-dd") + "T17:00",
                                });
                                setIsModalOpen(true);
                              }}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Schedule Form Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{selectedSchedule ? "Edit Schedule" : "Create Schedule"}</DialogTitle>
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
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="staff" className="text-right">
                  Staff
                </Label>
                <Select
                  value={formData.staff}
                  onValueChange={(value) => setFormData({ ...formData, staff: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffMembers?.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.first_name} {staff.last_name} ({staff.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="start_time" className="text-right">
                  Start Time
                </Label>
                <Input
                  id="start_time"
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="end_time" className="text-right">
                  End Time
                </Label>
                <Input
                  id="end_time"
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="color" className="text-right">
                  Color
                </Label>
                <div className="col-span-3 flex items-center space-x-2">
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-12 h-8 p-1"
                  />
                  <Input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              {selectedSchedule && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="mr-auto"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? selectedSchedule
                    ? "Updating..."
                    : "Creating..."
                  : selectedSchedule
                  ? "Update"
                  : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Safety Tasks Modal */}
      <Dialog open={showSafetyTasksModal} onOpenChange={setShowSafetyTasksModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              Safety Tasks
              {selectedStaffId && staffMembers?.find(s => s.id === selectedStaffId) && (
                <span className="ml-2 font-normal text-muted-foreground">
                  for {staffMembers.find(s => s.id === selectedStaffId)?.first_name} {staffMembers.find(s => s.id === selectedStaffId)?.last_name}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedStaffSafetyTasks.length === 0 ? (
            <div className="py-6 text-center">
              <CheckSquare className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
              <p className="mt-2 text-muted-foreground">No safety tasks found</p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {selectedStaffSafetyTasks.map(task => (
                <div key={task.id} className="border rounded-md p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium flex items-center">
                        {task.priority === "HIGH" ? (
                          <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                        ) : task.priority === "MEDIUM" ? (
                          <AlertCircle className="h-4 w-4 text-amber-500 mr-2" />
                        ) : (
                          <Calendar className="h-4 w-4 text-blue-500 mr-2" />
                        )}
                        {task.title}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                      <div className="text-xs text-muted-foreground mt-2">
                        Due: {format(parseISO(task.due_date), "MMM d, yyyy h:mm a")}
                      </div>
                    </div>
                    <Badge 
                      className={
                        task.status === "COMPLETED" ? "bg-green-100 text-green-800 hover:bg-green-200" :
                        task.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-800 hover:bg-blue-200" :
                        "bg-amber-100 text-amber-800 hover:bg-amber-200"
                      }
                    >
                      {task.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setShowSafetyTasksModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedScheduleViewWithSafety;