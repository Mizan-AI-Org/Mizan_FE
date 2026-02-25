/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, AlertTriangle, CheckCircle, ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import StandardOperatingProcedureList from '@/components/safety/StandardOperatingProcedureList';
import SafetyChecklistComponent from '@/components/safety/SafetyChecklistComponent';
// Tasks tab removed per requirements
import SafetyConcernReporting from '@/components/safety/SafetyConcernReporting';
import SafetyRecognitionComponent from '@/components/safety/SafetyRecognition';
import TaskManagementInterface from '@/components/safety/TaskManagementInterface';
import { useAuth } from '@/hooks/use-auth';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { arSA, enUS, fr } from 'date-fns/locale';
import type { Alert as AlertType } from '@/lib/types';
import { API_BASE } from "@/lib/api";
import { useLanguage } from '@/hooks/use-language';
import { ListSkeleton } from '@/components/skeletons';


type SopTask = {
  id: string;
  status: string;
  sop?: unknown;
};

interface MyTaskItem {
  id: string;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  progress_percentage: number;
}

const SafetyDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const isManager = user?.role === 'MANAGER' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isStaffLevel = !isManager;
  const isMobile = useMediaQuery("(max-width: 768px)");
  const navigate = useNavigate();
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null);
  const distanceLocale = language === 'fr' ? fr : language === 'ar' ? arSA : enUS;

  // Helpers
  const getAuthToken = () => localStorage.getItem('access_token') || localStorage.getItem('accessToken') || '';

  const { data: allConcerns, isLoading: concernsLoading } = useQuery({
    queryKey: ['dashboard-safety-concerns'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/staff/safety-concerns/`, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` },
      });
      if (!res.ok) throw new Error('Failed to load incidents');
      return res.json();
    },
    enabled: true,
  });
  const concernsData = Array.isArray(allConcerns)
    ? allConcerns
    : (allConcerns?.results || []);

  const openConcerns = concernsData.filter((c: any) => String(c.status).toUpperCase() !== 'RESOLVED');

  // React Query: Task Statistics
  const { data: taskStats, isLoading: taskStatsLoading } = useQuery({
    queryKey: ['dashboard-task-stats'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/dashboard/tasks/statistics/`, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` },
      });
      if (!res.ok) throw new Error('Failed to load task statistics');
      return res.json();
    },
    enabled: isManager,
  });

  // React Query: Checklist Dashboard Stats
  const { data: checklistStats, isLoading: checklistStatsLoading } = useQuery({
    queryKey: ['checklist-dashboard-stats'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/checklists/analytics/dashboard_stats/`, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` },
      });
      if (!res.ok) throw new Error('Failed to load checklist stats');
      return res.json();
    },
    enabled: isManager,
  });

  // React Query: SOPs Compliance (derived from schedule tasks over recent period)
  const { data: sopTasks, isLoading: sopTasksLoading } = useQuery({
    queryKey: ['sop-compliance-tasks'],
    queryFn: async () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 30);
      const startStr = start.toISOString().slice(0, 10);
      const endStr = end.toISOString().slice(0, 10);
      const res = await fetch(`${API_BASE}/staff/schedule-tasks/?start_date=${startStr}&end_date=${endStr}`, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` },
      });
      if (!res.ok) throw new Error('Failed to load SOP tasks');
      return res.json();
    },
    enabled: isManager,
  });

  const { data: incidentDetail } = useQuery({
    queryKey: ['dashboard-incident-detail', selectedIncident],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/staff/safety-concerns/${selectedIncident}/`, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` },
      });
      if (!res.ok) throw new Error('Failed to load incident detail');
      return res.json();
    },
    enabled: !!selectedIncident,
  });

  return (
    <div className="container mx-auto py-4 md:py-6 space-y-4 md:space-y-6 px-2 md:px-6">
      <div className="flex flex-col space-y-1">
      </div>

      <Alert className="bg-amber-50 border-amber-200">
        <AlertTriangle className="h-2 md:h-4 w-4 md:w-5 text-amber-600" />
        <AlertDescription className="text-xs md:text-sm text-amber-700">
          {t("safety.dashboard.alert.report_all")}
        </AlertDescription>
      </Alert>

      <div id="dashboard-top-row" className="grid grid-cols-2 gap-4 items-stretch">
        <Card id="card-safety-compliance" className="shadow-sm order-1">
          <CardHeader className="pb-2 px-3 md:px-6 py-3 md:py-4">
            <CardTitle className="flex items-center text-base md:text-lg">
              <Shield className="mr-2 h-4 w-4 md:h-5 md:w-5 text-green-600" />
              {t("safety.dashboard.compliance.title")}
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">{t("safety.dashboard.compliance.description")}</CardDescription>
          </CardHeader>
          <CardContent className="px-3 md:px-6 py-2 md:py-3">
            <div className="space-y-2">
              {(() => {
                // SOPs Compliance calculation
                const itemsRaw = Array.isArray(sopTasks?.results) ? sopTasks.results : Array.isArray(sopTasks) ? sopTasks : [];
                const items: SopTask[] = (itemsRaw as SopTask[]);
                const sopItems = items.filter((t: SopTask) => !!t.sop);
                const totalSop = sopItems.length;
                const completedSop = sopItems.filter((t: SopTask) => String(t.status).toUpperCase() === 'COMPLETED').length;
                const sopPct = totalSop ? Math.round((completedSop / totalSop) * 100) : 0;
                const sopLoading = sopTasksLoading;
                return (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-xs md:text-sm">{t("safety.dashboard.compliance.sops")}</span>
                      <span className="font-medium text-xs md:text-sm text-green-600">{sopLoading ? '—' : `${sopPct}%`}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: `${sopLoading ? 0 : sopPct}%` }}></div>
                    </div>
                  </>
                );
              })()}

              {(() => {
                // Checklist Completion from analytics
                const avg = checklistStats?.average_completion_rate ?? 0;
                const checklistLoading = checklistStatsLoading;
                const pct = checklistLoading ? 0 : Math.round(avg);
                return (
                  <>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-xs md:text-sm">{t("safety.dashboard.compliance.checklists")}</span>
                      <span className="font-medium text-xs md:text-sm text-amber-600">{checklistLoading ? '—' : `${pct}%`}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${pct}%` }}></div>
                    </div>
                  </>
                );
              })()}

              {(() => {
                // Task Completion from taskStats
                const total = taskStats?.total_tasks ?? 0;
                const byStatus = taskStats?.by_status ?? {};
                const completedCount = byStatus?.COMPLETED ?? byStatus?.completed ?? 0;
                const taskPct = total ? Math.round((completedCount / total) * 100) : 0;
                const loading = taskStatsLoading;
                return (
                  <>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-xs md:text-sm">{t("safety.dashboard.compliance.tasks")}</span>
                      <span className="font-medium text-xs md:text-sm text-blue-600">{loading ? '—' : `${taskPct}%`}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${loading ? 0 : taskPct}%` }}></div>
                    </div>
                  </>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        <Card id="card-open-incidents" className="shadow-sm order-2">
          <CardHeader className="pb-2 px-3 md:px-6 py-3 md:py-4">
            <CardTitle className="flex items-center text-base md:text-lg">
              <AlertTriangle className="mr-2 h-4 w-4 md:h-5 md:w-5 text-red-600" />
              {t("safety.dashboard.open_incidents.title")}
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">{t("safety.dashboard.open_incidents.description")}</CardDescription>
          </CardHeader>
          <CardContent className="px-3 md:px-6 py-2 md:py-3">
            <div className="space-y-3">
              {concernsLoading ? (
                <ListSkeleton rowCount={3} lineCount={2} showAvatar={false} />
              ) : null}
              {!concernsLoading && openConcerns.length === 0 && (
                <div className="text-xs md:text-sm text-muted-foreground">{t("safety.dashboard.open_incidents.none")}</div>
              )}
              {!concernsLoading && openConcerns.length > 0 && openConcerns.map((c: any) => {
                const sev = String(c.severity).toUpperCase();
                const containerClass = sev === 'CRITICAL'
                  ? 'bg-red-50 border border-red-100'
                  : sev === 'HIGH'
                    ? 'bg-orange-50 border border-orange-100'
                    : sev === 'MEDIUM'
                      ? 'bg-yellow-50 border border-yellow-100'
                      : 'bg-gray-50 border border-gray-100';
                const titleClass = sev === 'CRITICAL' ? 'text-red-800' : sev === 'HIGH' ? 'text-orange-800' : sev === 'MEDIUM' ? 'text-amber-800' : 'text-gray-800';
                const descClass = sev === 'CRITICAL' ? 'text-red-700' : sev === 'HIGH' ? 'text-orange-700' : sev === 'MEDIUM' ? 'text-amber-700' : 'text-gray-700';
                const timeClass = sev === 'CRITICAL' ? 'text-red-600' : sev === 'HIGH' ? 'text-orange-600' : sev === 'MEDIUM' ? 'text-amber-600' : 'text-gray-600';
                const snippetBase = String(c.description || '').slice(0, 100);
                const snippet = `${sev} • ${new Date(c.created_at).toLocaleString(language)} — ${snippetBase}${(c.description || '').length > 100 ? '…' : ''}`;
                return (
                  <button key={c.id} className={`p-2 md:p-3 rounded-md w-full text-left ${containerClass}`} onClick={() => setSelectedIncident(c.id)}>
                    <div className={`font-medium text-xs md:text-sm ${titleClass}`}>{c.title}</div>
                    <div className={`text-xs ${descClass}`}>{snippet}</div>
                    <div className={`text-xs mt-1 ${timeClass}`}>
                      {t("safety.dashboard.open_incidents.reported")}{" "}
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: distanceLocale })}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={isManager ? "procedures" : "incidence"} className="w-full">
        <TabsList className={`grid ${isMobile ? 'grid-cols-3' : isManager ? 'grid-cols-5' : 'grid-cols-2'} mb-4`}>
          {isManager && <TabsTrigger value="procedures">{t("safety.dashboard.tabs.sops")}</TabsTrigger>}
          {isManager && <TabsTrigger value="checklists">{t("safety.dashboard.tabs.checklists")}</TabsTrigger>}
          {isMobile ? (
            isManager ? (
              <TabsTrigger value="more" className="md:hidden">{t("common.more")}</TabsTrigger>
            ) : null
          ) : (
            <>
              <TabsTrigger value="incidence">{t("safety.dashboard.tabs.incidence")}</TabsTrigger>
              <TabsTrigger value="recognition">{t("safety.dashboard.tabs.recognition")}</TabsTrigger>
              {isManager && <TabsTrigger value="management">{t("safety.dashboard.tabs.management")}</TabsTrigger>}
            </>
          )}
        </TabsList>

        {isManager && (
          <TabsContent value="procedures" className="mt-0">
            <StandardOperatingProcedureList />
          </TabsContent>
        )}

        {isManager && (
          <TabsContent value="checklists" className="mt-0">
            <SafetyChecklistComponent />
          </TabsContent>
        )}

        <TabsContent value="incidence" className="mt-0">
          <SafetyConcernReporting />
        </TabsContent>

        <TabsContent value="recognition" className="mt-0">
          <SafetyRecognitionComponent />
        </TabsContent>

        {isManager && (
          <TabsContent value="management" className="mt-0">
            <TaskManagementInterface isManager={isManager} />
          </TabsContent>
        )}

        {isMobile && isManager && (
          <TabsContent value="more" className="mt-0">
            <div className="grid grid-cols-1 gap-4">
              {/* Open Incidents card already appears in the top grid and adapts responsively */}

              <div className="grid grid-cols-1 gap-4">
                <div className="p-4 bg-white rounded-lg shadow-sm">
                  <h3 className="text-base font-medium mb-3 flex items-center">
                    <AlertTriangle className="mr-2 h-4 w-4 text-red-600" />
                    {t("safety.dashboard.sections.incidence")}
                  </h3>
                  <SafetyConcernReporting />
                </div>

                <div className="p-4 bg-white rounded-lg shadow-sm">
                  <h3 className="text-base font-medium mb-3 flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                    {t("safety.dashboard.sections.recognition")}
                  </h3>
                  <SafetyRecognitionComponent />
                </div>

                <div className="p-4 bg-white rounded-lg shadow-sm">
                  <h3 className="text-base font-medium mb-3 flex items-center">
                    <ClipboardList className="mr-2 h-4 w-4 text-blue-600" />
                    {t("safety.dashboard.sections.management")}
                  </h3>
                  <TaskManagementInterface isManager={isManager} />
                </div>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={!!selectedIncident} onOpenChange={(open) => { if (!open) setSelectedIncident(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("safety.dashboard.incident_details.title")}</DialogTitle>
          </DialogHeader>
          {incidentDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium text-muted-foreground mb-1">{t("safety.dashboard.incident_details.type")}</div>
                  <div>{incidentDetail.incident_type || '—'}</div>
                </div>
                <div>
                  <div className="font-medium text-muted-foreground mb-1">{t("safety.dashboard.incident_details.title_label")}</div>
                  <div>{incidentDetail.title}</div>
                </div>
                <div>
                  <div className="font-medium text-muted-foreground mb-1">{t("safety.dashboard.incident_details.location")}</div>
                  <div>{incidentDetail.location || '—'}</div>
                </div>
                <div>
                  <div className="font-medium text-muted-foreground mb-1">{t("safety.dashboard.incident_details.severity")}</div>
                  <Badge variant="outline" className="border-gray-200">
                    {String(incidentDetail.severity || '').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                </div>
                <div>
                  <div className="font-medium text-muted-foreground mb-1">{t("safety.dashboard.incident_details.status")}</div>
                  <Badge variant="outline" className="border-gray-200">
                    {String(incidentDetail.status || '').toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                </div>
                <div>
                  <div className="font-medium text-muted-foreground mb-1">{t("safety.dashboard.incident_details.reported_at")}</div>
                  <div>{new Date(incidentDetail.created_at).toLocaleString(language)}</div>
                </div>
                <div>
                  <div className="font-medium text-muted-foreground mb-1">{t("safety.dashboard.incident_details.occurred_at")}</div>
                  <div>{incidentDetail.occurred_at ? new Date(incidentDetail.occurred_at).toLocaleString(language) : '—'}</div>
                </div>
                {incidentDetail.assigned_to_details && (
                  <div>
                    <div className="font-medium text-muted-foreground mb-1">Assigned To</div>
                    <div>{incidentDetail.assigned_to_details.first_name} {incidentDetail.assigned_to_details.last_name}</div>
                  </div>
                )}
              </div>

              <div className="text-sm">
                <div className="font-medium text-muted-foreground mb-1">{t("safety.dashboard.incident_details.description") || "Description"}</div>
                <div className="border rounded-md p-3 bg-muted/30 whitespace-pre-wrap">
                  {incidentDetail.description}
                </div>
              </div>

              {incidentDetail.photo && (
                <div>
                  <div className="font-medium text-muted-foreground mb-2 text-sm">Photo Evidence</div>
                  <img
                    src={typeof incidentDetail.photo === 'string' && incidentDetail.photo.startsWith('/') ? `${(import.meta as any).env?.VITE_BACKEND_URL || ''}${incidentDetail.photo}` : incidentDetail.photo}
                    alt="Incident evidence"
                    className="max-h-96 rounded-md border object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SafetyDashboard;