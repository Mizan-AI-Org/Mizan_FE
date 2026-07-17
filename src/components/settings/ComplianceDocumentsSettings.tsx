import { useCallback, useEffect, useState } from "react";
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
import { api } from "@/lib/api";
import { useLanguage } from "@/hooks/use-language";
import { toast } from "sonner";
import {
  AlertTriangle,
  Calendar,
  FileWarning,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type DocType = { id: string; label: string };

type ComplianceDoc = {
  id: string;
  title: string;
  document_type: string;
  description?: string;
  reference_number?: string;
  expires_at: string | null;
  days_until_expiry: number | null;
  urgency: "expired" | "critical" | "soon" | "ok" | "unset";
  remind_days_before: number;
  status: string;
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
    case "expired":
      return t("settings.compliance.urgency_expired");
    case "critical":
      return t("settings.compliance.urgency_critical");
    case "soon":
      return t("settings.compliance.urgency_soon");
    case "ok":
      return t("settings.compliance.urgency_ok");
    default:
      return t("settings.compliance.urgency_unset");
  }
}

export default function ComplianceDocumentsSettings() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [docs, setDocs] = useState<ComplianceDoc[]>([]);
  const [types, setTypes] = useState<DocType[]>([]);
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState("INSURANCE");
  const [expiresAt, setExpiresAt] = useState("");
  const [remindDays, setRemindDays] = useState("30");

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

  const seedStarters = async () => {
    setSaving(true);
    try {
      const res = await api.post("/payroll/compliance-documents/seed/");
      toast.success(res.data?.message || t("settings.compliance.seed_ok"));
      await load();
    } catch {
      toast.error(t("settings.compliance.save_error"));
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
      await api.post("/payroll/compliance-documents/", {
        title: title.trim(),
        document_type: documentType,
        expires_at: expiresAt || null,
        remind_days_before: Number(remindDays) || 30,
      });
      setTitle("");
      setExpiresAt("");
      toast.success(t("settings.compliance.added"));
      await load();
    } catch {
      toast.error(t("settings.compliance.save_error"));
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
    } catch {
      toast.error(t("settings.compliance.save_error"));
    }
  };

  const archiveDoc = async (id: string) => {
    try {
      await api.delete(`/payroll/compliance-documents/${id}/`);
      await load();
      toast.success(t("settings.compliance.archived"));
    } catch {
      toast.error(t("settings.compliance.save_error"));
    }
  };

  return (
    <SettingsSection
      icon={<FileWarning className="h-4 w-4" />}
      iconClassName="bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300"
      title={t("settings.compliance.title")}
      description={t("settings.compliance.description")}
    >
      <div className="space-y-6">
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
              <li
                key={doc.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900"
              >
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </SettingsSection>
  );
}
