import { useState, useEffect, useCallback } from "react";
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { format, addDays, startOfWeek } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/client";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Copy, Plus } from "lucide-react";

interface StaffMember {
  id: string;
  full_name: string;
  role: string;
}

interface Shift {
  id: string;
  staff_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  status: string;
  staff?: StaffMember;
}

export const DraggableShiftScheduler = () => {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date()));
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [activeShift, setActiveShift] = useState<Shift | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const fetchStaffMembers = useCallback(async () => {
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id")
      .eq("owner_id", (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (restaurant) {
      const { data } = await supabase
        .from("staff_members")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .eq("status", "active")
        .order("full_name");

      setStaffMembers(data || []);
    }
  }, []);

  const fetchShifts = useCallback(async () => {
    const weekEnd = addDays(currentWeek, 7);
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id")
      .eq("owner_id", (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (restaurant) {
      const { data } = await supabase
        .from("staff_shifts")
        .select(`
          *,
          staff:staff_members(id, full_name, role)
        `)
        .eq("restaurant_id", restaurant.id)
        .gte("shift_date", format(currentWeek, "yyyy-MM-dd"))
        .lt("shift_date", format(weekEnd, "yyyy-MM-dd"))
        .order("shift_date");

      setShifts(data || []);
    }
  }, [currentWeek]);

  useEffect(() => {
    fetchStaffMembers();
    fetchShifts();
  }, [currentWeek, fetchStaffMembers, fetchShifts]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveShift(null);

    if (!over) return;

    const shiftId = active.id as string;
    const [newDate, newStaffId] = (over.id as string).split("-");

    try {
      const { error } = await supabase
        .from("staff_shifts")
        .update({
          shift_date: newDate,
          staff_id: newStaffId,
        })
        .eq("id", shiftId);

      if (error) throw error;

      toast.success("Shift moved successfully");
      fetchShifts();
    } catch (error) {
      console.error("Error moving shift:", error);
      toast.error("Failed to move shift");
    }
  };

  const duplicateShift = async (shift: Shift) => {
    try {
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id")
        .eq("owner_id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!restaurant) return;

      const nextWeekDate = addDays(new Date(shift.shift_date), 7);

      const { error } = await supabase
        .from("staff_shifts")
        .insert({
          restaurant_id: restaurant.id,
          staff_id: shift.staff_id,
          shift_date: format(nextWeekDate, "yyyy-MM-dd"),
          start_time: shift.start_time,
          end_time: shift.end_time,
          status: "scheduled",
        });

      if (error) throw error;

      toast.success("Shift duplicated to next week");
      fetchShifts();
    } catch (error) {
      console.error("Error duplicating shift:", error);
      toast.error("Failed to duplicate shift");
    }
  };

  const createShift = async () => {
    if (!selectedDate || !selectedStaffId) return;

    try {
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id")
        .eq("owner_id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!restaurant) return;

      const { error } = await supabase
        .from("staff_shifts")
        .insert({
          restaurant_id: restaurant.id,
          staff_id: selectedStaffId,
          shift_date: format(selectedDate, "yyyy-MM-dd"),
          start_time: startTime,
          end_time: endTime,
          status: "scheduled",
        });

      if (error) throw error;

      toast.success("Shift created");
      setShowDialog(false);
      fetchShifts();
    } catch (error) {
      console.error("Error creating shift:", error);
      toast.error("Failed to create shift");
    }
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentWeek(addDays(currentWeek, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-semibold">
            {format(currentWeek, "MMM dd")} - {format(addDays(currentWeek, 6), "MMM dd, yyyy")}
          </div>
          <Button variant="outline" size="icon" onClick={() => setCurrentWeek(addDays(currentWeek, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={() => setCurrentWeek(startOfWeek(new Date()))}>Today</Button>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd} onDragStart={(event) => {
        const shift = shifts.find(s => s.id === event.active.id);
        setActiveShift(shift || null);
      }}>
        <div className="grid grid-cols-8 gap-2">
          <div className="font-semibold p-2">Staff</div>
          {weekDays.map((day) => (
            <div key={day.toISOString()} className="text-center p-2 border-b font-semibold">
              <div>{format(day, "EEE")}</div>
              <div className="text-sm text-muted-foreground">{format(day, "dd")}</div>
            </div>
          ))}

          {staffMembers.map((staff) => (
            <>
              <div key={staff.id} className="p-2 border-r">
                <div className="font-medium">{staff.full_name}</div>
                <div className="text-xs text-muted-foreground">{staff.role}</div>
              </div>
              {weekDays.map((day) => {
                const dayShifts = shifts.filter(
                  (s) => s.staff_id === staff.id && s.shift_date === format(day, "yyyy-MM-dd")
                );
                const dropId = `${format(day, "yyyy-MM-dd")}-${staff.id}`;

                return (
                  <div
                    key={dropId}
                    className="min-h-[80px] p-1 border hover:bg-accent/50 cursor-pointer"
                    onClick={() => {
                      setSelectedDate(day);
                      setSelectedStaffId(staff.id);
                      setShowDialog(true);
                    }}
                  >
                    {dayShifts.map((shift) => (
                      <Card
                        key={shift.id}
                        className="mb-1 cursor-move hover:shadow-lg transition-shadow"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", shift.id);
                        }}
                      >
                        <CardContent className="p-2 text-xs">
                          <div className="font-medium">
                            {shift.start_time} - {shift.end_time}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 mt-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateShift(shift);
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                );
              })}
            </>
          ))}
        </div>

        <DragOverlay>
          {activeShift && (
            <Card className="w-32 shadow-xl">
              <CardContent className="p-2 text-xs">
                <div className="font-medium">
                  {activeShift.start_time} - {activeShift.end_time}
                </div>
              </CardContent>
            </Card>
          )}
        </DragOverlay>
      </DndContext>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Shift</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Staff Member</Label>
              <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""} readOnly />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div>
                <Label>End Time</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
            <Button onClick={createShift} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Create Shift
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
