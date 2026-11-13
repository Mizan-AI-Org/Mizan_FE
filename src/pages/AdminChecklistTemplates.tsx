import i18n from "@/i18n";
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { StaffProfileItem } from "@/lib/types";

import { useLanguage } from "@/hooks/use-language";

// Toasts and labels here were calling a `t` that was never defined (ReferenceError at runtime): translate with the
// app's i18n instance, which follows the current language like useLanguage().
const t = (key: string, options?: Record<string, string | number> | string): string =>
  i18n.t(key, typeof options === "string" ? { defaultValue: options } : options) as string;

const TEMPLATE_DEFS = [
  { id: "food-safety-basic", nameKey: "admin_checklist_templates.tpl.food_safety.name", descKey: "admin_checklist_templates.tpl.food_safety.desc", role: "STAFF" },
  { id: "opening-checklist", nameKey: "admin_checklist_templates.tpl.opening.name", descKey: "admin_checklist_templates.tpl.opening.desc", role: "STAFF" },
  { id: "closing-checklist", nameKey: "admin_checklist_templates.tpl.closing.name", descKey: "admin_checklist_templates.tpl.closing.desc", role: "STAFF" },
];

const getTemplates = () =>
  TEMPLATE_DEFS.map(({ nameKey, descKey, ...rest }) => ({ ...rest, name: t(nameKey), description: t(descKey) }));

const AdminChecklistTemplates: React.FC = () => {
  const { user, accessToken } = useAuth();
  const { language } = useLanguage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const TEMPLATES = useMemo(() => getTemplates(), [language]);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffProfileItem[]>([]);
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(TEMPLATE_DEFS[0].id);
  const [dueDate, setDueDate] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const token = accessToken || localStorage.getItem("access_token");
        if (!token) {
          toast.error(t("generic.toast.missing_access_token_please_log_in_again"));
          return;
        }
        const profiles = await api.getStaffProfiles(token);
        setStaff(profiles);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : t("admin_checklist_templates.error_load_staff");
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const selectedTemplate = useMemo(() => TEMPLATES.find(tpl => tpl.id === selectedTemplateId)!, [TEMPLATES, selectedTemplateId]);

  const assignChecklist = async () => {
    if (!assigneeId) { toast.error(t("generic.toast.please_choose_an_assignee")); return; }
    try {
      const payload = {
        title: selectedTemplate.name,
        description: selectedTemplate.description,
        assigned_to: assigneeId,
        due_date: dueDate || undefined,
        priority: "MEDIUM",
        category: "CHECKLIST",
      };

      const token = accessToken || localStorage.getItem("access_token");
      if (!token) {
        toast.error(t("generic.toast.missing_access_token_please_log_in_again"));
        return;
      }
      const task = await api.createShiftTask(token, payload);
      await api.ensureChecklistForTask(task.id);
      toast.success(t("generic.toast.checklist_task_assigned_and_linked"));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t("admin_checklist_templates.error_assign");
      toast.error(msg);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{t("admin_checklist_templates.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("admin_checklist_templates.subtitle")}</p>
        </div>
        {user?.role && <Badge variant="secondary">{t("admin_checklist_templates.role_label", { role: user.role })}</Badge>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin_checklist_templates.assign_title")}</CardTitle>
          <CardDescription>{t("admin_checklist_templates.assign_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="template">
            <TabsList variant="compact" className="grid w-full grid-cols-3">
              <TabsTrigger variant="compact" value="template">{t("admin_checklist_templates.template")}</TabsTrigger>
              <TabsTrigger variant="compact" value="assignee">{t("generic.assignee")}</TabsTrigger>
              <TabsTrigger variant="compact" value="schedule">{t("admin_checklist_templates.schedule")}</TabsTrigger>
            </TabsList>
            <TabsContent value="template" className="mt-3">
              <div className="grid gap-3">
                <Label>{t("admin_checklist_templates.template")}</Label>
                <select className="border rounded-md h-9 px-2" value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)}>
                  {TEMPLATES.map(tpl => (
                    <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                  ))}
                </select>
                <div className="text-sm text-muted-foreground">{selectedTemplate.description}</div>
              </div>
            </TabsContent>
            <TabsContent value="assignee" className="mt-3">
              <div className="grid gap-3">
                <Label>{t("admin_checklist_templates.assign_to")}</Label>
                <select className="border rounded-md h-9 px-2" value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
                  <option value="">{t("admin_checklist_templates.select_staff")}</option>
                  {staff.map(s => {
                    const name = `${s.user_details.first_name} ${s.user_details.last_name}`.trim();
                    const label = name || s.user_details.email || s.id;
                    return (
                      <option key={s.id} value={s.id}>{label}</option>
                    );
                  })}
                </select>
              </div>
            </TabsContent>
            <TabsContent value="schedule" className="mt-3">
              <div className="grid gap-3">
                <Label>{t("checklist.executor.field_due_date")}</Label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            </TabsContent>
          </Tabs>
          <div className="flex items-center justify-end gap-2">
            <Button onClick={assignChecklist} disabled={loading || !assigneeId}>{t("generic.assign")}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin_checklist_templates.available_title")}</CardTitle>
          <CardDescription>{t("admin_checklist_templates.available_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-3">
          {TEMPLATES.map(tpl => (
            <div key={tpl.id} className="border rounded-md p-3">
              <div className="font-medium">{tpl.name}</div>
              <div className="text-xs text-muted-foreground">{tpl.description}</div>
              <div className="mt-2">
                <Badge variant="outline" className="text-xs">{t("admin_checklist_templates.role_label", { role: tpl.role })}</Badge>
              </div>
              <div className="mt-3">
                <Button variant="secondary" size="sm" onClick={() => setSelectedTemplateId(tpl.id)}>{t("admin_checklist_templates.use")}</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminChecklistTemplates;