import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import { useAuth } from "../hooks/use-auth"; // Corrected import path
import { User } from "../contexts/AuthContext.types";
import { api } from "@/lib/api";
import StaffShiftDetailsModal from "@/components/schedule/StaffShiftDetailsModal";

const API_BASE =
  import.meta.env.VITE_REACT_APP_API_URL || "http://localhost:8000/api";

// Normalize API responses that may be arrays or `{ results: [...] }` envelopes
function normalizeEnvelope<T>(input: T[] | { results?: T[] } | unknown): T[] {
  if (Array.isArray(input)) return input;
  if (input && typeof input === "object") {
    const maybe = input as { results?: unknown };
    if (Array.isArray(maybe.results)) {
      return maybe.results as T[];
    }
  }
  return [];
}

interface AssignedShift {
  id: string;
  shift_date: string | Date;
  start_time: string;
  end_time: string;
  break_duration?: number | string;
  role: string;
  notes: string | null;
  staff_info: {
    // Assuming UserSerializer provides this
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  // Some endpoints include a compact `staff` reference
  // which may be either a string (user id) or an object
  staff?: string | { id: string; first_name?: string; last_name?: string; email?: string };
  actual_hours?: number; // From the @property in Django model
  status?: "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  is_confirmed?: boolean;
}

interface WeeklyScheduleData {
  id: string;
  week_start: string;
  week_end: string;
  is_published: boolean;
  assigned_shifts: AssignedShift[];
}

// Some endpoints return arrays, others return an envelope with `results`.
// Model both to keep type-safe parsing without unsafe casts.
type AssignedShiftsResponse = AssignedShift[] | { results?: AssignedShift[] };
type WeeklySchedulesResponse = WeeklyScheduleData[] | { results?: WeeklyScheduleData[] };

const WeeklyScheduleView: React.FC = () => {
  const { user } = useAuth() as { user: User | null };
  const [currentWeek, setCurrentWeek] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  ); // Monday as start of week
  const [selectedShift, setSelectedShift] = useState<{ id: string } | null>(null);

  const getStaffId = (s: AssignedShift): string | undefined => {
    if (s.staff_info?.id) return s.staff_info.id;
    if (typeof s.staff === "string") return s.staff;
    return s.staff?.id;
  };

  const getStaffName = (s: AssignedShift): string => {
    if (s.staff_info?.first_name || s.staff_info?.last_name) {
      return `${s.staff_info.first_name || ""} ${s.staff_info.last_name || ""}`.trim();
    }
    if (typeof s.staff !== "string" && s.staff) {
      const first = s.staff.first_name || "";
      const last = s.staff.last_name || "";
      return `${first} ${last}`.trim();
    }
    return "";
  };

  const formattedWeekStart = format(
    startOfWeek(currentWeek, { weekStartsOn: 1 }),
    "yyyy-MM-dd"
  );
  const formattedWeekEnd = format(
    endOfWeek(currentWeek, { weekStartsOn: 1 }),
    "yyyy-MM-dd"
  );

