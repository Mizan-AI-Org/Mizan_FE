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
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { StaffProfileItem } from "@/lib/types";
import { CalendarIcon, Send, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ListSkeleton } from "@/components/skeletons";

interface AnnouncementFormData {
  title: string;
  message: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  expires_at?: string;
  schedule_for?: string;
  recipients_staff_ids?: string[];
  recipients_departments?: string[];
  recipients_roles?: string[];
  recipients_shift_ids?: string[];
  tags?: string[];
}

// Lightweight type for assigned shifts returned by the API
interface AssignedShiftItem {
  id?: string;
  pk?: string;
  uuid?: string;
  shift_date?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  role?: string;
  position?: string;
  staff_name?: string;
  staff_info?: {
    id?: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  };
}

const StaffAnnouncements: React.FC = () => {
  const { user, hasRole } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expirationDate, setExpirationDate] = useState<Date>();
  const [scheduleDate, setScheduleDate] = useState<Date>();
  const [recipientMode, setRecipientMode] = useState<
    "ALL" | "STAFF" | "DEPARTMENT" | "ROLE" | "SHIFT"
  >("ALL");
  const [staffProfiles, setStaffProfiles] = useState<StaffProfileItem[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedShiftIds, setSelectedShiftIds] = useState<string[]>([]);
  const [isLoadingShifts, setIsLoadingShifts] = useState(false);
  const [assignedShifts, setAssignedShifts] = useState<AssignedShiftItem[]>([]);
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
  const canCompose = hasRole(["SUPER_ADMIN", "ADMIN", "MANAGER", "OWNER"]);

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

  const uniqueRoles = useMemo(() => {
    const set = new Set<string>();
    staffProfiles.forEach((p) => {
      if (p?.position) set.add(p.position);
    });
    return Array.from(set).sort();
  }, [staffProfiles]);

  useEffect(() => {
    const maybeLoadShifts = async () => {
      if (recipientMode !== "SHIFT") return;
      try {
        setIsLoadingShifts(true);
        const accessToken = localStorage.getItem("access_token");
        if (!accessToken) return;
        const today = new Date();
        const date_from = format(today, "yyyy-MM-dd");
        const date_to = format(
          new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000),
          "yyyy-MM-dd"
        );
        const shifts = await api.getAssignedShifts(accessToken, {
          date_from,
          date_to,
        });
        setAssignedShifts(Array.isArray(shifts) ? shifts : []);
      } catch (e) {
        setAssignedShifts([]);
      } finally {
        setIsLoadingShifts(false);
      }
    };
    maybeLoadShifts();
  }, [recipientMode]);

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
        title: t("announcements.validation_title"),
        description: t("announcements.validation_body"),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const accessToken = localStorage.getItem("access_token");
      if (!accessToken) {
        throw new Error(t("announcements.no_session"));
      }

      const announcementData: AnnouncementFormData = {
        ...formData,
        message: plainMessage,
        expires_at: expirationDate ? expirationDate.toISOString() : undefined,
        schedule_for: scheduleDate ? scheduleDate.toISOString() : undefined,
      };

      if (tags.length) {
        announcementData.tags = tags.map((tag) => tag.trim()).filter(Boolean);
      }

      if (recipientMode === "STAFF") {
        announcementData.recipients_staff_ids = selectedStaffIds.length
          ? selectedStaffIds
          : undefined;
        announcementData.recipients_departments = undefined;
        announcementData.recipients_roles = undefined;
        announcementData.recipients_shift_ids = undefined;
      } else if (recipientMode === "DEPARTMENT") {
        announcementData.recipients_departments = selectedDepartments.length
          ? selectedDepartments
          : undefined;
        announcementData.recipients_staff_ids = undefined;
        announcementData.recipients_roles = undefined;
        announcementData.recipients_shift_ids = undefined;
      } else if (recipientMode === "ROLE") {
        announcementData.recipients_roles = selectedRoles.length
          ? selectedRoles
          : undefined;
        announcementData.recipients_staff_ids = undefined;
        announcementData.recipients_departments = undefined;
        announcementData.recipients_shift_ids = undefined;
      } else if (recipientMode === "SHIFT") {
        announcementData.recipients_shift_ids = selectedShiftIds.length
          ? selectedShiftIds
          : undefined;
        announcementData.recipients_staff_ids = undefined;
        announcementData.recipients_departments = undefined;
        announcementData.recipients_roles = undefined;
      } else {
        announcementData.recipients_staff_ids = undefined;
        announcementData.recipients_departments = undefined;
        announcementData.recipients_roles = undefined;
        announcementData.recipients_shift_ids = undefined;
      }

      const result = await api.createAnnouncement(
        accessToken,
        announcementData,
        attachments
      );

      toast({
        title: t("announcements.created_title"),
        description: t("announcements.created_body", { message: result.message, count: result.notification_count }),
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
        title: t("auth.accept.toast_error"),
        description:
          error instanceof Error
            ? error.message
            : t("announcements.create_failed"),
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
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {t("announcements.title")}
        </h1>
        <p className="text-gray-600 mt-2">
          {t("announcements.subtitle")}
        </p>
        {!canCompose && (
          <div className="mt-3 p-3 rounded-md border bg-yellow-50 text-yellow-900">
            {t("announcements.no_permission")}
          </div>
        )}
      </div>

      <Card>
        <CardHeader></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title Field */}
            <div className="space-y-2">
              <Label htmlFor="title">{t("announcements.title_label")} *</Label>
              <Input
                id="title"
                placeholder={t("announcements.placeholder_title")}
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                required
                disabled={!canCompose}
              />
            </div>

            {/* Message Field - Rich Text Editor */}
            <div className="space-y-2">
              <Label>{t("announcements.message_label")} *</Label>
              <div className="border rounded-md">
                <div className="flex items-center gap-1 p-2 border-b">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => document.execCommand("bold")}
                    aria-label={t("announcements.format_bold")}
                    disabled={!canCompose}
                  >
                    <span className="font-bold">B</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => document.execCommand("italic")}
                    aria-label={t("announcements.format_italic")}
                    disabled={!canCompose}
                  >
                    <span className="italic">I</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => document.execCommand("underline")}
                    aria-label={t("announcements.format_underline")}
                    disabled={!canCompose}
                  >
                    <span className="underline">U</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => document.execCommand("insertUnorderedList")}
                    aria-label={t("announcements.format_bullets")}
                    disabled={!canCompose}
                  >
                    • {t("announcements.format_list")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => document.execCommand("insertOrderedList")}
                    aria-label={t("announcements.format_numbered")}
                    disabled={!canCompose}
                  >
                    1. {t("announcements.format_list")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const url = window.prompt(t("announcements.enter_url"));
                      if (url) document.execCommand("createLink", false, url);
                    }}
                    aria-label={t("announcements.insert_link")}
                    disabled={!canCompose}
                  >
                    {t("announcements.link")}
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
                {t("announcements.formatting_hint")}
              </p>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">{t("announcements.tags_label")}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="tags"
                  placeholder={t("announcements.type_tag_enter")}
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
                  {t("common.add")}
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2" aria-live="polite">
                  {tags.map((tag, idx) => (
                    <span
                      key={`${tag}-${idx}`}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        className="ml-1 text-muted-foreground hover:text-foreground"
                        aria-label={t("announcements.remove_tag", { tag })}
                        onClick={() => setTags(tags.filter((x) => x !== tag))}
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
              <Label>{t("generic.attachments")}</Label>
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
                    {t("announcements.files_selected", { count: attachments.length })}
                  </p>
                  <ul className="space-y-1">
                    {attachments.map((file, idx) => (
                      <li
                        key={`${file.name}-${idx}`}
                        className="flex items-center justify-between text-sm"
                      >
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
                              setAttachments((prev) =>
                                prev.filter((_, i) => i !== idx)
                              )
                            }
                          >
                            {t("common.remove")}
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
              <Label htmlFor="priority">{t("announcements.priority_label")}</Label>
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
                      {t(`announcements.priority.${formData.priority.toLowerCase()}`)}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">
                    <div className="flex items-center gap-2">
                      {getPriorityIcon("LOW")}
                      {t("announcements.priority.low")}
                    </div>
                  </SelectItem>
                  <SelectItem value="MEDIUM">
                    <div className="flex items-center gap-2">
                      {getPriorityIcon("MEDIUM")}
                      {t("announcements.priority.medium")}
                    </div>
                  </SelectItem>
                  <SelectItem value="HIGH">
                    <div className="flex items-center gap-2">
                      {getPriorityIcon("HIGH")}
                      {t("announcements.priority.high")}
                    </div>
                  </SelectItem>
                  <SelectItem value="URGENT">
                    <div className="flex items-center gap-2">
                      {getPriorityIcon("URGENT")}
                      {t("announcements.priority.urgent")}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Recipients Selection */}
            <div className="space-y-3">
              <Label>{t("announcements.recipients_label")}</Label>
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
                        {t(`announcements.recipients.${recipientMode.toLowerCase()}`)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">{t("announcements.recipients.all")}</SelectItem>
                      <SelectItem value="STAFF">{t("announcements.recipients.staff")}</SelectItem>
                      <SelectItem value="DEPARTMENT">{t("announcements.recipients.department")}</SelectItem>
                      <SelectItem value="ROLE">{t("announcements.recipients.role")}</SelectItem>
                      <SelectItem value="SHIFT">{t("announcements.recipients.shift")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {t("announcements.recipients_hint")}
                  </p>
                </div>

                <div className="md:col-span-2">
                  {recipientMode === "STAFF" && (
                    <div className="space-y-2">
                      {isLoadingStaff ? (
                        <ListSkeleton rowCount={4} lineCount={1} showAvatar={false} className="max-h-56" />
                      ) : staffProfiles.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {t("announcements.no_staff")}
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-auto border rounded-md p-2">
                          {staffProfiles.map((profile) => {
                            const name = `${profile.user_details?.first_name ?? ""
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
                        {t("announcements.selected_count", { count: selectedStaffIds.length })}
                      </p>
                    </div>
                  )}

                  {recipientMode === "DEPARTMENT" && (
                    <div className="space-y-2">
                      {isLoadingStaff ? (
                        <ListSkeleton rowCount={3} lineCount={1} showAvatar={false} className="max-h-56" />
                      ) : uniqueDepartments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {t("announcements.no_departments")}
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
                        {t("announcements.selected_count", { count: selectedDepartments.length })}
                      </p>
                    </div>
                  )}

                  {recipientMode === "ROLE" && (
                    <div className="space-y-2">
                      {isLoadingStaff ? (
                        <ListSkeleton rowCount={3} lineCount={1} showAvatar={false} className="max-h-56" />
                      ) : uniqueRoles.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {t("announcements.no_roles")}
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-auto border rounded-md p-2">
                          {uniqueRoles.map((role) => {
                            const checked = selectedRoles.includes(role);
                            return (
                              <label
                                key={role}
                                className="flex items-center gap-2 py-1"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(val) => {
                                    setSelectedRoles((prev) => {
                                      if (val) return [...prev, role];
                                      return prev.filter((x) => x !== role);
                                    });
                                  }}
                                />
                                <span className="text-sm">{role}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {t("announcements.selected_count", { count: selectedRoles.length })}
                      </p>
                    </div>
                  )}

                  {recipientMode === "SHIFT" && (
                    <div className="space-y-2">
                      {isLoadingShifts ? (
                        <ListSkeleton rowCount={4} lineCount={2} showAvatar={false} className="max-h-56" />
                      ) : assignedShifts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {t("announcements.no_shifts")}
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 gap-2 max-h-56 overflow-auto border rounded-md p-2">
                          {assignedShifts.map((shift: AssignedShiftItem) => {
                            const id = String(
                              shift.id ?? shift.pk ?? shift.uuid ?? ""
                            );
                            const checked = selectedShiftIds.includes(id);
                            const dateLabel = shift.shift_date || shift.date;
                            const roleLabel =
                              shift.role || shift.position || "";
                            const staffName =
                              shift.staff_name ||
                              shift.staff_info?.name ||
                              `${shift.staff_info?.first_name ?? ""} ${shift.staff_info?.last_name ?? ""
                                }`.trim();
                            const timeRange = `${shift.start_time ?? ""} - ${shift.end_time ?? ""
                              }`;
                            return (
                              <label
                                key={id}
                                className="flex items-center gap-2 py-1"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(val) => {
                                    setSelectedShiftIds((prev) => {
                                      if (val) return [...prev, id];
                                      return prev.filter((x) => x !== id);
                                    });
                                  }}
                                />
                                <span className="text-sm truncate">
                                  {dateLabel} • {roleLabel} • {staffName} •{" "}
                                  {timeRange}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {t("announcements.selected_count", { count: selectedShiftIds.length })}
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
                <Label>{t("announcements.expiration_label")}</Label>
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
                        : t("announcements.select_expiration")}
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
                <Label>{t("announcements.schedule_label")}</Label>
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
                        : t("announcements.send_immediately")}
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
                    {t("announcements.clear_expiration")}
                  </Button>
                )}
                {scheduleDate && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setScheduleDate(undefined)}
                  >
                    {t("announcements.clear_schedule")}
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
                    {t("announcements.sending")}
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {t("announcements.send")}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffAnnouncements;
