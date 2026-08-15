import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { api, API_BASE } from "@/lib/api";
import { useLanguage } from "@/hooks/use-language";
import { toast } from "sonner";
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  Download,
  ExternalLink,
  Eye,
  FileWarning,
  Loader2,
  Paperclip,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DocType = { id: string; label: string };

type AttachmentInfo = {
  filename: string;
  mime_type: string;
  size: number | null;
  resolved_url: string;
  uploaded_at: string | null;
  source: string;
};

type ComplianceDoc = {
  id: string;
  title: string;
  document_type: string;
  expires_at?: string | null;
  days_until_expiry?: number | null;
  urgency: "expired" | "critical" | "soon" | "ok" | "unset";
  has_file?: boolean;
  file_url?: string;
  attachment?: AttachmentInfo | null;
};

type TenantUpload = {
  id: string;
  title: string;
  category?: string;
  summary?: string;
  vendor?: string | null;
  amount?: string | null;
  currency?: string | null;
  expiry_date?: string | null;
  file_url?: string;
  created_at?: string | null;
  mime_type?: string;
};

const urgencyStyles: Record<ComplianceDoc["urgency"], string> = {
  expired: "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
  critical: "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300",
  soon: "bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300",
  ok: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  unset: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

function urgencyLabel(u: ComplianceDoc["urgency"], t: (k: string) => string) {
  switch (u) {
    case "expired": return t("settings.compliance.urgency_expired");
    case "critical": return t("settings.compliance.urgency_critical");
    case "soon": return t("settings.compliance.urgency_soon");
    case "ok": return t("settings.compliance.urgency_ok");
    default: return t("settings.compliance.urgency_unset");
  }
}

function saveErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const IMAGE_RE = /\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i;
const PDF_RE = /\.pdf(\?|$)/i;

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  try {
    const token = window.localStorage.getItem("access_token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  } catch { /* SSR or storage error */ }
  return headers;
}

async function postFormData(path: string, formData: FormData): Promise<unknown> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: formData,
  });
  if (!response.ok) {
    let message = "Upload failed";
    try {
      const err = await response.json();
      message = err?.error || err?.message || err?.detail || message;
    } catch { /* ignore parse error */ }
    throw new Error(message);
  }
  return response.json();
}

function isImage(filename: string, mime?: string): boolean {
  return IMAGE_RE.test(filename) || (mime || "").startsWith("image/");
}

function isPdf(filename: string, mime?: string): boolean {
  return PDF_RE.test(filename) || mime === "application/pdf";
}

