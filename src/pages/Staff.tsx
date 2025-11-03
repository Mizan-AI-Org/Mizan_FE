"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
} from "lucide-react"

import ShiftModal from "@/components/ShiftModal"
import StaffAnnouncementsList from "@/pages/StaffAnnouncementsList"

// Use configured API base to avoid relative path issues between environments
const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || "http://localhost:8000/api";

const aiRecommendations = []

interface Shift {
  id: string
  title: string
  start: string
  end: string
  type: "confirmed" | "pending" | "tentative"
  day: number
  staffId: string
  color?: string
}

interface StaffMember {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
}

interface BackendShift {
  id: string
  staff: string
  shift_date: string
  start_time: string
  end_time: string
  notes: string
  color?: string
}

interface WeeklyScheduleData {
  id: string
  week_start: string
  week_end: string
  is_published: boolean
  assigned_shifts: BackendShift[]
}
// import { useCalendar } from "./useCalendar"
const GoogleCalendarScheduler = () => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<"week" | "day" | "month">("week")
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [showRecurringModal, setShowRecurringModal] = useState(false)
  const [copiedShift, setCopiedShift] = useState<Shift | null>(null)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false)
  const [currentShift, setCurrentShift] = useState<Shift | null>(null)
  const [newShiftDayIndex, setNewShiftDayIndex] = useState<number>()
  const [newShiftHour, setNewShiftHour] = useState<number>()
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklyScheduleData | null>(null)
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])

  const hours = Array.from({ length: 24 }, (_, i) => i)
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  useEffect(() => {
    const fetchStaffAndSchedule = async () => {
      try {
        const token = localStorage.getItem("access_token")
        if (!token) {
          console.error("No access token found")
          return
        }

        const staffResponse = await fetch(`${API_BASE}/staff/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (!staffResponse.ok) throw new Error("Failed to fetch staff members")
        const staffData: StaffMember[] = await staffResponse.json()
        setStaffMembers(staffData)

        const scheduleResponse = await fetch(`${API_BASE}/scheduling/weekly-schedules/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (!scheduleResponse.ok) throw new Error("Failed to fetch weekly schedule")
        const schedules = await scheduleResponse.json()

        if (schedules.length > 0) {
          setWeeklySchedule(schedules[0])
          setShifts(
            schedules[0].assigned_shifts.map((shift: BackendShift) => ({
              id: shift.id,
              title: shift.notes || `Shift for ${staffData.find((s: StaffMember) => s.id === shift.staff)?.first_name}`,
              start: shift.start_time.substring(0, 5),
              end: shift.end_time.substring(0, 5),
              type: "confirmed" as const,
              day: new Date(shift.shift_date).getDay() === 0 ? 6 : new Date(shift.shift_date).getDay() - 1,
              staffId: shift.staff,
              color: shift.color || "#6b7280",
            })),
          )
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      }
    }

    fetchStaffAndSchedule()
  }, [])

  const getShiftPosition = (shift: Shift) => {
    const [startHour, startMinute] = shift.start.split(":").map(Number)
    const [endHour, endMinute] = shift.end.split(":").map(Number)

    const startPosition = ((startHour * 60 + startMinute) / 60) * 80
    const duration = (((endHour - startHour) * 60 + (endMinute - startMinute)) / 60) * 80

    return { top: startPosition, height: duration }
  }

  const handleCopyShift = (shift: Shift) => {
    setCopiedShift(shift)
    setSelectedShift(null)
  }

  const handlePasteShift = (targetDay: number) => {
    if (!copiedShift) return

    const newShift: Shift = {
      ...copiedShift,
      id: Date.now().toString(),
      day: targetDay,
    }

    setShifts((prev) => [...prev, newShift])
    setSelectedShift(newShift)
  }

  const handleSetRecurring = (shift: Shift) => {
    setSelectedShift(shift)
    setShowRecurringModal(true)
  }

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
      console.error("No weekly schedule available to delete shifts.")
      return
    }
    try {
      const token = localStorage.getItem("access_token")
      if (!token) {
        console.error("No access token found")
        return
      }

      const response = await fetch(
        `/api/scheduling/weekly-schedules/${weeklySchedule.id}/assigned-shifts/${shiftId}/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!response.ok) throw new Error("Failed to delete shift")

      setShifts((prev) => prev.filter((shift) => shift.id !== shiftId))
      setSelectedShift(null)
    } catch (error) {
      console.error("Error deleting shift:", error)
    }
  }

  const handleCreateShift = (dayIndex: number, hour: number) => {
    setCurrentShift(null)
    setNewShiftDayIndex(dayIndex)
    setNewShiftHour(hour)
    setIsShiftModalOpen(true)
  }

  const handleEditShift = (shift: Shift) => {
    setCurrentShift(shift)
    setIsShiftModalOpen(true)
  }

  const handleSaveShift = async (shift: Shift) => {
    if (!weeklySchedule) {
      console.error("No weekly schedule available to save shifts.")
      return
    }

    const shiftDataForBackend = {
      staff: shift.staffId,
      shift_date: new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay() + 1 + shift.day))
        .toISOString()
        .split("T")[0],
      start_time: shift.start,
      end_time: shift.end,
      role: staffMembers.find((s) => s.id === shift.staffId)?.role || "",
      notes: shift.title,
      color: shift.color || "#6b7280",
    }

    try {
      const token = localStorage.getItem("access_token")
      if (!token) {
        console.error("No access token found")
        return
      }

      if (shifts.some((s) => s.id === shift.id)) {
        const response = await fetch(
          `/api/scheduling/weekly-schedules/${weeklySchedule.id}/assigned-shifts/${shift.id}/`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(shiftDataForBackend),
          },
        )

        if (!response.ok) throw new Error("Failed to update shift")
        const updatedShift = await response.json()
        setShifts((prev) =>
          prev.map((s) =>
            s.id === updatedShift.id
              ? {
                  id: updatedShift.id,
                  title:
                    updatedShift.notes ||
                    `Shift for ${staffMembers.find((s: StaffMember) => s.id === updatedShift.staff)?.first_name}`,
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
              : s,
          ),
        )
      } else {
        const response = await fetch(`/api/scheduling/weekly-schedules/${weeklySchedule.id}/assigned-shifts/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(shiftDataForBackend),
        })

        if (!response.ok) throw new Error("Failed to create shift")
        const newShift = await response.json()
        setShifts((prev) => [
          ...prev,
          {
            id: newShift.id,
            title:
              newShift.notes ||
              `Shift for ${staffMembers.find((s: StaffMember) => s.id === newShift.staff)?.first_name}`,
            start: newShift.start_time.substring(0, 5),
            end: newShift.end_time.substring(0, 5),
            type: "confirmed" as const,
            day: new Date(newShift.shift_date).getDay() === 0 ? 6 : new Date(newShift.shift_date).getDay() - 1,
            staffId: newShift.staff,
            color: newShift.color || shift.color,
          },
        ])
      }
    } catch (error) {
      console.error("Error saving shift:", error)
    }
    setIsShiftModalOpen(false)
    setCurrentShift(null)
    setNewShiftDayIndex(undefined)
    setNewShiftHour(undefined)
  }

  const navigateDate = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (view === "week") {
        newDate.setDate(prev.getDate() + (direction === "next" ? 7 : -7))
      } else if (view === "day") {
        newDate.setDate(prev.getDate() + (direction === "next" ? 1 : -1))
      } else {
        newDate.setMonth(prev.getMonth() + (direction === "next" ? 1 : -1))
      }
      return newDate
    })
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const getWeekStart = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff))
  }

  const weekDates = useMemo(() => {
    const dates: Date[] = []
    const start = getWeekStart(currentDate)

    for (let i = 0; i < 7; i++) {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      dates.push(date)
    }

    return dates
  }, [currentDate])

  const getDateDisplay = () => {
    if (view === "week") {
      const firstDay = weekDates[0]
      const lastDay = weekDates[6]
      const firstMonth = firstDay.toLocaleString("en-US", { month: "short" })
      const lastMonth = lastDay.toLocaleString("en-US", { month: "short" })
      const firstDate = firstDay.getDate()
      const lastDate = lastDay.getDate()
      const year = lastDay.getFullYear()
      return `${firstMonth} ${firstDate} - ${lastMonth} ${lastDate}, ${year}`
    }
    return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  }

  const RecurringModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">Set Recurring Schedule</h3>

        <div className="space-y-4">
          <div>
            <label htmlFor="repeat-every" className="text-sm font-medium">
              Repeat every
            </label>
            <select id="repeat-every" className="w-full p-2 border rounded mt-1">
              <option>Week</option>
              <option>2 Weeks</option>
              <option>Month</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">On days</label>
            <div className="grid grid-cols-7 gap-1 mt-2">
              {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                <button key={i} className="w-8 h-8 border rounded text-sm hover:bg-gray-50" type="button">
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="end-date" className="text-sm font-medium">
              End date
            </label>
            <input id="end-date" type="date" className="w-full p-2 border rounded mt-1" />
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="outline" onClick={() => setShowRecurringModal(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              setShowRecurringModal(false)
            }}
          >
            Set Recurring
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="bg-white rounded-lg border shadow-sm h-[600px] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="p-2" onClick={() => navigateDate("prev")}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="p-2" onClick={() => navigateDate("next")}>
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
            <Button size="sm" className="bg-green-700 hover:bg-green-700" onClick={() => handleCreateShift(0, 9)}>
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
              <div key={hour} className="h-20 border-b text-xs text-gray-500 p-1">
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
                    {weekDates[dayIndex]?.toLocaleString("en-US", { month: "short" })} {weekDates[dayIndex]?.getDate()}
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
                      const position = getShiftPosition(shift)
                      const assignedStaff = staffMembers.find((staff) => String(staff.id) === String(shift.staffId))
                      const staffName = assignedStaff ? `${assignedStaff.first_name} ${assignedStaff.last_name}` : ""
                      const shiftTitle = shift.title ? `${staffName} - ${shift.title}` : staffName

                      return (
                        <div
                          key={shift.id}
                          className={`absolute left-1 right-1 rounded p-2 cursor-pointer shadow-sm border-l-4`}
                          style={{
                            top: `${position.top}px`,
                            height: `${position.height}px`,
                            backgroundColor: shift.color ? `${shift.color}20` : "#f3f4f6",
                            borderLeftColor: shift.color || "#6b7280",
                          }}
                          onClick={() => handleEditShift(shift)}
                        >
                          <div className="text-xs font-medium truncate">{shiftTitle}</div>
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
                                  e.stopPropagation()
                                  handleCopyShift(shift)
                                }}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 bg-white"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleSetRecurring(shift)
                                }}
                              >
                                <Repeat className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 bg-white"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteShift(shift.id)
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )
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
  )
}

