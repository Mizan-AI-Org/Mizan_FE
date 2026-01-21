"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Calendar, Clock, User } from "lucide-react";
import { format, parseISO, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
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
}

export const StaffScheduleListView: React.FC<StaffScheduleListViewProps> = ({
    shifts,
    staffMembers,
    currentDate
}) => {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredShifts = useMemo(() => {
        return shifts.filter(shift => {
            const staff = staffMembers.find(s => s.id === shift.staffId);
            const staffName = `${staff?.user?.first_name || staff?.first_name || ""} ${staff?.user?.last_name || staff?.last_name || ""}`.toLowerCase();
            const shiftTitle = (shift.title || "").toLowerCase();
            const role = (staff?.role || "").toLowerCase();

            return staffName.includes(searchTerm.toLowerCase()) ||
                shiftTitle.includes(searchTerm.toLowerCase()) ||
                role.includes(searchTerm.toLowerCase());
        }).sort((a, b) => {
            const dateA = new Date(a.date + "T" + a.start);
            const dateB = new Date(b.date + "T" + b.start);
            return dateA.getTime() - dateB.getTime();
        });
    }, [shifts, staffMembers, searchTerm]);

    const groupedShifts = useMemo(() => {
        const groups: { [key: string]: Shift[] } = {};
        filteredShifts.forEach(shift => {
            if (!groups[shift.date]) {
                groups[shift.date] = [];
            }
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

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border shadow-sm sticky top-0 z-10">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search by staff name, role, or shift title..."
                        className="pl-10 h-11 border-gray-200 rounded-xl focus:ring-green-600/20 focus:border-green-600 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="text-sm font-medium text-gray-500 whitespace-nowrap">
                    {filteredShifts.length} shifts found
                </div>
            </div>

            {sortedDates.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <User className="h-12 w-12 mb-4 opacity-20" />
                        <p className="text-lg font-medium">No shifts found for this week</p>
                        <p className="text-sm">Try adjusting your search or select another week</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-8 pb-10">
                    {sortedDates.map(date => (
                        <div key={date} className="space-y-4">
                            <div className="flex items-center gap-3 sticky top-[108px] bg-gray-50/95 py-2 z-[5] backdrop-blur-sm">
                                <div className="h-10 w-10 rounded-xl bg-green-600 text-white flex flex-col items-center justify-center shadow-sm">
                                    <span className="text-[10px] font-bold uppercase leading-none">{format(parseISO(date), "EEE")}</span>
                                    <span className="text-lg font-bold leading-none">{format(parseISO(date), "d")}</span>
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="text-lg font-bold text-gray-900 leading-tight">
                                        {format(parseISO(date), "EEEE, MMMM do")}
                                    </h3>
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        {groupedShifts[date].length} {groupedShifts[date].length === 1 ? 'Shift' : 'Shifts'} scheduled
                                    </span>
                                </div>
                                <div className="h-px flex-1 bg-gray-200 ml-2" />
                            </div>

                            <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                                {groupedShifts[date].map(shift => {
                                    const staff = staffMembers.find(s => s.id === shift.staffId);
                                    const initials = `${(staff?.user?.first_name || staff?.first_name || "")[0] || ""}${(staff?.user?.last_name || staff?.last_name || "")[0] || ""}`;

                                    return (
                                        <Card key={shift.id} className="group hover:shadow-md transition-all duration-300 border-gray-100 overflow-hidden rounded-2xl">
                                            <CardContent className="p-0">
                                                <div className="flex items-stretch min-h-[100px]">
                                                    <div
                                                        className="w-1.5 flex-shrink-0"
                                                        style={{ backgroundColor: shift.color || "#6b7280" }}
                                                    />
                                                    <div className="flex-1 p-4 flex flex-col justify-between">
                                                        <div className="flex items-start justify-between gap-2 mb-2">
                                                            <div className="flex items-center gap-3">
                                                                <Avatar className="h-10 w-10 border-2 border-white shadow-sm ring-1 ring-gray-100">
                                                                    <AvatarFallback className="bg-orange-50 text-orange-700 text-sm font-bold">
                                                                        {initials}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold text-gray-900 text-base leading-tight">
                                                                        {staff?.user?.first_name || staff?.first_name || "Unknown"} {staff?.user?.last_name || staff?.last_name || ""}
                                                                    </span>
                                                                    {staff?.role && (
                                                                        <span className="text-[10px] font-bold text-green-700 uppercase tracking-widest bg-green-50 px-1.5 py-0.5 rounded-md mt-0.5 inline-block w-fit">
                                                                            {staff.role}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2 mt-auto">
                                                            <div className="flex items-center text-sm font-semibold text-gray-700">
                                                                <Clock className="h-3.5 w-3.5 mr-2 text-gray-400" />
                                                                <span>{formatTime(shift.start)}</span>
                                                                <span className="mx-2 text-gray-300">→</span>
                                                                <span>{formatTime(shift.end)}</span>
                                                            </div>

                                                            {shift.title && (
                                                                <div className="flex items-start text-sm text-gray-600">
                                                                    <div className="h-1.5 w-1.5 rounded-full bg-gray-300 mt-1.5 mr-2.5 flex-shrink-0" />
                                                                    <p className="line-clamp-2 leading-tight py-0.5">{shift.title}</p>
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
