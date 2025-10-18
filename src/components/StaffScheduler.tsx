import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/client";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import { Clock, Plus, X, User } from "lucide-react";

interface StaffMember {
  id: string;
  full_name: string;
  role: string;
  avatar_url?: string;
  status: string;
}

interface Shift {
  id: string;
  staff_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  status: string;
  staff_member?: StaffMember;
}

export default function StaffScheduler() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { toast } = useToast();

  useEffect(() => {
    fetchStaffMembers();
  }, []);

  useEffect(() => {
    fetchShifts();
  }, [currentMonth]);

  const fetchStaffMembers = async () => {
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
  };

  const fetchShifts = async () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    const { data, error } = await supabase
      .from("staff_shifts")
      .select(`
        *,
        staff_member:staff_members(id, full_name, role, avatar_url, status)
      `)
      .gte("shift_date", format(start, "yyyy-MM-dd"))
      .lte("shift_date", format(end, "yyyy-MM-dd"))
      .order("shift_date")
      .order("start_time");

    if (error) {
      toast({
        title: "Error loading shifts",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setShifts(data || []);
    }
  };

  const handleScheduleShift = async () => {
    if (!selectedDate || !selectedStaffId) {
      toast({
        title: "Missing information",
        description: "Please select a date and staff member",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("staff_shifts")
      .insert({
        staff_id: selectedStaffId,
        shift_date: format(selectedDate, "yyyy-MM-dd"),
        start_time: startTime,
        end_time: endTime,
        status: "scheduled",
      });

    if (error) {
      toast({
        title: "Error scheduling shift",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Shift scheduled",
        description: "Staff member has been scheduled successfully",
      });
      setIsScheduleDialogOpen(false);
      fetchShifts();
      setSelectedStaffId("");
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    const { error } = await supabase
      .from("staff_shifts")
      .delete()
      .eq("id", shiftId);

    if (error) {
      toast({
        title: "Error deleting shift",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Shift deleted",
        description: "Shift has been removed from the schedule",
      });
      fetchShifts();
    }
  };

  const getShiftsForDate = (date: Date) => {
    return shifts.filter(shift => 
      isSameDay(parseISO(shift.shift_date), date)
    );
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  };

  const getStatusColor = (status: string) => {
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
                    Click a date to schedule staff members
                  </CardDescription>
                </div>
                <Button onClick={() => setIsScheduleDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Schedule Staff
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
                      if (date) {
                        setIsScheduleDialogOpen(true);
                      }
                    }}
                    onMonthChange={setCurrentMonth}
                    className="rounded-md border"
                  />
                </div>

                <div className="lg:col-span-2 space-y-4">
                  <h3 className="font-semibold text-lg">
                    Shifts for {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Select a date"}
                  </h3>
                  
                  <div className="space-y-3">
                    {selectedDate && getShiftsForDate(selectedDate).length === 0 && (
                      <p className="text-muted-foreground text-sm">No shifts scheduled for this date</p>
                    )}
                    
                    {selectedDate && getShiftsForDate(selectedDate).map(shift => (
                      <Card key={shift.id} className="border-l-4" style={{ borderLeftColor: "hsl(var(--primary))" }}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-primary-foreground" />
                              </div>
                              <div>
                                <h4 className="font-semibold">{shift.staff_member?.full_name}</h4>
                                <p className="text-sm text-muted-foreground">{shift.staff_member?.role}</p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Clock className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">
                                    {shift.start_time} - {shift.end_time}
                                  </span>
                                  <Badge className={getStatusColor(shift.status)} variant="secondary">
                                    {shift.status}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteShift(shift.id)}
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
                  const dayShifts = getShiftsForDate(day);
                  if (dayShifts.length === 0) return null;

                  return (
                    <div key={day.toISOString()} className="space-y-2">
                      <h4 className="font-semibold text-sm text-muted-foreground">
                        {format(day, "EEEE, MMMM d, yyyy")}
                      </h4>
                      <div className="space-y-2 ml-4">
                        {dayShifts.map(shift => (
                          <div
                            key={shift.id}
                            className="flex items-center justify-between p-3 bg-secondary rounded-lg"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-primary-foreground" />
                              </div>
                              <div>
                                <p className="font-medium">{shift.staff_member?.full_name}</p>
                                <p className="text-xs text-muted-foreground">{shift.staff_member?.role}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center space-x-2">
                                <Clock className="w-3 h-3 text-muted-foreground" />
                                <span className="text-sm">{shift.start_time} - {shift.end_time}</span>
                              </div>
                              <Badge className={getStatusColor(shift.status)} variant="secondary">
                                {shift.status}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteShift(shift.id)}
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

      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Staff Member</DialogTitle>
            <DialogDescription>
              Create a new shift for {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "selected date"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="staff">Staff Member</Label>
              <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                <SelectTrigger id="staff">
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers.map(staff => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.full_name} - {staff.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time">Start Time</Label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger id="start-time">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                      <SelectItem key={hour} value={`${hour.toString().padStart(2, '0')}:00`}>
                        {hour.toString().padStart(2, '0')}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-time">End Time</Label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger id="end-time">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                      <SelectItem key={hour} value={`${hour.toString().padStart(2, '0')}:00`}>
                        {hour.toString().padStart(2, '0')}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleScheduleShift}>
              Schedule Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}