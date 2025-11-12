/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { Alert as AlertType } from '@/lib/types';

const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:8000/api';

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
  const isManager = user?.role === 'MANAGER' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isStaffLevel = !isManager;
  const isMobile = useMediaQuery("(max-width: 768px)");
  const navigate = useNavigate();
  const [myTasks, setMyTasks] = useState<MyTaskItem[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Helpers
  const getAuthToken = () => localStorage.getItem('access_token') || localStorage.getItem('accessToken') || '';

  // React Query: Unresolved Alerts
  const { data: unresolvedAlerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['dashboard-unresolved-alerts'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/dashboard/alerts/unresolved/`, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` },
      });
      if (!res.ok) throw new Error('Failed to load alerts');
      return res.json();
    },
    enabled: isManager,
  });

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
      const startStr = start.toISOString().slice(0,10);
      const endStr = end.toISOString().slice(0,10);
      const res = await fetch(`${API_BASE}/staff/schedule-tasks/?start_date=${startStr}&end_date=${endStr}`, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` },
      });
      if (!res.ok) throw new Error('Failed to load SOP tasks');
      return res.json();
    },
    enabled: isManager,
  });

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoadingTasks(true);
        const token = getAuthToken();
        // Correct endpoint for DRF @action on ShiftTaskViewSet
        const res = await fetch(`${API_BASE}/scheduling/shift-tasks/my_tasks/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
          const txt = await res.text();
          console.error('Failed to load tasks', txt);
          setMyTasks([]);
          return;
        }
        const data = await res.json();
        setMyTasks(Array.isArray(data) ? data : (data.results || []));
      } catch (e) {
        console.error('Error loading my tasks', e);
        setMyTasks([]);
      } finally {
        setLoadingTasks(false);
      }
    };

    fetchTasks();
  }, []);

  return (
    <div className="container mx-auto py-4 md:py-6 space-y-4 md:space-y-6 px-2 md:px-6">
      <div className="flex flex-col space-y-1">
      </div>

      <Alert className="bg-amber-50 border-amber-200">
        <AlertTriangle className="h-2 md:h-4 w-4 md:w-5 text-amber-600" />
        <AlertDescription className="text-xs md:text-sm text-amber-700">
          Report all Incidents and Safety concerns and follow procedures for a safe work environment.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2 px-3 md:px-6 py-3 md:py-4">
            <CardTitle className="flex items-center text-base md:text-lg">
              <Shield className="mr-2 h-4 w-4 md:h-5 md:w-5 text-green-600" />
              Safety Compliance
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">Current safety status</CardDescription>
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
                      <span className="text-xs md:text-sm">SOPs Compliance</span>
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
                      <span className="text-xs md:text-sm">Checklist Completion</span>
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
                      <span className="text-xs md:text-sm">Task Completion</span>
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

        {!isMobile && (
          <>
            <Card className="shadow-sm">
              <CardHeader className="pb-2 px-3 md:px-6 py-3 md:py-4">
                <CardTitle className="flex items-center text-base md:text-lg">
                  <AlertTriangle className="mr-2 h-4 w-4 md:h-5 md:w-5 text-red-600" />
                  Open Incidents
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">Unresolved incident cases</CardDescription>
              </CardHeader>
              <CardContent className="px-3 md:px-6 py-2 md:py-3">
                <div className="space-y-3">
                  {alertsLoading && (
                    <div className="text-xs md:text-sm text-muted-foreground">Loading incidents…</div>
                  )}
                  {!alertsLoading && Array.isArray(unresolvedAlerts) && unresolvedAlerts.length === 0 && (
                    <div className="text-xs md:text-sm text-muted-foreground">No open incidents.</div>
                  )}
                  {!alertsLoading && Array.isArray(unresolvedAlerts) && unresolvedAlerts.map((a: AlertType) => {
                    const isError = String(a.alert_type).toUpperCase() === 'ERROR';
                    const isWarning = String(a.alert_type).toUpperCase() === 'WARNING';
                    const containerClass = isError
                      ? 'bg-red-50 border border-red-100'
                      : isWarning
                      ? 'bg-amber-50 border border-amber-100'
                      : 'bg-blue-50 border border-blue-100';
                    const titleClass = isError ? 'text-red-800' : isWarning ? 'text-amber-800' : 'text-blue-800';
                    const descClass = isError ? 'text-red-700' : isWarning ? 'text-amber-700' : 'text-blue-700';
                    const timeClass = isError ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-blue-600';
                    const restaurantName = typeof (a as any).restaurant === 'string' ? (a as any).restaurant : (a as any).restaurant?.name;
                    return (
                      <div key={a.id} className={`p-2 md:p-3 rounded-md ${containerClass}`}>
                        <div className={`font-medium text-xs md:text-sm ${titleClass}`}>{restaurantName || 'Alert'}</div>
                        <div className={`text-xs ${descClass}`}>{a.message}</div>
                        <div className={`text-xs mt-1 ${timeClass}`}>Reported {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2 px-3 md:px-6 py-3 md:py-4">
                <CardTitle className="flex items-center text-base md:text-lg">
                  <CheckCircle className="mr-2 h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                  Today's Tasks
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">Priority safety tasks</CardDescription>
              </CardHeader>
              <CardContent className="px-3 md:px-6 py-2 md:py-3">
                <div className="space-y-2 md:space-y-3">
                  {loadingTasks && (
                    <div className="text-xs md:text-sm text-muted-foreground">Loading tasks…</div>
                  )}
                  {!loadingTasks && myTasks.length === 0 && (
                    <div className="text-xs md:text-sm text-muted-foreground">No tasks assigned today.</div>
                  )}
                  {!loadingTasks && myTasks.length > 0 && (
                    <div className="max-h-40 md:max-h-44 overflow-y-auto pr-1 -mr-1" aria-label="Today's tasks list">
                      {myTasks.map((t, idx) => {
                        const badgeClass =
                          t.status === 'COMPLETED'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : t.status === 'IN_PROGRESS'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : t.status === 'CANCELLED'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-gray-100 text-gray-700 border border-gray-200';
                        return (
                          <button
                            key={t.id}
                            className={`flex items-center w-full text-left hover:bg-gray-50 rounded-md p-2 ${idx > 0 ? 'mt-2' : ''}`}
                            onClick={() => navigate(`/task-checklist/${t.id}`)}
                          >
                            <div className={`h-3 w-3 md:h-4 md:w-4 rounded-full mr-2 flex-shrink-0 border ${t.status === 'COMPLETED' ? 'bg-blue-500 border-blue-500' : 'border-blue-500'}`}></div>
                            <span className={`text-xs md:text-sm ${t.status === 'COMPLETED' ? 'line-through text-muted-foreground' : ''}`}>{t.title}</span>
                            <Badge className={`ml-auto text-[10px] md:text-[11px] px-2 py-0.5 rounded-full ${badgeClass}`}>{Math.round(t.progress_percentage ?? 0)}%</Badge>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Tabs defaultValue={isManager ? "procedures" : "incidence"} className="w-full">
        <TabsList className={`grid ${isMobile ? 'grid-cols-3' : isManager ? 'grid-cols-5' : 'grid-cols-2'} mb-4`}>
          {isManager && <TabsTrigger value="procedures">SOPs</TabsTrigger>}
          {isManager && <TabsTrigger value="checklists">Checklists</TabsTrigger>}
          {isMobile ? (
            isManager ? (
              <TabsTrigger value="more" className="md:hidden">More</TabsTrigger>
            ) : null
          ) : (
            <>
              <TabsTrigger value="incidence">Incidence</TabsTrigger>
              <TabsTrigger value="recognition">Recognition</TabsTrigger>
              {isManager && <TabsTrigger value="management">Management</TabsTrigger>}
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
              <Card className="shadow-sm">
                <CardHeader className="pb-2 px-3 py-3">
                  <CardTitle className="flex items-center text-base">
                    <AlertTriangle className="mr-2 h-4 w-4 text-red-600" />
                    Open Incidents
                  </CardTitle>
                  <CardDescription className="text-xs">Unresolved safety issues</CardDescription>
                </CardHeader>
                <CardContent className="px-3 py-2">
                  <div className="space-y-3">
                    {alertsLoading && (
                      <div className="text-xs text-muted-foreground">Loading incidents…</div>
                    )}
                    {!alertsLoading && Array.isArray(unresolvedAlerts) && unresolvedAlerts.length === 0 && (
                      <div className="text-xs text-muted-foreground">No open incidents.</div>
                    )}
                    {!alertsLoading && Array.isArray(unresolvedAlerts) && unresolvedAlerts.map((a: AlertType) => {
                      const isError = String(a.alert_type).toUpperCase() === 'ERROR';
                      const isWarning = String(a.alert_type).toUpperCase() === 'WARNING';
                      const containerClass = isError
                        ? 'bg-red-50 border border-red-100'
                        : isWarning
                        ? 'bg-amber-50 border border-amber-100'
                        : 'bg-blue-50 border border-blue-100';
                      const titleClass = isError ? 'text-red-800' : isWarning ? 'text-amber-800' : 'text-blue-800';
                      const descClass = isError ? 'text-red-700' : isWarning ? 'text-amber-700' : 'text-blue-700';
                      const timeClass = isError ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-blue-600';
                      const restaurantName = typeof (a as any).restaurant === 'string' ? (a as any).restaurant : (a as any).restaurant?.name;
                      return (
                        <div key={a.id} className={`p-2 rounded-md ${containerClass}`}>
                          <div className={`font-medium text-xs ${titleClass}`}>{restaurantName || 'Alert'}</div>
                          <div className={`text-xs ${descClass}`}>{a.message}</div>
                          <div className={`text-xs mt-1 ${timeClass}`}>Reported {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="pb-2 px-3 py-3">
                  <CardTitle className="flex items-center text-base">
                    <CheckCircle className="mr-2 h-4 w-4 text-blue-600" />
                    Today's Tasks
                  </CardTitle>
                  <CardDescription className="text-xs">Priority safety tasks</CardDescription>
                </CardHeader>
                <CardContent className="px-3 py-2">
                  <div className="space-y-2">
                    {loadingTasks && (
                      <div className="text-xs text-muted-foreground">Loading tasks…</div>
                    )}
                    {!loadingTasks && myTasks.length === 0 && (
                      <div className="text-xs text-muted-foreground">No tasks assigned today.</div>
                    )}
                    {!loadingTasks && myTasks.length > 0 && (
                      <div className="max-h-40 overflow-y-auto pr-1 -mr-1" aria-label="Today's tasks list">
                        {myTasks.map((t, idx) => {
                          const badgeClass =
                            t.status === 'COMPLETED'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : t.status === 'IN_PROGRESS'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : t.status === 'CANCELLED'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-gray-100 text-gray-700 border border-gray-200';
                          return (
                            <button
                              key={t.id}
                              className={`flex items-center w-full text-left hover:bg-gray-50 rounded-md p-2 ${idx > 0 ? 'mt-2' : ''}`}
                              onClick={() => navigate(`/task-checklist/${t.id}`)}
                            >
                              <div className={`h-3 w-3 rounded-full border mr-2 flex-shrink-0 ${t.status === 'COMPLETED' ? 'bg-blue-500 border-blue-500' : 'border-blue-500'}`}></div>
                              <span className={`text-xs ${t.status === 'COMPLETED' ? 'line-through text-muted-foreground' : ''}`}>{t.title}</span>
                              <Badge className={`ml-auto text-[10px] px-2 py-0.5 rounded-full ${badgeClass}`}>{Math.round(t.progress_percentage ?? 0)}%</Badge>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-4">
                <div className="p-4 bg-white rounded-lg shadow-sm">
                  <h3 className="text-base font-medium mb-3 flex items-center">
                    <AlertTriangle className="mr-2 h-4 w-4 text-red-600" />
                    Incidence
                  </h3>
                  <SafetyConcernReporting />
                </div>
                
                <div className="p-4 bg-white rounded-lg shadow-sm">
                  <h3 className="text-base font-medium mb-3 flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                    Safety Recognition
                  </h3>
                  <SafetyRecognitionComponent />
                </div>
                
                <div className="p-4 bg-white rounded-lg shadow-sm">
                  <h3 className="text-base font-medium mb-3 flex items-center">
                    <ClipboardList className="mr-2 h-4 w-4 text-blue-600" />
                    Task Management
                  </h3>
                  <TaskManagementInterface isManager={isManager} />
                </div>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default SafetyDashboard;