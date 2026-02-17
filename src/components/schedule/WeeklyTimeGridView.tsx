"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import { Button as UIButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { AuthContextType } from "@/contexts/AuthContext.types";
import type { Shift, Task, TaskFrequency } from "@/types/schedule";
import { useCalendar } from "@/hooks/useCalendar";
import { useLanguage } from "@/hooks/use-language";
import { ShiftCard } from "@/components/calendar/ShiftCard";
import { format, startOfWeek, endOfWeek, addDays, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { API_BASE } from "@/lib/api";
import { cn } from "@/lib/utils";
import ShiftModal from "@/components/ShiftModal";
import { Skeleton } from "@/components/ui/skeleton";

interface StaffMember {
    id: string;
    user?: {
        id: string;
        first_name: string;
        last_name: string;
    };
    first_name?: string;
    last_name?: string;
    email?: string;
    role?: string;
}

interface BackendShift {
    id: string;
    staff: string;
    shift_date: string;
    start_time: string;
    end_time: string;
    notes: string;
    color?: string;
    staff_name?: string;
    staff_email?: string;
}

interface WeeklyScheduleData {
    id: string;
    week_start: string;
    week_end: string;
    is_published: boolean;
    assigned_shifts: BackendShift[];
}

interface ApiAssignedShift {
    id: string | number;
    staff:
    | string
    | {
        id: string;
        first_name?: string;
        last_name?: string;
        email?: string;
    };
    shift_date: string | Date;
    start_time: string;
    end_time: string;
    notes?: string | null;
    color?: string;
}

const formatLocalDateStr = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
};

interface WeeklyTimeGridViewProps {
    shifts: Shift[];
    staffMembers: StaffMember[];
    currentDate: Date;
    setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
    onEditShift: (shift: Shift) => void;
    isLoading?: boolean;
}

