import { Loader2, Plus, X, Search, Check, Download, FileSpreadsheet, FileText } from "lucide-react";
import { WeeklyTimeGridView } from "./WeeklyTimeGridView";
import { StaffScheduleListView } from "./StaffScheduleListView";
import { StaffTimesheetView } from "./StaffTimesheetView";
import ShiftModal from "@/components/ShiftModal";
import type { Shift, StaffMember, WeeklyScheduleData, BackendShift, TaskPriority } from "@/types/schedule";
import { useLanguage } from "@/hooks/use-language";
import { startOfWeek, endOfWeek, format, addDays, parseISO, addWeeks, addMonths, isBefore, isEqual } from "date-fns";
import { API_BASE } from "@/lib/api";
import { toast } from "sonner";
import React, { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AuthContextType } from "@/contexts/AuthContext.types";
import { getStaffColor } from "@/lib/utils";
import { exportTimesheetToPDF, exportTimesheetToExcel } from "@/utils/timesheetExport";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * EnhancedScheduleView serves as the main scheduling hub.
 * It now prioritizes the 24-hour weekly grid view for optimized staff allocation.
 */
const EnhancedScheduleView: React.FC = () => {
  const { hasRole } = useAuth() as AuthContextType;
  const { t } = useLanguage();
  const canEditShifts = hasRole?.([ 'SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OWNER' ]) ?? false;

  const [currentView, setCurrentView] = useState<"week" | "timesheet" | "list">("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [isExporting, setIsExporting] = useState(false);

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
      const staffArr = (json?.results ?? json) as Record<string, unknown>[];
      return staffArr.map((s: Record<string, unknown>) => {
        const id = String(s.id ?? (s.user as Record<string, unknown>)?.id ?? '');
        const firstName = String(s.first_name ?? '');
        const lastName = String(s.last_name ?? '');
        return {
          id,
          user: { id, first_name: firstName, last_name: lastName },
          first_name: firstName,
          last_name: lastName,
          role: s.role as string | undefined,
        } satisfies StaffMember;
      });
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
    },
    // Light polling so schedules generated by Miya (chat widget) show up on the calendar
    // without requiring a manual refresh/navigation.
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
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

    return scheduleData.assigned_shifts.map((shift: BackendShift) => {
      const members = shift.staff_members?.length ? shift.staff_members : (shift.staff ? [shift.staff] : []);
      const firstStaffId = members[0] || shift.staff;
      return {
      id: shift.id,
      title: (shift.title ?? shift.notes) || "Shift",
      start: toHHmm(shift.start_time),
      end: toHHmm(shift.end_time),
      date: shift.shift_date,
      type: "confirmed" as const,
      day: new Date(shift.shift_date).getDay() === 0 ? 6 : new Date(shift.shift_date).getDay() - 1,
      staffId: firstStaffId ?? shift.staff,
      staff_members: members,
      staff_members_details: shift.staff_members_details,
      color: firstStaffId ? getStaffColor(firstStaffId) : (shift.color || "#6b7280"),
      task_templates: shift.task_templates ?? [],
      task_templates_details: shift.task_templates_details,
      tasks: (shift.tasks ?? []).map((t: { id?: string; title: string; priority?: string }) => ({
        id: t.id,
        title: t.title,
        priority: (t.priority as TaskPriority) || "MEDIUM",
      })),
      isRecurring: !!shift.is_recurring,
      recurrence_group_id: shift.recurrence_group_id ?? undefined,
      recurringEndDate: shift.recurrence_end_date ?? undefined,
      frequency: shift.is_recurring ? 'WEEKLY' : undefined,
    };
    });
  }, [scheduleData]);

  const isLoading = isLoadingStaff || isLoadingShifts;

  const withSeconds = (t: string) => (t && t.length === 5 ? `${t}:00` : t);
  const makeISO = (dStr: string, tStr: string) => {
    const d = new Date(`${dStr}T${withSeconds(tStr)}`);
    const offsetMin = -d.getTimezoneOffset();
    const sign = offsetMin >= 0 ? "+" : "-";
    const abs = Math.abs(offsetMin);
    return `${dStr}T${withSeconds(tStr)}${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
  };

  const handleSaveShift = async (shift: Shift) => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      toast.error(t("schedule.not_authenticated"));
      return;
    }
    const isUpdate = shifts.some((s) => s.id === shift.id && !String(s.id).startsWith("temp"));
    const staffIds = (shift.staff_members?.length ? shift.staff_members : shift.staffIds?.length ? shift.staffIds : null) ?? [shift.staffId];
    const title = (shift.title || "").trim() || "Shift";
    const tasksPayload = (shift.tasks || []).map((t) => ({ title: t.title, priority: t.priority || "MEDIUM" }));

    try {
      // —— Recurring: use batch API (one request create, or delete+create for edit) ——
      const hasCustomDays = Array.isArray(shift.days_of_week) && shift.days_of_week.length > 0;
      const isRecurringSave = shift.isRecurring && shift.recurringEndDate && (shift.frequency === 'CUSTOM' ? hasCustomDays : shift.frequency);
      if (isRecurringSave) {
        if (isUpdate) {
          if (shift.recurrence_group_id) {
            const delRes = await fetch(`${API_BASE}/scheduling/recurring-shifts/batch-delete/`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ recurrence_group_id: shift.recurrence_group_id }),
            });
            if (!delRes.ok) {
              const err = await delRes.json().catch(() => ({}));
              throw new Error((err as { detail?: string }).detail || "Failed to update recurring series");
            }
          } else {
            // Converting a single shift into a series: delete the original so batch-create doesn't conflict
            const delRes = await fetch(`${API_BASE}/scheduling/assigned-shifts-v2/${shift.id}/`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!delRes.ok) {
              const err = await delRes.json().catch(() => ({}));
              throw new Error((err as { detail?: string }).detail || "Failed to remove original shift");
            }
          }
        }
        const createRes = await fetch(`${API_BASE}/scheduling/recurring-shifts/batch-create/`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            start_date: shift.date,
            end_date: shift.recurringEndDate,
            frequency: shift.frequency === 'CUSTOM' ? 'CUSTOM' : shift.frequency,
            ...(hasCustomDays ? { days_of_week: shift.days_of_week } : {}),
            start_time: shift.start.length === 5 ? `${shift.start}:00` : shift.start,
            end_time: shift.end.length === 5 ? `${shift.end}:00` : shift.end,
            staff_members: staffIds,
            title,
            task_templates: (shift as Shift).task_templates || [],
            tasks: tasksPayload,
            color: shift.color || getStaffColor(staffIds[0]),
          }),
        });
        const createJson = await createRes.json().catch(() => ({})) as { detail?: string; staff?: string[] };
        if (!createRes.ok) {
          const msg = createJson.detail
            || (Array.isArray(createJson.staff) ? createJson.staff.join(" ") : null)
            || "Failed to create recurring shifts";
          throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
        }
        const created = (createJson as { created?: number }).created ?? 0;
        toast.success(`Created ${created} recurring shift(s)`);
        refetchShifts();
        setIsShiftModalOpen(false);
        return;
      }

      // —— Single shift: one PUT or one POST ——
      let targetedScheduleId = scheduleData?.id;
      const currentWeekStart = toYMD(getWeekStart(parseISO(shift.date)));
      if (currentWeekStart !== weekStartStr) {
        const findRes = await fetch(`${API_BASE}/scheduling/weekly-schedules/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const listJson = await findRes.json();
        const listData = (listJson?.results ?? listJson) as WeeklyScheduleData[];
        let existing = listData.find((s) => s.week_start === currentWeekStart);
        if (!existing) {
          const createRes = await fetch(`${API_BASE}/scheduling/weekly-schedules/`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              week_start: currentWeekStart,
              week_end: toYMD(addDays(getWeekStart(parseISO(shift.date)), 6)),
              is_published: false,
            }),
          });
          if (createRes.ok) existing = await createRes.json();
        }
        targetedScheduleId = existing?.id;
      }
      if (!targetedScheduleId) {
        toast.error(t("schedule.could_not_resolve_schedule"));
        return;
      }

      const method = isUpdate ? "PUT" : "POST";
      const url = `${API_BASE}/scheduling/weekly-schedules/${targetedScheduleId}/assigned-shifts/${isUpdate ? shift.id + "/" : ""}`;
      const payload: Record<string, unknown> = {
        staff: staffIds[0],
        staff_members: staffIds,
        shift_date: shift.date,
        start_time: makeISO(shift.date, shift.start),
        end_time: makeISO(shift.date, shift.end),
        title,
        notes: title,
        color: shift.color || getStaffColor(staffIds[0]),
        task_templates: (shift as Shift).task_templates || [],
        tasks: shift.tasks || [],
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error((errBody as { detail?: string }).detail || "Failed to save shift");
      }
      toast.success(isUpdate ? t("toasts.shift_updated") : t("toasts.shift_created"));
      refetchShifts();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to save shift(s)");
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
      toast.success(t("toasts.shift_deleted"));
      refetchShifts();
    } catch (error) {
      toast.error(t("schedule.failed_delete_shift"));
    } finally {
      setIsShiftModalOpen(false);
    }
  };

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto p-4 md:p-8">
      {/* Sticky header so Grid Weekly / Timesheet / List View tabs stay visible when scrolling */}
      <div className="sticky top-0 z-10 -mx-4 px-4 md:-mx-8 md:px-8 py-3 bg-white/95 backdrop-blur-sm border-b border-gray-100 mb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">{t("schedule.staff_schedule")}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Tabs value={currentView} onValueChange={(v) => setCurrentView(v as "week" | "timesheet" | "list")} className="bg-gray-100/80 p-1.5 rounded-xl shrink-0 border border-gray-200/80">
              <TabsList className="bg-transparent border-none flex flex-wrap gap-1">
                <TabsTrigger
                  value="week"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:border-0 transition-colors"
                >
                  {t("schedule.weekly_grid_view")}
                </TabsTrigger>
                <TabsTrigger
                  value="timesheet"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:border-0 transition-colors"
                >
                  {t("schedule.timesheet_view")}
                </TabsTrigger>
                <TabsTrigger
                  value="list"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:border-0 transition-colors"
                >
                  {t("schedule.list_view")}
                </TabsTrigger>
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
              <span>{t("schedule.create")}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="w-full">
        {currentView === "week" && (
          <WeeklyTimeGridView
            shifts={shifts}
            staffMembers={staffMembers}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            onEditShift={(shift) => {
              setCurrentShift(shift);
              setIsShiftModalOpen(true);
            }}
            isLoading={isLoading}
          />
        )}
        {currentView === "timesheet" && (
          <StaffTimesheetView
            shifts={shifts}
            staffMembers={staffMembers}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            onEditShift={(shift) => {
              setCurrentShift(shift);
              setIsShiftModalOpen(true);
            }}
            isLoading={isLoading}
          />
        )}
        {currentView === "list" && (
          <StaffScheduleListView
            shifts={shifts}
            staffMembers={staffMembers}
            currentDate={currentDate}
            isLoading={isLoading}
          />
        )}

        {/* Export actions: only for Timesheet view, at the bottom */}
        {currentView === "timesheet" && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t("schedule.export_timesheet")}
                </span>
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 border-red-200 bg-white text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-900 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-950/50"
                  onClick={async () => {
                    setIsExporting(true);
                    try {
                      await exportTimesheetToPDF(shifts, staffMembers, currentDate);
                      toast.success(t("schedule.export_pdf_success"));
                    } catch (e) {
                      toast.error(t("schedule.export_failed"));
                    } finally {
                      setIsExporting(false);
                    }
                  }}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  {t("schedule.export_as_pdf")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-900 dark:bg-slate-800 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                  onClick={async () => {
                    setIsExporting(true);
                    try {
                      await exportTimesheetToExcel(shifts, staffMembers, currentDate);
                      toast.success(t("schedule.export_excel_success"));
                    } catch (e) {
                      toast.error(t("schedule.export_failed"));
                    } finally {
                      setIsExporting(false);
                    }
                  }}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4" />
                  )}
                  {t("schedule.export_as_excel")}
                </Button>
              </div>
            </div>
          </div>
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