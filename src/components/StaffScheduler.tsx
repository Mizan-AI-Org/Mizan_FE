import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, Clock, Plus, Trash2, Edit } from "lucide-react";
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface StaffMember {
  id: string;
  full_name: string;
  role: string;
  status: string;
  avatar_url?: string;
}

interface Shift {
  id: string;
  staff_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
  staff_members?: StaffMember;
}

export default function StaffScheduler() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [formData, setFormData] = useState({
    staff_id: "",
    start_time: "09:00",
    end_time: "17:00",
    notes: "",
  });

  const queryClient = useQueryClient();

  // Fetch staff members
  const { data: staffMembers = [] } = useQuery({
    queryKey: ["staff-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_members")
        .select("*")
        .eq("status", "active")
        .order("full_name");
      
      if (error) throw error;
      return data as StaffMember[];
    },
  });

  // Fetch shifts for current month
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const { data: shifts = [] } = useQuery({
    queryKey: ["staff-shifts", format(monthStart, "yyyy-MM-dd"), format(monthEnd, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_shifts")
        .select("*, staff_members(*)")
        .gte("shift_date", format(monthStart, "yyyy-MM-dd"))
        .lte("shift_date", format(monthEnd, "yyyy-MM-dd"))
        .order("shift_date")
        .order("start_time");
      
      if (error) throw error;
      return data as Shift[];
    },
  });

  // Create shift mutation
  const createShift = useMutation({
    mutationFn: async (data: { staff_id: string; shift_date: string; start_time: string; end_time: string; notes?: string }) => {
      const { data: restaurant } = await supabase.from("restaurants").select("id").single();
      
      const { error } = await supabase
        .from("staff_shifts")
        .insert({
          ...data,
          restaurant_id: restaurant?.id,
          status: "scheduled",
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-shifts"] });
      toast.success("Shift scheduled successfully");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to schedule shift: " + error.message);
    },
  });

  // Update shift mutation
  const updateShift = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Shift> & { id: string }) => {
      const { error } = await supabase
        .from("staff_shifts")
        .update(data)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-shifts"] });
      toast.success("Shift updated successfully");
      setIsDialogOpen(false);
      setEditingShift(null);
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to update shift: " + error.message);
    },
  });

  // Delete shift mutation
  const deleteShift = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("staff_shifts")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-shifts"] });
      toast.success("Shift deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete shift: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      staff_id: "",
      start_time: "09:00",
      end_time: "17:00",
      notes: "",
    });
    setEditingShift(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !formData.staff_id) {
      toast.error("Please select a date and staff member");
      return;
    }

    const shiftData = {
      staff_id: formData.staff_id,
      shift_date: format(selectedDate, "yyyy-MM-dd"),
      start_time: formData.start_time,
      end_time: formData.end_time,
      notes: formData.notes,
    };

    if (editingShift) {
      updateShift.mutate({ id: editingShift.id, ...shiftData });
    } else {
      createShift.mutate(shiftData);
    }
  };

  const handleEditShift = (shift: Shift) => {
    setEditingShift(shift);
    setFormData({
      staff_id: shift.staff_id,
      start_time: shift.start_time,
      end_time: shift.end_time,
      notes: shift.notes || "",
    });
    setSelectedDate(new Date(shift.shift_date));
    setIsDialogOpen(true);
  };

  const getDayShifts = (date: Date) => {
    return shifts.filter(shift => isSameDay(new Date(shift.shift_date), date));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-success text-success-foreground";
      case "scheduled": return "bg-primary text-primary-foreground";
      case "completed": return "bg-muted text-muted-foreground";
      case "cancelled": return "bg-destructive text-destructive-foreground";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  // Calendar month days
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  return (
    <div className="space-y-6">
      {/* Header with Month Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            Previous
          </Button>
          <h2 className="text-2xl font-bold">{format(currentMonth, "MMMM yyyy")}</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            Next
          </Button>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary hover:bg-primary/90" onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Schedule Staff
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingShift ? "Edit Shift" : "Schedule Staff"}</DialogTitle>
              <DialogDescription>
                {editingShift ? "Update the shift details" : "Schedule a new shift for a staff member"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <div className="border rounded-md p-3 bg-muted/50">
                  {selectedDate ? format(selectedDate, "PPP") : "Select a date"}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="staff">Staff Member</Label>
                <Select
                  value={formData.staff_id}
                  onValueChange={(value) => setFormData({ ...formData, staff_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffMembers.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.full_name} - {staff.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_time">End Time</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  placeholder="Add any notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingShift ? "Update Shift" : "Schedule Shift"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <Card className="lg:col-span-2 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Schedule Calendar
            </CardTitle>
            <CardDescription>Click on a date to view or schedule shifts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {/* Day headers */}
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-center font-semibold text-sm text-muted-foreground p-2">
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {monthDays.map((day) => {
                const dayShifts = getDayShifts(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      min-h-[100px] p-2 rounded-lg border-2 transition-all hover:border-primary/50
                      ${isSelected ? "border-primary bg-primary/5" : "border-border"}
                      ${isToday ? "bg-accent/10" : "bg-card"}
                    `}
                  >
                    <div className={`text-sm font-medium mb-1 ${isToday ? "text-accent" : ""}`}>
                      {format(day, "d")}
                    </div>
                    <div className="space-y-1">
                      {dayShifts.slice(0, 2).map((shift) => (
                        <div
                          key={shift.id}
                          className="text-xs p-1 rounded bg-primary/10 text-primary truncate"
                        >
                          {shift.staff_members?.full_name.split(" ")[0]}
                        </div>
                      ))}
                      {dayShifts.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayShifts.length - 2} more
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Day Details */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {selectedDate ? format(selectedDate, "MMM d, yyyy") : "Select a date"}
            </CardTitle>
            <CardDescription>
              {selectedDate && getDayShifts(selectedDate).length} shift(s) scheduled
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {selectedDate && getDayShifts(selectedDate).length > 0 ? (
                getDayShifts(selectedDate).map((shift) => (
                  <div
                    key={shift.id}
                    className="p-3 bg-secondary rounded-lg space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{shift.staff_members?.full_name}</p>
                        <p className="text-sm text-muted-foreground">{shift.staff_members?.role}</p>
                      </div>
                      <Badge className={getStatusColor(shift.status)}>
                        {shift.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>{shift.start_time} - {shift.end_time}</span>
                    </div>
                    {shift.notes && (
                      <p className="text-sm text-muted-foreground">{shift.notes}</p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditShift(shift)}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteShift.mutate(shift.id)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>No shifts scheduled</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setIsDialogOpen(true)}
                  >
                    Schedule a shift
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}