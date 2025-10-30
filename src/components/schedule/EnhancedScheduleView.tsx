import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays, startOfWeek, parseISO, isSameDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar, Clock, AlertCircle, CheckCircle, Loader2, RefreshCw } from "lucide-react";

const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || "http://localhost:8000/api";

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
    color: "#3b82f6",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

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
    data: staffMembers,
    isLoading: isLoadingStaff,
    error: staffError,
  } = useQuery<StaffMember[]>({
    queryKey: ["staff-members"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/staff/profiles/`, {
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
      
      // Enhance schedules with staff names
      return data.map((schedule: Schedule) => {
        const staffMember = staffMembers?.find(s => s.id === schedule.staff);
        return {
          ...schedule,
          staff_name: staffMember ? `${staffMember.first_name} ${staffMember.last_name}` : "Unknown Staff"
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
      queryClient.invalidateQueries(["schedules"]);
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
      queryClient.invalidateQueries(["schedules"]);
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
      queryClient.invalidateQueries(["schedules"]);
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

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedSchedule) {
      updateScheduleMutation.mutate({ id: selectedSchedule.id, data: formData });
    } else {
      createScheduleMutation.mutate(formData);
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
      color: "#3b82f6",
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
      {/* View Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={goToPrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-lg font-medium">
            {currentView === "day"
              ? format(currentDate, "MMMM d, yyyy")
              : currentView === "week"
              ? `Week of ${format(dateRange[0], "MMM d")} - ${format(dateRange[6], "MMM d, yyyy")}`
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
                      {`${staffMember.first_name} ${staffMember.last_name}`}
                      <div className="text-xs text-muted-foreground">{staffMember.role}</div>
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
                                  <div className="mt-1">
                                    <Badge variant="outline" className={`${statusColors[schedule.status]} border-none text-xs`}>
                                      {statusIcons[schedule.status]}
                                      {schedule.status}
                                    </Badge>
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
                <div className="col-span-3 flex items-center gap-2">
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
            <DialogFooter className="flex justify-between">
              {selectedSchedule && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => deleteScheduleMutation.mutate(selectedSchedule.id)}
                  disabled={isDeleting || isSubmitting}
                >
                  {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  Delete
                </Button>
              )}
              <div className="flex gap-2">
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