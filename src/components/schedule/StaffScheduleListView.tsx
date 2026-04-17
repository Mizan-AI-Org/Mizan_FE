"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CardGridSkeleton } from "@/components/skeletons";
import { Search, MapPin, Calendar, Clock, User } from "lucide-react";
import { format, parseISO, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";
import type { Shift } from "@/types/schedule";

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

interface StaffScheduleListViewProps {
    shifts: Shift[];
    staffMembers: StaffMember[];
    currentDate: Date;
    isLoading?: boolean;
}

export const StaffScheduleListView: React.FC<StaffScheduleListViewProps> = ({
    shifts,
    staffMembers,
    currentDate,
    isLoading = false,
}) => {
    const { t } = useLanguage();
    const [searchTerm, setSearchTerm] = useState("");

    const filteredShifts = useMemo(() => {
        return shifts.filter(shift => {
            const staffIds = (shift.staff_members && shift.staff_members.length) ? shift.staff_members : [shift.staffId];
            const anyStaffMatches = staffIds.some(staffId => {
                const staff = staffMembers.find(s => s.id === staffId);
                const staffName = `${staff?.user?.first_name || staff?.first_name || ""} ${staff?.user?.last_name || staff?.last_name || ""}`.toLowerCase();
                const role = (staff?.role || "").toLowerCase();
                return staffName.includes(searchTerm.toLowerCase()) || role.includes(searchTerm.toLowerCase());
            });
            const shiftTitle = (shift.title || "").toLowerCase();
            return anyStaffMatches || shiftTitle.includes(searchTerm.toLowerCase());
        }).sort((a, b) => {
            const dateA = new Date(a.date + "T" + a.start);
            const dateB = new Date(b.date + "T" + b.start);
            return dateA.getTime() - dateB.getTime();
        });
    }, [shifts, staffMembers, searchTerm]);

    // One card per shift, not per member. Multi-staff (team) shifts render once
    // with every attendee as an avatar chip — matches the "Assign Staff (N selected)"
    // modal UX. Single-staff legacy shifts still show a primary avatar + name.
    const groupedShifts = useMemo(() => {
        const groups: { [key: string]: Shift[] } = {};
        filteredShifts.forEach(shift => {
            if (!groups[shift.date]) groups[shift.date] = [];
            groups[shift.date].push(shift);
        });
        return groups;
    }, [filteredShifts]);

    const sortedDates = useMemo(() => {
        return Object.keys(groupedShifts).sort();
    }, [groupedShifts]);

    const formatTime = (timeStr: string) => {
        if (!timeStr) return "";
        try {
            const [hours, minutes] = timeStr.split(":");
            const h = parseInt(hours);
            const ampm = h >= 12 ? "PM" : "AM";
            const h12 = h % 12 || 12;
            return `${h12}:${minutes} ${ampm}`;
        } catch (e) {
            return timeStr;
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm sticky top-0 z-10">
                    <Skeleton className="h-11 flex-1 rounded-xl" />
                    <Skeleton className="h-5 w-24" />
                </div>
                <CardGridSkeleton count={6} columns="grid-cols-1 md:grid-cols-2 lg:grid-cols-3" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm sticky top-0 z-10">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <Input
                        placeholder={t("schedule.search_staff_role_title")}
                        className="pl-10 h-11 border-gray-200 dark:border-slate-700 rounded-xl focus:ring-green-600/20 focus:border-green-600 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {filteredShifts.length} {t("schedule.shifts_found")}
                </div>
            </div>

            {sortedDates.length === 0 ? (
                <Card className="border-dashed dark:border-slate-700">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
                        <User className="h-12 w-12 mb-4 opacity-20" />
                        <p className="text-lg font-medium">{t("schedule.no_shifts_week")}</p>
                        <p className="text-sm">{t("schedule.try_adjust_search_week")}</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6 pb-10">
                    {sortedDates.map(date => (
                        <div key={date} className="space-y-3">
                            <div className="flex items-center gap-2.5 sticky top-[108px] bg-gray-50/95 dark:bg-slate-900/95 py-1.5 z-[5] backdrop-blur-sm">
                                <div className="h-9 w-9 rounded-lg bg-green-600 text-white flex flex-col items-center justify-center shadow-sm">
                                    <span className="text-[9px] font-bold uppercase leading-none">{format(parseISO(date), "EEE")}</span>
                                    <span className="text-base font-bold leading-none">{format(parseISO(date), "d")}</span>
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 leading-tight">
                                        {format(parseISO(date), "EEEE, MMMM do")}
                                    </h3>
                                    <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        {groupedShifts[date].length === 1
                                            ? t("schedule.shifts_scheduled_one")
                                            : t("schedule.shifts_scheduled_many", { count: groupedShifts[date].length })}
                                    </span>
                                </div>
                                <div className="h-px flex-1 bg-gray-200 dark:bg-slate-700 ml-2" />
                            </div>

                            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                                {groupedShifts[date].map((shift, idx) => {
                                    // Collect every staff on this shift: M2M first, else the legacy single FK.
                                    const memberIds: string[] = (shift.staff_members && shift.staff_members.length)
                                        ? shift.staff_members
                                        : (shift.staffId ? [shift.staffId] : []);
                                    const members = memberIds
                                        .map(id => ({ id, staff: staffMembers.find(s => s.id === id) }))
                                        .filter(m => !!m.id);
                                    const isTeam = members.length > 1;
                                    const displayMember = members[0];
                                    const displayStaff = displayMember?.staff;
                                    const displayInitials = displayStaff
                                        ? `${(displayStaff.user?.first_name || displayStaff.first_name || "")[0] || ""}${(displayStaff.user?.last_name || displayStaff.last_name || "")[0] || ""}`
                                        : "?";
                                    const roleLabel = (shift as Shift & { role?: string }).role || displayStaff?.role;

                                    return (
                                        <Card key={`${shift.id}-${idx}`} className="group hover:shadow-md transition-all duration-300 border-gray-100 dark:border-slate-700 overflow-hidden rounded-xl">
                                            <CardContent className="p-0">
                                                <div className="flex items-stretch min-h-0">
                                                    <div
                                                        className="w-1 flex-shrink-0 rounded-l-xl"
                                                        style={{ backgroundColor: shift.color || "#6b7280" }}
                                                    />
                                                    <div className="flex-1 p-2.5 flex flex-col justify-center min-h-[72px]">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            {isTeam ? (
                                                                <div className="flex items-center -space-x-1.5 flex-shrink-0">
                                                                    {members.slice(0, 4).map(({ id, staff: sm }) => {
                                                                        const i = `${(sm?.user?.first_name || sm?.first_name || "")[0] || ""}${(sm?.user?.last_name || sm?.last_name || "")[0] || ""}`;
                                                                        return (
                                                                            <Avatar key={id} className="h-7 w-7 border-2 border-white dark:border-slate-800 shadow-sm">
                                                                                <AvatarFallback className="bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-[10px] font-bold">
                                                                                    {i || "?"}
                                                                                </AvatarFallback>
                                                                            </Avatar>
                                                                        );
                                                                    })}
                                                                    {members.length > 4 && (
                                                                        <Avatar className="h-7 w-7 border-2 border-white dark:border-slate-800 shadow-sm">
                                                                            <AvatarFallback className="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 text-[10px] font-bold">
                                                                                +{members.length - 4}
                                                                            </AvatarFallback>
                                                                        </Avatar>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <Avatar className="h-7 w-7 border border-white dark:border-slate-700 shadow-sm ring-1 ring-gray-100 dark:ring-slate-700 flex-shrink-0">
                                                                    <AvatarFallback className="bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs font-bold">
                                                                        {displayInitials}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                            )}
                                                            <div className="flex flex-col min-w-0 flex-1">
                                                                <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight truncate">
                                                                    {isTeam
                                                                        ? t("schedule.team_shift_n_staff", { count: members.length })
                                                                            || `Team shift — ${members.length} staff`
                                                                        : `${displayStaff?.user?.first_name || displayStaff?.first_name || "Unknown"} ${displayStaff?.user?.last_name || displayStaff?.last_name || ""}`.trim()}
                                                                </span>
                                                                {roleLabel && (
                                                                    <span className="text-[9px] font-bold text-green-700 dark:text-green-400 uppercase tracking-wide bg-green-50 dark:bg-green-900/30 px-1 py-0 rounded mt-0.5 inline-block w-fit">
                                                                        {roleLabel}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="space-y-0.5 mt-1">
                                                            <div className="flex items-center text-xs font-medium text-gray-600 dark:text-gray-400">
                                                                <Clock className="h-3 w-3 mr-1.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                                                <span>{formatTime(shift.start)}</span>
                                                                <span className="mx-1 text-gray-300 dark:text-gray-600">→</span>
                                                                <span>{formatTime(shift.end)}</span>
                                                            </div>

                                                            {shift.title && (
                                                                <div className="flex items-start text-xs text-gray-500 dark:text-gray-400">
                                                                    <div className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600 mt-1.5 mr-1.5 flex-shrink-0" />
                                                                    <p className="line-clamp-1 leading-tight">{shift.title}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
