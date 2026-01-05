import { useState, useEffect, useCallback } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/client";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import { Clock, Plus, X, User } from "lucide-react";
import ScheduleCreationModal from "./schedule/ScheduleCreationModal"; // Import the new modal
import { API_BASE } from "@/lib/api";

interface StaffMember {
  id: string;
  full_name: string;
  role: string;
  avatar_url?: string;
  status: string;
}

interface Schedule {
  id: string;
  staff: StaffMember;
  title: string;
  start_time: string;
  end_time: string;
  tasks: string[];
  is_recurring: boolean;
  recurrence_pattern: string | null;
  color?: string;
}

export default function StaffScheduler() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false); // State for the new modal
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]); // Renamed from shifts to schedules
  const [editingSchedule, setEditingSchedule] = useState<Schedule | undefined>(undefined); // State for editing
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { toast } = useToast();

  const fetchStaffMembers = useCallback(async () => {
    const { data, error } = await supabase
      .from("staff_members")
      .select("*")
      .eq("status", "active")
      .order("full_name");

    if (error) {
      toast({
        title: "Error loading staff",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setStaffMembers(data || []);
    }
  }, [toast]);

  const fetchSchedules = useCallback(async () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    // Replace with API call to Django backend
    try {
      const response = await fetch(`${API_BASE}/staff/schedules/?start_date=${format(start, "yyyy-MM-dd")}&end_date=${format(end, "yyyy-MM-dd")}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setSchedules(data);
    } catch (error: any) {
      toast({
        title: "Error loading schedules",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [currentMonth, toast]);

  useEffect(() => {
    fetchStaffMembers();
  }, [fetchStaffMembers]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleSaveSchedule = async (scheduleData: any) => {
    try {
      const method = editingSchedule ? 'PUT' : 'POST';
      const url = editingSchedule
        ? `${API_BASE}/staff/schedules/${editingSchedule.id}/`
        : `${API_BASE}/staff/schedules/`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          // Include authorization token if needed
        },
        body: JSON.stringify(scheduleData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast({
        title: editingSchedule ? "Schedule updated" : "Schedule created",
        description: editingSchedule ? "Schedule has been updated successfully" : "Schedule has been created successfully",
      });
      setIsScheduleModalOpen(false);
      setEditingSchedule(undefined);
      fetchSchedules();
    } catch (error: any) {
      toast({
        title: "Error saving schedule",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      const response = await fetch(`${API_BASE}/staff/schedules/${scheduleId}/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          // Include authorization token if needed
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast({
        title: "Schedule deleted",
        description: "Schedule has been removed from the calendar",
      });
      fetchSchedules();
    } catch (error: any) {
      toast({
        title: "Error deleting schedule",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getSchedulesForDate = (date: Date) => {
    return schedules.filter(schedule =>
      isSameDay(parseISO(schedule.start_time), date)
    );
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  };

  const getStatusColor = (status: string) => {
    // This status might not be directly applicable to schedules, 
    // need to re-evaluate based on Schedule model's status equivalent or remove.
    switch (status) {
      case "confirmed":
        return "bg-success text-success-foreground";
      case "scheduled":
        return "bg-primary text-primary-foreground";
      case "completed":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const handleEditSchedule = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setIsScheduleModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <Card className="shadow-soft">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Staff Schedule Calendar</CardTitle>
                  <CardDescription>
                    Manage schedules and AI-optimized staffing
                  </CardDescription>
                </div>
                <Button onClick={() => { setIsScheduleModalOpen(true); setEditingSchedule(undefined); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Schedule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                    }}
                    onMonthChange={setCurrentMonth}
                    className="rounded-md border"
                  />
                </div>

                <div className="lg:col-span-2 space-y-4">
                  <h3 className="font-semibold text-lg">
                    Schedules for {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Select a date"}
                  </h3>

                  <div className="space-y-3">
                    {selectedDate && getSchedulesForDate(selectedDate).length === 0 && (
                      <p className="text-muted-foreground text-sm">No schedules for this date</p>
                    )}

                    {selectedDate && getSchedulesForDate(selectedDate).map(schedule => (
                      <Card
                        key={schedule.id}
                        className="border-l-4 cursor-pointer"
                        style={{ borderLeftColor: schedule.color || "hsl(var(--primary))" }}
                        onClick={() => handleEditSchedule(schedule)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: schedule.color || "hsl(var(--primary))" }}>
                                <User className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <h4 className="font-semibold">{schedule.staff?.full_name}</h4>
                                <p className="text-sm text-muted-foreground">{schedule.title}</p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Clock className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">
                                    {format(parseISO(schedule.start_time), 'HH:mm')} - {format(parseISO(schedule.end_time), 'HH:mm')}
                                  </span>
                                  {schedule.is_recurring && (
                                    <Badge variant="secondary">
                                      Recurring ({schedule.recurrence_pattern})
                                    </Badge>
                                  )}
                                </div>
                                {schedule.tasks && schedule.tasks.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-xs font-semibold">Tasks:</p>
                                    <ul className="list-disc list-inside text-xs text-muted-foreground">
                                      {schedule.tasks.map((task, idx) => (
                                        <li key={idx}>{task}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => { e.stopPropagation(); handleDeleteSchedule(schedule.id); }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>All Scheduled Shifts</CardTitle>
              <CardDescription>View all upcoming shifts by date</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {getDaysInMonth().map(day => {
                  const daySchedules = getSchedulesForDate(day);
                  if (daySchedules.length === 0) return null;

                  return (
                    <div key={day.toISOString()} className="space-y-2">
                      <h4 className="font-semibold text-sm text-muted-foreground">
                        {format(day, "EEEE, MMMM d, yyyy")}
                      </h4>
                      <div className="space-y-2 ml-4">
                        {daySchedules.map(schedule => (
                          <div
                            key={schedule.id}
                            className="flex items-center justify-between p-3 bg-secondary rounded-lg cursor-pointer border-l-4"
                            style={{ borderLeftColor: schedule.color || "hsl(var(--primary))" }}
                            onClick={() => handleEditSchedule(schedule)}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: schedule.color || "hsl(var(--primary))" }}>
                                <User className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <p className="font-medium">{schedule.staff?.full_name}</p>
                                <p className="text-xs text-muted-foreground">{schedule.title}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center space-x-2">
                                <Clock className="w-3 h-3 text-muted-foreground" />
                                <span className="text-sm">{format(parseISO(schedule.start_time), 'HH:mm')} - {format(parseISO(schedule.end_time), 'HH:mm')}</span>
                              </div>
                              {schedule.is_recurring && (
                                <Badge variant="secondary">
                                  Recurring ({schedule.recurrence_pattern})
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => { e.stopPropagation(); handleDeleteSchedule(schedule.id); }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ScheduleCreationModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onSave={handleSaveSchedule}
        initialData={editingSchedule}
      />
    </div>
  );
}