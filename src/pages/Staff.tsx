"use client";

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import {
  Calendar,
  Clock,
  Users,
  UserCheck,
  AlertCircle,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Copy,
  Repeat,
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import ShiftModal from "@/components/ShiftModal";
import StaffAnnouncementsList from "@/pages/StaffAnnouncementsList";
import AutoScheduler, {
  Shift as AutoShift,
  StaffMember as AutoStaffMember,
} from "@/components/AutoScheduler";
import { toast } from "sonner";

// Use configured API base to avoid relative path issues between environments
const API_BASE =
  import.meta.env.VITE_REACT_APP_API_URL || "http://localhost:8000/api";

const aiRecommendations = [];

interface Shift {
  id: string;
  title: string;
  start: string;
  end: string;
  day: number;
  staffId: string;
  color?: string;
  // Optional status for local display; not required by ShiftModal
  type?: "confirmed" | "pending" | "tentative";
  // Match ShiftModal's Task shape
  tasks?: Array<{
    id: string;
    title: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    frequency?: "ONE_TIME" | "DAILY" | "WEEKLY" | "CUSTOM";
  }>;
}

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

interface BackendShift {
  id: string;
  staff: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  notes: string;
  color?: string;
}

interface WeeklyScheduleData {
  id: string;
  week_start: string;
  week_end: string;
  is_published: boolean;
  assigned_shifts: BackendShift[];
}
// import { useCalendar } from "./useCalendar"
const GoogleCalendarScheduler = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"week" | "day" | "month">("week");
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [copiedShift, setCopiedShift] = useState<Shift | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [newShiftDayIndex, setNewShiftDayIndex] = useState<number>();
  const [newShiftHour, setNewShiftHour] = useState<number>();
  const [weeklySchedule, setWeeklySchedule] =
    useState<WeeklyScheduleData | null>(null);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);

  // Helper: format date as YYYY-MM-DD (local)
  const toYMD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Helper: Monday of the week for a given date
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  // Helper: Sunday of the week for a given date
  const getWeekEnd = (date: Date) => {
    const start = getWeekStart(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return end;
  };

  // Ensure a WeeklySchedule exists for the week; create if missing, fetch if duplicate
  const ensureWeeklySchedule = async (
    token: string,
    weekStartStr: string,
    weekEndStr: string
  ) => {
    // 1) Try to find existing schedule for this week (supports paginated or raw array responses)
    const listRes = await fetch(`${API_BASE}/scheduling/weekly-schedules/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!listRes.ok) throw new Error("Failed to fetch weekly schedules");
    const listJson = await listRes.json();
    const listData: WeeklyScheduleData[] = (listJson?.results ??
      listJson) as WeeklyScheduleData[];
    const existing = Array.isArray(listData)
      ? listData.find((s) => s.week_start === weekStartStr)
      : undefined;
    if (existing) return existing;

    // 2) Not found — try to create
    const createRes = await fetch(`${API_BASE}/scheduling/weekly-schedules/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        week_start: weekStartStr,
        week_end: weekEndStr,
        is_published: false,
      }),
    });

    if (createRes.ok) {
      return (await createRes.json()) as WeeklyScheduleData;
    }

    // 3) If server says duplicate exists (400), fetch again and return it
    if (createRes.status === 400) {
      const retryListRes = await fetch(
        `${API_BASE}/scheduling/weekly-schedules/`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!retryListRes.ok)
        throw new Error("Failed to fetch weekly schedules after duplicate");
      const retryJson = await retryListRes.json();
      const retryList: WeeklyScheduleData[] = (retryJson?.results ??
        retryJson) as WeeklyScheduleData[];
      const found = Array.isArray(retryList)
        ? retryList.find((s) => s.week_start === weekStartStr)
        : undefined;
      if (found) return found;
    }

    // 4) Otherwise, throw to surface the error
    const errText = await createRes.text();
    throw new Error(
      `Failed to create weekly schedule: ${createRes.status} ${errText}`
    );
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  useEffect(() => {
    const fetchStaffAndSchedule = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          console.error("No access token found");
          return;
        }

        // Fetch active users (staff) from accounts router
        const staffResponse = await fetch(`${API_BASE}/users/?is_active=true`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!staffResponse.ok) throw new Error("Failed to fetch staff members");
        const staffJson = await staffResponse.json();
        const staffData: StaffMember[] = (staffJson?.results ??
          staffJson) as StaffMember[];
        // Optionally exclude admins here so dropdown only shows assignable staff
        const nonAdmins = staffData.filter(
          (s: StaffMember) =>
            (s.role || "").toUpperCase() !== "ADMIN" &&
            (s.role || "").toUpperCase() !== "SUPER_ADMIN"
        );
        setStaffMembers(nonAdmins);

        // Determine current week and ensure a schedule exists
        const weekStartDate = getWeekStart(currentDate);
        const weekEndDate = getWeekEnd(currentDate);
        const weekStartStr = toYMD(weekStartDate);
        const weekEndStr = toYMD(weekEndDate);

        const schedule = await ensureWeeklySchedule(
          token,
          weekStartStr,
          weekEndStr
        );
        setWeeklySchedule(schedule);
        setShifts(
          (schedule.assigned_shifts || []).map((shift: BackendShift) => ({
            id: shift.id,
            title:
              shift.notes ||
              `Shift for ${
                nonAdmins.find((s: StaffMember) => s.id === shift.staff)
                  ?.first_name
              }`,
            start: shift.start_time.substring(0, 5),
            end: shift.end_time.substring(0, 5),
            type: "confirmed" as const,
            day:
              new Date(shift.shift_date).getDay() === 0
                ? 6
                : new Date(shift.shift_date).getDay() - 1,
            staffId: shift.staff,
            color: shift.color || "#6b7280",
          }))
        );
      } catch (error) {
        const err = error as Error;
        console.error("fetchStaffAndSchedule error", {
          message: err.message,
          stack: err.stack,
        });
      }
    };

    fetchStaffAndSchedule();
  }, [currentDate]);

  const getShiftPosition = (shift: Shift) => {
    const [startHour, startMinute] = shift.start.split(":").map(Number);
    const [endHour, endMinute] = shift.end.split(":").map(Number);

    const startPosition = ((startHour * 60 + startMinute) / 60) * 80;
    const duration =
      (((endHour - startHour) * 60 + (endMinute - startMinute)) / 60) * 80;

    return { top: startPosition, height: duration };
  };

  const handleCopyShift = (shift: Shift) => {
    setCopiedShift(shift);
    setSelectedShift(null);
  };

  const handlePasteShift = (targetDay: number) => {
    if (!copiedShift) return;

    const newShift: Shift = {
      ...copiedShift,
      id: Date.now().toString(),
      day: targetDay,
    };

    setShifts((prev) => [...prev, newShift]);
    setSelectedShift(newShift);
  };

  const handleSetRecurring = (shift: Shift) => {
    setSelectedShift(shift);
    setShowRecurringModal(true);
  };

  // export default function TeamMembersCard() {
  // const [staff, setStaff] = useState([]);
  // const [loading, setLoading] = useState(true);

  // useEffect(() => {
  //   const fetchStaff = async () => {
  //     try {
  //       const res = await fetch("/api/staff/");
  //       const data = await res.json();
  //       setStaff(data);
  //     } catch (error) {
  //       console.error("Error fetching staff:", error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchStaff();
  // }, []);

  const handleDeleteShift = async (shiftId: string) => {
    if (!weeklySchedule) {
      console.error("No weekly schedule available to delete shifts.");
      return;
    }
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        console.error("No access token found");
        return;
      }

      const response = await fetch(
        `${API_BASE}/scheduling/weekly-schedules/${weeklySchedule.id}/assigned-shifts/${shiftId}/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to delete shift");

      setShifts((prev) => prev.filter((shift) => shift.id !== shiftId));
      setSelectedShift(null);
    } catch (error) {
      console.error("Error deleting shift:", error);
    }
  };

  const handleCreateShift = (dayIndex: number, hour: number) => {
    setCurrentShift(null);
    setNewShiftDayIndex(dayIndex);
    setNewShiftHour(hour);
    setIsShiftModalOpen(true);
  };

  const handleEditShift = (shift: Shift) => {
    setCurrentShift(shift);
    setIsShiftModalOpen(true);
  };

  const handleSaveShift = (shift: Shift) => {
    void (async () => {
      if (!weeklySchedule) {
        try {
          const token = localStorage.getItem("access_token");
          if (!token) {
            console.error("No access token found");
            return;
          }
          const weekStartDate = getWeekStart(currentDate);
          const weekEndDate = getWeekEnd(currentDate);
          const weekStartStr = toYMD(weekStartDate);
          const weekEndStr = toYMD(weekEndDate);
          const created = await ensureWeeklySchedule(
            token,
            weekStartStr,
            weekEndStr
          );
          setWeeklySchedule(created);
        } catch (e) {
          console.error("No weekly schedule available to save shifts.");
          return;
        }
      }

      // Guard: staff must be selected
      if (!shift.staffId) {
        console.error("Please select a staff member before saving.");
        return;
      }

      // Compute shift_date from Monday of the displayed week without mutating currentDate
      const weekStart = getWeekStart(currentDate);
      const shiftDate = new Date(weekStart);
      shiftDate.setDate(weekStart.getDate() + shift.day);

      // Ensure times include seconds (HH:MM:SS)
      const withSeconds = (t: string) => (t && t.length === 5 ? `${t}:00` : t);

      const shiftDataForBackend = {
        staff: shift.staffId,
        shift_date: toYMD(shiftDate),
        start_time: withSeconds(shift.start),
        end_time: withSeconds(shift.end),
        role: staffMembers.find((s) => s.id === shift.staffId)?.role || "",
        notes: shift.title,
        color: shift.color || "#6b7280",
      };

      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          console.error("No access token found");
          return;
        }

        if (shifts.some((s) => s.id === shift.id)) {
          const response = await fetch(
            `${API_BASE}/scheduling/weekly-schedules/${weeklySchedule.id}/assigned-shifts/${shift.id}/`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(shiftDataForBackend),
            }
          );

          if (!response.ok) {
            const errText = await response.text();
            console.error("Failed to update shift:", errText);
            throw new Error("Failed to update shift");
          }
          const updatedShift = await response.json();
          setShifts((prev) =>
            prev.map((s) =>
              s.id === updatedShift.id
                ? {
                    id: updatedShift.id,
                    title:
                      updatedShift.notes ||
                      `Shift for ${
                        staffMembers.find(
                          (s: StaffMember) => s.id === updatedShift.staff
                        )?.first_name
                      }`,
                    start: updatedShift.start_time.substring(0, 5),
                    end: updatedShift.end_time.substring(0, 5),
                    type: "confirmed" as const,
                    day:
                      new Date(updatedShift.shift_date).getDay() === 0
                        ? 6
                        : new Date(updatedShift.shift_date).getDay() - 1,
                    staffId: updatedShift.staff,
                    color: updatedShift.color || shift.color,
                  }
                : s
            )
          );
        } else {
          const response = await fetch(
            `${API_BASE}/scheduling/weekly-schedules/${weeklySchedule.id}/assigned-shifts/`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(shiftDataForBackend),
            }
          );

          if (!response.ok) {
            const errText = await response.text();
            console.error("Failed to create shift:", errText);
            throw new Error("Failed to create shift");
          }
          const newShift = await response.json();

          // If the modal included manual tasks, create them now (templates are optional)
          if (
            shift.tasks &&
            Array.isArray(shift.tasks) &&
            shift.tasks.length > 0
          ) {
            try {
              await Promise.all(
                shift.tasks.map((t) =>
                  fetch(`${API_BASE}/scheduling/shift-tasks/`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                      shift: newShift.id,
                      title: t.title,
                      priority: t.priority || "MEDIUM",
                      // Optionally assign to the same staff member
                      assigned_to: shift.staffId,
                    }),
                  })
                )
              );
            } catch (taskErr) {
              console.warn("Shift created but creating tasks failed:", taskErr);
            }
          }
          setShifts((prev) => [
            ...prev,
            {
              id: newShift.id,
              title:
                newShift.notes ||
                `Shift for ${
                  staffMembers.find((s: StaffMember) => s.id === newShift.staff)
                    ?.first_name
                }`,
              start: newShift.start_time.substring(0, 5),
              end: newShift.end_time.substring(0, 5),
              type: "confirmed" as const,
              day:
                new Date(newShift.shift_date).getDay() === 0
                  ? 6
                  : new Date(newShift.shift_date).getDay() - 1,
              staffId: newShift.staff,
              color: newShift.color || shift.color,
            },
          ]);
        }
      } catch (error) {
        console.error("Error saving shift:", error);
      }
      setIsShiftModalOpen(false);
      setCurrentShift(null);
      setNewShiftDayIndex(undefined);
      setNewShiftHour(undefined);
    })();
  };

  const navigateDate = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (view === "week") {
        newDate.setDate(prev.getDate() + (direction === "next" ? 7 : -7));
      } else if (view === "day") {
        newDate.setDate(prev.getDate() + (direction === "next" ? 1 : -1));
      } else {
        newDate.setMonth(prev.getMonth() + (direction === "next" ? 1 : -1));
      }
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // getWeekStart defined above

  const weekDates = useMemo(() => {
    const dates: Date[] = [];
    const start = getWeekStart(currentDate);

    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }

    return dates;
  }, [currentDate]);

  const getDateDisplay = () => {
    if (view === "week") {
      const firstDay = weekDates[0];
      const lastDay = weekDates[6];
      const firstMonth = firstDay.toLocaleString("en-US", { month: "short" });
      const lastMonth = lastDay.toLocaleString("en-US", { month: "short" });
      const firstDate = firstDay.getDate();
      const lastDate = lastDay.getDate();
      const year = lastDay.getFullYear();
      return `${firstMonth} ${firstDate} - ${lastMonth} ${lastDate}, ${year}`;
    }
    return currentDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  const RecurringModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">Set Recurring Schedule</h3>

        <div className="space-y-4">
          <div>
            <label htmlFor="repeat-every" className="text-sm font-medium">
              Repeat every
            </label>
            <select
              id="repeat-every"
              className="w-full p-2 border rounded mt-1"
            >
              <option>Week</option>
              <option>2 Weeks</option>
              <option>Month</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">On days</label>
            <div className="grid grid-cols-7 gap-1 mt-2">
              {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                <button
                  key={i}
                  className="w-8 h-8 border rounded text-sm hover:bg-gray-50"
                  type="button"
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="end-date" className="text-sm font-medium">
              End date
            </label>
            <input
              id="end-date"
              type="date"
              className="w-full p-2 border rounded mt-1"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <Button
            variant="outline"
            onClick={() => setShowRecurringModal(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              setShowRecurringModal(false);
            }}
          >
            Set Recurring
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg border shadow-sm h-[600px] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="p-2"
              onClick={() => navigateDate("prev")}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2"
              onClick={() => navigateDate("next")}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <h2 className="text-xl font-semibold">{getDateDisplay()}</h2>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex border rounded">
            <Button
              variant={view === "day" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("day")}
              className="px-3"
            >
              Day
            </Button>
            <Button
              variant={view === "week" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("week")}
              className="px-3"
            >
              Week
            </Button>
            <Button
              variant={view === "month" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("month")}
              className="px-3"
            >
              Month
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            {copiedShift && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Shift Copied
              </Badge>
            )}
            <Button
              size="sm"
              className="bg-green-700 hover:bg-green-700"
              onClick={() => handleCreateShift(0, 9)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="flex min-w-full">
          <div className="w-16 flex-shrink-0">
            <div className="h-12 border-b"></div>
            {hours.map((hour) => (
              <div
                key={hour}
                className="h-20 border-b text-xs text-gray-500 p-1"
              >
                {String(hour).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          <div className="flex-1 grid grid-cols-7 min-w-0">
            {days.map((day, dayIndex) => (
              <div key={day} className="border-l">
                <div
                  className="h-12 border-b flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50"
                  onClick={() => handlePasteShift(dayIndex)}
                >
                  <div className="text-sm font-medium">{day}</div>
                  <div className="text-xs text-gray-500">
                    {weekDates[dayIndex]?.toLocaleString("en-US", {
                      month: "short",
                    })}{" "}
                    {weekDates[dayIndex]?.getDate()}
                  </div>
                  {copiedShift && (
                    <div className="absolute top-1 right-1">
                      <Badge variant="outline" className="text-xs bg-green-100">
                        Paste
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="relative">
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="h-20 border-b cursor-pointer hover:bg-gray-50"
                      onClick={() => handleCreateShift(dayIndex, hour)}
                    ></div>
                  ))}

                  {shifts
                    .filter((shift) => shift.day === dayIndex)
                    .map((shift) => {
                      const position = getShiftPosition(shift);
                      const assignedStaff = staffMembers.find(
                        (staff) => String(staff.id) === String(shift.staffId)
                      );
                      const staffName = assignedStaff
                        ? `${assignedStaff.first_name} ${assignedStaff.last_name}`
                        : "";
                      const shiftTitle = shift.title
                        ? `${staffName} - ${shift.title}`
                        : staffName;

                      return (
                        <div
                          key={shift.id}
                          className={`absolute left-1 right-1 rounded p-2 cursor-pointer shadow-sm border-l-4`}
                          style={{
                            top: `${position.top}px`,
                            height: `${position.height}px`,
                            backgroundColor: shift.color
                              ? `${shift.color}20`
                              : "#f3f4f6",
                            borderLeftColor: shift.color || "#6b7280",
                          }}
                          onClick={() => handleEditShift(shift)}
                        >
                          <div className="text-xs font-medium truncate">
                            {shiftTitle}
                          </div>
                          <div className="text-xs text-gray-600">
                            {shift.start} - {shift.end}
                          </div>

                          {selectedShift?.id === shift.id && (
                            <div className="absolute top-1 right-1 flex space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 bg-white"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyShift(shift);
                                }}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 bg-white"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSetRecurring(shift);
                                }}
                              >
                                <Repeat className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 bg-white"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteShift(shift.id);
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showRecurringModal && <RecurringModal />}
      {isShiftModalOpen && (
        <ShiftModal
          isOpen={isShiftModalOpen}
          onClose={() => setIsShiftModalOpen(false)}
          onSave={handleSaveShift}
          initialShift={currentShift}
          dayIndex={newShiftDayIndex}
          hour={newShiftHour}
          staffMembers={staffMembers}
        />
      )}
    </div>
  );
};

export default function Staff() {
  const navigate = useNavigate();
  const [showAIRecommendations, setShowAIRecommendations] = useState(false);
  const [isAutoSchedulerOpen, setIsAutoSchedulerOpen] = useState(false);
  const [autoScheduleId, setAutoScheduleId] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [weeklyOverviewShifts, setWeeklyOverviewShifts] = useState<
    BackendShift[]
  >([]);
  const [weeklyOverviewLoading, setWeeklyOverviewLoading] =
    useState<boolean>(false);
  const [weeklyOverviewError, setWeeklyOverviewError] = useState<string | null>(
    null
  );
  // Admin overview: active day index for single-day view (Mon=0..Sun=6)
  const [overviewDayIndex, setOverviewDayIndex] = useState<number>(() => {
    const jsDay = new Date().getDay(); // 0=Sun..6=Sat
    return jsDay === 0 ? 6 : jsDay - 1;
  });
  const overviewWeekDates = useMemo(() => {
    // Compute Monday as start of the current week without referencing later-declared helpers
    const today = new Date();
    const day = today.getDay(); // 0=Sun..6=Sat
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + mondayOffset);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
  }, []);
  const overviewDayLabel = useMemo(() => {
    const d = overviewWeekDates[overviewDayIndex];
    if (!d) return "";
    const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
    const fmt = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return `${dayName} · ${fmt}`;
  }, [overviewWeekDates, overviewDayIndex]);
  // All Staff Tab state
  interface StaffListExtended {
    id: string;
    user: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      role: string;
      is_active: boolean;
    };
    employee_id: string;
    date_joined: string;
    is_active: boolean;
    department: string | null;
  }

  // Backend user shape returned by GET /api/users/
  interface BackendUser {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    is_active: boolean;
    created_at?: string;
    profile?: {
      employee_id?: string;
      department?: string | null;
    };
  }

  const [staff, setStaff] = useState<StaffListExtended[]>([]);
  const [staffLoading, setStaffLoading] = useState<boolean>(false);
  const [staffError, setStaffError] = useState<string | null>(null);

  const [pendingInvites, setPendingInvites] = useState<
    {
      id: string;
      email: string;
      role: string;
      invited_by: string;
      restaurant: string;
      token: string;
      is_accepted: boolean;
      created_at: string;
      expires_at: string;
    }[]
  >([]);
  const [invitesError, setInvitesError] = useState<string | null>(null);
  const [invitesLoading, setInvitesLoading] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;

  // Auto-scheduler: map staff, compute week, and persist generated shifts
  const autoSchedulerStaff: AutoStaffMember[] = useMemo(() => {
    return staff.map((s) => ({
      id: s.user.id,
      name:
        `${s.user.first_name || ""} ${s.user.last_name || ""}`.trim() ||
        s.user.email,
      role: s.user.role,
      email: s.user.email,
      phone: "",
      status: s.user.is_active ? "active" : "inactive",
      weeklyHours: 40,
      preferredShift: "morning",
      skills: [s.user.role],
      hourlyRate: 0,
      maxHoursPerDay: 8,
      unavailableDays: [],
      taskPreferences: [],
    }));
  }, [staff]);

  // Helpers for weekly overview
  const getCurrentWeekStartEnd = () => {
    const today = new Date();
    const day = today.getDay(); // 0=Sun..6=Sat
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + mondayOffset);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const fmt = (d: Date) => d.toISOString().split("T")[0];
    return {
      weekStart,
      weekEnd,
      weekStartStr: fmt(weekStart),
      weekEndStr: fmt(weekEnd),
    };
  };

  const getDayIndex = (dateStr: string) => {
    const d = new Date(dateStr);
    const jsDay = d.getDay(); // 0=Sun..6=Sat
    return jsDay === 0 ? 6 : jsDay - 1; // Mon=0..Sun=6
  };

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const fetchWeeklyShifts = async () => {
    try {
      setWeeklyOverviewLoading(true);
      setWeeklyOverviewError(null);
      const token = localStorage.getItem("access_token");
      if (!token) {
        throw new Error("No access token found");
      }

      const { weekStartStr } = getCurrentWeekStartEnd();

      // Fetch weekly schedules and find the current week
      const listRes = await fetch(`${API_BASE}/scheduling/weekly-schedules/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!listRes.ok) {
        const err = await listRes.text();
        throw new Error(`Failed to load weekly schedules: ${err}`);
      }
      const listJson = await listRes.json();
      const schedules: WeeklyScheduleData[] = (listJson?.results ??
        listJson) as WeeklyScheduleData[];
      const current = schedules.find((s) => s.week_start === weekStartStr);

      if (!current) {
        setWeeklyOverviewShifts([]);
      } else {
        const assigned = current.assigned_shifts ?? [];
        // Sort by day index then start_time
        const sorted = [...assigned].sort((a, b) => {
          const da = getDayIndex(a.shift_date);
          const db = getDayIndex(b.shift_date);
          if (da !== db) return da - db;
          return a.start_time.localeCompare(b.start_time);
        });
        setWeeklyOverviewShifts(sorted);
      }
    } catch (e) {
      const err = e as Error;
      setWeeklyOverviewError(err.message || "Failed to load shifts");
      toast.error(err.message || "Failed to load shifts");
    } finally {
      setWeeklyOverviewLoading(false);
    }
  };

  useEffect(() => {
    fetchWeeklyShifts();
  }, []);

  // Refresh overview when auto-scheduler closes or publishing completes
  useEffect(() => {
    if (!isAutoSchedulerOpen) {
      fetchWeeklyShifts();
    }
  }, [isAutoSchedulerOpen]);

  // Count unique staff who have a shift today
  const onDutyTodayCount = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const ids = new Set(
      (weeklyOverviewShifts || [])
        .filter((s) => s.shift_date === todayStr)
        .map((s) => s.staff)
    );
    return ids.size;
  }, [weeklyOverviewShifts]);

  const persistAutoSchedule = async (generated: AutoShift[]) => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        toast.error("No access token found");
        return;
      }

      const { weekStart, weekEnd, weekStartStr, weekEndStr } =
        getCurrentWeekStartEnd();

      const scheduleRes = await fetch(
        `${API_BASE}/scheduling/weekly-schedules/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            week_start: weekStartStr,
            week_end: weekEndStr,
            is_published: false,
          }),
        }
      );
      if (!scheduleRes.ok) {
        const err = await scheduleRes.text();
        throw new Error(`Failed to create weekly schedule: ${err}`);
      }
      const schedule = await scheduleRes.json();
      setAutoScheduleId(schedule.id);

      const toISODate = (base: Date, dayIndex: number) => {
        const d = new Date(base);
        d.setDate(base.getDate() + dayIndex);
        return d.toISOString().split("T")[0];
      };

      for (const sh of generated) {
        const payload = {
          staff: sh.staffId,
          shift_date: toISODate(weekStart, sh.day),
          start_time: sh.start.length === 5 ? `${sh.start}:00` : sh.start,
          end_time: sh.end.length === 5 ? `${sh.end}:00` : sh.end,
          role: sh.role,
          break_duration: "00:30:00",
          notes: sh.title,
          color: sh.color,
        };
        const res = await fetch(
          `${API_BASE}/scheduling/weekly-schedules/${schedule.id}/assigned-shifts/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          }
        );
        if (!res.ok) {
          const errTxt = await res.text();
          console.error("Failed to create assigned shift:", errTxt);
        }
      }

      toast.success("Draft schedule created. Review and publish when ready.");
      // Refresh overview calendar with newly created shifts
      await fetchWeeklyShifts();
    } catch (e) {
      const err = e as Error;
      toast.error(err.message || "Failed to auto-schedule");
    }
  };

  const publishAutoSchedule = async () => {
    if (!autoScheduleId) {
      toast.error("No draft schedule to publish");
      return;
    }
    try {
      setIsPublishing(true);
      const token = localStorage.getItem("access_token");
      if (!token) {
        toast.error("No access token found");
        setIsPublishing(false);
        return;
      }

      const res = await fetch(
        `${API_BASE}/scheduling/weekly-schedules/${autoScheduleId}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ is_published: true }),
        }
      );
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Failed to publish schedule: ${err}`);
      }

      toast.success("Schedule published to assigned staff.");
      // Refresh overview calendar after publishing
      await fetchWeeklyShifts();
      setIsAutoSchedulerOpen(false);
      setAutoScheduleId(null);
    } catch (e) {
      const err = e as Error;
      toast.error(err.message || "Failed to publish schedule");
    } finally {
      setIsPublishing(false);
    }
  };

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        setStaffLoading(true);
        setStaffError(null);
        const token = localStorage.getItem("access_token") || "";
        // Use unified users endpoint from backend (tenant-filtered)
        const response = await fetch(`${API_BASE}/users/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          // Try to read server-provided error; fall back to generic
          let serverMessage = "Failed to fetch staff";
          try {
            const data = await response.json();
            serverMessage = data.message || data.detail || serverMessage;
          } catch (e) {
            // Ignore JSON parse errors when reading error body
            void e;
          }
          throw new Error(serverMessage);
        }
        const users: BackendUser[] = await response.json();
        // Map flat user list to StaffListExtended structure expected by UI
        const mapped: StaffListExtended[] = (users || []).map(
          (u: BackendUser) => ({
            id: u.id,
            user: {
              id: u.id,
              first_name: u.first_name,
              last_name: u.last_name,
              email: u.email,
              role: u.role,
              is_active: !!u.is_active,
            },
            employee_id: u.profile?.employee_id || "",
            date_joined: u.created_at || "",
            is_active: !!u.is_active,
            department: u.profile?.department || null,
          })
        );
        setStaff(mapped);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch staff";
        setStaffError(message);
      } finally {
        setStaffLoading(false);
      }
    };

    const fetchInvites = async () => {
      try {
        setInvitesLoading(true);
        setInvitesError(null);
        const token = localStorage.getItem("access_token") || "";
        const invites = await api.getPendingStaffInvitations(token);
        setPendingInvites(invites || []);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to fetch pending invitations";
        setInvitesError(message);
      } finally {
        setInvitesLoading(false);
      }
    };

    fetchStaff();
    fetchInvites();
  }, []);

  const positions = useMemo(() => {
    const set = new Set<string>();
    staff.forEach((m) => m.user?.role && set.add(m.user.role));
    return Array.from(set);
  }, [staff]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    staff.forEach((m) => m.department && set.add(m.department));
    return Array.from(set);
  }, [staff]);

  const filteredStaff = useMemo(() => {
    let list = staff;
    if (statusFilter !== "all") {
      const isActive = statusFilter === "active";
      list = list.filter((m) => !!m.user?.is_active === isActive);
    }
    if (positionFilter !== "all") {
      list = list.filter(
        (m) =>
          (m.user?.role || "").toLowerCase() === positionFilter.toLowerCase()
      );
    }
    if (departmentFilter !== "all") {
      list = list.filter(
        (m) =>
          (m.department || "").toLowerCase() === departmentFilter.toLowerCase()
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (m) =>
          `${m.user?.first_name || ""} ${m.user?.last_name || ""}`
            .toLowerCase()
            .includes(q) || (m.user?.email || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [staff, statusFilter, positionFilter, departmentFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredStaff.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedStaff = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredStaff.slice(start, end);
  }, [filteredStaff, currentPage]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Staff Management</h1>
        </div>
        <Button
          className="gap-2 bg-primary hover:bg-primary/90"
          onClick={() => (window.location.href = "staff/add-staff")}
        >
          <Plus className="h-4 w-4" />
          Add Staff
        </Button>
      </div>

      <Tabs
        id="staff-tabs-root"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full transition-all duration-300"
      >
        <TabsList className="flex w-full overflow-x-auto gap-2 -mx-2 px-2 whitespace-nowrap snap-x snap-mandatory md:grid md:grid-cols-4 md:gap-3 md:whitespace-normal">
          <TabsTrigger
            value="overview"
            className="flex-shrink-0 snap-center px-3 py-2 text-sm md:text-base"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="all-staff"
            className="flex-shrink-0 snap-center px-3 py-2 text-sm md:text-base"
          >
            All Staff
          </TabsTrigger>
          <TabsTrigger
            value="schedule"
            className="flex-shrink-0 snap-center px-3 py-2 text-sm md:text-base"
          >
            Staff Schedule
          </TabsTrigger>
          <TabsTrigger
            value="announcements"
            className="flex-shrink-0 snap-center px-3 py-2 text-sm md:text-base"
          >
            Announcements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card className="border-accent/20 shadow-soft">
            <CardHeader
              className="pb-3 cursor-pointer"
              onClick={() => setShowAIRecommendations(!showAIRecommendations)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-accent" />
                  <CardTitle className="text-lg">AI Insights</CardTitle>
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  {showAIRecommendations ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <CardDescription>
                {aiRecommendations.length} recommendations available
              </CardDescription>
            </CardHeader>
            {showAIRecommendations && (
              <CardContent className="pt-0 space-y-3">
                {aiRecommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="flex items-start p-3 bg-muted/30 rounded-lg border-l-2 border-accent"
                  >
                    <AlertCircle className="w-4 h-4 text-accent mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-sm leading-relaxed">{rec}</span>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            <Card className="shadow-soft">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium">
                      Total Staff
                    </p>
                    <p className="text-xl sm:text-2xl font-bold">
                      {staff.length}
                    </p>
                  </div>
                  <Users className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium">
                      On Duty Today
                    </p>
                    <p className="text-xl sm:text-2xl font-bold">
                      {onDutyTodayCount}
                    </p>
                  </div>
                  <UserCheck className="w-6 h-6 sm:w-8 sm:h-8 text-success" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium">
                      Labor Cost %
                    </p>
                    <p className="text-xl sm:text-2xl font-bold"></p>
                  </div>
                  <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-warning" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium">Avg Rating</p>
                    <p className="text-xl sm:text-2xl font-bold"></p>
                  </div>
                  <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[420px] overflow-y-auto">
                {staffLoading ? (
                  <div className="text-sm text-muted-foreground">
                    Loading staff…
                  </div>
                ) : staffError ? (
                  <div className="text-red-600 text-sm">{staffError}</div>
                ) : staff.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No staff found.
                  </div>
                ) : (
                  staff.map((m) => {
                    const initials = `${m.user?.first_name?.[0] || "?"}`;
                    const name =
                      `${m.user?.first_name || ""} ${
                        m.user?.last_name || ""
                      }`.trim() || m.user?.email;
                    const role = (m.user?.role || "")
                      .toLowerCase()
                      .replace(/_/g, " ");
                    const statusLabel = m.user?.is_active
                      ? "Active"
                      : "Inactive";
                    const statusClass = m.user?.is_active
                      ? "text-green-700 border-green-300"
                      : "text-gray-700 border-gray-300";
                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-3 bg-secondary rounded-lg"
                      >
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-primary-foreground font-medium text-sm">
                              {initials}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-sm sm:text-base truncate">
                              {name}
                            </h3>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">
                              {role || "—"}
                            </p>
                            {m.department && (
                              <p className="text-xs text-muted-foreground truncate">
                                {m.department}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right space-y-1 ml-2">
                          <Badge
                            variant="outline"
                            className={`text-xs ${statusClass}`}
                          >
                            {statusLabel}
                          </Badge>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardHeader>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CardTitle>Weekly Schedule</CardTitle>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto bg-transparent"
                      onClick={() => {
                        setActiveTab("schedule");
                        const el = document.getElementById("staff-tabs-root");
                        if (el) {
                          el.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                        }
                      }}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      View Calendar
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Previous day"
                      disabled={overviewDayIndex <= 0}
                      onClick={() =>
                        setOverviewDayIndex((idx) => Math.max(idx - 1, 0))
                      }
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="text-sm text-muted-foreground">
                      {overviewDayLabel}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Next day"
                      disabled={overviewDayIndex >= 6}
                      onClick={() =>
                        setOverviewDayIndex((idx) => Math.min(idx + 1, 6))
                      }
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
                {weeklyOverviewLoading && (
                  <div className="text-sm text-muted-foreground">
                    Loading shifts…
                  </div>
                )}
                {weeklyOverviewError && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {weeklyOverviewError}
                  </div>
                )}
                {!weeklyOverviewLoading && !weeklyOverviewError && (
                  <div className="grid grid-cols-1 gap-3">
                    {(() => {
                      const dayIdx = overviewDayIndex;
                      const dayShifts = weeklyOverviewShifts
                        .filter((s) => getDayIndex(s.shift_date) === dayIdx)
                        .sort((a, b) =>
                          a.start_time.localeCompare(b.start_time)
                        );
                      return (
                        <div className="rounded-md border bg-card p-2">
                          <div className="font-medium text-sm mb-2">
                            {overviewWeekDates[dayIdx]?.toLocaleDateString(
                              "en-US",
                              { weekday: "short" }
                            ) || ""}
                          </div>
                          {dayShifts.length === 0 ? (
                            <div className="text-xs text-muted-foreground">
                              No shifts
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {dayShifts.map((shift) => {
                                const staffMember = staff.find(
                                  (s) => s.user.id === shift.staff
                                );
                                const staffName = staffMember
                                  ? `${staffMember.user.first_name} ${staffMember.user.last_name}`.trim() ||
                                    staffMember.user.email
                                  : shift.staff;
                                const role = staffMember?.user.role ?? "Staff";
                                const borderColor = shift.color
                                  ? shift.color
                                  : undefined;
                                return (
                                  <div
                                    key={shift.id}
                                    className={`group rounded-md border p-2 text-xs transition-colors hover:bg-muted`}
                                    style={
                                      borderColor ? { borderColor } : undefined
                                    }
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">
                                        {shift.start_time}–{shift.end_time}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className="ml-2 text-[10px]"
                                      >
                                        {role}
                                      </Badge>
                                    </div>
                                    <div className="mt-1 text-muted-foreground">
                                      {staffName}
                                    </div>
                                    {shift.notes && (
                                      <div className="hidden group-hover:block mt-2 text-[11px] text-muted-foreground">
                                        {shift.notes}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
                {!weeklyOverviewLoading &&
                  !weeklyOverviewError &&
                  weeklyOverviewShifts.length === 0 && (
                    <div className="text-sm text-muted-foreground">
                      No shifts scheduled for this week.
                    </div>
                  )}
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  className="h-14 sm:h-16 flex flex-col gap-1 p-2 bg-transparent"
                  onClick={() => {
                    setAutoScheduleId(null);
                    setIsAutoSchedulerOpen(true);
                  }}
                >
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs sm:text-sm text-center">
                    Auto-Schedule
                  </span>
                </Button>
                <Button
                  variant="outline"
                  className="h-14 sm:h-16 flex flex-col gap-1 p-2 bg-transparent"
                >
                  <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs sm:text-sm text-center">
                    Shift Notifications
                  </span>
                </Button>
                <Button
                  variant="outline"
                  className="h-14 sm:h-16 flex flex-col gap-1 p-2 bg-transparent"
                  onClick={() => navigate("/dashboard/timesheets")}
                >
                  <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs sm:text-sm text-center">
                    Timesheets
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <GoogleCalendarScheduler />
        </TabsContent>
        <TabsContent value="all-staff" className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>All Staff</CardTitle>
              <CardDescription>
                Browse, search, and filter staff members
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground">
                    Search
                  </label>
                  <Input
                    placeholder="Search name or email"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Position
                  </label>
                  <Select
                    value={positionFilter}
                    onValueChange={(v) => {
                      setPositionFilter(v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {positions.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Department
                  </label>
                  <Select
                    value={departmentFilter}
                    onValueChange={(v) => {
                      setDepartmentFilter(v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Employment Status
                  </label>
                  <Select
                    value={statusFilter}
                    onValueChange={(v) => {
                      setStatusFilter(v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {staffLoading ? (
                <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                  Loading staff...
                </div>
              ) : staffError ? (
                <div className="text-red-600 text-sm">{staffError}</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedStaff.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center text-sm text-muted-foreground"
                          >
                            No staff match your filters.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedStaff.map((m) => (
                          <TableRow key={m.id}>
                            <TableCell className="whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`inline-block w-2 h-2 rounded-full ${
                                    m.user?.is_active
                                      ? "bg-green-500"
                                      : "bg-gray-400"
                                  }`}
                                  aria-label={
                                    m.user?.is_active ? "Active" : "Inactive"
                                  }
                                />
                                {m.user?.first_name} {m.user?.last_name}
                              </div>
                            </TableCell>
                            <TableCell className="break-all">
                              {m.user?.email}
                            </TableCell>
                            <TableCell className="capitalize">
                              {(m.user?.role || "")
                                .toLowerCase()
                                .replace(/_/g, " ")}
                            </TableCell>
                            <TableCell>{m.department || "—"}</TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  m.user?.is_active
                                    ? "text-green-700 border-green-300"
                                    : "text-gray-700 border-gray-300"
                                }
                              >
                                {m.user?.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination */}
              <div className="flex items-center justify-between mt-3">
                <div className="text-xs text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-transparent"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-transparent"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Invitations */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
              <CardDescription>Invitations awaiting acceptance</CardDescription>
            </CardHeader>
            <CardContent>
              {invitesError ? (
                <div className="text-red-600 text-sm">{invitesError}</div>
              ) : invitesLoading ? (
                <div className="text-sm text-muted-foreground">
                  Loading pending invitations…
                </div>
              ) : pendingInvites.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No pending invitations.
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Invited</TableHead>
                        <TableHead>Expires</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingInvites.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell className="break-all">
                            {inv.email}
                          </TableCell>
                          <TableCell className="capitalize">
                            {(inv.role || "").toLowerCase().replace(/_/g, " ")}
                          </TableCell>
                          <TableCell>
                            {new Date(inv.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {new Date(inv.expires_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="announcements">
          <StaffAnnouncementsList />
        </TabsContent>
      </Tabs>
      {isAutoSchedulerOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Auto-Schedule</h3>
              <Button
                variant="ghost"
                onClick={() => setIsAutoSchedulerOpen(false)}
              >
                Close
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <AutoScheduler
                staffMembers={autoSchedulerStaff}
                onSchedulesGenerated={(shifts) => persistAutoSchedule(shifts)}
              />
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                variant="secondary"
                disabled={!autoScheduleId || isPublishing}
                onClick={publishAutoSchedule}
              >
                {isPublishing ? "Publishing..." : "Publish to Staff"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
