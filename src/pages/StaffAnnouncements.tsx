import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { StaffProfileItem } from "@/lib/types";
import { CalendarIcon, Send, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AnnouncementFormData {
  title: string;
  message: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  expires_at?: string;
  schedule_for?: string;
  recipients_staff_ids?: string[];
  recipients_departments?: string[];
}

const StaffAnnouncements: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expirationDate, setExpirationDate] = useState<Date>();
  const [scheduleDate, setScheduleDate] = useState<Date>();
  const [recipientMode, setRecipientMode] = useState<
    "ALL" | "STAFF" | "DEPARTMENT"
  >("ALL");
  const [staffProfiles, setStaffProfiles] = useState<StaffProfileItem[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [formData, setFormData] = useState<AnnouncementFormData>({
    title: "",
    message: "",
    priority: "MEDIUM",
  });

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        setIsLoadingStaff(true);
        const accessToken = localStorage.getItem("access_token");
        if (!accessToken) return;
        const profiles = await api.getStaffProfiles(accessToken);
        setStaffProfiles(profiles);
      } catch (e) {
        // soft-fail; recipient UI will still allow ALL
      } finally {
        setIsLoadingStaff(false);
      }
    };
    fetchProfiles();
  }, []);

  const uniqueDepartments = useMemo(() => {
    const set = new Set<string>();
    staffProfiles.forEach((p) => {
      if (p?.department) set.add(p.department);
    });
    return Array.from(set).sort();
  }, [staffProfiles]);

  const handleInputChange = (
    field: keyof AnnouncementFormData,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.message.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in both title and message fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const accessToken = localStorage.getItem("access_token");
      if (!accessToken) {
        throw new Error("No access token found");
      }

      const announcementData: AnnouncementFormData = {
        ...formData,
        expires_at: expirationDate ? expirationDate.toISOString() : undefined,
        schedule_for: scheduleDate ? scheduleDate.toISOString() : undefined,
      };

      if (recipientMode === "STAFF") {
        announcementData.recipients_staff_ids = selectedStaffIds.length
          ? selectedStaffIds
          : undefined;
        announcementData.recipients_departments = undefined;
      } else if (recipientMode === "DEPARTMENT") {
        announcementData.recipients_departments = selectedDepartments.length
          ? selectedDepartments
          : undefined;
        announcementData.recipients_staff_ids = undefined;
      } else {
        announcementData.recipients_staff_ids = undefined;
        announcementData.recipients_departments = undefined;
      }

      const result = await api.createAnnouncement(
        accessToken,
        announcementData
      );

      toast({
        title: "Announcement Created",
        description: `${result.message} (${result.notification_count} recipients)`,
      });

      // Reset form
      setFormData({
        title: "",
        message: "",
        priority: "MEDIUM",
      });
      setExpirationDate(undefined);
      setScheduleDate(undefined);
      setRecipientMode("ALL");
      setSelectedStaffIds([]);
      setSelectedDepartments([]);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to create announcement",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "HIGH":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "MEDIUM":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Staff Announcements
        </h1>
        <p className="text-gray-600 mt-2">
          Create and send announcements to all staff members in your restaurant.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Create New Announcement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title Field */}
            <div className="space-y-2">
              <Label htmlFor="title">Announcement Title *</Label>
              <Input
                id="title"
                placeholder="Enter announcement title..."
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                required
              />
            </div>

            {/* Message Field */}
            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                placeholder="Enter your announcement message..."
                value={formData.message}
                onChange={(e) => handleInputChange("message", e.target.value)}
                rows={6}
                required
              />
            </div>

            {/* Priority Field */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority Level</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) =>
                  handleInputChange(
                    "priority",
                    value as AnnouncementFormData["priority"]
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      {getPriorityIcon(formData.priority)}
                      {formData.priority}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">
                    <div className="flex items-center gap-2">
                      {getPriorityIcon("LOW")}
                      Low
                    </div>
                  </SelectItem>
                  <SelectItem value="MEDIUM">
                    <div className="flex items-center gap-2">
                      {getPriorityIcon("MEDIUM")}
                      Medium
                    </div>
                  </SelectItem>
                  <SelectItem value="HIGH">
                    <div className="flex items-center gap-2">
                      {getPriorityIcon("HIGH")}
                      High
                    </div>
                  </SelectItem>
                  <SelectItem value="URGENT">
                    <div className="flex items-center gap-2">
                      {getPriorityIcon("URGENT")}
                      Urgent
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Recipients Selection */}
            <div className="space-y-3">
              <Label>Recipients</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2 md:col-span-1">
                  <Select
                    value={recipientMode}
                    onValueChange={(v) =>
                      setRecipientMode(v as "ALL" | "STAFF" | "DEPARTMENT")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue>
                        {recipientMode === "ALL"
                          ? "All Staff"
                          : recipientMode === "STAFF"
                          ? "Specific Staff"
                          : "Departments"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Staff</SelectItem>
                      <SelectItem value="STAFF">Specific Staff</SelectItem>
                      <SelectItem value="DEPARTMENT">Departments</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Target specific staff or departments. Defaults to all staff.
                  </p>
                </div>

                <div className="md:col-span-2">
                  {recipientMode === "STAFF" && (
                    <div className="space-y-2">
                      {isLoadingStaff ? (
                        <p className="text-sm text-muted-foreground">
                          Loading staff…
                        </p>
                      ) : staffProfiles.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No staff profiles found.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-auto border rounded-md p-2">
                          {staffProfiles.map((profile) => {
                            const name = `${
                              profile.user_details?.first_name ?? ""
                            } ${profile.user_details?.last_name ?? ""}`.trim();
                            const id = profile.user_details?.id || profile.id;
                            const checked = selectedStaffIds.includes(id);
                            return (
                              <label
                                key={id}
                                className="flex items-center gap-2 py-1"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(val) => {
                                    setSelectedStaffIds((prev) => {
                                      if (val) return [...prev, id];
                                      return prev.filter((x) => x !== id);
                                    });
                                  }}
                                />
                                <span className="text-sm">
                                  {name || profile.user_details?.email}
                                </span>
                                {profile.department && (
                                  <span className="ml-auto text-xs text-muted-foreground">
                                    {profile.department}
                                  </span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Selected: {selectedStaffIds.length}
                      </p>
                    </div>
                  )}

                  {recipientMode === "DEPARTMENT" && (
                    <div className="space-y-2">
                      {isLoadingStaff ? (
                        <p className="text-sm text-muted-foreground">
                          Loading departments…
                        </p>
                      ) : uniqueDepartments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No departments found.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-auto border rounded-md p-2">
                          {uniqueDepartments.map((dept) => {
                            const checked = selectedDepartments.includes(dept);
                            return (
                              <label
                                key={dept}
                                className="flex items-center gap-2 py-1"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(val) => {
                                    setSelectedDepartments((prev) => {
                                      if (val) return [...prev, dept];
                                      return prev.filter((x) => x !== dept);
                                    });
                                  }}
                                />
                                <span className="text-sm">{dept}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Selected: {selectedDepartments.length}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Optional Fields Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Expiration Date */}
              <div className="space-y-2">
                <Label>Expiration Date (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !expirationDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expirationDate
                        ? format(expirationDate, "PPP")
                        : "Select expiration date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={expirationDate}
                      onSelect={setExpirationDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Schedule Date */}
              <div className="space-y-2">
                <Label>Schedule For Later (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !scheduleDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduleDate
                        ? format(scheduleDate, "PPP")
                        : "Send immediately"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={scheduleDate}
                      onSelect={setScheduleDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Clear Optional Dates */}
            {(expirationDate || scheduleDate) && (
              <div className="flex gap-2">
                {expirationDate && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setExpirationDate(undefined)}
                  >
                    Clear Expiration
                  </Button>
                )}
                {scheduleDate && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setScheduleDate(undefined)}
                  >
                    Clear Schedule
                  </Button>
                )}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  !formData.title.trim() ||
                  !formData.message.trim()
                }
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Announcement
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Help Text */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            • Announcements are sent to all staff members in your restaurant
          </li>
          <li>• Staff will receive notifications on their devices</li>
          <li>• Use priority levels to indicate urgency</li>
          <li>• Set expiration dates for time-sensitive announcements</li>
          <li>• Schedule announcements to be sent at a later time</li>
        </ul>
      </div>
    </div>
  );
};

export default StaffAnnouncements;