  const {
    data: assignedShifts,
    isLoading,
    error,
  } = useQuery<AssignedShift[]>({
    queryKey: ["my-assigned-shifts", formattedWeekStart, formattedWeekEnd, user?.id],
    queryFn: async () => {
      if (!user) return Promise.reject("No user");
      const accessToken = localStorage.getItem("access_token") || "";

      // Use calendar/my_shifts endpoint - designed for staff access
      console.log('[WeeklySchedule] Fetching for week:', formattedWeekStart, 'to', formattedWeekEnd, 'for user:', user.id);
      try {
        const calRes = await fetch(
          `${API_BASE}/scheduling/calendar/my_shifts/?start_date=${formattedWeekStart}&end_date=${formattedWeekEnd}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        console.log('[WeeklySchedule] Calendar API response status:', calRes.status);

        if (!calRes.ok) {
          const errorText = await calRes.text();
          console.error('[WeeklySchedule] Calendar API error:', calRes.status, errorText);
          return [];
        }

        const calJson = await calRes.json();
        console.log('[WeeklySchedule] Calendar API response:', calJson);

        const events: Array<{
          id: string;
          title: string;
          start: string;
          end: string;
          status?: AssignedShift["status"];
          is_confirmed?: boolean;
          notes?: string | null;
        }> = Array.isArray(calJson?.events) ? calJson.events : [];

        const mapIsoToAssigned = (iso: string) => {
          const d = new Date(iso);
          const dateStr = format(d, "yyyy-MM-dd");
          const hh = String(d.getHours()).padStart(2, "0");
          const mm = String(d.getMinutes()).padStart(2, "0");
          return { dateStr, timeStr: `${hh}:${mm}:00` };
        };

        const shifts: AssignedShift[] = events.map((e) => {
          const startParts = mapIsoToAssigned(e.start);
          const endParts = mapIsoToAssigned(e.end);
          const diffMs = new Date(e.end).getTime() - new Date(e.start).getTime();
          const actualHours = Math.max(0, diffMs) / (1000 * 60 * 60);
          return {
            id: e.id,
            shift_date: startParts.dateStr,
            start_time: startParts.timeStr,
            end_time: endParts.timeStr,
            role: "",
            notes: e.notes || null,
            staff_info: {
              id: user!.id,
              first_name: user!.first_name,
              last_name: user!.last_name,
              email: user!.email,
            },
            status: e.status,
            is_confirmed: e.is_confirmed,
            actual_hours: Number.isFinite(actualHours) ? actualHours : undefined,
          } as AssignedShift;
        });

        console.log('[WeeklySchedule] Mapped shifts:', shifts.length, shifts);
        return shifts;
      } catch (error) {
        console.error('[WeeklySchedule] Error fetching calendar shifts:', error);
        return [];
      }
    },
    enabled: !!user,
  });

  const daysOfWeek = Array.from({ length: 7 }).map((_, i) =>
    startOfWeek(currentWeek, { weekStartsOn: 1 }).setDate(
      currentWeek.getDate() + i
    )
  );

  const goToPreviousWeek = () => {
    setCurrentWeek((prev) => subWeeks(prev, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeek((prev) => addWeeks(prev, 1));
  };

  if (isLoading)
    return <div className="text-center py-8">Loading schedule...</div>;
  if (error)
    return (
      <div className="text-center py-8 text-red-500">
        Error: {error instanceof Error ? error.message : String(error)}
      </div>
    );
  if (!user)
    return (
      <div className="text-center py-8 text-gray-500">
        Please log in to view schedules.
      </div>
    );

  const shiftsByDay: { [key: string]: AssignedShift[] } = {};
  (assignedShifts || [])
    // Extra safety: ensure we only group current user's shifts even if API filter fails
    .filter((shift) => getStaffId(shift) === user?.id)
    .forEach((shift) => {
      // Normalize to 'YYYY-MM-DD'. If API returns ISO datetime string, slice first 10 chars.
      const dateKey = (() => {
        const sd = shift.shift_date;
        if (typeof sd === 'string') {
          const s = sd;
          if (s.length >= 10) return s.slice(0, 10);
          // Fallback: attempt parsing shorter/variant strings
          try {
            return format(new Date(s), 'yyyy-MM-dd');
          } catch {
            return '';
          }
        }
        // sd is a Date
        try {
          return format(sd, 'yyyy-MM-dd');
        } catch {
          return '';
        }
      })();
      if (!shiftsByDay[dateKey]) {
        shiftsByDay[dateKey] = [];
      }
      shiftsByDay[dateKey].push(shift);
    });

  const getDurationLabel = (start: string, end: string) => {
    const parse = (t: string) => {
      const [h, m] = t.split(":").map((x) => parseInt(x, 10));
      return h * 60 + m;
    };
    const startMin = parse(start);
    const endMin = parse(end);
    let diff = endMin - startMin;
    if (diff < 0) diff += 24 * 60; // handle cross-midnight
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  return (
    <div className="container mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
        <CalendarDays className="w-8 h-8 mr-3 text-blue-600" />
        Weekly Schedule
      </h2>

      <div className="flex justify-between items-center mb-6 bg-gray-100 p-3 rounded-lg">
        <button
          onClick={goToPreviousWeek}
          className="p-2 rounded-full hover:bg-gray-200"
          aria-label="Previous Week"
        >
          <ChevronLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h3 className="text-xl font-semibold text-gray-700">
          {format(startOfWeek(currentWeek, { weekStartsOn: 1 }), "MMM d, yyyy")}{" "}
          - {format(endOfWeek(currentWeek, { weekStartsOn: 1 }), "MMM d, yyyy")}
        </h3>
        <button
          onClick={goToNextWeek}
          className="p-2 rounded-full hover:bg-gray-200"
          aria-label="Next Week"
        >
          <ChevronRight className="w-6 h-6 text-gray-700" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
        {Array.from({ length: 7 }).map((_, i) => {
          const date = startOfWeek(currentWeek, { weekStartsOn: 1 });
          date.setDate(date.getDate() + i);
          const dateKey = format(date, "yyyy-MM-dd");
          const dayShifts = shiftsByDay[dateKey] || [];

          return (
            <div key={dateKey} className="border rounded-lg p-4 bg-gray-50">
              <h4 className="text-lg font-bold text-gray-800 mb-3">
                {format(date, "EEE, MMM d")}
              </h4>
              {dayShifts.length > 0 ? (
                dayShifts.map((shift) => {
                  // Derive break minutes from string (e.g., "PT30M") or number
                  const breakMinutes = (() => {
                    const bd = shift.break_duration;
                    if (bd === null || bd === undefined) return null;
                    if (typeof bd === 'number') return Math.round(bd);
                    if (typeof bd === 'string') {
                      // Support PT30M and PT1H30M formats
                      const hoursMatch = bd.match(/PT(\d+)H/);
                      const minutesMatch = bd.match(/PT(?:\d+H)?(\d+)M/);
                      let total = 0;
                      if (hoursMatch) total += parseInt(hoursMatch[1], 10) * 60;
                      if (minutesMatch) total += parseInt(minutesMatch[1], 10);
                      // Also support HH:MM:SS format (e.g., 01:00:00)
                      if (!total) {
                        const hms = bd.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
                        if (hms) {
                          total = parseInt(hms[1], 10) * 60 + parseInt(hms[2], 10);
                        }
                      }
                      return total || null;
                    }
                    return null;
                  })();

                  return (
                    <button
                      key={shift.id}
                      type="button"
                      onClick={() => setSelectedShift({ id: String(shift.id) })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedShift({ id: String(shift.id) });
                        }
                      }}
                      aria-label={`View details for shift on ${format(new Date(typeof shift.shift_date === 'string' ? shift.shift_date : shift.shift_date), "PPP")}`}
                      aria-haspopup="dialog"
                      className="w-full text-left bg-white rounded-md shadow-sm p-3 mb-3 border border-gray-200 hover:border-blue-300 hover:shadow focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <p className="font-semibold text-gray-900">
                        {getStaffName(shift) || ""}
                      </p>
                      <p className="text-sm text-gray-600">
                        {format(new Date(`2000-01-01T${shift.start_time}`), "hh:mm a")} - {format(new Date(`2000-01-01T${shift.end_time}`), "hh:mm a")}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">Duration: {getDurationLabel(shift.start_time, shift.end_time)}</span>
                        {shift.status && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border">
                            {shift.status}
                          </span>
                        )}
                        {shift.is_confirmed && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 border">
                            Confirmed
                          </span>
                        )}
                      </div>
                      {typeof shift.actual_hours === 'number' && (
                        <p className="text-xs text-gray-500">Hours: {shift.actual_hours.toFixed(2)}</p>
                      )}
                      {/* Break information removed per request */}
                      {shift.notes && (
                        <p className="text-xs text-gray-500 italic truncate">{shift.notes}</p>
                      )}
                    </button>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500">No shifts</p>
              )}
              {/* Staff cannot add shifts from this view */}
            </div>
          );
        })}
      </div>

      {/* Shift details modal */}
      <StaffShiftDetailsModal
        open={!!selectedShift?.id}
        shiftId={selectedShift?.id || null}
        onClose={() => setSelectedShift(null)}
        initialShift={selectedShift || null}
      />
    </div>
  );
};

export default WeeklyScheduleView;