export default function ComplianceDocumentsSettings() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [docs, setDocs] = useState<ComplianceDoc[]>([]);
  const [uploads, setUploads] = useState<TenantUpload[]>([]);
  const [types, setTypes] = useState<DocType[]>([]);
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState("INSURANCE");
  const [expiresAt, setExpiresAt] = useState("");
  const [remindDays, setRemindDays] = useState("30");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [viewerDoc, setViewerDoc] = useState<ComplianceDoc | null>(null);
  const [attachingId, setAttachingId] = useState<string | null>(null);
  const [miyaUploadsOpen, setMiyaUploadsOpen] = useState(false);
  const attachFileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, uploadRes] = await Promise.all([
        api.get("/payroll/compliance-documents/"),
        api.getDashboardTenantDocuments(30).catch(() => ({ success: false, documents: [], count: 0 })),
      ]);
      const data = res.data || {};
      setDocs(Array.isArray(data.documents) ? data.documents : []);
      setTypes(Array.isArray(data.document_types) ? data.document_types : []);
      const udocs = Array.isArray(uploadRes?.documents) ? uploadRes.documents : [];
      setUploads(
        udocs.map((d: Record<string, unknown>) => ({
          id: String(d.id ?? ""),
          title: String(d.title ?? "Document"),
          category: typeof d.category === "string" ? d.category : undefined,
          summary: typeof d.summary === "string" ? d.summary : undefined,
          vendor: typeof d.vendor === "string" ? d.vendor : null,
          amount: d.amount != null ? String(d.amount) : null,
          currency: typeof d.currency === "string" ? d.currency : null,
          expiry_date: typeof d.expiry_date === "string" ? d.expiry_date : null,
          file_url: typeof d.file_url === "string" ? d.file_url : undefined,
          created_at: typeof d.created_at === "string" ? d.created_at : null,
          mime_type: typeof d.mime_type === "string" ? d.mime_type : undefined,
        })),
      );
    } catch {
      toast.error(t("settings.compliance.load_error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const seedStarters = async () => {
    setSaving(true);
    try {
      const res = await api.post("/payroll/compliance-documents/seed/");
      toast.success(res.data?.message || t("settings.compliance.seed_ok"));
      await load();
    } catch (err) {
      toast.error(saveErrorMessage(err, t("settings.compliance.save_error")));
    } finally {
      setSaving(false);
    }
  };

  const addDoc = async () => {
    if (!title.trim()) {
      toast.error(t("settings.compliance.title_required"));
      return;
    }
    setSaving(true);
    try {
      if (selectedFile) {
        const formData = new FormData();
        formData.append("title", title.trim());
        formData.append("document_type", documentType);
        if (expiresAt) formData.append("expires_at", expiresAt);
        formData.append("remind_days_before", String(Number(remindDays) || 30));
        formData.append("file", selectedFile);
        await postFormData("/payroll/compliance-documents/", formData);
      } else {
        await api.post("/payroll/compliance-documents/", {
          title: title.trim(),
          document_type: documentType,
          expires_at: expiresAt || null,
          remind_days_before: Number(remindDays) || 30,
        });
      }
      setTitle("");
      setExpiresAt("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success(t("settings.compliance.added"));
      await load();
    } catch (err) {
      toast.error(saveErrorMessage(err, t("settings.compliance.save_error")));
    } finally {
      setSaving(false);
    }
  };

  const updateExpiry = async (id: string, value: string) => {
    try {
      await api.patch(`/payroll/compliance-documents/${id}/`, {
        expires_at: value || null,
      });
      await load();
      toast.success(t("settings.compliance.updated"));
    } catch (err) {
      toast.error(saveErrorMessage(err, t("settings.compliance.save_error")));
    }
  };

  const archiveDoc = async (id: string) => {
    try {
      await api.delete(`/payroll/compliance-documents/${id}/`);
      await load();
      toast.success(t("settings.compliance.archived"));
    } catch (err) {
      toast.error(saveErrorMessage(err, t("settings.compliance.save_error")));
    }
  };

  const attachFile = async (docId: string, file: File) => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await postFormData(`/payroll/compliance-documents/${docId}/attach/`, formData);
      toast.success("Document attached.");
      await load();
    } catch (err) {
      toast.error(saveErrorMessage(err, "Failed to attach file."));
    } finally {
      setSaving(false);
      setAttachingId(null);
    }
  };

  const removeFile = async (docId: string) => {
    try {
      await api.post(`/payroll/compliance-documents/${docId}/remove-file/`);
      toast.success("Attachment removed.");
      await load();
    } catch (err) {
      toast.error(saveErrorMessage(err, "Failed to remove file."));
    }
  };

  const handleAttachClick = (docId: string) => {
    setAttachingId(docId);
    setTimeout(() => attachFileRef.current?.click(), 50);
  };

  const handleAttachChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && attachingId) {
      void attachFile(attachingId, file);
    }
    e.target.value = "";
  };

  return (
    <SettingsSection
      icon={<FileWarning className="h-4 w-4" />}
      iconClassName="bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300"
      title={t("settings.compliance.title")}
      description={t("settings.compliance.description")}
    >
      <div className="space-y-6">
        <input
          ref={attachFileRef}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.tiff,.tif"
          onChange={handleAttachChange}
        />

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saving || loading}
            onClick={() => void seedStarters()}
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileWarning className="h-4 w-4 mr-2" />}
            {t("settings.compliance.seed_starters")}
          </Button>
        </div>

        {/* Add a document form */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {t("settings.compliance.add_title")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="comp-title">{t("settings.compliance.field_title")}</Label>
              <Input
                id="comp-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("settings.compliance.title_placeholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("settings.compliance.field_type")}</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(types.length
                    ? types
                    : [
                        { id: "INSURANCE", label: "Insurance" },
                        { id: "HYGIENE", label: "Hygiene" },
                        { id: "FIRE_EXTINGUISHER", label: "Fire extinguisher" },
                        { id: "BUSINESS_REGISTRATION", label: "Business registration" },
                        { id: "OTHER", label: "Other" },
                      ]
                  ).map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="comp-exp">{t("settings.compliance.field_expires")}</Label>
              <Input
                id="comp-exp"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>

          {/* File upload */}
          <div className="space-y-1.5">
            <Label>Document</Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                Choose file
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.tiff,.tif"
                onChange={(e) => {
                  setSelectedFile(e.target.files?.[0] || null);
                }}
              />
              {selectedFile ? (
                <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <Paperclip className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                  <span className="text-xs text-slate-400">{formatFileSize(selectedFile.size)}</span>
                  <button
                    type="button"
                    className="text-slate-400 hover:text-rose-500"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <span className="text-xs text-slate-400">PDF, JPG, PNG, WEBP (max 25 MB)</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5 w-28">
              <Label htmlFor="comp-remind">{t("settings.compliance.field_remind")}</Label>
              <Input
                id="comp-remind"
                type="number"
                min={1}
                max={365}
                value={remindDays}
                onChange={(e) => setRemindDays(e.target.value)}
              />
            </div>
            <Button type="button" className="premium-button" disabled={saving} onClick={() => void addDoc()}>
              <Plus className="h-4 w-4 mr-2" />
              {t("settings.compliance.add_btn")}
            </Button>
          </div>
        </div>

        {/* Document list */}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500 py-8 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("settings.compliance.loading")}
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-10 text-sm text-slate-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-slate-400" />
            <p className="font-medium text-slate-700 dark:text-slate-200 mb-1">
              {t("settings.compliance.empty_title")}
            </p>
            <p className="max-w-md mx-auto">{t("settings.compliance.empty_desc")}</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {docs.map((doc) => (
              <li key={doc.id} className="px-4 py-3 bg-card space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                        {doc.title}
                      </p>
                      <span
                        className={cn(
                          "rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          urgencyStyles[doc.urgency],
                        )}
                      >
                        {urgencyLabel(doc.urgency, t)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {types.find((x) => x.id === doc.document_type)?.label || doc.document_type}
                      {doc.days_until_expiry != null
                        ? doc.days_until_expiry < 0
                          ? ` · ${t("settings.compliance.days_ago", { n: -doc.days_until_expiry })}`
                          : ` · ${t("settings.compliance.days_left", { n: doc.days_until_expiry })}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="relative">
                      <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      <Input
                        type="date"
                        className="h-9 w-[150px] pl-7 text-xs"
                        value={doc.expires_at || ""}
                        onChange={(e) => void updateExpiry(doc.id, e.target.value)}
                        aria-label={t("settings.compliance.field_expires")}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-slate-400 hover:text-rose-600"
                      onClick={() => void archiveDoc(doc.id)}
                      aria-label={t("settings.compliance.archive")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Attachment section */}
                {doc.has_file && doc.attachment ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <Paperclip className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate max-w-[250px] font-medium">
                      {doc.attachment.filename || "Attached document"}
                    </span>
                    {doc.attachment.size ? (
                      <span className="text-slate-400">{formatFileSize(doc.attachment.size)}</span>
                    ) : null}
                    <div className="flex items-center gap-1 ml-auto">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 text-xs"
                        onClick={() => setViewerDoc(doc)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Button>
                      {doc.attachment.resolved_url ? (
                        <a
                          href={doc.attachment.resolved_url}
                          download={doc.attachment.filename}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </Button>
                        </a>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 text-xs"
                        onClick={() => handleAttachClick(doc.id)}
                        disabled={saving}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Replace
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Paperclip className="h-3.5 w-3.5 shrink-0" />
                    <span>No document attached</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 text-xs ml-auto"
                      onClick={() => handleAttachClick(doc.id)}
                      disabled={saving}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Attach document
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Miya uploads section (collapsed by default) */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-700 space-y-3">
          <button
            type="button"
            className="w-full flex items-start justify-between gap-3 text-left rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/40 px-1 py-1 -mx-1"
            onClick={() => setMiyaUploadsOpen((open) => !open)}
            aria-expanded={miyaUploadsOpen}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {t("settings.compliance.miya_uploads_title")}
                {uploads.length > 0 ? (
                  <span className="ml-2 text-xs font-medium text-slate-500">
                    ({uploads.length})
                  </span>
                ) : null}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {t("settings.compliance.miya_uploads_desc")}
              </p>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-slate-400 mt-1 transition-transform",
                miyaUploadsOpen && "rotate-180",
              )}
            />
          </button>
          {miyaUploadsOpen ? (
            uploads.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">
                {t("settings.compliance.miya_uploads_empty")}
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {uploads.map((u) => (
                  <li
                    key={u.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 bg-card"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                        {u.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {[u.category, u.vendor, u.amount ? `${u.amount}${u.currency ? ` ${u.currency}` : ""}` : null, u.expiry_date ? `expires ${u.expiry_date}` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {u.summary ? (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{u.summary}</p>
                      ) : null}
                    </div>
                    {u.file_url ? (
                      <a
                        href={u.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:underline shrink-0"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </div>
      </div>

      {/* Document Viewer Dialog */}
      <Dialog open={!!viewerDoc} onOpenChange={(open) => !open && setViewerDoc(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="truncate">{viewerDoc?.title}</DialogTitle>
          </DialogHeader>
          {viewerDoc?.attachment ? (
            <div className="flex-1 min-h-0 overflow-auto space-y-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div className="text-slate-500">Document type</div>
                <div>{types.find((x) => x.id === viewerDoc.document_type)?.label || viewerDoc.document_type}</div>
                <div className="text-slate-500">Expiry date</div>
                <div>{viewerDoc.expires_at || "Not set"}</div>
                {viewerDoc.attachment.uploaded_at ? (
                  <>
                    <div className="text-slate-500">Uploaded</div>
                    <div>{new Date(viewerDoc.attachment.uploaded_at).toLocaleDateString()}</div>
                  </>
                ) : null}
                <div className="text-slate-500">Filename</div>
                <div className="truncate">{viewerDoc.attachment.filename}</div>
                {viewerDoc.attachment.size ? (
                  <>
                    <div className="text-slate-500">Size</div>
                    <div>{formatFileSize(viewerDoc.attachment.size)}</div>
                  </>
                ) : null}
              </div>

              {viewerDoc.attachment.resolved_url ? (
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-900">
                  {isImage(viewerDoc.attachment.filename, viewerDoc.attachment.mime_type) ? (
                    <img
                      src={viewerDoc.attachment.resolved_url}
                      alt={viewerDoc.title}
                      className="max-h-[50vh] w-auto mx-auto object-contain"
                    />
                  ) : isPdf(viewerDoc.attachment.filename, viewerDoc.attachment.mime_type) ? (
                    <iframe
                      src={viewerDoc.attachment.resolved_url}
                      title={viewerDoc.title}
                      className="w-full h-[50vh] border-0"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-sm text-slate-500">
                      <Paperclip className="h-8 w-8 text-slate-300" />
                      <p>Preview not available for this file type.</p>
                      <a
                        href={viewerDoc.attachment.resolved_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Button variant="outline" size="sm" className="gap-1.5">
                          <Download className="h-4 w-4" />
                          Download file
                        </Button>
                      </a>
                    </div>
                  )}
                </div>
              ) : null}

              {viewerDoc.attachment.resolved_url ? (
                <div className="flex justify-end gap-2">
                  <a
                    href={viewerDoc.attachment.resolved_url}
                    download={viewerDoc.attachment.filename}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </a>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-slate-500 py-8 text-center">No attachment available.</p>
          )}
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
