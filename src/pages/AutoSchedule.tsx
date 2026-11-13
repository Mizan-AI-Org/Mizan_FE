/* eslint-disable @typescript-eslint/no-explicit-any */
import i18n from "@/i18n";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from "../hooks/use-auth";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { API_BASE } from "@/lib/api";
import { unwrapEnvelope } from "@/lib/envelope";

function asList(payload: unknown): any[] {
  const data = unwrapEnvelope(payload);
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["results", "data", "items"]) {
      if (Array.isArray(obj[key])) return obj[key] as any[];
    }
  }
  return [];
}



import { useLanguage } from "@/hooks/use-language";

// Toasts and labels here were calling a `t` that was never defined (ReferenceError at runtime): translate with the
// app's i18n instance, which follows the current language like useLanguage().
const t = (key: string, options?: Record<string, string | number> | string): string =>
  i18n.t(key, typeof options === "string" ? { defaultValue: options } : options) as string;

interface ScheduleTemplate {
  id: string;
  name: string;
  description: string;
}

interface AutoScheduleResult {
  success: boolean;
  message: string;
  shifts_created?: number;
  conflicts_detected?: number;
}

export const AutoSchedule: React.FC = () => {
  useLanguage(); // re-render on language change (module-level t reads the live i18n instance)
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [weekStart, setWeekStart] = useState<string>("");
  const [laborBudget, setLaborBudget] = useState<string>("");
  const [demandLevel, setDemandLevel] = useState<string>("MEDIUM");
  const [showResults, setShowResults] = useState(false);
  const [scheduleResults, setScheduleResults] =
    useState<AutoScheduleResult | null>(null);

  // Fetch templates
  const { data: templates, isLoading: templatesLoading } = useQuery<
    ScheduleTemplate[]
  >({
    queryKey: ["schedule-templates"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/schedule/templates/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      if (!response.ok) throw new Error(t("auto_schedule.templates_failed"));
      return response.json();
    },
  });

  // Auto-schedule mutation
  const autoScheduleMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`${API_BASE}/schedule/auto-schedule/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || t("auto_schedule.failed"));
      }

      return response.json();
    },
    onSuccess: (data) => {
      setScheduleResults(data);
      setShowResults(true);
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      toast.success(t("generic.toast.schedule_created_successfully"));
    },
    onError: (err: any) => {
      toast.error(t("auto_schedule.error_prefix", { message: err.message }));
      setScheduleResults({ success: false, message: err.message });
      setShowResults(true);
    },
  });

  const handleGenerateSchedule = () => {
    if (!selectedTemplate || !weekStart) {
      toast.error(t("generic.toast.please_select_a_template_and_week_start_date"));
      return;
    }

    const payload = {
      template_id: selectedTemplate,
      week_start: weekStart,
      ...(laborBudget && { labor_budget: parseFloat(laborBudget) }),
      demand_level: demandLevel,
    };

    autoScheduleMutation.mutate(payload);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-normal">{t("auto_schedule.title")}</h1>
          <p className="text-gray-600 mt-2">
            {t("auto_schedule.subtitle")}
          </p>
        </div>
      </div>

      <Tabs defaultValue="scheduler" className="space-y-4">
        <TabsList>
          <TabsTrigger value="scheduler">{t("auto_schedule.tab_scheduler")}</TabsTrigger>
          <TabsTrigger value="help">{t("auto_schedule.tab_help")}</TabsTrigger>
        </TabsList>

        <TabsContent value="scheduler">
          <Card>
            <CardHeader>
              <CardTitle>{t("auto_schedule.generate")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {showResults && scheduleResults && (
                <Alert
                  variant={scheduleResults.success ? "default" : "destructive"}
                >
                  <div className="flex items-start gap-2">
                    {scheduleResults.success ? (
                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold">
                        {scheduleResults.message}
                      </h3>
                      {scheduleResults.shifts_created && (
                        <p className="text-sm mt-1">
                          {t("auto_schedule.shifts_created", { count: scheduleResults.shifts_created })}
                        </p>
                      )}
                      {scheduleResults.conflicts_detected && (
                        <p className="text-sm mt-1">
                          {t("auto_schedule.conflicts_detected", { count: scheduleResults.conflicts_detected })}
                        </p>
                      )}
                    </div>
                  </div>
                </Alert>
              )}

              <div className="space-y-4">
                <div>
                  <Label htmlFor="template">{t("auto_schedule.template_label")}</Label>
                  <Select
                    value={selectedTemplate}
                    onValueChange={setSelectedTemplate}
                  >
                    <SelectTrigger id="template" className="mt-1">
                      <SelectValue placeholder={t("auto_schedule.template_placeholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {templatesLoading ? (
                        <SelectItem value="__loading_templates__" disabled>
                          {t("common.loading")}
                        </SelectItem>
                      ) : templates && templates.length > 0 ? (
                        templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__no_templates__" disabled>
                          {t("auto_schedule.no_templates")}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-600 mt-1">
                    {t("auto_schedule.template_help")}
                  </p>
                </div>

                <div>
                  <Label htmlFor="week-start">{t("auto_schedule.week_start")}</Label>
                  <Input
                    id="week-start"
                    type="date"
                    value={weekStart}
                    onChange={(e) => setWeekStart(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    {t("auto_schedule.week_start_help")}
                  </p>
                </div>

                <div>
                  <Label htmlFor="demand-level">{t("auto_schedule.demand_label")}</Label>
                  <Select value={demandLevel} onValueChange={setDemandLevel}>
                    <SelectTrigger id="demand-level" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">{t("auto_schedule.demand_low")}</SelectItem>
                      <SelectItem value="MEDIUM">
                        {t("auto_schedule.demand_medium")}
                      </SelectItem>
                      <SelectItem value="HIGH">{t("auto_schedule.demand_high")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-600 mt-1">
                    {t("auto_schedule.demand_help")}
                  </p>
                </div>

                <div>
                  <Label htmlFor="labor-budget">{t("auto_schedule.budget_label")}</Label>
                  <Input
                    id="labor-budget"
                    type="number"
                    placeholder={t("auto_schedule.budget_placeholder")}
                    value={laborBudget}
                    onChange={(e) => setLaborBudget(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    {t("auto_schedule.budget_help")}
                  </p>
                </div>
              </div>

              <Button
                onClick={handleGenerateSchedule}
                disabled={autoScheduleMutation.isPending}
                className="w-full"
                size="lg"
              >
                {autoScheduleMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("auto_schedule.generating")}
                  </>
                ) : (
                  t("auto_schedule.generate")
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">
                {t("auto_schedule.how_title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm flex-shrink-0">
                  1
                </div>
                <div>
                  <p className="font-semibold">{t("auto_schedule.step1_title")}</p>
                  <p className="text-sm text-gray-600">
                    {t("auto_schedule.step1_desc")}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm flex-shrink-0">
                  2
                </div>
                <div>
                  <p className="font-semibold">{t("auto_schedule.step2_title")}</p>
                  <p className="text-sm text-gray-600">
                    {t("auto_schedule.step2_desc")}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm flex-shrink-0">
                  3
                </div>
                <div>
                  <p className="font-semibold">{t("auto_schedule.step3_title")}</p>
                  <p className="text-sm text-gray-600">
                    {t("auto_schedule.step3_desc")}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm flex-shrink-0">
                  4
                </div>
                <div>
                  <p className="font-semibold">{t("auto_schedule.step4_title")}</p>
                  <p className="text-sm text-gray-600">
                    {t("auto_schedule.step4_desc")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="help">
          <Card>
            <CardHeader>
              <CardTitle>{t("auto_schedule.guide_title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">{t("auto_schedule.guide_what_title")}</h3>
                <p className="text-sm text-gray-700">
                  {t("auto_schedule.guide_what_body")}
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">{t("auto_schedule.features_title")}</h3>
                <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                  <li>{t("auto_schedule.feature1")}</li>
                  <li>{t("auto_schedule.feature2")}</li>
                  <li>{t("auto_schedule.feature3")}</li>
                  <li>{t("auto_schedule.feature4")}</li>
                  <li>{t("auto_schedule.feature5")}</li>
                  <li>{t("auto_schedule.feature6")}</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">{t("auto_schedule.practices_title")}</h3>
                <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
<li>{t("auto_schedule.practice1")}</li>
                  <li>{t("auto_schedule.practice2")}</li>
                  <li>{t("auto_schedule.practice3")}</li>
                  <li>{t("auto_schedule.practice4")}</li>
                  <li>{t("auto_schedule.practice5")}</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AutoSchedule;
