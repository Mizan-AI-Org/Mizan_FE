import React, { useState, useRef } from "react";
import { Camera, Upload, Loader2, Check, FileSpreadsheet, X, ListOrdered, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { API_BASE } from "@/lib/api";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { useLanguage } from "@/hooks/use-language";

const ACCEPT_DOCUMENTS = ".csv,.xlsx,.xls,application/csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export interface ParsedShift {
  employee_name?: string | null;
  role: string;
  department?: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface ParsedSchedule {
  template_name: string;
  shifts: ParsedShift[];
  departments?: string[];
  roles_seen?: string[];
  error?: string;
}

interface SchedulePhotoImportProps {
  weekStart: string; // YYYY-MM-DD
  onApplied?: () => void;
  onTemplateSaved?: () => void;
}

const SchedulePhotoImport: React.FC<SchedulePhotoImportProps> = ({
  weekStart,
  onApplied,
  onTemplateSaved,
}) => {
  const { t } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const [parsed, setParsed] = useState<ParsedSchedule | null>(null);
  const [applying, setApplying] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
  });

  const sendDocument = async (file: File) => {
    setUploading(true);
    setParsed(null);
    try {
      const form = new FormData();
      form.append("file", file, file.name);
      const res = await fetch(`${API_BASE}/scheduling/parse-schedule-document/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || data.error || "Failed to parse document");
        setParsed({ template_name: "", shifts: [], error: data.detail || data.error });
        return;
      }
      setParsed({
        template_name: data.template_name || "Imported from file",
        shifts: data.shifts || [],
        departments: data.departments,
        roles_seen: data.roles_seen,
        error: data.error,
      });
      setTemplateName(data.template_name || "Imported from file");
      if ((data.shifts || []).length > 0) {
        toast.success(`Found ${data.shifts.length} shift(s). Review and save or apply.`);
      } else {
        toast.info("No shifts found. Check that your file has columns like Date, Employee, Role, Start, End.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to parse schedule document");
      setParsed({ template_name: "", shifts: [], error: "Network error" });
    } finally {
      setUploading(false);
    }
  };

  const sendImage = async (file: File | Blob) => {
    setUploading(true);
    setParsed(null);
    try {
      const form = new FormData();
      form.append("photo", file, file instanceof File ? file.name : "capture.jpg");
      const res = await fetch(`${API_BASE}/scheduling/parse-schedule-photo/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || data.error || "Failed to parse photo");
        setParsed({ template_name: "", shifts: [], error: data.detail || data.error });
        return;
      }
      setParsed({
        template_name: data.template_name || "Imported from photo",
        shifts: data.shifts || [],
        departments: data.departments,
        roles_seen: data.roles_seen,
        error: data.error,
      });
      setTemplateName(data.template_name || "Imported from photo");
      if ((data.shifts || []).length > 0) {
        toast.success(`Found ${data.shifts.length} shift(s). Review and save or apply.`);
      } else {
        toast.info("No shifts detected. Try a clearer photo or different schedule format.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to parse schedule photo");
      setParsed({ template_name: "", shifts: [], error: "Network error" });
    } finally {
      setUploading(false);
    }
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = (file.name || "").toLowerCase();
      if (ext.endsWith(".csv") || ext.endsWith(".xlsx") || ext.endsWith(".xls")) {
        sendDocument(file);
      } else {
        toast.error("Please select an Excel (.xlsx, .xls) or CSV file.");
      }
    }
    e.target.value = "";
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      sendImage(file);
    } else if (file) {
      toast.error("Please select an image file (JPEG, PNG, etc.)");
    }
    e.target.value = "";
  };

  const startCamera = () => {
    setCameraOpen(true);
    setCapturedBlob(null);
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => {
        toast.error("Camera access denied or unavailable");
        setCameraOpen(false);
      });
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
    setCapturedBlob(null);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob);
          stopCamera();
          sendImage(blob);
        }
      },
      "image/jpeg",
      0.9
    );
  };

  const saveAsTemplate = async () => {
    if (!parsed?.shifts?.length) {
      toast.error("No shifts to save");
      return;
    }
    setApplying(true);
    try {
      const res = await fetch(`${API_BASE}/scheduling/apply-parsed-schedule/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          template_name: templateName || parsed.template_name,
          shifts: parsed.shifts,
          save_as_template: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || "Failed to save template");
        return;
      }
      toast.success("Template saved. You can reuse it when building schedules.");
      setParsed(null);
      onTemplateSaved?.();
    } catch (e) {
      console.error(e);
      toast.error("Failed to save template");
    } finally {
      setApplying(false);
    }
  };

  const applyToWeek = async () => {
    if (!parsed?.shifts?.length) {
      toast.error("No shifts to apply");
      return;
    }
    setApplying(true);
    try {
      const res = await fetch(`${API_BASE}/scheduling/apply-parsed-schedule/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          template_name: templateName || parsed.template_name,
          shifts: parsed.shifts,
          week_start: weekStart,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || "Failed to apply schedule");
        return;
      }
      const count = (data.applied_shift_ids || []).length;
      toast.success(`Applied ${count} shift(s) to this week.`);
      setParsed(null);
      onApplied?.();
    } catch (e) {
      console.error(e);
      toast.error("Failed to apply schedule");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8 min-h-[calc(100vh-12rem)]">
      {/* Upload & result */}
      <div className="lg:col-span-3">
        <Card className="border-dashed border-2 border-green-200 bg-green-50/50 h-full flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
              {t("schedule.import_title")}
            </CardTitle>
            <CardDescription>
              {t("schedule.import_description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
        {!cameraOpen && !parsed?.shifts?.length && (
          <div className="flex flex-wrap gap-3 items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_DOCUMENTS}
              className="hidden"
              onChange={handleDocumentChange}
            />
            <Button
              type="button"
              variant="default"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {t("schedule.upload_excel_csv")}
            </Button>
            <span className="text-sm text-neutral-500">{t("schedule.import_or")}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              id="schedule-import-photo"
              onChange={handleImageChange}
            />
            <Button
              type="button"
              variant="outline"
              className="border-green-300 bg-white"
              onClick={() => document.getElementById("schedule-import-photo")?.click()}
              disabled={uploading}
            >
              <Camera className="h-4 w-4 mr-2" />
              {t("schedule.upload_photo_instead")}
            </Button>
          </div>
        )}

        {cameraOpen && (
          <div className="space-y-2">
            <div className="relative rounded-lg overflow-hidden bg-black max-w-md">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full max-h-[280px] object-cover"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={capturePhoto}>{t("schedule.capture")}</Button>
              <Button variant="outline" onClick={stopCamera}>
                {t("schedule.cancel")}
              </Button>
            </div>
          </div>
        )}

        {parsed && (
          <div className="space-y-3">
            {parsed.error && (
              <p className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-md">{parsed.error}</p>
            )}
            {parsed.shifts.length > 0 && (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="text-sm font-medium text-gray-700">{t("schedule.template_name_label")}</label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="border rounded-md px-2 py-1 text-sm w-48"
                    placeholder={t("schedule.template_name_placeholder")}
                  />
                </div>
                <div className="overflow-x-auto rounded-md border bg-white max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="text-left p-2">{t("schedule.table_employee")}</th>
                        <th className="text-left p-2">{t("schedule.table_role")}</th>
                        <th className="text-left p-2">{t("schedule.table_day")}</th>
                        <th className="text-left p-2">{t("schedule.table_start")}</th>
                        <th className="text-left p-2">{t("schedule.table_end")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.shifts.map((s, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2">{s.employee_name || "—"}</td>
                          <td className="p-2">{s.role}</td>
                          <td className="p-2">{DAY_NAMES[s.day_of_week] ?? s.day_of_week}</td>
                          <td className="p-2">{s.start_time}</td>
                          <td className="p-2">{s.end_time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={saveAsTemplate}
                    disabled={applying}
                    variant="outline"
                    className="border-green-600 text-green-700 hover:bg-green-50"
                  >
                    {applying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                    {t("schedule.save_as_template")}
                  </Button>
                  <Button
                    onClick={applyToWeek}
                    disabled={applying}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {applying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {t("schedule.apply_to_week")} ({format(new Date(weekStart), "MMM d")} – {format(addDays(new Date(weekStart), 6), "MMM d")})
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setParsed(null)}
                    className="text-gray-500"
                  >
                    <X className="h-4 w-4 mr-1" />
                    {t("schedule.discard")}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
          </CardContent>
        </Card>
      </div>

      {/* How it works & supported format */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="border border-neutral-200 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ListOrdered className="h-4 w-4 text-green-600" />
              {t("schedule.how_it_works")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-100 text-green-700 font-semibold text-sm flex items-center justify-center">1</span>
              <div>
                <p className="font-medium text-neutral-900">{t("schedule.import_step1_title")}</p>
                <p className="text-sm text-neutral-600">{t("schedule.import_step1_desc")}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-100 text-green-700 font-semibold text-sm flex items-center justify-center">2</span>
              <div>
                <p className="font-medium text-neutral-900">{t("schedule.import_step2_title")}</p>
                <p className="text-sm text-neutral-600">{t("schedule.import_step2_desc")}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-100 text-green-700 font-semibold text-sm flex items-center justify-center">3</span>
              <div>
                <p className="font-medium text-neutral-900">{t("schedule.import_step3_title")}</p>
                <p className="text-sm text-neutral-600">{t("schedule.import_step3_desc")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-neutral-200 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Table2 className="h-4 w-4 text-green-600" />
              {t("schedule.supported_columns")}
            </CardTitle>
            <CardDescription className="text-sm">
              {t("schedule.supported_columns_desc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-2 text-sm">
              <li className="flex flex-wrap gap-1.5">
                <span className="font-medium text-neutral-700">{t("schedule.col_date_day")}</span>
                <span className="text-neutral-600">{t("schedule.col_date_examples")}</span>
              </li>
              <li className="flex flex-wrap gap-1.5">
                <span className="font-medium text-neutral-700">{t("schedule.col_employee")}</span>
                <span className="text-neutral-600">{t("schedule.col_employee_examples")}</span>
              </li>
              <li className="flex flex-wrap gap-1.5">
                <span className="font-medium text-neutral-700">{t("schedule.col_role")}</span>
                <span className="text-neutral-600">{t("schedule.col_role_examples")}</span>
              </li>
              <li className="flex flex-wrap gap-1.5">
                <span className="font-medium text-neutral-700">{t("schedule.col_start_end")}</span>
                <span className="text-neutral-600">{t("schedule.col_start_end_examples")}</span>
              </li>
              <li className="flex flex-wrap gap-1.5">
                <span className="font-medium text-neutral-700">{t("schedule.col_department")}</span>
                <span className="text-neutral-600">{t("schedule.col_department_examples")}</span>
              </li>
            </ul>
            <p className="mt-3 text-xs text-neutral-500 border-t border-neutral-100 pt-3">
              {t("schedule.dates_times_note")}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SchedulePhotoImport;
