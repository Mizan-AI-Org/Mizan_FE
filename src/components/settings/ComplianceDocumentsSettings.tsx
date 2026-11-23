import { shrinkPhoto } from "@/lib/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { api, API_BASE, resolveMediaUrl } from "@/lib/api";
import i18n from "@/i18n";
import {
  AttachmentViewerModal,
  type AttachmentViewerState,
} from "@/components/ui/attachment-preview";
import { useLanguage } from "@/hooks/use-language";
import { toast } from "sonner";
import {
  AlertTriangle,
  Calendar,
  Download,
  Eye,
  FileWarning,
  Loader2,
  Paperclip,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  X,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/localeTag";
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
  category?: string | null;
  expires_at?: string | null;
  expires_on?: string | null;
  days_until_expiry?: number | null;
  urgency: "expired" | "critical" | "soon" | "ok" | "unset";
  has_file?: boolean;
  file_url?: string;
  attachment?: AttachmentInfo | null;
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
    let message = i18n.t("settings.compliance.upload_failed");
    try {
      const err = await response.json();
      message = err?.error || err?.message || err?.detail || message;
    } catch { /* ignore parse error */ }
    throw new Error(message);
  }
  return response.json();
}

function dateInputValue(value?: string | null): string {
  if (!value) return "";
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] || "";
}

function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "");
  return base.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function complianceAttachmentUrl(doc: ComplianceDoc): string {
  const raw = (
    doc.attachment?.resolved_url?.trim() ||
    doc.file_url?.trim() ||
    ""
  );
  return resolveMediaUrl(raw);
}

type TFn = (key: string) => string;

/** Document-type label in the UI language; the backend list is English-only, so known ids map to locale keys. */
function localizedTypeLabel(id: string, label: string, t: TFn): string {
  const key = `settings.compliance.type_${String(id).trim().toLowerCase()}`;
  const translated = t(key);
  return translated && translated !== key ? translated : label;
}

function typeLabel(doc: ComplianceDoc, types: DocType[], t: TFn): string {
  const raw = (doc.document_type || doc.category || "").trim();
  const match = types.find(
    (item) =>
      item.id.toLowerCase() === raw.toLowerCase() || item.label.toLowerCase() === raw.toLowerCase(),
  );
  if (match) return localizedTypeLabel(match.id, match.label, t);
  if (!raw || raw.toLowerCase() === "compliance") {
    if (/insur/i.test(doc.title)) return t("settings.compliance.type_insurance");
    return t("settings.compliance.type_compliance");
  }
  return raw.replace(/[_-]+/g, " ");
}

