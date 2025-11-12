/* eslint-disable @typescript-eslint/no-explicit-any */
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

const API_BASE =
  import.meta.env.VITE_REACT_APP_API_URL || "http://localhost:8000/api";

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
      if (!response.ok) throw new Error("Failed to load templates");
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
        throw new Error(error.detail || "Failed to auto-schedule");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setScheduleResults(data);
      setShowResults(true);
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      toast.success("Schedule created successfully!");
    },
    onError: (err: any) => {
      toast.error(`Error: ${err.message}`);
      setScheduleResults({ success: false, message: err.message });
      setShowResults(true);
    },
  });

  const handleGenerateSchedule = () => {
    if (!selectedTemplate || !weekStart) {
      toast.error("Please select a template and week start date");
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
          <h1 className="text-3xl font-bold">Auto-Schedule</h1>
          <p className="text-gray-600 mt-2">
            Automatically generate staff schedules based on templates and demand
            forecasts
          </p>
        </div>
      </div>

      <Tabs defaultValue="scheduler" className="space-y-4">
        <TabsList>
          <TabsTrigger value="scheduler">Auto Scheduler</TabsTrigger>
          <TabsTrigger value="help">How It Works</TabsTrigger>
        </TabsList>

        <TabsContent value="scheduler">
          <Card>
            <CardHeader>
              <CardTitle>Generate Schedule</CardTitle>
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
                          {scheduleResults.shifts_created} shifts created
                        </p>
                      )}
                      {scheduleResults.conflicts_detected && (
                        <p className="text-sm mt-1">
                          {scheduleResults.conflicts_detected} conflicts
                          detected
                        </p>
                      )}
                    </div>
                  </div>
                </Alert>
              )}

              <div className="space-y-4">
                <div>
                  <Label htmlFor="template">Schedule Template</Label>
                  <Select
                    value={selectedTemplate}
                    onValueChange={setSelectedTemplate}
                  >
                    <SelectTrigger id="template" className="mt-1">
                      <SelectValue placeholder="Select a template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templatesLoading ? (
                        <SelectItem value="__loading_templates__" disabled>
                          Loading...
                        </SelectItem>
                      ) : templates && templates.length > 0 ? (
                          templates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))
                      ) : (
                        <SelectItem value="__no_templates__" disabled>
                          No templates available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-600 mt-1">
                    Choose a schedule template to use as the basis for
                    auto-scheduling
                  </p>
                </div>

                <div>
                  <Label htmlFor="week-start">Week Start Date</Label>
                  <Input
                    id="week-start"
                    type="date"
                    value={weekStart}
                    onChange={(e) => setWeekStart(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Select the Monday of the week you want to schedule
                  </p>
                </div>

                <div>
                  <Label htmlFor="demand-level">Expected Demand Level</Label>
                  <Select value={demandLevel} onValueChange={setDemandLevel}>
                    <SelectTrigger id="demand-level" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low (30% staffing)</SelectItem>
                      <SelectItem value="MEDIUM">
                        Medium (60% staffing)
                      </SelectItem>
                      <SelectItem value="HIGH">High (100% staffing)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-600 mt-1">
                    Adjust staffing levels based on expected customer demand
                  </p>
                </div>

                <div>
                  <Label htmlFor="labor-budget">Labor Budget (Optional)</Label>
                  <Input
                    id="labor-budget"
                    type="number"
                    placeholder="Enter maximum labor cost"
                    value={laborBudget}
                    onChange={(e) => setLaborBudget(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Set a maximum budget for labor costs (AI will optimize
                    within this limit)
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
                    Generating Schedule...
                  </>
                ) : (
                  "Generate Schedule"
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">
                How Auto-Scheduling Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm flex-shrink-0">
                  1
                </div>
                <div>
                  <p className="font-semibold">Select Template</p>
                  <p className="text-sm text-gray-600">
                    Choose a template that defines typical shift patterns
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm flex-shrink-0">
                  2
                </div>
                <div>
                  <p className="font-semibold">Set Parameters</p>
                  <p className="text-sm text-gray-600">
                    Configure demand levels and optional budget constraints
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm flex-shrink-0">
                  3
                </div>
                <div>
                  <p className="font-semibold">AI Generates Schedule</p>
                  <p className="text-sm text-gray-600">
                    System creates optimal schedule considering staff
                    availability and constraints
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm flex-shrink-0">
                  4
                </div>
                <div>
                  <p className="font-semibold">Review & Publish</p>
                  <p className="text-sm text-gray-600">
                    Review the generated schedule and publish to notify staff
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="help">
          <Card>
            <CardHeader>
              <CardTitle>Auto-Scheduling Guide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">What is Auto-Scheduling?</h3>
                <p className="text-sm text-gray-700">
                  Auto-scheduling uses AI algorithms to automatically assign
                  shifts to staff members based on templates, availability,
                  demand forecasts, and labor budget constraints. This saves
                  time and ensures optimal coverage of required positions.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Key Features</h3>
                <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                  <li>Automatic shift assignment based on templates</li>
                  <li>Conflict detection and prevention</li>
                  <li>Budget-aware scheduling</li>
                  <li>Demand-level optimization</li>
                  <li>Staff preference consideration</li>
                  <li>Fair distribution of shifts</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Best Practices</h3>
                <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                  <li>
                    Create comprehensive templates with all required roles
                  </li>
                  <li>Update staff availability regularly</li>
                  <li>Set realistic budget constraints</li>
                  <li>Review schedules before publishing</li>
                  <li>Gather feedback to improve templates</li>
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