export default function Staff() {
  const [showAIRecommendations, setShowAIRecommendations] = useState(false)

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

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schedule">Staff Schedule </TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
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
                  {showAIRecommendations ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>
              <CardDescription>{aiRecommendations.length} recommendations available</CardDescription>
            </CardHeader>
            {showAIRecommendations && (
              <CardContent className="pt-0 space-y-3">
                {aiRecommendations.map((rec, index) => (
                  <div key={index} className="flex items-start p-3 bg-muted/30 rounded-lg border-l-2 border-accent">
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
                    <p className="text-xs sm:text-sm font-medium">Total Staff</p>
                    <p className="text-xl sm:text-2xl font-bold"></p>
                  </div>
                  <Users className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium">On Duty Today</p>
                    <p className="text-xl sm:text-2xl font-bold"></p>
                  </div>
                  <UserCheck className="w-6 h-6 sm:w-8 sm:h-8 text-success" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium">Labor Cost %</p>
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
                <CardDescription>Current staff roster and availability</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-primary-foreground font-medium text-sm">?</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm sm:text-base truncate">
                        {/* {member.name} */}
                        </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {/* {member.role} */}
                        </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {/* {member.schedule} */}
                        </p>
                    </div>
                  </div>
                  <div className="text-right space-y-1 ml-2">
                    <Badge variant="outline" className="text-xs">
                    {/* {member.status} */}
                    </Badge>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {/* {member.hours}h this week */}
                      </div>
                    <div className="text-xs">⭐ 
                      {/* {member.rating} */}
                      </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle>Weekly Schedule</CardTitle>
                    <CardDescription>Current and upcoming shifts</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto bg-transparent">
                    <Calendar className="w-4 h-4 mr-2" />
                    View Calendar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[600px] overflow-y-auto"></CardContent>
            </Card>
          </div>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common staff management tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button variant="outline" className="h-14 sm:h-16 flex flex-col gap-1 p-2 bg-transparent">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs sm:text-sm text-center">Auto-Schedule</span>
                </Button>
                <Button variant="outline" className="h-14 sm:h-16 flex flex-col gap-1 p-2 bg-transparent">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs sm:text-sm text-center">Shift Notifications</span>
                </Button>
                <Button variant="outline" className="h-14 sm:h-16 flex flex-col gap-1 p-2 bg-transparent">
                  <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs sm:text-sm text-center">Timesheets</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <GoogleCalendarScheduler />
        </TabsContent>
        <TabsContent value="announcements">
          <StaffAnnouncementsList />
        </TabsContent>
      </Tabs>
    </div>
  )
}