function WeeklyTimeGridSkeleton() {
    return (
        <div className="bg-white rounded-lg border shadow-sm flex flex-col overflow-hidden max-h-[85vh]">
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
            <div className="flex-1 overflow-auto p-4">
                <div className="grid grid-cols-8 gap-px bg-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 p-2 min-w-[60px]" />
                    {Array.from({ length: 7 }).map((_, i) => (
                        <div key={i} className="bg-gray-50 p-2">
                            <Skeleton className="h-4 w-10 mx-auto" />
                        </div>
                    ))}
                    {Array.from({ length: 12 }).map((_, row) => (
                        <React.Fragment key={row}>
                            <div className="bg-gray-50 p-1">
                                <Skeleton className="h-3 w-8" />
                            </div>
                            {Array.from({ length: 7 }).map((_, col) => (
                                <div key={`${row}-${col}`} className="bg-white p-1 min-h-[32px]">
                                    <Skeleton className="h-4 w-full rounded" />
                                </div>
                            ))}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
}

export const WeeklyTimeGridView: React.FC<WeeklyTimeGridViewProps> = ({
    shifts,
    staffMembers,
    currentDate,
    setCurrentDate,
    onEditShift,
    isLoading = false,
}) => {
    const { hasRole } = useAuth() as AuthContextType;
    const { t } = useLanguage();
    const canEditShifts = hasRole?.([ 'SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OWNER' ]) ?? false;
    const [view, setView] = useState<"week" | "day" | "month">("week");
    const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
    const [hoveredShiftId, setHoveredShiftId] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<{ day: number; hour: number } | null>(null);
    const [dragEnd, setDragEnd] = useState<{ day: number; hour: number } | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
    const [showShiftDetails, setShowShiftDetails] = useState(false);
    const [compactView, setCompactView] = useState(false);

    const getWeekStart = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    };

    const toYMD = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    // Enhanced calendar state and functionality
    const {
        calendarShifts,
        state: { config }
    } = useCalendar(shifts, currentDate, {
        initialTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        enableResponsive: true,
        onShiftClick: (shift) => {
            if (canEditShifts) {
                onEditShift(shift);
            } else {
                toast.error(t("errors.no_permission_edit_shifts"));
            }
        },
        onShiftHover: (shift) => {
            setHoveredShiftId(shift?.id || null);
        }
    });

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    const handlePasteShift = (targetDay: number) => {
        // Copied shift logic moved to parent or simplified
    };



    const handleCreateShift = (dayIndex: number, hour: number) => {
        const monday = getWeekStart(currentDate);
        const targetDate = new Date(monday);
        targetDate.setDate(monday.getDate() + dayIndex);

        onEditShift({
            id: `temp-${Date.now()}`,
            title: "",
            start: `${String(hour).padStart(2, '0')}:00`,
            end: `${String(hour + 1).padStart(2, '0')}:00`,
            date: toYMD(targetDate),
            day: dayIndex,
            staffId: staffMembers[0]?.id || "",
            color: "#6b7280",
            tasks: []
        });
    };

    const handleGridCellClick = (dayIndex: number, hour: number) => {
        const dayShifts = calendarShifts[dayIndex] || [];
        const dayDate = weekDates[dayIndex] || new Date();
        const cellStart = new Date(dayDate);
        cellStart.setHours(hour, 0, 0, 0);
        const cellEnd = new Date(dayDate);
        cellEnd.setHours(hour + 1, 0, 0, 0);

        const existing = dayShifts.find((s) => {
            const sStart = s.displayStart instanceof Date ? s.displayStart : new Date(s.displayStart);
            const sEnd = s.displayEnd instanceof Date ? s.displayEnd : new Date(s.displayEnd);
            return sStart < cellEnd && sEnd > cellStart;
        });

        if (existing) {
            onEditShift(existing as any);
        } else {
            handleCreateShift(dayIndex, hour);
        }
    };

    const handleMouseDown = (dayIndex: number, hour: number) => {
        if (!canEditShifts) return;

        // Don't start drag if clicking an existing shift
        const dayShifts = calendarShifts[dayIndex] || [];
        const dayDate = weekDates[dayIndex] || new Date();
        const cellStart = new Date(dayDate);
        cellStart.setHours(hour, 0, 0, 0);
        const cellEnd = new Date(dayDate);
        cellEnd.setHours(hour + 1, 0, 0, 0);

        const existing = dayShifts.find((s) => {
            const sStart = s.displayStart instanceof Date ? s.displayStart : new Date(s.displayStart);
            const sEnd = s.displayEnd instanceof Date ? s.displayEnd : new Date(s.displayEnd);
            return sStart < cellEnd && sEnd > cellStart;
        });

        if (existing) return;

        setIsDragging(true);
        setDragStart({ day: dayIndex, hour });
        setDragEnd({ day: dayIndex, hour });
    };

    const handleMouseEnter = (dayIndex: number, hour: number) => {
        if (!isDragging || !dragStart) return;
        // Only allow dragging within the same day for simplicity, or we can allow multiple days if the shift modal handles it
        // For now, let's stick to the same day as per a "shift" definition.
        if (dayIndex === dragStart.day) {
            setDragEnd({ day: dayIndex, hour });
        }
    };

    const handleMouseUp = () => {
        if (!isDragging || !dragStart || !dragEnd) {
            setIsDragging(false);
            setDragStart(null);
            setDragEnd(null);
            return;
        }

        const startHour = Math.min(dragStart.hour, dragEnd.hour);
        const endHour = Math.max(dragStart.hour, dragEnd.hour) + 1;

        const monday = getWeekStart(currentDate);
        const base = new Date(monday);
        base.setDate(monday.getDate() + dragStart.day);

        onEditShift({
            id: `temp-${Date.now()}`,
            title: "",
            start: `${String(startHour).padStart(2, '0')}:00`,
            end: `${String(endHour).padStart(2, '0')}:00`,
            date: toYMD(base),
            day: dragStart.day,
            staffId: staffMembers[0]?.id || "",
            color: "#6b7280",
            tasks: [],
        });

        setIsDragging(false);
        setDragStart(null);
        setDragEnd(null);
    };

    // Global mouse up to handle releasing outside the grid
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (isDragging) {
                handleMouseUp();
            }
        };
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, [isDragging, dragStart, dragEnd]);

    const handleEditShift = (shift: Shift) => {
        onEditShift(shift);
    };

    const navigateDate = (direction: "prev" | "next") => {
        setCurrentDate((prev) => {
            const newDate = new Date(prev);
            if (view === "week") newDate.setDate(prev.getDate() + (direction === "next" ? 7 : -7));
            else if (view === "day") newDate.setDate(prev.getDate() + (direction === "next" ? 1 : -1));
            else newDate.setMonth(prev.getMonth() + (direction === "next" ? 1 : -1));
            return newDate;
        });
    };

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
        if (view === "day") {
            return format(currentDate, "EEEE, MMM d, yyyy");
        }
        if (view === "week") {
            const firstDay = weekDates[0];
            const lastDay = weekDates[6];
            return `${format(firstDay, "MMM d")} - ${format(lastDay, "MMM d, yyyy")}`;
        }
        return format(currentDate, "MMMM yyyy");
    };

    // For day view: single column for currentDate (day index within the week)
    const dayColumnIndex = useMemo(() => {
        const start = getWeekStart(currentDate);
        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            if (format(d, "yyyy-MM-dd") === format(currentDate, "yyyy-MM-dd")) return i;
        }
        return 0;
    }, [currentDate]);

    const displayDates = view === "day" ? [weekDates[dayColumnIndex]] : weekDates;
    const displayDays = view === "day" ? [days[dayColumnIndex]] : days;
    const gridCols = view === "day" ? 1 : 7;

    // Month view: build calendar cells for the current month
    const monthDays = useMemo(() => {
        if (view !== "month") return [];
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        const daysInMonth = eachDayOfInterval({ start, end });
        const startWeekday = (start.getDay() + 6) % 7; // Monday = 0
        const leadingBlanks = Array(startWeekday).fill(null);
        return [...leadingBlanks, ...daysInMonth];
    }, [view, currentDate]);

    const shiftsByDate = useMemo(() => {
        const map: Record<string, Shift[]> = {};
        shifts.forEach((s) => {
            if (!map[s.date]) map[s.date] = [];
            map[s.date].push(s);
        });
        return map;
    }, [shifts]);

    if (isLoading) {
        return <WeeklyTimeGridSkeleton />;
    }

    if (view === "month") {
        const handleMonthDayClick = (d: Date | null) => {
            if (d) setCurrentDate(d);
        };
        return (
            <div className="bg-white rounded-lg border shadow-sm flex flex-col overflow-hidden max-h-[85vh]">
                <div className="flex items-center justify-between p-4 border-b flex-shrink-0 bg-white z-20 shadow-sm">
                    <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-xl">
                            <UIButton variant="ghost" className="h-8 w-8 p-0 rounded-lg hover:bg-white hover:shadow-sm" onClick={() => navigateDate("prev")}><ChevronLeft className="w-4 h-4" /></UIButton>
                            <UIButton variant="ghost" className="text-sm font-bold px-3 py-1 rounded-lg hover:bg-white hover:shadow-sm" onClick={() => setCurrentDate(new Date())}>{t("schedule.today")}</UIButton>
                            <UIButton variant="ghost" className="h-8 w-8 p-0 rounded-lg hover:bg-white hover:shadow-sm" onClick={() => navigateDate("next")}><ChevronRight className="w-4 h-4" /></UIButton>
                        </div>
                        <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">{getDateDisplay()}</h2>
                    </div>
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <UIButton variant="ghost" className={cn("text-xs font-bold px-4 py-1.5 rounded-lg transition-all", view === "day" ? "bg-white shadow-sm text-green-700" : "text-gray-500 hover:text-gray-700")} onClick={() => setView("day")}>{t("schedule.day")}</UIButton>
                        <UIButton variant="ghost" className={cn("text-xs font-bold px-4 py-1.5 rounded-lg transition-all", view === "week" ? "bg-white shadow-sm text-green-700" : "text-gray-500 hover:text-gray-700")} onClick={() => setView("week")}>{t("schedule.week")}</UIButton>
                        <UIButton variant="ghost" className={cn("text-xs font-bold px-4 py-1.5 rounded-lg transition-all", view === "month" ? "bg-white shadow-sm text-green-700" : "text-gray-500 hover:text-gray-700")} onClick={() => setView("month")}>{t("schedule.month")}</UIButton>
                    </div>
                </div>
                <div className="flex-1 overflow-auto p-4">
                    <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                            <div key={day} className="bg-gray-50 py-2 text-center text-xs font-bold text-gray-500 uppercase">{day}</div>
                        ))}
                        {monthDays.map((d, i) => {
                            if (!d) {
                                return <div key={`empty-${i}`} className="bg-gray-50/50 min-h-[80px]" />;
                            }
                            const dateStr = format(d, "yyyy-MM-dd");
                            const dayShifts = shiftsByDate[dateStr] || [];
                            const isToday = dateStr === format(new Date(), "yyyy-MM-dd");
                            return (
                                <div
                                    key={dateStr}
                                    onClick={() => handleMonthDayClick(d)}
                                    className={cn(
                                        "min-h-[80px] bg-white p-2 cursor-pointer hover:bg-green-50/50 transition-colors",
                                        isToday && "bg-green-50 ring-1 ring-green-500/30"
                                    )}
                                >
                                    <span className={cn("text-sm font-bold", isToday ? "text-green-700" : "text-gray-700")}>{format(d, "d")}</span>
                                    {dayShifts.length > 0 && (
                                        <div className="mt-1 space-y-0.5">
                                            {dayShifts.slice(0, 3).map((s) => {
                                                const staff = staffMembers.find((m) => m.id === s.staffId);
                                                const name = staff ? `${staff.first_name || ""} ${staff.last_name || ""}`.trim() || "—" : "—";
                                                const timeStr = `${(s.start || "").slice(0, 5)}-${(s.end || "").slice(0, 5)}`;
                                                return (
                                                    <div key={s.id} className="text-[10px] truncate rounded px-1 py-0.5 bg-gray-100 text-gray-700" title={`${name} ${timeStr}`}>
                                                        {timeStr}
                                                    </div>
                                                );
                                            })}
                                            {dayShifts.length > 3 && <div className="text-[10px] text-gray-400">+{dayShifts.length - 3}</div>}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border shadow-sm flex flex-col overflow-hidden max-h-[85vh]">
            <div className="flex items-center justify-between p-4 border-b flex-shrink-0 bg-white z-20 shadow-sm">
                <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-xl">
                        <UIButton variant="ghost" className="h-8 w-8 p-0 rounded-lg hover:bg-white hover:shadow-sm" onClick={() => navigateDate("prev")}><ChevronLeft className="w-4 h-4" /></UIButton>
                        <UIButton variant="ghost" className="text-sm font-bold px-3 py-1 rounded-lg hover:bg-white hover:shadow-sm" onClick={() => setCurrentDate(new Date())}>{t("schedule.today")}</UIButton>
                        <UIButton variant="ghost" className="h-8 w-8 p-0 rounded-lg hover:bg-white hover:shadow-sm" onClick={() => navigateDate("next")}><ChevronRight className="w-4 h-4" /></UIButton>
                    </div>
                    <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">{getDateDisplay()}</h2>
                </div>
                <div className="flex items-center space-x-3">
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <UIButton
                            variant="ghost"
                            className={cn("text-xs font-bold px-4 py-1.5 rounded-lg transition-all", view === "day" ? "bg-white shadow-sm text-green-700" : "text-gray-500 hover:text-gray-700")}
                            onClick={() => setView("day")}
                        >
                            {t("schedule.day")}
                        </UIButton>
                        <UIButton
                            variant="ghost"
                            className={cn("text-xs font-bold px-4 py-1.5 rounded-lg transition-all", view === "week" ? "bg-white shadow-sm text-green-700" : "text-gray-500 hover:text-gray-700")}
                            onClick={() => setView("week")}
                        >
                            {t("schedule.week")}
                        </UIButton>
                        <UIButton
                            variant="ghost"
                            className={cn("text-xs font-bold px-4 py-1.5 rounded-lg transition-all", view === "month" ? "bg-white shadow-sm text-green-700" : "text-gray-500 hover:text-gray-700")}
                            onClick={() => setView("month")}
                        >
                            {t("schedule.month")}
                        </UIButton>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto relative bg-white">
                <div className="flex min-w-full">
                    <div className="w-20 flex-shrink-0 bg-gray-50 border-r border-gray-100 sticky left-0 z-30">
                        <div className="h-14 border-b border-gray-100 flex items-center justify-center">
                            <Clock className="w-4 h-4 text-gray-400" />
                        </div>
                        {hours.map((hour) => {
                            const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                            const ampm = hour < 12 ? "AM" : "PM";
                            return (
                                <div
                                    key={hour}
                                    className="border-b border-gray-100 text-[11px] text-gray-400 p-3 font-bold flex flex-col items-end justify-start"
                                    style={{ height: config.hourHeight }}
                                >
                                    <span>{h}:00</span>
                                    <span className="text-[9px] opacity-70 tracking-tighter">{ampm}</span>
                                </div>
                            );
                        })}
                    </div>
                    <div className={cn("flex-1 grid min-w-[800px]", view === "day" ? "grid-cols-1 min-w-[200px]" : "grid-cols-7")}>
                        {displayDays.map((day, idx) => {
                            const dayIndex = view === "day" ? dayColumnIndex : idx;
                            const date = displayDates[idx];
                            const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

                            return (
                                <div key={`${day}-${dayIndex}`} className={cn("border-r border-gray-100 group relative", isToday && "bg-green-50/20")}>
                                    <div className={cn(
                                        "h-14 border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center",
                                        isToday && "bg-green-50/80"
                                    )}>
                                        <span className={cn("text-[10px] font-bold uppercase tracking-widest", isToday ? "text-green-700" : "text-gray-400")}>{day}</span>
                                        <span className={cn(
                                            "text-lg font-black mt-0.5 h-8 w-8 flex items-center justify-center rounded-full leading-none",
                                            isToday ? "bg-green-600 text-white shadow-sm" : "text-gray-900"
                                        )}>
                                            {format(date, "d")}
                                        </span>
                                    </div>
                                    <div className="relative">
                                        {hours.map((hour) => (
                                            <div
                                                key={hour}
                                                onMouseDown={() => handleMouseDown(dayIndex, hour)}
                                                onMouseEnter={() => handleMouseEnter(dayIndex, hour)}
                                                onClick={() => !isDragging && handleGridCellClick(dayIndex, hour)}
                                                className={cn(
                                                    "border-b border-gray-100 transition-colors cursor-crosshair",
                                                    isDragging && dragStart?.day === dayIndex && hour >= Math.min(dragStart.hour, dragEnd?.hour || 0) && hour <= Math.max(dragStart.hour, dragEnd?.hour || 0)
                                                        ? "bg-green-100/50"
                                                        : "hover:bg-gray-50/50"
                                                )}
                                                style={{ height: config.hourHeight }}
                                            >
                                                {/* Grid slot */}
                                            </div>
                                        ))}

                                        {/* Render shifts for this day */}
                                        {(calendarShifts[dayIndex] || []).map((shift) => (
                                            <ShiftCard
                                                key={shift.id}
                                                shift={shift}
                                                isSelected={selectedShift?.id === shift.id}
                                                isHovered={hoveredShiftId === shift.id}
                                                onClick={() => onEditShift(shift as any)}
                                                onMouseEnter={(e) => {
                                                    setHoveredShiftId(shift.id);
                                                    setTooltipPosition({ x: e.clientX, y: e.clientY });
                                                }}
                                                onMouseLeave={() => setHoveredShiftId(null)}
                                                showDetails={showShiftDetails}
                                                compact={compactView}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>


        </div>
    );
};
