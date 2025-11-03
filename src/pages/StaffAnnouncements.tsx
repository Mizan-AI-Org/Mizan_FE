import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Using a simple rich text editor via contentEditable instead of Textarea
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
  tags?: string[];
}

const StaffAnnouncements: React.FC = () => {
  const { user, hasRole } = useAuth();
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
  const [richHtml, setRichHtml] = useState<string>("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const editorRef = React.useRef<HTMLDivElement | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>("");
  const canCompose = hasRole(["SUPER_ADMIN", "ADMIN", "MANAGER"]);

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

    const plainMessage = richHtml
      .replace(/<br\s*\/>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .trim();
    if (!formData.title.trim() || !plainMessage) {
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
        message: plainMessage,
        expires_at: expirationDate ? expirationDate.toISOString() : undefined,
        schedule_for: scheduleDate ? scheduleDate.toISOString() : undefined,
      };

      if (tags.length) {
        announcementData.tags = tags.map((t) => t.trim()).filter(Boolean);
      }

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
        announcementData,
        attachments
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
      setRichHtml("");
      if (editorRef.current) editorRef.current.innerHTML = "";
      setExpirationDate(undefined);
      setScheduleDate(undefined);
      setRecipientMode("ALL");
      setSelectedStaffIds([]);
      setSelectedDepartments([]);
      setAttachments([]);
      setTags([]);
      setTagInput("");
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
        {!canCompose && (
          <div className="mt-3 p-3 rounded-md border bg-yellow-50 text-yellow-900">
            You do not have permission to create announcements. Please contact an administrator.
          </div>
        )}
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
                disabled={!canCompose}
              />
            </div>

            {/* Message Field - Rich Text Editor */}
            <div className="space-y-2">
              <Label>Message *</Label>
              <div className="border rounded-md">
                <div className="flex items-center gap-1 p-2 border-b">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => document.execCommand("bold")}
                    aria-label="Bold"
                    disabled={!canCompose}
                  >
                    <span className="font-bold">B</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => document.execCommand("italic")}
                    aria-label="Italic"
                    disabled={!canCompose}
                  >
                    <span className="italic">I</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => document.execCommand("underline")}
                    aria-label="Underline"
                    disabled={!canCompose}
                  >
                    <span className="underline">U</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => document.execCommand("insertUnorderedList")}
                    aria-label="Bullet list"
                    disabled={!canCompose}
                  >
                    • List
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => document.execCommand("insertOrderedList")}
                    aria-label="Numbered list"
                    disabled={!canCompose}
                  >
                    1. List
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const url = window.prompt("Enter URL");
                      if (url) document.execCommand("createLink", false, url);
                    }}
                    aria-label="Insert link"
                    disabled={!canCompose}
                  >
                    Link
                  </Button>
                </div>
                <div
                  ref={editorRef}
                  className="p-3 min-h-[140px] outline-none"
                  contentEditable
                  onInput={(e) => {
                    const html = (e.target as HTMLElement).innerHTML;
                    setRichHtml(html);
                    const plain = html
                      .replace(/<br\s*\/>/gi, "\n")
                      .replace(/<[^>]*>/g, "")
                      .trim();
                    setFormData((prev) => ({ ...prev, message: plain }));
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Basic formatting supported. Message is delivered as plain text.
              </p>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Categories / Tags</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="tags"
                  placeholder="Type a tag and press Enter"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const val = tagInput.trim();
                      if (val && !tags.includes(val)) setTags([...tags, val]);
                      setTagInput("");
                    }
                  }}
                  disabled={!canCompose}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const val = tagInput.trim();
                    if (val && !tags.includes(val)) setTags([...tags, val]);
                    setTagInput("");
                  }}
                  disabled={!canCompose}
                >
                  Add
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2" aria-live="polite">
                  {tags.map((t, idx) => (
                    <span
                      key={`${t}-${idx}`}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-sm"
                    >
                      {t}
                      <button
                        type="button"
                        className="ml-1 text-muted-foreground hover:text-foreground"
                        aria-label={`Remove tag ${t}`}
                        onClick={() => setTags(tags.filter((x) => x !== t))}
                        disabled={!canCompose}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <Label>Attachments</Label>
              <Input
                type="file"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setAttachments(files);
                }}
              />
              {attachments.length > 0 && (
                <div className="border rounded-md p-2">
                  <p className="text-xs text-muted-foreground mb-2">
                    {attachments.length} file(s) selected
                  </p>
                  <ul className="space-y-1">
                    {attachments.map((file, idx) => (
                      <li key={`${file.name}-${idx}`} className="flex items-center justify-between text-sm">
                        <span className="truncate max-w-[70%]">
                          {file.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setAttachments((prev) => prev.filter((_, i) => i !== idx))
                            }
                          >
                            Remove
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
