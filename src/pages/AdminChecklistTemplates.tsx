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

const TEMPLATES = [
  { id: "food-safety-basic", name: "Food Safety - Basic", description: "Daily food safety checklist", role: "STAFF" },
  { id: "opening-checklist", name: "Opening Checklist", description: "Pre-opening checks for the shift", role: "STAFF" },
  { id: "closing-checklist", name: "Closing Checklist", description: "End-of-day closing checks", role: "STAFF" },
];

const AdminChecklistTemplates: React.FC = () => {
  const { user, accessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffProfileItem[]>([]);
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(TEMPLATES[0].id);
  const [dueDate, setDueDate] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const token = accessToken || localStorage.getItem("access_token");
        if (!token) {
          toast.error("Missing access token. Please log in again.");
          return;
        }
        const profiles = await api.getStaffProfiles(token);
        setStaff(profiles);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unable to load staff";
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const selectedTemplate = useMemo(() => TEMPLATES.find(t => t.id === selectedTemplateId)!, [selectedTemplateId]);

  const assignChecklist = async () => {
    if (!assigneeId) { toast.error("Please choose an assignee"); return; }
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
        toast.error("Missing access token. Please log in again.");
        return;
      }
      const task = await api.createShiftTask(token, payload);
      await api.ensureChecklistForTask(task.id);
      toast.success("Checklist task assigned and linked");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to assign checklist";
      toast.error(msg);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Checklist Templates</h2>
          <p className="text-sm text-muted-foreground">Assign templates to staff and link to tasks</p>
        </div>
        {user?.role && <Badge variant="secondary">Role: {user.role}</Badge>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assign Template</CardTitle>
          <CardDescription>Choose a template and assignee</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="template">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="template">Template</TabsTrigger>
              <TabsTrigger value="assignee">Assignee</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
            </TabsList>
            <TabsContent value="template" className="mt-3">
              <div className="grid gap-3">
                <Label>Template</Label>
                <select className="border rounded-md h-9 px-2" value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)}>
                  {TEMPLATES.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <div className="text-sm text-muted-foreground">{selectedTemplate.description}</div>
              </div>
            </TabsContent>
            <TabsContent value="assignee" className="mt-3">
              <div className="grid gap-3">
                <Label>Assign To</Label>
                <select className="border rounded-md h-9 px-2" value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
                  <option value="">Select staff…</option>
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
                <Label>Due Date</Label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            </TabsContent>
          </Tabs>
          <div className="flex items-center justify-end gap-2">
            <Button onClick={assignChecklist} disabled={loading || !assigneeId}>Assign</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available Templates</CardTitle>
          <CardDescription>Predefined templates for quick assignment</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-3">
          {TEMPLATES.map(t => (
            <div key={t.id} className="border rounded-md p-3">
              <div className="font-medium">{t.name}</div>
              <div className="text-xs text-muted-foreground">{t.description}</div>
              <div className="mt-2">
                <Badge variant="outline" className="text-xs">Role: {t.role}</Badge>
              </div>
              <div className="mt-3">
                <Button variant="secondary" size="sm" onClick={() => setSelectedTemplateId(t.id)}>Use</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminChecklistTemplates;