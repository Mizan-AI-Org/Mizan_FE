"use client";

import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button as UIButton } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn, getStaffColor } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";
import type { Shift } from "@/types/schedule";

interface StaffMember {
  id: string;
  user?: { id: string; first_name: string; last_name: string };
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string;
}

interface StaffTimesheetViewProps {
  shifts: Shift[];
  staffMembers: StaffMember[];
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  onEditShift?: (shift: Shift) => void;
  isLoading?: boolean;
}

/** Skeleton that mirrors the timesheet layout (header + table with staff/role + 7 days). */
function StaffTimesheetViewSkeleton() {
  const weekDates = Array.from({ length: 7 }, (_, i) => i);
  const roleRows = [
    { role: "MANAGER", staffCount: 1 },
    { role: "WAITER", staffCount: 3 },
    { role: "CHEF", staffCount: 2 },
  ];
  return (
    <div className="bg-white rounded-lg border shadow-sm flex flex-col overflow-hidden max-h-[85vh]">
      {/* Header skeleton */}
      <div className="flex items-center justify-between p-4 border-b flex-shrink-0 bg-white z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <Skeleton className="h-6 w-48" />
        </div>
      </div>
      {/* Table skeleton */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <th className="text-left py-3 px-4 w-48 border-r border-gray-200">
                <Skeleton className="h-4 w-24" />
              </th>
              {weekDates.map((i) => (
                <th key={i} className="py-3 px-2 text-center border-r border-gray-200 last:border-r-0">
                  <Skeleton className="h-4 w-8 mx-auto" />
                  <Skeleton className="h-4 w-6 mx-auto mt-1" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roleRows.map(({ role, staffCount }) => (
              <React.Fragment key={role}>
                <tr className="bg-gray-100/80 border-b border-gray-100">
                  <td colSpan={8} className="py-2 px-4">
                    <Skeleton className="h-4 w-20" />
                  </td>
                </tr>
                {Array.from({ length: staffCount }).map((_, i) => (
                  <tr key={`${role}-${i}`} className="border-b border-gray-100">
                    <td className="py-2 px-4 border-r border-gray-100">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                        <Skeleton className="h-4 flex-1 max-w-[120px]" />
                      </div>
                    </td>
                    {weekDates.map((j) => (
                      <td key={j} className="py-1.5 px-2 align-top border-r border-gray-100 last:border-r-0">
                        <div className="space-y-1">
                          <Skeleton className="h-6 w-full rounded" />
                          {i === 0 && j < 2 && <Skeleton className="h-6 w-full rounded" />}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Staff-based color: each staff gets a consistent hex. Use with inline styles. */
function getStaffShiftStyle(staffId: string): React.CSSProperties {
  const hex = getStaffColor(staffId);
  return {
    backgroundColor: `${hex}20`,
    borderColor: hex,
    color: hex,
  };
}

function formatTime(timeStr: string): string {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m || "00"}${ampm}`;
}

function timeRange(start: string, end: string): string {
  return `${formatTime(start)}-${formatTime(end)}`;
}

export const StaffTimesheetView: React.FC<StaffTimesheetViewProps> = ({
  shifts,
  staffMembers,
  currentDate,
  setCurrentDate,
  onEditShift,
  isLoading = false,
}) => {
  const { t } = useLanguage();

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const weekStart = getWeekStart(currentDate);
  const weekDates = useMemo(() => {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [weekStart]);

  const dateStr = (d: Date) => format(d, "yyyy-MM-dd");

  const shiftsByStaffByDate = useMemo(() => {
    const map: Record<string, Record<string, Shift[]>> = {};
    staffMembers.forEach((s) => {
      map[s.id] = {};
      weekDates.forEach((d) => {
        map[s.id][dateStr(d)] = [];
      });
    });
    shifts.forEach((shift) => {
      const staffIds = (shift.staff_members && shift.staff_members.length) ? shift.staff_members : [shift.staffId];
      staffIds.forEach((staffId) => {
        if (!staffId) return;
        if (!map[staffId]) map[staffId] = {};
        if (!map[staffId][shift.date]) map[staffId][shift.date] = [];
        map[staffId][shift.date].push(shift);
      });
    });
    return map;
  }, [shifts, staffMembers, weekDates]);

  const staffByRole = useMemo(() => {
    const byRole: Record<string, StaffMember[]> = {};
    staffMembers.forEach((s) => {
      const role = (s.role || "STAFF").toUpperCase();
      if (!byRole[role]) byRole[role] = [];
      byRole[role].push(s);
    });
    const order = ["MANAGER", "CHEF", "BARTENDER", "SERVER", "WAITER", "HOST", "CASHIER", "CLEANER"];
    const ordered: { role: string; staff: StaffMember[] }[] = [];
    const seen = new Set<string>();
    order.forEach((r) => {
      if (byRole[r]) {
        ordered.push({ role: r, staff: byRole[r] });
        byRole[r].forEach((s) => seen.add(s.id));
      }
    });
    Object.entries(byRole).forEach(([role, staff]) => {
      if (seen.has(staff[0]?.id)) return;
      ordered.push({ role, staff });
    });
    return ordered;
  }, [staffMembers]);

  const navigateWeek = (dir: "prev" | "next") => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + (dir === "next" ? 7 : -7));
      return next;
    });
  };

  const displayRange = `${format(weekDates[0], "MMM d")} – ${format(weekDates[6], "MMM d, yyyy")}`;

  if (isLoading) {
    return <StaffTimesheetViewSkeleton />;
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm flex flex-col overflow-hidden max-h-[85vh]">
      <div className="flex items-center justify-between p-4 border-b flex-shrink-0 bg-white z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            <UIButton variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => navigateWeek("prev")}>
              <ChevronLeft className="w-4 h-4" />
            </UIButton>
            <UIButton variant="ghost" className="text-sm font-bold px-3 rounded-lg" onClick={() => setCurrentDate(new Date())}>
              {t("schedule.today")}
            </UIButton>
            <UIButton variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => navigateWeek("next")}>
              <ChevronRight className="w-4 h-4" />
            </UIButton>
          </div>
          <h2 className="text-lg font-bold text-gray-900">{displayRange}</h2>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <th className="text-left py-3 px-4 w-48 text-xs font-bold text-gray-500 uppercase tracking-wider border-r border-gray-200">
                Staff / Role
              </th>
              {weekDates.map((d) => {
                const isToday = dateStr(d) === format(new Date(), "yyyy-MM-dd");
                return (
                  <th
                    key={dateStr(d)}
                    className={cn(
                      "py-3 px-2 text-center text-xs font-bold uppercase tracking-wider border-r border-gray-200 last:border-r-0",
                      isToday ? "bg-green-50 text-green-800" : "text-gray-500"
                    )}
                  >
                    <div>{format(d, "EEE")}</div>
                    <div className={cn("mt-0.5", isToday ? "text-green-700 font-black" : "text-gray-700")}>
                      {format(d, "d")}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {staffByRole.map(({ role, staff }) => (
              <React.Fragment key={role}>
                <tr className="bg-gray-100/80 border-b border-gray-100">
                  <td colSpan={8} className="py-2 px-4 text-sm font-bold text-gray-700 uppercase tracking-wider">
                    {role}
                  </td>
                </tr>
                {staff.map((member) => {
                  const name = `${member.first_name || ""} ${member.last_name || ""}`.trim() || "—";
                  const initials = name !== "—" ? name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "—";
                  return (
                    <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="py-2 px-4 border-r border-gray-100">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8 rounded-full border-2 border-white shadow-sm">
                            <AvatarFallback className="text-xs font-bold bg-gray-200 text-gray-700">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-gray-900 truncate">{name}</span>
                        </div>
                      </td>
                      {weekDates.map((d) => {
                        const dayShifts = (shiftsByStaffByDate[member.id] || {})[dateStr(d)] || [];
                        const isToday = dateStr(d) === format(new Date(), "yyyy-MM-dd");
                        return (
                          <td
                            key={dateStr(d)}
                            className={cn(
                              "py-1.5 px-2 align-top border-r border-gray-100 last:border-r-0",
                              isToday && "bg-green-50/30"
                            )}
                          >
                            <div className="space-y-1">
                              {dayShifts.length === 0 ? (
                                <span className="text-xs text-gray-300">—</span>
                              ) : (
                                dayShifts.map((shift) => {
                                  const roleInitial = (member.role || "S").charAt(0).toUpperCase();
                                  const staffStyle = getStaffShiftStyle(member.id);
                                  return (
                                    <div
                                      key={shift.id}
                                      onClick={() => onEditShift?.(shift)}
                                      className={cn(
                                        "w-full min-h-[32px] flex items-center rounded px-2 py-1.5 border cursor-pointer hover:opacity-90 transition-opacity text-[11px] font-medium box-border",
                                        onEditShift && "cursor-pointer"
                                      )}
                                      style={{ ...staffStyle, borderWidth: "1px" }}
                                      title={`${shift.title || "Shift"} ${timeRange(shift.start, shift.end)}`}
                                    >
                                      <span className="font-bold shrink-0">{roleInitial}</span>
                                      <span className="truncate min-w-0 ml-1">{timeRange(shift.start, shift.end)}</span>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        {staffByRole.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <p className="text-sm font-medium">{t("schedule.no_staff_period")}</p>
            <p className="text-xs mt-1">{t("schedule.add_staff_timesheet")}</p>
          </div>
        )}
      </div>
    </div>
  );
};
