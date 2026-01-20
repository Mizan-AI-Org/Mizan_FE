import { Loader2, Plus, X, Search, Check } from "lucide-react";
import { WeeklyTimeGridView } from "./WeeklyTimeGridView";
import { StaffScheduleListView } from "./StaffScheduleListView";
import ShiftModal from "@/components/ShiftModal";
import type { Shift, StaffMember, WeeklyScheduleData, BackendShift } from "@/types/schedule";
import { startOfWeek, endOfWeek, format, addDays, parseISO, addWeeks, addMonths, isBefore, isEqual } from "date-fns";
import { API_BASE } from "@/lib/api";
import { toast } from "sonner";
import React, { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AuthContextType } from "@/contexts/AuthContext.types";
import { getStaffColor } from "@/lib/utils";

/**
 * EnhancedScheduleView serves as the main scheduling hub.
 * It now prioritizes the 24-hour weekly grid view for optimized staff allocation.
 */
const EnhancedScheduleView: React.FC = () => {
  const { isAdmin, isSuperAdmin } = useAuth() as AuthContextType;
  const canEditShifts = (isAdmin?.() ?? false) || (isSuperAdmin?.() ?? false);

  const [currentView, setCurrentView] = useState<"week" | "list">("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);

  const toYMD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  // Fetch staff members
  const { data: staffMembers = [], isLoading: isLoadingStaff } = useQuery<StaffMember[]>({
    queryKey: ["staff-members"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/staff/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch staff");
      const json = await response.json();
      const staffArr = (json?.results ?? json) as any[];
      return staffArr.map(s => ({
        id: s.id || s.user?.id,
        user: s.user || {
          id: s.id,
          first_name: s.first_name || '',
          last_name: s.last_name || ''
        },
        first_name: s.first_name,
        last_name: s.last_name,
        role: s.role
      }));
    },
  });

  // Fetch shifts for the current week
  const weekStartStr = toYMD(getWeekStart(currentDate));
  const { data: scheduleData, isLoading: isLoadingShifts, refetch: refetchShifts } = useQuery<WeeklyScheduleData>({
    queryKey: ["weekly-schedule", weekStartStr],
    queryFn: async () => {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${API_BASE}/scheduling/weekly-schedules/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch schedules");
      const listJson = await response.json();
      const listData = (listJson?.results ?? listJson) as WeeklyScheduleData[];
      let existing = Array.isArray(listData) ? listData.find((s) => s.week_start === weekStartStr) : undefined;

      if (!existing && canEditShifts) {
        // Create if missing (only for admins)
        const createRes = await fetch(`${API_BASE}/scheduling/weekly-schedules/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            week_start: weekStartStr,
            week_end: toYMD(addDays(getWeekStart(currentDate), 6)),
            is_published: false,
          }),
        });
        if (createRes.ok) existing = await createRes.json();
      }

      if (!existing) return { id: "", week_start: "", week_end: "", is_published: false, assigned_shifts: [] };
      return existing;
    }
  });

  const shifts: Shift[] = useMemo(() => {
    if (!scheduleData?.assigned_shifts) return [];

    const toHHmm = (val: string) => {
      if (!val) return "00:00";
      const m = val.match(/^\d{2}:\d{2}/);
      if (m) return m[0];
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return format(d, "HH:mm");
      }
      return "00:00";
    };

    return scheduleData.assigned_shifts.map((shift: BackendShift) => ({
      id: shift.id,
      title: shift.notes || `Shift`,
      start: toHHmm(shift.start_time),
      end: toHHmm(shift.end_time),
      date: shift.shift_date,
      type: "confirmed" as const,
      day: new Date(shift.shift_date).getDay() === 0 ? 6 : new Date(shift.shift_date).getDay() - 1,
      staffId: shift.staff,
      color: shift.color || "#6b7280",
    }));
  }, [scheduleData]);

  if (isLoadingStaff || isLoadingShifts) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-green-600" />
          <p className="text-gray-500 font-medium tracking-wide">Orchestrating schedule data...</p>
        </div>
      </div>
    );
  }

  const handleSaveShift = async (shift: Shift) => {
    try {
      const token = localStorage.getItem("access_token");
      const isUpdate = shifts.some((s) => s.id === shift.id && !String(s.id).startsWith('temp'));

      const withSeconds = (t: string) => (t && t.length === 5 ? `${t}:00` : t);
      const makeISO = (dStr: string, tStr: string) => {
        const d = new Date(`${dStr}T${withSeconds(tStr)}`);
        const offsetMin = -d.getTimezoneOffset();
        const sign = offsetMin >= 0 ? "+" : "-";
        const abs = Math.abs(offsetMin);
        return `${dStr}T${withSeconds(tStr)}${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
      };

      const staffIds = shift.staff_members && shift.staff_members.length > 0 ? shift.staff_members : [shift.staffId];
      const shiftDates = [shift.date];

      // Only generate recurring shifts for NEW shifts to prevent duplicates on update
      if (shift.isRecurring && !isUpdate && shift.recurringEndDate) {
        const baseDate = parseISO(shift.date);
        const endDate = parseISO(shift.recurringEndDate);
        let currentDate = baseDate;
        let iterations = 0;
        const maxIterations = 365; // Safety limit

        while (iterations < maxIterations) {
          let nextDate: Date;
          if (shift.frequency === 'DAILY') {
            nextDate = addDays(currentDate, 1);
          } else if (shift.frequency === 'MONTHLY') {
            nextDate = addMonths(currentDate, 1);
          } else { // WEEKLY
            nextDate = addWeeks(currentDate, 1);
          }

          if (isBefore(nextDate, endDate) || isEqual(nextDate, endDate)) {
            shiftDates.push(format(nextDate, 'yyyy-MM-dd'));
            currentDate = nextDate;
            iterations++;
          } else {
            break;
          }
        }
      }

      const results = [];
      let originalShiftConsumed = false;

      for (const dStr of shiftDates) {
        // Determine the correct weekly schedule ID for this date
        let targetedWeeklyScheduleId = scheduleData?.id;
        const currentWeekStart = toYMD(getWeekStart(parseISO(dStr)));

        if (currentWeekStart !== weekStartStr) {
          // Find or create weekly schedule for this different week
          const findRes = await fetch(`${API_BASE}/scheduling/weekly-schedules/`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const listJson = await findRes.json();
          const listData = (listJson?.results ?? listJson) as WeeklyScheduleData[];
          let existing = listData.find(s => s.week_start === currentWeekStart);

          if (!existing) {
            const createRes = await fetch(`${API_BASE}/scheduling/weekly-schedules/`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                week_start: currentWeekStart,
                week_end: toYMD(addDays(getWeekStart(parseISO(dStr)), 6)),
                is_published: false,
              }),
            });
            if (createRes.ok) existing = await createRes.json();
          }
          targetedWeeklyScheduleId = existing?.id;
        }

        if (!targetedWeeklyScheduleId) continue;

        // Only use PUT for the very first combination (original staff, original date)
        // If update involves multiple staff or dates, those must be POSTed
        const method = (isUpdate && dStr === shift.date && !originalShiftConsumed) ? "PUT" : "POST";
        if (method === "PUT") originalShiftConsumed = true;

        const url = `${API_BASE}/scheduling/weekly-schedules/${targetedWeeklyScheduleId}/assigned-shifts/${(method === "PUT" ? shift.id + "/" : "")}`;

        const payload = {
          staff: staffIds[0], // Keep legacy staff field for compatibility (backend handles it)
          staff_members: staffIds, // Assign multiple staff to one shift
          shift_date: dStr,
          start_time: makeISO(dStr, shift.start),
          end_time: makeISO(dStr, shift.end),
          notes: shift.title || "",
          color: shift.color || getStaffColor(staffIds[0]),
          task_templates: (shift as any).task_templates || [],
          tasks: shift.tasks || [],
        };

        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          results.push(await response.json());
        } else {
          const errText = await response.text();
          console.error(`Failed to ${method} shift on ${dStr}:`, errText);
        }
      }

      if (results.length > 0) {
        toast.success(`Successfully processed ${results.length} shift(s)`);
      } else {
        toast.error("Failed to create any shifts. Check console for details.");
      }
      refetchShifts();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save shift(s)");
    } finally {
      setIsShiftModalOpen(false);
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    try {
      const token = localStorage.getItem("access_token");
      const url = `${API_BASE}/scheduling/assigned-shifts-v2/${shiftId}/`;
      const response = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to delete shift");
      toast.success("Shift deleted successfully");
      refetchShifts();
    } catch (error) {
      toast.error("Failed to delete shift");
    } finally {
      setIsShiftModalOpen(false);
    }
  };

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Staff Schedule</h1>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={currentView} onValueChange={(v) => setCurrentView(v as any)} className="bg-gray-100 p-1 rounded-xl">
            <TabsList className="bg-transparent border-none">
              <TabsTrigger value="week" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-4">Weekly Grid View</TabsTrigger>
              <TabsTrigger value="list" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-4">List View</TabsTrigger>
            </TabsList>
          </Tabs>
          <button
            onClick={() => {
              setCurrentShift(null);
              setIsShiftModalOpen(true);
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            <Plus className="h-5 w-5" />
            <span>Create</span>
          </button>
        </div>
      </div>

      <div className="w-full">
        {currentView === "week" ? (
          <WeeklyTimeGridView
            shifts={shifts}
            staffMembers={staffMembers}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            onEditShift={(shift) => {
              setCurrentShift(shift);
              setIsShiftModalOpen(true);
            }}
          />
        ) : (
          <StaffScheduleListView
            shifts={shifts}
            staffMembers={staffMembers}
            currentDate={currentDate}
          />
        )}
      </div>

      <ShiftModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        onSave={handleSaveShift}
        onDelete={handleDeleteShift}
        initialShift={currentShift || {
          id: '',
          title: '',
          date: toYMD(currentDate),
          start: "09:00",
          end: "17:00",
          day: currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1,
          staffId: staffMembers[0]?.id || '',
          tasks: []
        }}
        staffMembers={staffMembers}
      />
    </div>
  );
};

export default EnhancedScheduleView;