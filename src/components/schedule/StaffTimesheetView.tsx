"use client";

import React, { useMemo } from "react";
import { Button as UIButton } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { format } from "date-fns";
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
  onCreateShift?: () => void;
  isLoading?: boolean;
}

function prettyRole(role: string): string {
  return (role || "Staff")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTime(timeStr: string): { clock: string; period: string } {
  if (!timeStr) return { clock: "", period: "" };
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const period = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return { clock: `${h12}:${m || "00"}`, period };
}

function timeRange(start: string, end: string): string {
  const from = formatTime(start);
  const to = formatTime(end);
  if (!from.clock || !to.clock) return "";
  if (from.period === to.period) return `${from.clock}–${to.clock} ${to.period}`;
  return `${from.clock} ${from.period}–${to.clock} ${to.period}`;
}

function StaffTimesheetViewSkeleton() {
  const weekDates = Array.from({ length: 7 }, (_, i) => i);
  const roleRows = [
    { role: "MANAGER", staffCount: 1 },
    { role: "WAITER", staffCount: 3 },
    { role: "CHEF", staffCount: 2 },
  ];
  return (
    <div className="flex max-h-[85vh] flex-col overflow-hidden">
      <div className="z-20 flex flex-shrink-0 items-center justify-between gap-3 border-b border-border/70 px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-36 rounded-xl" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[960px] border-collapse table-fixed">
          <thead>
            <tr>
              <th className="w-56 px-4 py-3">
                <Skeleton className="h-4 w-24" />
              </th>
              {weekDates.map((i) => (
                <th key={i} className="px-2 py-3">
                  <Skeleton className="mx-auto h-10 w-12 rounded-lg" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roleRows.map(({ role, staffCount }) => (
              <React.Fragment key={role}>
                <tr>
                  <td colSpan={8} className="px-4 py-2">
                    <Skeleton className="h-4 w-20" />
                  </td>
                </tr>
                {Array.from({ length: staffCount }).map((_, i) => (
                  <tr key={`${role}-${i}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                        <Skeleton className="h-4 flex-1 max-w-[120px]" />
                      </div>
                    </td>
                    {weekDates.map((j) => (
                      <td key={j} className="px-1.5 py-2">
                        <Skeleton className="h-11 w-full rounded-lg" />
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

export const StaffTimesheetView: React.FC<StaffTimesheetViewProps> = ({
  shifts,
  staffMembers,
  currentDate,
  setCurrentDate,
  onEditShift,
  onCreateShift,
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
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const shiftsByStaffByDate = useMemo(() => {
    const map: Record<string, Record<string, Shift[]>> = {};
    staffMembers.forEach((s) => {
      map[s.id] = {};
      weekDates.forEach((d) => {
        map[s.id][dateStr(d)] = [];
      });
    });
    shifts.forEach((shift) => {
      const staffIds = shift.staff_members?.length ? shift.staff_members : [shift.staffId];
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
    const order = [
      "MANAGER",
      "CHEF",
      "BARTENDER",
      "SERVER",
      "WAITER",
      "HOST",
      "RECEPTIONIST",
      "CASHIER",
      "KITCHEN_HELP",
      "DISHWASHER",
      "CLEANER",
      "SECURITY",
    ];
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
    <div className="flex max-h-[85vh] flex-col overflow-hidden">
      <div className="z-20 flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-gradient-to-b from-muted/40 to-transparent px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex items-center rounded-full border border-border/80 bg-background p-0.5 shadow-sm">
            <UIButton
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => navigateWeek("prev")}
              aria-label={t("schedule.prev_week", { defaultValue: "Previous week" })}
            >
              <ChevronLeft className="h-4 w-4" />
            </UIButton>
            <UIButton
              variant="ghost"
              className="h-8 rounded-full px-3 text-xs font-semibold"
              onClick={() => setCurrentDate(new Date())}
            >
              {t("schedule.today")}
            </UIButton>
            <UIButton
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => navigateWeek("next")}
              aria-label={t("schedule.next_week", { defaultValue: "Next week" })}
            >
              <ChevronRight className="h-4 w-4" />
            </UIButton>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("schedule.week_of", { defaultValue: "Week of" })}
            </p>
            <h2 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">
              {displayRange}
            </h2>
          </div>
        </div>
        {onCreateShift ? (
          <button
            type="button"
            onClick={onCreateShift}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>{t("schedule.create")}</span>
          </button>
        ) : null}
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[960px] table-fixed border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 w-56 border-b border-r border-border/70 bg-card px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("schedule.staff")}
              </th>
              {weekDates.map((d) => {
                const isToday = dateStr(d) === todayStr;
                return (
                  <th
                    key={dateStr(d)}
                    className={cn(
                      "border-b border-border/70 px-1.5 py-2.5 text-center last:pr-3",
                      isToday ? "bg-emerald-50/80 dark:bg-emerald-950/25" : "bg-card",
                    )}
                  >
                    <div
                      className={cn(
                        "mx-auto flex w-12 flex-col items-center rounded-xl py-1",
                        isToday && "bg-emerald-600 text-white shadow-sm dark:bg-emerald-500",
                      )}
                    >
                      <span
                        className={cn(
                          "text-[10px] font-semibold uppercase tracking-wide",
                          isToday ? "text-white/80" : "text-muted-foreground",
                        )}
                      >
                        {format(d, "EEE")}
                      </span>
                      <span className={cn("text-base font-bold leading-none", !isToday && "text-foreground")}>
                        {format(d, "d")}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {staffByRole.map(({ role, staff }) => (
              <React.Fragment key={role}>
                <tr>
                  <td
                    colSpan={8}
                    className="sticky left-0 bg-muted/60 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {prettyRole(role)}
                    <span className="ms-2 font-medium normal-case tracking-normal text-muted-foreground/80">
                      {staff.length}
                    </span>
                  </td>
                </tr>
                {staff.map((member) => {
                  const name =
                    `${member.first_name || ""} ${member.last_name || ""}`.trim() || "-";
                  const initials =
                    name !== "-"
                      ? name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()
                      : "-";
                  const color = getStaffColor(member.id);
                  return (
                    <tr key={member.id} className="group/row">
                      <td className="sticky left-0 z-10 border-b border-r border-border/50 bg-card px-4 py-2.5">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Avatar className="h-9 w-9 shrink-0 rounded-full shadow-sm ring-2 ring-background">
                            <AvatarFallback
                              className="text-[11px] font-bold"
                              style={{ backgroundColor: `${color}22`, color }}
                            >
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                            <p className="truncate text-[11px] text-muted-foreground">{prettyRole(member.role || role)}</p>
                          </div>
                        </div>
                      </td>
                      {weekDates.map((d) => {
                        const dayShifts = (shiftsByStaffByDate[member.id] || {})[dateStr(d)] || [];
                        const isToday = dateStr(d) === todayStr;
                        return (
                          <td
                            key={dateStr(d)}
                            className={cn(
                              "border-b border-border/50 px-1.5 py-1.5 align-top last:pr-3",
                              isToday && "bg-emerald-50/50 dark:bg-emerald-950/15",
                            )}
                          >
                            {dayShifts.length === 0 ? (
                              <div className="h-11 rounded-lg border border-transparent group-hover/row:border-dashed group-hover/row:border-border/70" />
                            ) : (
                              <div className="flex flex-col gap-1">
                                {dayShifts.map((shift) => {
                                  const label = timeRange(shift.start, shift.end);
                                  return (
                                    <button
                                      key={shift.id}
                                      type="button"
                                      onClick={() => onEditShift?.(shift)}
                                      disabled={!onEditShift}
                                      className={cn(
                                        "flex min-h-11 w-full flex-col items-start justify-center rounded-lg border px-2 py-1.5 text-left shadow-sm transition-transform hover:-translate-y-px hover:shadow-md disabled:cursor-default",
                                      )}
                                      style={{
                                        backgroundColor: `${color}18`,
                                        borderColor: `${color}55`,
                                        color,
                                      }}
                                      title={`${shift.title || "Shift"} ${label}`}
                                    >
                                      <span className="w-full truncate text-[11px] font-bold leading-tight">
                                        {label}
                                      </span>
                                      {shift.title && shift.title !== "Shift" ? (
                                        <span className="w-full truncate text-[10px] font-medium opacity-80">
                                          {shift.title}
                                        </span>
                                      ) : null}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
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
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <p className="text-sm font-medium">{t("schedule.no_staff_period")}</p>
            <p className="mt-1 text-xs">{t("schedule.add_staff_timesheet")}</p>
          </div>
        )}
      </div>
    </div>
  );
};
