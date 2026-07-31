import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/hooks/use-language";

type Props = {
  step: { type: string; config: Record<string, unknown> };
  onChange: (config: Record<string, unknown>) => void;
};

export function AutomationStepEditor({ step, onChange }: Props) {
  const { t } = useLanguage();
  const cfg = step.config || {};

  if (step.type === "send_message") {
    return (
      <div className="space-y-2">
        <Textarea
          placeholder={t("automations.builder.message_placeholder")}
          value={String(cfg.text || "")}
          onChange={(e) => onChange({ ...cfg, text: e.target.value })}
          className="min-h-[88px] text-sm"
        />
        <p className="text-[11px] text-slate-500">{t("automations.builder.variables_hint")}</p>
      </div>
    );
  }

  if (step.type === "send_template") {
    return (
      <Input
        placeholder={t("automations.builder.template_placeholder")}
        value={String(cfg.template_name || "")}
        onChange={(e) => onChange({ ...cfg, template_name: e.target.value })}
      />
    );
  }

  if (step.type === "add_tag" || step.type === "remove_tag") {
    return (
      <Input
        placeholder={t("automations.builder.tag_placeholder")}
        value={String(cfg.tag || "")}
        onChange={(e) => onChange({ ...cfg, tag: e.target.value })}
      />
    );
  }

  if (step.type === "assign_conversation") {
    return (
      <Input
        placeholder={t("automations.builder.staff_placeholder")}
        value={String(cfg.staff_id || "")}
        onChange={(e) => onChange({ ...cfg, staff_id: e.target.value })}
      />
    );
  }

  if (step.type === "update_contact_field") {
    return (
      <Textarea
        placeholder={t("automations.builder.note_placeholder")}
        value={String(cfg.note || "")}
        onChange={(e) => onChange({ ...cfg, note: e.target.value })}
        className="min-h-[72px] text-sm"
      />
    );
  }

  if (step.type === "create_task") {
    return (
      <div className="space-y-2">
        <Input
          placeholder={t("automations.builder.task_title_placeholder")}
          value={String(cfg.title || "")}
          onChange={(e) => onChange({ ...cfg, title: e.target.value })}
        />
        <Textarea
          placeholder={t("automations.builder.task_desc_placeholder")}
          value={String(cfg.description || "")}
          onChange={(e) => onChange({ ...cfg, description: e.target.value })}
          className="min-h-[60px] text-sm"
        />
        <Select
          value={String(cfg.priority || "MEDIUM")}
          onValueChange={(v) => onChange({ ...cfg, priority: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (step.type === "create_staff_request") {
    return (
      <div className="space-y-2">
        <Select
          value={String(cfg.category || "OPERATIONS")}
          onValueChange={(v) => onChange({ ...cfg, category: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["OPERATIONS", "SCHEDULING", "SAFETY", "HR", "FINANCE"].map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder={t("automations.builder.request_subject_placeholder")}
          value={String(cfg.subject || "")}
          onChange={(e) => onChange({ ...cfg, subject: e.target.value })}
        />
        <Textarea
          placeholder={t("automations.builder.request_desc_placeholder")}
          value={String(cfg.description || "")}
          onChange={(e) => onChange({ ...cfg, description: e.target.value })}
          className="min-h-[60px] text-sm"
        />
      </div>
    );
  }

  if (step.type === "wait") {
    return (
      <div className="flex items-center gap-2">
        <Label className="text-xs shrink-0">{t("automations.builder.wait_seconds")}</Label>
        <Input
          type="number"
          min={1}
          max={86400}
          value={Number(cfg.seconds || 60)}
          onChange={(e) => onChange({ ...cfg, seconds: Number(e.target.value) || 60 })}
          className="w-28"
        />
      </div>
    );
  }

  if (step.type === "condition") {
    return (
      <div className="space-y-2">
        <Input
          placeholder={t("automations.builder.keywords_placeholder")}
          value={(Array.isArray(cfg.keywords) ? cfg.keywords : []).join(", ")}
          onChange={(e) =>
            onChange({
              ...cfg,
              keywords: e.target.value.split(",").map((k) => k.trim()).filter(Boolean),
            })
          }
        />
        <p className="text-[11px] text-slate-500">{t("automations.builder.condition_hint")}</p>
      </div>
    );
  }

  if (step.type === "send_webhook") {
    return (
      <Input
        placeholder={t("automations.builder.webhook_placeholder")}
        value={String(cfg.url || "")}
        onChange={(e) => onChange({ ...cfg, url: e.target.value })}
      />
    );
  }

  if (step.type === "close_conversation") {
    return (
      <p className="text-xs text-slate-500">{t("automations.builder.close_conversation_hint")}</p>
    );
  }

  return (
    <p className="text-xs text-amber-700 dark:text-amber-300">
      {t("automations.builder.unknown_step", { type: step.type })}
    </p>
  );
}