export default function ComplianceDocumentsSettings({
  surface = "settings",
}: {
  surface?: "settings" | "operations";
}) {
  const { t } = useLanguage();
  const isOperations = surface === "operations";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addFormOpen, setAddFormOpen] = useState(!isOperations);
  const [docs, setDocs] = useState<ComplianceDoc[]>([]);
  const [types, setTypes] = useState<DocType[]>([]);
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState("INSURANCE");
  const [expiresAt, setExpiresAt] = useState("");
  const [remindDays, setRemindDays] = useState("30");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [viewerAttachment, setViewerAttachment] = useState<AttachmentViewerState | null>(
    null,
  );
  const [viewerDoc, setViewerDoc] = useState<ComplianceDoc | null>(null);
  const [attachingId, setAttachingId] = useState<string | null>(null);
  const attachFileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/payroll/compliance-documents/");
      const data = res.data || {};
      setDocs(Array.isArray(data.documents) ? data.documents : []);
      setTypes(Array.isArray(data.document_types) ? data.document_types : []);
    } catch {
      toast.error(t("settings.compliance.load_error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (isOperations && !loading && docs.length === 0) {
      setAddFormOpen(true);
    }
  }, [isOperations, loading, docs.length]);

  const resetAddForm = useCallback(() => {
    setTitle("");
    setExpiresAt("");
    setRemindDays("30");
    setDocumentType("INSURANCE");
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const stats = useMemo(() => {
    const tallies = { expired: 0, critical: 0, soon: 0, ok: 0, unset: 0 };
    for (const doc of docs) {
      tallies[doc.urgency] += 1;
    }
    return tallies;
  }, [docs]);

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
        formData.append("file", await shrinkPhoto(selectedFile));
        await postFormData("/payroll/compliance-documents/", formData);
      } else {
        await api.post("/payroll/compliance-documents/", {
          title: title.trim(),
          document_type: documentType,
          expires_at: expiresAt || null,
          remind_days_before: Number(remindDays) || 30,
        });
      }
      resetAddForm();
      if (isOperations) setAddFormOpen(false);
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
      formData.append("file", await shrinkPhoto(file));
      await postFormData(`/payroll/compliance-documents/${docId}/attach/`, formData);
      toast.success(t("generic.toast.document_attached"));
      await load();
    } catch (err) {
      toast.error(saveErrorMessage(err, t("settings.compliance.attach_failed")));
    } finally {
      setSaving(false);
      setAttachingId(null);
    }
  };

  const removeFile = async (docId: string) => {
    try {
      await api.post(`/payroll/compliance-documents/${docId}/remove-file/`);
      toast.success(t("generic.toast.attachment_removed"));
      await load();
    } catch (err) {
      toast.error(saveErrorMessage(err, t("settings.compliance.remove_failed")));
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

  const seedButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="shrink-0"
      disabled={saving || loading}
      onClick={() => void seedStarters()}
    >
      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileWarning className="h-4 w-4 mr-2" />}
      {t("settings.compliance.seed_starters")}
    </Button>
  );

  const operationsHeader = isOperations ? (
    <div className="min-w-0 space-y-1">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        {t("settings.compliance.title")}
      </h2>
      <p className="text-sm text-muted-foreground">{t("settings.compliance.description")}</p>
    </div>
  ) : null;

  const statsStrip = isOperations && !loading ? (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {(
        [
          {
            key: "expired",
            count: stats.expired,
            label: urgencyLabel("expired", t),
            box: "border-rose-500/25 bg-rose-500/10",
          },
          {
            key: "critical",
            count: stats.critical,
            label: urgencyLabel("critical", t),
            box: "border-amber-500/25 bg-amber-500/10",
          },
          {
            key: "soon",
            count: stats.soon,
            label: urgencyLabel("soon", t),
            box: "border-orange-500/25 bg-orange-500/10",
          },
          {
            key: "ok",
            count: stats.ok + stats.unset,
            label: t("operations_live.compliance.on_file"),
            box: "border-emerald-500/25 bg-emerald-500/10",
          },
        ] as const
      ).map((item) => (
        <div key={item.key} className={cn("rounded-lg border px-3 py-2 text-center", item.box)}>
          <p className="text-lg font-semibold tabular-nums text-foreground">{item.count}</p>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{item.label}</p>
        </div>
      ))}
    </div>
  ) : null;

  const body = (
      <div className="space-y-6">
        <input
          ref={attachFileRef}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.tiff,.tif"
          onChange={handleAttachChange}
        />

        {isOperations && !addFormOpen ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">
              {t("operations_live.compliance.documents_on_file")}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setAddFormOpen(true)}
            >
              <Plus className="h-4 w-4" aria-hidden />
              {t("settings.compliance.new_document_btn")}
            </Button>
          </div>
        ) : null}

        {/* Add a document form */}
        {(addFormOpen || !isOperations) ? (
        <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">{t("settings.compliance.add_title")}</p>
            {isOperations ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 text-muted-foreground"
                onClick={() => {
                  resetAddForm();
                  setAddFormOpen(false);
                }}
              >
                {t("operations_live.compliance.hide_form")}
              </Button>
            ) : null}
          </div>
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
                        { id: "INSURANCE", label: t("settings.compliance.type_insurance") },
                        { id: "HYGIENE", label: t("settings.compliance.type_hygiene") },
                        { id: "FIRE_EXTINGUISHER", label: t("settings.compliance.type_fire_extinguisher") },
                        { id: "BUSINESS_REGISTRATION", label: t("settings.compliance.type_business_registration") },
                        { id: "OTHER", label: t("settings.compliance.type_other") },
                      ]
                  ).map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {localizedTypeLabel(opt.id, opt.label, t)}
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
            <Label htmlFor="comp-file">{t("settings.compliance.field_file")}</Label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 w-fit"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                {t("settings.compliance.choose_file")}
              </Button>
              <input
                id="comp-file"
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.tiff,.tif"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setSelectedFile(file);
                  if (file && !title.trim()) {
                    setTitle(titleFromFilename(file.name));
                  }
                  if (file && isOperations) setAddFormOpen(true);
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
                    aria-label={t("settings.compliance.remove_file")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <span className="text-xs text-slate-400">{t("settings.compliance.file_hint")}</span>
              )}
            </div>
          </div>

          <div className="space-y-1.5 w-full sm:max-w-[10rem]">
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

          <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {!title.trim()
                ? t("settings.compliance.save_requires_name")
                : selectedFile
                  ? t("settings.compliance.save_ready_with_file")
                  : t("settings.compliance.save_ready_no_file")}
            </p>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => {
                  resetAddForm();
                  if (isOperations) setAddFormOpen(false);
                }}
              >
                {t("generic.cancel")}
              </Button>
              <Button
                type="button"
                disabled={saving || !title.trim()}
                className="gap-1.5 min-w-[9rem]"
                onClick={() => void addDoc()}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Save className="h-4 w-4" aria-hidden />
                )}
                {t("settings.compliance.save_btn")}
              </Button>
            </div>
          </div>
        </div>
        ) : null}

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
            <p className="max-w-md mx-auto mb-4">{t("settings.compliance.empty_desc")}</p>
            {!addFormOpen ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={saving}
                onClick={() => void seedStarters()}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <FileWarning className="h-4 w-4" aria-hidden />
                )}
                {t("settings.compliance.seed_starters")}
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            {isOperations ? (
              <p className="text-sm font-medium text-foreground">
                {t("operations_live.compliance.documents_on_file")}
              </p>
            ) : null}
          <ul
            className={cn(
              isOperations
                ? "grid gap-3 md:grid-cols-2"
                : "divide-y divide-border rounded-xl border border-border overflow-hidden",
            )}
          >
            {docs.map((doc) => (
              <li
                key={doc.id}
                className={cn(
                  "space-y-2 bg-card",
                  isOperations
                    ? "rounded-xl border border-border/70 p-4 shadow-xs"
                    : "px-4 py-3",
                )}
              >
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
                      {typeLabel(doc, types, t)}
                      {doc.days_until_expiry != null
                        ? doc.days_until_expiry < 0
                          ? ` · ${t("settings.compliance.days_ago", { n: -doc.days_until_expiry })}`
                          : ` · ${t("settings.compliance.days_left", { n: doc.days_until_expiry })}`
                        : ""}
                      {dateInputValue(doc.expires_on || doc.expires_at)
                        ? ` · ${formatDate(new Date(`${dateInputValue(doc.expires_on || doc.expires_at)}T12:00:00`))}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="relative">
                      <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      <Input
                        type="date"
                        className="h-9 w-[150px] pl-7 text-xs [color-scheme:dark]"
                        value={dateInputValue(doc.expires_on || doc.expires_at)}
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
                      {doc.attachment.filename || t("settings.compliance.attached_document")}
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
                        onClick={() => {
                          const url = complianceAttachmentUrl(doc);
                          if (!url) {
                            toast.error(t("settings.compliance.preview_unavailable"));
                            return;
                          }
                          setViewerDoc(doc);
                          setViewerAttachment({
                            url,
                            name: doc.attachment?.filename || doc.title,
                            label: "document",
                          });
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {t("common.view")}
                      </Button>
                      {complianceAttachmentUrl(doc) ? (
                        <a
                          href={complianceAttachmentUrl(doc)}
                          download={doc.attachment.filename}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                            <Download className="h-3.5 w-3.5" />
                            {t("common.download")}
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
                        {t("common.replace")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Paperclip className="h-3.5 w-3.5 shrink-0" />
                    <span>{t("settings.compliance.no_document")}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 text-xs ml-auto"
                      onClick={() => handleAttachClick(doc.id)}
                      disabled={saving}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {t("settings.compliance.attach_document")}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          </div>
        )}
      </div>
  );

  const viewer = (
    <AttachmentViewerModal
      open={!!viewerAttachment}
      onOpenChange={(open) => {
        if (!open) {
          setViewerAttachment(null);
          setViewerDoc(null);
        }
      }}
      attachment={viewerAttachment}
      details={
        viewerDoc ? (
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <div className="text-muted-foreground">{t("settings.compliance.document_type")}</div>
            <div>{(() => { const m = types.find((x) => x.id === viewerDoc.document_type); return m ? localizedTypeLabel(m.id, m.label, t) : viewerDoc.document_type; })()}</div>
            {viewerDoc.expires_at ? (
              <>
                <div className="text-muted-foreground">{t("settings.compliance.field_expires")}</div>
                <div>{formatDate(new Date(viewerDoc.expires_at))}</div>
              </>
            ) : null}
            {viewerDoc.attachment?.uploaded_at ? (
              <>
                <div className="text-muted-foreground">{t("settings.compliance.uploaded")}</div>
                <div>{formatDate(new Date(viewerDoc.attachment.uploaded_at))}</div>
              </>
            ) : null}
            {viewerDoc.attachment?.filename ? (
              <>
                <div className="text-muted-foreground">{t("settings.compliance.filename")}</div>
                <div className="truncate">{viewerDoc.attachment.filename}</div>
              </>
            ) : null}
            {viewerDoc.attachment?.size ? (
              <>
                <div className="text-muted-foreground">{t("settings.compliance.size")}</div>
                <div>{formatFileSize(viewerDoc.attachment.size)}</div>
              </>
            ) : null}
          </div>
        ) : null
      }
    />
  );

  if (isOperations) {
    return (
      <div className="space-y-5">
        {operationsHeader}
        {statsStrip}
        {body}
        {viewer}
      </div>
    );
  }

  return (
    <SettingsSection
      icon={<FileWarning className="h-4 w-4" />}
      iconClassName="bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300"
      title={t("settings.compliance.title")}
      description={t("settings.compliance.description")}
      actions={seedButton}
    >
      {body}
      {viewer}
    </SettingsSection>
  );
}
