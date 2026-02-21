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

    const groupedShifts = useMemo(() => {
        const groups: { [key: string]: (Shift & { _displayStaffId?: string })[] } = {};
        filteredShifts.forEach(shift => {
            const staffIds = (shift.staff_members && shift.staff_members.length) ? shift.staff_members : [shift.staffId];
            staffIds.forEach((staffId) => {
                if (!staffId) return;
                if (!groups[shift.date]) groups[shift.date] = [];
                groups[shift.date].push({ ...shift, _displayStaffId: staffId });
            });
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
                <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border shadow-sm sticky top-0 z-10">
                    <Skeleton className="h-11 flex-1 rounded-xl" />
                    <Skeleton className="h-5 w-24" />
                </div>
                <CardGridSkeleton count={6} columns="grid-cols-1 md:grid-cols-2 lg:grid-cols-3" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border shadow-sm sticky top-0 z-10">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder={t("schedule.search_staff_role_title")}
                        className="pl-10 h-11 border-gray-200 rounded-xl focus:ring-green-600/20 focus:border-green-600 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="text-sm font-medium text-gray-500 whitespace-nowrap">
                    {filteredShifts.length} {t("schedule.shifts_found")}
                </div>
            </div>

            {sortedDates.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <User className="h-12 w-12 mb-4 opacity-20" />
                        <p className="text-lg font-medium">{t("schedule.no_shifts_week")}</p>
                        <p className="text-sm">{t("schedule.try_adjust_search_week")}</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6 pb-10">
                    {sortedDates.map(date => (
                        <div key={date} className="space-y-3">
                            <div className="flex items-center gap-2.5 sticky top-[108px] bg-gray-50/95 py-1.5 z-[5] backdrop-blur-sm">
                                <div className="h-9 w-9 rounded-lg bg-green-600 text-white flex flex-col items-center justify-center shadow-sm">
                                    <span className="text-[9px] font-bold uppercase leading-none">{format(parseISO(date), "EEE")}</span>
                                    <span className="text-base font-bold leading-none">{format(parseISO(date), "d")}</span>
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="text-base font-bold text-gray-900 leading-tight">
                                        {format(parseISO(date), "EEEE, MMMM do")}
                                    </h3>
                                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                                        {groupedShifts[date].length} {groupedShifts[date].length === 1 ? 'Shift' : 'Shifts'} scheduled
                                    </span>
                                </div>
                                <div className="h-px flex-1 bg-gray-200 ml-2" />
                            </div>

                            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                                {groupedShifts[date].map((shift, idx) => {
                                    const displayStaffId = (shift as Shift & { _displayStaffId?: string })._displayStaffId ?? shift.staffId;
                                    const staff = staffMembers.find(s => s.id === displayStaffId);
                                    const initials = `${(staff?.user?.first_name || staff?.first_name || "")[0] || ""}${(staff?.user?.last_name || staff?.last_name || "")[0] || ""}`;

                                    return (
                                        <Card key={`${shift.id}-${displayStaffId}-${idx}`} className="group hover:shadow-md transition-all duration-300 border-gray-100 overflow-hidden rounded-xl">
                                            <CardContent className="p-0">
                                                <div className="flex items-stretch min-h-0">
                                                    <div
                                                        className="w-1 flex-shrink-0 rounded-l-xl"
                                                        style={{ backgroundColor: shift.color || "#6b7280" }}
                                                    />
                                                    <div className="flex-1 p-2.5 flex flex-col justify-center min-h-[72px]">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Avatar className="h-7 w-7 border border-white shadow-sm ring-1 ring-gray-100 flex-shrink-0">
                                                                <AvatarFallback className="bg-orange-50 text-orange-700 text-xs font-bold">
                                                                    {initials}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex flex-col min-w-0 flex-1">
                                                                <span className="font-semibold text-gray-900 text-sm leading-tight truncate">
                                                                    {staff?.user?.first_name || staff?.first_name || "Unknown"} {staff?.user?.last_name || staff?.last_name || ""}
                                                                </span>
                                                                {staff?.role && (
                                                                    <span className="text-[9px] font-bold text-green-700 uppercase tracking-wide bg-green-50 px-1 py-0 rounded mt-0.5 inline-block w-fit">
                                                                        {staff.role}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="space-y-0.5 mt-1">
                                                            <div className="flex items-center text-xs font-medium text-gray-600">
                                                                <Clock className="h-3 w-3 mr-1.5 text-gray-400 flex-shrink-0" />
                                                                <span>{formatTime(shift.start)}</span>
                                                                <span className="mx-1 text-gray-300">→</span>
                                                                <span>{formatTime(shift.end)}</span>
                                                            </div>

                                                            {shift.title && (
                                                                <div className="flex items-start text-xs text-gray-500">
                                                                    <div className="h-1 w-1 rounded-full bg-gray-300 mt-1.5 mr-1.5 flex-shrink-0" />
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
